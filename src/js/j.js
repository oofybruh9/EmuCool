try {
    let url = "../../.tmp/update.manifest.json";
    let manifest = await Neutralino.updater.checkForUpdates(url);

    if(manifest.version != NL_APPVERSION) {
        //await Neutralino.updater.install();
        //await Neutralino.app.restartProcess();
    }
    if(manifest.version == NL_APPVERSION) {
        document.getElementById('top').style.display = "none";
    }
}
catch(err) {
    // Handle errors
    document.getElementById('top').innerHTML += `<h3>Error occurred. Check the log/console for more info</h3>`;
}
