// playerStatus
const params = JSON.parse(document.getElementById('params').textContent);
// Add the session code, player name, and player list to the page.
const {sessionCode, playerID, playerName} = params;
document.getElementById('sessionCode').textContent = sessionCode;
document.getElementById('playerID').textContent = playerID;
document.getElementById('playerName').textContent = playerName;
const playerUL = document.getElementById('playerList');
playerUL.innerHTML = params.playerList;
const newPlayerLI = document.createElement('li');
newPlayerLI.innerHTML = `[<span class="mono">${playerID}</span>] ${playerName}`;
playerUL.appendChild(newPlayerLI);
// Revise the list when a user joins or disconnects.
const playerLister = new EventSource(
  `/playerJoined?sessionCode=${sessionCode}&userID=${playerID}`
);
playerLister.onmessage = event => {
  // If a user disconnects:
  if (event.event === 'revision') {
    // Revise the entire list.
    playerUL.innerHTML = event.data;
  }
  // Otherwise, i.e. if a player joins:
  else {
    // Append the player to the list.
    const playerData = event.data.split('\t');
    const newPlayer = document.createElement('li');
    newPlayer.innerHTML = `[<span class="mono">${playerData[0]}</span>] ${playerData[1]}`;
    playerUL.appendChild(newPlayer);
  }
};
