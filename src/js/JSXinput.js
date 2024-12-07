/*
JSXinput.js

version 1.0

A javascript library that provides robust gamepad support to web browsers.

Copyright (c) 2020 Will Keen

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

*/

let _jsxinput = {
    "mappedDeviceIndex":-1,
    "workingMapping":-1,
    "intervalMapping":-1,
    "mappingStage":-1,
    "boolBtnMapping":false,  /* four stages of jspad mapping. all can be false when not mapping. during mapping only one can be true at time. */
    "boolShoulderMapping":false,
    "boolDpadMapping":false,
    "boolAxesMapping":false,
    "displayedTab":0,
    "resizeEvent":-1,
    "deadzoneScancount":0,
    "padConnectEvent":-1,
    "padDisconnectEvent":-1,
    "mappingExitCallback":-1,
    "buttonMappingMessages":[
        "Press the (A) button on your controller.",
        "Press the (B) button on your controller.",
        "Press the (X) button on your controller.",
        "Press the (Y) button on your controller.",
        "Press the select button on your controller.",
        "Press the start button on your controller.",
        "CLICK the L stick on your controller.",
        "CLICK the R stick on your controller.",
        "Press the L1 button on your controller.",
        "Press the R1 button on your controller."
    ],
    "shoulderMappingMessages":[
        "Pull the L2 trigger on your controller.",
        "Pull the R2 trigger on your controller."
    ],
    "dpadMappingMessages":[
        "Press down on the directional pad.",
        "Press up on the directional pad.",
        "Press right on the directional pad.",
        "Press left on the directional pad."
    ],
    "axisMappingMessages": [
        "Move the left stick left or right.",
        "Move the left stick up or down.",
        "Move the right stick left or right.",
        "Move the right stick up or down."
    ]
};


_jsxinput.JSpads = new Array(4);


// next two properties are used to track gamepad connect / disconnect events
// so they can be removed before controller mapping and re-added after controller mapping
// see also:
//      _jsxinput.addHostConnectpadEventListener();
//      _jsxinput.addHostDisconnectpadEventListener();

_jsxinput.hostGamepadConnectEvents = [];
_jsxinput.hostGamepadDisconnectEvents = [];

_jsxinput.poll = function () {
    // call to update each mapped device.
    for (let i = 0; i < _jsxinput.JSpads.length; i++)
    {
        if (_jsxinput.JSpads[i] !== null && _jsxinput.JSpads[i] !== undefined)
        {
            if (_jsxinput.JSpads[i].mapping.mappingComplete === true)
            {
                _jsxinput.JSpads[i].update();
            }
        }
    }
};

_jsxinput.jsxinputMappings = new Array(4);

_jsxinput.o = function (obj) {
    "use strict";
    if (typeof obj === "object") {
        return obj;
    }
    return document.getElementById(obj);
};

_jsxinput.strCmp = function (a, b) {
    "use strict";
    
    if (a.toString() < b.toString()) {
        return -1;
    }
    if (a.toString() > b.toString()) {
        return 1;
    }
    return 0;
};

_jsxinput.getTimestamp = function() {
    // this function always returns false.
    // but we will attempt to assign a real timestamp function below.
    return false;
};


if (window.performance.now) {
    
    _jsxinput.getTimestamp = function() { return window.performance.now(); };
} else {
    if (window.performance.webkitNow) {
        
        _jsxinput.getTimestamp = function() { return window.performance.webkitNow(); };
    } else {
        
        _jsxinput.getTimestamp = function() { return new Date().getTime(); };
    }
}

_jsxinput.getTimestamp();






_jsxinput.init = function (mappingExitCallback) {

    // pass a function and it will be called when the mapping is completed.
    // this allows to pause main game loop for mapping and unpause after, for example.
    if (mappingExitCallback instanceof Function)
    {
        //eval("mathod_name").call(args);
        _jsxinput.mappingExitCallback = mappingExitCallback;
    }
    else
    {
        _jsxinput.mappingExitCallback = -1;
    }


    _jsxinput.createStylesheet();
    _jsxinput.createLayout();
    _jsxinput.sizeLayout();


    _jsxinput.loadMappingsFromCookie();
    _jsxinput.assignMappingsFromCookie();

    _jsxinput.createEvents();


    // copy paste from the controller connect event to reinitialize display after in case it has been reopened.
    _jsxinput.updateControllerSelect();
    if (_jsxinput.getConnectedPadCount() > 0)
    {
        // hide no pads warning.
        //_jsxinput.o("divNoPads").style.display = "none";

        _jsxinput.o("selectInstructions").innerHTML =  "Select a " + '\uD83C\uDFAE' + " to map:";

        // show pad selection.


        _jsxinput.o("divMenuMap").style.display = "block";
        //_jsxinput.o("btnFullMap").disabled = false;
        _jsxinput.o("selectMapInput").disabled = false;

        
    }

    else {
        // zero controllers impossible on an add controller event but why not?



        _jsxinput.o("selectInstructions").innerHTML = "No controllers found.<br>Ensure controller(s) are connected and press a button to awaken them.";

        // hide pad selection.
        //_jsxinput.o("divMenuMap").style.display = "none";
        _jsxinput.o("btnFullMap").disabled = true;
        _jsxinput.o("selectMapInput").disabled = true;

    }
    _jsxinput.showMapMenu(); // testing if this fixes the glitchy tab behavior on menu reload...
    _jsxinput.updateConfigTab();

};


_jsxinput.exitMap = function () {
    _jsxinput.removeLayout();
    _jsxinput.removeEvents();

    // re-add the host gamepad connect / disconnect events.
    var i;
    for (i = 0; i < _jsxinput.hostGamepadConnectEvents; i++)
    {
        window.addEventListener(_jsxinput.hostGamepadConnectEvents[i], connectpad);
    }

    for (i = 0; i < _jsxinput.hostGamepadDisconnectEvents; i++)
    {
        window.addEventListener(_jsxinput.hostGamepadDisconnectEvents[i], disconnectpad);
    }



    if (_jsxinput.mappingExitCallback !== -1)
    {
        _jsxinput.mappingExitCallback();
    }
};


_jsxinput.removeEvents = function () {
    window.removeEventListener("resize", _jsxinput.sizeLayout);
    window.removeEventListener("gamepadconnected", _jsxinput.connectpad);
    window.removeEventListener("gamepaddisconnected", _jsxinput.disconnectpad);
};

_jsxinput.removeLayout = function () {
    let mainDiv = _jsxinput.o("_jsxinputMainDiv");
    mainDiv.parentNode.removeChild(mainDiv);
};


_jsxinput.createEvents = function () {
    // first remove host gamepad connect / disconnect events.
    // these will be re-added during _jsxinput.exitMap()
    var i;
    for (i = 0; i < _jsxinput.hostGamepadConnectEvents; i++)
    {
        window.removeEventListener(_jsxinput.hostGamepadConnectEvents[i], connectpad);
    }

    for (i = 0; i < _jsxinput.hostGamepadDisconnectEvents; i++)
    {
        window.removeEventListener(_jsxinput.hostGamepadDisconnectEvents[i], disconnectpad);
    }


    // now add gamepad events used by controller mapping window.

    window.addEventListener("resize", _jsxinput.sizeLayout);
    window.addEventListener("gamepadconnected", _jsxinput.connectpad);
    window.addEventListener("gamepaddisconnected", _jsxinput.disconnectpad);

    _jsxinput.o("divExitButton").onclick = _jsxinput.helperPanelExitConfirm;
    _jsxinput.o("divExitBtnProceed").onclick = _jsxinput.helperPanelExit;
    _jsxinput.o("divExitBtnReturn").onclick = _jsxinput.helperPanelExitCancel;



    _jsxinput.o("divTabMap").onclick = _jsxinput.showMapMenu;
    _jsxinput.o("divTabConfig").onclick = _jsxinput.showConfigMenu;
    _jsxinput.o("btnFullMap").onclick = _jsxinput.fullMap;
    _jsxinput.o("noteClose").onclick = _jsxinput.cancelMap;

    _jsxinput.o("selectMapInput").onchange = _jsxinput.controllerSelectChange;
    _jsxinput.o("selectConfigInput").onchange = _jsxinput.configSelectChange;

    /*
    _jsxinput.o("rangeR").oninput = _jsxinput.updateDeadzone;
    _jsxinput.o("rangeL").oninput = _jsxinput.updateDeadzone;
    */

    _jsxinput.o("btnDetectDeadzones").onclick = _jsxinput.detectDeadzones;
};





_jsxinput.createStylesheet = function () {
    // only create stylesheet if it doesn't exist.
    // this allows the user to override it by creating a style with id = "_jsxinputCSSstyle"
    if (_jsxinput.o("_jsxinputCSSstyle") === null) {
        let styleSheets = document.styleSheets;

        let styleNode = document.createElement('style');
        styleNode.id = "_jsxinputCSSstyle";
        //styleNode.type = "text/css";

        let cssString = ".horizontalPanel {\n" +
            "     position: absolute;\n" +
            "     width: calc(50% - 32px);\n" +
            "     height: calc(100% - 32px);\n" +
            "  }\n" +
            "\n" +
            "   .controlElement {\n" +
            "   }\n" +
            "\n" +
            "   #divDpad {\n" +
            "     position: relative;\n" +
            "     width: 64px;\n" +
            "     height: 64px;\n" +
            "\n" +
            "     top: 0;\n" +
            "     left: 0;\n" +
            "\n" +
            "     border-radius: 100%;\n" +
            "     overflow: hidden;\n" +
            "   }\n" +
            "\n" +
            "   .DpadRow {\n" +
            "     position: absolute;\n" +
            "     width: 100%;\n" +
            "     height: 33%;\n" +
            "     left: 0;\n" +
            "   }\n" +
            "\n" +
            "   .DpadCell {\n" +
            "     position: absolute;\n" +
            "     height: 100%;\n" +
            "     width: 33%;\n" +
            "   }\n" +
            "\n" +
            "   .divThumbStick {\n" +
            "     position: absolute;\n" +
            "     width: 16px;\n" +
            "     height: 16px;\n" +
            "     border-radius: 100%;\n" +
            "\n" +
            "   }\n" +
            "\n" +
            "   .xAxis {\n" +
            "     position: absolute;\n" +
            "     left: 0;\n" +
            "     height: 10%;\n" +
            "     top:45%;\n" +
            "     width: 100%;\n" +
            "   }\n" +
            "\n" +
            "   .yAxis {\n" +
            "     position: absolute;\n" +
            "     left: 45%;\n" +
            "     width: 10%;\n" +
            "     top: 0;\n" +
            "     height: 100%;\n" +
            "   }\n" +
            "\n" +
            "   .divFaceButton {\n" +
            "     position: absolute;\n" +
            "     width: 16px;\n" +
            "     height: 16px;\n" +
            "     border-radius: 100%;\n" +
            "\n" +
            "   }\n" +
            "\n" +
            "   .divFaceButtonSmall {\n" +
            "     position: absolute;\n" +
            "     width: 36px;\n" +
            "     height: 12px;\n" +
            "\n" +
            "   }\n" +
            "\n" +
            "   .bumper {\n" +
            "     position: absolute;\n" +
            "     width: 36px;\n" +
            "     height: 24px;\n" +
            "\n" +
            "     border-radius: 10%;\n" +
            "   }\n" +
            "\n" +
            "   .trigger {\n" +
            "     position: absolute;\n" +
            "     width: 36px;\n" +
            "     height: 48px;\n" +
            "\n" +
            "\n" +
            "     border-top-left-radius: 48% 22%;\n" +
            "     border-top-right-radius: 48% 22%;\n" +
            "\n" +
            "     border-bottom-left-radius: 10%;\n" +
            "     border-bottom-right-radius: 10%;\n" +
            "\n" +
            "   }\n" +
            "\n" +
            "   .stickclick {\n" +
            "     position: absolute;\n" +
            "     width: 36px;\n" +
            "     height: 36px;\n" +
            "\n" +
            "\n" +
            "     border-top-right-radius: 12% 40%;\n" +
            "     border-top-left-radius: 12% 40%;\n" +
            "\n" +
            "     border-bottom-left-radius: 40% 50%;\n" +
            "     border-bottom-right-radius: 40% 50%;\n" +
            "\n" +
            "\n" +
            "   }\n" +
            "\n" +
            "   .menuItem {\n" +
            "     width: 95%;\n" +
            "     margin-left: 2.5%;\n" +
            "     display: block;\n" +
            "     padding-left: 2%;\n" +
            "     padding-right: 2%;\n" +
            "   }\n" +
            "\n" +
            "   .menuTab {\n" +
            "     width: 49%;\n" +
            "     display: inline-block;\n" +
            "     text-align: center;\n" +
            "\n" +
            "     border-bottom-style: hidden;\n" +
            "\n" +
            "     padding-top: 0.75em;\n" +
            "     padding-bottom: 0.6em;\n" +
            "       border-top-left-radius: 2.5em;\n" +
            "       border-top-right-radius: 2.5em;\n" +
            "   }\n" +
            "\n" +
            "   ._jsxinputLabelText {\n" +
            "     color: white;\n" +
            "     font-size: 1.2em;\n" +
            "   }\n" +
            "\n" +
            "   ._jsxinputExitButton {\n" +
            "     position: absolute;\n" +
            "     bottom: 1em;\n" +
            "     right: 5%;\n" +
            "     background-color: lightgray;\n" +
            "     padding-left: 1em;\n" +
            "     padding-right: 1em;\n" +
            "     padding-top: 0.25em;\n" +
            "     padding-bottom: 0.25em;\n" +
            "     font-size: 1.5em;\n" +
            "   }\n" +
            "\n" +
            "   .joySelect {\n" +
            "     width: calc(100% - 2em);\n" +
            "     margin-bottom: 3%;\n" +
            "     height: 2em;\n" +
            "     background-color: white;\n" +
            "   }\n" +
            "\n" +
            "   .deadzoneslider {\n" +
            "     padding: 0;\n" +
            "     width: 95%;\n" +
            "   }\n" +
            "\n" +
            "\n" +
            "   .leftPanelOverlay {\n" +
            "     position: absolute;\n" +
            "     left: 16px;\n" +
            "     top: 16px;\n" +
            "     overflow: hidden;\n" +
            "     background-color: purple;\n" +
            "     background-color: rgba(18%, 31%, 31%, 0.8);\n" +
            "     display: none;\n" +
            "   }\n" +
            "    /* begin classes for exit overlay */\n" +
            "   .fullscreenOverlay {\n" +
            "     position: absolute;\n" +
            "     left: 0;\n" +
            "     right: 0;\n" +
            "     width: 100%;\n" +
            "     height: 100%;\n" +
            "\n" +
            "   }\n" +
            "\n" +
            "   .exitButton {\n" +
            "     display: inline-block;\n" +
            "     width: 45%;\n" +
            "     padding: 0;\n" +
            "     background-color: whitesmoke;\n" +
            "     padding-top: 1.5%;\n" +
            "     padding-bottom: 1.5%;\n" +
            "\n" +
            "   }\n" +
            "\n" +
            "   .radialGradient {\n" +
            "       background: rgb(255,0,0);\n" +
            "       background: radial-gradient(circle, rgba(255,0,0,1) 0%, rgba(25,25,25,0.0) 80%);\n" +
            "   }\n" +
            "\n" +
            "   .horizontalGradient {\n" +
            "       background: rgb(0,0,0);\n" +
            "       background: linear-gradient(0deg, rgba(0,0,0,0) 0%, rgba(230,0,0,1) 36%, rgba(255,0,0,1) 64%, rgba(25,25,25,0.5) 100%);\n" +
            "   }";

        // browser detection (based on prototype.js)
        if (!!(window.attachEvent && !window.opera)) {
            styleNode.styleSheet.cssText = cssString;
        } else {
            let styleText = document.createTextNode(cssString);
            styleNode.appendChild(styleText);
        }


        document.getElementsByTagName('head')[0].appendChild(styleNode);
    }
};



