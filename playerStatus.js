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
  const {data} = event;
  const rawData = event.data.replace(/^[a-z]+=/, '');
  // If a user disconnected:
  if (data.startsWith('revision=')) {
    // Revise the entire list.
    playerUL.innerHTML = rawData;
  }
  // Otherwise, i.e. if a player joined:
  else if (data.startsWith('addition=')) {
    // Append the player to the list.
    const playerData = rawData.split('\t');
    const newPlayer = document.createElement('li');
    newPlayer.innerHTML = `[<span class="mono">${playerData[0]}</span>] ${playerData[1]}`;
    playerUL.appendChild(newPlayer);
  }
};
