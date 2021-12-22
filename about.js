// about
const params = JSON.parse(document.getElementById('params').textContent);
const {docRoot} = params;
document.getElementById('homeLink').href = `${docRoot}/home`;
