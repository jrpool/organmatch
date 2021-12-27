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
    sendEventMsg(newsStreams[sessionCode][userID], `${subtype}=${value}`);
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
// Manages a round.
const runRound = sessionData => {
  // Notify all users of the round facts.
  const roundNum = sessionData.roundsEnded;
  const {playerIDs, players} = sessionData;
  const playerCount = playerIDs.length;
  const roundStarterID = roundNum ? sessionData.rounds[roundNum - 1].nextStarterID : playerIDs[0];
  const roundEnderID
    = playerIDs[(playerIDs.indexOf(roundStarterID) + playerCount - 1) % playerCount];
  const roundOrgan = sessionData.piles.organs.latent.shift;
  const roundNewsParts = [
    roundNum,
    roundStarterID,
    players[roundStarterID].playerName,
    roundEnderID,
    players[roundEnderID].playerName,
    roundOrgan.organ,
    roundOrgan.group
  ];
  broadcast(sessionData[sessionData.sessionCode], false, 'round', roundNewsParts.join('\t'));
  sessionData.endTime = (new Date()).toISOString();
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
      const params = parse((new URL(absURL)).search);
      // If a script was requested:
      if (url.endsWith('.js')) {
        serveScript(url.slice(1), res);
      }
      // Otherwise, if the home page was requested:
      else if (['/home', '/'].includes(url)) {
        // Serve it.
        serveTemplate('home', {}, res);
      }
      // Otherwise, if the game documentation was requested:
      else if (url === '/about') {
        // Serve it.
        serveTemplate('about', {}, res);
      }
      // Otherwise, if the session-creation form was requested:
      else if (url === '/createForm') {
        // Serve it.
        serveTemplate('createForm', {}, res);
      }
      // Otherwise, if the session-joining form was requested:
      else if (url.startsWith('/joinForm')) {
        // Serve it.
        serveTemplate('joinForm', {}, res);
      }
      // Otherwise, if adding a news stream was requested:
      else if (url.startsWith('/newsRequest')) {
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
      // Otherwise, if the session was started:
      else if (url.startsWith('/startSession')) {
        const {sessionCode} = params;
        const sessionData = sessions[sessionCode];
        // Set the start time in the session data.
        sessionData.startTime = (new Date()).toISOString();
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
        const {playerIDs} = sessionData;
        const shuffler = playerIDs.map(id => [id, Math.random()]);
        shuffler.sort((a, b) => a[1] - b[1]);
        sessionData.playerIDs = shuffler.map(pair => pair[0]);
        // Notify all users of the shuffling.
        revisePlayerLists(sessionCode);
        // Close the response.
        res.end('Started');
        // Manage rounds.
        while (! sessionData.endTime) {
          runRound(sessionData);
        }
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
