// playerStatus
const params = JSON.parse(document.getElementById('params').textContent);
const {sessionCode, nowPlayerList} = params;
console.log(sessionCode);
document.getElementById('sessionCode').textContent = sessionCode;
const playerList = document.getElementById('playerList');
playerList.innerHTML = nowPlayerList;
// Add players to the list when they join.
const playerLister = new EventSource('/playerJoined');
playerLister.onmessage = event => {
  const newPlayer = document.createElement('li');
  newPlayer.textContent = event.data;
  playerList.appendChild(newPlayer);
};
