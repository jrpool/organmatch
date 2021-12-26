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
        newsStreams[sessionCode][userID] = res;
        // If the user later closes the request:
        req.on('close', () => {
          let playerData = {};
          let userNews;
          const sessionData = sessions[sessionCode];
          // If the user is the leader:
          if (userID === 'Leader') {
            userNews = 'The leader';
            // Empty the list of players.
            sessionData.players = {};
          }
          // Otherwise, i.e. if the user is a player:
          else {
            playerData = getPlayers(sessions[sessionCode]);
            userNews = `Player ${userID} (${playerData[userID]})`;
            // Remove the player from the session data.
            delete sessionData.players[userID];
            delete playerData[userID];
          }
          console.log(`${userNews} in session ${sessionCode} has closed the connection`);
          // Delete the user’s news stream.
          delete newsStreams[sessionCode][userID];
          // Send a revised player list to all remaining users.
          const playerList = Object
          .keys(playerData)
          .map(id => `<li>[<span class="mono">${id}</span>] ${playerData[id]}</li>`)
          .join('#newline#');
          Object.keys(newsStreams[sessionCode]).forEach(userID => {
            sendEventMsg(newsStreams[sessionCode][userID], `revision=${playerList}`);
          });
        });
      }
      // Otherwise, if the session was started:
      else if (url.startsWith('/startSession')) {
        const {sessionCode} = params;
        // Notify all users.
        Object.keys(newsStreams[sessionCode]).forEach(userID => {
          sendEventMsg(newsStreams[sessionCode][userID], 'sessionStart=Session started');
        });
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
            // Add the player to the session data.
            const playerID = String.fromCharCode(++playerIDCode);
            require('./addPlayer')(versionData, sessionData, playerID, playerName, 'strategy0');
            const playerIDs = Object.keys(playerData);
            const playerListItems = playerIDs.map(
              playerID => `<li>[<span class="mono">${playerID}</span>] ${playerData[playerID]}</li>`
            );
            const playerList = playerListItems.join('\n');
            // Send the new player’s ID and name to all other players and the leader.
            Object.keys(newsStreams[sessionCode]).forEach(userID => {
              sendEventMsg(
                newsStreams[sessionCode][userID], `addition=${playerID}\t${playerName}`
              );
            });
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
