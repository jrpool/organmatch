// playerStatus
const params = JSON.parse(document.getElementById('params').textContent);
// Add the session code, player name, and player list to the page.
const {sessionCode, playerID, playerName} = params;
document.getElementById('sessionCode').textContent = sessionCode;
document.getElementById('playerID').textContent = playerID;
document.getElementById('playerName').textContent = playerName;
const playerOL = document.getElementById('playerList');
playerOL.innerHTML = params.playerList;
// Revise the list when a user joins or disconnects.
const news = new EventSource(`/newsRequest?sessionCode=${sessionCode}&userID=${playerID}`);
const playerNews = (playerID, playerName) => {
  return `[<span class="mono">${playerID}</span>] ${playerName}`;
};
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
    newPlayer.innerHTML = playerNews(...playerData);
    playerOL.appendChild(newPlayer);
  }
  // Otherwise, if the stage changed:
  else if (data.startsWith('sessionStage=')) {
    // Change the stage accordingly.
    const stageP = document.getElementById('stage');
    stageP.textContent = rawData;
    // If the change was a session start:
    if (rawData.startsWith('Started')) {
      // Remove the starting information from the page.
      document.getElementById('startInfo').remove();
      // Make the post-start facts visible.
      document.getElementById('afterStart').classList.remove('invisible');
    }
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
  // Otherwise, if a patient was added to the hand:
  else if (data.startsWith('handPatientAdd=')) {
    // Add the patient.
    const patientData = rawData.split('\t');
    const organNewsItems = [`${patientData[0]} (${patientData[1]} in queue)`];
    if (patientData[2]) {
      organNewsItems.push(`${patientData[0]} (${patientData[1]} in queue)`);
    }
    const organNews = organNewsItems.join(' + ');
    const news = `<li>${[organNews, rawData[4], `priority ${rawData[5]}`].join('; ')}</li>`;
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
};
