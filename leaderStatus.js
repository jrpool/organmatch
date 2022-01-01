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
const playerOL = document.getElementById('playerList');
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
// Returns an influence-card description.
const influenceDigest = influenceNews => {
  const influenceData = influenceNews.split('\t');
  const impact = influenceData[1];
  const impactNews = impact.startsWith('-') ? impact : `+${impact}`;
  return `${influenceData[0]} (${impactNews})`;
};
// Returns an initial player list item.
const playerInit = (id, playerName) => {
  const idSpan = `<span class="mono">${id}</span>`;
  const winCountSpan = `<span id="winCount${id}">0</span>`;
  const winListSpan = `<span id="winList${id}"></span>`;
  return `[${idSpan}] ${playerName}; rounds won: ${winCountSpan} (${winListSpan})`;
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
    newPlayer.innerHTML = playerInit(...playerData);
  }
  // Otherwise, if the stage changed:
  else if (data.startsWith('sessionStage=')) {
    // Change the stage accordingly.
    const stageP = document.getElementById('stage');
    stageP.innerHTML = rawData;
  }
  // Otherwise, if the round changed:
  else if (data.startsWith('round=')) {
    // Change the round and the round-dependent facts.
    const roundData = rawData.split('\t');
    document.getElementById('round').textContent = roundData[0];
    document.getElementById('organ').textContent = `${roundData[1]} (${roundData[2]})`;
    document.getElementById('bids').textContent = '';
    document.getElementById('turns').textContent = '';
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
  // Otherwise, if a patient was added to the turn player’s hand:
  else if (data.startsWith('handPatientAdd=')) {
    // Add the patient.
    const newPatientLI = document.createElement('li');
    document.getElementById('handPatients').appendChild(newPatientLI);
    newPatientLI.textContent = patientDigest(rawData);
  }
  // Otherwise, if an influence card was added to the hand:
  else if (data.startsWith('handInfluenceAdd=')) {
    // Add the card.
    const newInfluenceLI = document.createElement('li');
    document.getElementById('handInfluences').appendChild(newInfluenceLI);
    newInfluenceLI.textContent = influenceDigest(rawData);
  }
  // Otherwise, if a turn status changed:
  else if (data.startsWith('turn=')) {
    // Change the status of the turn.
    const turnData = rawData.split('\t');
    document.getElementById(`turn${turnData[0]}`).textContent = turnData[1];
    // Empty the lists describing the turn-player hand.
    document.getElementById('handPatients').textContent = '';
    document.getElementById('handInfluences').textContent = '';
  }
  // Otherwise, if the turn player’s next task was defined:
  else if (data.startsWith('task=')) {
    // Remove any existing next task.
    const taskDiv = document.getElementById('task');
    taskDiv.textContent = '';
    const taskParts = rawData.split('\t');
    const taskType = taskParts.shift();
    // If the task is to choose a player to bid or replace:
    if (['bid', 'swap'].includes(taskType)) {
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
        numButton.setAttribute('disabled', true);
        numButton.textContent = num;
        buttonsP.appendChild(numButton);
      });
    }
  }
  // Otherwise, if a bid was made:
  else if (data.startsWith('bidAdd=')) {
    // Add the bid to the list of bids.
    const bidLI = document.createElement('li');
    document.getElementById('bids').appendChild(bidLI);
    bidLI.textContent = patientDigest(rawData);
  }
  // Otherwise, if an influence card was used:
  else if (data.startswith('use=')) {
    // Append that use to the bid.
    const useData = rawData.split('\t');
    const bidLI = document.getElementById('bids').querySelector(`li:nth-child(${useData[0]}`);
    bidLI.textContent += useData[1];
  }
  // Otherwise, if an influence card was removed from the hand:
  else if (data.startsWith('influenceRemove=')) {
    // Remove it.
    const influenceLI = document
    .getElementById('handInfluences')
    .querySelector(`li:nth-child(${rawData})`);
    influenceLI.remove();
  }
  // Otherwise, if a player won a round:
  else if (data.startsWith('roundWinner=')) {
    const winnerData = rawData.split('\t');
    // Update the winner’s item in the player list.
    const countSpan = document.getElementById(`winCount${winnerData[1]}`);
    countSpan.textContent++;
    const listSpan = document.getElementById(`winList${winnerData[1]}`);
    if (listSpan.textContent) {
      listSpan.textContent += `, ${winnerData[0]}`;
    }
    else {
      listSpan.textContent = winnerData[0];
    }
  }
  // Otherwise, if the time left was updated:
  else if (data.startsWith('timeLeft=')) {
    // Update it in the session stage.
    document.getElementById('timeLeft').textContent = rawData;
  }
  // If the start-session button has not been permanently removed:
  if (document.getElementById('startSession')) {
    // If a player joined or disconnected:
    if (data.startsWith('revision') || data.startsWith('addition')) {
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
    }
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
