// playerStatus
const params = JSON.parse(document.getElementById('params').textContent);
// Add the session code and player count limits to the page.
const {sessionCode, playerID, playerData, minPlayerCount, maxPlayerCount} = params;
document.getElementById('sessionCode').textContent = sessionCode;
document.getElementById('minPlayerCount').textContent = minPlayerCount;
document.getElementById('maxPlayerCount').textContent = maxPlayerCount;
// Identify the page elements to be acted on.
const timeLeft = document.getElementById('timeLeft');
const sessionEnd = document.getElementById('sessionEnd');
const whySessionEnded = document.getElementById('whySessionEnded');
const sessionWonBy = document.getElementById('sessionWonBy');
const preStart = document.getElementById('preStart');
const playerOL = document.getElementById('players');
const you = document.getElementById('you');
const patientForm = document.getElementById('patientForm');
const patientTaskLabel = document.getElementById('patientTaskLabel');
const patientTask = document.getElementById('patientTask');
const handPatientLITemplate = document.getElementById('handPatientLITemplate');
const influenceForm = document.getElementById('influenceForm');
const influenceLabel = document.getElementById('influenceLabel');
const influenceLITemplate = document.getElementById('influenceLITemplate');
const influenceNone = document.getElementById('influenceNone');
const playerLITemplate = document.getElementById('playerLITemplate');
const roundInfo = document.getElementById('roundInfo');
const roundH = document.getElementById('roundH');
const roundID = document.getElementById('roundID');
const roundOrgan = document.getElementById('roundOrgan');
const roundResultP = document.getElementById('roundResultP');
const roundResult = document.getElementById('roundResult');
const roundOKButton = roundResultP.querySelector('button');
// Populates and shows a newly added player in the player list.
const populatePlayerLI = (playerLI, id, playerName) => {
  playerLI.removeAttribute('id');
  playerLI.dataset.player = id;
  playerLI.querySelector('.playerID').textContent = id;
  playerLI.querySelector('.playerName').textContent = playerName;
  playerLI.classList.remove('invisible');
};
// Adds another player to the player list.
const addPlayerLI = (playerID, playerName) => {
  const newPlayerLI = playerLITemplate.cloneNode(true);
  playerLITemplate.before(newPlayerLI);
  populatePlayerLI(newPlayerLI, playerID, playerName);
};
// List the players in existence when the page was created.
Object.keys(playerData).forEach(id => {
  if (id === playerID) {
    populatePlayerLI(you, id, playerData[id]);
  }
  else {
    addPlayerLI(id, playerData[id]);
  }
});
// Reinitializes the influence form, leaving existing cards in place.
const influenceClear = () => {
  // Remove the card buttons from the influence form.
  influenceForm.querySelectorAll('li > button').forEach(button => {
    button.remove();
  });
  // Hide the choice content in the form.
  influenceLabel.classList.add('invisible');
  influenceNone.classList.add('invisible');
};
// When the patient form is submitted:
patientForm.onsubmit = async event => {
  // Prevent a reload.
  event.preventDefault();
  // Identify the index of the chosen patient.
  const patientButton = event.submitter;
  const patientButtons = Array.from(
    event.submitter.parentElement.parentElement.querySelectorAll('button')
  );
  const index = patientButtons.findIndex(button => button === patientButton);
  // Remove the selected patient data from the card.
  patientButton.textContent = '';
  // Disable the buttons in the form.
  patientForm.querySelectorAll('button').forEach(button => {
    button.setAttribute('disabled', '');
  });
  // Hide the task.
  patientTaskLabel.classList.add('invisible');
  const task = patientTask.textContent;
  // Reinitialize the influence form.
  influenceClear();
  // Notify the server of the choice.
  await fetch(
    `patient?sessionCode=${sessionCode}&playerID=${playerID}&task=${task}&index=${index}`
  );
};
// When the influence form is submitted:
influenceForm.onsubmit = async event => {
  // Prevent a reload.
  event.preventDefault();
  const influenceButton = event.submitter;
  // If the player waived influence:
  if (influenceButton.id === 'influenceNone') {
    // Reinitialize the form.
    influenceClear();
    // Notify the server of the choice.
    await fetch(`influenceNone?sessionCode=${sessionCode}&playerID=${playerID}`);
  }
  // Otherwise, i.e. if the player exercised influence:
  else {
    // Identify the index of the chosen influence card.
    const influenceCard = influenceButton.parentElement;
    const influenceCards = Array.from(influenceForm.querySelectorAll('li'));
    const index = influenceCards.findIndex(
      card => Array.from(card.querySelectorAll('button')).includes(influenceButton)
    );
    const bidderID = influenceButton.textContent;
    // Remove the used influence card from the hand.
    influenceCard.remove();
    // Reinitialize the form.
    influenceClear();
    // If the only influence cards in the hand were the template and the used card:
    if (influenceCards.length === 2) {
      // Hide the influence form.
      influenceForm.classList.add('invisible');
    }
    // Notify the server of the choice.
    await fetch(
      `influence?sessionCode=${sessionCode}&playerID=${playerID}&index=${index}&bidderID=${bidderID}`
    );
  }
};
// When the round-OK button is activated:
roundOKButton.onclick = async () => {
  // Disable the button.
  roundOKButton.setAttribute('disabled', '');
  // Notify the server.
  await fetch(`roundOK?sessionCode=${sessionCode}&playerID=${playerID}`);
};
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
const influenceDigest = influenceData => {
  const impact = influenceData[1];
  const impactNews = impact.startsWith('-') ? impact : `+${impact}`;
  return `${influenceData[0]}/${impactNews}`;
};
// Returns the list item of a player.
const playerLIOf = id => playerOL.querySelector(`li[data-player=${id}]`);