_jsxinput.createLayout = function () {
    /*
        first a safety check, find and delete any node with the id _jsxinputMainDiv.
        before we create it ourself. 
    */

    let test = document.getElementById("_jsxinputMainDiv");
    while (test !== null)
    {
        // while loop in the unlikely case that more than one element has the id.
        // invalid html but lets put a safety on the footgun.
        test.remove();
        test = document.getElementById("_jsxinputMainDiv");
    }

    /*
        safety check done.
    */



    let zTop = _jsxinput.getGreatestZindex();

    zTop += 1;

    let mainDiv = document.createElement("div");

    mainDiv.style.all = "unset"; // css reset
    mainDiv.style.position = "absolute";
    mainDiv.style.left = "0";
    mainDiv.style.right = "0";
    mainDiv.style.width = "100%";
    mainDiv.style.cursor = "default";

    mainDiv.style.top = "0";
    mainDiv.style.bottom = "0";
    mainDiv.style.height = "100%";
    mainDiv.style.backgroundColor = "darkslategray";
    mainDiv.style.overflow = "hidden";

    mainDiv.style.fontFamily = "Arial,Helvetica Neue,Helvetica,sans-serif";


    mainDiv.style.zIndex = zTop;
    mainDiv.id = "_jsxinputMainDiv";

    document.body.appendChild(mainDiv);

    let leftPanel = document.createElement("div");

    /*
    moved to horizontalPanel css class.
    leftPanel.style.position = "absolute";
    leftPanel.style.width = "calc(50% - 32px)";
    leftPanel.style.height = "calc(100% - 32px)";
    */


    leftPanel.classList.add("horizontalPanel");
    leftPanel.id = "leftPanel";

    leftPanel.style.top = "16px";
    leftPanel.style.left = "16px";
    leftPanel.style.backgroundColor = "darkgray";

    /*
    moved to horizontalPanel css class.
    rightPanel.style.position = "absolute";
    rightPanel.style.width = "calc(50% - 32px)";
    rightPanel.style.height = "calc(100% - 32px)";

     */

    let rightPanel = document.createElement("div");
    rightPanel.classList.add("horizontalPanel");
    rightPanel.id = "rightPanel";




    rightPanel.style.top = "16px";
    rightPanel.style.right = "16px";
    /*rightPanel.style.left = "calc(50% + 16px)";*/

    rightPanel.style.backgroundSize = "100% 100%";
    //rightPanel.style.backgroundColor = "green";
    //rightPanel.style.backgroundImage = "url('dualshockfront3.svg')";

    rightPanel.style.backgroundImage = "url(" + CSS.escape("data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8' standalone='no'%3F%3E%3C!-- Created with Inkscape (http://www.inkscape.org/) --%3E%3Csvg xmlns:dc='http://purl.org/dc/elements/1.1/' xmlns:cc='http://creativecommons.org/ns%23' xmlns:rdf='http://www.w3.org/1999/02/22-rdf-syntax-ns%23' xmlns:svg='http://www.w3.org/2000/svg' xmlns='http://www.w3.org/2000/svg' xmlns:sodipodi='http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd' xmlns:inkscape='http://www.inkscape.org/namespaces/inkscape' width='566.92914' height='566.92914' viewBox='0 0 566.92913 566.92913' id='svg4543' version='1.1' inkscape:version='0.91 r13725' sodipodi:docname='JSXinputSimplifiedFlattenedCleaned.svg'%3E%3Cdefs id='defs4545' /%3E%3Csodipodi:namedview id='base' pagecolor='%23ffffff' bordercolor='%23666666' borderopacity='1.0' inkscape:pageopacity='1' inkscape:pageshadow='2' inkscape:zoom='1.6413791' inkscape:cx='297.00661' inkscape:cy='130.77121' inkscape:document-units='px' inkscape:current-layer='svg4543' showgrid='false' inkscape:window-width='1851' inkscape:window-height='1061' inkscape:window-x='-4' inkscape:window-y='-4' inkscape:window-maximized='1' fit-margin-top='0' fit-margin-left='0' fit-margin-right='0' fit-margin-bottom='0' units='px' /%3E%3Cg inkscape:groupmode='layer' id='layer3' inkscape:label='Layer 3' style='display:inline'%3E%3Cg id='g6187'%3E%3Cg id='POLYLINE_977_' transform='translate(-71.492931,-180.59788)' style='stroke:%23b3b3b3'%3E%3Cpath id='path4393' d='m 234.082,569.084 0.077,-10e-4 0.077,-0.002 c 0,0 0.077,-0.003 0.077,-0.003 l 0.077,-0.005 0.076,-0.006 0.076,-0.007 0.076,-0.009 0.076,-0.01 c 0,0 0.076,-0.011 0.076,-0.011 l 0.076,-0.013 0.075,-0.014 0.075,-0.015 0.075,-0.016 0.075,-0.018 0.074,-0.019 0.074,-0.02 0.074,-0.022 0.073,-0.023 0.073,-0.024 0.072,-0.025 0.072,-0.027 0.071,-0.028 0.071,-0.029 0.07,-0.03 0.07,-0.031 c 0,0 0.069,-0.033 0.069,-0.033 l 0.069,-0.034 0.068,-0.035 0.068,-0.036 0.067,-0.037 c 0,0 0.066,-0.039 0.066,-0.039 l 0.066,-0.04 c 0.065,-0.041 0.129,-0.083 0.129,-0.083 0.063,-0.043 0.126,-0.087 0.126,-0.087 0.062,-0.045 0.123,-0.091 0.123,-0.091 0.06,-0.047 0.12,-0.096 0.12,-0.096 0.059,-0.049 0.117,-0.1 0.117,-0.1 0.057,-0.051 0.113,-0.104 0.113,-0.104 0.055,-0.053 0.109,-0.107 0.109,-0.107 0.053,-0.055 0.106,-0.111 0.106,-0.111 0.051,-0.057 0.102,-0.115 0.102,-0.115 0.049,-0.059 0.098,-0.118 0.098,-0.118 0.047,-0.06 0.094,-0.122 0.094,-0.122 0.045,-0.062 0.089,-0.125 0.089,-0.125 0.043,-0.063 0.085,-0.128 0.085,-0.128 0.041,-0.065 0.08,-0.13 0.08,-0.13 l 0.039,-0.066 0.037,-0.067 0.036,-0.068 0.035,-0.068 0.034,-0.069 0.033,-0.069 0.031,-0.07 c 0,0 0.03,-0.07 0.03,-0.07 l 0.029,-0.071 0.028,-0.071 0.027,-0.072 0.025,-0.072 0.024,-0.073 c 0,0 0.023,-0.073 0.023,-0.073 l 0.022,-0.074 0.02,-0.074 0.019,-0.074 0.018,-0.075 0.016,-0.075 0.015,-0.075 0.014,-0.075 c 0,0 0.013,-0.076 0.013,-0.076 0,0 0.011,-0.076 0.011,-0.076 l 0.01,-0.076 0.009,-0.076 0.007,-0.076 0.006,-0.076 0.005,-0.076 0.003,-0.077 0.002,-0.077 0.001,-0.077 0,-42.538 -0.002,-0.282 -0.006,-0.28 -0.01,-0.278 -0.014,-0.276 -0.018,-0.274 -0.022,-0.271 -0.025,-0.269 -0.029,-0.267 c 0,0 -0.033,-0.265 -0.033,-0.265 l -0.037,-0.262 c 0,0 -0.041,-0.26 -0.041,-0.26 l -0.045,-0.258 -0.049,-0.256 c 0,0 -0.053,-0.254 -0.053,-0.254 l -0.057,-0.251 -0.061,-0.249 -0.065,-0.247 -0.069,-0.245 -0.072,-0.243 -0.038,-0.12 -0.039,-0.12 -0.04,-0.119 c 0,0 -0.041,-0.119 -0.041,-0.119 l -0.042,-0.118 -0.043,-0.118 -0.044,-0.117 -0.045,-0.117 -0.046,-0.116 c 0,0 -0.046,-0.115 -0.046,-0.115 l -0.047,-0.115 -0.048,-0.114 -0.049,-0.114 -0.05,-0.113 -0.051,-0.113 -0.052,-0.112 -0.053,-0.112 -0.054,-0.111 -0.055,-0.11 -0.056,-0.11 -0.057,-0.109 -0.058,-0.109 -0.059,-0.108 -0.06,-0.108 -0.061,-0.107 -0.062,-0.107 -0.063,-0.106 -0.064,-0.105 -0.065,-0.105 -0.066,-0.104 -0.067,-0.104 -0.068,-0.103 -0.069,-0.103 c 0,0 -0.07,-0.102 -0.07,-0.102 l -0.071,-0.102 -0.072,-0.101 -0.073,-0.101 -0.074,-0.1 -0.075,-0.099 -0.076,-0.099 c 0,0 -0.077,-0.098 -0.077,-0.098 0,0 -0.078,-0.098 -0.078,-0.098 l -0.079,-0.097 -0.08,-0.097 -0.081,-0.096 -0.082,-0.096 -0.083,-0.095 c 0,0 -0.084,-0.094 -0.084,-0.094 l -0.17,-0.187 -0.174,-0.185 -0.178,-0.183 -0.182,-0.18 -0.186,-0.178 -0.19,-0.176 -0.194,-0.174 -0.198,-0.172 -0.202,-0.169 -0.206,-0.167 -0.209,-0.165 -0.213,-0.163 -0.217,-0.161 c 0,0 -0.221,-0.158 -0.221,-0.158 l -0.225,-0.156 c 0,0 -0.229,-0.154 -0.229,-0.154 l -0.233,-0.152 c 0,0 -0.237,-0.15 -0.237,-0.15 l -0.241,-0.144 -0.245,-0.145 -0.249,-0.143 -0.252,-0.141 -0.256,-0.138 -0.26,-0.136 -0.264,-0.134 -0.268,-0.132 -0.272,-0.13 -0.276,-0.127 -0.28,-0.125 -0.284,-0.123 -0.288,-0.121 -0.292,-0.118 -0.296,-0.116 -0.299,-0.114 -0.303,-0.112 -0.307,-0.11 -0.311,-0.107 -0.315,-0.105 -0.319,-0.103 -0.323,-0.101 -0.327,-0.099 -0.331,-0.096 -0.335,-0.094 -0.339,-0.092 -0.343,-0.09 -0.697,-0.173 -0.712,-0.164 -0.728,-0.155 -0.744,-0.146 -0.759,-0.137 -0.775,-0.128 -0.791,-0.12 -0.806,-0.111 -0.822,-0.102 -0.838,-0.093 -0.853,-0.084 c 0,0 -0.869,-0.075 -0.869,-0.075 l -0.885,-0.066 -0.9,-0.058 -0.916,-0.049 -0.932,-0.04 -0.947,-0.031 -0.963,-0.022 -0.979,-0.013 -0.994,-0.004 -0.994,0.004 -0.979,0.013 -0.963,0.022 -0.947,0.031 -0.932,0.04 -0.916,0.049 c 0,0 -0.9,0.058 -0.9,0.058 l -0.885,0.066 -0.869,0.075 c 0,0 -0.853,0.084 -0.853,0.084 0,0 -0.838,0.093 -0.838,0.093 l -0.822,0.102 -0.806,0.111 -0.791,0.12 c 0,0 -0.775,0.128 -0.775,0.128 l -0.759,0.137 -0.744,0.146 -0.728,0.155 -0.712,0.164 -0.697,0.173 -0.342,0.09 -0.339,0.092 -0.335,0.094 -0.331,0.096 -0.327,0.099 c 0,0 -0.323,0.101 -0.323,0.101 l -0.319,0.103 -0.315,0.105 -0.311,0.107 -0.307,0.11 c 0,0 -0.303,0.112 -0.303,0.112 l -0.299,0.114 -0.296,0.116 c 0,0 -0.292,0.118 -0.292,0.118 l -0.288,0.121 -0.284,0.123 -0.28,0.125 -0.276,0.127 -0.272,0.13 -0.268,0.132 -0.264,0.134 -0.26,0.136 -0.256,0.138 -0.252,0.141 -0.249,0.143 -0.245,0.145 -0.241,0.147 -0.237,0.15 c 0,0 -0.233,0.152 -0.233,0.152 l -0.229,0.154 -0.225,0.156 -0.221,0.158 -0.217,0.161 c 0,0 -0.213,0.163 -0.213,0.163 l -0.209,0.165 -0.206,0.167 -0.202,0.169 c 0,0 -0.198,0.172 -0.198,0.172 l -0.194,0.174 -0.19,0.176 -0.186,0.178 -0.182,0.18 -0.178,0.183 -0.174,0.185 -0.17,0.187 -0.084,0.094 -0.083,0.095 -0.082,0.096 c 0,0 -0.081,0.096 -0.081,0.096 l -0.08,0.097 -0.079,0.097 -0.078,0.098 -0.077,0.098 -0.076,0.099 -0.075,0.099 -0.074,0.1 -0.073,0.101 -0.072,0.101 -0.071,0.102 -0.07,0.102 -0.069,0.103 -0.068,0.103 -0.067,0.104 -0.066,0.104 -0.065,0.105 -0.064,0.105 -0.063,0.106 -0.062,0.107 -0.061,0.107 -0.06,0.108 -0.059,0.108 -0.058,0.109 -0.057,0.109 -0.056,0.11 c 0,0 -0.055,0.11 -0.055,0.11 l -0.054,0.111 -0.053,0.112 -0.052,0.112 -0.051,0.113 -0.05,0.113 -0.049,0.114 -0.048,0.114 c 0,0 -0.047,0.115 -0.047,0.115 l -0.046,0.115 -0.046,0.116 -0.045,0.117 -0.044,0.117 -0.043,0.118 -0.042,0.118 -0.041,0.119 -0.04,0.119 -0.039,0.12 -0.038,0.12 -0.072,0.243 -0.068,0.245 -0.065,0.247 -0.061,0.249 -0.057,0.251 -0.053,0.254 -0.049,0.256 -0.045,0.258 -0.041,0.26 -0.037,0.262 -0.033,0.265 -0.029,0.267 -0.025,0.269 -0.022,0.271 -0.018,0.274 -0.014,0.276 -0.01,0.278 -0.006,0.28 -0.002,0.282 c 0,0 0,42.538 0,42.538 l 0.001,0.077 0.002,0.077 c 0,0 0.003,0.077 0.003,0.077 l 0.005,0.076 0.006,0.076 0.007,0.076 0.009,0.076 0.01,0.076 0.011,0.076 0.013,0.076 c 0,0 0.014,0.075 0.014,0.075 l 0.015,0.075 0.016,0.075 c 0,0 0.018,0.075 0.018,0.075 l 0.019,0.074 0.02,0.074 0.022,0.074 0.023,0.073 0.024,0.073 0.025,0.072 0.027,0.072 0.028,0.071 0.029,0.071 0.03,0.07 0.031,0.07 0.033,0.069 0.034,0.069 0.035,0.068 0.036,0.068 0.037,0.067 0.039,0.066 0.04,0.066 c 0.041,0.065 0.083,0.129 0.083,0.129 0.043,0.063 0.087,0.126 0.087,0.126 0.045,0.062 0.091,0.123 0.091,0.123 0.047,0.06 0.096,0.12 0.096,0.12 0.049,0.059 0.1,0.117 0.1,0.117 0.051,0.057 0.104,0.113 0.104,0.113 0.053,0.055 0.107,0.109 0.107,0.109 0.055,0.053 0.111,0.106 0.111,0.106 0.057,0.051 0.115,0.102 0.115,0.102 0.059,0.049 0.118,0.098 0.118,0.098 0.06,0.047 0.122,0.094 0.122,0.094 0.062,0.045 0.125,0.089 0.125,0.089 0.063,0.043 0.128,0.085 0.128,0.085 0.065,0.041 0.131,0.081 0.131,0.081 l 0.066,0.039 0.067,0.037 0.068,0.036 0.068,0.035 0.069,0.034 0.069,0.033 0.07,0.031 c 0,0 0.07,0.03 0.07,0.03 l 0.071,0.029 0.071,0.028 0.072,0.027 0.072,0.025 0.073,0.024 c 0,0 0.073,0.023 0.073,0.023 l 0.074,0.022 0.074,0.02 0.074,0.019 0.075,0.018 0.075,0.016 0.075,0.015 c 0,0 0.075,0.014 0.075,0.014 l 0.076,0.013 0.076,0.011 0.076,0.01 0.076,0.009 0.076,0.007 0.076,0.006 0.077,0.005 c 0,0 0.077,0.003 0.077,0.003 l 0.077,0.002 0.077,10e-4 27.625,0 27.624,0 z' stroke-miterlimit='10' inkscape:connector-curvature='0' style='fill:none;stroke:%23b3b3b3;stroke-width:2.75;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10' /%3E%3C/g%3E%3Cg id='POLYLINE_976_' transform='translate(-71.492931,-180.59788)' style='stroke:%23b3b3b3'%3E%3Cpath id='path4396' d='m 174.391,584.809 0.001,-0.077 0.002,-0.077 c 0,0 0.003,-0.077 0.003,-0.077 l 0.005,-0.077 c 0,0 0.006,-0.076 0.006,-0.076 l 0.007,-0.076 0.009,-0.076 0.01,-0.076 0.011,-0.076 0.013,-0.076 c 0,0 0.014,-0.075 0.014,-0.075 l 0.015,-0.075 0.016,-0.075 c 0,0 0.018,-0.075 0.018,-0.075 l 0.019,-0.074 0.02,-0.074 0.022,-0.074 0.023,-0.073 0.024,-0.073 0.025,-0.072 0.027,-0.072 0.028,-0.071 0.029,-0.071 0.03,-0.07 0.031,-0.07 0.033,-0.069 c 0,0 0.034,-0.069 0.034,-0.069 l 0.035,-0.068 0.036,-0.068 0.037,-0.067 0.039,-0.066 0.04,-0.066 c 0.041,-0.065 0.083,-0.129 0.083,-0.129 0.043,-0.063 0.087,-0.126 0.087,-0.126 0.045,-0.062 0.091,-0.123 0.091,-0.123 0.047,-0.06 0.096,-0.12 0.096,-0.12 0.049,-0.059 0.1,-0.116 0.1,-0.116 0.051,-0.057 0.104,-0.113 0.104,-0.113 0.053,-0.055 0.107,-0.109 0.107,-0.109 0.055,-0.053 0.111,-0.106 0.111,-0.106 0.057,-0.051 0.115,-0.102 0.115,-0.102 0.059,-0.049 0.118,-0.098 0.118,-0.098 0.06,-0.047 0.122,-0.094 0.122,-0.094 0.062,-0.045 0.125,-0.089 0.125,-0.089 0.063,-0.043 0.128,-0.085 0.128,-0.085 0.065,-0.041 0.131,-0.08 0.131,-0.08 l 0.066,-0.039 0.067,-0.037 0.068,-0.036 0.068,-0.035 0.069,-0.034 0.069,-0.033 0.07,-0.031 c 0,0 0.07,-0.03 0.07,-0.03 l 0.071,-0.029 0.071,-0.028 0.072,-0.027 0.072,-0.025 0.073,-0.024 c 0,0 0.073,-0.023 0.073,-0.023 l 0.074,-0.022 0.074,-0.02 0.074,-0.019 0.075,-0.018 0.075,-0.016 0.075,-0.015 c 0,0 0.075,-0.014 0.075,-0.014 l 0.076,-0.013 0.076,-0.011 0.076,-0.01 0.076,-0.009 0.076,-0.007 0.076,-0.006 0.077,-0.005 0.077,-0.003 0.077,-0.002 0.077,-10e-4 55.251,0 0.077,10e-4 0.077,0.002 c 0,0 0.077,0.003 0.077,0.003 l 0.077,0.005 0.076,0.006 0.076,0.007 0.076,0.009 0.076,0.01 c 0,0 0.076,0.011 0.076,0.011 l 0.076,0.013 0.075,0.014 0.075,0.015 0.075,0.016 0.075,0.018 0.074,0.019 0.074,0.02 0.074,0.022 0.073,0.023 0.073,0.024 0.072,0.025 0.072,0.027 0.071,0.028 0.071,0.029 0.07,0.03 0.07,0.031 c 0,0 0.069,0.033 0.069,0.033 l 0.069,0.034 0.068,0.035 0.068,0.036 0.067,0.037 c 0,0 0.066,0.039 0.066,0.039 l 0.066,0.04 c 0.065,0.041 0.129,0.083 0.129,0.083 0.063,0.043 0.126,0.087 0.126,0.087 0.062,0.045 0.123,0.091 0.123,0.091 0.06,0.047 0.12,0.096 0.12,0.096 0.059,0.049 0.117,0.1 0.117,0.1 0.057,0.051 0.113,0.104 0.113,0.104 0.055,0.053 0.109,0.107 0.109,0.107 0.053,0.055 0.106,0.111 0.106,0.111 0.051,0.057 0.102,0.115 0.102,0.115 0.049,0.059 0.098,0.118 0.098,0.118 0.047,0.06 0.094,0.122 0.094,0.122 0.045,0.062 0.089,0.125 0.089,0.125 0.043,0.063 0.085,0.128 0.085,0.128 0.041,0.065 0.08,0.131 0.08,0.131 l 0.039,0.066 0.037,0.067 0.036,0.068 0.035,0.068 0.034,0.069 0.033,0.069 0.031,0.07 c 0,0 0.03,0.07 0.03,0.07 l 0.029,0.071 0.028,0.071 0.027,0.072 0.025,0.072 0.024,0.073 0.023,0.073 0.022,0.074 0.02,0.074 0.019,0.074 0.018,0.075 0.016,0.075 0.015,0.075 0.014,0.075 c 0,0 0.013,0.076 0.013,0.076 l 0.011,0.076 0.01,0.076 0.009,0.076 c 0,0 0.007,0.076 0.007,0.076 l 0.006,0.076 0.005,0.077 0.003,0.077 0.002,0.077 0.001,0.077 0,28.654 c 0,0 -0.001,0.077 -0.001,0.077 l -0.002,0.077 -0.003,0.077 -0.005,0.076 -0.006,0.076 -0.007,0.076 -0.009,0.076 -0.01,0.076 -0.011,0.076 -0.013,0.076 c 0,0 -0.014,0.075 -0.014,0.075 l -0.015,0.075 -0.016,0.075 c 0,0 -0.018,0.075 -0.018,0.075 l -0.019,0.074 -0.02,0.074 -0.022,0.074 -0.023,0.073 c 0,0 -0.024,0.073 -0.024,0.073 l -0.025,0.072 -0.027,0.072 -0.028,0.071 -0.029,0.071 -0.03,0.07 -0.031,0.07 -0.033,0.069 -0.034,0.069 -0.035,0.068 -0.036,0.068 -0.037,0.067 -0.039,0.066 -0.04,0.066 c -0.041,0.065 -0.083,0.129 -0.083,0.129 -0.043,0.063 -0.087,0.126 -0.087,0.126 -0.045,0.062 -0.091,0.123 -0.091,0.123 -0.047,0.06 -0.096,0.12 -0.096,0.12 -0.049,0.059 -0.1,0.117 -0.1,0.117 -0.051,0.057 -0.104,0.113 -0.104,0.113 -0.053,0.055 -0.107,0.109 -0.107,0.109 -0.055,0.053 -0.111,0.106 -0.111,0.106 -0.057,0.051 -0.115,0.102 -0.115,0.102 -0.059,0.049 -0.118,0.098 -0.118,0.098 -0.06,0.047 -0.122,0.094 -0.122,0.094 -0.062,0.045 -0.125,0.089 -0.125,0.089 -0.063,0.043 -0.128,0.085 -0.128,0.085 -0.065,0.041 -0.131,0.08 -0.131,0.08 l -0.066,0.039 -0.067,0.037 -0.068,0.036 -0.068,0.035 -0.069,0.034 -0.069,0.033 c 0,0 -0.07,0.031 -0.07,0.031 l -0.07,0.03 -0.071,0.029 c 0,0 -0.071,0.028 -0.071,0.028 l -0.072,0.027 -0.072,0.025 -0.073,0.024 -0.073,0.023 -0.074,0.022 -0.074,0.02 -0.074,0.019 -0.075,0.018 -0.075,0.016 -0.075,0.015 -0.075,0.014 -0.076,0.013 c 0,0 -0.076,0.011 -0.076,0.011 0,0 -0.076,0.01 -0.076,0.01 l -0.076,0.009 -0.076,0.007 -0.076,0.006 -0.077,0.005 -0.077,0.003 -0.077,0.002 -0.077,10e-4 -55.251,0 -0.077,-10e-4 -0.077,-0.002 -0.077,-0.003 -0.077,-0.005 -0.076,-0.006 -0.076,-0.007 -0.076,-0.009 -0.076,-0.01 c 0,0 -0.076,-0.011 -0.076,-0.011 l -0.076,-0.013 c 0,0 -0.075,-0.014 -0.075,-0.014 l -0.075,-0.015 -0.075,-0.016 -0.075,-0.018 -0.074,-0.019 c 0,0 -0.074,-0.02 -0.074,-0.02 l -0.074,-0.022 -0.073,-0.023 c 0,0 -0.073,-0.024 -0.073,-0.024 l -0.072,-0.025 -0.072,-0.027 -0.071,-0.028 -0.071,-0.029 -0.07,-0.03 c 0,0 -0.07,-0.031 -0.07,-0.031 0,0 -0.069,-0.033 -0.069,-0.033 0,0 -0.069,-0.034 -0.069,-0.034 l -0.068,-0.035 -0.068,-0.036 -0.067,-0.037 -0.066,-0.039 -0.066,-0.04 c -0.065,-0.041 -0.129,-0.083 -0.129,-0.083 -0.063,-0.043 -0.126,-0.087 -0.126,-0.087 -0.062,-0.045 -0.123,-0.091 -0.123,-0.091 -0.06,-0.047 -0.12,-0.096 -0.12,-0.096 -0.059,-0.049 -0.117,-0.1 -0.117,-0.1 -0.057,-0.051 -0.113,-0.104 -0.113,-0.104 -0.055,-0.053 -0.109,-0.107 -0.109,-0.107 -0.053,-0.055 -0.106,-0.111 -0.106,-0.111 -0.051,-0.057 -0.102,-0.115 -0.102,-0.115 -0.049,-0.059 -0.098,-0.118 -0.098,-0.118 -0.047,-0.06 -0.094,-0.122 -0.094,-0.122 -0.045,-0.062 -0.089,-0.125 -0.089,-0.125 -0.043,-0.063 -0.085,-0.128 -0.085,-0.128 -0.041,-0.065 -0.08,-0.13 -0.08,-0.13 l -0.039,-0.066 -0.037,-0.067 -0.036,-0.068 -0.035,-0.068 -0.034,-0.069 -0.033,-0.069 -0.031,-0.07 -0.03,-0.07 -0.029,-0.071 -0.028,-0.071 -0.027,-0.072 -0.025,-0.072 -0.024,-0.073 c 0,0 -0.023,-0.073 -0.023,-0.073 l -0.022,-0.074 -0.02,-0.074 -0.019,-0.074 -0.018,-0.075 -0.016,-0.075 -0.015,-0.075 -0.014,-0.075 c 0,0 -0.013,-0.076 -0.013,-0.076 l -0.011,-0.076 -0.01,-0.076 -0.009,-0.076 -0.007,-0.076 -0.006,-0.076 -0.005,-0.076 -0.003,-0.077 c 0,0 -0.002,-0.077 -0.002,-0.077 l -0.001,-0.077 c 0,-0.003 0,-28.656 0,-28.656 z' stroke-miterlimit='10' inkscape:connector-curvature='0' style='fill:none;stroke:%23b3b3b3;stroke-width:2.75;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10' /%3E%3C/g%3E%3Cg id='POLYLINE_975_' transform='translate(-71.492931,-180.59788)' style='stroke:%23b3b3b3'%3E%3Cpath inkscape:connector-curvature='0' id='polygon4399' d='m 238.489,504.554 c -13.7295,-10.57865 -32.82499,-9.79744 -49.057,-7.053 -12.69907,2.02365 -23.75616,12.73069 -23.694,26.024 -0.0746,33.17758 -0.69909,66.44422 -0.165,99.578 2.11169,6.95673 11.26861,4.67351 16.47769,4.857 20.26635,-0.28571 40.64949,0.52728 60.85631,-0.328 7.24374,-2.47074 4.20689,-12.09579 4.67582,-17.56713 -0.4667,-30.01713 0.43516,-60.1121 -0.80382,-90.08587 -0.90312,-5.89054 -3.69588,-11.54822 -8.29,-15.425 z' style='fill:none;stroke:%23b3b3b3;stroke-width:2.75;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10' /%3E%3C/g%3E%3Cg id='POLYLINE_974_' transform='translate(-71.492931,-180.59788)' style='stroke:%23b3b3b3'%3E%3Cpath inkscape:connector-curvature='0' id='path4402' d='m 336.201,555.502 c 0.0933,-5.55959 -6.99291,-7.00392 -11.26561,-5.798 -15.3178,-0.85059 -30.98806,1.72503 -46.10539,-1.302 -16.83971,-4.72403 -27.27824,-20.73771 -34.233,-35.73' style='fill:none;stroke:%23b3b3b3;stroke-width:2.75;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10' /%3E%3C/g%3E%3Cg id='POLYLINE_973_' transform='translate(-71.492931,-180.59788)' style='stroke:%23b3b3b3'%3E%3Cpath inkscape:connector-curvature='0' id='polyline4405' d='m 135.792,558.924 c 15.93767,-3.61057 28.31593,-17.73034 29.75,-34.018 0.17418,-1.20836 0.30548,-2.42257 0.408,-3.639' style='fill:none;stroke:%23b3b3b3;stroke-width:2.75;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10' /%3E%3C/g%3E%3Cg id='POLYLINE_972_' transform='translate(-71.492931,-180.59788)' style='stroke:%23b3b3b3'%3E%3Cpath inkscape:connector-curvature='0' id='polyline4408' d='m 212.47,495.975 c -23.15537,-22.8173 -58.64005,-37.87877 -90.751,-26.66 -13.55961,4.19225 -22.281154,17.93715 -21.388,31.919 1.02868,27.34994 13.6595,52.45354 21.15795,78.36524 6.30952,17.8381 11.35248,36.23567 18.32005,53.78476 5.77975,8.11049 17.29904,3.46914 25.45882,4.681 54.19049,-0.18583 108.43637,0.36738 162.59318,-0.269 4.79096,-1.02551 8.40681,-5.55643 8.34,-10.458' style='fill:none;stroke:%23b3b3b3;stroke-width:2.75;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10' /%3E%3C/g%3E%3Cg id='POLYLINE_971_' transform='translate(-71.492931,-180.59788)' style='stroke:%23b3b3b3'%3E%3Cpath inkscape:connector-curvature='0' id='polyline4411' d='m 219.165,643.047 c 9.53233,0.667 19.06467,1.334 28.597,2.001 0,-2.32767 0,-4.65533 0,-6.983' style='fill:none;stroke:%23b3b3b3;stroke-width:2.75;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10' /%3E%3C/g%3E%3Cg id='POLYLINE_970_' transform='translate(-71.492931,-180.59788)' style='stroke:%23b3b3b3'%3E%3Cpath inkscape:connector-curvature='0' id='polyline4414' d='m 193.749,643.047 c -9.53233,0.667 -19.06467,1.334 -28.597,2.001 0,-2.32767 0,-4.65533 0,-6.983' style='fill:none;stroke:%23b3b3b3;stroke-width:2.75;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10' /%3E%3C/g%3E%3Cg id='POLYLINE_913_' transform='translate(-71.492931,-180.59788)' style='stroke:%23b3b3b3'%3E%3Cpath inkscape:connector-curvature='0' id='polyline4417' d='m 219.165,638.065 c 3.24796,10.00171 -7.04564,6.46186 -13.27825,6.983 -6.73898,-0.9411 -14.63175,3.61738 -12.13775,-6.983' style='fill:none;stroke:%23b3b3b3;stroke-width:2.75;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10' /%3E%3C/g%3E%3Cg id='POLYLINE_912_' transform='translate(-71.492931,-180.59788)' style='stroke:%23b3b3b3'%3E%3Cpath inkscape:connector-curvature='0' id='path4420' d='m 254.742,652.879 c -5.43076,-1.07591 -12.76901,3.52751 -10.073,9.592 5.20205,6.72806 15.43524,5.81205 22.965,6.979 14.73323,0.005 30.76119,2.01723 44.53,-4.347 5.80549,-2.81732 2.74437,-11.70515 -3.202,-11.845 -17.98229,-0.97686 -36.1939,-0.0651 -54.22,-0.379 z' style='fill:none;stroke:%23b3b3b3;stroke-width:2.75;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10' /%3E%3C/g%3E%3Cg id='POLYLINE_911_' transform='translate(-71.492931,-180.59788)' style='stroke:%23b3b3b3'%3E%3Cpath inkscape:connector-curvature='0' id='rect4423' d='m 261.89401,638.065 c 11.88467,0 23.76934,0 35.654,0 -1.33743,5.44477 3.94217,17.50658 -5.5326,14.814 -10.04047,0 -20.08093,0 -30.1214,0 0,-4.938 0,-9.876 0,-14.814 z' style='fill:none;stroke:%23b3b3b3;stroke-width:2.75;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10' /%3E%3C/g%3E%3Cg id='POLYLINE_910_' transform='translate(-71.492931,-180.59788)' style='stroke:%23b3b3b3'%3E%3Cpath id='path4426' d='m 475.823,569.084 -0.077,-10e-4 -0.077,-0.002 -0.077,-0.003 -0.077,-0.005 -0.076,-0.006 -0.076,-0.007 -0.076,-0.009 -0.076,-0.01 -0.076,-0.011 -0.076,-0.013 -0.075,-0.014 -0.075,-0.015 -0.075,-0.016 -0.075,-0.018 -0.074,-0.019 -0.074,-0.02 -0.074,-0.022 -0.073,-0.023 -0.073,-0.024 -0.072,-0.025 -0.072,-0.027 -0.071,-0.028 -0.071,-0.029 -0.07,-0.03 -0.07,-0.031 -0.069,-0.033 c 0,0 -0.069,-0.034 -0.069,-0.034 l -0.068,-0.035 -0.068,-0.036 -0.067,-0.037 -0.066,-0.039 -0.066,-0.04 c -0.065,-0.041 -0.129,-0.083 -0.129,-0.083 -0.063,-0.043 -0.126,-0.087 -0.126,-0.087 -0.062,-0.045 -0.123,-0.091 -0.123,-0.091 -0.06,-0.047 -0.12,-0.096 -0.12,-0.096 -0.059,-0.049 -0.116,-0.1 -0.116,-0.1 -0.057,-0.051 -0.113,-0.104 -0.113,-0.104 -0.055,-0.053 -0.109,-0.107 -0.109,-0.107 -0.053,-0.055 -0.106,-0.111 -0.106,-0.111 -0.051,-0.057 -0.102,-0.115 -0.102,-0.115 -0.049,-0.059 -0.098,-0.118 -0.098,-0.118 -0.047,-0.06 -0.094,-0.122 -0.094,-0.122 -0.045,-0.062 -0.089,-0.125 -0.089,-0.125 -0.043,-0.063 -0.085,-0.128 -0.085,-0.128 -0.041,-0.065 -0.08,-0.13 -0.08,-0.13 l -0.039,-0.066 -0.037,-0.067 -0.036,-0.068 -0.035,-0.068 -0.034,-0.069 -0.033,-0.069 -0.031,-0.07 -0.03,-0.07 -0.029,-0.071 -0.028,-0.071 -0.027,-0.072 -0.025,-0.072 -0.024,-0.073 c 0,0 -0.023,-0.073 -0.023,-0.073 l -0.022,-0.074 -0.02,-0.074 -0.019,-0.074 -0.018,-0.075 -0.016,-0.075 c 0,0 -0.015,-0.075 -0.015,-0.075 l -0.014,-0.075 -0.013,-0.076 c 0,0 -0.011,-0.076 -0.011,-0.076 0,0 -0.01,-0.076 -0.01,-0.076 l -0.009,-0.076 -0.007,-0.076 -0.006,-0.076 -0.005,-0.076 -0.003,-0.077 -0.002,-0.077 -10e-4,-0.077 0,-42.538 0.002,-0.282 0.006,-0.28 0.01,-0.278 0.014,-0.276 0.018,-0.274 0.022,-0.271 0.025,-0.269 0.029,-0.267 0.033,-0.265 0.037,-0.262 0.041,-0.26 0.045,-0.258 0.049,-0.256 0.053,-0.254 0.057,-0.251 0.061,-0.249 0.065,-0.247 c 0,0 0.069,-0.245 0.069,-0.245 l 0.072,-0.243 0.038,-0.12 c 0,0 0.039,-0.12 0.039,-0.12 l 0.04,-0.119 0.041,-0.119 0.042,-0.118 0.043,-0.118 0.044,-0.117 0.045,-0.117 0.046,-0.116 c 0,0 0.046,-0.115 0.046,-0.115 l 0.047,-0.115 0.048,-0.114 0.049,-0.114 0.05,-0.113 0.051,-0.113 0.052,-0.112 0.053,-0.112 0.054,-0.111 0.055,-0.11 0.056,-0.11 0.057,-0.109 0.058,-0.109 0.059,-0.108 0.06,-0.108 0.061,-0.107 0.062,-0.107 0.063,-0.106 0.064,-0.105 0.065,-0.105 0.066,-0.104 0.067,-0.104 0.068,-0.103 0.069,-0.103 c 0,0 0.07,-0.102 0.07,-0.102 l 0.071,-0.102 c 0,0 0.072,-0.101 0.072,-0.101 l 0.073,-0.101 0.074,-0.1 0.075,-0.099 0.076,-0.099 c 0,0 0.077,-0.098 0.077,-0.098 l 0.078,-0.098 0.079,-0.097 0.08,-0.097 0.081,-0.096 0.082,-0.096 0.083,-0.095 0.084,-0.094 0.17,-0.187 0.174,-0.185 0.178,-0.183 0.182,-0.18 c 0,0 0.186,-0.178 0.186,-0.178 0,0 0.19,-0.176 0.19,-0.176 l 0.194,-0.174 0.198,-0.172 0.202,-0.169 0.206,-0.167 0.209,-0.165 0.213,-0.163 0.217,-0.161 0.221,-0.158 0.225,-0.156 0.229,-0.154 0.233,-0.152 0.237,-0.15 0.241,-0.147 0.245,-0.145 0.249,-0.143 0.252,-0.141 0.256,-0.138 0.26,-0.136 0.264,-0.134 0.268,-0.132 0.272,-0.13 0.276,-0.127 0.28,-0.125 0.284,-0.123 0.288,-0.121 0.292,-0.118 0.296,-0.116 0.299,-0.114 0.303,-0.112 0.307,-0.11 0.311,-0.107 0.315,-0.105 0.319,-0.103 0.323,-0.101 0.327,-0.099 0.331,-0.096 0.335,-0.094 0.339,-0.092 0.342,-0.09 0.697,-0.173 0.712,-0.164 0.728,-0.155 0.744,-0.146 0.759,-0.137 0.775,-0.128 0.791,-0.12 0.806,-0.111 0.822,-0.102 0.838,-0.093 0.853,-0.084 c 0,0 0.869,-0.075 0.869,-0.075 l 0.885,-0.066 0.9,-0.058 0.916,-0.049 0.932,-0.04 0.947,-0.031 c 0,0 0.963,-0.022 0.963,-0.022 l 0.979,-0.013 0.994,-0.004 0.994,0.004 0.979,0.013 0.963,0.022 0.947,0.031 0.932,0.04 0.916,0.049 0.9,0.058 0.885,0.066 0.869,0.075 c 0,0 0.853,0.084 0.853,0.084 0,0 0.838,0.093 0.838,0.093 l 0.822,0.102 0.806,0.111 0.791,0.12 c 0,0 0.775,0.128 0.775,0.128 l 0.759,0.137 0.744,0.146 0.728,0.155 0.712,0.164 0.697,0.173 0.343,0.09 0.339,0.092 0.335,0.094 0.331,0.096 0.327,0.099 0.323,0.101 0.319,0.103 0.315,0.105 0.311,0.107 0.307,0.11 c 0,0 0.303,0.112 0.303,0.112 l 0.299,0.114 0.296,0.116 0.292,0.118 0.288,0.121 c 0,0 0.284,0.123 0.284,0.123 l 0.28,0.125 0.276,0.127 0.272,0.13 0.268,0.132 0.264,0.134 0.26,0.136 c 0,0 0.256,0.138 0.256,0.138 l 0.253,0.141 0.249,0.143 0.245,0.145 0.241,0.147 0.237,0.15 0.233,0.152 0.229,0.154 0.225,0.156 0.221,0.158 0.217,0.161 0.213,0.163 c 0,0 0.209,0.165 0.209,0.165 l 0.206,0.167 0.202,0.169 0.198,0.172 c 0,0 0.194,0.174 0.194,0.174 l 0.19,0.176 0.186,0.178 0.182,0.18 c 0,0 0.178,0.183 0.178,0.183 l 0.174,0.185 c 0,0 0.17,0.187 0.17,0.187 l 0.084,0.094 0.083,0.095 0.082,0.096 c 0,0 0.081,0.096 0.081,0.096 l 0.08,0.097 0.079,0.097 0.078,0.098 0.077,0.098 0.076,0.099 0.075,0.099 0.074,0.1 c 0,0 0.073,0.101 0.073,0.101 l 0.072,0.101 0.071,0.102 0.07,0.102 0.069,0.103 0.068,0.103 0.067,0.104 0.066,0.104 0.065,0.105 0.064,0.105 0.063,0.106 0.062,0.107 0.061,0.107 0.06,0.108 0.059,0.108 0.058,0.109 0.057,0.109 0.056,0.11 c 0,0 0.055,0.11 0.055,0.11 l 0.054,0.111 0.053,0.112 0.052,0.112 0.051,0.113 0.05,0.113 0.049,0.114 c 0,0 0.048,0.114 0.048,0.114 0,0 0.047,0.115 0.047,0.115 l 0.047,0.115 0.045,0.116 0.045,0.117 0.044,0.117 c 0,0 0.043,0.118 0.043,0.118 l 0.042,0.118 0.041,0.119 0.04,0.119 0.039,0.12 0.038,0.12 0.072,0.243 0.068,0.245 0.065,0.247 c 0,0 0.061,0.249 0.061,0.249 l 0.057,0.251 0.053,0.254 0.049,0.256 c 0,0 0.045,0.258 0.045,0.258 l 0.041,0.26 0.037,0.262 0.033,0.265 0.029,0.267 0.025,0.269 0.022,0.271 0.018,0.274 0.014,0.276 0.01,0.278 0.006,0.28 0.002,0.282 0,42.538 -10e-4,0.077 -0.002,0.077 -0.003,0.077 -0.005,0.076 -0.006,0.076 -0.007,0.076 -0.009,0.076 c 0,0 -0.01,0.076 -0.01,0.076 l -0.011,0.076 -0.013,0.076 c 0,0 -0.014,0.075 -0.014,0.075 l -0.015,0.075 -0.016,0.075 -0.018,0.075 -0.019,0.074 -0.02,0.074 -0.022,0.074 -0.023,0.073 -0.024,0.073 -0.025,0.072 -0.027,0.072 -0.028,0.071 -0.029,0.071 -0.03,0.07 -0.031,0.07 -0.033,0.069 -0.034,0.069 -0.035,0.068 c 0,0 -0.036,0.068 -0.036,0.068 l -0.037,0.067 -0.039,0.066 -0.04,0.066 c -0.041,0.065 -0.083,0.129 -0.083,0.129 -0.043,0.063 -0.087,0.126 -0.087,0.126 -0.045,0.062 -0.091,0.123 -0.091,0.123 -0.047,0.06 -0.096,0.12 -0.096,0.12 -0.049,0.059 -0.1,0.117 -0.1,0.117 -0.051,0.057 -0.104,0.113 -0.104,0.113 -0.053,0.055 -0.107,0.109 -0.107,0.109 -0.055,0.053 -0.111,0.106 -0.111,0.106 -0.057,0.051 -0.115,0.102 -0.115,0.102 -0.059,0.049 -0.118,0.098 -0.118,0.098 -0.06,0.047 -0.121,0.094 -0.121,0.094 -0.062,0.045 -0.125,0.089 -0.125,0.089 -0.063,0.043 -0.128,0.085 -0.128,0.085 -0.065,0.041 -0.131,0.081 -0.131,0.081 l -0.066,0.039 -0.067,0.037 -0.068,0.036 -0.068,0.035 -0.071,0.035 -0.069,0.033 -0.07,0.031 -0.07,0.03 -0.071,0.029 -0.071,0.028 -0.072,0.027 -0.072,0.025 -0.073,0.024 -0.073,0.023 -0.074,0.022 -0.074,0.02 -0.074,0.019 -0.075,0.018 -0.075,0.016 -0.075,0.015 c 0,0 -0.075,0.014 -0.075,0.014 0,0 -0.076,0.013 -0.076,0.013 l -0.076,0.011 -0.076,0.01 -0.076,0.009 -0.076,0.007 c 0,0 -0.076,0.006 -0.076,0.006 l -0.077,0.005 c 0,0 -0.077,0.003 -0.077,0.003 l -0.077,0.002 -0.077,10e-4 -27.625,0 -27.625,0 z' stroke-miterlimit='10' inkscape:connector-curvature='0' style='fill:none;stroke:%23b3b3b3;stroke-width:2.75;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10' /%3E%3C/g%3E%3Cg id='POLYLINE_909_' transform='translate(-71.492931,-180.59788)' style='stroke:%23b3b3b3'%3E%3Cpath id='path4429' d='m 535.515,584.809 -10e-4,-0.077 -0.002,-0.077 -0.003,-0.077 -0.005,-0.077 c 0,0 -0.006,-0.076 -0.006,-0.076 l -0.007,-0.076 -0.009,-0.076 c 0,0 -0.01,-0.076 -0.01,-0.076 l -0.011,-0.076 -0.013,-0.076 c 0,0 -0.014,-0.075 -0.014,-0.075 l -0.015,-0.075 -0.016,-0.075 -0.018,-0.075 -0.019,-0.074 -0.02,-0.074 -0.022,-0.074 -0.023,-0.073 -0.024,-0.073 -0.025,-0.072 -0.027,-0.072 -0.028,-0.071 -0.029,-0.071 -0.03,-0.07 -0.031,-0.07 -0.033,-0.069 c 0,0 -0.034,-0.069 -0.034,-0.069 l -0.035,-0.068 c 0,0 -0.036,-0.068 -0.036,-0.068 l -0.037,-0.067 -0.039,-0.066 -0.04,-0.066 c -0.041,-0.065 -0.083,-0.129 -0.083,-0.129 -0.043,-0.063 -0.087,-0.126 -0.087,-0.126 -0.045,-0.062 -0.091,-0.123 -0.091,-0.123 -0.047,-0.06 -0.096,-0.12 -0.096,-0.12 -0.049,-0.059 -0.1,-0.116 -0.1,-0.116 -0.051,-0.057 -0.104,-0.113 -0.104,-0.113 -0.053,-0.055 -0.107,-0.109 -0.107,-0.109 -0.055,-0.053 -0.111,-0.106 -0.111,-0.106 -0.057,-0.051 -0.115,-0.102 -0.115,-0.102 -0.059,-0.049 -0.118,-0.098 -0.118,-0.098 -0.06,-0.047 -0.121,-0.094 -0.121,-0.094 -0.062,-0.045 -0.125,-0.089 -0.125,-0.089 -0.063,-0.043 -0.128,-0.085 -0.128,-0.085 -0.065,-0.041 -0.131,-0.08 -0.131,-0.08 l -0.066,-0.039 -0.067,-0.037 -0.068,-0.036 -0.068,-0.035 -0.067,-0.034 -0.069,-0.033 -0.07,-0.031 -0.07,-0.03 -0.071,-0.029 -0.071,-0.028 -0.072,-0.027 -0.072,-0.025 -0.073,-0.024 -0.073,-0.023 -0.074,-0.022 -0.074,-0.02 -0.074,-0.019 -0.075,-0.018 -0.075,-0.016 -0.075,-0.015 c 0,0 -0.075,-0.014 -0.075,-0.014 0,0 -0.076,-0.013 -0.076,-0.013 l -0.076,-0.011 -0.076,-0.01 -0.076,-0.009 -0.076,-0.007 c 0,0 -0.076,-0.006 -0.076,-0.006 l -0.077,-0.005 -0.077,-0.003 -0.077,-0.002 -0.077,-10e-4 -55.251,0 -0.077,10e-4 -0.077,0.002 -0.077,0.003 -0.077,0.005 -0.076,0.006 -0.076,0.007 -0.076,0.009 -0.076,0.01 -0.076,0.011 -0.076,0.013 -0.075,0.014 -0.075,0.015 -0.075,0.016 -0.075,0.018 -0.074,0.019 -0.074,0.02 -0.074,0.022 -0.073,0.023 -0.073,0.024 -0.072,0.025 -0.072,0.027 -0.071,0.028 -0.071,0.029 -0.07,0.03 -0.07,0.031 -0.069,0.033 c 0,0 -0.069,0.034 -0.069,0.034 l -0.068,0.035 -0.068,0.036 c 0,0 -0.067,0.037 -0.067,0.037 l -0.066,0.039 -0.066,0.04 c -0.065,0.041 -0.129,0.083 -0.129,0.083 -0.063,0.043 -0.126,0.087 -0.126,0.087 -0.062,0.045 -0.123,0.091 -0.123,0.091 -0.06,0.047 -0.12,0.096 -0.12,0.096 -0.059,0.049 -0.116,0.1 -0.116,0.1 -0.057,0.051 -0.113,0.104 -0.113,0.104 -0.055,0.053 -0.109,0.107 -0.109,0.107 -0.053,0.055 -0.106,0.111 -0.106,0.111 -0.051,0.057 -0.102,0.115 -0.102,0.115 -0.049,0.059 -0.098,0.118 -0.098,0.118 -0.047,0.06 -0.094,0.122 -0.094,0.122 -0.045,0.062 -0.089,0.125 -0.089,0.125 -0.043,0.063 -0.085,0.128 -0.085,0.128 -0.041,0.065 -0.08,0.131 -0.08,0.131 l -0.039,0.066 -0.037,0.067 -0.036,0.068 -0.035,0.068 -0.034,0.069 -0.033,0.069 -0.031,0.07 -0.03,0.07 -0.029,0.071 -0.028,0.071 -0.027,0.072 -0.025,0.072 -0.024,0.073 c 0,0 -0.023,0.073 -0.023,0.073 l -0.022,0.074 -0.02,0.074 -0.019,0.074 -0.018,0.075 -0.016,0.075 c 0,0 -0.015,0.075 -0.015,0.075 l -0.014,0.075 -0.013,0.076 -0.011,0.076 c 0,0 -0.01,0.076 -0.01,0.076 l -0.009,0.076 c 0,0 -0.007,0.076 -0.007,0.076 l -0.006,0.076 -0.005,0.077 -0.003,0.077 -0.002,0.077 -10e-4,0.077 0,28.654 c 0,0 10e-4,0.077 10e-4,0.077 l 0.002,0.077 0.003,0.077 0.005,0.076 0.006,0.076 0.007,0.076 0.009,0.076 0.01,0.076 0.011,0.076 0.013,0.076 0.014,0.075 0.015,0.075 c 0,0 0.016,0.075 0.016,0.075 l 0.018,0.075 0.019,0.074 0.02,0.074 0.022,0.074 0.023,0.073 c 0,0 0.024,0.073 0.024,0.073 l 0.025,0.072 0.027,0.072 0.028,0.071 0.029,0.071 0.03,0.07 0.031,0.07 0.033,0.069 0.034,0.069 0.035,0.068 0.036,0.068 0.037,0.067 0.039,0.066 0.04,0.066 c 0.041,0.065 0.083,0.129 0.083,0.129 0.043,0.063 0.087,0.126 0.087,0.126 0.045,0.062 0.091,0.123 0.091,0.123 0.047,0.06 0.096,0.12 0.096,0.12 0.049,0.059 0.1,0.117 0.1,0.117 0.051,0.057 0.104,0.113 0.104,0.113 0.053,0.055 0.107,0.109 0.107,0.109 0.055,0.053 0.111,0.106 0.111,0.106 0.057,0.051 0.115,0.102 0.115,0.102 0.059,0.049 0.118,0.098 0.118,0.098 0.06,0.047 0.121,0.094 0.121,0.094 0.062,0.045 0.125,0.089 0.125,0.089 0.063,0.043 0.128,0.085 0.128,0.085 0.065,0.041 0.131,0.08 0.131,0.08 l 0.066,0.039 0.067,0.037 0.068,0.036 0.068,0.035 0.069,0.034 0.069,0.033 0.07,0.031 0.07,0.03 0.071,0.029 0.071,0.028 0.072,0.027 0.072,0.025 0.073,0.024 0.073,0.023 0.074,0.022 c 0,0 0.074,0.02 0.074,0.02 l 0.074,0.019 0.075,0.018 0.075,0.016 0.075,0.015 0.075,0.014 0.076,0.013 0.076,0.011 0.076,0.01 0.076,0.009 c 0,0 0.076,0.007 0.076,0.007 l 0.076,0.006 0.077,0.005 0.077,0.003 0.077,0.002 0.077,10e-4 55.251,0 0.077,-10e-4 0.077,-0.002 0.077,-0.003 0.077,-0.005 0.076,-0.006 c 0,0 0.076,-0.007 0.076,-0.007 0,0 0.076,-0.009 0.076,-0.009 l 0.076,-0.01 c 0,0 0.076,-0.011 0.076,-0.011 l 0.076,-0.013 c 0,0 0.075,-0.014 0.075,-0.014 0,0 0.075,-0.015 0.075,-0.015 l 0.075,-0.016 0.075,-0.018 0.074,-0.019 0.074,-0.02 0.074,-0.022 0.073,-0.023 0.073,-0.024 0.072,-0.025 0.072,-0.027 0.071,-0.028 c 0,0 0.071,-0.029 0.071,-0.029 l 0.07,-0.03 0.07,-0.031 0.069,-0.033 c 0,0 0.069,-0.034 0.069,-0.034 l 0.068,-0.035 0.068,-0.036 0.067,-0.037 0.066,-0.039 0.066,-0.04 c 0.065,-0.041 0.129,-0.083 0.129,-0.083 0.063,-0.043 0.126,-0.087 0.126,-0.087 0.062,-0.045 0.123,-0.091 0.123,-0.091 0.06,-0.047 0.12,-0.096 0.12,-0.096 0.059,-0.049 0.116,-0.1 0.116,-0.1 0.057,-0.051 0.113,-0.104 0.113,-0.104 0.055,-0.053 0.109,-0.107 0.109,-0.107 0.053,-0.055 0.106,-0.111 0.106,-0.111 0.051,-0.057 0.102,-0.115 0.102,-0.115 0.049,-0.059 0.098,-0.118 0.098,-0.118 0.047,-0.06 0.094,-0.122 0.094,-0.122 0.045,-0.062 0.089,-0.125 0.089,-0.125 0.043,-0.063 0.085,-0.128 0.085,-0.128 0.041,-0.065 0.08,-0.13 0.08,-0.13 l 0.039,-0.066 0.037,-0.067 0.036,-0.068 0.035,-0.068 0.034,-0.069 0.033,-0.069 0.031,-0.07 0.03,-0.07 0.029,-0.071 0.028,-0.071 0.027,-0.072 0.025,-0.072 0.024,-0.073 0.023,-0.073 0.022,-0.074 0.02,-0.074 0.019,-0.074 0.018,-0.075 0.016,-0.075 0.015,-0.075 0.014,-0.075 c 0,0 0.013,-0.076 0.013,-0.076 l 0.011,-0.076 0.01,-0.076 0.009,-0.076 0.007,-0.076 0.006,-0.076 0.005,-0.076 0.003,-0.077 0.002,-0.077 0.001,-0.077 0,-28.656 z' stroke-miterlimit='10' inkscape:connector-curvature='0' style='fill:none;stroke:%23b3b3b3;stroke-width:2.75;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10' /%3E%3C/g%3E%3Cg id='POLYLINE_908_' transform='translate(-71.492931,-180.59788)' style='stroke:%23b3b3b3'%3E%3Cpath inkscape:connector-curvature='0' id='polygon4432' d='m 471.416,504.554 c 13.73004,-10.57854 32.82557,-9.79745 49.058,-7.053 12.69833,2.02415 23.75635,12.73082 23.693,26.024 0.0763,33.1775 0.70081,66.44446 0.165,99.578 -2.1106,6.95678 -11.26834,4.67339 -16.47669,4.857 -20.26669,-0.28572 -40.6501,0.5273 -60.85731,-0.328 -7.24361,-2.47136 -4.2055,-12.0957 -4.67482,-17.56713 0.46612,-30.01714 -0.43394,-60.11204 0.80282,-90.08587 0.90434,-5.89036 3.69602,-11.54776 8.29,-15.425 z' style='fill:none;stroke:%23b3b3b3;stroke-width:2.75;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10' /%3E%3C/g%3E%3Cg id='POLYLINE_907_' transform='translate(-71.492931,-180.59788)' style='stroke:%23b3b3b3'%3E%3Cpath inkscape:connector-curvature='0' id='path4435' d='m 373.704,555.502 c -0.0933,-5.55959 6.99291,-7.00392 11.26561,-5.798 15.3178,-0.85059 30.98806,1.72503 46.10539,-1.302 16.83926,-4.72376 27.27725,-20.73852 34.232,-35.73' style='fill:none;stroke:%23b3b3b3;stroke-width:2.75;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10' /%3E%3C/g%3E%3Cg id='POLYLINE_906_' transform='translate(-71.492931,-180.59788)' style='stroke:%23b3b3b3'%3E%3Cpath inkscape:connector-curvature='0' id='polyline4438' d='m 574.113,558.924 c -15.93744,-3.61108 -28.31531,-17.73055 -29.75,-34.018 -0.17133,-1.2087 -0.30619,-2.4225 -0.408,-3.639' style='fill:none;stroke:%23b3b3b3;stroke-width:2.75;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10' /%3E%3C/g%3E%3Cg id='POLYLINE_903_' transform='translate(-71.492931,-180.59788)' style='stroke:%23b3b3b3'%3E%3Cpath inkscape:connector-curvature='0' id='polyline4441' d='m 497.435,495.975 c 23.15566,-22.8168 58.64005,-37.87899 90.751,-26.66 13.55951,4.19201 22.28255,17.93685 21.388,31.919 -1.0271,27.34993 -13.65877,52.45363 -21.15734,78.36511 -6.30986,17.83802 -11.3528,36.23609 -18.32066,53.78489 -5.77896,8.11098 -17.29945,3.46869 -25.45882,4.681 -54.19049,-0.18583 -108.43636,0.36739 -162.59318,-0.269 -4.79117,-1.02597 -8.40561,-5.55644 -8.34,-10.458' style='fill:none;stroke:%23b3b3b3;stroke-width:2.75;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10' /%3E%3C/g%3E%3Cg id='POLYLINE_902_' transform='translate(-71.492931,-180.59788)' style='stroke:%23b3b3b3'%3E%3Cpath inkscape:connector-curvature='0' id='path4444' d='m 455.163,652.879 c 5.43076,-1.07591 12.76901,3.52751 10.073,9.592 -5.20034,6.72882 -15.43515,5.81158 -22.964,6.979 -14.73354,0.005 -30.76186,2.01722 -44.531,-4.347 -5.80475,-2.81684 -2.74556,-11.70537 3.201,-11.845 17.97137,-1.20679 36.19578,0.12704 54.221,-0.379 z' style='fill:none;stroke:%23b3b3b3;stroke-width:2.75;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10' /%3E%3C/g%3E%3Cg id='POLYLINE_901_' transform='translate(-71.492931,-180.59788)' style='stroke:%23b3b3b3'%3E%3Cpath inkscape:connector-curvature='0' id='polyline4447' d='m 520.319,638.065 c 1.02665,4.96216 -4.37055,8.37142 -8.84256,6.983 -7.26337,-1.00799 -15.3093,1.75007 -22.27344,-0.821 -2.12106,-1.23757 -2.92459,-3.82275 -2.625,-6.162' style='fill:none;stroke:%23b3b3b3;stroke-width:2.75;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10' /%3E%3C/g%3E%3Cg id='POLYLINE_900_' transform='translate(-71.492931,-180.59788)' style='stroke:%23b3b3b3'%3E%3Cpath inkscape:connector-curvature='0' id='polyline4450' d='m 559.834,638.065 c 1.02801,4.9625 -4.37075,8.37162 -8.84256,6.983 -7.26352,-1.00779 -15.30897,1.7498 -22.27344,-0.821 -2.12078,-1.23858 -2.92325,-3.82238 -2.625,-6.162' style='fill:none;stroke:%23b3b3b3;stroke-width:2.75;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10' /%3E%3C/g%3E%3Cg id='POLYLINE_896_' transform='translate(-71.492931,-180.59788)' style='stroke:%23b3b3b3'%3E%3Cpath inkscape:connector-curvature='0' id='polyline4453' d='m 413.581,555.502 c -39.08533,0 -78.17067,0 -117.256,0' style='fill:none;stroke:%23b3b3b3;stroke-width:2.75;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10' /%3E%3C/g%3E%3Cg id='POLYLINE_890_' transform='translate(-71.492931,-180.59788)' style='stroke:%23b3b3b3'%3E%3Cpath inkscape:connector-curvature='0' id='polyline4456' d='m 409.399,555.502 c 11.74919,0.16953 27.79864,-1.70379 34.729,10.35 8.61756,14.7726 8.57373,34.25361 1.237,49.508 -8.59637,12.55027 -26.14656,11.30196 -39.52965,11.413 -39.40161,-0.26911 -78.83705,0.5331 -118.21835,-0.391 -10.98809,-0.43631 -23.66536,-5.94268 -25.92,-17.85 -4.18135,-15.93563 -3.97693,-36.39051 9.072,-48.265 8.44517,-6.13895 19.98581,-4.27103 29.737,-4.765' style='fill:none;stroke:%23b3b3b3;stroke-width:2.75;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10' /%3E%3C/g%3E%3Cg id='POLYLINE_888_' transform='translate(-71.492931,-180.59788)' style='stroke:%23b3b3b3'%3E%3Cpath inkscape:connector-curvature='0' id='polyline4459' d='m 480.804,638.065 c 1.02702,4.96217 -4.37067,8.3715 -8.84256,6.983 -7.26341,-1.00795 -15.3092,1.75001 -22.27344,-0.821 -2.82964,-1.11432 -2.13236,-5.49355 -3.73152,-6.162 -11.19949,0 -22.39899,0 -33.59848,0 1.33744,5.44477 -3.94217,17.50657 5.53261,14.814 10.04046,0 20.08093,0 30.12139,0 0,-3.41967 0,-6.83933 0,-10.259' style='fill:none;stroke:%23b3b3b3;stroke-width:2.75;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10' /%3E%3C/g%3E%3Cg id='AG-OUTLINE' transform='translate(-71.492931,-180.59788)' style='stroke:%23b3b3b3'%3E%3Cg id='POLYLINE_390_' style='stroke:%23b3b3b3'%3E%3Cpath inkscape:connector-curvature='0' id='path4478' d='m 212.47,495.975 c -23.15748,-22.81465 -58.63991,-37.87761 -90.751,-26.657 -13.25342,4.12987 -22.144226,17.42541 -21.386,31.219 0.81482,27.61399 13.58649,52.92993 21.15334,79.06211 6.28807,17.76431 11.32297,36.07431 18.19066,53.58789 5.01547,7.79722 15.96191,4.10534 23.37177,4.881 1.98517,4.92188 4.00435,9.19743 13.13545,6.21063 6.05204,0.4669 15.73985,-3.1815 18.6653,0.77237 8.10316,0 16.20632,0 24.30948,0 2.41701,-4.34524 13.06211,0.13346 18.76498,-0.68797 10.56295,4.4848 7.71584,-4.89474 13.15158,-6.29503 8.60454,-1.68082 13.08353,0.76389 10.81244,9.95869 2.28191,7.08694 -4.97905,4.35062 -9.343,4.94431 -5.1899,-0.51485 -10.61437,5.06147 -7.578,10.013 6.62603,6.83347 17.75347,5.56664 26.413,6.654 13.65232,-0.35352 28.80714,1.70905 41.329,-4.904 5.18572,-3.16617 1.84571,-11.32647 -3.754,-11.473 -3.62833,-1.24508 -9.71189,1.13511 -11.409,-1.48752 0.7499,-6.0323 -3.31978,-16.88418 6.63913,-13.70748 8.59556,-1.08208 17.97616,2.01822 26.21487,-1.208 3.58635,-1.83034 5.85099,-5.80079 5.802,-9.801 12.35924,-0.14984 25.7807,-0.91657 37.51,0.374 -0.0644,7.11301 7.34397,12.04161 14.04356,10.635 8.20248,0 16.40496,0 24.60744,0 -1.33744,5.44477 3.94217,17.50657 -5.53261,14.814 -5.04377,-0.76797 -12.90624,1.32367 -12.20039,7.805 1.54814,6.70451 10.73949,6.89215 16.048,8.079 16.71119,1.16579 34.39969,2.70616 50.495,-2.865 5.24241,-1.34668 6.22821,-8.88187 1.517,-11.443 -4.44607,-2.46833 -9.85342,-1.26386 -14.668,-1.578 -0.78019,-2.97877 0.85097,-8.13909 0.487,-9.639 4.95159,4.34986 12.63122,0.50515 18.46777,1.806 4.47722,0.25476 13.24721,1.54478 13.82323,-5.153 -1.05337,-3.01683 7.26031,-3.07641 5.837,0.378 1.26795,7.10234 10.63957,4.42945 15.43269,4.775 5.50004,-1.22656 14.81146,3.11074 17.92131,-3.618 0.29782,-3.00655 1.05371,-4.26009 4.76508,-3.367 2.10616,0.26579 0.93473,5.09368 3.96892,6.16 7.16925,2.4734 15.35861,-0.10964 22.82238,0.825 4.35768,1.23112 9.28474,-2.27575 8.30262,-6.985 6.79822,0.89199 12.22807,-5.15131 12.97279,-11.5449 11.11705,-34.80862 23.93734,-69.10636 33.90292,-104.26267 3.8488,-15.30786 5.90729,-35.4278 -7.63371,-46.69543 -19.56437,-14.73615 -47.17239,-11.50071 -68.42,-2.304 -12.77339,5.1495 -23.64629,14.38322 -34.009,22.766 -12.85421,0.45631 -27.78844,5.70742 -32.419,18.92 -7.78423,16.95528 -22.15024,34.81289 -42.496,34.752 -14.7111,0.39881 -29.60407,-0.68683 -44.238,0.357 -2.22047,0.77985 -3.79661,3.02824 -3.796,5.377 -12.25625,-0.3763 -26.23332,0.93179 -37.532,-0.523 -0.52731,-5.82385 -8.09777,-6.0414 -12.34313,-5.211 -15.07567,-0.88462 -30.54094,1.81683 -45.39087,-1.413 -18.25379,-5.32445 -27.93904,-23.3247 -35.866,-39.19 -6.61745,-9.62098 -19.15634,-12.44801 -30.112,-13.113 z' style='fill:none;stroke:%23b3b3b3;stroke-width:3.5;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10' /%3E%3C/g%3E%3C/g%3E%3C/g%3E%3Cg transform='translate(-3.5574013e-7,2.448627)' style='display:inline' id='g5973'%3E%3Crect id='rect4351-3' height='11.350078' width='33.550537' stroke-miterlimit='10' y='133.36255' x='307.15717' style='display:inline;fill:none;stroke:%23b3b3b3;stroke-width:2.75;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10' /%3E%3Cpath style='fill:none;stroke:%23b3b3b3;stroke-width:2.75;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10' d='m 406.15407,136.40449 c -6.97081,10.76872 -25.21944,8.53464 -29.386,-3.598 -5.30393,-11.68009 6.42428,-25.83614 18.887,-22.798 11.82812,1.97183 17.75003,16.82115 10.499,26.396 z' id='polygon4330' inkscape:connector-curvature='0' /%3E%3Cpath style='fill:none;stroke:%23b3b3b3;stroke-width:2.75;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10' d='m 441.79407,100.76549 c 10.76719,-6.972041 8.53404,-25.218531 -3.598,-29.386001 -11.68022,-5.30481 -25.837,6.42399 -22.799,18.887 1.9729,11.828841 16.82096,17.748901 26.397,10.499001 z' id='polygon4333' inkscape:connector-curvature='0' /%3E%3Cpath style='fill:none;stroke:%23b3b3b3;stroke-width:2.75;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10' d='m 441.79407,152.37749 c 10.76754,6.97268 8.53353,25.21788 -3.598,29.387 -11.68098,5.30245 -25.83678,-6.42453 -22.799,-18.888 1.97292,-11.82886 16.82091,-17.74874 26.397,-10.499 z' id='polygon4336' inkscape:connector-curvature='0' /%3E%3Cpath style='fill:none;stroke:%23b3b3b3;stroke-width:2.75;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10' d='m 384.29607,64.080489 c 1.92454,-12.22111 0.72471,-26.18888 7.667,-36.968 12.01309,-9.495186 28.86661,-8.31303 43.323,-8.525 10.89019,1.107942 24.25309,0.08628 32.861,8.061 6.12371,9.65641 4.69071,22.90062 6.17,33.719' id='polyline4339' inkscape:connector-curvature='0' /%3E%3Cpath style='fill:none;stroke:%23b3b3b3;stroke-width:2.75;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10' d='m 400.31107,22.244489 c 2.57196,-9.919001 15.01339,-10.905848 23.39151,-10.28 11.76272,1.04065 27.8041,-3.538464 36.35349,7.339 0.75267,1.031888 1.37529,2.156121 1.879,3.329' id='polyline4342' inkscape:connector-curvature='0' /%3E%3Crect style='fill:none;stroke:%23b3b3b3;stroke-width:2.75;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10' x='225.77208' y='133.36255' stroke-miterlimit='10' width='33.550537' height='11.350078' id='rect4351' /%3E%3Cpath style='fill:none;stroke:%23b3b3b3;stroke-width:2.75;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10' d='m 337.96307,170.22449 c -18.50724,12.30972 -19.80127,42.03028 -2.434,55.902 16.34616,15.06203 45.52484,9.27345 54.886,-10.886 10.75683,-19.4515 -1.78248,-46.42633 -23.587,-50.742 -9.85735,-2.36469 -20.65729,-0.22425 -28.865,5.726 z' id='polygon4357' inkscape:connector-curvature='0' /%3E%3Cpath style='fill:none;stroke:%23b3b3b3;stroke-width:2.75;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10' d='m 505.21807,98.104489 c -12.7487,-34.7835 -52.31917,-56.52483 -88.515,-48.632 -36.47394,6.48796 -64.78185,41.66241 -63.321,78.680001 0.11937,5.93974 0.91571,11.8651 2.367,17.626 -30.16808,0.79248 -54.96933,30.88378 -49.986,60.648 3.25381,30.00214 35.2693,52.26383 64.527,44.866 22.67555,-4.66614 40.59326,-25.57591 41.728,-48.699 35.64579,10.09103 76.47153,-9.19082 91.323,-43.13 8.89471,-19.1116 9.58689,-41.73817 1.877,-61.359001 z' id='polygon4360' inkscape:connector-curvature='0' /%3E%3Cpath style='fill:none;stroke:%23b3b3b3;stroke-width:2.75;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10' d='m 394.11007,239.14449 c 18.77064,22.30934 36.33743,45.70986 55.775,67.415 20.07591,19.36003 56.28311,18.01685 73.582,-4.387 14.4996,-16.96173 15.2994,-41.14805 9.66039,-61.79323 -7.61513,-40.11559 -15.23026,-80.23118 -22.84539,-120.34677' id='polyline4363' inkscape:connector-curvature='0' /%3E%3Cpath style='fill:none;stroke:%23b3b3b3;stroke-width:2.75;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10' d='m 228.96707,170.22449 c 18.50643,12.31065 19.80032,42.02938 2.434,55.902 -16.3462,15.06144 -45.52567,9.27419 -54.886,-10.886 -10.75764,-19.45092 1.78173,-46.42608 23.586,-50.742 9.85783,-2.36484 20.65763,-0.22396 28.866,5.726 z' id='polygon4366' inkscape:connector-curvature='0' /%3E%3Cpath style='fill:none;stroke:%23b3b3b3;stroke-width:2.75;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10' d='m 61.712069,98.104489 c 12.74774,-34.78418 52.319331,-56.52472 88.515001,-48.632 36.4739,6.48858 64.78087,41.66242 63.321,78.680001 -0.1218,5.93957 -0.91503,11.8654 -2.368,17.626 30.16812,0.79211 54.97012,30.88374 49.986,60.648 -3.25276,30.00261 -35.26948,52.2638 -64.527,44.866 -22.67558,-4.66649 -40.59235,-25.57604 -41.728,-48.699 -35.64532,10.09085 -76.471521,-9.19061 -91.322001,-43.13 -8.89491,-19.11113 -9.58819,-41.73879 -1.877,-61.359001 z' id='polygon4369' inkscape:connector-curvature='0' /%3E%3Cpath style='fill:none;stroke:%23b3b3b3;stroke-width:2.75;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10' d='m 172.81907,239.14449 c -18.77023,22.30945 -36.33671,45.70973 -55.774,67.415 -20.076211,19.35932 -56.283491,18.01758 -73.582001,-4.387 -14.50037,-16.9612 -15.299764,-41.14802 -9.66139,-61.79323 7.61513,-40.11559 15.23026,-80.23118 22.84539,-120.34677' id='polyline4372' inkscape:connector-curvature='0' /%3E%3Cpath style='fill:none;stroke:%23b3b3b3;stroke-width:2.75;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10' d='m 261.20607,206.13149 c 14.839,0 29.678,0 44.517,0' id='polyline4375' inkscape:connector-curvature='0' /%3E%3Cpath style='fill:none;stroke:%23b3b3b3;stroke-width:2.75;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10' d='m 258.13207,218.24149 c 16.88833,0 33.77667,0 50.665,0' id='polyline4378' inkscape:connector-curvature='0' /%3E%3Cpath style='fill:none;stroke:%23b3b3b3;stroke-width:2.75;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10' d='m 182.63407,64.080489 c -1.92618,-12.22085 -0.72471,-26.18943 -7.668,-36.968 -12.01241,-9.495322 -28.86607,-8.312892 -43.322,-8.525 -10.8907,1.107612 -24.25333,0.0866 -32.862001,8.061 -6.12293,9.65739 -4.69014,22.9 -6.169,33.719' id='polyline4381' inkscape:connector-curvature='0' /%3E%3Cpath style='fill:none;stroke:%23b3b3b3;stroke-width:2.75;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10' d='m 166.61807,22.244489 c -2.57079,-9.919071 -15.01299,-10.905641 -23.39051,-10.28 -11.76328,1.040501 -27.80423,-3.538312 -36.35449,7.339 -0.75194,1.032369 -1.37502,2.156238 -1.879,3.329' id='polyline4384' inkscape:connector-curvature='0' /%3E%3Cpath style='fill:none;stroke:%23b3b3b3;stroke-width:2.75;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10' d='m 457.76707,136.40449 c 6.97036,10.76937 25.21879,8.53406 29.386,-3.598 5.30292,-11.68071 -6.42492,-25.83621 -18.888,-22.798 -11.82771,1.97199 -17.74986,16.82198 -10.498,26.396 z' id='polygon4387' inkscape:connector-curvature='0' /%3E%3Cpath style='fill:none;stroke:%23b3b3b3;stroke-width:2.75;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10' d='m 384.58207,60.639489 c -67.417,0 -134.834,0 -202.251,0' id='polyline4390' inkscape:connector-curvature='0' /%3E%3C/g%3E%3Cg id='g6837' transform='translate(109.35022,-35.693778)' style='display:inline;stroke:%23b3b3b3'%3E%3Cg id='POLYLINE_729_' transform='translate(-247.74715,-95.119606)' style='stroke:%23b3b3b3'%3E%3Cpolygon id='polygon6074' points='242.998,227.977 242.449,228.511 241.908,229.053 241.377,229.606 240.856,230.167 240.345,230.737 239.843,231.316 239.352,231.904 238.871,232.5 238.4,233.105 237.941,233.717 237.491,234.338 237.053,234.966 236.626,235.602 236.21,236.245 235.805,236.895 235.411,237.552 235.029,238.216 234.659,238.887 234.3,239.564 233.953,240.246 233.618,240.935 233.295,241.63 232.985,242.33 232.686,243.036 232.4,243.746 232.126,244.462 231.865,245.182 231.616,245.906 231.38,246.635 231.157,247.367 230.946,248.104 230.748,248.844 230.564,249.587 230.392,250.334 230.233,251.083 230.087,251.835 229.954,252.59 229.835,253.346 229.729,254.105 229.636,254.865 229.556,255.627 229.489,256.39 229.436,257.154 229.396,257.919 229.369,258.685 229.356,259.451 229.356,260.217 229.369,260.983 229.396,261.748 229.436,262.513 229.489,263.277 229.556,264.04 229.636,264.802 229.729,265.562 229.835,266.321 229.954,267.078 230.087,267.832 230.233,268.584 230.392,269.333 230.564,270.08 230.748,270.823 230.946,271.563 231.157,272.3 231.38,273.033 231.616,273.761 231.865,274.486 232.126,275.206 232.4,275.921 232.686,276.632 232.985,277.337 233.295,278.037 233.618,278.732 233.953,279.421 234.3,280.104 234.659,280.781 235.029,281.451 235.411,282.115 235.805,282.772 236.21,283.422 236.626,284.066 237.053,284.701 237.491,285.329 237.941,285.95 238.4,286.563 238.871,287.167 239.352,287.763 239.843,288.351 240.345,288.93 240.856,289.5 241.377,290.062 241.908,290.614 242.449,291.157 242.998,291.69 243.557,292.214 244.125,292.728 244.702,293.231 245.288,293.725 245.882,294.209 246.485,294.682 247.095,295.144 247.714,295.596 248.34,296.037 248.974,296.467 249.615,296.886 250.264,297.294 250.919,297.69 251.581,298.075 252.25,298.449 252.925,298.81 253.607,299.16 254.294,299.498 254.987,299.824 255.686,300.138 256.39,300.439 257.1,300.729 257.814,301.006 258.533,301.27 259.256,301.522 259.984,301.761 260.716,301.988 261.451,302.201 262.19,302.402 262.933,302.59 263.679,302.765 264.427,302.928 265.179,303.077 265.932,303.213 266.689,303.335 267.447,303.445 268.207,303.541 268.968,303.625 269.731,303.694 270.495,303.751 271.26,303.794 272.025,303.824 272.791,303.841 273.557,303.844 274.323,303.834 275.088,303.811 275.854,303.774 276.618,303.724 277.381,303.661 278.143,303.585 278.904,303.495 279.663,303.392 280.42,303.276 281.175,303.146 281.928,303.004 282.678,302.848 283.425,302.68 284.169,302.498 284.91,302.303 285.648,302.096 286.381,301.876 287.111,301.643 287.837,301.397 288.558,301.139 289.274,300.869 289.986,300.586 290.693,300.29 291.394,299.982 292.09,299.663 292.781,299.331 293.465,298.987 294.144,298.631 294.816,298.263 295.481,297.884 296.14,297.494 296.792,297.092 297.437,296.678 298.075,296.254 298.705,295.818 299.327,295.372 299.942,294.914 300.548,294.447 301.147,293.968 301.736,293.48 302.318,292.981 302.89,292.472 303.454,291.953 304.008,291.424 304.553,290.886 305.089,290.339 305.615,289.782 306.132,289.216 306.638,288.642 307.134,288.058 307.62,287.466 308.096,286.866 308.561,286.257 309.016,285.641 309.46,285.016 309.893,284.384 310.314,283.745 310.725,283.098 311.124,282.444 311.512,281.784 311.888,281.117 312.253,280.443 312.605,279.763 312.946,279.077 313.275,278.385 313.592,277.688 313.897,276.985 314.189,276.277 314.469,275.564 314.737,274.846 314.992,274.124 315.234,273.397 315.464,272.667 315.681,271.932 315.885,271.194 316.076,270.452 316.255,269.707 316.42,268.959 316.572,268.208 316.711,267.455 316.838,266.7 316.95,265.942 317.05,265.182 317.137,264.421 317.21,263.659 317.27,262.895 317.316,262.131 317.35,261.365 317.37,260.6 317.376,259.834 317.37,259.068 317.35,258.302 317.316,257.537 317.27,256.772 317.21,256.008 317.137,255.246 317.05,254.485 316.95,253.725 316.838,252.968 316.711,252.212 316.572,251.459 316.42,250.708 316.255,249.96 316.076,249.215 315.885,248.474 315.681,247.735 315.464,247.001 315.234,246.27 314.992,245.543 314.737,244.821 314.469,244.103 314.189,243.39 313.897,242.682 313.592,241.979 313.275,241.282 312.946,240.59 312.605,239.904 312.253,239.224 311.888,238.551 311.512,237.883 311.124,237.223 310.725,236.569 310.314,235.922 309.893,235.283 309.46,234.651 309.016,234.027 308.561,233.41 308.096,232.801 307.62,232.201 307.134,231.609 306.638,231.026 306.132,230.451 305.615,229.885 305.089,229.328 304.553,228.781 304.008,228.243 303.454,227.714 302.89,227.195 302.318,226.687 301.736,226.188 301.147,225.699 300.548,225.221 299.942,224.753 299.327,224.296 298.705,223.849 298.075,223.414 297.437,222.989 296.792,222.576 296.14,222.174 295.481,221.783 294.816,221.404 294.144,221.036 293.465,220.681 292.781,220.337 292.09,220.005 291.394,219.685 290.693,219.377 289.986,219.082 289.274,218.799 288.558,218.528 287.837,218.27 287.111,218.024 286.381,217.791 285.648,217.571 284.91,217.364 284.169,217.169 283.425,216.988 282.678,216.819 281.928,216.664 281.175,216.521 280.42,216.392 279.663,216.276 278.904,216.173 278.143,216.083 277.381,216.006 276.618,215.943 275.854,215.893 275.088,215.856 274.323,215.833 273.557,215.823 272.791,215.826 272.025,215.843 271.26,215.873 270.495,215.916 269.731,215.973 268.968,216.043 268.207,216.126 267.447,216.222 266.689,216.332 265.932,216.455 265.179,216.591 264.427,216.74 263.679,216.902 262.933,217.077 262.19,217.265 261.451,217.466 260.716,217.68 259.984,217.906 259.256,218.145 258.533,218.397 257.814,218.662 257.1,218.939 256.39,219.228 255.686,219.529 254.987,219.843 254.294,220.169 253.607,220.507 252.925,220.857 252.25,221.219 251.581,221.592 250.919,221.977 250.264,222.373 249.615,222.781 248.974,223.2 248.34,223.63 247.714,224.071 247.095,224.523 246.485,224.985 245.882,225.459 245.288,225.942 244.702,226.436 244.125,226.94 243.557,227.454 ' stroke-miterlimit='10' style='fill:none;stroke:%23b3b3b3;stroke-width:2.75;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10' /%3E%3C/g%3E%3Cg id='POLYLINE_728_' transform='translate(-247.74715,-95.119606)' style='stroke:%23b3b3b3'%3E%3Cpath id='path6077' d='m 260.012,301.77 c -0.015,-0.067 -0.028,-0.134 -0.028,-0.134 -0.012,-0.068 -0.024,-0.135 -0.024,-0.135 -0.01,-0.068 -0.019,-0.136 -0.019,-0.136 -0.008,-0.068 -0.014,-0.137 -0.014,-0.137 -0.005,-0.069 -0.009,-0.137 -0.009,-0.137 -0.003,-0.069 -0.005,-0.137 -0.005,-0.137 -0.001,-0.069 -0.001,-23.68 -0.001,-23.68 -10e-4,-0.069 -0.002,-0.138 -0.002,-0.138 -0.003,-0.069 -0.007,-0.137 -0.007,-0.137 -0.005,-0.069 -0.012,-0.137 -0.012,-0.137 -0.008,-0.068 -0.017,-0.137 -0.017,-0.137 -0.01,-0.068 -0.021,-0.136 -0.021,-0.136 -0.012,-0.068 -0.026,-0.135 -0.026,-0.135 -0.015,-0.067 -0.031,-0.134 -0.031,-0.134 -0.017,-0.067 -0.035,-0.133 -0.035,-0.133 -0.019,-0.066 -0.04,-0.132 -0.04,-0.132 -0.022,-0.065 -0.044,-0.13 -0.044,-0.13 -0.024,-0.065 -0.049,-0.129 -0.049,-0.129 -0.026,-0.064 -0.053,-0.127 -0.053,-0.127 -0.028,-0.063 -0.058,-0.125 -0.058,-0.125 -0.03,-0.062 -0.062,-0.123 -0.062,-0.123 -0.033,-0.061 -0.066,-0.121 -0.066,-0.121 -0.035,-0.059 -0.07,-0.118 -0.07,-0.118 -0.037,-0.058 -0.074,-0.116 -0.074,-0.116 -0.039,-0.057 -0.078,-0.113 -0.078,-0.113 -0.041,-0.056 -0.082,-0.11 -0.082,-0.11 -0.042,-0.054 -0.086,-0.108 -0.086,-0.108 -0.044,-0.053 -0.089,-0.105 -0.089,-0.105 -0.046,-0.051 -0.093,-0.101 -0.093,-0.101 -0.048,-0.049 -0.096,-0.098 -0.096,-0.098 -0.049,-0.048 -0.1,-0.095 -0.1,-0.095 -0.051,-0.046 -0.103,-0.091 -0.103,-0.091 -0.053,-0.044 -0.106,-0.088 -0.106,-0.088 -0.054,-0.042 -0.109,-0.084 -0.109,-0.084 -0.056,-0.041 -0.112,-0.08 -0.112,-0.08 -0.057,-0.039 -0.115,-0.076 -0.115,-0.076 -0.058,-0.037 -0.117,-0.072 -0.117,-0.072 -0.059,-0.035 -0.12,-0.068 -0.12,-0.068 -0.061,-0.033 -0.122,-0.064 -0.122,-0.064 -0.062,-0.03 -0.124,-0.06 -0.124,-0.06 -0.063,-0.028 -0.126,-0.055 -0.126,-0.055 -0.064,-0.026 -0.128,-0.051 -0.128,-0.051 -0.065,-0.024 -0.129,-0.047 -0.129,-0.047 -0.065,-0.022 -0.131,-0.042 -0.131,-0.042 -0.066,-0.019 -0.132,-0.038 -0.132,-0.038 -0.067,-0.017 -0.134,-0.033 -0.134,-0.033 -0.067,-0.015 -0.135,-0.028 -0.135,-0.028 -0.068,-0.012 -0.136,-0.024 -0.136,-0.024 -0.068,-0.01 -0.136,-0.019 -0.136,-0.019 -0.068,-0.008 -0.137,-0.014 -0.137,-0.014 -0.069,-0.005 -0.137,-0.009 -0.137,-0.009 -0.069,-0.003 -0.138,-0.005 -0.138,-0.005 -0.069,-0.001 -23.68,-0.001 -23.68,-0.001 -0.069,-10e-4 -0.137,-0.002 -0.137,-0.002 -0.069,-0.003 -0.137,-0.007 -0.137,-0.007 -0.068,-0.005 -0.137,-0.012 -0.137,-0.012 -0.068,-0.008 -0.136,-0.017 -0.136,-0.017 -0.068,-0.01 -0.136,-0.021 -0.136,-0.021 -0.068,-0.012 -0.135,-0.026 -0.135,-0.026' stroke-miterlimit='10' inkscape:connector-curvature='0' style='fill:none;stroke:%23b3b3b3;stroke-width:2.75;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10' /%3E%3C/g%3E%3Cg id='POLYLINE_727_' transform='translate(-247.74715,-95.119606)' style='stroke:%23b3b3b3'%3E%3Cpath id='path6080' d='m 315.302,273.187 c -0.067,0.015 -0.134,0.028 -0.134,0.028 -0.068,0.012 -0.135,0.024 -0.135,0.024 -0.068,0.01 -0.136,0.019 -0.136,0.019 -0.068,0.008 -0.137,0.014 -0.137,0.014 -0.068,0.005 -0.137,0.009 -0.137,0.009 -0.069,0.003 -0.137,0.005 -0.137,0.005 -0.069,10e-4 -23.68,10e-4 -23.68,10e-4 -0.069,0.001 -0.138,0.002 -0.138,0.002 -0.069,0.003 -0.137,0.007 -0.137,0.007 -0.069,0.005 -0.137,0.012 -0.137,0.012 -0.068,0.008 -0.137,0.017 -0.137,0.017 -0.068,0.01 -0.136,0.021 -0.136,0.021 -0.068,0.012 -0.135,0.026 -0.135,0.026 -0.067,0.015 -0.134,0.031 -0.134,0.031 -0.067,0.017 -0.133,0.035 -0.133,0.035 -0.066,0.019 -0.132,0.04 -0.132,0.04 -0.065,0.022 -0.13,0.044 -0.13,0.044 -0.065,0.024 -0.129,0.049 -0.129,0.049 -0.064,0.026 -0.127,0.053 -0.127,0.053 -0.063,0.028 -0.125,0.058 -0.125,0.058 -0.062,0.03 -0.123,0.062 -0.123,0.062 -0.061,0.033 -0.121,0.066 -0.121,0.066 -0.059,0.035 -0.118,0.07 -0.118,0.07 -0.058,0.037 -0.116,0.074 -0.116,0.074 -0.057,0.039 -0.113,0.078 -0.113,0.078 -0.056,0.041 -0.111,0.082 -0.111,0.082 -0.054,0.042 -0.108,0.086 -0.108,0.086 -0.053,0.044 -0.105,0.089 -0.105,0.089 -0.051,0.046 -0.101,0.093 -0.101,0.093 -0.049,0.048 -0.098,0.096 -0.098,0.096 -0.048,0.049 -0.095,0.1 -0.095,0.1 -0.046,0.051 -0.091,0.103 -0.091,0.103 -0.044,0.053 -0.088,0.106 -0.088,0.106 -0.042,0.054 -0.084,0.109 -0.084,0.109 -0.041,0.056 -0.08,0.112 -0.08,0.112 -0.039,0.057 -0.076,0.115 -0.076,0.115 -0.037,0.058 -0.072,0.117 -0.072,0.117 -0.035,0.059 -0.068,0.12 -0.068,0.12 -0.033,0.061 -0.064,0.122 -0.064,0.122 -0.03,0.062 -0.06,0.124 -0.06,0.124 -0.028,0.063 -0.055,0.126 -0.055,0.126 -0.026,0.064 -0.051,0.128 -0.051,0.128 -0.024,0.065 -0.047,0.129 -0.047,0.129 -0.022,0.065 -0.042,0.131 -0.042,0.131 -0.019,0.066 -0.038,0.132 -0.038,0.132 -0.017,0.067 -0.033,0.134 -0.033,0.134 -0.015,0.067 -0.028,0.135 -0.028,0.135 -0.012,0.068 -0.024,0.136 -0.024,0.136 -0.01,0.068 -0.019,0.136 -0.019,0.136 -0.008,0.068 -0.014,0.137 -0.014,0.137 -0.005,0.069 -0.009,0.137 -0.009,0.137 -0.003,0.069 -0.005,0.138 -0.005,0.138 -0.001,0.069 -0.001,23.68 -0.001,23.68 -10e-4,0.069 -0.002,0.137 -0.002,0.137 -0.003,0.069 -0.007,0.137 -0.007,0.137 -0.005,0.069 -0.012,0.137 -0.012,0.137 -0.008,0.068 -0.017,0.136 -0.017,0.136 -0.01,0.068 -0.021,0.136 -0.021,0.136 -0.012,0.068 -0.026,0.135 -0.026,0.135' stroke-miterlimit='10' inkscape:connector-curvature='0' style='fill:none;stroke:%23b3b3b3;stroke-width:2.75;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10' /%3E%3C/g%3E%3Cg id='POLYLINE_726_' transform='translate(-247.74715,-95.119606)' style='stroke:%23b3b3b3'%3E%3Cpath id='path6083' d='m 231.429,246.48 c 0.067,-0.015 0.134,-0.028 0.134,-0.028 0.068,-0.012 0.135,-0.024 0.135,-0.024 0.068,-0.01 0.136,-0.019 0.136,-0.019 0.068,-0.008 0.137,-0.014 0.137,-0.014 0.068,-0.005 0.137,-0.009 0.137,-0.009 0.069,-0.003 0.137,-0.005 0.137,-0.005 0.069,-0.001 23.68,-0.001 23.68,-0.001 0.069,-0.001 0.138,-0.002 0.138,-0.002 0.069,-0.003 0.137,-0.007 0.137,-0.007 0.069,-0.005 0.137,-0.012 0.137,-0.012 0.068,-0.008 0.137,-0.017 0.137,-0.017 0.068,-0.01 0.136,-0.021 0.136,-0.021 0.068,-0.012 0.135,-0.026 0.135,-0.026 0.067,-0.015 0.134,-0.031 0.134,-0.031 0.067,-0.017 0.133,-0.035 0.133,-0.035 0.066,-0.019 0.132,-0.04 0.132,-0.04 0.065,-0.022 0.13,-0.044 0.13,-0.044 0.065,-0.024 0.129,-0.049 0.129,-0.049 0.064,-0.026 0.127,-0.053 0.127,-0.053 0.063,-0.028 0.125,-0.058 0.125,-0.058 0.062,-0.03 0.123,-0.062 0.123,-0.062 0.061,-0.033 0.121,-0.066 0.121,-0.066 0.059,-0.035 0.118,-0.07 0.118,-0.07 0.058,-0.037 0.116,-0.074 0.116,-0.074 0.057,-0.039 0.113,-0.078 0.113,-0.078 0.056,-0.041 0.11,-0.082 0.11,-0.082 0.054,-0.042 0.108,-0.086 0.108,-0.086 0.053,-0.044 0.105,-0.089 0.105,-0.089 0.051,-0.046 0.101,-0.093 0.101,-0.093 0.049,-0.048 0.098,-0.096 0.098,-0.096 0.048,-0.049 0.095,-0.1 0.095,-0.1 0.046,-0.051 0.091,-0.103 0.091,-0.103 0.044,-0.053 0.088,-0.106 0.088,-0.106 0.042,-0.054 0.084,-0.109 0.084,-0.109 0.041,-0.056 0.08,-0.112 0.08,-0.112 0.039,-0.057 0.076,-0.115 0.076,-0.115 0.037,-0.058 0.072,-0.117 0.072,-0.117 0.035,-0.059 0.068,-0.12 0.068,-0.12 0.033,-0.061 0.064,-0.122 0.064,-0.122 0.03,-0.062 0.06,-0.124 0.06,-0.124 0.028,-0.063 0.055,-0.126 0.055,-0.126 0.026,-0.064 0.051,-0.128 0.051,-0.128 0.024,-0.065 0.047,-0.129 0.047,-0.129 0.022,-0.065 0.042,-0.131 0.042,-0.131 0.019,-0.066 0.038,-0.132 0.038,-0.132 0.017,-0.067 0.033,-0.134 0.033,-0.134 0.015,-0.067 0.028,-0.135 0.028,-0.135 0.012,-0.068 0.024,-0.136 0.024,-0.136 0.01,-0.068 0.019,-0.136 0.019,-0.136 0.008,-0.068 0.014,-0.137 0.014,-0.137 0.005,-0.069 0.009,-0.137 0.009,-0.137 0.003,-0.069 0.005,-0.138 0.005,-0.138 10e-4,-0.069 10e-4,-23.68 10e-4,-23.68 0.001,-0.069 0.002,-0.137 0.002,-0.137 0.003,-0.069 0.007,-0.137 0.007,-0.137 0.005,-0.068 0.012,-0.137 0.012,-0.137 0.008,-0.068 0.017,-0.136 0.017,-0.136 0.01,-0.068 0.021,-0.136 0.021,-0.136 0.012,-0.068 0.026,-0.135 0.026,-0.135' stroke-miterlimit='10' inkscape:connector-curvature='0' style='fill:none;stroke:%23b3b3b3;stroke-width:2.75;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10' /%3E%3C/g%3E%3Cg id='POLYLINE_725_' transform='translate(-247.74715,-95.119606)' style='stroke:%23b3b3b3'%3E%3Cpath id='path6086' d='m 286.719,217.897 c 0.015,0.067 0.028,0.134 0.028,0.134 0.012,0.068 0.024,0.135 0.024,0.135 0.01,0.068 0.019,0.136 0.019,0.136 0.008,0.068 0.014,0.137 0.014,0.137 0.005,0.068 0.009,0.137 0.009,0.137 0.003,0.069 0.005,0.137 0.005,0.137 0.001,0.069 0.001,23.68 0.001,23.68 10e-4,0.069 0.002,0.138 0.002,0.138 0.003,0.069 0.007,0.137 0.007,0.137 0.005,0.069 0.012,0.137 0.012,0.137 0.008,0.068 0.017,0.137 0.017,0.137 0.01,0.068 0.021,0.136 0.021,0.136 0.012,0.068 0.026,0.135 0.026,0.135 0.015,0.067 0.031,0.134 0.031,0.134 0.017,0.067 0.035,0.133 0.035,0.133 0.019,0.066 0.04,0.132 0.04,0.132 0.022,0.065 0.044,0.13 0.044,0.13 0.024,0.065 0.049,0.129 0.049,0.129 0.026,0.064 0.053,0.127 0.053,0.127 0.028,0.063 0.058,0.125 0.058,0.125 0.03,0.062 0.062,0.123 0.062,0.123 0.033,0.061 0.066,0.121 0.066,0.121 0.035,0.059 0.07,0.118 0.07,0.118 0.037,0.058 0.074,0.116 0.074,0.116 0.039,0.057 0.078,0.113 0.078,0.113 0.041,0.056 0.082,0.11 0.082,0.11 0.042,0.054 0.086,0.108 0.086,0.108 0.044,0.053 0.089,0.105 0.089,0.105 0.046,0.051 0.093,0.101 0.093,0.101 0.048,0.049 0.096,0.098 0.096,0.098 0.049,0.048 0.1,0.095 0.1,0.095 0.051,0.046 0.103,0.091 0.103,0.091 0.053,0.044 0.106,0.088 0.106,0.088 0.054,0.042 0.109,0.084 0.109,0.084 0.056,0.041 0.112,0.08 0.112,0.08 0.057,0.039 0.115,0.076 0.115,0.076 0.058,0.037 0.117,0.072 0.117,0.072 0.059,0.035 0.12,0.068 0.12,0.068 0.061,0.033 0.122,0.064 0.122,0.064 0.062,0.03 0.124,0.06 0.124,0.06 0.063,0.028 0.126,0.055 0.126,0.055 0.064,0.026 0.128,0.051 0.128,0.051 0.065,0.024 0.129,0.047 0.129,0.047 0.065,0.022 0.131,0.042 0.131,0.042 0.066,0.019 0.132,0.038 0.132,0.038 0.067,0.017 0.134,0.033 0.134,0.033 0.067,0.015 0.135,0.028 0.135,0.028 0.068,0.012 0.136,0.024 0.136,0.024 0.068,0.01 0.136,0.019 0.136,0.019 0.068,0.008 0.137,0.014 0.137,0.014 0.069,0.005 0.137,0.01 0.137,0.01 0.069,0.003 0.138,0.005 0.138,0.005 0.069,0.001 23.68,0.001 23.68,0.001 0.069,0.001 0.137,0.002 0.137,0.002 0.069,0.003 0.137,0.007 0.137,0.007 0.068,0.005 0.137,0.012 0.137,0.012 0.068,0.008 0.136,0.017 0.136,0.017 0.068,0.01 0.136,0.021 0.136,0.021 0.068,0.012 0.135,0.026 0.135,0.026' stroke-miterlimit='10' inkscape:connector-curvature='0' style='fill:none;stroke:%23b3b3b3;stroke-width:2.75;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10' /%3E%3C/g%3E%3C/g%3E%3Cg transform='matrix(1.0446067,0,0,0.9572981,-30.000004,-2.9939455e-6)' inkscape:transform-center-x='-2.1406092' style='font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:23.99029922px;line-height:125%25;font-family:Helvetica;-inkscape-font-specification:Helvetica;letter-spacing:0px;word-spacing:0px;display:inline;fill:%23000000;fill-opacity:1;stroke:none;stroke-width:1px;stroke-linecap:butt;stroke-linejoin:miter;stroke-opacity:1' id='text4339'%3E%3Cpath d='m 418.7022,567.36118 0,0 1.29239,0 1.30546,0 0,0 0,13.79863 q 0,2.83283 -1.436,4.37327 -1.42295,1.54043 -4.05996,1.54043 -2.68923,0 -4.15134,-1.436 -1.46211,-1.43599 -1.34461,-3.95552 l 0,-1.33156 2.42814,0 0,1.33156 q 0,1.52738 0.75716,2.36287 0.75716,0.82244 2.154,0.82244 1.40988,0 2.23232,-0.99215 0.82244,-1.0052 0.82244,-2.71534 l 0,0 0,-13.79863 z' style='font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:26.73566818px;font-family:Helvetica;-inkscape-font-specification:Helvetica;fill:%23000000' id='path6291' inkscape:connector-curvature='0' /%3E%3Cpath d='m 436.95242,572.92241 0,0 q -0.16971,-1.81458 -1.436,-2.79367 -1.25323,-0.99215 -3.38112,-0.99215 -2.19316,0 -3.3289,0.84855 -1.13575,0.84854 -1.13575,2.48036 0,1.10963 0.75717,1.65792 0.75716,0.54829 3.0417,1.08353 l 3.34196,0.79632 q 2.68923,0.63968 3.83803,1.89291 1.1488,1.24018 1.1488,3.51167 0,2.6109 -1.98429,4.13828 -1.97123,1.52738 -5.35236,1.52738 -3.7597,0 -5.87453,-1.76236 -2.06262,-1.73625 -2.06262,-4.75185 l 0,-0.1436 0,0 2.38898,0 0,0 q 0.0653,2.08873 1.51433,3.22447 1.44905,1.13575 4.03384,1.13575 2.38898,0 3.62916,-0.82244 1.24018,-0.82244 1.24018,-2.41509 0,-1.38378 -0.82243,-2.04956 -0.80938,-0.65272 -3.26363,-1.24018 l -3.34196,-0.79632 q -2.53258,-0.60051 -3.61611,-1.67098 -1.08352,-1.07047 -1.08352,-2.96338 0,-2.75451 1.8668,-4.36021 1.87985,-1.61876 5.06515,-1.61876 3.23752,0 5.15654,1.61876 1.91901,1.61876 2.04956,4.46465 l 0,0 -2.38898,0 z' style='font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:26.73566818px;font-family:Helvetica;-inkscape-font-specification:Helvetica;fill:%23000000' id='path6293' inkscape:connector-curvature='0' /%3E%3Cpath d='m 441.58678,586.55133 6.81446,-9.58202 0,0 -6.38366,-9.60813 0,0 1.6057,0 1.60571,0 0,0 4.71268,7.4933 0,0 0,0 5.06516,-7.4933 0,0 1.55349,0 1.56654,0 0,0 -6.72308,9.43842 0,0 6.99723,9.75173 0,0 -1.59265,0 -1.59266,0 0,0 -5.26097,-7.71522 0,0 0,0 -5.20876,7.71522 0,0 -1.57959,0 -1.5796,0 0,0 z' style='font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:26.73566818px;font-family:Helvetica;-inkscape-font-specification:Helvetica;fill:%23000000' id='path6295' inkscape:connector-curvature='0' /%3E%3Cpath d='m 460.75082,586.55133 0,-13.96834 0,0 1.17491,0 1.1749,0 0,0 0,13.96834 0,0 -1.1749,0 -1.17491,0 0,0 z m -0.0261,-19.19015 2.40203,0 0,2.66312 -2.40203,0 0,-2.66312 z' style='font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:26.73566818px;font-family:Helvetica;-inkscape-font-specification:Helvetica;fill:%23000000' id='path6297' inkscape:connector-curvature='0' /%3E%3Cpath d='m 466.62536,586.55133 0,-13.96834 0,0 1.10963,0 1.12269,0 0,0 0,2.06261 0,0 0,0 0.52218,-0.69189 q 1.52738,-1.78847 3.82498,-1.78847 2.31065,0 3.56388,1.25324 1.25324,1.25323 1.25324,3.56388 l 0,9.56897 0,0 -1.17491,0 -1.17491,0 0,0 0,-8.77264 q 0,-1.84069 -0.71799,-2.65007 -0.70495,-0.82243 -2.2976,-0.82243 -1.69709,0 -2.68923,1.29239 -0.99215,1.27935 -0.99215,3.47251 l 0,0 0,7.48024 0,0 -1.1749,0 -1.17491,0 0,0 z' style='font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:26.73566818px;font-family:Helvetica;-inkscape-font-specification:Helvetica;fill:%23000000' id='path6299' inkscape:connector-curvature='0' /%3E%3Cpath d='m 481.32475,572.58299 0,0 1.10964,0 1.12269,0 0,0 0,1.98429 0,0 0.11749,-0.16971 q 1.51432,-2.23233 3.98163,-2.23233 2.74145,0 4.3341,1.89291 1.60571,1.87985 1.60571,5.09126 0,3.64222 -1.61877,5.71789 -1.6057,2.06261 -4.46464,2.06261 -2.36287,0 -3.75971,-1.81458 l -0.0783,-0.10443 0,0 0,7.06249 0,0 -1.17491,0 -1.17491,0 0,0 0,-19.4904 z m 6.07036,12.31042 q 1.84068,0 2.79366,-1.38378 0.95298,-1.39684 0.95298,-4.05996 0,-2.62396 -0.91381,-3.8772 -0.91382,-1.26628 -2.81978,-1.26628 -1.94512,0 -2.84589,1.42294 -0.8877,1.42294 -0.8877,4.50381 l 0,0 0,0 0,0 q 0,2.23232 0.96603,3.44639 0.96604,1.21408 2.75451,1.21408 z' style='font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:26.73566818px;font-family:Helvetica;-inkscape-font-specification:Helvetica;fill:%23000000' id='path6301' inkscape:connector-curvature='0' /%3E%3Cpath d='m 498.81782,572.58299 0,9.00762 q 0,1.76236 0.67884,2.54563 0.67883,0.77022 2.20621,0.77022 1.69709,0 2.68923,-1.30545 0.99215,-1.31851 0.99215,-3.56389 l 0,0 0,-7.45413 0,0 1.1749,0 1.17491,0 0,0 0,13.96834 0,0 -1.10963,0 -1.12269,0 0,0 0,-2.12789 0,0 0,0 q -0.23498,0.37858 -0.52218,0.718 -1.50127,1.78847 -3.75971,1.78847 -2.37592,0 -3.56388,-1.18796 -1.18796,-1.18796 -1.18796,-3.56389 l 0,-9.59507 0,0 1.1749,0 1.17491,0 0,0 z' style='font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:26.73566818px;font-family:Helvetica;-inkscape-font-specification:Helvetica;fill:%23000000' id='path6303' inkscape:connector-curvature='0' /%3E%3Cpath d='m 516.40226,586.53828 q -1.20101,0.18276 -1.7493,0.18276 -1.54044,0 -2.18011,-0.67884 -0.62662,-0.67883 -0.62662,-2.33676 l 0,-9.20344 0,0 -1.93207,0 0,-1.91901 1.93207,0 0,0 0,-3.91636 2.34982,0 0,3.91636 0,0 2.20621,0 0,1.91901 -2.20621,0 0,0 0,9.20344 q 0,0.46997 0.36553,0.74411 0.37858,0.27415 1.00519,0.27415 l 0.83549,0 0,1.81458 z' style='font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:26.73566818px;font-family:Helvetica;-inkscape-font-specification:Helvetica;fill:%23000000' id='path6305' inkscape:connector-curvature='0' /%3E%3Cpath d='m 519.27426,583.7185 2.79367,0 0,2.83283 -2.79367,0 0,-2.83283 z' style='font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:26.73566818px;font-family:Helvetica;-inkscape-font-specification:Helvetica;fill:%23000000' id='path6307' inkscape:connector-curvature='0' /%3E%3Cpath d='m 526.14094,572.58299 0,0 1.17491,0 1.1749,0 0,0 0,15.8743 q 0,1.94513 -0.83549,2.80672 -0.83548,0.8616 -2.71534,0.8616 -0.53523,0 -0.99214,-0.0653 l 0,-2.04956 0.45691,0 q 1.01825,0 1.37072,-0.32636 0.36553,-0.31331 0.36553,-1.22713 l 0,0 0,-15.8743 z m -0.0261,-5.22181 2.40203,0 0,2.66312 -2.40203,0 0,-2.66312 z' style='font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:26.73566818px;font-family:Helvetica;-inkscape-font-specification:Helvetica;fill:%23000000' id='path6309' inkscape:connector-curvature='0' /%3E%3Cpath d='m 540.05707,576.62989 0,0 q -0.10444,-1.16185 -0.95298,-1.80152 -0.83549,-0.63968 -2.25844,-0.63968 -1.4621,0 -2.23232,0.50913 -0.75716,0.50913 -0.75716,1.48822 0,0.74411 0.53523,1.12269 0.53524,0.37858 2.12789,0.75716 l 2.42814,0.5744 q 2.03651,0.49607 2.91116,1.37072 0.8616,0.8616 0.8616,2.41509 0,2.07567 -1.50127,3.28974 -1.48822,1.21407 -4.03385,1.21407 -2.95032,0 -4.39937,-1.16185 -1.44906,-1.17491 -1.60571,-3.68138 l 0,0 2.25843,0 0,0 q 0.16971,1.48822 1.04436,2.154 0.88771,0.66578 2.70229,0.66578 1.5796,0 2.38898,-0.60051 0.82243,-0.60051 0.82243,-1.7493 0,-0.73106 -0.53523,-1.10964 -0.53524,-0.37858 -2.154,-0.75716 l -2.42814,-0.5744 q -1.97123,-0.46996 -2.80672,-1.31851 -0.83549,-0.83549 -0.83549,-2.34981 0,-1.97124 1.39683,-3.12003 1.40989,-1.16186 3.81192,-1.16186 2.4412,0 3.8772,1.18797 1.44905,1.18796 1.54043,3.27668 l 0,0 -2.20621,0 z' style='font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:26.73566818px;font-family:Helvetica;-inkscape-font-specification:Helvetica;fill:%23000000' id='path6311' inkscape:connector-curvature='0' /%3E%3C/g%3E%3Cg transform='matrix(1.0446067,0,0,0.9572981,-30.000004,-2.9939455e-6)' inkscape:transform-center-x='-2.1406092' style='font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:23.99029922px;line-height:125%25;font-family:Helvetica;-inkscape-font-specification:Helvetica;letter-spacing:0px;word-spacing:0px;display:inline;fill:%23b3b3b3;fill-opacity:1;stroke:none;stroke-width:1px;stroke-linecap:butt;stroke-linejoin:miter;stroke-opacity:1' id='text4339-0'%3E%3Cpath d='m 417.80885,566.3862 0,0 1.2924,0 1.30545,0 0,0 0,13.79864 q 0,2.83283 -1.43599,4.37326 -1.42295,1.54044 -4.05996,1.54044 -2.68923,0 -4.15134,-1.436 -1.46211,-1.436 -1.34462,-3.95552 l 0,-1.33156 2.42815,0 0,1.33156 q 0,1.52738 0.75716,2.36287 0.75716,0.82243 2.154,0.82243 1.40988,0 2.23232,-0.99214 0.82243,-1.0052 0.82243,-2.71534 l 0,0 0,-13.79864 z' style='font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:26.73566818px;font-family:Helvetica;-inkscape-font-specification:Helvetica' id='path6268' inkscape:connector-curvature='0' /%3E%3Cpath d='m 436.05908,571.94743 0,0 q -0.16971,-1.81458 -1.436,-2.79367 -1.25323,-0.99214 -3.38112,-0.99214 -2.19316,0 -3.3289,0.84854 -1.13575,0.84855 -1.13575,2.48036 0,1.10964 0.75717,1.65793 0.75716,0.54829 3.0417,1.08352 l 3.34196,0.79633 q 2.68923,0.63967 3.83803,1.8929 1.1488,1.24018 1.1488,3.51167 0,2.61091 -1.98429,4.13829 -1.97123,1.52738 -5.35236,1.52738 -3.7597,0 -5.87453,-1.76236 -2.06262,-1.73626 -2.06262,-4.75185 l 0,-0.1436 0,0 2.38898,0 0,0 q 0.0653,2.08872 1.51433,3.22447 1.44905,1.13574 4.03384,1.13574 2.38898,0 3.62916,-0.82244 1.24018,-0.82243 1.24018,-2.41508 0,-1.38378 -0.82243,-2.04956 -0.80938,-0.65273 -3.26363,-1.24018 l -3.34196,-0.79633 q -2.53258,-0.60051 -3.61611,-1.67098 -1.08352,-1.07047 -1.08352,-2.96338 0,-2.7545 1.86679,-4.36021 1.87986,-1.61876 5.06516,-1.61876 3.23752,0 5.15654,1.61876 1.91901,1.61876 2.04956,4.46465 l 0,0 -2.38898,0 z' style='font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:26.73566818px;font-family:Helvetica;-inkscape-font-specification:Helvetica' id='path6270' inkscape:connector-curvature='0' /%3E%3Cpath d='m 440.69344,585.57635 6.81446,-9.58202 0,0 -6.38366,-9.60813 0,0 1.6057,0 1.60571,0 0,0 4.71268,7.4933 0,0 0,0 5.06516,-7.4933 0,0 1.55349,0 1.56654,0 0,0 -6.72308,9.43842 0,0 6.99723,9.75173 0,0 -1.59266,0 -1.59265,0 0,0 -5.26097,-7.71522 0,0 0,0 -5.20876,7.71522 0,0 -1.5796,0 -1.57959,0 0,0 z' style='font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:26.73566818px;font-family:Helvetica;-inkscape-font-specification:Helvetica' id='path6272' inkscape:connector-curvature='0' /%3E%3Cpath d='m 459.85748,585.57635 0,-13.96834 0,0 1.17491,0 1.1749,0 0,0 0,13.96834 0,0 -1.1749,0 -1.17491,0 0,0 z m -0.0261,-19.19015 2.40203,0 0,2.66313 -2.40203,0 0,-2.66313 z' style='font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:26.73566818px;font-family:Helvetica;-inkscape-font-specification:Helvetica' id='path6274' inkscape:connector-curvature='0' /%3E%3Cpath d='m 465.73202,585.57635 0,-13.96834 0,0 1.10963,0 1.12269,0 0,0 0,2.06262 0,0 0,0 0.52218,-0.69189 q 1.52738,-1.78847 3.82498,-1.78847 2.31065,0 3.56388,1.25323 1.25324,1.25324 1.25324,3.56389 l 0,9.56896 0,0 -1.17491,0 -1.17491,0 0,0 0,-8.77264 q 0,-1.84068 -0.718,-2.65006 -0.70494,-0.82244 -2.29759,-0.82244 -1.69709,0 -2.68923,1.2924 -0.99215,1.27934 -0.99215,3.4725 l 0,0 0,7.48024 0,0 -1.17491,0 -1.1749,0 0,0 z' style='font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:26.73566818px;font-family:Helvetica;-inkscape-font-specification:Helvetica' id='path6276' inkscape:connector-curvature='0' /%3E%3Cpath d='m 480.43141,571.60801 0,0 1.10964,0 1.12268,0 0,0 0,1.98429 0,0 0.1175,-0.16971 q 1.51432,-2.23232 3.98163,-2.23232 2.74145,0 4.3341,1.8929 1.6057,1.87986 1.6057,5.09127 0,3.64221 -1.61876,5.71788 -1.6057,2.06262 -4.46464,2.06262 -2.36287,0 -3.75971,-1.81458 l -0.0783,-0.10444 0,0 0,7.0625 0,0 -1.17491,0 -1.17491,0 0,0 0,-19.49041 z m 6.07035,12.31042 q 1.84069,0 2.79367,-1.38378 0.95298,-1.39683 0.95298,-4.05996 0,-2.62396 -0.91381,-3.87719 -0.91382,-1.26629 -2.81978,-1.26629 -1.94512,0 -2.84589,1.42294 -0.8877,1.42295 -0.8877,4.50381 l 0,0 0,0 0,0 q 0,2.23233 0.96603,3.4464 0.96603,1.21407 2.7545,1.21407 z' style='font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:26.73566818px;font-family:Helvetica;-inkscape-font-specification:Helvetica' id='path6278' inkscape:connector-curvature='0' /%3E%3Cpath d='m 497.92448,571.60801 0,9.00763 q 0,1.76236 0.67884,2.54563 0.67883,0.77021 2.20621,0.77021 1.69709,0 2.68923,-1.30545 0.99215,-1.3185 0.99215,-3.56388 l 0,0 0,-7.45414 0,0 1.1749,0 1.17491,0 0,0 0,13.96834 0,0 -1.10963,0 -1.12269,0 0,0 0,-2.12788 0,0 0,0 q -0.23498,0.37858 -0.52218,0.718 -1.50127,1.78847 -3.75971,1.78847 -2.37592,0 -3.56388,-1.18797 -1.18796,-1.18796 -1.18796,-3.56388 l 0,-9.59508 0,0 1.1749,0 1.17491,0 0,0 z' style='font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:26.73566818px;font-family:Helvetica;-inkscape-font-specification:Helvetica' id='path6280' inkscape:connector-curvature='0' /%3E%3Cpath d='m 515.50892,585.5633 q -1.20101,0.18276 -1.7493,0.18276 -1.54044,0 -2.18011,-0.67883 -0.62662,-0.67884 -0.62662,-2.33676 l 0,-9.20344 0,0 -1.93207,0 0,-1.91902 1.93207,0 0,0 0,-3.91635 2.34982,0 0,3.91635 0,0 2.20621,0 0,1.91902 -2.20621,0 0,0 0,9.20344 q 0,0.46996 0.36552,0.74411 0.37859,0.27414 1.0052,0.27414 l 0.83549,0 0,1.81458 z' style='font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:26.73566818px;font-family:Helvetica;-inkscape-font-specification:Helvetica' id='path6282' inkscape:connector-curvature='0' /%3E%3Cpath d='m 518.38092,582.74352 2.79367,0 0,2.83283 -2.79367,0 0,-2.83283 z' style='font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:26.73566818px;font-family:Helvetica;-inkscape-font-specification:Helvetica' id='path6284' inkscape:connector-curvature='0' /%3E%3Cpath d='m 525.2476,571.60801 0,0 1.17491,0 1.1749,0 0,0 0,15.87431 q 0,1.94512 -0.83549,2.80672 -0.83549,0.8616 -2.71534,0.8616 -0.53523,0 -0.99214,-0.0653 l 0,-2.04956 0.45691,0 q 1.01825,0 1.37072,-0.32636 0.36553,-0.31331 0.36553,-1.22712 l 0,0 0,-15.87431 z m -0.0261,-5.22181 2.40203,0 0,2.66313 -2.40203,0 0,-2.66313 z' style='font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:26.73566818px;font-family:Helvetica;-inkscape-font-specification:Helvetica' id='path6286' inkscape:connector-curvature='0' /%3E%3Cpath d='m 539.16372,575.65492 0,0 q -0.10443,-1.16186 -0.95298,-1.80153 -0.83549,-0.63967 -2.25843,-0.63967 -1.46211,0 -2.23232,0.50913 -0.75716,0.50912 -0.75716,1.48821 0,0.74411 0.53523,1.12269 0.53524,0.37858 2.12789,0.75716 l 2.42814,0.5744 q 2.03651,0.49607 2.91116,1.37073 0.8616,0.8616 0.8616,2.41508 0,2.07567 -1.50127,3.28975 -1.48822,1.21407 -4.03385,1.21407 -2.95032,0 -4.39938,-1.16186 -1.44905,-1.1749 -1.6057,-3.68137 l 0,0 2.25843,0 0,0 q 0.16971,1.48821 1.04436,2.15399 0.88771,0.66578 2.70229,0.66578 1.5796,0 2.38898,-0.6005 0.82243,-0.60051 0.82243,-1.74931 0,-0.73105 -0.53523,-1.10963 -0.53524,-0.37859 -2.154,-0.75717 l -2.42814,-0.5744 q -1.97123,-0.46996 -2.80672,-1.3185 -0.83549,-0.83549 -0.83549,-2.34982 0,-1.97123 1.39683,-3.12003 1.40989,-1.16185 3.81192,-1.16185 2.4412,0 3.8772,1.18796 1.44905,1.18796 1.54043,3.27669 l 0,0 -2.20622,0 z' style='font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:26.73566818px;font-family:Helvetica;-inkscape-font-specification:Helvetica' id='path6288' inkscape:connector-curvature='0' /%3E%3C/g%3E%3C/g%3E%3Cmetadata id='metadata6795'%3E%3Crdf:RDF%3E%3Ccc:Work rdf:about=''%3E%3Cdc:title /%3E%3Cdc:format%3Eimage/svg+xml%3C/dc:format%3E%3Cdc:type rdf:resource='http://purl.org/dc/dcmitype/StillImage' /%3E%3C/cc:Work%3E%3C/rdf:RDF%3E%3C/metadata%3E%3C/svg%3E%0A") + ")";


    let gamepadPanel = document.createElement("div");
    gamepadPanel.id = "divDpad";

    let rowHolder;
    let cellHolder;

    for (let i = 0; i < 3; i++)
    {
        rowHolder = document.createElement("div");
        rowHolder.classList.add("DpadRow");
        rowHolder.style.top = (i * 33.0) + "%";

        for (let j = 0; j < 3; j++)
        {
            cellHolder = document.createElement("div");
            cellHolder.classList.add("DpadCell");
            cellHolder.style.left = (j * 33.0) + "%";
            // switch on row
            switch (i)
            {
                case 0:
                    if (j === 1)
                    {
                        // top center div. add controlElement class
                        cellHolder.classList.add("controlElement");
                        cellHolder.id = "divDpadUp";
                    }
                    break;
                case 1:
                    if (j === 0 || j === 2)
                    {
                        // left and divs on middle row add control element classes.
                        cellHolder.classList.add("controlElement");
                        if (j === 0)
                        {
                            cellHolder.id = "divDpadLeft";
                        }
                        else
                        {
                            cellHolder.id = "divDpadRight";
                        }

                    }
                    break;
                case 2:
                    if (j === 1)
                    {
                        // bottom center div. add control element class.
                        cellHolder.classList.add("controlElement");
                        cellHolder.id = "divDpadDown";
                    }
            }
            rowHolder.appendChild(cellHolder);

        }

        gamepadPanel.appendChild((rowHolder));



    }


    let Lstick;
    let Rstick;




    let holder; // holds a pointer to the child elements until they are added to parent

    Lstick = document.createElement("div");
    Rstick = document.createElement("div");


    Lstick.classList.add("controlElement");
    Lstick.classList.add("divThumbstick");
    Lstick.id = "divLstick";
    Lstick.style.position = "absolute";


    holder = document.createElement("div");
    holder.classList.add("controlElement");
    holder.classList.add("xAxis");
    holder.id = "divLstickX";

    Lstick.appendChild(holder);

    holder = document.createElement("div");
    holder.classList.add("controlElement");
    holder.classList.add("yAxis");
    holder.id = "divLstickY";

    Lstick.appendChild(holder);

    Rstick.classList.add("controlElement");
    Rstick.classList.add("divThumbstick");
    Rstick.id = "divRstick";
    Rstick.style.position = "absolute";

    holder = document.createElement("div");
    holder.classList.add("controlElement");
    holder.classList.add("xAxis");
    holder.id = "divRstickX";

    Rstick.appendChild(holder);

    holder = document.createElement("div");
    holder.classList.add("controlElement");
    holder.classList.add("yAxis");
    holder.id = "divRstickY";

    Rstick.appendChild(holder);



    rightPanel.appendChild(gamepadPanel);
    rightPanel.appendChild(Lstick);
    rightPanel.appendChild(Rstick);

    // diamond arrangement of face buttons, xyab
    holder = document.createElement("div");
    holder.classList.add("controlElement");
    holder.classList.add("divFaceButton");
    holder.id = "divFaceBtnTop";
    rightPanel.appendChild(holder);

    holder = document.createElement("div");
    holder.classList.add("controlElement");
    holder.classList.add("divFaceButton");
    holder.id = "divFaceBtnLeft";
    rightPanel.appendChild(holder);


    holder = document.createElement("div");
    holder.classList.add("controlElement");
    holder.classList.add("divFaceButton");
    holder.id = "divFaceBtnRight";
    rightPanel.appendChild(holder);


    holder = document.createElement("div");
    holder.classList.add("controlElement");
    holder.classList.add("divFaceButton");
    holder.id = "divFaceBtnBottom";
    rightPanel.appendChild(holder);


    holder = document.createElement("div");
    holder.classList.add("controlElement");
    holder.classList.add("divFaceButtonSmall");
    holder.id = "divSelectButton";
    rightPanel.appendChild(holder);

    holder = document.createElement("div");
    holder.classList.add("controlElement");
    holder.classList.add("divFaceButtonSmall");
    holder.id = "divStartButton";
    rightPanel.appendChild(holder);

    holder = document.createElement("div");
    holder.classList.add("controlElement");
    holder.classList.add("bumper");
    holder.id = "divL1";
    rightPanel.appendChild(holder);

    holder = document.createElement("div");
    holder.classList.add("controlElement");
    holder.classList.add("trigger");
    holder.id = "divL2";
    rightPanel.appendChild(holder);

    holder = document.createElement("div");
    holder.classList.add("controlElement");
    holder.classList.add("stickclick");
    holder.id = "divL3";
    rightPanel.appendChild(holder);

    holder = document.createElement("div");
    holder.classList.add("controlElement");
    holder.classList.add("bumper");
    holder.id = "divR1";
    rightPanel.appendChild(holder);

    holder = document.createElement("div");
    holder.classList.add("controlElement");
    holder.classList.add("trigger");
    holder.id = "divR2";
    rightPanel.appendChild(holder);

    holder = document.createElement("div");
    holder.classList.add("controlElement");
    holder.classList.add("stickclick");
    holder.id = "divR3";
    rightPanel.appendChild(holder);

    let divNotification = document.createElement("div");
    divNotification.id = "notification";

    divNotification.style.position = "absolute";
    divNotification.style.bottom = "0";
    divNotification.style.width = "95%";
    divNotification.style.textAlign = "center";
    divNotification.style.left = "2.5%";
    divNotification.style.right = "97.5%";
    divNotification.style.backgroundColor = "beige";
    divNotification.style.borderTopLeftRadius = "0.7em";
    divNotification.style.borderTopRightRadius = "0.7em";

    /*divNotification.style.vertical-align = "middle;"*/

    divNotification.style.height = "8%";
    divNotification.style.minHeight = "1.5em";
    divNotification.style.lineHeight = "1.5em";
    divNotification.style.overflow = "hidden";
    divNotification.style.display = "none";

    holder = document.createElement("div");
    holder.id = "noteContent";

    holder.style.position = "absolute";
    holder.style.top = "0";
    holder.style.width = "90%";
    holder.style.left = "0";
    holder.style.height = "100%";
    holder.style.fontSize = "2vw";
    holder.style.paddingTop = "2vh";


    divNotification.appendChild(holder);

    holder = document.createElement("div");
    holder.id = "noteClose";
    //holder.innerText = "❌";
    holder.innerText = '\u274C';

    holder.style.position = "absolute";
    holder.style.top = "0";
    holder.style.width = "2em";
    holder.style.height = "2em";
    holder.style.right = "0";
    //holder.style.borderColor = "black";
    holder.style.borderStyle = "solid";
    holder.style.borderRadius = "100%";

    holder.style.backgroundColor = "white";
    holder.style.color = "red";
    holder.style.fontSize = "0.6em";
    holder.style.lineHeight = "1.5em";
    holder.style.boxSizing = "border-box";


    divNotification.appendChild(holder);

    rightPanel.appendChild(divNotification);

    // left panel begin
    let divTabs = document.createElement("div");
    divTabs.classList.add("menuItem");
    divTabs.id = "divMenuTabs";

    divTabs.style.backgroundColor = "darkslategray";

    divTabs.style.fontSize = "1.4vw";
    divTabs.style.padding = "0";

    divTabs.style.margin = "0";
    divTabs.style.marginBottom = "0.75em";
    divTabs.style.width = "100%";
    divTabs.style.textAlign = "center";



    holder = document.createElement("div");
    holder.id = "divTabMap";
    holder.classList.add("menuTab");
    holder.style.backgroundColor = "darkgray";
    holder.innerText = "Map Inputs";

    divTabs.appendChild(holder);

    holder = document.createElement("div");
    holder.id = "divTabConfig";
    holder.classList.add("menuTab");
    holder.style.backgroundColor = "darkslategray";
    holder.style.color = "darkslategray";

    holder.innerText = "Configure Devices";

    divTabs.appendChild(holder);

    leftPanel.appendChild(divTabs);

    let divMenuMap = document.createElement("div");
    divMenuMap.id = "divMenuMap";
    divMenuMap.style.paddingTop = "1em";
    divMenuMap.style.paddingBottom = "1em";

    let labelSelectDevice = document.createElement("label");
    labelSelectDevice.for = "selectMapInput";
    labelSelectDevice.classList.add("menuItem");
    labelSelectDevice.classList.add("_jsxinputLabelText");


    holder = document.createElement("span");
    holder.id = "selectInstructions";
    holder.innerText = "No controllers detected. Press a button to awaken them.";

    labelSelectDevice.appendChild(holder);

    let selectWrapper = document.createElement("div");
    selectWrapper.id = "selectWrapper";
    selectWrapper.classList.add("menuItem");
    // override menuItem width to make room for the checkbox.
    selectWrapper.style.width = "90%";


    holder = document.createElement("select");
    holder.id = "selectMapInput";
    holder.disabled = true;
    holder.classList.add("joySelect");

    selectWrapper.appendChild(holder);

    holder = document.createElement("div");
    holder.id = "selectMapStatusIcon";
    holder.style.display = "inline";
    holder.style.fontSize = "2em";
    holder.style.color = "lightgreen";
    holder.style.overflow = "visible";
    holder.style.lineHeight = "2em";
    holder.style.height = "2em";
    holder.style.minHeight = "2em";
    holder.style.position = "absolute"; // this fixes checkmark positioning somehow.

    selectWrapper.appendChild(holder);

    // can we append line breaks?
    holder = document.createElement("br");
    selectWrapper.appendChild(holder);

    holder = document.createElement("input");
    holder.id = "btnFullMap";
    holder.type = "button";
    holder.value = "Map selected " + '\uD83C\uDFAE';
    holder.style.lineHeight = "2em";
    holder.style.fontSize = "1em";
    holder.disabled = true;
    selectWrapper.appendChild(holder);

    holder = document.createElement("span");
    holder.id = "selectMapStatusMessage";

    selectWrapper.appendChild(holder);



    divMenuMap.appendChild(labelSelectDevice);
    divMenuMap.appendChild(selectWrapper);

    leftPanel.appendChild(divMenuMap);

    let divMenuConfig = document.createElement("div");
    divMenuConfig.id = "divMenuConfig";
    divMenuConfig.style.display = "none";

    let labelConfigDevice = document.createElement("label");
    labelConfigDevice.for = "selectConfigWrapper";
    labelConfigDevice.classList.add("menuItem");
    labelConfigDevice.classList.add("_jsxinputLabelText");
    //labelConfigDevice.style.color = "white";
    //labelConfigDevice.style.fontSize = "1.2em";
    /*the above two properties could be made into a "label" class.*/


    holder = document.createElement("span");
    holder.id = "configInstructions";
    holder.innerHTML = "Select a controller to configure.<br>A controller must be mapped before it can be configured.";

    labelConfigDevice.appendChild(holder);
    divMenuConfig.appendChild(labelConfigDevice);

    //reusing selectWrapper
    selectWrapper = document.createElement("div");
    selectWrapper.classList.add("menuItem");
    selectWrapper.id = "selectConfigWrapper";



    holder = document.createElement("select");
    holder.id = "selectConfigInput";
    holder.disabled = true;
    holder.classList.add("joySelect");


    selectWrapper.appendChild(holder);
    divMenuConfig.appendChild(selectWrapper);


    // L - stick deadzone slider and label
    let labelRangeL = document.createElement("label");
    labelRangeL.for = "rangeL";
    labelRangeL.classList.add("menuItem");
    labelRangeL.classList.add("_jsxinputLabelText");
    labelRangeL.innerHTML = 'L-stick drift: <span id="lblrangeL">Undetected.</span>';
    divMenuConfig.appendChild((labelRangeL));



    let divSliderDeadZoneL = document.createElement("div");
    divSliderDeadZoneL.id = "divSliderDeadZoneL";
    divSliderDeadZoneL.classList.add("menuItem");

    /*
    the original intent was to allow user-configurable dead zones.
    this was the slider to provide a UI for adjusting it.
    for now just implementing auto-sized dead zones, since what's the point of leaving in a LITTLE bit of drift?

    holder = document.createElement("input");
    holder.id = "rangeL";
    holder.type = "range";
    holder.min = 0.0;
    holder.max = 10.0;
    holder.step = 0.001;
    holder.value = 0.0;
    holder.classList.add("deadzoneslider");
    holder.disabled = true;


    divSliderDeadZoneL.appendChild(holder);
    */

    divMenuConfig.appendChild(divSliderDeadZoneL);

    // R - stick deadzone slider and label
    let labelRangeR = document.createElement("label");
    labelRangeR.for = "rangeR";
    labelRangeR.classList.add("menuItem");
    labelRangeR.innerHTML = 'R-stick drift: <span id="lblrangeR">Undetected.</span>';
    labelRangeR.classList.add("_jsxinputLabelText");
    //labelRangeR.style.color = "white";
    //labelRangeR.style.fontSize = "1.2em";
    /*the above two properties could be made into a "label" class.*/
    divMenuConfig.appendChild((labelRangeR));



    let divSliderDeadZoneR = document.createElement("div");
    divSliderDeadZoneR.id = "divSliderDeadZoneR";
    divSliderDeadZoneR.classList.add("menuItem");

    /*
    holder = document.createElement("input");
    holder.id = "rangeR";
    holder.type = "range";
    holder.min = 0.0;
    holder.max = 10.0;
    holder.step = 0.001;
    holder.value = 0.0;
    holder.classList.add("deadzoneslider");
    holder.disabled = true;


    divSliderDeadZoneR.appendChild(holder);

     */
    divMenuConfig.appendChild(divSliderDeadZoneR);

    // adding autoconfig button.
    let divBtnDetectDeadzones = document.createElement("div");
    divBtnDetectDeadzones.id = "divBtnDetectDeadzones";
    divBtnDetectDeadzones.classList.add("menuItem");

    holder = document.createElement("input");
    holder.id = "btnDetectDeadzones";
    holder.value = "Detect joystick drift.";
    holder.type = "button";

    divBtnDetectDeadzones.appendChild(holder);

    divMenuConfig.appendChild(divBtnDetectDeadzones);


    leftPanel.appendChild(divMenuConfig);


    holder = document.createElement("div");
    holder.id = "divExitButton";
    holder.classList.add("_jsxinputExitButton");
    //holder.onclick = _jsxinput.helperPanelExitConfirm;
    holder.innerText = "Exit";
    leftPanel.appendChild(holder);


    mainDiv.appendChild(leftPanel);
    // add left panel overlay.
    holder = document.createElement("div");
    holder.id = "leftPanelOverlay";
    holder.classList.add("horizontalPanel");
    holder.classList.add("leftPanelOverlay");
    mainDiv.appendChild(holder);
    mainDiv.appendChild(rightPanel);

    // build and add exit confirm overlay

    let divExitConfirm = document.createElement("div");

    divExitConfirm.classList.add("fullscreenOverlay");
    divExitConfirm.id = "divExitConfirm";
    divExitConfirm.style.backgroundColor = "rgba(18%, 31%, 31%, 0.8)";
    divExitConfirm.style.display = "none";


    let divExitCenterColumn = document.createElement("div");
    divExitCenterColumn.id = "divExitCenterColumn";
    //divExitCenterColumn.style.backgroundColor = "gray";
    divExitCenterColumn.style.marginLeft = "20%";
    divExitCenterColumn.style.marginRight = "20%";
    divExitCenterColumn.style.height = "100%";
    divExitCenterColumn.style.paddingTop = "5%";

    let divExitDialog = document.createElement("div");
    divExitDialog.id = "divExitDialog";
    divExitDialog.style.backgroundColor = "slategray";
    divExitDialog.style.textAlign = "center";
    divExitDialog.style.fontSize = "5vh";
    divExitDialog.style.paddingTop = "4%";
    divExitDialog.style.paddingBottom = "4%";

    let divExitMessage = document.createElement("div");
    divExitMessage.id = "divExitMessage";
    divExitMessage.style.marginRight = "2.5%";
    divExitMessage.style.marginLeft = "2.5%";
    divExitMessage.style.backgroundColor = "white";
    divExitMessage.style.paddingTop = "2%";
    divExitMessage.style.paddingBottom = "2%";

    holder = document.createElement("p");
    holder.innerHTML = "<span id=\"spanConnectedcount\"></span> connected.";
    divExitMessage.appendChild(holder);

    holder = document.createElement("p");
    holder.innerHTML = "<span id=\"spanUnmappedcount\"></span> unmapped.";
    divExitMessage.appendChild(holder);

    holder = document.createElement("p");
    //holder.innerHTML = "Choose to return and map controllers, or proceed with only\n" + " <span id=\"spanMappedCount\"></span>.";
    holder.innerHTML = "Choose to return and map controllers, or proceed with <span id=\"spanOnlyControllers\">only</span>\n" + " <span id=\"spanMappedCount\"></span>.";
    divExitMessage.appendChild(holder);


    let divExitButtons = document.createElement("div");
    divExitButtons.id = "divExitButtons";
    divExitButtons.style.paddingTop = "5%";

    holder = document.createElement("div");
    holder.classList.add("exitButton");
    holder.id = "divExitBtnReturn";
    holder.innerText = "Return";
    holder.style.marginRight = "2%";

    divExitButtons.appendChild(holder);

    holder = document.createElement("div");
    holder.classList.add("exitButton");
    holder.id = "divExitBtnProceed";
    holder.innerText = "Proceed";
    holder.style.marginLeft = "2%";
    holder.click = _jsxinput.helperPanelExit;

    divExitButtons.appendChild(holder);


    divExitDialog.appendChild(divExitMessage);
    divExitDialog.appendChild(divExitButtons);

    divExitCenterColumn.appendChild(divExitDialog);
    divExitConfirm.appendChild(divExitCenterColumn);

    mainDiv.appendChild(divExitConfirm);



};


