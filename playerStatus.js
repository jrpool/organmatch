// playerStatus
const params = JSON.parse(document.getElementById('params').textContent);
// Add the session code and the player list to the page.
document.getElementById('sessionCode').textContent = params.sessionCode;
const playerOL = document.getElementById('playerList');
playerOL.innerHTML = params.playerList;
const newPlayerLI = document.createElement('li');
newPlayerLI.innerText = params.name;
playerOL.appendChild(newPlayerLI);
// Add players to the list when they join.
const playerLister = new EventSource('/playerJoined');
playerLister.onmessage = event => {
  const newPlayer = document.createElement('li');
  newPlayer.textContent = event.data;
  playerOL.appendChild(newPlayer);
};
