/*
  startSession
  Starts a session of OrganMatch.
*/
// FUNCTIONS
// Shuffles an array.
const shuffle = array => {
  const shuffler = array.map(item => [item, Math.random()]);
  shuffler.sort((a, b) => a[1] - b[1]);
  array.forEach((item, index) => {
    item = shuffler[index][0];
  });
};
// Starts a session.
module.exports = sessionData => {
  try {
    // Shuffle the players of the session.
    shuffle(sessionData.players);
    // Start the session.
    sessionData.startTime = Date.now();
  }
  catch (error) {
    console.log(`ERROR: ${error.message}\n${error.stack}`);
  }
};
