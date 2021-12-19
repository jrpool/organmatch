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
/*
const shuffle = array => {
  const shuffler = Array(array.length).fill(0).map((item, index) => [index, Math.random()]);
  shuffler.sort((a, b) => a[1] - b[1]);
  const shuffledArray = [];
  for (let i = 0; i < array.length; i++) {
    shuffledArray.push(array[shuffler[i][0]]);
  }
  array = shuffledArray;
};
*/
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
