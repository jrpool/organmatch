/*
  index.js
  OrganMatch main script.
*/

// ########## IMPORTS

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
// Handles requests.
const requestHandler = (req, res) => {
  const {method} = req;
  const bodyParts = [];
  // Get data on version 01.
  const versionData = require('./getVersion')('01');
  // Initialize data on all current sessions.
  const sessions = {};
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
      // If a session creation was requested.
      if (url === '/create') {
        // Create a session.
        const sessionData = require('./newSession')(versionData);
        const {sessionCode} = sessionData;
        // Add the session data to the data on all current sessions.
        sessions[sessionCode] = sessionData;
        // Serve a session-status page.
        const params = {sessionCode};
        serveTemplate('session', params, res);
      }
    }
    // Otherwise, if the request submitted data:
    else if (method === 'POST') {
      console.log('Method is POST');
    }
  });
};

// ########## SERVER

const protocol = process.env.PROTOCOL;
if (protocol === 'https') {
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
      server.listen(3003);
      console.log('OrganMatch server listening on port 3003 (https://jpdev.pro/organmatch)');
    }
  }
}
else if (protocol === 'http') {
  const server = http.createServer(requestHandler);
  server.listen(3003);
  console.log('OrganMatch server listening on http://localhost:3003');
}
