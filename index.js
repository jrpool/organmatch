/*
  index.js
  OrganMatch main script.
*/

// ########## IMPORTS

// Module to keep secrets local.
require('dotenv').config();
// Module to access files.
const fs = require('fs').promises;
// Module to create a web server.
const http = require('http');
// Module to make HTTPS requests.
const https = require('https');
/*
// Module to parse request bodies.
const {parse} = require('querystring');
// Module to create a websockets server.
const ws = require('ws');
*/

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

// ########## SERVER

const {PROTOCOL, HOST, PORT} = process.env;
const portSuffix = `:${PORT}` || '';
const docRoot = `${PROTOCOL}://${HOST}${portSuffix}`;
const sessions = {};
// Handles requests.
const requestHandler = (req, res) => {
  const {method} = req;
  const bodyParts = [];
  // Get data on version 01.
  const versionData = require('./getVersion')('01');
  // Initialize data on all current sessions.
  req.on('error', err => {
    console.error(`${err.message}\n${err.stack}`);
  })
  .on('data', chunk => {
    bodyParts.push(chunk);
  })
  .on('end', () => {
    const {url} = req;
    // If the request contained no data:
    if (method === 'GET') {
      // If the home page was requested:
      if (url === '/home') {
        // Serve it.
        serveTemplate('home', {docRoot}, res);
      }
      // Otherwise, if the game documentation was requested:
      else if (url === '/about') {
        // Serve it.
        serveTemplate('about', {docRoot}, res);
      }
      // Otherwise, if the session-creation form was requested:
      else if (url === '/createForm') {
        // Serve it.
        serveTemplate('createSession', {docRoot}, res);
      }
      // Otherwise, if the session-joining form was requested:
      else if (url === '/joinForm') {
        // Serve it.
        serveTemplate('joinForm', {docRoot}, res);
      }
      // Otherwise, if a session creation was requested:
      else if (url === '/createSession') {
        // Get a code for the session.
        const sessionData = require('./createSession')(versionData);
        const {sessionCode} = sessionData;
        // Add the session data to the data on all current sessions.
        sessions[sessionCode] = sessionData;
        console.log(`Created. Count of current sessions: ${Object.keys(sessions).length}`);
        // Serve a session-status page.
        serveTemplate('leaderStatus', {docRoot, sessionCode}, res);
      }
    }
    // Otherwise, if the request submitted data:
    else if (method === 'POST') {
      // If the user asked to join a session:
      if (url === '/joinSession') {
        console.log('A user asked to join a session');
      }
      console.log('Method is POST');
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