_jsxinput.sizeLayout = function () {
    let mainHeight = _jsxinput.o("_jsxinputMainDiv").offsetHeight;
    let mainWidth = _jsxinput.o("_jsxinputMainDiv").offsetWidth;
    let divHeight = (mainHeight - 32);
    let divWidth = ((mainWidth * 0.5) - 32);
    _jsxinput.o("rightPanel").style.height = divHeight + "px";
    _jsxinput.o("rightPanel").style.width = divWidth + "px";
    let xOffset = 0;
    let yOffset = 0;
    
    let maxDimension = 0;
    let gamePadDivSize = 0;
    let thumbStickSize = 0;
    let faceButtonSize = 0;
    let smallFaceButtonWidth = 0;
    let smallFaceButtonHeight = 0;
    
    let shoulderButtonWidth = 0;
    let shoulderButtonHeight = 0;
    // shoulder buttons share a width.
    let shoulderTriggerHeight = 0;
    let stickClickWidth = 0;
    let stickClickHeight = 0;

    if (divWidth <= divHeight)
    {
        maxDimension = divWidth;
        xOffset = 0;
        yOffset = (divHeight - divWidth) / 2.0;
        


    }
    else
    {
        maxDimension = divHeight;
        xOffset = (divWidth - divHeight) / 2.0;
        yOffset = 0;
    }

    gamePadDivSize = (maxDimension * 0.16);
    thumbStickSize = (maxDimension * 0.132);


    faceButtonSize = (maxDimension * 0.0637);
    smallFaceButtonWidth = (maxDimension * 0.0646);
    smallFaceButtonHeight = (maxDimension * 0.0262);

    
    shoulderButtonWidth = (maxDimension * 0.118);
    shoulderButtonHeight = (maxDimension * 0.071);

    shoulderTriggerHeight = (maxDimension * 0.1195);

    stickClickWidth = (maxDimension * 0.1334);
    stickClickHeight = (maxDimension * 0.0359);



    _jsxinput.o("divDpad").style.height = gamePadDivSize + "px";
    _jsxinput.o("divDpad").style.width = _jsxinput.o("divDpad").style.height;

    _jsxinput.o("divDpad").style.top = (yOffset + (maxDimension * 0.1466)) + "px";


    _jsxinput.o("divDpad").style.left = (xOffset + (maxDimension * 0.158)) + "px";


    _jsxinput.o("divLstick").style.height = thumbStickSize + "px";
    _jsxinput.o("divLstick").style.width = _jsxinput.o("divLstick").style.height;

    _jsxinput.o("divRstick").style.height = thumbStickSize + "px";
    _jsxinput.o("divRstick").style.width = _jsxinput.o("divLstick").style.height;



    _jsxinput.o("divLstick").style.top = (yOffset + (maxDimension * 0.29)) + "px";
    _jsxinput.o("divLstick").style.left = (xOffset + (maxDimension * 0.3015)) + "px";

    _jsxinput.o("divRstick").style.top = (yOffset + (maxDimension * 0.29)) + "px";
    _jsxinput.o("divRstick").style.left = (xOffset + (maxDimension * 0.5665)) + "px";

    let Buttons = document.querySelectorAll(".divFaceButton");


    for (let i = 0; i < Buttons.length; i++)
    {
        Buttons[i].style.width = faceButtonSize + "px";
        Buttons[i].style.height = faceButtonSize + "px";
    }

    _jsxinput.o("divFaceBtnLeft").style.left = (xOffset + (maxDimension * 0.66)) + "px";
    _jsxinput.o("divFaceBtnLeft").style.top = (yOffset + (maxDimension * 0.195)) + "px";

    _jsxinput.o("divFaceBtnRight").style.left = (xOffset + (maxDimension * 0.8)) + "px";
    _jsxinput.o("divFaceBtnRight").style.top = (yOffset + (maxDimension * 0.195)) + "px";

    _jsxinput.o("divFaceBtnTop").style.left = (xOffset + (maxDimension * 0.73)) + "px";
    _jsxinput.o("divFaceBtnTop").style.top = (yOffset + (maxDimension * 0.1253)) + "px";

    _jsxinput.o("divFaceBtnBottom").style.left = (xOffset + (maxDimension * 0.73)) + "px";
    _jsxinput.o("divFaceBtnBottom").style.top = (yOffset + (maxDimension * 0.265)) + "px";


    _jsxinput.o("divStartButton").style.width = smallFaceButtonWidth + "px";
    _jsxinput.o("divStartButton").style.height = smallFaceButtonHeight + "px";

    //_jsxinput.o("divStartButton").style.left = (xOffset + (maxDimension * 0.396)) + "px";
    _jsxinput.o("divStartButton").style.left = (xOffset + (maxDimension * 0.54)) + "px";
    _jsxinput.o("divStartButton").style.top = (yOffset + (maxDimension * 0.237)) + "px";


    _jsxinput.o("divSelectButton").style.width = smallFaceButtonWidth + "px";
    _jsxinput.o("divSelectButton").style.height = smallFaceButtonHeight + "px";

    _jsxinput.o("divSelectButton").style.left = (xOffset + (maxDimension * 0.396)) + "px";
    //_jsxinput.o("divSelectButton").style.left = (xOffset + (maxDimension * 0.54)) + "px";
    _jsxinput.o("divSelectButton").style.top = (yOffset + (maxDimension * 0.237)) + "px";

    //_jsxinput.o("divMenuButton").style.width = menuButtonSize + "px";
    //_jsxinput.o("divMenuButton").style.height = menuButtonSize + "px";

    //_jsxinput.o("divMenuButton").style.left = (xOffset + (maxDimension * 0.459)) + "px";
    //_jsxinput.o("divMenuButton").style.top = (yOffset + (maxDimension * 0.140)) + "px";



    _jsxinput.o("divL1").style.width = shoulderButtonWidth + "px";
    _jsxinput.o("divL1").style.height = shoulderButtonHeight + "px";

    _jsxinput.o("divL1").style.left = (xOffset + (maxDimension * 0.179)) + "px";
    _jsxinput.o("divL1").style.top = (yOffset + (maxDimension * 0.703)) + "px";

    _jsxinput.o("divL2").style.width = shoulderButtonWidth + "px";
    _jsxinput.o("divL2").style.height = shoulderTriggerHeight + "px";

    _jsxinput.o("divL2").style.left = (xOffset + (maxDimension * 0.179)) + "px";
    _jsxinput.o("divL2").style.top = (yOffset + (maxDimension * 0.568)) + "px";

    _jsxinput.o("divL3").style.width = stickClickWidth + "px";
    _jsxinput.o("divL3").style.height = stickClickHeight + "px";

    _jsxinput.o("divL3").style.left = (xOffset + (maxDimension * 0.3015)) + "px";
    _jsxinput.o("divL3").style.top = (yOffset + (maxDimension * 0.8295)) + "px";



    _jsxinput.o("divR1").style.width = shoulderButtonWidth + "px";
    _jsxinput.o("divR1").style.height = shoulderButtonHeight + "px";

    _jsxinput.o("divR1").style.left = (xOffset + (maxDimension * 0.7022)) + "px";
    _jsxinput.o("divR1").style.top = (yOffset + (maxDimension * 0.703)) + "px";

    _jsxinput.o("divR2").style.width = shoulderButtonWidth + "px";
    _jsxinput.o("divR2").style.height = shoulderTriggerHeight + "px";

    _jsxinput.o("divR2").style.left = (xOffset + (maxDimension * 0.7022)) + "px";
    _jsxinput.o("divR2").style.top = (yOffset + (maxDimension * 0.568)) + "px";

    _jsxinput.o("divR3").style.width = stickClickWidth + "px";
    _jsxinput.o("divR3").style.height = stickClickHeight + "px";

    _jsxinput.o("divR3").style.left = (xOffset + (maxDimension * 0.5650)) + "px";
    _jsxinput.o("divR3").style.top = (yOffset + (maxDimension * 0.8295)) + "px";
};


