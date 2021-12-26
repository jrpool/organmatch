// leaderStatus
// Replace placeholders with values.
const params = JSON.parse(document.getElementById('params').textContent);
const {docRoot, sessionCode} = params;
const minPlayerCount = Number.parseInt(params.minPlayerCount);
document.getElementById('sessionCode').textContent = sessionCode;
const joinLink = document.getElementById('joinLink');
joinLink.href = joinLink.textContent = `${docRoot}/joinForm?sessionCode=${sessionCode}`;
// Ask the server for status-change messages.
const news = new EventSource(`/newsRequest?sessionCode=${sessionCode}&userID=Leader`);
const playerUL = document.getElementById('playerList');
news.onmessage = event => {
  const {data} = event;
  const rawData = event.data.replace(/^[a-z]+=/, '');
  // If a user disconnected:
  if (data.startsWith('revision=')) {
    // Revise the entire list.
    playerUL.innerHTML = rawData.replace(/#newline#/g, '\n');
  }
  // Otherwise, if a player joined:
  else if (data.startsWith('addition=')) {
    // Append the player to the list.
    const playerData = rawData.split('\t');
    const newPlayer = document.createElement('li');
    newPlayer.innerHTML = `[<span class="mono">${playerData[0]}</span>] ${playerData[1]}`;
    playerUL.appendChild(newPlayer);
  }
  // Otherwise, if the session started:
  else if (data.startsWith('sessionStart')) {
    // Change the status accordingly.
    const statusP = document.getElementById('status');
    statusP.textContent = rawData;
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
const startForm = document.getElementById('startSession');
startForm.onsubmit = async event => {
  event.preventDefault();
  const response = await fetch('/startSession');
  if (response.ok) {
    startForm.classList.add('invisible');
  }
};
