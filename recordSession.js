/*
  recordSession
  Records a session of OrganMatch.
  Arguments:
  0: session data.
*/
// IMPORTS
const fs = require('fs');
// OPERATION
module.exports = sessionData => {
  fs.writeFileSync(
    `on/${sessionData.sessionCode}.json`, `${JSON.stringify(sessionData, null, 2)}\n`
  );
};
