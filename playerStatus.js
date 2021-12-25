// playerStatus
const params = JSON.parse(document.getElementById('params').textContent);
const {sessionCode, playerList} = params;
console.log(sessionCode);
document.getElementById('sessionCode').textContent = sessionCode;
const playerOL = document.getElementById('playerList');
playerOL.innerHTML = playerList;
// Add players to the list when they join.
const playerLister = new EventSource('/playerJoined');
playerLister.onmessage = event => {
  const newPlayer = document.createElement('li');
  newPlayer.textContent = event.data;
  playerOL.appendChild(newPlayer);
};
