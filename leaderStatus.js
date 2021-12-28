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
const playerNews = (playerID, playerName) => {
  return `[<span class="mono">${playerID}</span>] ${playerName}`;
};
const playerOL = document.getElementById('playerList');
news.onmessage = event => {
  const {data} = event;
  const rawData = event.data.replace(/^[A-Za-z]+=/, '');
  // If a user disconnected:
  if (data.startsWith('revision=')) {
    // Revise the entire list.
    playerOL.innerHTML = rawData.replace(/#newline#/g, '\n');
  }
  // Otherwise, if a player joined:
  else if (data.startsWith('addition=')) {
    // Append the player to the list.
    const playerData = rawData.split('\t');
    const newPlayer = document.createElement('li');
    newPlayer.innerHTML = `[<span class="mono">${playerData[0]}</span>] ${playerData[1]}`;
    playerOL.appendChild(newPlayer);
  }
  // Otherwise, if the stage changed:
  else if (data.startsWith('sessionStage')) {
    // Change the stage accordingly.
    const stageP = document.getElementById('stage');
    stageP.textContent = rawData;
  }
  // Otherwise, if the round changed:
  else if (data.startsWith('round=')) {
    // Change the round and the round-dependent facts.
    const roundData = rawData.split('\t');
    document.getElementById('round').textContent = roundData[0];
    document.getElementById('roundStarter').innerHTML = playerNews(roundData[1], roundData[2]);
    document.getElementById('roundEnder').innerHTML = playerNews(roundData[3], roundData[4]);
    document.getElementById('organ').textContent = `${roundData[5]} (${roundData[6]})`;
  }
  // Otherwise, if a patient was added to the turn player’s hand:
  else if (data.startsWith('handPatientAdd=')) {
    // Add the patient.
    const patientData = rawData.split('\t');
    const organNewsItems = [`${patientData[0]} (${patientData[1]} in queue)`];
    if (patientData[2]) {
      organNewsItems.push(`${patientData[2]} (${patientData[3]} in queue)`);
    }
    const organNews = organNewsItems.join(' + ');
    const news = `${[organNews, patientData[4], `priority ${patientData[5]}`].join('; ')}`;
    const newPatientLI = document.createElement('li');
    newPatientLI.textContent = news;
    document.getElementById('handPatients').appendChild(newPatientLI);
  }
  // Otherwise, if the turn changed:
  else if (data.startsWith('turn=')) {
    // Change the turn number and player.
    const turnData = rawData.split('\t');
    document.getElementById('turnNum').textContent = turnData[0];
    document.getElementById('turnPlayer').innerHTML = playerNews(turnData[1], turnData[2]);
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
// When the start-session form is submitted:
const startForm = document.getElementById('startSession');
startForm.onsubmit = async event => {
  // Prevent a reload.
  event.preventDefault();
  // Notify the server.
  const response = await fetch(`/startSession?sessionCode=${sessionCode}`);
  if (response.ok) {
    // Permanently remove the start-session button and the how-to-start information.
    document.getElementById('startInfo').remove();
    startForm.remove();
    // Make the post-start facts visible.
    document.getElementById('afterStart').classList.remove('invisible');
  }
};