_jsxinput.showMapMenu = function () {
    if (_jsxinput.displayedTab !== 0)
    {
        _jsxinput.o("divMenuConfig").style.display = "none";

        if (_jsxinput.strCmp(_jsxinput.o("divTabConfig").style.backgroundColor, "darkgray") === 0)
        {
            _jsxinput.o("divTabConfig").style.backgroundColor = "lightgray";
        }



        _jsxinput.o("divMenuMap").style.display = "block";
        _jsxinput.o("divTabMap").style.backgroundColor = "darkgray";

        _jsxinput.displayedTab = 0;
    }
    else
    {
        
    }

};


_jsxinput.getGreatestZindex = function () {
    // used to put the mapping menu above all other elements.


    let zTop = 0;
    let currentZindex = 0;

    //let documentNodes = document.body.childNodes;
    let documentNodes = document.body.querySelectorAll("*");

    for (let i = 0; i < documentNodes.length; i++)
    {
        if (documentNodes[i].nodeType === Node.ELEMENT_NODE) // nodes are either elements or text nodes. text nodes can't be passed to getComputedStyle.
        {
            currentZindex = parseInt(window.getComputedStyle(documentNodes[i]).getPropertyValue('z-index'));
            if (currentZindex )

                if (currentZindex > zTop)
                {
                    zTop = currentZindex;
                }
        }
    }
    return zTop
};

