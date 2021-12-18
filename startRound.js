/*
  startRound
  Starts a round of OrganMatch and returns the session data.
*/
// FUNCTIONS
// Starts a round.
module.exports = sessionData => {
  try {
    // If this is not the first round:
    const currentOrgan = sessionData.piles.organs.current;
    if (currentOrgan) {
      // Move the current organ card to the old pile.
      sessionData.piles.organs.old.push(currentOrgan);
    }
    // Move the top latent organ card to the current pile.
    sessionData.piles.organs.current = sessionData.piles.organs.latent.shift();
    // Identify the players who will start and end the round.
    const starter = sessionData.rounds.length
      ? sessionData.rounds[sessionData.rounds.length - 1].nextStarter
      : 0;
    const ender = (starter + sessionData.players.length - 1) % sessionData.players.length;
    // Initialize a round record and add it to the session data.
    sessionData.rounds.push({
      index: sessionData.rounds.length,
      startTime: Date.now(),
      endTime: null,
      starter,
      ender,
      organ: sessionData.piles.organs.current,
      winner: null,
      nextStarter: null,
      turns: [],
      bids: []
    });
  }
  catch (error) {
    console.log(`ERROR: ${error.message}\n${error.stack}`);
  }
};
