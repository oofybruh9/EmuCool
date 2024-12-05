const neu = window.Neutralino

async function saveTS(json, place) {
    let myjson = JSON.stringify(json);
    await Neutralino.filesystem.writeFile('../configs/'+place+".json", myjson)
};
  
async function loadFS(place) {
    let myjson2 = await Neutralino.filesystem.readFile(place)
    let json2 = JSON.parse(myjson2);
    return json2;
}


