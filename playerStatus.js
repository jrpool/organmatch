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
    playerOL.appendChild(newPlayer);
    newPlayer.innerHTML = playerNews(...playerData);
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
      organNewsItems.push(`${patientData[2]} (${patientData[3]} in queue)`);
    }
    const organNews = organNewsItems.join(' + ');
    const news = `${[organNews, patientData[4], `priority ${patientData[5]}`].join('; ')}`;
    const newPatientLI = document.createElement('li');
    document.getElementById('handPatients').appendChild(newPatientLI);
    newPatientLI.textContent = news;
  }
  // Otherwise, if the turn changed:
  else if (data.startsWith('turn=')) {
    // Change the turn number and player.
    const turnData = rawData.split('\t');
    document.getElementById('turnNum').textContent = turnData[0];
    document.getElementById('turnPlayer').innerHTML = playerNews(turnData[1], turnData[2]);
  }
  // Otherwise, if the player’s next task was defined:
  else if (data.startsWith('task=')) {
    const taskDiv = document.getElementById('task');
    // If it is to wait for the turn player’s move:
    if (rawData.startsWith('Wait')) {
      // Replace the next task with the message.
      const taskP = document.createElement('p');
      taskDiv.appendChild('taskP');
      taskP.textContent = rawData;
    }
    // Otherwise, if it is to choose a player to bid:
    else if (rawData.startsWith('bid')) {
      // Replace the next task with a bid form.
      const taskLabelP = document.createElement('p');
      taskDiv.appendChild(taskLabelP);
      taskLabelP.id = 'bidLabel';
      taskLabelP.textContent = 'Choose a patient to bid.';
      const bidForm = document.createElement('form');
      taskDiv.appendChild(bidForm);
      const buttonsP = document.createElement('p');
      bidForm.appendChild(buttonsP);
      rawData.split('\t').forEach(num => {
        const numButton = document.createElement('button');
        numButton.setAttribute('aria-labelledby', 'bidLabel');
        numButton.textContent = num;
        buttonsP.appendChild(numButton);
      });
      // When the bid form is submitted:
      bidForm.onsubmit = async event => {
        // Prevent a reload.
        event.preventDefault();
        // Notify the server.
        const response = await fetch(`/bid?patientNum=${event.target.textContent}`);
        if (response.ok) {
          // Permanently remove the bid form.
          document.getElementById('taskDiv').textContent = '';
        }
      };
    }
  }
};
