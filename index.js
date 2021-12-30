/*
  index.js
  OrganMatch main script.
*/

// ########## IMPORTS

// Module to keep secrets local.
require('dotenv').config();
// Module to access files.
const fs = require('fs');
// Module to create a web server.
const http2 = require('http2');

// ########## GLOBAL CONSTANTS
const {HOST, PORT} = process.env;
const portSuffix = `:${PORT}` || '';
const docRoot = `https://${HOST}${portSuffix}`;
// Data on all current sessions.
const sessions = {};
// SSE responses for player lists.
const newsStreams = {};
// Data on version 01.
const versionData = require('./getVersion')('01');
const key = fs.readFileSync(process.env.KEY);
const cert = fs.readFileSync(process.env.CERT);

// ########## GLOBAL VARIABLES
// Character code of the most recently joined player.
let playerIDCode = 64;

// ########## FUNCTIONS

// Serves a page.
const serveTemplate = (name, params, res) => {
  res.setHeader('Content-Type', 'text/html');
  const template = fs.readFileSync(`${name}.html`, 'utf8');
  const style = fs.readFileSync('style.css', 'utf8');
  const styledTemplate = template.replace('__style__', `<style>\n${style}\n</style>`);
  const page = styledTemplate.replace('__params__', JSON.stringify(params));
  res.write(page);
  res.end();
};
// Serves a script.
const serveScript = (name, res) => {
  res.setHeader('Content-Type', 'text/javascript');
  const script = fs.readFileSync(name, 'utf8');
  res.write(script);
  res.end();
};
// Prepares to serve an event stream.
const serveEventStart = res => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
};
// Returns an event-stream message.
const sendEventMsg = (res, data) => {
  const msg = `data: ${data}\n\n`;
  res.write(msg);
};
// Parses a query string into a query-parameters object.
const parse = queryString => {
  // Parse the query string into a URLSearchParams object.
  const USParams = new URLSearchParams(queryString);
  // Convert it to an object.
  const params = {};
  Array.from(USParams.entries()).forEach(entry => {
    params[entry[0]] = entry[1];
  });
  return params;
};
// Returns an object describing player IDs and names.
const getPlayers = sessionData => {
  const data = {};
  const {players} = sessionData;
  Object.keys(players).forEach(playerID => {
    data[playerID] = players[playerID].playerName;
  });
  return data;
};
// Broadcasts messages to clients.
const broadcast = (sessionCode, onlyPlayers, subtype, value) => {
  Object.keys(newsStreams[sessionCode]).forEach(userID => {
    if (! onlyPlayers || userID !== 'Leader') {
      sendEventMsg(newsStreams[sessionCode][userID], `${subtype}=${value}`);
    }
  });
};
// Notifies all users of a revised list of players.
const revisePlayerLists = sessionCode => {
  const sessionData = sessions[sessionCode];
  const {playerIDs} = sessionData;
  const playerData = getPlayers(sessionData);
  const playerList = playerIDs
  .map(id => `<li>[<span class="mono">${id}</span>] ${playerData[id]}</li>`)
  .join('#newline#');
  broadcast(sessionCode, false, 'revision', playerList);
};
// Returns whether a patient matches an organ.
const isMatch = (organ, patient) => {
  const isGroupMatch = organ.group === patient.group;
  if (isGroupMatch) {
    return patient.organNeed.map(need => need.organ).includes(organ.organ);
  }
  else {
    return false;
  }
};
// Returns specifications for a turn player’s next move.
const nextMove = (influenceLimits, round, hand, moveNum) => {
  // If the next move is an influence use:
  if (moveNum) {
    return '';
  }
  // Otherwise, i.e. if the next move is a patient bid action:
  else {
    const {patients} = hand;
    const matchNums = patients
    .map((patient, index) => isMatch(round.roundOrgan, patient) ? index + 1 : 0)
    .filter(index => index);
    // If there are any matches between patients and the organ:
    if (matchNums.length) {
      // Return the bid specifications.
      return `bid\t${matchNums.join('\t')}`;
    }
    // Otherwise, i.e. if there are no patient matches:
    else {
      // Return the replacement specifications.
      const patientNums = patients.map((patient, index) => index + 1);
      return `swap\t${patientNums.join('\t')}`;
    }
  }
};
// Returns a date-time string.
const nowString = () => (new Date()).toISOString();
// Starts a turn.
const startTurn = sessionData => {
  // Notify all users of the turn facts.
  const round = sessionData.rounds[sessionData.roundsEnded];
  const turnNum = round.turnsEnded;
  const turnPlayerID = turnNum
    ? round.turns[turnNum - 1].turnPlayer.playerID
    : round.roundStarterID;
  const turn = {
    turnNum,
    turnPlayerID,
    startTime: nowString(),
    endTime: null
  };
  round.turns.push(turn);
  const {sessionCode} = sessionData;
  broadcast(sessionCode, false, 'turn', `${turnNum}\t: current`);
  if (turnNum) {
    broadcast(sessionCode, false, 'turn', `${turnNum - 1}\t: done`);
  }
  // For each player:
  sessionData.playerIDs.forEach(id => {
    // If the player is the turn player:
    if (id === turnPlayerID) {
      // Notify the leader and the player of the player’s next task.
      const moveSpec = nextMove(
        versionData.limits.influences, round, sessionData.players[id].hand.current, 0
      );
      const taskMsg = `task=${moveSpec}`;
      sendEventMsg(newsStreams[sessionCode].Leader, taskMsg);
      sendEventMsg(newsStreams[sessionCode][id], taskMsg);
    }
    // Otherwise, i.e. if the player is not the turn player:
    else {
      // Notify the player of the player’s task.
      sendEventMsg(newsStreams[sessionCode][id], 'task=wait');
    }
  });
};
// Starts a round.
const startRound = sessionData => {
  // Notify all users of the round facts.
  const roundNum = sessionData.roundsEnded;
  const {sessionCode, playerIDs} = sessionData;
  const playerCount = playerIDs.length;
  const roundStarterID = roundNum ? sessionData.rounds[roundNum - 1].nextStarterID : playerIDs[0];
  const starterIndex = playerIDs.indexOf(roundStarterID);
  const roundEnderID = playerIDs[(starterIndex + playerCount - 1) % playerCount];
  const roundOrgan = sessionData.piles.organs.latent.shift();
  const roundNewsParts = [roundNum, roundOrgan.organ, roundOrgan.group];
  broadcast(sessionCode, false, 'round', roundNewsParts.join('\t'));
  const turnPlayerIDs = playerIDs.slice(starterIndex).concat(playerIDs.slice(0, starterIndex));
  turnPlayerIDs.forEach((id, index) => {
    broadcast(sessionCode, false, 'turnInit', `${index}\t${id}`);
  });
  // Initialize a round record and add it to the session data.
  sessionData.rounds.push({
    roundNum,
    startTime: nowString(),
    endTime: null,
    roundStarterID,
    roundEnderID,
    roundOrgan,
    winner: {
      playerID: null,
      playerName: null
    },
    nextStarterID: null,
    turnsEnded: 0,
    turns: [],
    bids: []
  });
  // Start the first turn.
  startTurn(sessionData);
};
// Ends a round.
const endRound = sessionData => {
  const round = sessionData.rounds[sessionData.roundsEnded];
  round.endTime = nowString();
  sessionData.roundsEnded++;
};
// Ends a turn.
const endTurn = sessionData => {
  const round = sessionData.rounds[sessionData.roundsEnded];
  const turnNum = round.turnsEnded;
  const turn = round.turns[turnNum];
  // Add the turn’s end time to the session data.
  turn.endTime = nowString();
  // Increment the turn count in the session data.
  round.turnsEnded++;
  // If the round’s turns are not yet exhausted:
  if (turnNum < sessionData.playerIDs.length) {
    // Start the next turn.
    startTurn(sessionData);
  }
  // Otherwise, i.e. if this was the last turn in the round:
  else {
    // End the round.
    endRound(sessionData);
  }
};
// Returns the specification of a patient.
const patientSpec = patient => {
  const {organNeed, group, priority} = patient;
  const organ0 = organNeed[0].organ;
  const qP0 = organNeed[0].queuePosition;
  const needCount = organNeed.length === 2;
  const organ1 = needCount ? organNeed[1].organ : '';
  const qP1 = needCount ? organNeed[1].queuePosition : '';
  return [organ0, qP0, organ1, qP1, group, priority];
};
// Handles requests.
const requestHandler = (req, res) => {
  const {method} = req;
  const bodyParts = [];
  req.on('error', err => {
    console.error(`${err.message}\n${err.stack}`);
  })
  .on('data', chunk => {
    bodyParts.push(chunk);
  })
  .on('end', () => {
    let {url} = req;
    if (url.startsWith('/organmatch')) {
      url = url.replace(/^\/organmatch/, '') || '/';
    }
    if (url.endsWith('?')){
      url = url.substring(0, url.length - 1);
    }
    // If the request method was GET:
    if (method === 'GET') {
      // Get any query parameters as an object.
      const absURL = `https://${process.env.HOST}:${process.env.PORT}${url}`;
      const urlBase = url.replace(/^\/|\?.+/g, '');
      const params = parse((new URL(absURL)).search);
      // If a script was requested:
      if (url.endsWith('.js')) {
        // Serve it.
        serveScript(url.slice(1), res);
      }
      // Otherwise, if the home page was requested:
      else if (['home', ''].includes(urlBase)) {
        // Serve it.
        serveTemplate('home', {}, res);
      }
      // Otherwise, if the game documentation was requested:
      else if (urlBase === 'about') {
        // Serve it.
        serveTemplate('about', {}, res);
      }
      // Otherwise, if the session-creation form was requested:
      else if (urlBase === 'createForm') {
        // Serve it.
        serveTemplate('createForm', {}, res);
      }
      // Otherwise, if the session-joining form was requested:
      else if (urlBase === 'joinForm') {
        // Serve it.
        serveTemplate('joinForm', {}, res);
      }
      // Otherwise, if adding a news stream was requested:
      else if (urlBase === 'newsRequest') {
        const {sessionCode, userID} = params;
        // Send the stream headers to the client.
        serveEventStart(res);
        // Add the response to the news streams.
        const sessionStreams = newsStreams[sessionCode];
        sessionStreams[userID] = res;
        // If the user later closes the request:
        req.on('close', () => {
          // Delete the user’s news stream.
          delete sessionStreams[userID];
          const sessionData = sessions[sessionCode];
          let userNews;
          // If the user was the leader:
          if (userID === 'Leader') {
            userNews = 'The leader';
            // Notify all users.
            broadcast(sessionCode, false, 'sessionStage', 'Aborted');
          }
          // Otherwise, i.e. if the user was a player:
          else {
            userNews = `Player ${userID} (${sessionData.players[userID].playerName})`;
            // Remove the player from the session data.
            delete sessionData.players[userID];
            const {playerIDs} = sessionData;
            playerIDs.splice(playerIDs.indexOf(userID), 1);
            // Notify all users.
            revisePlayerLists(sessionCode);
          }
          console.log(`${userNews} in session ${sessionCode} has closed the connection`);
        });
      }
      // Otherwise, if the session was started by the leader:
      else if (urlBase === 'startSession') {
        const {sessionCode} = params;
        const sessionData = sessions[sessionCode];
        // Set the start time in the session data.
        sessionData.startTime = nowString();
        // Notify all users.
        const creationTime = (new Date(sessionData.creationTime)).getTime();
        const minutesElapsed = Math.round(((Date.now() - creationTime)) / 60000);
        const minutesLeft = versionData.limits.sessionTime.max - minutesElapsed;
        broadcast(
          sessionCode,
          false,
          'sessionStage',
          `Started; players shuffled; ${minutesLeft} minutes left`
        );
        // Shuffle the player IDs in the session data.
        const shuffler = sessionData.playerIDs.map(id => [id, Math.random()]);
        shuffler.sort((a, b) => a[1] - b[1]);
        sessionData.playerIDs = shuffler.map(pair => pair[0]);
        // Notify all users of the shuffling.
        revisePlayerLists(sessionCode);
        // For each player:
        sessionData.playerIDs.forEach((id, index) => {
          // For each patient card in the player’s hand:
          const {patients} = sessionData.players[id].hand.initial;
          patients.forEach(patient => {
            // Notify the player of the cards in the player’s hand.
            const news = patientSpec(patient).join('\t');
            sendEventMsg(newsStreams[sessionCode][id], `handPatientAdd=${news}`);
            // If the player is the session’s starter:
            if (index === 0) {
              // Notify the leader of the cards in the player’s hand.
              sendEventMsg(newsStreams[sessionCode].Leader, `handPatientAdd=${news}`);
            }
          });
        });
        // Close the response, allowing updates to the leader page.
        res.end(`Session ${sessionCode} started`);
        // Start the first round.
        startRound(sessionData);
      }
      // Otherwise, if a bid or replacement was made:
      else if (['bid', 'swap'].includes(urlBase)) {
        const {sessionCode, playerID, patientNum} = params;
        const sessionData = sessions[sessionCode];
        // If the move was a bid:
        if (urlBase === 'bid') {
          // Notify all users of the bid.
          const patient = sessionData.players[playerID].hand.current.patients[patientNum - 1];
          const bidNews = `Bid by ${playerID}: ${patientSpec(patient).join('\t')}`;
          broadcast(sessionCode, false, 'bidAdd', bidNews);
        }
        // Draw a patient to replace the lost patient.
        const newPatient = sessionData.piles.patients.shift();
        sessionData.players[playerID].hand.current.patients[patientNum - 1] = newPatient;
        // Notify the player and the leader of the replacement.
        const replacementNews = [patientNum].concat(patientSpec(newPatient)).join('\t');
        const replacementMsg = `handPatientReplace=${replacementNews}`;
        sendEventMsg(newsStreams[sessionCode][playerID], replacementMsg);
        sendEventMsg(newsStreams[sessionCode].Leader, replacementMsg);
        // End the turn and start the next turn or round.
        endTurn(sessionData);
        // Close the response.
        res.end();
      }
    }
    // Otherwise, if the request method was POST:
    else if (method === 'POST') {
      // Get the data as an object.
      const params = parse(Buffer.concat(bodyParts).toString());
      // If a session creation was requested:
      if (url === '/createSession') {
        // Create a session and get its data.
        const sessionData = require('./createSession')(versionData);
        const {sessionCode} = sessionData;
        const minPlayerCount = versionData.limits.playerCount.min;
        // Add them to the data on all current sessions.
        sessions[sessionCode] = sessionData;
        // Initialize the new-player streams for the session.
        newsStreams[sessionCode] = {};
        // Serve a session-status page.
        serveTemplate('leaderStatus', {minPlayerCount, docRoot, sessionCode}, res);
      }
      // Otherwise, if the user asked to join a session:
      else if (url === '/joinSession') {
        const {sessionCode, playerName} = params;
        // If the session code is valid:
        const sessionCodeOK = Object.keys(sessions).includes(sessionCode);
        if (sessionCodeOK) {
          const sessionData = sessions[sessionCode];
          // If the user is already a player:
          const playerData = getPlayers(sessionData);
          const playerNames = Object.values(playerData);
          if (playerNames.includes(playerName)) {
            // Serve an error page.
            serveTemplate(
              'error', {error: `${playerName} is already a player in session ${sessionCode}`}, res
            );
          }
          // Otherwise, if no more players are permitted:
          else if (playerNames.length === versionData.limits.playerCount.max) {
            // Serve an error page.
            serveTemplate(
              'error', {error: `Joining session ${sessionCode} would give it too many players`}, res
            );
          }
          // Otherwise, if the session has already started:
          else if (sessionData.startTime) {
            // Serve an error page.
            serveTemplate('error', {error: `Session ${sessionCode} has already started`}, res);
          }
          // Otherwise, i.e. if the user is permitted to join the session:
          else {
            // Assign an ID to the player.
            const playerID = String.fromCharCode(++playerIDCode);
            // Send the new player’s ID and name to all other players and the leader.
            broadcast(sessionCode, false, 'addition', `${playerID}\t${playerName}`);
            // Add the player to the session data.
            require('./addPlayer')(versionData, sessionData, playerID, playerName, '');
            const {playerIDs} = sessionData;
            const playerListItems = playerIDs.map(
              playerID => {
                const {playerName} = sessionData.players[playerID];
                return `<li>[<span class="mono">${playerID}</span>] ${playerName}</li>`;
              }
            );
            const playerList = playerListItems.join('\n');
            // Serve a session-status page.
            serveTemplate('playerStatus', {sessionCode, playerList, playerID, playerName}, res);
          }
        }
        // Otherwise, i.e. if the session code is invalid:
        else {
          // Serve an error page.
          serveTemplate(
            'error', {error: `There is no session with code <q>${sessionCode}</q>`}, res
          );
        }
      }
    }
  });
};

// ########## SERVER

if (key && cert) {
  const server = http2.createSecureServer(
    {
      key,
      cert
    },
    requestHandler
  );
  if (server) {
    server.listen(PORT);
    console.log(`OrganMatch server listening on port ${PORT} (https://${HOST}/organmatch)`);
  }
}
