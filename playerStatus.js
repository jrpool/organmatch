// playerStatus
const params = JSON.parse(document.getElementById('params').textContent);
// Add the session code, player name, player list, and player count limits to the page.
const {sessionCode, playerID, playerName, minPlayerCount, maxPlayerCount} = params;
document.getElementById('sessionCode').textContent = sessionCode;
document.getElementById('playerID').textContent = playerID;
document.getElementById('playerName').textContent = playerName;
const playerOL = document.getElementById('playerList');
playerOL.innerHTML = params.playerList;
document.getElementById('minPlayerCount').textContent = minPlayerCount;
document.getElementById('maxPlayerCount').textContent = maxPlayerCount;
// Open a persistent messaging connection to the server.
const news = new EventSource(`newsRequest?sessionCode=${sessionCode}&userID=${playerID}`);
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
// Processes an event-stream message.
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
    // If the change was a session start:
    if (rawData.startsWith('Started')) {
      // Remove the starting information from the page.
      document.getElementById('startInfo').remove();
      // Make the post-start facts visible.
      document.getElementById('afterStart').classList.remove('invisible');
    }
    // Otherwise, if the new stage is completion:
    else if (rawData.startsWith('Ended')) {
      // Remove the after-start content.
      document.getElementById('afterStart').textContent = '';
      // Close the messaging connection.
      news.close();
    }
  }
  // Otherwise, if the round changed:
  else if (data.startsWith('round=')) {
    // Change the round and the round-dependent facts.
    const roundData = rawData.split('\t');
    document.getElementById('round').textContent = roundData[0];
    document.getElementById('organ').textContent = `${roundData[1]} (${roundData[2]})`;
    ['bids', 'turns', 'roundOKs', 'nextStarter', 'final'].forEach(id => {
      document.getElementById(id).textContent = '';
    });
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
    // Otherwise, if it is to approve ending a round:
    else if (taskType === 'roundOK') {
      // Replace the next task with an approval form.
      const taskLabelP = document.createElement('p');
      taskDiv.appendChild(taskLabelP);
      taskLabelP.id = 'roundOKLabel';
      taskLabelP.textContent = 'Round ended. When you have reviewed the results, press the button.';
      const roundOKForm = document.createElement('form');
      taskDiv.appendChild(roundOKForm);
      const buttonP = document.createElement('p');
      roundOKForm.appendChild(buttonP);
      const roundOKButton = document.createElement('button');
      buttonP.appendChild(roundOKButton);
      roundOKButton.setAttribute('aria-labelledby', 'roundOKLabel');
      roundOKButton.textContent = 'OK to proceed';
      // When the form is submitted:
      roundOKForm.onsubmit = async event => {
        // Prevent a reload.
        event.preventDefault();
        // Disable the approval button.
        roundOKButton.setAttribute('disabled', true);
        // Notify the server.
        await fetch(`roundOK?sessionCode=${sessionCode}&playerID=${playerID}`);
      };
    }
    // Otherwise, if it is to choose a player to bid or replace or an influence card to act on:
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
