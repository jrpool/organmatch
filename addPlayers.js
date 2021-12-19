/*
  addPlayers
  Adds players to a session of OrganMatch.
*/
module.exports = (versionData, sessionData, players) => {
  try {
    while (players.length) {
      const player = players.shift();
      require('./addPlayer')(versionData, sessionData, ...player);
      console.log(
        `Player ${player[0]} with strategy ${player[1]} joined session ${sessionData.sessionCode}`
      );
    }
  }
  catch (error) {
    console.log(`ERROR: ${error.message}\n${error.stack}`);
  }
};
