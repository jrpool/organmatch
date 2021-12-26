// leaderStatus
// Replace placeholders with values.
const params = JSON.parse(document.getElementById('params').textContent);
const {docRoot, sessionCode} = params;
const minPlayerCount = Number.parseInt(params.minPlayerCount);
document.getElementById('sessionCode').textContent = sessionCode;
const joinLink = document.getElementById('joinLink');
joinLink.href = joinLink.textContent = `${docRoot}/joinForm?sessionCode=${sessionCode}`;
// Revise the list when a player joins or disconnects.
const playerLister = new EventSource(`/playerJoined?sessionCode=${sessionCode}&userID=Leader`);
const playerUL = document.getElementById('playerList');
playerLister.onmessage = event => {
  // If a player disconnects:
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
  // If the count of players is the minimum permitted:
  if (playerUL.childElementCount === minPlayerCount) {
    // Show the start-session button.
    document.getElementById('startSession').classList.remove('invisible');
  }
  // Otherwise, if the count is less than the minimum:
  else if (playerUL.childElementCount < minPlayerCount) {
    // Hide the start-session button.
    document.getElementById('startSession').classList.add('invisible');
  }
};
