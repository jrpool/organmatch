// leaderStatus
const params = JSON.parse(document.getElementById('params').textContent);
// Add the session code and player count limits to the page.
const {proxy, sessionCode, minPlayerCount, maxPlayerCount} = params;
const minPlayerCountNum = Number.parseInt(minPlayerCount);
const joinLink = document.getElementById('joinLink');
joinLink.href = joinLink.textContent = `${proxy}joinForm?sessionCode=${sessionCode}`;
document.getElementById('sessionCode').textContent = sessionCode;
document.getElementById('minPlayerCount').textContent = minPlayerCount;
document.getElementById('maxPlayerCount').textContent = maxPlayerCount;
// Identify the page elements to be acted on.
const preStart = document.getElementById('preStart');
const postStart = document.getElementById('postStart');
const playerOL = document.getElementById('players');
const playerLITemplate = document.getElementById('playerLITemplate');
const startSession = document.getElementById('startSession');
const timeLeft = document.getElementById('timeLeft');
const sessionEnd = document.getElementById('sessionEnd');
const whySessionEnded = document.getElementById('whySessionEnded');
const sessionWonBy = document.getElementById('sessionWonBy');
const stage = document.getElementById('stage');
const roundID = document.getElementById('roundID');
// Populates and shows a newly added player in the player list.
const populatePlayerLI = (playerLI, id, playerName) => {
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
// Returns the list item of a player.
const playerLI = id => playerOL.querySelector(`[data-playerID=${id}]`);
// Manages the visibility of the start-session button.
const startable = () => {
  // If the start-session button has not been permanently removed:
  if (startSession) {
    // If the count of players is the minimum permitted:
    if (playerOL.childElementCount - 1 >= minPlayerCountNum) {
      // Show the start-session button.
      startSession.classList.remove('invisible');
    }
    // Otherwise, i.e. if the count is less than the minimum:
    else {
      // Hide the start-session button.
      startSession.classList.add('invisible');
    }
  }
};
// When the start-session form is submitted:
startSession.onsubmit = async event => {
  // Prevent a reload.
  event.preventDefault();
  // Notify the server.
  await fetch(`startSession?sessionCode=${sessionCode}`);
  // Permanently remove the prestart information and the start-session form.
  preStart.remove();
  startSession.remove();
  // Make the post-start facts visible.
  postStart.classList.remove('invisible');
};

// MESSAGE HANDLING

// Open a persistent messaging connection to the server.
const news = new EventSource(`newsRequest?sessionCode=${sessionCode}&userID=Leader`);
// Processes an event-stream message.
news.onmessage = event => {
  const params = event.data.split(/[=\t]/);
  // If a player disconnected:
  if (params[0] === 'playerDrop') {
    // Remove the player.
    playerLI(params[1]).remove();
    // If this decreased the player count to less than the minimum, hide the start button.
    startable();
  }
  // Otherwise, if a player joined:
  else if (params[0] === 'playerAdd') {
    // Append the player to the list.
    addPlayerLI(...params.slice(1));
    // If this increased the player count to the minimum, show the start button.
    startable();
  }
  // Otherwise, if the session started:
  else if (params[0] === 'sessionStart') {
    // Remove the pre-start information from the page.
    preStart.remove();
  }
  // Otherwise, if the session ended:
  else if (params[0] === 'sessionEnd') {
    // Update the stage information.
    stage.textContent = 'Ended';
    // Add and show the session-end information.
    whySessionEnded.textContent = params[1];
    sessionWonBy.textContent = params[2];
    sessionEnd.classList.add('invisible');
    // Close the messaging connection.
    news.close();
  }
  // Otherwise, if a round started:
  else if (params[0] === 'roundStart') {
    // Change the round ID.
    roundID.textContent = params[1];
  }
  // Otherwise, if the time left was updated:
  else if (params[0] === 'timeLeft') {
    // Update it.
    timeLeft.textContent = params[1];
  }
};
