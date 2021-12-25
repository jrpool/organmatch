// leaderStatus
// Replace placeholders with values.
const params = JSON.parse(document.getElementById('params').textContent);
const {docRoot, sessionCode} = params;
const minPlayerCount = Number.parseInt(params.minPlayerCount);
document.getElementById('sessionCode').textContent = sessionCode;
const joinLink = document.getElementById('joinLink');
joinLink.href = joinLink.textContent = `${docRoot}/joinForm?sessionCode=${sessionCode}`;
// Add players to the list when they join.
const playerLister = new EventSource(`/playerJoined?sessionCode=${sessionCode}&userID=Leader`);
const playerOL = document.getElementById('playerList');
playerLister.onmessage = event => {
  if (event.event === 'revision') {
    playerOL.innerHTML = event.data;
  }
  else {
    const newPlayer = document.createElement('li');
    newPlayer.textContent = event.data;
    playerOL.appendChild(newPlayer);
  }
  // If the count of players is the minimum permitted:
  if (playerOL.childElementCount === minPlayerCount) {
    // Show the start-session button.
    document.getElementById('startSession').classList.remove('invisible');
  }
  // Otherwise, if the count is less than the minimum:
  else if (playerOL.childElementCount < minPlayerCount) {
    // Hide the start-session button.
    document.getElementById('startSession').classList.add('invisible');
  }
};
