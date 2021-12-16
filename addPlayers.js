/*
  addPlayers
  Adds players to a session of OrganMatch.
*/
module.exports = (versionData, sessionData, playerNames) => {
  while (playerNames.length) {
    const playerName = playerNames.shift();
    sessionData = require('./addPlayer')(versionData, sessionData, playerName);
    if (sessionData) {
      console.log(`Added player ${playerName} to session ${sessionData.sessionCode}`);
    }
    else {
      console.log(`ERROR: failed to add player ${playerName}`);
      return false;
    }
  }
  return sessionData;
};
