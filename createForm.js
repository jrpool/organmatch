// createSession
const params = JSON.parse(document.getElementById('params').textContent);
const {docRoot} = params;
document.getElementById('createSession').action = `${docRoot}/createSession`;
document.getElementById('homeLink').href = `${docRoot}/home`;
