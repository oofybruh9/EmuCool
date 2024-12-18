function start(){
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

const dialog = document.getElementById('sampleDialog');
const openButton = document.getElementById('openDialog');
const closeButton = document.getElementById('closeDialog');

// Event listener to open the dialog
openButton.addEventListener('click', function() {
  dialog.showModal();
});

// Event listener to close the dialog
closeButton.addEventListener('click', function() {
  dialog.close();
});
}
settings = loadFS("../configs/settings.json")