_jsxinput.showConfigMenu = function () {
    if (_jsxinput.displayedTab !== 1)
    {
        // reset config select
        _jsxinput.updateConfigSelect();
        _jsxinput.o("divMenuConfig").style.display = "block";
        _jsxinput.o("divMenuMap").style.display = "none";


        _jsxinput.o("divTabConfig").style.backgroundColor = "darkgray";
        _jsxinput.o("divTabMap").style.backgroundColor = "lightgray";

        _jsxinput.updateDeadzoneLabels();
        _jsxinput.displayedTab = 1;
    }
};




// used to sleep for 16 ms between dead zone scans. It's supposed to block so as to impress the user. ;)
_jsxinput.sleep = function (milliseconds) {
    const date = Date.now();
    let currentDate = null;
    do {
        currentDate = Date.now();
    } while (currentDate - date < milliseconds);
};

_jsxinput.detectDeadzonesSubroutine = function ()
{
    let JSpadIndex = _jsxinput.o("selectConfigInput").selectedIndex;
    

    _jsxinput.JSpads[JSpadIndex].update();


    // use absolute values since we only care about distance from center.
    let Lx = Math.abs(_jsxinput.JSpads[JSpadIndex].gp[_jsxinput.JSpads[JSpadIndex].gamePadIndex].axes[_jsxinput.JSpads[JSpadIndex].mapping.Lx]);
    let Ly = Math.abs(_jsxinput.JSpads[JSpadIndex].gp[_jsxinput.JSpads[JSpadIndex].gamePadIndex].axes[_jsxinput.JSpads[JSpadIndex].mapping.Ly]);
    let Rx = Math.abs(_jsxinput.JSpads[JSpadIndex].gp[_jsxinput.JSpads[JSpadIndex].gamePadIndex].axes[_jsxinput.JSpads[JSpadIndex].mapping.Rx]);
    let Ry = Math.abs(_jsxinput.JSpads[JSpadIndex].gp[_jsxinput.JSpads[JSpadIndex].gamePadIndex].axes[_jsxinput.JSpads[JSpadIndex].mapping.Ry]);


    // new addition to poll multiple times as accomodation for flickering values.
    let Lx_high = 0.0;
    let Ly_high = 0.0;
    let Rx_high = 0.0;
    let Ry_high = 0.0;

    let Lx_litmus = 0.0;
    let Ly_litmus = 0.0;
    let Rx_litmus = 0.0;
    let Ry_litmus = 0.0;

    _jsxinput.deadzoneScancount = 0;

    //let timeoutHolder = "";
    //let prev_count = 0;

    for (let i = 0; i <= 60; i++)
    {
        //
        

        _jsxinput.JSpads[JSpadIndex].update();

        Lx_litmus = Math.abs(_jsxinput.JSpads[JSpadIndex].gp[_jsxinput.JSpads[JSpadIndex].gamePadIndex].axes[_jsxinput.JSpads[JSpadIndex].mapping.Lx]);
        Ly_litmus = Math.abs(_jsxinput.JSpads[JSpadIndex].gp[_jsxinput.JSpads[JSpadIndex].gamePadIndex].axes[_jsxinput.JSpads[JSpadIndex].mapping.Ly]);
        Rx_litmus = Math.abs(_jsxinput.JSpads[JSpadIndex].gp[_jsxinput.JSpads[JSpadIndex].gamePadIndex].axes[_jsxinput.JSpads[JSpadIndex].mapping.Rx]);
        Ry_litmus = Math.abs(_jsxinput.JSpads[JSpadIndex].gp[_jsxinput.JSpads[JSpadIndex].gamePadIndex].axes[_jsxinput.JSpads[JSpadIndex].mapping.Ry]);

        if (Lx_litmus > Lx_high)
        {
            Lx_high = Lx_litmus;
        }

        if (Ly_litmus > Ly_high)
        {
            Ly_high = Ly_litmus;
        }

        if (Rx_litmus > Rx_high)
        {
            Rx_high = Rx_litmus;
        }

        if (Ry_litmus > Ry_high)
        {
            Ry_high = Ry_litmus;
        }

        //_jsxinput.sleep(64);
        _jsxinput.sleep(50);


    }

    Lx = Lx_high;
    Ly = Ly_high;
    Rx = Rx_high;
    Ry = Ry_high;

    // end new addition for multipoll.






    if (Lx >= Ly)
    {
        // jslint thinks this is a bug but I intend to use  the same value for both properties. :)
        _jsxinput.JSpads[JSpadIndex].deadzones.left.x = (Math.floor(Lx * 100.0) + 1) / 100.0;
        _jsxinput.JSpads[JSpadIndex].deadzones.left.y = _jsxinput.JSpads[JSpadIndex].deadzones.left.x;


    }
    else
    {

        _jsxinput.JSpads[JSpadIndex].deadzones.left.x = (Math.floor(Ly * 100.0) + 1) / 100.0;
        _jsxinput.JSpads[JSpadIndex].deadzones.left.y = _jsxinput.JSpads[JSpadIndex].deadzones.left.x;
    }



    if (Rx >= Ry)
    {

        _jsxinput.JSpads[JSpadIndex].deadzones.right.x = (Math.floor(Rx * 100.0) + 1) / 100.0;


        _jsxinput.JSpads[JSpadIndex].deadzones.right.y = _jsxinput.JSpads[JSpadIndex].deadzones.right.x;


    }
    else
    {

        _jsxinput.JSpads[JSpadIndex].deadzones.right.x = (Math.floor(Ry * 100.0) + 1) / 100.0;

        _jsxinput.JSpads[JSpadIndex].deadzones.right.y = _jsxinput.JSpads[JSpadIndex].deadzones.right.x;
    }




    _jsxinput.o("lblrangeL").innerText = _jsxinput.JSpads[JSpadIndex].deadzones.left.x;
    _jsxinput.o("lblrangeR").innerText = _jsxinput.JSpads[JSpadIndex].deadzones.right.x;



    _jsxinput.o("btnDetectDeadzones").disabled = false;
};



_jsxinput.detectDeadzones = function () {
    

    _jsxinput.o("btnDetectDeadzones").disabled = true;
    _jsxinput.o("lblrangeL").innerText = "One moment, please."
    _jsxinput.o("lblrangeR").innerText = "sampling device deadzones...";
    _jsxinput.o("btnDetectDeadzones").focus();

    // moving the detection code into a subroutine and calling it with a timeout so the button can be disabled.
    // otherwise the dom won't refresh.

    let detectDeadzonesTimeout = setTimeout(_jsxinput.detectDeadzonesSubroutine, 32);

    

    return 0;

};

_jsxinput.helperPanelExitConfirm = function () {
    let connectedCount = _jsxinput.getConnectedPadCount();
    let mappedCount = _jsxinput.getMappedPadCount();

    if (connectedCount === mappedCount)
    {
        _jsxinput.helperPanelExit();
    }
    else
    {
        let spanConnected = _jsxinput.o("spanConnectedcount");
        let spanUnmapped = _jsxinput.o("spanUnmappedcount");
        let spanMapped = _jsxinput.o("spanMappedCount");
        let spanOnly = _jsxinput.o("spanOnlyControllers");

        let unmappedCount = connectedCount - mappedCount;

        //let message = "";

        spanOnly.innerText = "only";

        if (connectedCount === 1)
        {
            spanConnected.innerText = connectedCount + " controller is";
        }
        else
        {
            if (connectedCount >= 2)
            {
                spanConnected.innerText = connectedCount + " controllers are";
            }
        }

        if (unmappedCount === 1)
        {
            spanUnmapped.innerText = unmappedCount + " controller remains";
        }
        else
        {
            if (unmappedCount >= 2)
            {
                spanUnmapped.innerText = unmappedCount + " controllers remain";
            }

        }


        if (connectedCount <= 0 || mappedCount <= 0)
        {
            spanMapped.innerText = " no mapped controllers";
            if (mappedCount <= 0)
            {
                spanOnly.innerText = "";
            }
        }
        else
        {
            if (mappedCount === 1)
            {
                spanMapped.innerText = mappedCount + " mapped controller";
            }
            else
            {
                if (mappedCount >= 2)
                {
                    spanMapped.innerText = mappedCount + " mapped controllers";
                }
            }
        }


        _jsxinput.o("divExitConfirm").style.display = "block";
    }

};

_jsxinput.helperPanelExit = function () {
    _jsxinput.exitMap();
};

_jsxinput.helperPanelExitCancel = function () {

    // closes the exit warning overlay, to show the controller mapping menu
    _jsxinput.o("divExitConfirm").style.display = "none";
};

_jsxinput.getConnectedPadCount = function () {
    let gp_array = navigator.getGamepads();
    let count = 0;

    for (let i = 0; i < gp_array.length; i++)
    {
        if (gp_array[i] !== undefined && gp_array[i] !== null)
        {
            if (gp_array[i].connected === true)
            {
                count = count + 1;
            }

        }

    }

    return count;
};




_jsxinput.getMappedPadCount = function () {
    let gp_array = navigator.getGamepads();
    let returned = 0;

    for (let i = 0; i <gp_array.length; i++)
    {
        if (gp_array[i] !== null && gp_array[i] !== undefined)
        {
            if (gp_array[i].connected === true) {
                if (_jsxinput.controllerHasMapping(gp_array[i].id) === true) {
                    returned = returned + 1;


                }
            }
        }
    }
    return returned;
};


_jsxinput.deviceHasJSpad = function (index){
    // returns true if there is a JSpad assigned to the device with the passed index.
    // returns false otherwise.
    let returned = false;

    for (let i = 0; i < _jsxinput.JSpads.length; i++)
    {
        if (_jsxinput.jsxinputMappings[i] !== null && _jsxinput.jsxinputMappings[i] !== undefined)
        {
            if (_jsxinput.JSpads[i] !== null && _jsxinput.JSpads[i] !== undefined)
            {
                //if (_jsxinput.JSpads[i].mappedDeviceIndex === index) {
                if (_jsxinput.JSpads[i].gamePadIndex === index) {
                    returned = true;
                    break;
                }
            }

        }
    }

    return returned;
};

_jsxinput.controllerHasMapping = function (id) {

    let returned = false;

    for (let i = 0; i < _jsxinput.jsxinputMappings.length; i++)
    {
        if (_jsxinput.jsxinputMappings[i] !== null && _jsxinput.jsxinputMappings[i] !== undefined)
        {
            if (_jsxinput.jsxinputMappings[i].mappingComplete === true) {
                if (_jsxinput.strCmp(_jsxinput.jsxinputMappings[i].controllerName, id) === 0) {
                    returned = true;
                    break;
                }
            }
        }

    }

    return returned;
};

//function mapping() {

_jsxinput.mapping = function () {
    // this is a class that glues the user's input device
    // to the idealized gamepad.
    this.A = -1;
    this.B = -1;
    this.X = -1;
    this.Y = -1;
    this.L1 = -1;
    this.L2 = -1;
    this.L3 = -1;
    this.R1 = -1;
    this.R2 = -1;
    this.R3 = -1;
    this.dpadUp = -1;
    this.dpadDown = -1;
    this.dpadLeft = -1;
    this.dpadRight = -1;
    this.Lx = -1;
    this.Ly = -1;
    this.Rx = -1;
    this.Ry = -1;
    this.controllerName = "";
    this.mappingComplete = false;

    // signifies L2 and R2 buttons that each present as axes instead of buttons.
    this.rudderShoulders = false;
    // signifies rudders that present range of -1 to 1 (instead of 0 to 1) and so require translation.
    this.translateRudders = false;
    // signifies a Dpad that presents as a pair of axes instead of 4 buttons.
    this.axisDpad = false;
    // signifies a DualSense 5 controller connected under Firefox that presents the d-pad as a single axis.
    // #TODO - remove this hack once Firefox implements correct support for the Sony DualSense 5.
    this.firefoxDS5hack = false;


    this.copy = function()
    {
        // only call on a controller where .mappingComplete == true.


        // create new mapping
        let spawn = new _jsxinput.mapping();


        // copy this mapping's values to it.
        spawn.A = this.A;
        spawn.B = this.B;
        spawn.X = this.X;
        spawn.Y = this.Y;
        spawn.L1 = this.L1;
        spawn.L2 = this.L2;
        spawn.L3 = this.L3;
        spawn.R1 = this.R1;
        spawn.R2 = this.R2;
        spawn.R3 = this.R3;
        spawn.select = this.select;
        spawn.start = this.start;
        spawn.dpadUp = this.dpadUp;
        spawn.dpadDown = this.dpadDown;
        spawn.dpadLeft = this.dpadLeft;
        spawn.dpadRight = this.dpadRight;
        spawn.Lx = this.Lx;
        spawn.Ly = this.Ly;
        spawn.Rx = this.Rx;
        spawn.Ry = this.Ry;

        spawn.rudderShoulders = this.rudderShoulders;
        spawn.translateRudders = this.translateRudders;

        
        
        spawn.axisDpad = this.axisDpad;

        spawn.firefoxDS5hack = this.firefoxDS5hack;

        spawn.controllerName = this.controllerName;
        spawn.mappingComplete = this.mappingComplete;


        // release the new mapping into the wild.
        return spawn;

    };

    this.toString = function() {
        // index properties to save characters in cookie.
        /*
        0 = A
        1 = B
        2 = X
        3 = Y
        4 = L1
        5 = L2
        6 = L3
        7 = R1
        8 = R2
        9 = R3
        10 = DPAD up
        11 = DPAD down
        12 = DPAD left
        13 = DPAD right
        14 = select
        15 = start
        16 = L-stick x axis
        17 = L-stick y axis
        18 = R-stick x axis
        19 = R-stick y axis
        20 = controllername
        21 = axisDpad
        22 = rudderShoulders
        

         */

        

        let returned = "";
        returned = this.A + "|" + this.B + "|" + this.X + "|" + this.Y + "|" + this.L1 + "|" + this.L2 + "|" + this.L3 + "|" + this.R1 + "|" + this.R2 + "|" + this.R3 + "|" + this.dpadUp + "|" + this.dpadDown + "|" + this.dpadLeft + "|" + this.dpadRight + "|" + this.select + "|" + this.start + "|" + this.Lx + "|" + this.Ly + "|" + this.Rx + "|" + this.Ry + "|" + this.controllerName + "|" + this.axisDpad + "|" + this.rudderShoulders + "|" + this.firefoxDS5hack;



        return returned;
    }
};

_jsxinput.saveMappingsToCookie = function () {
    // called at the end of mapping completion. encodes all mappings to string and saves them to cookie.

    let value = "";
    let cookie = "";
    //let captured = 0;
    //let max = 0;

    // erase existing cookie.
    document.cookie = "_jsxinputMappings=; expires=Thu, 01 Jan 1970 00:00:00 GMT";

    // step through mappings array and count completed mappings
    for (let i = 0; i < _jsxinput.jsxinputMappings.length ; i++)
    {


        if (_jsxinput.jsxinputMappings[i] != null && _jsxinput.jsxinputMappings[i] !== undefined)
        {
            if (_jsxinput.jsxinputMappings[i].mappingComplete === true)
            {
               value = value + "$@$" + _jsxinput.jsxinputMappings[i].toString();

            }
        }
    }


    
    cookie = "_jsxinputMappings=" + encodeURIComponent(value) + ";samesite=lax; expires= Thu, 21 Aug 2099 20:00:00 UTC";

    document.cookie = cookie;

};


_jsxinput.assignMappingsFromCookie = function () {
    // called after loadMappings from cookie.
    // assumptions:
    // we assume that mappings in a cookie are valid and preferred.
    // we assume that no controllers have been mapped yet.

    let gp_array = navigator.getGamepads();


    // create array to preserve deadzones.

    let aDeadzonePreserver = [];

    for (let i = 0; i < _jsxinput.JSpads.length; i++)
    {
        aDeadzonePreserver[i] = null;
    }


    for (let i = 0; i < _jsxinput.JSpads.length; i++)
    {
        
        if (_jsxinput.JSpads[i] !== null && _jsxinput.JSpads[i] !== undefined)
        {
            
            if (_jsxinput.JSpads[i].deadzones.left.x !== 0  || _jsxinput.JSpads[i].deadzones.right.x !== 0)
            {
                //- revisit when/if non-square deadzones are implemented.
                
                aDeadzonePreserver[i] = [_jsxinput.JSpads[i].gamePadIndex , _jsxinput.JSpads[i].deadzones.left.x,_jsxinput.JSpads[i].deadzones.right.x];
                
            }
        }



        _jsxinput.JSpads[i] = null;

    }

    let mappedPadCount = 0;




    for (let i = 0; i < gp_array.length; i++)
    {
        if (gp_array[i] !== undefined && gp_array[i] !== null)
        {
            for (let j = 0; j < _jsxinput.jsxinputMappings.length; j++)
            {
                if (_jsxinput.jsxinputMappings[j] !== undefined && _jsxinput.jsxinputMappings[j] !== null)
                {
                    
                    
                    

                    if (_jsxinput.strCmp(gp_array[i].id, _jsxinput.jsxinputMappings[j].controllerName) === 0)
                    {
                        _jsxinput.JSpads[mappedPadCount] = new _jsxinput.JSpad(i);
                        
                        mappedPadCount = mappedPadCount + 1;

                    }
                }
            }
        }
    }


    // now apply preserved dead zones.
    let target = -1;

    for (let i = 0; i < aDeadzonePreserver.length; i++)
    {
        if (aDeadzonePreserver[i] !== null)
        {

            

            target = _jsxinput.getJSpadIndexFromGamepadIndex(aDeadzonePreserver[i][0]);

            if (target !== -1)
            {

                //TODO- revisit when/if deadzones are not square.
                _jsxinput.JSpads[target].deadzones.left.x = aDeadzonePreserver[i][1];
                _jsxinput.JSpads[target].deadzones.left.y = aDeadzonePreserver[i][1];

                _jsxinput.JSpads[target].deadzones.right.x = aDeadzonePreserver[i][2];
                _jsxinput.JSpads[target].deadzones.right.y = aDeadzonePreserver[i][2];


            }
        }
    }


};

