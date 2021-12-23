// leaderStatus
const params = JSON.parse(document.getElementById('params').textContent);
const {docRoot, sessionCode} = params;
document.getElementById('sessionCode').textContent = sessionCode;
const joinLink = document.getElementById('joinLink');
joinLink.href = joinLink.textContent = `${docRoot}/joinForm?sessionCode=${sessionCode}`;
