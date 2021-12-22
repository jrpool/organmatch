// sessionStatus
const params = JSON.parse(document.getElementById('params').textContent);
const {sessionCode} = params;
document.getElementById('sessionCode').textContent = sessionCode;
const url = `https://jpdev.pro/organmatch/join?sessionCode=${sessionCode}`;
const joinLink = document.getElementById('joinLink');
joinLink.href = url;
joinLink.textContent = url;
