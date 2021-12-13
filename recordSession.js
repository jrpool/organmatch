/*
  recordSession
  Records a session of OrganMatch.
  Arguments:
  0: session data.
*/
// IMPORTS
const fs = require('fs');
// OPERATION
const sessionData = process.argv[2];
const {sessionCode} = sessionData;
fs.writeFileSync(`on/${sessionCode}.json`, `${JSON.stringify(sessionData, null, 2)}\n`);
