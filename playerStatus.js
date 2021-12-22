// leaderStatus
const params = JSON.parse(document.getElementById('params').textContent);
const {docRoot, sessionCode} = params;
document.getElementById('sessionCode').textContent = sessionCode;
document.getElementById('homeLink').href = `${docRoot}/home`;
