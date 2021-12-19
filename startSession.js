/*
  startSession
  Starts a session of OrganMatch.
*/
// FUNCTIONS
// Shuffles an array.
const shuffle = array => {
  for (let i = 0; i < array.length; i++) {
    array[i] = [array[i], Math.random()];
  }
  array.sort((a, b) => a[1] - b[1]);
  for (let i = 0; i < array.length; i++) {
    array[i] = array[i][0];
  }
};
// Starts a session.
module.exports = sessionData => {
  try {
    // Shuffle the players of the session.
    shuffle(sessionData.players);
    // Start the session.
    sessionData.startTime = Date.now();
    console.log(
      `Started at ${Date(sessionData.startTime)} with ${sessionData.players.length} players:`
    );
    console.log(JSON.stringify(sessionData.players.map(player => player.name), null, 2));
  }
  catch (error) {
    console.log(`ERROR: ${error.message}\n${error.stack}`);
  }
};
