/*
  startSession
  Starts a session of OrganMatch.
  Arguments:
  0: session code (e.g., 45678).
*/
// IMPORTS
const fs = require('fs');
// CONSTANTS
const sessionCode = process.argv[2];
// FUNCTIONS
// Returns an array, shuffled.
const shuffle = items => {
  const shuffler = items.map(item => [item, Math.random()]);
  shuffler.sort((a, b) => a[1] - b[1]);
  return shuffler.map(pair => pair[0]);
};
// Starts a session.
const startSession = () => {
  try {
    const sessionJSON = fs.readFileSync(`on/${sessionCode}.json`, 'utf8');
    const sessionData = JSON.parse(sessionJSON);
    const {gameVersion, playersJoined, players} = sessionData;
    const versionJSON = fs.readFileSync(`gameVersions/v${gameVersion}.json`, 'utf8');
    const versionData = JSON.parse(versionJSON);
    const {playerCount} = versionData.limits;
    if (playersJoined >= playerCount.min) {
      players = shuffle(players);
      fs.writeFileSync(`on/${sessionCode}.json`, `${JSON.stringify(sessionData, null, 2)}\n`);
      return `Session ${sessionCode} started`;
    }
    else {
      return 'tooFewPlayers';
    }
  }
  catch (error) {
    return error.message;
  }
};
// OPERATION
console.log(startSession());
