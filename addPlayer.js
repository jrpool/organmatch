/*
  addPlayer
  Adds a player to a session of OrganMatch and returns the session data.
*/
// FUNCTIONS
// Adds a player to a session and returns the session data.
module.exports = (versionData, sessionData, playerName) => {
  try {
    // Increment the player count.
    sessionData.playersJoined++;
    // Remove patients from the patient pile.
    const patients = sessionData.piles.patients.splice(0, versionData.handSize.count);
    // Add data on the player to the session data.
    sessionData.players.push({
      name: playerName,
      joinTime: Date.now(),
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
    });
  }
  catch (error) {
    console.log(`ERROR: ${error.message}`);
    return false;
  }
};