_jsxinput.loadMappingsFromCookie = function () {
    // called at end of GUI init. load.
    // NULLs all elements of mapping array, then loads any mappings found in cookie to array.



    // if there are mappings, load them into the mappings array.
    let allcookies = document.cookie;
    let cookiearray = allcookies.split(';');

    let name = "";
    let value = "";
    let aMappings = "";
    // Now take key value pair out of this array
    let i;
    let j;

    for(let i = 0; i < cookiearray.length; i++) {
        name = cookiearray[i].split('=')[0];
        value = cookiearray[i].split('=')[1];
        if (_jsxinput.strCmp("_jsxinputMappings", name))
        {
            break;
        }
    }

    let unescaped = decodeURIComponent(value);
    aMappings = unescaped.split("$@$");

    //let loadedCount = 0;

    let aSplit = "";

    let litmus = -1; // used to ensure the string encodes a valid mapping.
    let mappingCount = 0;

    for (i = 0;i< aMappings.length; i++)
    {
        // for each element in the split array. (of encoded mappings)
        if(aMappings[i].length > 0)
        {
            // if not an empty string
            

            aSplit = aMappings[i].split("|");

            /*
                0 = A
                1 = B
                2 = X
                3 = Y
                4 = L1
                5 = L2
                6 = L3
                7 = R1
                8 = R2
                9 = R3
                10 = DPAD up
                11 = DPAD down
                12 = DPAD left
                13 = DPAD right
                14 = select
                15 = start
                16 = L-stick x axis
                17 = L-stick y axis
                18 = R-stick x axis
                19 = R-stick y axis
                20 = controllername
                21 = axisDpad
                22 = rudderShoulders
                23 = firefoxDS5hack

                

            */
            
            // copy the mapping from the cookie into the _jsxinput.jsxinputMappings array



            // new approach assumes an empty mappings array.

            litmus = -1;
            litmus = _jsxinput.mappingFromString(aMappings[i]);
            if (litmus !== -1)
            {
                _jsxinput.jsxinputMappings[mappingCount] = litmus.copy();
                mappingCount = mappingCount + 1;

            }


        }
    }

    //
};

_jsxinput.mappingCount = function () {
    // returns the number of completed mappings in the jsxinputMappings array.
    // used to ensure mappings are only loaded from cookies
    // when no mappings exist already.

    let returned = 0;

    for (let i = 0; i < _jsxinput.jsxinputMappings.length; i++)
    {
        if (_jsxinput.jsxinputMappings[i] !== null && _jsxinput.jsxinputMappings[i] !== undefined)
        {
            returned += 1;
        }
    }

    return returned;


};


_jsxinput.firefoxDS5windowsWorkAround = function (deviceName) {
    deviceName = deviceName.toUpperCase();

    let firefox = -1;
    let windows = -1;

    firefox = navigator.userAgent.toLocaleUpperCase().search("FIREFOX");

    windows = navigator.platform.toLocaleUpperCase().search("WIN32");

    if ((deviceName.search("SONY") !== -1) || (deviceName.search("054C") !== -1))
    {
        if (deviceName.search("0CE6") !== -1)
        {
            // confirmed to be sony dsfive.
            if (firefox !== -1 && windows !== -1)
            {
                // confirmed on firefox windows.
                return true;   
            }

        }
    }

    return false;


    
};

_jsxinput.axisDpadSussing = function (deviceName){
    // used for early detection of devices that represent their dpad as an axis.
    // at present JUST sony controllers.
    // 054c-09cc-Wireless Controller		                            <---- as blue tooth device
	// 054c-09cc-Sony Interactive Entertainment Wireless Controller     <---- as USB device
    // presents L2+R2 inputs as BOTH axes and buttons, which messes with dpad  button / axis detection.
    deviceName = deviceName.toUpperCase();

    


    if (deviceName.search("SONY") !== -1)
    {
        return true;
    
    }
    else
    {
        if (deviceName.search("054C") !== -1)
        {
            return true;
        }
        else
        {
            return false;
        }
    }

};


_jsxinput.rudderShoulderSussing = function (deviceName)
{
    // used for early detection of devices with axes for shoulders
    // at present JUST sony controllers.
    // 054c-09cc-Wireless Controller		                            <---- as blue tooth device
	// 054c-09cc-Sony Interactive Entertainment Wireless Controller     <---- as USB device
    // presents L2+R2 inputs as BOTH axes and buttons.
    deviceName = deviceName.toUpperCase();


    if (deviceName.search("SONY") !== -1)
    {
        return true;
    }
    else
    {
        if (deviceName.search("054C") !== -1)
        {
            return true;
        }
        else
        {
            return false;
        }
    }


};

_jsxinput.mappingFromString = function (encodedMappingString) {
    // used with mapping.toString to store mappings as cookie.
    let aValues = encodedMappingString.split("|");

    let returned = new _jsxinput.mapping();



    returned.A  = parseInt(aValues[0], 10);
    returned.B = parseInt(aValues[1], 10);
    returned.X = parseInt(aValues[2], 10);
    returned.Y = parseInt(aValues[3], 10);
    returned.L1 = parseInt(aValues[4], 10);
    returned.L2 = parseInt(aValues[5], 10);
    returned.L3 = parseInt(aValues[6], 10);
    returned.R1 = parseInt(aValues[7], 10);
    returned.R2 = parseInt(aValues[8], 10);
    returned.R3 = parseInt(aValues[9], 10);
    returned.dpadUp = parseInt(aValues[10], 10);
    returned.dpadDown = parseInt(aValues[11], 10);
    returned.dpadLeft = parseInt(aValues[12], 10);
    returned.dpadRight = parseInt(aValues[13], 10);
    returned.select = parseInt(aValues[14], 10);
    returned.start = parseInt(aValues[15], 10);
    returned.Lx = parseInt(aValues[16], 10);
    returned.Ly = parseInt(aValues[17], 10);
    returned.Rx = parseInt(aValues[18], 10);
    returned.Ry = parseInt(aValues[19], 10);
    returned.axisDpad = false;
    returned.controllerName = aValues[20];
    

    if (aValues[21] !== undefined)
    {
        if (_jsxinput.strCmp("true", aValues[21]) === 0)
        {
            returned.axisDpad = true;
        }
    }

    returned.rudderShoulders = false;
    if (aValues[22] !== undefined)
    {
        if (_jsxinput.strCmp("true", aValues[22]) === 0)
        {
            returned.rudderShoulders = true;
        }
    }

    returned.firefoxDS5hack = false;
    if (aValues[23] !== undefined)
    {
        if (_jsxinput.strCmp("true", aValues[23]) === 0)
        {
            returned.firefoxDS5hack = true;
        }
    }
    

    
    returned.mappingComplete = true;

    // sanity checks. return -1 if any mapping is not a number.
    //- later: combine all these into one "OR" condition.

    if (isNaN(returned.A) === true)
    {
        return -1;
    }


    if (isNaN(returned.B) === true)
    {
        return -1;
    }

    if (isNaN(returned.X) === true)
    {
        return -1;
    }

    if (isNaN(returned.Y) === true)
    {
        return -1;
    }

    if (isNaN(returned.L1) === true)
    {
        return -1;
    }

    if (isNaN(returned.L2) === true)
    {
        return -1;
    }

    if (isNaN(returned.L3) === true)
    {
        return -1;
    }


    if (isNaN(returned.R1) === true)
    {
        return -1;
    }

    if (isNaN(returned.R2) === true)
    {
        return -1;
    }

    if (isNaN(returned.R3) === true)
    {
        return -1;
    }

    if (isNaN(returned.dpadUp) === true)
    {
        return -1;
    }


    if (isNaN(returned.dpadDown) === true)
    {
        return -1;
    }

    if (isNaN(returned.dpadLeft) === true)
    {
        return -1;
    }

    if (isNaN(returned.dpadRight) === true)
    {
        return -1;
    }

    if (isNaN(returned.select) === true)
    {
        return -1;
    }

    if (isNaN(returned.start) === true)
    {
        return -1;
    }

    if (isNaN(returned.Lx) === true)
    {
        return -1;
    }

    if (isNaN(returned.Ly) === true)
    {
        return -1;
    }


    if (isNaN(returned.Rx) === true)
    {
        return -1;
    }

    if (isNaN(returned.Ry) === true)
    {
        return -1;
    }

    return returned;

};


// events for gamepad connect and disconnect

//function connectpad(e)
//{
_jsxinput.connectpad = function (e) {


    
    let padIndex = e.gamepad.index;
    


    _jsxinput.updateControllerSelect();
    if (_jsxinput.getConnectedPadCount() > 0)
    {
        // hide no pads warning.
        //_jsxinput.o("divNoPads").style.display = "none";

        _jsxinput.o("selectInstructions").innerHTML =  "Select a " + '\uD83C\uDFAE' + " to map:";

        // show pad selection.
        _jsxinput.o("selectMapInput").disabled = false;

        //
        //

        if (_jsxinput.controllerHasMapping(e.gamepad.id) === true)
        {
            //

            if (_jsxinput.deviceHasJSpad(e.gamepad.index) === false)
            {
                //
                _jsxinput.JSpads[_jsxinput.getFirstEmptyJSslot()] = new _jsxinput.JSpad(e.gamepad.index);
            }
        }


        //

    }

    else
    {
        // zero controllers impossible on an add controller event but why not?



        _jsxinput.o("selectInstructions").innerHTML = "No controllers found.<br>Ensure controller(s) are connected and press a button to awaken them.";

        // hide pad selection.
        _jsxinput.o("btnFullMap").disabled = true;
        _jsxinput.o("selectMapInput").disabled = true;

    }

    _jsxinput.updateConfigTab(); // show / hide device config tab and menu based on mapped controller count.




};

//function disconnectpad(e)
//{
_jsxinput.disconnectpad = function (e) {
    
    //gp[e.gamepad.index] = null;
    //gp_connected[e.gamepad.index] = 0;


    _jsxinput.updateControllerSelect();



    if (_jsxinput.getConnectedPadCount() > 0)
    {
        // update instructions.
        _jsxinput.o("selectInstructions").innerHTML = "Select a " + '\uD83C\uDFAE' + " to map:";


        // show pad selection.
        _jsxinput.o("divMenuMap").style.display = "block";
        _jsxinput.o("btnFullMap").disabled = false;
        _jsxinput.o("selectMapInput").disabled = false;


        _jsxinput.showMapMenu();

    }
    else {
        // no pads connected
        // update instructions.
        _jsxinput.o("selectInstructions").innerHTML = "No controllers found.<br>Ensure controller(s) are connected and press a button to awaken them.";

        // hide config menu
        _jsxinput.showMapMenu();
        _jsxinput.configTabDisable();

        // disable pad selection and map button
        _jsxinput.o("btnFullMap").disabled = true;
        _jsxinput.o("selectMapInput").disabled = true;
    }
    
    
    _jsxinput.updateConfigTab(); // show / hide device config tab and menu based on mapped controller count.



    

    
    _jsxinput.purgeInvalidJSpads();

};


/*---------------------------------------*/
// these function exist

_jsxinput.maintainJSXpads = function ()
{
    // this is called during connect / disconnect events.
    // it ensures that:
    // 1. There are no JSXpads without valid devices connected.
    // 2. Every device with a valid mapping has a JSXpad.

    // commenting out while debugging.
    _jsxinput.purgeInvalidJSpads();
    _jsxinput.applyMappings();
}


_jsxinput.purgeInvalidJSpads = function ()
{
    // this is called during disconnect events.
    // it checks existing JSpads against the devices in navigator.gamepads.
    // if the referenced device does not exist, it nulls the JSpad.
    // it is the equivalent of _jsxinput.applyMappings but for disconnect events.

    

    let valid = true;
    let gpArray = navigator.getGamepads();

    for (let i = 0; i < _jsxinput.JSpads.length; i++)
    {
        // for each JSpad that exists
        if (_jsxinput.JSpads[i] !== null & _jsxinput.JSpads[i] !== undefined)
        {
            valid = true;

            if (gpArray[_jsxinput.JSpads[i].gamePadIndex] === null || gpArray[_jsxinput.JSpads[i].gamePadIndex] === undefined)
            {
                // invalidate the JSpad if there is no corresponding device in the browser's gamepads array.
                
                valid = false;
            }
            else
            {
                // there is a device at the expected element of the browser's gamepads array, but make sure its id matches the JSpad's.
                // otherwise invalidate it.
                if (_jsxinput.strCmp(_jsxinput.JSpads[i].id, gpArray[_jsxinput.JSpads[i].gamePadIndex].id) !== 0)
                {
                    
                    valid = false
                }

            }

            if (valid === false)
            {
                _jsxinput.JSpads[i] = null;
            }
        }
    }

};

_jsxinput.applyMappings = function ()
{
    // this is called during connect events.
    // it checks each connected gamepad.
    // first, it checks whether the gamepad corresponds to an existing, mapped JSpad object. if so, all is well for that gamepad
    // if the gamepads corresponds to an existing, unmapped JSPad object, it deletes the jspad object
    // if there is no correponding jspad object
    //  it checks whether the gamepad's id corresponds to .controllerName property of an existing mapping object with .mappingComplete === true.
    //     if so it creates a new JSpad object in the lowest empty array element in the _jsxInput.jspads array
    //      it then applies the corresponding mapping object to the newly created jspad
    //      and updates the JSpad's .id property to reflect the index of the gamepad's array element.

    // it is the equivalent of _jsxinput.purgeInvalidJSpads but for connect events.

    // perhaps it should first check for existing JSpads mapped to the same device index and delete them?
    

    let gpArray = navigator.getGamepads();

    let jsPadIndex = -1;
    let hasJSpad = false;

    for (let i = 0; i < gpArray.length; i++)
    {
        if (gpArray[i] !== null && gpArray[i] !== undefined)
        {
            jsPadIndex = -1;
            hasJSpad = false;

            hasJSpad = _jsxinput.deviceHasJSpad(i);

            if (hasJSpad !== false)
            {
                // navigator gamepad has jspad

                jsPadIndex = _jsxinput.getJSpadIndexFromGamepadIndex(i);

                if (_jsxinput.JSpads[jsPadIndex].gamePadIndex === i)
                {
                    // jspad is associated with this navigator pad
                    if (_jsxinput.JSpads[jsPadIndex].mapping.mappingComplete === false)
                    {
                        // mapping is not complete. delete the jspad object
                        _jsxinput.JSpads[jsPadIndex] = null;
                        // it is tempting to delete the mapping but since it is not possible to assign an incomplete mapping this is already overkill.
                    }
                    else
                    {
                        // mapping is complete and already associated with this device. no need to do anything.
                    }
                }

            }
            else
            {
                // navigator gamepad has no jspad
                // but does it have a mapping that will work?
                for (let j = 0; j < _jsxinput.jsxinputMappings.length; j++)
                {
                    if (_jsxinput.jsxinputMappings[j] !== null && _jsxinput.jsxinputMappings[j] !== undefined)
                    {
                        
                        if (_jsxinput.strCmp(gpArray[i].id, _jsxinput.jsxinputMappings[j].controllerName) === 0)
                        {
                            if (_jsxinput.jsxinputMappings[j].mappingComplete === true)
                            {
                                // here is the main purpose.
                                // 1. create a new jsxinput device and assign it to the lowest empty element in _jsxinput.JSpads.
                                // 2. set its gamePadIndex to i
                                // 3. apply mapping j.
                                // 2 and 3 are automatically done by the JSpad constructor.

                                
                                

                                let element = -1;

                                for (let p = 0; p < _jsxinput.JSpads.length; p++)
                                {
                                    if (_jsxinput.JSpads[p] === null || _jsxinput.JSpads[p] === undefined)
                                    {
                                        element = p;
                                        break;
                                    }
                                }

                                if (element !== -1)
                                {
                                    _jsxinput.JSpads[element] = new _jsxinput.JSpad(i);
                                    _jsxinput.JSpads[element].update();
                                }
                                else
                                {
                                    


                                }

                            }
                            else
                            {
                                // delete incomplete mapping if found.
                                _jsxinput.jsxinputMappings[j] = null;
                            }
                        }
                    }
                }

            }
        }

    }

}


/*-----------------------------------*/

//function configSelectChange() {
_jsxinput.configSelectChange = function () {

    let select = _jsxinput.o("selectConfigInput");

    let index = select.selectedIndex; // because jspad array can have gaps, must find the nth valid jspad object

    

    let foundCount = 0;
    let padIndex = -1;

    /*
    let Lslider = _jsxinput.o("rangeL");
    let Rslider = _jsxinput.o("rangeR");
    */

    for (let i = 0; i < _jsxinput.JSpads.length; i++)
    {
        if (_jsxinput.JSpads[i] !== null && _jsxinput.JSpads[i] !== undefined && _jsxinput.JSpads[i].mapping.mappingComplete === true)
        {
            if (foundCount === index)
            {
                
                padIndex = foundCount;
                break;
            }
            else
            {
                foundCount = foundCount + 1; // we have still found a valid gamepad, just not the right one.
            }
        }
    }


    if (padIndex !== -1)
    {

        _jsxinput.updateDeadzoneLabels();
    // for now only square dead zones are supported.

        /*
    Lslider.value = parseFloat(_jsxinput.JSpads[padIndex].deadzones.left.x) * 100.0;

    _jsxinput.o("lblrangeL").innerText = Lslider.value + "%";

    Rslider.value = parseFloat(_jsxinput.JSpads[padIndex].deadzones.right.x) * 100.0;

    _jsxinput.o("lblrangeR").innerText = Rslider.value + "%";
    */
    }
};


_jsxinput.updateDeadzoneLabels = function () {
    // updates the labels for the L and R analog dead zones on the config tab
    // to reflect the currently selected mapped device.
    let select = _jsxinput.o("selectConfigInput");
    let selectIndex = -1;

    let counter = 0;
    let JSpadIndex = -1;

    if (select !== null && select !== undefined)
    {
        selectIndex = select.selectedIndex;

        if (selectIndex !== -1)
        {
            for (let i = 0; i < _jsxinput.JSpads.length; i++)
            {
                if (_jsxinput.JSpads[i] !== null && _jsxinput.JSpads[i] !== undefined)
                {
                    if (i === selectIndex)
                    {
                        JSpadIndex = i;
                        break;
                    }
                    else
                    {
                        counter = counter + 1;
                    }
                }
            }
        }
    }

    if (JSpadIndex !== -1)
    {
        
        
        

        _jsxinput.o("lblrangeL").innerText =  _jsxinput.JSpads[JSpadIndex].deadzones.left.x;
        _jsxinput.o("lblrangeR").innerText =  _jsxinput.JSpads[JSpadIndex].deadzones.right.y;
    }
    else
    {
        
        _jsxinput.o("lblrangeL").innerText =  "Undetected.";
        _jsxinput.o("lblrangeR").innerText =  "Undetected.";
    }

};


_jsxinput.updateConfigSelect = function () {
    

    // remove all items from select element.
    let select = _jsxinput.o("selectConfigInput");

    let i = 0;

    if (select.length > 0) {
        for (i = select.length - 1; i >= 0; i--) {
            
            //select.removeChild(i);

            //select.removeChild(select.childNodes[i]);

            select.remove(i);
        }
    }

    //let gp_array = navigator.getGamepads();

    let opt = "";




    // rewrite to load select with _jsxinput.JSpads.

    let lastFoundIndex = -1;

    for (i = 0; i < _jsxinput.JSpads.length; i++)
    {
        if (_jsxinput.JSpads[i] !== null && _jsxinput.JSpads[i] !== undefined)
        {
            if (_jsxinput.JSpads[i].mapping.mappingComplete === true)
            {
                lastFoundIndex = i;
                
                opt = document.createElement("option");
                opt.innerHTML = _jsxinput.JSpads[i].id;
                select.appendChild(opt);
            }
        }
    }


    if (select.length > 0)
    {
        select.disabled = false;

        
    }
    else
    {
        select.disabled = true;
    }

};


//function updateControllerSelect() {
_jsxinput.updateControllerSelect = function () {

    // remove all items from select element.
    let select = _jsxinput.o("selectMapInput");

    let i = 0;

    for (i = select.length - 1; i >= 0; i--)
    {
        
        select.remove(i);
    }
    let gp_array = navigator.getGamepads();

    // add the initial no controller selected default.
    let opt = document.createElement("option");
    opt.innerHTML = "No controller selected.";
    select.appendChild(opt);

    // add each present controller to select element.

    for (i = 0; i < gp_array.length; i++)
    {
    if (gp_array[i] != null)
    {
        

        if (gp_array[i].connected === true)
        {
            opt = document.createElement("option");
            opt.innerHTML = gp_array[i].id;
            select.appendChild(opt);
        }
        else
        {
            
        }
    }
    }

    select.style.backgroundColor = "yellow";

    _jsxinput.o("selectMapStatusIcon").innerHTML = "";
    _jsxinput.o("selectMapStatusMessage").innerHTML = "";

};

//function updateConfigTab() {
_jsxinput.updateConfigTab = function () {
    // called throughout the program.
    // this hides / show the config tab based on whether a mapped gamepad is connected.
    
    if (_jsxinput.getMappedPadCount() > 0)
    {
        // enable configure devices tab.
        
        _jsxinput.configTabEnable();
    }
    else
    {
        
        // disable configure devices tab.
        _jsxinput.configTabDisable();
        // hide configure devices menu.
        _jsxinput.showMapMenu();
    }
};


//function controllerSelectChange() {
_jsxinput.controllerSelectChange = function () {
    
    let select = _jsxinput.o("selectMapInput");
    let button = _jsxinput.o("btnFullMap");
    if (select.selectedIndex === 0)
    {
        select.style.backgroundColor = "yellow";
        button.disabled = true;
    }
    else
    {
        select.style.backgroundColor = "white";
        button.disabled = false;
    }

    if (_jsxinput.controllerHasMapping(select.value) === true)
    {
        
        _jsxinput.o("selectMapStatusIcon").innerHTML = "&#10004;";
        _jsxinput.o("selectMapStatusMessage").innerHTML = "This controller is already mapped.";

    }
    else
    {
        
        _jsxinput.o("selectMapStatusIcon").innerHTML = "&nbsp;"; // nonbreaking space is necessary to preserve height.
        _jsxinput.o("selectMapStatusMessage").innerHTML = "";
        //_jsxinput.o("selectMapStatusIcon").innerHTML = "&#10006;";
    }
};

//function configTabDisable() {
_jsxinput.configTabDisable = function () {
    
    _jsxinput.o("divTabConfig").style.backgroundColor = "darkslategray";
    _jsxinput.o("divTabConfig").style.color = "darkslategray";
};

//function configTabEnable() {
_jsxinput.configTabEnable = function () {
    
    if (_jsxinput.displayedTab !== 1) {
        _jsxinput.o("divTabConfig").style.backgroundColor = "lightgray";
        _jsxinput.o("divTabConfig").style.color = "initial";
    }
};


// mapping functions

_jsxinput.fullMap = function (inputID) {
    //
    _jsxinput.o("selectMapInput").disabled = true;
    _jsxinput.o("btnFullMap").disabled = true;



    _jsxinput.mappingStage = 0;
    _jsxinput.workingMapping = new _jsxinput.mapping();

    _jsxinput.workingMapping.controllerName = _jsxinput.o("selectMapInput").value;
    _jsxinput.mappedDeviceIndex = _jsxinput.getControllerIndexFromID(_jsxinput.workingMapping.controllerName);
    

    if (navigator.getGamepads()[_jsxinput.mappedDeviceIndex].axes.length > 4)
    {
        // if there are only 4 (or less axes) we can assume they are all joysticks. and none of them are actually shoulder buttons.
        _jsxinput.workingMapping.rudderShoulders = _jsxinput.rudderShoulderSussing(_jsxinput.workingMapping.controllerName);
    }    

    if (navigator.getGamepads()[_jsxinput.mappedDeviceIndex].axes.length > 4)
    {
        // if there are only 4 (or less axes) we can assume they are all joysticks. and none of them are dpads.
        _jsxinput.workingMapping.axisDpad = _jsxinput.axisDpadSussing(_jsxinput.workingMapping.controllerName);
    }
    
    _jsxinput.workingMapping.firefoxDS5hack = _jsxinput.firefoxDS5windowsWorkAround(_jsxinput.workingMapping.controllerName)
    
    
    
    



    _jsxinput.intervalMapping = setInterval(_jsxinput.detectMapInput, 16);
    //mappedDeviceIndex = _jsxinput.o("selectMapInput").selectedIndex - 1;
    _jsxinput.notify(_jsxinput.buttonMappingMessages[_jsxinput.mappingStage]);
    _jsxinput.unhighlightInputs();
    _jsxinput.highlightInput("divFaceBtnBottom");
    _jsxinput.boolAxesMapping = false;
    _jsxinput.boolBtnMapping = true;
    _jsxinput.boolDpadMapping = false;


};

