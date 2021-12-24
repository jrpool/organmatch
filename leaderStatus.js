// leaderStatus
// Replace placeholders with values.
const params = JSON.parse(document.getElementById('params').textContent);
const {docRoot, sessionCode} = params;
const minPlayerCount = Number.parseInt(params.minPlayerCount);
document.getElementById('sessionCode').textContent = sessionCode;
const joinLink = document.getElementById('joinLink');
joinLink.href = joinLink.textContent = `${docRoot}/joinForm?sessionCode=${sessionCode}`;
// Add players to the list when they join.
const playerLister = new EventSource('/playerJoined');
const playerList = document.getElementById('playerList');
playerLister.onmessage = event => {
  const newPlayer = document.createElement('li');
  newPlayer.textContent = event.data;
  playerList.appendChild(newPlayer);
  // If the count of players is the minimum permitted:
  if (playerList.childElementCount === minPlayerCount) {
    document.getElementById('startSession').classList.remove('invisible');
  }
};
