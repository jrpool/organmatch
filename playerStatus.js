// playerStatus
const params = JSON.parse(document.getElementById('params').textContent);
// Add the session code, player count limits, and data on joined players to the page.
const {sessionCode, playerID, playerList, minPlayerCount, maxPlayerCount} = params;
document.getElementById('sessionCode').textContent = sessionCode;
document.getElementById('minPlayerCount').textContent = minPlayerCount;
document.getElementById('maxPlayerCount').textContent = maxPlayerCount;
document.getElementById('playerX').id = `player${playerID}`;
const playerLITemplate = document.getElementById('playerLITemplate');
const addPlayerLI = id => {
  const newPlayerLI = playerLITemplate.cloneNode(true);
  newPlayerLI.id = `player${id}`;
  playerLITemplate.before(newPlayerLI);
};
const populatePlayerLI = (id, playerName) => {
  const playerLI = document.getElementById(`player${id}`);
  playerLI.querySelector('.idLetter').textContent = id;
  playerLI.querySelector('.playerName').textContent = playerName;
  playerLI.classList.remove('invisible');
};
Object.keys(playerList).forEach(id => {
  if (id !== playerID) {
    addPlayerLI(id);
  }
  populatePlayerLI(id, playerList[id]);
});
// When the patient form is submitted:
const patientForm = document.getElementById('patientForm');
patientForm.onsubmit = async event => {
  // Prevent a reload.
  event.preventDefault();
  // Identify the index of the chosen patient.
  const patientButton = event.submitter;
  const patientButtons = Array.from(
    event.submitter.parentElement.parentElement.querySelectorAll('button')
  );
  const index = patientButtons.findIndex(button => button === patientButton);
  // Remove the selected patient from the hand.
  patientButton.parentElement.remove();
  // Disable the buttons in the form.
  patientForm.querySelectorAll('button').forEach(button => {
    button.setAttribute('disabled', true);
  });
  // Notify the server of the choice.
  const task = document.getElementById('patientTask').textContent;
  await fetch(
    `patient?sessionCode=${sessionCode}&playerID=${playerID}&task=${task}&index=${index}`
  );
};
// When the influence form is submitted:
const influenceForm = document.getElementById('influenceForm');
influenceForm.onsubmit = async event => {
  // Prevent a reload.
  event.preventDefault();
  // Identify the index of the chosen influence card.
  const influenceButton = event.submitter;
  const influenceCard = influenceButton.parentElement;
  const influenceCards = Array.from(influenceCard.parentElement.querySelectorAll('li'));
  const index = influenceCards.findIndex(
    card => Array.from(card.querySelectorAll('button')).includes(influenceButton)
  );
  const bidderID = influenceButton.textContent;
  // Remove the selected influence card from the hand.
  influenceCard.remove();
  // Disable the buttons in the form.
  influenceForm.querySelectorAll('button').forEach(button => {
    button.setAttribute('disabled', true);
  });
  // Notify the server of the choice.
  await fetch(
    `influence?sessionCode=${sessionCode}&playerID=${playerID}&index=${index}&bidderID=${bidderID}`
  );
};
// When the round-OK form is submitted:
const roundOKForm = document.getElementById('roundOKForm');
roundOKForm.onsubmit = async event => {
  // Prevent a reload.
  event.preventDefault();
  // Hide the form.
  roundOKForm.classList.add('invisible');
  // Notify the server.
  await fetch(`roundOK?sessionCode=${sessionCode}&playerID=${playerID}`);
};
// Open a persistent messaging connection to the server.
const news = new EventSource(`newsRequest?sessionCode=${sessionCode}&userID=${playerID}`);
// Returns a patient description in format “«heart#23 + lung#5» ∂ ★3”.
const patientDigest = patientData => {
  const organNewsItems = [`${patientData[0]}#${patientData[1]}`];
  if (patientData[2]) {
    organNewsItems.push(`${patientData[2]}#${patientData[3]}`);
  }
  const organNews = `&laquo;${organNewsItems.join(' + ')}&raquo;`;
  return `${[organNews, patientData[4], `&starf;${patientData[5]}`].join(' ')}`;
};
// Returns an influence-card description in format “bribe/-2”.
const influenceDigest = influenceNews => {
  const influenceData = influenceNews.split('\t');
  const impact = influenceData[1];
  const impactNews = impact.startsWith('-') ? impact : `+${impact}`;
  return `${influenceData[0]}/${impactNews}`;
};
// Processes an event-stream message.
news.onmessage = event => {
  const params = event.data.split(/[=\t]/);
  // If a player disconnected:
  if (params[0] === 'playerDrop') {
    // Remove the player.
    document.getElementById(`player${params[1]}`).remove();
  }
  // Otherwise, if a player joined:
  else if (params[0] === 'playerAdd') {
    // Append the player to the list.
    addPlayerLI(params[1]);
    populatePlayerLI(params[1], params[2]);
  }
  // Otherwise, if the session started:
  else if (params[0] === 'sessionStart') {
    // Remove the pre-start information from the page.
    document.getElementById('preStart').remove();
    // Make the round information visible.
    document.getElementById('roundInfo').classList.remove('invisible');
  }
  // Otherwise, if the session ended:
  else if (params[0] === 'sessionEnd') {
    // Close the messaging connection.
    news.close();
  }
  // Otherwise, if a round started:
  else if (params[0] === 'roundStart') {
    // Change the round ID and organ.
    document.getElementById('roundID').textContent = params[1];
    document.getElementById('roundOrgan').textContent = `${params[2]} ${params[3]}`;
    // Hide the round-end content.
    document.getElementById('roundResultP').classList.add('invisible');
    document.getElementById('readyForm').classList.add('invisible');
  }
  // Otherwise, if a patient was added to the hand:
  else if (params[0] === 'handPatientAdd') {
    // Copy the patient template.
    const handPatientLITemplate = document.getElementById('handPatientLITemplate');
    const newPatientLI = handPatientLITemplate.cloneNode(true);
    newPatientLI.removeAttribute('id');
    // Add the patient description to the button.
    newPatientLI.firstElementChild.innerHTML = patientDigest(params.slice(1));
    // Insert the copy into the hand.
    handPatientLITemplate.before(newPatientLI);
  }
  // Otherwise, if an influence card was added to the hand:
  else if (params[0] === 'handInfluenceAdd') {
    // Copy the influence-card template.
    const handInfluenceLITemplate = document.getElementById('handInfluenceLITemplate');
    const newInfluenceLI = handInfluenceLITemplate.cloneNode(true);
    newInfluenceLI.removeAttribute('id');
    // Add the influence description to the list item.
    newInfluenceLI.firstElementChild.innerHTML = influenceDigest(params.slice(1));
    // Insert the copy into the hand.
    handInfluenceLITemplate.before(newInfluenceLI);
  }
  // Otherwise, if the player was told to choose a patient to replace:
  else if (params[0] === 'replace') {
    // Add this task to the page and enable all the player buttons.
    document.getElementById('patientTask').textContent = 'replace';
    document
    .getElementById('patientForm')
    .querySelectorAll('button')
    .forEach(button => button.setAttribute('disabled', false));
  }
  // Otherwise, if the player was told to choose a patient to bid:
  else if (params[0] === 'bid') {
    // Add this task to the page and enable the eligible player buttons.
    document.getElementById('patientTask').textContent = 'bid';
    document
    .getElementById('patientForm')
    .querySelectorAll('button')
    .forEach((button, index) => {
      if (params.slice(1).includes(index)) {
        button.setAttribute('disabled', false);
      }
    });
  }
  // Otherwise, if the player was offered bids to use an influence card on:
  else if (params[0] === 'influence') {

  }
    else if (['bid', 'swap', 'use'].includes(taskType)) {
      // Replace the next task with a choice form.
      const taskLabelP = document.createElement('p');
      taskDiv.appendChild(taskLabelP);
      taskLabelP.id = 'choiceLabel';
      let cardNum;
      let labelText = 'Bid a patient';
      if (taskType === 'swap') {
        labelText = 'Replace a patient';
      }
      else if (taskType === 'use') {
        cardNum = taskParts.shift();
        labelText = `Keep influence card ${cardNum}, or use it on a bid?`;
        taskParts.unshift('keep');
      }
      taskLabelP.textContent = labelText;
      const choiceForm = document.createElement('form');
      taskDiv.appendChild(choiceForm);
      const buttonsP = document.createElement('p');
      choiceForm.appendChild(buttonsP);
      taskParts.forEach(num => {
        const numButton = document.createElement('button');
        buttonsP.appendChild(numButton);
        numButton.setAttribute('aria-labelledby', 'choiceLabel');
        numButton.textContent = num;
      });
      // When the form is submitted:
      choiceForm.onsubmit = async event => {
        // Prevent a reload.
        event.preventDefault();
        // Disable the form buttons.
        Array.from(buttonsP.querySelectorAll('button')).forEach(button => {
          button.setAttribute('disabled', true);
        });
        // Notify the server.
        const buttonText = event.submitter.textContent;
        let detail;
        if (taskType === 'use') {
          detail = `cardNum=${cardNum}&targetNum=${buttonText}`;
        }
        else {
          detail = `cardNum=${buttonText}`;
        }
        await fetch(
          `${taskType}?sessionCode=${sessionCode}&playerID=${playerID}&${detail}`
        );
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
  // Otherwise, if an influence card was used:
  else if (data.startsWith('use=')) {
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
    // Add the winner to the round summary.
    document.getElementById('winner').textContent = winnerData[1];
  }
  // Otherwise, if a round ended:
  else if (data.startsWith('roundImpact=')) {
    const impactData = rawData.split('\t');
    // Add the round’s impact to the round summary.
    document.getElementById('nextStarter').textContent = impactData[1];
    document.getElementById('final').textContent = impactData[0];
  }
  // Otherwise, if a player approved finishing a round:
  else if (data.startsWith('roundOKd=')) {
    const roundOKData = rawData.split('\t');
    // Update the list of round-end approvers.
    const roundOKP = document.getElementById('roundOKs');
    const okList = roundOKP.textContent;
    roundOKP.textContent = okList ? `${okList} ${roundOKData[0]}` : roundOKData[0];
  }
  // Otherwise, if the time left was updated:
  else if (data.startsWith('timeLeft=')) {
    // Update it in the session stage.
    document.getElementById('timeLeft').textContent = rawData;
  }
};
