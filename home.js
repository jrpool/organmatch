// home
const params = JSON.parse(document.getElementById('params').textContent);
const {docRoot} = params;
document.getElementById('aboutLink').href = `${docRoot}/about`;
document.getElementById('createFormLink').href = `${docRoot}/createForm`;
document.getElementById('joinFormLink').href = `${docRoot}/joinForm`;
