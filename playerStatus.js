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
// Returns a patient description.
const patientDigest = patientNews => {
  const patientData = patientNews.split('\t');
  const organNewsItems = [`${patientData[0]} (${patientData[1]} in queue)`];
  if (patientData[2]) {
    organNewsItems.push(`${patientData[2]} (${patientData[3]} in queue)`);
  }
  const organNews = organNewsItems.join(' + ');
  return `${[organNews, patientData[4], `priority ${patientData[5]}`].join('; ')}`;
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
    newPlayer.innerHTML = `[<span class="mono">${playerData[0]}</span>] ${playerData[1]}`;
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
    document.getElementById('organ').textContent = `${roundData[1]} (${roundData[2]})`;
  }
  // Otherwise, if a round turn was initialized:
  else if (data.startsWith('turnInit=')) {
    // Add the turn to the list of round turns.
    const turnData = rawData.split('\t');
    const turnLI = document.createElement('li');
    document.getElementById('turns').appendChild(turnLI);
    turnLI.innerHTML
      = `Turn ${turnData[0]} (player ${turnData[1]})<span id=turn${turnData[0]}></span>`;
  }
  // Otherwise, if a patient was added to the hand:
  else if (data.startsWith('handPatientAdd=')) {
    // Add the patient.
    const newPatientLI = document.createElement('li');
    document.getElementById('handPatients').appendChild(newPatientLI);
    newPatientLI.textContent = patientDigest(rawData);
  }
  // Otherwise, if a patient was replaced in the hand:
  else if (data.startsWith('handPatientReplace=')) {
    // Replace the old patient with the new one.
    const replacementData = rawData.split('\t');
    const patientLI = document
    .getElementById('handPatients')
    .querySelector(`li:nth-child(${replacementData[0]})`);
    patientLI.textContent = patientDigest(replacementData.slice(1).join('\t'));
  }
  // Otherwise, if a turn status changed:
  else if (data.startsWith('turn=')) {
    // Change the status of the turn.
    const turnData = rawData.split('\t');
    document.getElementById(`turn${turnData[0]}`).textContent = turnData[1];
  }
  // Otherwise, if the player’s next task was defined:
  else if (data.startsWith('task=')) {
    // Remove any existing next task.
    const taskDiv = document.getElementById('task');
    taskDiv.textContent = '';
    const taskParts = rawData.split('\t');
    const taskType = taskParts.shift();
    // If the next task is to wait for the turn player’s move:
    if (taskType === 'wait') {
      // Display it.
      const taskP = document.createElement('p');
      taskDiv.appendChild(taskP);
      taskP.textContent = 'Wait for the turn player to move';
    }
    // Otherwise, if it is to choose a player to bid or replace:
    else if (['bid', 'swap'].includes(taskType)) {
      // Replace the next task with a choice form.
      const taskLabelP = document.createElement('p');
      taskDiv.appendChild(taskLabelP);
      taskLabelP.id = 'choiceLabel';
      taskLabelP.textContent = `${taskType === 'bid' ? 'Bid' : 'Replace'} a patient:`;
      const choiceForm = document.createElement('form');
      taskDiv.appendChild(choiceForm);
      const buttonsP = document.createElement('p');
      choiceForm.appendChild(buttonsP);
      taskParts.forEach(num => {
        const numButton = document.createElement('button');
        numButton.setAttribute('aria-labelledby', 'choiceLabel');
        numButton.textContent = num;
        buttonsP.appendChild(numButton);
      });
      // When the form is submitted:
      choiceForm.onsubmit = async event => {
        // Prevent a reload.
        event.preventDefault();
        // Notify the server.
        const patientNum = event.submitter.textContent;
        const response = await fetch(
          `/${taskType}?sessionCode=${sessionCode}&playerID=${playerID}&patientNum=${patientNum}`
        );
        if (response.ok) {
          // Remove the form.
          taskDiv.textContent = '';
        }
      };
    }
  }
  // Otherwise, if a bid was made:
  else if (data.startsWith('bidAdd=')) {
    // Add the bid to the list of bids.
    const bidLI = document.createElement('li');
    document.getElementById('bids').appendChild(bidLI);
    bidLI.textContent = patientDigest(rawData);
  }
};