_jsxinput.detectMapInput = function () {
    if (document.hidden === true) {
    //
    return;
    }
    //
    let controller = navigator.getGamepads()[_jsxinput.mappedDeviceIndex];

    if (controller === undefined)
    {
        // return early if undefined. in firefox some events can reset navigator.getGamepads() and require user input on the pad. :(
        // if this happens during mapping the user will most likely press the requested button to awaken the controller.
        return;
    }

    // #TODO - clean up the commented out cases 
    let i = 0;

    if (_jsxinput.boolBtnMapping === true)
    {
        for (i = 0; i < controller.buttons.length; i++)
        {
            // for each button on the controller, check if it's pressed

            if (controller.buttons[i].pressed === true) {
                // digital button pressed
                
                switch (_jsxinput.mappingStage)
                {
                    case 0:
                        // (A) button
                        _jsxinput.workingMapping.A = i;
                        _jsxinput.mappingStage = _jsxinput.mappingStage + 1;
                        
                        _jsxinput.unhighlightInputs();
                        _jsxinput.highlightInput("divFaceBtnRight");
                        _jsxinput.notify(_jsxinput.buttonMappingMessages[_jsxinput.mappingStage]);
                        break;
                    case 1:
                        // (B) button
                        if (i !== _jsxinput.workingMapping.A) {
                            _jsxinput.workingMapping.B = i;
                            _jsxinput.mappingStage = _jsxinput.mappingStage + 1;
                            _jsxinput.unhighlightInputs();
                            _jsxinput.highlightInput("divFaceBtnLeft");
                            _jsxinput.notify(_jsxinput.buttonMappingMessages[_jsxinput.mappingStage]);
                            
                        }
                        break;
                    case 2:
                        // (X) button
                        if (i !== _jsxinput.workingMapping.A && i !== _jsxinput.workingMapping.B) {
                            _jsxinput.workingMapping.X = i;
                            _jsxinput.mappingStage = _jsxinput.mappingStage + 1;
                            _jsxinput.unhighlightInputs();
                            _jsxinput.highlightInput("divFaceBtnTop");
                            _jsxinput.notify(_jsxinput.buttonMappingMessages[_jsxinput.mappingStage]);
                            
                        }
                        break;
                    case 3:
                        // (Y) button
                        if (i !== _jsxinput.workingMapping.A && i !== _jsxinput.workingMapping.B && i !== _jsxinput.workingMapping.X) {
                            _jsxinput.workingMapping.Y = i;
                            
                            _jsxinput.mappingStage = _jsxinput.mappingStage + 1;
                            _jsxinput.unhighlightInputs();
                            _jsxinput.highlightInput("divSelectButton");
                            _jsxinput.notify(_jsxinput.buttonMappingMessages[_jsxinput.mappingStage]);

                        }
                        break;
                    case 4:
                        // select button
                        if (i !== _jsxinput.workingMapping.A && i !== _jsxinput.workingMapping.B && i !== _jsxinput.workingMapping.X && i !== _jsxinput.workingMapping.Y) {
                            _jsxinput.workingMapping.select = i;
                            
                            _jsxinput.mappingStage = _jsxinput.mappingStage + 1;
                            _jsxinput.unhighlightInputs();
                            _jsxinput.highlightInput("divStartButton");
                            _jsxinput.notify(_jsxinput.buttonMappingMessages[_jsxinput.mappingStage]);
                        }
                        break;

                        
                    case 5:
                        // start button
                        if (i !==  _jsxinput.workingMapping.A && i !==  _jsxinput.workingMapping.B && i !==  _jsxinput.workingMapping.X && i !==  _jsxinput.workingMapping.Y && i !==  _jsxinput.workingMapping.select) {
                            _jsxinput.workingMapping.start = i;
                           
                           _jsxinput.mappingStage = _jsxinput.mappingStage + 1;
                           _jsxinput.unhighlightInputs();
                           _jsxinput.highlightInput("divL3");
                           _jsxinput.notify(_jsxinput.buttonMappingMessages[_jsxinput.mappingStage]);

                       }
                       break;

                       /*
                       L2 is now being handled during separate shoulder button mapping sequence.
                        // (L2)
                        if (i !== _jsxinput.workingMapping.A && i !== _jsxinput.workingMapping.B && i !== _jsxinput.workingMapping.X && i !== _jsxinput.workingMapping.Y && i !== _jsxinput.workingMapping.L1) {
                            _jsxinput.workingMapping.L2 = i;
                            
                            _jsxinput.mappingStage = _jsxinput.mappingStage + 1;
                            _jsxinput.unhighlightInputs();
                            _jsxinput.highlightInput("divR1");
                            _jsxinput.notify(_jsxinput.buttonMappingMessages[_jsxinput.mappingStage]);
                        }
                        break;
                        */
                    case 6:
                        // L3
                        
                        if (i !==  _jsxinput.workingMapping.A && i !==  _jsxinput.workingMapping.B && i !==  _jsxinput.workingMapping.X && i !==  _jsxinput.workingMapping.Y && i !==  _jsxinput.workingMapping.select && i !==  _jsxinput.workingMapping.start) {
                            _jsxinput.workingMapping.L3 = i;
                           
                           _jsxinput.mappingStage = _jsxinput.mappingStage + 1;
                           _jsxinput.unhighlightInputs();
                           _jsxinput.highlightInput("divR3");
                           _jsxinput.notify(_jsxinput.buttonMappingMessages[_jsxinput.mappingStage]);
                       }
                       break;


                    case 7:
                        // R3
                        if (i !==  _jsxinput.workingMapping.A && i !==  _jsxinput.workingMapping.B && i !==  _jsxinput.workingMapping.X && i !==  _jsxinput.workingMapping.Y && i !==  _jsxinput.workingMapping.select && i !==  _jsxinput.workingMapping.start && i !==  _jsxinput.workingMapping.L3) {
                            _jsxinput.workingMapping.R3 = i;
                           
                           _jsxinput.mappingStage = _jsxinput.mappingStage + 1;
                           _jsxinput.unhighlightInputs();
                           _jsxinput.highlightInput("divL1");
                           _jsxinput.notify(_jsxinput.buttonMappingMessages[_jsxinput.mappingStage]);
                       }
                       break;   
                    

                       /*
                        // (R2) button
                        R2 is now being handled during separate shoulder button mapping sequence.
                        if (i !== _jsxinput.workingMapping.A && i !== _jsxinput.workingMapping.B && i !== _jsxinput.workingMapping.X && i !== _jsxinput.workingMapping.Y && i !== _jsxinput.workingMapping.L1 && i !== _jsxinput.workingMapping.L2 && i !== _jsxinput.workingMapping.R1) {
                            _jsxinput.workingMapping.R2 = i;
                            
                            _jsxinput.mappingStage = _jsxinput.mappingStage + 1;
                            _jsxinput.unhighlightInputs();
                            _jsxinput.highlightInput("divSelectButton");
                            _jsxinput.notify(_jsxinput.buttonMappingMessages[_jsxinput.mappingStage]);

                        }
                        break;
                        */
                    case 8:
                        // (L1) button
                        if (i !==  _jsxinput.workingMapping.A && i !==  _jsxinput.workingMapping.B && i !==  _jsxinput.workingMapping.X && i !==  _jsxinput.workingMapping.Y && i !==  _jsxinput.workingMapping.select && i !==  _jsxinput.workingMapping.start && i !==  _jsxinput.workingMapping.L3 && i !==  _jsxinput.workingMapping.R3) {
                            _jsxinput.workingMapping.L1 = i;
                            
                            _jsxinput.mappingStage = _jsxinput.mappingStage + 1;
                            _jsxinput.unhighlightInputs();
                            _jsxinput.highlightInput("divR1");
                            _jsxinput.notify(_jsxinput.buttonMappingMessages[_jsxinput.mappingStage]);
                        }
                        break;
                    case 9:
                        // (R1) button
                        if (i !==  _jsxinput.workingMapping.A && i !==  _jsxinput.workingMapping.B && i !==  _jsxinput.workingMapping.X && i !==  _jsxinput.workingMapping.Y && i !==  _jsxinput.workingMapping.select && i !==  _jsxinput.workingMapping.start && i !==  _jsxinput.workingMapping.L3 && i !==  _jsxinput.workingMapping.R3 && i !==  _jsxinput.workingMapping.L1) {
                            _jsxinput.workingMapping.R1 = i;
                            
                            _jsxinput.mappingStage = _jsxinput.mappingStage + 1;
                            _jsxinput.unhighlightInputs();
                            
                            // move to shoulder mapping stage for analog triggers.
                            _jsxinput.highlightInput("divL2");
                            
                            
                            _jsxinput.boolBtnMapping = false;
                            _jsxinput.boolShoulderMapping = true;
                            _jsxinput.mappingStage = 0; // reset for shoulder mapping.
                            _jsxinput.notify(_jsxinput.shoulderMappingMessages[_jsxinput.mappingStage]);
                            
                        }
                        break;
                        
                    
                    default:
                        break;


                }

                //clearInterval(intervalMapping);



            } else {
                // check for analog buttons. may not be necessary since they appear to also have a pressed state.
                if (controller.buttons[i].value > 0) {
                    // analog button pressed

                } else {
                    // pressed is false and value is 0 or less. no action on this button.

                }
            }
        }
    }
    else
    {
        if (_jsxinput.boolShoulderMapping === true)
        {
            let entryShoulderMapStage = _jsxinput.mappingStage;
			if (_jsxinput.workingMapping.rudderShoulders === false) // adding this check to allow for sniffing out rudderShoulders early for sony controllers based on vendor ID.
            {
			
            	for (i = 0; i < controller.buttons.length; i++)
            	{
                	// for each button on the controller, check if it's pressed
	
                	if (controller.buttons[i].pressed === true) {
                    	// digital button pressed
                    	
	
                    	// no need for a switch since shoulder mapping only has two stages.
	
                    	if (_jsxinput.mappingStage === 0)
                    	{
                        	// L2 mapping stage
                        	// check if button has been mapped during previous "only buttons" mapping stage
                        	if (i !==  _jsxinput.workingMapping.A && i !==  _jsxinput.workingMapping.B && i !==  _jsxinput.workingMapping.X && i !==  _jsxinput.workingMapping.Y && i !==  _jsxinput.workingMapping.select && i !==  _jsxinput.workingMapping.start && i !==  _jsxinput.workingMapping.L3 && i !==  _jsxinput.workingMapping.R3 && i !==  _jsxinput.workingMapping.L1 && i !==  _jsxinput.workingMapping.R1)
                        	{
                            	_jsxinput.workingMapping.L2 = i;
                            	
                            	_jsxinput.mappingStage = _jsxinput.mappingStage + 1;
                            	_jsxinput.unhighlightInputs();
                            	_jsxinput.highlightInput("divR2");
                            	_jsxinput.notify(_jsxinput.shoulderMappingMessages[_jsxinput.mappingStage]);
                        	}
                    	}
                    	else
                    	{
                        	// R2 mapping
                        	// check if button has been mapped during previous "only buttons" mapping stage OR if button has been mapped to L2.
                        	if (i !==  _jsxinput.workingMapping.A && i !==  _jsxinput.workingMapping.B && i !==  _jsxinput.workingMapping.X && i !==  _jsxinput.workingMapping.Y && i !==  _jsxinput.workingMapping.select && i !==  _jsxinput.workingMapping.start && i !==  _jsxinput.workingMapping.L3 && i !==  _jsxinput.workingMapping.R3 && i !==  _jsxinput.workingMapping.L1 && i !==  _jsxinput.workingMapping.R1 && i !==  _jsxinput.workingMapping.L2)
                        	{
                            	_jsxinput.workingMapping.R2 = i;
                            	
	
	
	
                            	_jsxinput.mappingStage = 0;
                            	_jsxinput.unhighlightInputs();
                            	_jsxinput.highlightInput("divDpadDown");
                            	_jsxinput.notify(_jsxinput.dpadMappingMessages[_jsxinput.mappingStage]);
                            	_jsxinput.boolShoulderMapping = false;
                            	_jsxinput.boolDpadMapping = true;
                        	}
                    	}
	
	
                	}
                	else
                	{
                    	// check for analog buttons. may not be necessary since they appear to also have a pressed state.
                    	if (controller.buttons[i].value > 0) {
                        	// analog button pressed
    	
                    	} else {
                        	// pressed is false and value is 0 or less. no action on this button.
    	
                    	}
                	}
                	
            	} // end buttons "for loop"
            }

            // if shoulder button mapping was not progressed by button check, check axes for rudder style shoulder input.
            if (entryShoulderMapStage === _jsxinput.mappingStage)
            {
                // check against axes.
                for (i = 0; i < controller.axes.length; i++)
                {
                    //if (Math.abs(controller.axes[i]) > 0.5) // this may not be ideal. some rudders run 0-1. others run -1-1. think on it...
                    /*
                       -1  -0.8  -0.6  -0.4  -0.2    0    0.2   0.4   0.6   0.8   1
                        +----------------------------+----------------------------+
                        0   0.1   0.2   0.3   0.4   0.5   0.6   0.7   0.8   0.9   1
                        
                    */  
                    // removing the absolute value lets us detect which scale is presented.
                    
                    if (controller.axes[i] === 1)
                    {
                        // rewriting after failed approach
                        // now assuming intelligent user who will press the instructed button.
                        // this detects firefox's "axis" shoulder triggers when fully depressed.
                        if (_jsxinput.mappingStage === 0)
                        {
                            // map r1 here
                            _jsxinput.workingMapping.rudderShoulders = true;
                            _jsxinput.workingMapping.translateRudders = true; // this is set here to enable mapping the axis during jspad.update();
                            _jsxinput.workingMapping.L2 = i;
                            
                            _jsxinput.mappingStage = _jsxinput.mappingStage + 1;
                            _jsxinput.unhighlightInputs();
                            _jsxinput.highlightInput("divR2");
                            _jsxinput.notify(_jsxinput.shoulderMappingMessages[_jsxinput.mappingStage]);
                        
                        }
                        else
                        {
                            // map r2 here. then move to dpad mapping sequence
                            // but first, check to make sure L2 is also an axis. for the author's sanity.
                            if (_jsxinput.workingMapping.rudderShoulders === true)
                            {
                                if (_jsxinput.workingMapping.L2 !== i)
                                {
                                    // also check to make sure axis is not already mapped to L2.
                                    _jsxinput.workingMapping.R2 = i;
                                    
                                    _jsxinput.mappingStage = 0;
                                    _jsxinput.unhighlightInputs();
                                    _jsxinput.highlightInput("divDpadDown");
                                    _jsxinput.notify(_jsxinput.dpadMappingMessages[_jsxinput.mappingStage]);
                                    _jsxinput.boolShoulderMapping = false;
                                    _jsxinput.boolDpadMapping = true;
                                }
                                
                            }
                            
                            
                            
                        }


                    }

                    
                    
                }
            }

        }
        else
        {
            if (_jsxinput.boolDpadMapping === true)
            {
                if (_jsxinput.workingMapping.firefoxDS5hack === false)
                {
                    // normal dpad mapping for everything except sony dualsense 5 controller under firefox on windows

                    let entryDpadMapStage = _jsxinput.mappingStage;

                    if (_jsxinput.workingMapping.axisDpad === false)
                    {
                        // .axisDpad is false by default and set true when the user first maps an axis to a dpad
                        // at that point we can stop checking buttons.

                        
                            switch (_jsxinput.mappingStage)
                            {
                                // #TODO: Refactor this to avoid repeating the outer 2 "if"s in each case.
                                case 0:
                                    for (i = 0; i < controller.buttons.length; i++)
                                    {
                                        if (controller.buttons[i].pressed === true)
                                        {
                                            if (i !==  _jsxinput.workingMapping.A && i !==  _jsxinput.workingMapping.B && i !==  _jsxinput.workingMapping.X && i !==  _jsxinput.workingMapping.Y && i !==  _jsxinput.workingMapping.select && i !==  _jsxinput.workingMapping.start && i !==  _jsxinput.workingMapping.L3 && i !==  _jsxinput.workingMapping.R3 && i !==  _jsxinput.workingMapping.L1 && i !==  _jsxinput.workingMapping.R1)
                                            {
                                                // input is not previously mapped to a button other than L2 / R2
                                                if (_jsxinput.workingMapping.rudderShoulders === true || (i !==  _jsxinput.workingMapping.L2 && i !==  _jsxinput.workingMapping.R2))
                                                {
                                                    // L2 / R2 are each either mapped to an axis or to button inputs other than the one with index i

                                                    
                                                    _jsxinput.workingMapping.dpadDown = i;
                                                    _jsxinput.mappingStage = _jsxinput.mappingStage + 1;
                                                    _jsxinput.unhighlightInputs();
                                                    _jsxinput.highlightInput("divDpadUp");
                                                    _jsxinput.notify(_jsxinput.dpadMappingMessages[_jsxinput.mappingStage]);
                                                    
                                                    break;
                                                }
                                            }
                                        }
                                        else
                                        {
                                            // check for analog buttons. may not be necessary since they appear to also have a pressed state.
                                            if (controller.buttons[i].value > 0) {
                                                // analog button pressed
                            
                                            } else {
                                                // pressed is false and value is 0 or less. no action on this button.
                            
                                            }
                                        }
                                    }
                                    break;    

                                case 1:
                                    for (i = 0; i < controller.buttons.length; i++)
                                    {
                                        if (controller.buttons[i].pressed === true)
                                        {

                                            if (i !==  _jsxinput.workingMapping.A && i !==  _jsxinput.workingMapping.B && i !==  _jsxinput.workingMapping.X && i !==  _jsxinput.workingMapping.Y && i !==  _jsxinput.workingMapping.select && i !==  _jsxinput.workingMapping.start && i !==  _jsxinput.workingMapping.L3 && i !==  _jsxinput.workingMapping.R3 && i !==  _jsxinput.workingMapping.L1 && i !==  _jsxinput.workingMapping.R1 && i !==  _jsxinput.workingMapping.dpadDown)
                                            {
                                                // input is not previously mapped to a button other than L2 / R2


                                                if (_jsxinput.workingMapping.rudderShoulders === true || (i !==  _jsxinput.workingMapping.L2 && i !==  _jsxinput.workingMapping.R2))
                                                {
                                                    // L2 / R2 are each either mapped to an axis or to button inputs other than the one with index i
                                                    // additional check here (not done in case 0 above) to ensure that UP is not bound to this input.
                                                    if (_jsxinput.workingMapping.dpadUp !== i)
                                                    {
                                                        _jsxinput.workingMapping.dpadUp = i;
                                                        _jsxinput.mappingStage = _jsxinput.mappingStage + 1;
                                                        _jsxinput.unhighlightInputs();
                                                        _jsxinput.highlightInput("divDpadRight");
                                                        _jsxinput.notify(_jsxinput.dpadMappingMessages[_jsxinput.mappingStage]);
                                                        
                                                        break;        
                                                    }    

                                                }
                                            
                                            }
                                        }
                                        else
                                        {
                                            // check for analog buttons. may not be necessary since they appear to also have a pressed state.
                                            if (controller.buttons[i].value > 0) {
                                                // analog button pressed
                            
                                            } else {
                                                // pressed is false and value is 0 or less. no action on this button.
                            
                                            }
                                        }
                                    }
                                    break;
                                    
                                case 2:
                                    for (i = 0; i < controller.buttons.length; i++)
                                    {
                                        if (controller.buttons[i].pressed === true)
                                        {

                                            if (i !==  _jsxinput.workingMapping.A && i !==  _jsxinput.workingMapping.B && i !==  _jsxinput.workingMapping.X && i !==  _jsxinput.workingMapping.Y && i !==  _jsxinput.workingMapping.select && i !==  _jsxinput.workingMapping.start && i !==  _jsxinput.workingMapping.L3 && i !==  _jsxinput.workingMapping.R3 && i !==  _jsxinput.workingMapping.L1 && i !==  _jsxinput.workingMapping.R1 && i !==  _jsxinput.workingMapping.dpadDown && i !==  _jsxinput.workingMapping.dpadUp)
                                            {
                                                // input is not previously mapped to a button other than L2 / R2
                                                if (_jsxinput.workingMapping.rudderShoulders === true || (i !==  _jsxinput.workingMapping.L2 && i !==  _jsxinput.workingMapping.R2))
                                                {
                                                    // L2 / R2 are each either mapped to an axis or to button inputs other than the one with index i
                                                    // additional check here (not done in case 0 above) to ensure that *neither* UP or DOWN are bound to this input.
                                                    if (_jsxinput.workingMapping.dpadUp !== i && _jsxinput.workingMapping.dpadDown !== i)
                                                    {
                                                    
                                                        _jsxinput.workingMapping.dpadRight = i;
                                                        

                                                        
                                                        _jsxinput.mappingStage = _jsxinput.mappingStage + 1;
                                                        _jsxinput.unhighlightInputs();
                                                        _jsxinput.highlightInput("divDpadLeft");
                                                        _jsxinput.notify(_jsxinput.dpadMappingMessages[_jsxinput.mappingStage]);
                                                        
                                                        break;
                                                        
                                                    }
                                                }
                                            }
                                        }
                                        else
                                        {
                                            // check for analog buttons. may not be necessary since they appear to also have a pressed state.
                                            if (controller.buttons[i].value > 0) {
                                                // analog button pressed
                            
                                            } else {
                                                // pressed is false and value is 0 or less. no action on this button.
                            
                                            }
                                        }
                                    }
                                    break;
                                case 3:
                                    
                                    for (i = 0; i < controller.buttons.length; i++)
                                    {
                                        
                                        if (controller.buttons[i].pressed === true)
                                        {
                                            
                                            if (i !==  _jsxinput.workingMapping.A && i !==  _jsxinput.workingMapping.B && i !==  _jsxinput.workingMapping.X && i !==  _jsxinput.workingMapping.Y && i !==  _jsxinput.workingMapping.select && i !==  _jsxinput.workingMapping.start && i !==  _jsxinput.workingMapping.L3 && i !==  _jsxinput.workingMapping.R3 && i !==  _jsxinput.workingMapping.L1 && i !==  _jsxinput.workingMapping.R1 && i !==  _jsxinput.workingMapping.dpadDown && i !==  _jsxinput.workingMapping.dpadUp && i !==  _jsxinput.workingMapping.dpadRight)
                                            {
                                                

                                                // input is not previously mapped to a button other than L2 / R2
                                                if (_jsxinput.workingMapping.rudderShoulders === true || (i !==  _jsxinput.workingMapping.L2 && i !==  _jsxinput.workingMapping.R2))
                                                {
                                                    // L2 / R2 are each either mapped to an axis or to button inputs other than the one with index i

                                                    
                                                    // additional check here (not done in case 0 above) to ensure that *neither* UP or DOWN or RIGHT are bound to this input.
                                                    if (_jsxinput.workingMapping.dpadUp !== i && _jsxinput.workingMapping.dpadDown !== i && _jsxinput.workingMapping.dpadRight !== i)
                                                    {    
                                                        _jsxinput.workingMapping.dpadLeft = i;
                                                        

                                                        // exit dpad mapping stage
                                                        _jsxinput.mappingStage = 0;
                                                        _jsxinput.unhighlightInputs();
                                                        _jsxinput.highlightInput("divLstickX");
                                                        _jsxinput.notify(_jsxinput.axisMappingMessages[0]);
                                                        //
                                                        _jsxinput.boolDpadMapping = false;
                                                        _jsxinput.boolAxesMapping = true;
                                                        _jsxinput.mappingStage = 0; // reset for axes mapping.
                                                        
                                                        _jsxinput.mappingStage = 0; // reset for axes mapping.
                                                        break;
                                                    }
                                                }
                                            }
                                            
                                        }
                                        else
                                        {
                                            // check for analog buttons. may not be necessary since they appear to also have a pressed state.
                                            if (controller.buttons[i].value > 0) {
                                                // analog button pressed
                            
                                            } else {
                                                // pressed is false and value is 0 or less. no action on this button.
                            
                                            }
                                        }
                                    }
                                    break;
                                default:
                                    break;
                            }
                        


                    }

                    
                    


                    
                    if (entryDpadMapStage === _jsxinput.mappingStage)
                    {
                        // if dpad mapping was not progressed by button check, check axes for dpad input.
                        
                        // write this after you finish checking for buttons above.

                        // i think i finished checking for buttons above. gulp. #2023-09-06

                        // this should only require two steps for axes vs buttons' four step mapping.

                        
                        switch (_jsxinput.mappingStage)
                        {
                            case 0:
                                // map dpad's y-axis by prompting for "down" input.
                                // if axis set "_jsxinput.workingMapping.axisDpad = true"
                                for (i = 0; i < controller.axes.length; i++)
                                {
                                    if (controller.axes[i] === 1)
                                    {
                                        if (_jsxinput.workingMapping.rudderShoulders === false || (_jsxinput.workingMapping.L2 !== i && _jsxinput.workingMapping.R2 !== i))
                                        {
                                            // check against axes possibly mapped to shoulders.
                                            _jsxinput.workingMapping.dpadDown = i;
                                            _jsxinput.workingMapping.axisDpad = true;

                                            // skipping TWO stages here to keep the notifications in sync between button an axis mapping.
                                            _jsxinput.mappingStage = _jsxinput.mappingStage + 2;
                                            _jsxinput.unhighlightInputs();
                                            _jsxinput.highlightInput("divDpadRight");
                                            _jsxinput.notify(_jsxinput.dpadMappingMessages[_jsxinput.mappingStage]);
                                            
                                            break;
                                        }
        
                                    }  
                                }    
                                break;
                            case 1:
                                // map up on dpad
                                // not used for axis mapping but included for readability
                                break;
                            case 2:
                                // map dpad's x-axis by prompting for "right" input
                                // if detected finish dpad mapping and move to analog stick mapping.
                                for (i = 0; i < controller.axes.length; i++)
                                {
                                    if (controller.axes[i] === 1)
                                    {
                                        if (_jsxinput.workingMapping.rudderShoulders === false || (_jsxinput.workingMapping.L2 !== i && _jsxinput.workingMapping.R2 !== i))
                                        {
                                            // check against axes possibly mapped to shoulders.
                                            if (_jsxinput.workingMapping.dpadDown !== i)
                                            {
                                                // check against controller axis mapped to dpad y-axis
                                                
                                                _jsxinput.workingMapping.dpadRight = i;
                                                
                                                
                                                _jsxinput.workingMapping.axisDpad = true;

                                                _jsxinput.mappingStage = 0;
                                                _jsxinput.unhighlightInputs();
                                                _jsxinput.highlightInput("divLstickX");
                                                _jsxinput.notify(_jsxinput.axisMappingMessages[0]);
                                                //
                                                _jsxinput.boolDpadMapping = false;
                                                _jsxinput.boolAxesMapping = true;
                                                _jsxinput.mappingStage = 0; // reset for axes mapping.
                                                break;


                                            }
                                                
                                        }
                                        
                                    }
                                }
                                break;
                            case 3:
                                // map up on dpa to button. not necessary if dpad down was mapped to an axis
                                // not used for axis mapping but included for readability
                                break;
                            default:
                                break;

                        }
                        

                        
                        
                    }
                }
                else
                {
                    // dpad "mapping" for dualsense 5 controllers. set both dpad axes to 9 and advance to joystick axes mapping.
                    _jsxinput.workingMapping.dpadDown = 9
                    _jsxinput.workingMapping.dpadRight = 9;


                    _jsxinput.workingMapping.axisDpad = true;

                    _jsxinput.mappingStage = 0;
                    _jsxinput.unhighlightInputs();
                    _jsxinput.highlightInput("divLstickX");
                    _jsxinput.notify(_jsxinput.axisMappingMessages[0]);

                    _jsxinput.boolDpadMapping = false;
                    _jsxinput.boolAxesMapping = true;
                    _jsxinput.mappingStage = 0; // reset for axes mapping.

                }

                
                
                


            
            }
            else
            {
                if (_jsxinput.boolAxesMapping === true)
                {
                    
                    for (i = 0; i < controller.axes.length; i++)
                    {
                        // ensure this axis is not already mapped to a shoulder trigger or a dpad axis.
                        if (_jsxinput.workingMapping.rudderShoulders === false || (_jsxinput.workingMapping.L2 !== i && _jsxinput.workingMapping.R2 !== i))
                        {
                            if (_jsxinput.workingMapping.axisDpad === false || (_jsxinput.workingMapping.dpadDown !== i && _jsxinput.workingMapping.dpadRight !== i))
                            {
                                // this axis is not already mapped to a shoulder trigger or a dpad axis.
                                
                                if (Math.abs(controller.axes[i]) > 0.5) // <
                                {
                                    
                                    switch (_jsxinput.mappingStage)
                                    {
                                        case 0:
                                            _jsxinput.workingMapping.Lx = i;
                                            _jsxinput.mappingStage = _jsxinput.mappingStage + 1;
                                            
                                            _jsxinput.unhighlightInputs();
                                            _jsxinput.highlightInput("divLstickY");
                                            _jsxinput.notify(_jsxinput.axisMappingMessages[_jsxinput.mappingStage]);
                                            break;
                                        case 1:
                                            if (i !==  _jsxinput.workingMapping.Lx)
                                            {
                                                _jsxinput.workingMapping.Ly = i;
                                                _jsxinput.mappingStage = _jsxinput.mappingStage + 1;
                                                
                                                _jsxinput.unhighlightInputs();
                                                _jsxinput.highlightInput("divRstickX");
                                                _jsxinput.notify(_jsxinput.axisMappingMessages[_jsxinput.mappingStage]);
                                            }

                                            break;
                                        case 2:
                                            if (i !==  _jsxinput.workingMapping.Lx && i !==  _jsxinput.workingMapping.Ly)
                                            {
                                                _jsxinput.workingMapping.Rx = i;
                                                _jsxinput.mappingStage = _jsxinput.mappingStage + 1;
                                                
                                                _jsxinput.unhighlightInputs();
                                                _jsxinput.highlightInput("divRstickY");
                                                _jsxinput.notify(_jsxinput.axisMappingMessages[_jsxinput.mappingStage]);
                                            }
                                            break;
                                        case 3:
                                            if (i !==  _jsxinput.workingMapping.Lx && i !==  _jsxinput.workingMapping.Ly && i !==  _jsxinput.workingMapping.Rx)
                                            {
                                                _jsxinput.workingMapping.Ry = i;
                                                _jsxinput.mappingStage = _jsxinput.mappingStage + 1;
                                                
                                                _jsxinput.unhighlightInputs();
                                                
                                                _jsxinput.workingMapping.mappingComplete = true;
                                            }
                                            break;
                                        case 4:
                                            clearInterval(_jsxinput.intervalMapping);

                                            _jsxinput.confirmMapping();
                                            _jsxinput.saveMappingsToCookie();
                                            _jsxinput.updateConfigTab();
                                            _jsxinput.cancelMap();
                                            break;
                                        default:
                                            break;
                                    }
                                }
                                
                            }
                        }
                    }
                }
            }
        }
    }


    /*
    rewriting what follows.

    let i = 0;

    if (_jsxinput.boolBtnMapping === true)
    {
        for (i = 0; i < controller.buttons.length; i++)
        {
            if (controller.buttons[i].pressed === true) {
                // digital button pressed
                
                switch (_jsxinput.mappingStage)
                {
                    case 0:
                        // (A) button
                        _jsxinput.workingMapping.A = i;
                        _jsxinput.mappingStage = _jsxinput.mappingStage + 1;
                        
                        _jsxinput.unhighlightInputs();
                        _jsxinput.highlightInput("divFaceBtnRight");
                        _jsxinput.notify(_jsxinput.buttonMappingMessages[_jsxinput.mappingStage]);
                        break;
                    case 1:
                        // (B) button
                        if (i !== _jsxinput.workingMapping.A) {
                            _jsxinput.workingMapping.B = i;
                            _jsxinput.mappingStage = _jsxinput.mappingStage + 1;
                            _jsxinput.unhighlightInputs();
                            _jsxinput.highlightInput("divFaceBtnLeft");
                            _jsxinput.notify(_jsxinput.buttonMappingMessages[_jsxinput.mappingStage]);
                            
                        }
                        break;
                    case 2:
                        // (X) button
                        if (i !== _jsxinput.workingMapping.A && i !== _jsxinput.workingMapping.B) {
                            _jsxinput.workingMapping.X = i;
                            _jsxinput.mappingStage = _jsxinput.mappingStage + 1;
                            _jsxinput.unhighlightInputs();
                            _jsxinput.highlightInput("divFaceBtnTop");
                            _jsxinput.notify(_jsxinput.buttonMappingMessages[_jsxinput.mappingStage]);
                            
                        }
                        break;
                    case 3:
                        // (Y) button
                        if (i !== _jsxinput.workingMapping.A && i !== _jsxinput.workingMapping.B && i !== _jsxinput.workingMapping.X) {
                            _jsxinput.workingMapping.Y = i;
                            
                            _jsxinput.mappingStage = _jsxinput.mappingStage + 1;
                            _jsxinput.unhighlightInputs();
                            _jsxinput.highlightInput("divL1");
                            _jsxinput.notify(_jsxinput.buttonMappingMessages[_jsxinput.mappingStage]);

                        }
                        break;
                    case 4:
                        // (L1) button
                        if (i !== _jsxinput.workingMapping.A && i !== _jsxinput.workingMapping.B && i !== _jsxinput.workingMapping.X && i !== _jsxinput.workingMapping.Y) {
                            _jsxinput.workingMapping.L1 = i;
                            
                            _jsxinput.mappingStage = _jsxinput.mappingStage + 1;
                            _jsxinput.unhighlightInputs();
                            _jsxinput.highlightInput("divL2");
                            _jsxinput.notify(_jsxinput.buttonMappingMessages[_jsxinput.mappingStage]);
                        }
                        break;
                    case 5:
                        // (L2)
                        if (i !== _jsxinput.workingMapping.A && i !== _jsxinput.workingMapping.B && i !== _jsxinput.workingMapping.X && i !== _jsxinput.workingMapping.Y && i !== _jsxinput.workingMapping.L1) {
                            _jsxinput.workingMapping.L2 = i;
                            
                            _jsxinput.mappingStage = _jsxinput.mappingStage + 1;
                            _jsxinput.unhighlightInputs();
                            _jsxinput.highlightInput("divR1");
                            _jsxinput.notify(_jsxinput.buttonMappingMessages[_jsxinput.mappingStage]);
                        }
                        break;
                    case 6:
                        // (R1) button
                        if (i !== _jsxinput.workingMapping.A && i !== _jsxinput.workingMapping.B && i !== _jsxinput.workingMapping.X && i !== _jsxinput.workingMapping.Y && i !== _jsxinput.workingMapping.L1 && i !== _jsxinput.workingMapping.L2) {
                            _jsxinput.workingMapping.R1 = i;
                            
                            _jsxinput.mappingStage = _jsxinput.mappingStage + 1;
                            _jsxinput.unhighlightInputs();
                            _jsxinput.highlightInput("divR2");
                            _jsxinput.notify(_jsxinput.buttonMappingMessages[_jsxinput.mappingStage]);

                        }
                        break;
                    case 7:
                        // (R2) button
                        if (i !== _jsxinput.workingMapping.A && i !== _jsxinput.workingMapping.B && i !== _jsxinput.workingMapping.X && i !== _jsxinput.workingMapping.Y && i !== _jsxinput.workingMapping.L1 && i !== _jsxinput.workingMapping.L2 && i !== _jsxinput.workingMapping.R1) {
                            _jsxinput.workingMapping.R2 = i;
                            
                            _jsxinput.mappingStage = _jsxinput.mappingStage + 1;
                            _jsxinput.unhighlightInputs();
                            _jsxinput.highlightInput("divSelectButton");
                            _jsxinput.notify(_jsxinput.buttonMappingMessages[_jsxinput.mappingStage]);

                        }
                        break;
                    case 8:
                        // select button
                        if (i !== _jsxinput.workingMapping.A && i !== _jsxinput.workingMapping.B && i !== _jsxinput.workingMapping.X && i !== _jsxinput.workingMapping.Y && i !== _jsxinput.workingMapping.L1 && i !== _jsxinput.workingMapping.L2 && i !== _jsxinput.workingMapping.R1 && i !== _jsxinput.workingMapping.R2) {
                            _jsxinput.workingMapping.select = i;
                            
                            _jsxinput.mappingStage = _jsxinput.mappingStage + 1;
                            _jsxinput.unhighlightInputs();
                            _jsxinput.highlightInput("divStartButton");
                            _jsxinput.notify(_jsxinput.buttonMappingMessages[_jsxinput.mappingStage]);
                        }
                        break;
                    case 9:
                        // start button
                        if (i !==  _jsxinput.workingMapping.A && i !==  _jsxinput.workingMapping.B && i !==  _jsxinput.workingMapping.X && i !==  _jsxinput.workingMapping.Y && i !==  _jsxinput.workingMapping.L1 && i !==  _jsxinput.workingMapping.L2 && i !==  _jsxinput.workingMapping.R1 && i !==  _jsxinput.workingMapping.R2 && i !==  _jsxinput.workingMapping.select) {
                             _jsxinput.workingMapping.start = i;
                            
                            _jsxinput.mappingStage = _jsxinput.mappingStage + 1;
                            _jsxinput.unhighlightInputs();
                            _jsxinput.highlightInput("divL3");
                            _jsxinput.notify(_jsxinput.buttonMappingMessages[_jsxinput.mappingStage]);

                        }
                        break;
                    case 10:
                        // L3
                        if (i !==  _jsxinput.workingMapping.A && i !==  _jsxinput.workingMapping.B && i !==  _jsxinput.workingMapping.X && i !==  _jsxinput.workingMapping.Y && i !==  _jsxinput.workingMapping.L1 && i !==  _jsxinput.workingMapping.L2 && i !==  _jsxinput.workingMapping.R1 && i !==  _jsxinput.workingMapping.R2 && i !==  _jsxinput.workingMapping.select && i !==  _jsxinput.workingMapping.start) {
                             _jsxinput.workingMapping.L3 = i;
                            
                            _jsxinput.mappingStage = _jsxinput.mappingStage + 1;
                            _jsxinput.unhighlightInputs();
                            _jsxinput.highlightInput("divR3");
                            _jsxinput.notify(_jsxinput.buttonMappingMessages[_jsxinput.mappingStage]);
                        }
                        break;
                    case 11:
                        // R3
                        if (i !==  _jsxinput.workingMapping.A && i !==  _jsxinput.workingMapping.B && i !==  _jsxinput.workingMapping.X && i !==  _jsxinput.workingMapping.Y && i !==  _jsxinput.workingMapping.L1 && i !==  _jsxinput.workingMapping.L2 && i !==  _jsxinput.workingMapping.R1 && i !==  _jsxinput.workingMapping.R2 && i !==  _jsxinput.workingMapping.select && i !==  _jsxinput.workingMapping.start && i !==  _jsxinput.workingMapping.L3) {
                             _jsxinput.workingMapping.R3 = i;
                            
                            _jsxinput.mappingStage = _jsxinput.mappingStage + 1;
                            _jsxinput.unhighlightInputs();
                            _jsxinput.highlightInput("divDpadUp");
                            _jsxinput.notify(_jsxinput.buttonMappingMessages[_jsxinput.mappingStage]);
                        }
                        break;
                    case 12:
                        // dpad up
                        if (i !==  _jsxinput.workingMapping.A && i !==  _jsxinput.workingMapping.B && i !==  _jsxinput.workingMapping.X && i !==  _jsxinput.workingMapping.Y && i !==  _jsxinput.workingMapping.L1 && i !==  _jsxinput.workingMapping.L2 && i !==  _jsxinput.workingMapping.R1 && i !==  _jsxinput.workingMapping.R2 && i !==  _jsxinput.workingMapping.select && i !==  _jsxinput.workingMapping.start && i !==  _jsxinput.workingMapping.L3 && i !==  _jsxinput.workingMapping.R3) {
                             _jsxinput.workingMapping.dpadUp = i;
                            
                            _jsxinput.mappingStage = _jsxinput.mappingStage + 1;
                            _jsxinput.unhighlightInputs();
                            _jsxinput.highlightInput("divDpadDown");
                            _jsxinput.notify(_jsxinput.buttonMappingMessages[_jsxinput.mappingStage]);
                        }
                        break;
                    case 13:
                        // dpad down
                        if (i !==  _jsxinput.workingMapping.A && i !==  _jsxinput.workingMapping.B && i !==  _jsxinput.workingMapping.X && i !==  _jsxinput.workingMapping.Y && i !==  _jsxinput.workingMapping.L1 && i !==  _jsxinput.workingMapping.L2 && i !==  _jsxinput.workingMapping.R1 && i !==  _jsxinput.workingMapping.R2 && i !==  _jsxinput.workingMapping.select && i !==  _jsxinput.workingMapping.start && i !==  _jsxinput.workingMapping.L3 && i !==  _jsxinput.workingMapping.R3 && i !==  _jsxinput.workingMapping.dpadUp) {
                             _jsxinput.workingMapping.dpadDown = i;
                            
                            _jsxinput.mappingStage = _jsxinput.mappingStage + 1;
                            _jsxinput.unhighlightInputs();
                            _jsxinput.highlightInput("divDpadLeft");
                            _jsxinput.notify(_jsxinput.buttonMappingMessages[_jsxinput.mappingStage]);
                        }
                        break;
                    case 14:
                        // dpad left
                        if (i !==  _jsxinput.workingMapping.A && i !==  _jsxinput.workingMapping.B && i !==  _jsxinput.workingMapping.X && i !==  _jsxinput.workingMapping.Y && i !==  _jsxinput.workingMapping.L1 && i !==  _jsxinput.workingMapping.L2 && i !==  _jsxinput.workingMapping.R1 && i !==  _jsxinput.workingMapping.R2 && i !==  _jsxinput.workingMapping.select && i !==  _jsxinput.workingMapping.start && i !==  _jsxinput.workingMapping.L3 && i !==  _jsxinput.workingMapping.R3 && i !==  _jsxinput.workingMapping.dpadUp && i !==  _jsxinput.workingMapping.dpadDown) {
                             _jsxinput.workingMapping.dpadLeft = i;
                            
                            _jsxinput.mappingStage = _jsxinput.mappingStage + 1;
                            _jsxinput.unhighlightInputs();
                            _jsxinput.highlightInput("divDpadRight");
                            _jsxinput.notify(_jsxinput.buttonMappingMessages[_jsxinput.mappingStage]);
                        }
                        break;
                    case 15:
                        // dpad right
                        if (i !==  _jsxinput.workingMapping.A && i !==  _jsxinput.workingMapping.B && i !==  _jsxinput.workingMapping.X && i !==  _jsxinput.workingMapping.Y && i !==  _jsxinput.workingMapping.L1 && i !==  _jsxinput.workingMapping.L2 && i !==  _jsxinput.workingMapping.R1 && i !==  _jsxinput.workingMapping.R2 && i !==  _jsxinput.workingMapping.select && i !==  _jsxinput.workingMapping.start && i !==  _jsxinput.workingMapping.L3 && i !==  _jsxinput.workingMapping.R3 && i !==  _jsxinput.workingMapping.dpadUp && i !==  _jsxinput.workingMapping.dpadDown && i !==  _jsxinput.workingMapping.dpadLeft) {
                             _jsxinput.workingMapping.dpadRight = i;
                            
                            _jsxinput.mappingStage = _jsxinput.mappingStage + 1;
                            _jsxinput.unhighlightInputs();
                            _jsxinput.highlightInput("divLstickX");
                            _jsxinput.notify(_jsxinput.axisMappingMessages[0]);
                            //
                            _jsxinput.boolBtnMapping = false;
                            _jsxinput.boolAxesMapping = true;
                            _jsxinput.mappingStage = 0; // reset for axes mapping.

                        }

                        // start axes mapping interval here.
                        break;
                    default:
                        break;


                }

                //clearInterval(intervalMapping);



            } else {
                // check for analog buttons. may not be necessary since they appear to also have a pressed state.
                if (controller.buttons[i].value > 0) {
                    // analog button pressed

                } else {
                    // pressed is false and value is 0 or less. no action on this button.

                }
            }
        }

    }
    else
    {

        if (_jsxinput.boolAxesMapping === true)
        {
            
            for (i = 0; i < controller.axes.length; i++)
            {
                if (Math.abs(controller.axes[i]) > 0.5)
                {
                    
                    switch (_jsxinput.mappingStage)
                    {
                        case 0:
                            _jsxinput.workingMapping.Lx = i;
                            _jsxinput.mappingStage = _jsxinput.mappingStage + 1;
                            
                            _jsxinput.unhighlightInputs();
                            _jsxinput.highlightInput("divLstickY");
                            _jsxinput.notify(_jsxinput.axisMappingMessages[_jsxinput.mappingStage]);
                            break;
                        case 1:
                            if (i !==  _jsxinput.workingMapping.Lx)
                            {
                                _jsxinput.workingMapping.Ly = i;
                                _jsxinput.mappingStage = _jsxinput.mappingStage + 1;
                                
                                _jsxinput.unhighlightInputs();
                                _jsxinput.highlightInput("divRstickX");
                                _jsxinput.notify(_jsxinput.axisMappingMessages[_jsxinput.mappingStage]);
                            }

                            break;
                        case 2:
                            if (i !==  _jsxinput.workingMapping.Lx && i !==  _jsxinput.workingMapping.Ly)
                            {
                                _jsxinput.workingMapping.Rx = i;
                                _jsxinput.mappingStage = _jsxinput.mappingStage + 1;
                                
                                _jsxinput.unhighlightInputs();
                                _jsxinput.highlightInput("divRstickY");
                                _jsxinput.notify(_jsxinput.axisMappingMessages[_jsxinput.mappingStage]);
                            }
                            break;
                        case 3:
                            if (i !==  _jsxinput.workingMapping.Lx && i !==  _jsxinput.workingMapping.Ly && i !==  _jsxinput.workingMapping.Rx)
                            {
                                _jsxinput.workingMapping.Ry = i;
                                _jsxinput.mappingStage = _jsxinput.mappingStage + 1;
                                
                                _jsxinput.unhighlightInputs();
                                
                                _jsxinput.workingMapping.mappingComplete = true;
                            }
                            break;
                        case 4:
                            clearInterval(_jsxinput.intervalMapping);

                            _jsxinput.confirmMapping();
                            _jsxinput.saveMappingsToCookie();
                            _jsxinput.updateConfigTab();
                            _jsxinput.cancelMap();
                            break;
                        default:
                            break;
                    }

                }
            }
        }

    }
    */
    
};


