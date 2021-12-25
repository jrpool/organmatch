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

// ########## GLOBAL VARIABLES

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
// Returns an event-stream message reporting an incremented total.
const sendEventMsg = (res, data, eventName, id) => {
  const idLine = id ? `id: ${id}\n` : '';
  const eventLine = eventName ? `event: ${eventName}\n` : '';
  const msg = `${idLine}${eventLine}data: ${data}\n\n`;
  res.write(msg);
};

// ########## SERVER

const {HOST, PORT} = process.env;
const portSuffix = `:${PORT}` || '';
const docRoot = `https://${HOST}${portSuffix}`;
// Initialize the data on all current sessions.
const sessions = {};
// Initialize the SSE responses for player lists.
const newPlayerStreams = [];
// Get data on version 01.
const versionData = require('./getVersion')('01');
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
    // If the request contained no data:
    if (method === 'GET') {
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
        serveTemplate('createForm', {docRoot}, res);
      }
      // Otherwise, if the session-joining form was requested:
      else if (url.startsWith('/joinForm')) {
        // Serve it.
        serveTemplate('joinForm', {docRoot}, res);
      }
      // Otherwise, if a player-list event stream was requested:
      else if (url === '/playerJoined') {
        // Send the stream headers to the client.
        serveEventStart(res);
        // Add the response to the new-player streams.
        newPlayerStreams.push(res);
      }
    }
    // Otherwise, if the request submitted data:
    else if (method === 'POST') {
      // Get the data as a query string.
      const queryString = Buffer.concat(bodyParts).toString();
      // Parse it into a URLSearchParams object.
      const USParams = new URLSearchParams(queryString);
      // Convert it to an object.
      const params = {};
      Array.from(USParams.entries()).forEach(entry => {
        params[entry[0]] = entry[1];
      });
      // If a session creation was requested:
      if (url === '/createSession') {
        // Create a session and get its data.
        const sessionData = require('./createSession')(versionData);
        const {sessionCode} = sessionData;
        const minPlayerCount = versionData.limits.playerCount.min;
        // Add them to the data on all current sessions.
        sessions[sessionCode] = sessionData;
        // Serve a session-status page.
        serveTemplate('leaderStatus', {minPlayerCount, docRoot, sessionCode}, res);
      }
      // Otherwise, if the user asked to join a session:
      else if (url === '/joinSession') {
        const {sessionCode, name} = params;
        // If the session code is valid:
        const sessionCodeOK = Object.keys(sessions).includes(sessionCode);
        if (sessionCodeOK) {
          const sessionData = sessions[sessionCode];
          // If the user is already a player:
          const playerNames = sessionData.players.map(player => player.name);
          if (playerNames.includes(name)) {
            // Serve an error page.
            serveTemplate(
              'error', {error: `${name} is already a player in session ${sessionCode}`}, res
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
            require('./addPlayer')(versionData, sessionData, name, 'strategy0');
            const playerListItems = playerNames.map(name => `<li>${name}</li>`);
            const playerList = playerListItems.join('\n');
            // Send the new player’s name to all other players and the leader.
            newPlayerStreams.forEach(stream => {
              sendEventMsg(stream, name);
            });
            // Serve a session-status page. It will add itself to newPlayerStreams.
            serveTemplate('playerStatus', {sessionCode, playerList}, res);
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
const key = fs.readFileSync(process.env.KEY);
const cert = fs.readFileSync(process.env.CERT);
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
