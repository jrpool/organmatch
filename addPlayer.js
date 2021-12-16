/*
  addPlayer
  Adds a player to a session of OrganMatch and returns the session data.
*/
// FUNCTIONS
// Adds a player to a session and returns the session data.
module.exports = (versionData, sessionData, playerName) => {
  try {
    if (sessionData.playersJoined < versionData.limits.playerCount.max) {
      sessionData.playersJoined++;
      sessionData.players.push({
        name: playerName,
        joinTime: Date.now(),
        hand: {
          initial: {
            patientCards: sessionData.piles.latent.patient.splice(0, versionData.handSize.count),
            influenceCards: []
          },
          current: {
            patientCards: sessionData.piles.latent.patient.splice(0, versionData.handSize.count),
            influenceCards: []
          }
        },
        wins: []
      });
      return sessionData;
    }
    else {
      console.log('ERROR: session full');
      return false;
    }
  }
  catch (error) {
    console.log(`ERROR: ${error.message}`);
    return false;
  }
};
