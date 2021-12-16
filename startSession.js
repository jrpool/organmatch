/*
  startSession
  Starts a session of OrganMatch.
*/
// FUNCTIONS
// Returns an array, shuffled.
const shuffle = items => {
  const shuffler = items.map(item => [item, Math.random()]);
  shuffler.sort((a, b) => a[1] - b[1]);
  return shuffler.map(pair => pair[0]);
};
// Starts a session.
module.exports = (versionData, sessionData) => {
  try {
    if (sessionData.startTime) {
      console.log('ERROR: already started');
      return false;
    }
    else {
      if (sessionData.playersJoined >= versionData.limits.playerCount.min) {
        const shuffledPlayers = JSON.parse(JSON.stringify(shuffle(sessionData.players)));
        sessionData.players.splice(0, sessionData.players.length, ...shuffledPlayers);
        sessionData.startTime = Date.now();
        return sessionData;
      }
      else {
        console.log('ERROR: too few players');
        return false;
      }
    }
  }
  catch (error) {
    console.log(`ERROR: ${error.message}`);
    return false;
  }
};
