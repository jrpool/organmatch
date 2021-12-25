/*
  addPlayer
  Adds a player to a session of OrganMatchata.
*/
// FUNCTIONS
// Adds a player to a session.
module.exports = (versionData, sessionData, playerKey, playerName, strategyName) => {
  try {
    // Increment the player count.
    sessionData.playersJoined++;
    // Remove patients from the patient pile.
    const patients = sessionData.piles.patients.splice(0, versionData.handSize.count);
    // Add data on the player to the session data.
    sessionData.players[playerKey] = {
      name: playerName,
      joinTime: (new Date()).toISOString(),
      strategyName,
      hand: {
        initial: {
          patients,
          influences: []
        },
        current: {
          /*
            Make the patients in the current hand a new array of the patients in the initial hand,
            so that changes to the current array will not affect the initial array.
          */
          patients: [...patients],
          influences: []
        }
      },
      wins: []
    };
    console.log(`Added player ${playerName} with strategy ${strategyName}`);
  }
  catch (error) {
    console.log(`ERROR: ${error.message}\n${error.stack}`);
    return false;
  }
};