_jsxinput.confirmMapping = function () {
    
    // called when working mapping is completed.
    // copies  _jsxinput.workingMapping to the mappings array
    // and updates the display.

    // first check for existing mapping(s).
    let mapped = false;
    let i;
    for (i = 0; i < _jsxinput.jsxinputMappings.length; i++)
    {
        if (_jsxinput.jsxinputMappings[i] !== null && _jsxinput.jsxinputMappings[i] !== undefined)
        {
            
            
            if (_jsxinput.strCmp(_jsxinput.jsxinputMappings[i].controllerName,  _jsxinput.workingMapping.controllerName) === 0)
            {
                _jsxinput.jsxinputMappings[i] =  _jsxinput.workingMapping.copy();
                
                mapped = true;
                break;
            }
        }
    }

    // if there is not an existing mapping to update, just use the first empty slot.
    if (mapped === false)
    {
        for (i = 0; i < _jsxinput.jsxinputMappings.length; i++)
        {
            if (_jsxinput.jsxinputMappings[i] === null || _jsxinput.jsxinputMappings[i] === undefined)
            {
                _jsxinput.jsxinputMappings[i] =  _jsxinput.workingMapping.copy();
                
                mapped = true;
                break;
            }
        }
    }

    if (mapped === false)
    {
        
    }
    else
    {
        // step through the controllers array.
        // for each controller with an ID matching the controller name of the new mapping,
        // create a JS pad at the corresponding index.

        // mappings are assigned in the JSpad constructor.
        for (i = 0; i <= navigator.getGamepads().length; i++)
        {
            if (navigator.getGamepads()[i] !== null && navigator.getGamepads()[i] !== undefined)
            {
                if (_jsxinput.strCmp(navigator.getGamepads()[i].id,  _jsxinput.workingMapping.controllerName) === 0)
                {
                    _jsxinput.JSpads[i] = new _jsxinput.JSpad(i);
                    _jsxinput.JSpads[i].update();
                }
            }
        }

        // should save mappings to cookie here.


        _jsxinput.o("selectMapStatusIcon").innerHTML = "&#10004;";
        _jsxinput.o("selectMapStatusMessage").innerHTML = "<em>This controller is already mapped.</em>";


    }
    return mapped;

};



_jsxinput.cancelMap = function () {
_jsxinput.o("notification").style.display = "none";

_jsxinput.unhighlightInputs();
_jsxinput.o("leftPanelOverlay").style.display = "none";


_jsxinput.o("selectMapInput").disabled = false;
_jsxinput.o("btnFullMap").disabled = false;

if (_jsxinput.intervalMapping !== -1)
{
clearInterval(_jsxinput.intervalMapping);
_jsxinput.intervalMapping = -1;
}
};



_jsxinput.notify = function (message) {
_jsxinput.o("leftPanelOverlay").style.display = "inline";
_jsxinput.o("noteContent").textContent = message;
_jsxinput.o("notification").style.display = "inline";
};



_jsxinput.getControllerIndexFromID = function (id) {
    
    // accepts a gamepad.id string.
    // returns the index of the lowest element of navigator.getGamepads() with a matching ID.
    // necessary because chrome doesn't assign the lowest element.
    let returned = false;


    if (id !== null && id !== undefined) {


        let aPads = navigator.getGamepads();

        for (let i = 0; i < aPads.length; i++) {
            
            if (aPads[i] !== null) {
                if (_jsxinput.strCmp(id, aPads[i].id) === 0) {
                    returned = i;
                    break;
                }
            }
        }
    }
    return returned;
};

_jsxinput.getFirstEmptyJSslot = function ()
{
    // returns the value of the first empty null or undefined element in _jsxinput.JSpads array
    // returns false if no elements are null or undefined
    let returned = false;


    for (let i = 0; i < _jsxinput.JSpads.length; i++)
    {
        if (_jsxinput.JSpads[i] === null ||_jsxinput.JSpads[i] === undefined)
        {
            returned = i;
            break;
        }
    }
    return returned;
};



_jsxinput.getJSpadIndexFromGamepadIndex = function(index)
{
    //

    // accepts an index of a device in the array returned by navigator.getGamePads()
    // returns the index of the JSpad that is mapped, or -1 if no JSpad is mapped to the device.
    let returned = -1;


    for (let j = 0; j < _jsxinput.JSpads.length; j++)
    {
        if (_jsxinput.JSpads[j] !== null && _jsxinput.JSpads[j] !== undefined)
        {
            if(_jsxinput.JSpads[j].gamePadIndex === index)
            {
                returned = j;
                break;

            }
        }
    }

    return returned;
};

_jsxinput.getMappingIndexFromDeviceID = function(id)
{
    // this returns the index of the mapping that matches the passed controller id,
    // or  -1 if no mapping matches the passed controller id

    let returned = -1;

    for (let i = 0; i < _jsxinput.jsxinputMappings.length; i++)
    {
        if (_jsxinput.strCmp(id, _jsxinput.jsxinputMappings[i].controllerName) === 0)
        {
            returned = i;
            break;
        }
    }

    return returned;

};


/*
    below are functions related to gamepad event management.
    they are to allow host applications to implement their own gamepad connect / disconnect events
    without conflicting with the events used by JSXinput during the mapping process:

    // these two functions are to be used to add / remove gamepad connect events.

    _jsxinput.addHostConnectpadEventListener(functionName)

    _jsxinput.removeHostConnectpadEventListener(functionName)


    // these two functions are to be used to add / remove gamepad disconnect events.

    _jsxinput.addHostDisconnectpadEventListener(functionName)

    _jsxinput.removeHostDisconnectpadEventListener(functionName)


    // these two functions are used internally by the above functions to manage the internal record of host gamepad connect / disconnect events.
    // please do not call them. :)

    _jsxinput.removeHostConnectEventRecord(functionName)

    _jsxinput.removeHostDisconnectEventRecord(functionName)

 */







_jsxinput.addHostConnectpadEventListener = function (functionName)
{
    // this function is used to add gamepad connect events in a way that
    // prevents them from conflicting with those used by JSXinput during controller mapping
    // instead of using:
    // window.addEventListener("myEventFunction", connectpad);
    // call:
    // _jsxinput.addHostConnectpadEventListener("myEventFunction");
    // this is necessary because javascript provides no means of traversing added events,
    // so they must be tracked manually.
    
    // add event to window
    window.addEventListener("gamepadconnected", functionName);
    // remove record of event in case it already exists.
    _jsxinput.removeHostConnectEventRecord(functionName);
    // add record of event.
    _jsxinput.hostGamepadConnectEvents[_jsxinput.hostGamepadConnectEvents.length] = functionName;


};

_jsxinput.removeHostConnectpadEventListener = function (functionName)
{
    // this function is used to remove gamepad connect events in a way that
    // prevents them from conflicting with those used by JSXinput during controller mapping
    // instead of using:
    // window.removeEventListener("myEventFunction", connectpad);
    // call:
    // _jsxinput.removeHostConnectpadEventListener("myEventFunction");
    // this is necessary because javascript provides no means of traversing added events,
    // so they must be tracked manually.
    
    // remove event from window
    window.removeEventListener("gamepadconnected", functionName);
    // remove record of event.
    _jsxinput.removeHostConnectEventRecord(functionName);
};



_jsxinput.addHostDisconnectpadEventListener = function (functionName)
{
    // this function is used to add gamepad disconnect events in a way that
    // prevents them from conflicting with those used by JSXinput during controller mapping
    // instead of using:
    // window.addEventListener("myEventFunction", disconnectpad);
    // call:
    // _jsxinput.addHostDisconnectpadEventListener("myEventFunction");
    // this is necessary because javascript provides no means of traversing added events.
    // so they must be tracked manually.

    
    _jsxinput.hostGamepadDisconnectEvents[_jsxinput.hostGamepadDisconnectEvents.length] = functionName;

    // add event to window
    window.addEventListener("gamepaddisconnected", functionName);
    // remove record of event in case it already exists.
    _jsxinput.removeHostDisconnectEventRecord(functionName);
    // add record of event.
    _jsxinput.hostGamepadDisconnectEvents[_jsxinput.hostGamepadDisconnectEvents.length] = functionName;
};

_jsxinput.removeHostDisconnectpadEventListener = function (functionName)
{
    // this function is used to remove gamepad disconnect events in a way that
    // prevents them from conflicting with those used by JSXinput during controller mapping
    // instead of using:
    // window.removeEventListener("myEventFunction", disconnectpad);
    // call:
    // _jsxinput.removeHostDisconnectpadEventListener("myEventFunction");
    // this is necessary because javascript provides no means of traversing added events.
    // so they must be tracked manually.

    
    // remove event from window
    window.removeEventListener("gamepaddisconnected", functionName);
    // remove record of event.
    _jsxinput.removeHostDisconnectEventRecord(functionName);



};


_jsxinput.removeHostConnectEventRecord = function (functionName)
{
    var eventIndex = -1;
    var i;

    for (i = 0; i < _jsxinput.hostGamepadConnectEvents.length; i++)
    {
        if (_jsxinput.strCmp("functionName", _jsxinput.hostGamepadConnectEvents[i]) === 0)
        {
            eventIndex = i;
            break;
        }
    }

    if (eventIndex !== -1)
    {
        _jsxinput.hostGamepadConnectEvents.splice(eventIndex, 1);
    }
};

_jsxinput.removeHostDisconnectEventRecord = function (functionName)
{
    var eventIndex = -1;
    var i;

    for (i = 0; i < _jsxinput.hostGamepadDisconnectEvents.length; i++)
    {
        if (_jsxinput.strCmp("functionName", _jsxinput.hostGamepadDisconnectEvents[i]) === 0)
        {
            eventIndex = i;
            break;
        }
    }

    if (eventIndex !== -1)
    {
        _jsxinput.hostGamepadDisconnectEvents.splice(eventIndex, 1);
    }
};




_jsxinput.highlightInput = function (id) {
    

    _jsxinput.o(id).classList.add("radialGradient");
    //_jsxinput.o(id).style.backgroundColor = "red";
};


_jsxinput.unhighlightInputs = function () {
    let inputElements = document.getElementsByClassName("controlElement");

    for (let i = 0; i < inputElements.length; i++) {
    // remove highlight class from each input element whether or not they are present.
    inputElements.item(i).classList.remove("radialGradient");
    inputElements.item(i).classList.remove("horizontalGradient");
    }
};




_jsxinput.point2d = function () {

    // convenience class for axis states. literally infinite other uses around the home.
    /*
    var returned = {
        x: 0,
        y: 0
    };
    */


    //return returned;

    this.x = 0;
    this.y = 0;

};

// JSpad object

//function JSpad(mappedPadIndex) {
_jsxinput.JSpad = function(mappedPadIndex) {
    

    // pass an index.
    // pulls the info from the navigator.gamepad array using the index.
    this.gamePadIndex = mappedPadIndex;
    this.updateTimestamp = -1;


    /*
    if(navigator.userAgent.indexOf("Chrome") !== -1 )
    {
    // REMOVING HACK
    _jsxinput.doChromeStuff = true;
    }

     */

    // necessary to call this before each update in Chrome.

    this.gp = navigator.getGamepads(); // retaining a variable for this rather than creating one each time getGamepads() is called.



    // instead of this assignment, step through the mappings array and assign an appropriate mapping

    let i = 0;
    // this constructor is only called after confirmMapping() so there will always be at least one correct mapping
    for (i = 0; i < _jsxinput.jsxinputMappings.length; i++)
    {
        if (_jsxinput.jsxinputMappings[i] !== null && _jsxinput.jsxinputMappings[i] !== undefined)
        {
            if (_jsxinput.strCmp(this.gp[mappedPadIndex].id,_jsxinput.jsxinputMappings[i].controllerName) === 0)
            {
                this.mapping = _jsxinput.jsxinputMappings[i].copy();
            }
        }

    }








    this.btnCount = this.gp[this.gamePadIndex].buttons.length;
    this.btnStates = new Array(this.btnCount);
    this.btnPrevStates = new Array(this.btnCount);
    this.btnHeldTics = new Array(this.btnCount);
    this.btnHeldTimestamps = new Array(this.btnCount);
    this.btnHeldTimes = new Array(this.btnCount);

    this.dpadTimestamps = new Array(2);
    this.dpadTimestamps[0] = 0; // element 0 is for x axis
    this.dpadTimestamps[1] = 0; // elment 1 is for y axis.

    for (let i = 0; i < this.btnCount; i++) {
    this.btnStates[i] = 0;
    this.btnPrevStates[i] = 0;
    this.btnHeldTics[i] = 0;
    this.btnHeldTimes[i] = 0;
    this.btnHeldTimestamps[i] = 0;
    }


    this.axesCount = this.gp[mappedPadIndex].axes.length;
    this.axesStates = new Array(this.axesCount);
    this.axesPrev = new Array(this.axesCount);
    this.axesHeldTics = new Array(this.axesCount);
    this.axesHeldTime = new Array(this.axesCount);
    this.axesHeldTimestamps = new Array(this.axesCount);


    // initially had one dead zone per axis,
    // but deadzones are a device thing, not a mapping thing.
    // we only need one per analog stick.
    this.deadzones = {"left":0.0, "right":0.0};
    this.deadzones.left = new _jsxinput.point2d();
    this.deadzones.right = new _jsxinput.point2d();

    for (i = 0; i < this.axesCount; i++) {
    this.axesStates[i] = 0;
    this.axesPrev[i] = 0;
    this.axesHeldTime[i] = 0;
    this.axesHeldTics[i] = 0;
    this.axesHeldTimestamps[i] = 0;
    }

    this.dpad = new _jsxinput.point2d();
    this.dpadPrev = new _jsxinput.point2d();
    this.dpadTime = new _jsxinput.point2d();
    this.dpadTics = new _jsxinput.point2d();

    this.id = this.gp[this.gamePadIndex].id;

    this.update = function () {
        
        this.gp = navigator.getGamepads();

        if (this.gp[this.gamePadIndex] !== null && this.gp[this.gamePadIndex] !== undefined)
        {

            //
            //this.gp = navigator.getGamepads(); // this was formerly chrome only but changing to do it by default to help retain gp state in firefox
            // ^- also moving above null / undefined check.



            this.updateTimestamp = _jsxinput.getTimestamp();

            // update buttons

            // set previous state
            for (i = 0; i < this.btnCount; i++) {
                this.btnPrevStates[i] = this.btnStates[i];
            }

            this.axesPrev[this.mapping.Lx] = this.axesStates[this.mapping.Lx];
            this.axesPrev[this.mapping.Ly] = this.axesStates[this.mapping.Ly];

            this.axesPrev[this.mapping.Rx] = this.axesStates[this.mapping.Rx];
            this.axesPrev[this.mapping.Ry] = this.axesStates[this.mapping.Ry];

            // get current axis state

            this.axesStates[this.mapping.Lx] = this.gp[this.gamePadIndex].axes[this.mapping.Lx];
            this.axesStates[this.mapping.Ly] = this.gp[this.gamePadIndex].axes[this.mapping.Ly];

            this.axesStates[this.mapping.Rx] = this.gp[this.gamePadIndex].axes[this.mapping.Rx];
            this.axesStates[this.mapping.Ry] = this.gp[this.gamePadIndex].axes[this.mapping.Ry];

            if (this.mapping.axisDpad === true)
            {
                if (this.mapping.firefoxDS5hack === false)
                {
                    // normal dpad input collection / preservation.
                    // for everything except dualsense5 controllers under firefox under windows. 

                    this.axesPrev[this.mapping.dpadRight] = this.axesStates[this.mapping.dpadRight];
                    this.axesPrev[this.mapping.dpadDown] = this.axesStates[this.mapping.dpadDown];
                    
                    this.axesStates[this.mapping.dpadRight] = this.gp[this.gamePadIndex].axes[this.mapping.dpadRight];
                    this.axesStates[this.mapping.dpadDown] = this.gp[this.gamePadIndex].axes[this.mapping.dpadDown];


                }
                else
                {
                    // shameless hack to make sony dualsense 5 controllers report correct dpad values in windows firefox builds


                    let input = this.gp[this.gamePadIndex].axes[9]; // hardcoded value, hopefully

                    // preserve old states
                    //this.axesPrev[this.mapping.dpadRight] = this.axesStates[this.mapping.dpadRight];
                    //this.axesPrev[this.mapping.dpadDown] = this.axesStates[this.mapping.dpadDown];

                    this.dpadPrev.x = this.dpad.x;
                    this.dpadPrev.y = this.dpad.y;

                    // convert input into new state.
                    if (input > 1)                
                    {
                        // no input
                        //this.axesStates[this.mapping.dpadRight] = 0;
                        //this.axesStates[this.mapping.dpadDown] = 0;

                        this.dpad.x = 0;
                        this.dpad.y = 0;
                    }
                    else
                    {
                        if (input < -0.72)
                        {
                            // cardinal up
                            //this.axesStates[this.mapping.dpadRight] = 0;
                            //this.axesStates[this.mapping.dpadDown] = -1;

                            this.dpad.x = 0;
                            this.dpad.y = -1;
                        }
                        else
                        {
                            if (input < -0.43)
                            {
                                // northeast
                                //this.axesStates[this.mapping.dpadRight] = 1;
                                //this.axesStates[this.mapping.dpadDown] = -1;
                                this.dpad.x = 1;
                                this.dpad.y = -1;

                            }
                            else
                            {
                                if (input < -0.143)
                                {
                                    // cardinal east
                                    //this.axesStates[this.mapping.dpadRight] = 1;
                                    //this.axesStates[this.mapping.dpadDown] = 0;
                                    this.dpad.x = 1;
                                    this.dpad.y = 0;

                                }
                                else
                                {
                                    if (input < 0.142)
                                    {
                                        // south east
                                        //this.axesStates[this.mapping.dpadRight] = 1;
                                        //this.axesStates[this.mapping.dpadDown] = 1;
                                        this.dpad.x = 1;
                                        this.dpad.y = 1;

                                    }
                                    else
                                    {
                                        if (input < 0.42)
                                        {
                                            // cardinal south
                                            //this.axesStates[this.mapping.dpadRight] = 0;
                                            //this.axesStates[this.mapping.dpadDown] = 1;
                                            this.dpad.x = 0;
                                            this.dpad.y = 1;
                                        }
                                        else
                                        {
                                            if (input < 0.71)
                                            {
                                                // south west
                                                //this.axesStates[this.mapping.dpadRight] = -1;
                                                //this.axesStates[this.mapping.dpadDown] = 1;
                                                this.dpad.x = -1;
                                                this.dpad.y = 1;
                                            }
                                            else
                                            {
                                                if (input < 1)
                                                {
                                                    // west
                                                    //this.axesStates[this.mapping.dpadRight] = 0;
                                                    //this.axesStates[this.mapping.dpadDown] = 1;
                                                    this.dpad.x = -1;
                                                    this.dpad.y = 0;
                                                }
                                                else
                                                {
                                                    // north west
                                                    //this.axesStates[this.mapping.dpadRight] = -1;
                                                    //this.axesStates[this.mapping.dpadDown] = -1;
                                                    this.dpad.x = -1;
                                                    this.dpad.y = -1;

                                                }
                                            }
                                        }   
                                    }   
                                }
                            }
                        }
                    }
                }
            }


            if (this.mapping.rudderShoulders === true)
            {   
                this.axesPrev[this.mapping.L2] = this.axesStates[this.mapping.L2];
                this.axesPrev[this.mapping.R2] = this.axesStates[this.mapping.R2];


                //this.axesStates[this.mapping.L2] = this.gp[this.gamePadIndex].axes[this.mapping.L2];
                this.axesStates[this.mapping.L2] = (parseFloat(this.gp[this.gamePadIndex].axes[this.mapping.L2]) + 1.0) / 2.0;


                //this.axesStates[this.mapping.R2] = this.gp[this.gamePadIndex].axes[this.mapping.R2];
                this.axesStates[this.mapping.R2] = (parseFloat(this.gp[this.gamePadIndex].axes[this.mapping.R2]) + 1.0) / 2.0;

                


                
            }


            // get current state.
            for (let i = 0; i < this.btnCount; i++) {
                this.btnStates[i] = 0;
                // check for digital buttons



                if (this.gp[this.gamePadIndex].buttons[i].pressed === true) {
                    this.btnStates[i] = 1.0;
                    if (this.btnStates[i] === this.btnPrevStates[i]) {
                        this.btnHeldTics[i]++;
                        //
                        this.btnHeldTimes[i] = this.updateTimestamp -  this.btnHeldTimestamps[i];

                    } else {
                        //
                        //this.btnHeldTimestamps[i] = this.gp[this.gamePadIndex].timestamp;
                        this.btnHeldTimestamps[i] = this.updateTimestamp;
                        this.btnHeldTimes[i] = 0;
                        this.btnHeldTics[i] = 0;

                    }
                } else {
                    // check for analog buttons.
                    if (this.gp[this.gamePadIndex].buttons[i].value > 0) {

                        this.btnStates[i] = this.gp[this.gamePadIndex].buttons[i].value;
                        if (this.btnStates[i] === this.btnPrevStates[i]) {
                            this.btnHeldTics[i]++;
                            this.btnHeldTimes[i] = this.updateTimestamp -  this.btnHeldTimestamps[i];

                        } else {
                            //
                            this.btnHeldTimestamps[i] = this.updateTimestamp;
                            this.btnHeldTimes[i] = 0;
                            this.btnHeldTics[i] = 0;
                        }
                    } else {
                        // pressed is false and value is 0 or less. no action on this button.
                        this.btnHeldTics[i] = 0;
                        this.btnHeldTimes[i] = 0;
                    }
                }


            }


            if (this.mapping.firefoxDS5hack === false)
            {
                // we already set the dpad values for dualshock 5 controllers with the workaround.
                // update dpad for other controllers.
                // set old state
                this.dpadPrev.x = this.dpad.x;
                this.dpad.x = 0;


                // get new state

                if (this.mapping.axisDpad === false)
                {
                    
                    // engage neither if both are pressed.
                    
                    if (this.btnStates[this.mapping.dpadLeft] !== 0){
                        //
                        if (this.btnStates[this.mapping.dpadRight] <= 0)
                        {
                            //


                            this.dpad.x = -1;
                        }
                    }
                    else {
                        if (this.btnStates[this.mapping.dpadRight] !== 0)
                        {
                            //
                            this.dpad.x = 1;
                        }
                    }
                }
                else
                {
                    
                        this.dpad.x = this.axesStates[this.mapping.dpadRight];
                    
                    
                }

                this.dpadPrev.y = this.dpad.y;
                this.dpad.y = 0;

                if (this.mapping.axisDpad === false)
                {
                    
                    // engage neither if both are pressed.
                    if (this.btnStates[this.mapping.dpadUp] !== 0){
                        //
                        if (this.btnStates[this.mapping.dpadDown] <= 0)
                        {
                            //
                            this.dpad.y = -1;
                        }
                    }
                    else {
                        if (this.btnStates[this.mapping.dpadDown] !== 0)
                        {
                            //
                            this.dpad.y = 1;
                        }
                    }
                }
                else
                {
                    if (this.mapping.firefoxDS5hack === false)
                    {
                        this.dpad.y = this.axesStates[this.mapping.dpadDown];
                    }

                    
                }
            }
            

            

            // update dpad time and tics.

            // dpad x axis
            if (this.dpad.x !== 0) {
                if (this.dpad.x === this.dpadPrev.x) {
                    this.dpadTics.x++;
                    this.dpadTime.x = this.updateTimestamp - this.dpadTimestamps[0];
                } else {
                    //
                    this.dpadTimestamps[0] = this.updateTimestamp;
                    this.dpadTics.x = 0;
                    this.dpadTime.x = 0;

                }
            }
            else
            {
                this.dpadTics.x = 0;
                this.dpadTime.x = 0;
            }

            // dpad y axis
            if (this.dpad.y !== 0) {
                if (this.dpad.y === this.dpadPrev.y) {
                    this.dpadTics.y++;
                    this.dpadTime.y = this.updateTimestamp - this.dpadTimestamps[1];
                } else {
                    //
                    this.dpadTimestamps[1] = this.updateTimestamp;
                    this.dpadTics.y = 0;
                    this.dpadTime.y = 0;

                }
            }
            else
            {
                this.dpadTics.y = 0;
                this.dpadTime.y = 0;
            }

            if (this.mapping.rudderShoulders === true)
            {
                // update tics and time for axes mapped to shoulders

                //this.axesPrev[this.mapping.L2] = this.axesStates[this.mapping.L2];
                //this.axesStates[this.mapping.L2] = (parseFloat(this.gp[this.gamePadIndex].axes[this.mapping.L2]) + 1.0) / 2.0;

                if (this.axesStates[this.mapping.L2] !== 0)
                {
                    
                    if (this.axesStates[this.mapping.L2] === this.axesPrev[this.mapping.L2])
                    {
                        //
                        this.axesHeldTics[this.mapping.L2] = this.axesHeldTics[this.mapping.L2] + 1;
                        
                        this.axesHeldTime[this.mapping.L2] = this.updateTimestamp - this.axesHeldTimestamps[this.mapping.L2];
                    }
                    else
                    {
                        this.axesHeldTimestamps[this.mapping.L2] = this.updateTimestamp;
                        //
                        this.axesHeldTics[this.mapping.L2] = 0;
                        
                        this.axesHeldTime[this.mapping.L2] = 0;
                    }
                }
                else
                {
                    //
                    this.axesHeldTics[this.mapping.L2] = 0;
                    
                    this.axesHeldTime[this.mapping.L2] = 0;
                }




                if (this.axesStates[this.mapping.R2] !== 0)
                {
                    
                    if (this.axesStates[this.mapping.R2] === this.axesPrev[this.mapping.R2])
                    {
                        //
                        this.axesHeldTics[this.mapping.R2] = this.axesHeldTics[this.mapping.R2] + 1;
                        
                        this.axesHeldTime[this.mapping.R2] = this.updateTimestamp - this.axesHeldTimestamps[this.mapping.R2];
                    }
                    else
                    {
                        this.axesHeldTimestamps[this.mapping.R2] = this.updateTimestamp;
                        //
                        this.axesHeldTics[this.mapping.R2] = 0;
                        
                        this.axesHeldTime[this.mapping.R2] = 0;
                    }
                }
                else
                {
                    //
                    this.axesHeldTics[this.mapping.R2] = 0;
                    
                    this.axesHeldTime[this.mapping.R2] = 0;
                }
                

            }

            if (this.mapping.axisDpad === true)
            {
                // update tics and time for axes mapped to dpad
            }
            



        }
        };

    // convenience methods. after function, these can probably be converted to properties and moved into update, if they are all updated in update.

    // (A) button:

    this.A = function () {
        return this.btnStates[this.mapping.A];
    };

    this.Aprev = function () {
        return this.btnPrevStates[this.mapping.A];
    };

    this.Atics = function () {
        return this.btnHeldTics[this.mapping.A];
    };

    this.Atime = function () {
        //return this.btnHeldTimes[this.mapping.A];
        return Math.floor(this.btnHeldTimes[this.mapping.A]);
    };

    // (B) button:

    this.B = function () {
        return this.btnStates[this.mapping.B];
    };

    this.Bprev = function () {
        return this.btnPrevStates[this.mapping.B];
    };

    this.Btics = function () {
        return this.btnHeldTics[this.mapping.B];
    };

    this.Btime = function () {
        //return this.btnHeldTimes[this.mapping.B];
        return Math.floor(this.btnHeldTimes[this.mapping.B]);
    };

    // (X) button:

    this.X = function () {
        return this.btnStates[this.mapping.X];
    };

    this.Xprev = function () {
        return this.btnPrevStates[this.mapping.X];
    };

    this.Xtics = function () {
        return this.btnHeldTics[this.mapping.X];
    };

    this.Xtime = function () {
        //return this.btnHeldTimes[this.mapping.X];
        return Math.floor(this.btnHeldTimes[this.mapping.X]);
    };

    // (Y) button:

    this.Y = function () {
        return this.btnStates[this.mapping.Y];
    };

    this.Yprev = function () {
        return this.btnPrevStates[this.mapping.Y];
    };

    this.Ytics = function () {
        return this.btnHeldTics[this.mapping.Y];
    };

    this.Ytime = function () {
        //return this.btnHeldTimes[this.mapping.Y];
        return Math.floor(this.btnHeldTimes[this.mapping.Y]);
    };


    // (L1) button:

    this.L1 = function () {
        return this.btnStates[this.mapping.L1];
    };

    this.L1prev = function () {
        return this.btnPrevStates[this.mapping.L1];
    };

    this.L1tics = function () {
        return this.btnHeldTics[this.mapping.L1];
    };

    this.L1time = function () {
        //return this.btnHeldTimes[this.mapping.L1];
        return Math.floor(this.btnHeldTimes[this.mapping.L1]);
    };


    // (R1) button:

    this.R1 = function () {
        return this.btnStates[this.mapping.R1];
    };

    this.R1prev = function () {
        return this.btnPrevStates[this.mapping.R1];
    };

    this.R1tics = function () {
        return this.btnHeldTics[this.mapping.R1];
    };

    this.R1time = function () {
        //return this.btnHeldTimes[this.mapping.R1];
        return Math.floor(this.btnHeldTimes[this.mapping.R1]);
    };



    // (L2) trigger. conditional function assignment based on whether L2 is an axis or a button.

    // the ruddershoulders checks are repeated to keep the functions paired for readability.

    
   if (this.mapping.rudderShoulders === false)
   {
        this.L2 = function ()
        {
            return this.btnStates[this.mapping.L2];
        };
   }
   else
   {
        this.L2 = function ()
        {
            return this.axesStates[this.mapping.L2];
        };
   }

   if (this.mapping.rudderShoulders === false)
   {
        this.L2prev = function ()
        {
            return this.btnPrevStates[this.mapping.L2];
        };
   }
   else
   {
        this.L2prev = function ()
        {
            return this.axesPrev[this.mapping.L2];
        };
   }

   
    if (this.mapping.rudderShoulders === false)
    {
         this.L2tics = function ()
         {
             return this.btnHeldTics[this.mapping.L2];
         };
    }
    else
    {
         this.L2tics = function ()
         {
             return this.axesHeldTics[this.mapping.L2];
         };
    }
 
    

    if (this.mapping.rudderShoulders === false)
    {
         this.L2time = function ()
         {
             return Math.floor(this.btnHeldTimes[this.mapping.L2]);
         };
    }
    else
    {
         this.L2time = function ()
         {
             return Math.floor(this.axesHeldTime[this.mapping.L2]);
         };
    }


    // (R2) trigger.

    if (this.mapping.rudderShoulders === false)
   {
        this.R2 = function ()
        {
            return this.btnStates[this.mapping.R2];
        };
   }
   else
   {
        this.R2 = function ()
        {
            return this.axesStates[this.mapping.R2];
        };
   }

   if (this.mapping.rudderShoulders === false)
   {
        this.R2prev = function ()
        {
            return this.btnPrevStates[this.mapping.R2];
        };
   }
   else
   {
        this.R2prev = function ()
        {
            return this.axesPrev[this.mapping.R2];
        };
   }

   
    if (this.mapping.rudderShoulders === false)
    {
         this.R2tics = function ()
         {
             return this.btnHeldTics[this.mapping.R2];
         };
    }
    else
    {
         this.R2tics = function ()
         {
             return this.axesHeldTics[this.mapping.R2];
         };
    }
 
    

    if (this.mapping.rudderShoulders === false)
    {
         this.R2time = function ()
         {
             return Math.floor(this.btnHeldTimes[this.mapping.R2]);
         };
    }
    else
    {
         this.R2time = function ()
         {
             return Math.floor(this.axesHeldTime[this.mapping.R2]);
         };
    }


    /*
    this.R2 = function () {
        if (this.mapping.rudderShoulders === false)
        {
            return this.btnStates[this.mapping.R2];
        }   
        else
        {
            return this.axesStates[this.mapping.R2];
        }     

    };

    this.R2prev = function () {
        if (this.mapping.rudderShoulders === false)
        {
            return this.btnPrevStates[this.mapping.R2];
        }
        else
        {
            return this.axesPrev[this.mapping.R2];
        }
    };

    this.R2tics = function () {
        if (this.mapping.rudderShoulders === false)
        {
            return this.btnHeldTics[this.mapping.R2];
        }
        else
        {
            return this.axesHeldTics[this.mapping.R2];
        }

    };

    this.R2time = function () {
        //return this.btnHeldTimes[this.mapping.R2];
        if (this.mapping.rudderShoulders === false)
        {
            return Math.floor(this.btnHeldTimes[this.mapping.R2]);
        }
        else
        {
            
            return Math.floor(this.axesHeldTime[this.mapping.R2]);
        }
    };
    */


    // (L3) button:

    this.L3 = function () {
        return this.btnStates[this.mapping.L3];
    };

    this.L3prev = function () {
        return this.btnPrevStates[this.mapping.L3];
    };

    this.L3tics = function () {
        return this.btnHeldTics[this.mapping.L3];
    };

    this.L3time = function () {
        //return this.btnHeldTimes[this.mapping.L3];
        return Math.floor(this.btnHeldTimes[this.mapping.L3]);
    };


    // (R3) button:

    this.R3 = function () {
        return this.btnStates[this.mapping.R3];
    };

    this.R3prev = function () {
        return this.btnPrevStates[this.mapping.R3];
    };

    this.R3tics = function () {
        return this.btnHeldTics[this.mapping.R3];
    };

    this.R3time = function () {
        //return this.btnHeldTimes[this.mapping.R3];
        return Math.floor(this.btnHeldTimes[this.mapping.R3]);
    };



    // (Select) button

    this.Select = function () {
        return this.btnStates[this.mapping.select];
    };

    this.Selectprev = function () {
        return this.btnPrevStates[this.mapping.select];
    };

    this.Selecttics = function () {
        return this.btnHeldTics[this.mapping.select];
    };

    this.Selecttime = function () {
        //return this.btnHeldTimes[this.mapping.select];
        return Math.floor(this.btnHeldTimes[this.mapping.select]);
    };

    // (Start) button

    this.Start = function () {
        return this.btnStates[this.mapping.start];
    };

    this.Startprev = function () {
        return this.btnPrevStates[this.mapping.start];
    };

    this.Starttics = function () {
        return this.btnHeldTics[this.mapping.start];
    };

    this.Starttime = function () {
        //return this.btnHeldTimes[this.mapping.start];
        return Math.floor(this.btnHeldTimes[this.mapping.start]);
    };

    // (+) dpad

    this.dpadX = function () {
        return this.dpad.x;
    };

    this.dpadY = function () {
        return this.dpad.y;
    };

    this.dpadXprev = function () {
        return this.dpadPrev.x;
    };

    this.dpadYprev = function () {
        return this.dpadPrev.y;
    };

    this.dpadXtics = function () {
        return this.dpadTics.x;
    };

    this.dpadYtics = function () {
        return this.dpadTics.y;
    };

    this.dpadXtime = function () {
        //return this.dpadTime.x;
        return Math.floor(this.dpadTime.x);
    };

    this.dpadYtime = function () {
        //return this.dpadTime.y;
        return Math.floor(this.dpadTime.y);
    };


    // (L) stick

    this.Lx = function () {
        if (Math.abs(this.axesStates[this.mapping.Lx]) < this.deadzones.left.x)
        {
            return 0.0;

        }
        else
        {
            //
            return this.axesStates[this.mapping.Lx];
        }

    };

    this.Ly = function () {
        if (Math.abs(this.axesStates[this.mapping.Ly]) < this.deadzones.left.y)
        {
            return 0.0;
        }
        else
        {

            return this.axesStates[this.mapping.Ly];
        }
    };


    // (R) stick

    this.Rx = function () {
        if (Math.abs(this.axesStates[this.mapping.Rx]) < this.deadzones.right.x)
        {
            return 0.0;

        }
        else
        {
            return this.axesStates[this.mapping.Rx];
        }

    };

    this.Ry = function () {
        if (Math.abs(this.axesStates[this.mapping.Ry]) < this.deadzones.right.y)
        {
            return 0.0;
        }
        else
        {

            return this.axesStates[this.mapping.Ry];
        }

    };

    return this;

};
