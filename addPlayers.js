/*
  addPlayers
  Adds players to a session of OrganMatch.
*/
module.exports = (versionData, sessionData, playerNames) => {
  while (playerNames.length) {
    const playerName = playerNames.shift();
    require('./addPlayer')(versionData, sessionData, playerName);
    console.log(`Added player ${playerName} to session ${sessionData.sessionCode}`);
  }
};
