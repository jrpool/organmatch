// playerStatus
const params = JSON.parse(document.getElementById('params').textContent);
// Add the session code, player name, and player list to the page.
const {sessionCode, playerID, playerName} = params;
document.getElementById('sessionCode').textContent = sessionCode;
document.getElementById('playerID').textContent = playerID;
document.getElementById('playerName').textContent = playerName;
const playerOL = document.getElementById('playerList');
playerOL.innerHTML = params.playerList;
const newPlayerLI = document.createElement('li');
newPlayerLI.innerHTML = `[<span class="mono">${playerID}</span>] ${playerName}`;
playerOL.appendChild(newPlayerLI);
// Add players to the list when they join.
const playerLister = new EventSource(
  `/playerJoined?sessionCode=${sessionCode}&userID=${playerID}`
);
playerLister.onmessage = event => {
  if (event.event === 'revision') {
    playerOL.innerHTML = event.data;
  }
  else {
    const newPlayer = document.createElement('li');
    newPlayer.textContent = event.data;
    playerOL.appendChild(newPlayer);
  }
};
