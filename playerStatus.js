// playerStatus
const params = JSON.parse(document.getElementById('params').textContent);
const {sessionCode, playerList} = params;
console.log(sessionCode);
document.getElementById('sessionCode').textContent = sessionCode;
document.getElementById('playerList').innerHTML = playerList;