// MESSAGE HANDLING

// Open a persistent messaging connection to the server.
const news = new EventSource(`newsRequest?sessionCode=${sessionCode}&userID=${playerID}`);
// Processes an event-stream message.
news.onmessage = event => {
  const params = event.data.split(/[=\t]/);
  // If another player disconnected:
  if (params[0] === 'playerDrop') {
    // Remove the player.
    playerLIOf(params[1]).remove();
  }
  // Otherwise, if a player joined:
  else if (params[0] === 'playerAdd') {
    // Append the player to the list.
    addPlayerLI(...params.slice(1));
  }
  // Otherwise, if the players were shuffled:
  else if (params[0] === 'playersShuffled') {
    // Remove the player template.
    playerLITemplate.remove();
    // Reorder the players in the list.
    const playerLIs = {};
    Array.from(playerOL.children).forEach(playerLI => {
      const {player} = playerLI.dataset;
      playerLIs[player] = playerLI;
      playerLI.remove();
    });
    params.slice(1).forEach(playerID => {
      playerOL.insertAdjacentElement('afterbegin', playerLIs[playerID]);
    });
  }
  // Otherwise, if the session started:
  else if (params[0] === 'sessionStart') {
    // Remove the pre-start information from the page.
    preStart.remove();
    // Make the round information visible.
    roundInfo.classList.remove('invisible');
    roundH.classList.remove('invisible');
  }
  // Otherwise, if the session ended:
  else if (params[0] === 'sessionEnd') {
    // Hide the players’ round information.
    playerOL.querySelectorAll('.replaceP, .bidP, .readyP').forEach(infoP => {
      infoP.classList.add('invisible');
    });
    // Hide the player’s hand.
    patientForm.classList.add('invisible');
    influenceForm.classList.add('invisible');
    // Add and show the session-end information.
    whySessionEnded.textContent = params[1];
    sessionWonBy.textContent = params[2];
    sessionEnd.classList.remove('invisible');
    // Close the messaging connection.
    news.close();
  }
  // Otherwise, if a round started:
  else if (params[0] === 'roundStart') {
    // Change the round ID and organ.
    roundID.textContent = params[1];
    roundOrgan.innerHTML = `${params[2]} ${params[3]}`;
    // Hide the round-end content and re-enable its approval button.
    roundResult.textContent = '';
    roundResultP.classList.add('invisible');
    roundOKButton.removeAttribute('disabled');
    // Remove and hide the player round information.
    playerOL.querySelectorAll('.bid, .bidNet').forEach(infoSpan => {
      infoSpan.textContent = '';
    });
    playerOL.querySelectorAll('.bidInfluences').forEach(influenceSpan => {
      influenceSpan.textContent = 'none';
    });
    playerOL.querySelectorAll('.replaceP, .bidP, .readyP').forEach(infoP => {
      infoP.classList.add('invisible');
    });
  }
  // Otherwise, if a turn started:
  else if (params[0] === 'turnStart') {
    // Mark the turn player with a style.
    const turnPlayerBox = playerOL.querySelector(`.playerBox[data-player=${params[1]}]`);
    turnPlayerBox.classList.add('deciding');
    // If the turn player is another player:
    if (params[1] !== playerID) {
      // Mark the turn player with a label.
      turnPlayerBox.querySelector('.deciding').classList.remove('invisible');
    }
  }
  // Otherwise, if a patient was added to the hand:
  else if (params[0] === 'handPatientAdd') {
    const newPatient = patientDigest(params.slice(2));
    // If the new patient is to be appended:
    if (params[1] === 'end') {
      // Copy the patient template.
      const newPatientLI = handPatientLITemplate.cloneNode(true);
      newPatientLI.removeAttribute('id');
      // Add the patient description to the button.
      newPatientLI.firstElementChild.innerHTML = newPatient;
      // Make the patient visible.
      newPatientLI.classList.remove('invisible');
      // Insert the copy into the hand.
      handPatientLITemplate.before(newPatientLI);
      // Ensure that the patient form is visible.
      patientForm.classList.remove('invisible');
    }
    // Otherwise, i.e. if the new patient is to replace an existing one:
    else {
      // Replace the existing button’s content with the new patient.
      patientForm
      .querySelector(`fieldset > ul > li:nth-child(${Number.parseInt(params[1]) + 1}) > button`)
      .innerHTML = newPatient;
    }
  }
  // Otherwise, if an influence card was added to the hand:
  else if (params[0] === 'handInfluenceAdd') {
    // Copy the influence-card template.
    const newInfluenceLI = influenceLITemplate.cloneNode(true);
    newInfluenceLI.removeAttribute('id');
    // Add the influence description to the list item.
    newInfluenceLI.firstElementChild.innerHTML = influenceDigest(params.slice(1));
    // Insert the copy into the hand.
    influenceLITemplate.before(newInfluenceLI);
    // Make the the influence card and the influence form visible.
    newInfluenceLI.classList.remove('invisible');
    influenceForm.classList.remove('invisible');
  }
  // Otherwise, if the player was told to choose a patient to replace:
  else if (params[0] === 'chooseReplace') {
    // Add this task to the page and enable all the player buttons.
    patientTask.textContent = 'replace';
    patientForm.querySelectorAll('button').forEach(button => {
      button.removeAttribute('disabled');
    });
    // Show the task.
    patientTaskLabel.classList.remove('invisible');
  }
  // Otherwise, if the player was told to choose a patient to bid:
  else if (params[0] === 'chooseBid') {
    // Add this task to the page and enable the eligible player buttons.
    patientTask.textContent = 'bid';
    const paramNums = params.slice(1).map(param => Number.parseInt(param));
    patientForm.querySelectorAll('button').forEach((button, index) => {
      if (paramNums.includes(index)) {
        button.removeAttribute('disabled');
      }
    });
    // Show the task.
    patientTaskLabel.classList.remove('invisible');
  }
  // Otherwise, if the player was offered bids to use an influence card on:
  else if (params[0] === 'chooseInfluence') {
    // Enable the eligible buttons for the influence card.
    influenceLabel.classList.remove('invisible');
    const influenceLI = influenceForm.querySelector(
      `li:nth-child(${Number.parseInt(params[1]) + 1})`
    );
    params.slice(2).forEach(bidderID => {
      const bidButton = document.createElement('button');
      bidButton.class = 'bidButton';
      bidButton.textContent = bidderID;
      influenceLI.insertAdjacentElement('beforeend', bidButton);
    });
    influenceNone.classList.remove('invisible');
  }
  // Otherwise, if a bid was made:
  else if (params[0] === 'didBid') {
    // Show it, with no influences and an unchanged net priority.
    const player = playerLIOf(params[1]);
    const patient = patientDigest(params.slice(2));
    player.querySelector('.bid').innerHTML = patient;
    player.querySelector('.bidInfluences').textContent = 'none';
    player.querySelector('.bidNet').textContent = params[7];
    player.querySelector('.bidP').classList.remove('invisible');
  }
  // Otherwise, if a replacement was made:
  else if (params[0] === 'didReplace') {
    // Show it.
    const player = playerLIOf(params[1]);
    const replaceP = player.querySelector('.replaceP');
    if (replaceP) {
      replaceP.classList.remove('invisible');
    }
  }
  // Otherwise, if an influence card was used:
  else if (params[0] === 'didInfluence') {
    // Show it and the bid’s resulting net priority.
    const bidderLI = playerLIOf(params[2]);
    const influenceSpan = bidderLI.querySelector('.bidInfluences');
    const netSpan = bidderLI.querySelector('.bidNet');
    const oldContent = influenceSpan.textContent;
    const addedContent = `${params[3]}(${params[1]})`;
    const wholeContent = oldContent === 'none' ? addedContent : `${oldContent}, ${addedContent}`;
    influenceSpan.textContent = wholeContent;
    netSpan.textContent = params[4];
  }
  // Otherwise, if a turn ended:
  else if (params[0] === 'turnEnd') {
    // Remove any prior indicator of the turn player.
    const priorDecider = playerOL.querySelector('.playerBox.deciding');
    if (priorDecider) {
      priorDecider.classList.remove('deciding');
      const decidingP = priorDecider.querySelector('.deciding');
      if (decidingP) {
        decidingP.classList.add('invisible');
      }
    }
  }
  // Otherwise, if a round ended without a winner:
  else if (params[0] === 'roundEnd') {
    // Update the round result and show the approval button.
    roundResult.textContent = 'No winner';
    roundResultP.classList.remove('invisible');
  }
  // Otherwise, if a player won a round:
  else if (params[0] === 'roundWinner') {
    // Update the round result and the winner’s score and show the approval button.
    document.getElementById('roundResult').textContent = `Won by player ${params[2]}`;
    document.getElementById('roundResultP').classList.remove('invisible');
    const winnerLI = playerLIOf(params[2]);
    winnerLI.querySelector('.roundsWon').textContent = params[3];
  }
  // Otherwise, if a player approved finishing a round:
  else if (params[0] === 'roundOKd') {
    const approverLI = playerLIOf(params[1]);
    const readyP = approverLI.querySelector('.readyP');
    // If the player is another player:
    if (readyP) {
      // Show this.
      readyP.classList.remove('invisible');
    }
  }
  // Otherwise, if the time left (in minutes) was updated:
  else if (params[0] === 'timeLeft') {
    // Update it.
    timeLeft.textContent = params[1];
  }
};
