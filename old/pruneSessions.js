/*
  pruneSessions
  Deletes expired sessions of OrganMatch.
  Arguments:
  0: expiration time in minutes.
*/
// IMPORTS
const fs = require('fs');
// FUNCTIONS
// Deletes expired session files.
const pruneSessions = () => {
  const now = (new Date()).toISOString();
  const maxBirthTime = now - 60000 * process.argv[2];
  const fileNames = fs.readdirSync('on');
  fileNames.forEach(fileName => {
    const path = `on/${fileName}`;
    const birthTime = fs.statSync(path).birthtimeMs;
    if(birthTime < maxBirthTime) {
      fs.rmSync(path);
    }
  });
};
// OPERATION
pruneSessions();
