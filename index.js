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
const http = require('http');
// Module to make HTTPS requests.
const https = require('https');

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
  res.setHeader('Connection', 'keep-alive');
};
// Returns an event-stream message reporting an incremented total.
const sendEventMsg = (res, eventName, data) => {
  const eventLine = eventName ? `event: ${eventName}\n` : '';
  const msg = `${eventLine}data: ${data}\n\n`;
  res.write(msg);
};

// ########## SERVER

const {PROTOCOL, HOST, PORT} = process.env;
const portSuffix = `:${PORT}` || '';
const docRoot = `${PROTOCOL}://${HOST}${portSuffix}`;
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
        // Add the response to the list of new-player streams.
        newPlayerStreams.push(res);
      }
    }
    // Otherwise, if the request submitted data:
    else if (method === 'POST') {
      // Get the data as a query string.
      const queryString = Buffer.concat(bodyParts).toString();
      // Parse it into a URLSearchParams object.
      const params = new URLSearchParams(queryString);
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
        // If the session code is valid:
        const sessionCode = params.has('sessionCode') ? params.get('sessionCode') : '';
        const name = params.get('name');
        if (Object.values(sessions).map(session => session.sessionCode).includes(sessionCode)) {
          // Add the player to the session data.
          require('./addPlayer')(versionData, sessions[sessionCode], name, 'strategy0');
          // Identify a list of the players who have joined.
          const playerNames = sessions[sessionCode].players.map(player => player.name);
          const playerListItems = playerNames.map(name => `<li>${name}</li>`);
          const nowPlayerList = playerListItems.join('\n');
          // Send the new player’s name to all existing players and the leader.
          newPlayerStreams.forEach(stream => {
            sendEventMsg(stream, null, name);
          });
          // Serve a session-status page.
          serveTemplate('playerStatus', {sessionCode, nowPlayerList}, res);
        }
        // Otherwise, i.e. if the session code is invalid:
        else {
          // Serve an error page.
          serveTemplate('errorSessionCode', {}, res);
        }
      }
    }
  });
};
if (PROTOCOL === 'https') {
  const key = fs.readFileSync(process.env.KEY);
  const cert = fs.readFileSync(process.env.CERT);
  if (key && cert) {
    const server = https.createServer(
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
}
else if (PROTOCOL === 'http') {
  const server = http.createServer(requestHandler);
  server.listen(PORT);
  console.log(`OrganMatch server listening on http://${HOST}`);
}
