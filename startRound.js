/*
  startRound
  Starts a round of OrganMatch and returns the session data.
*/
// FUNCTIONS
// Starts a round.
module.exports = sessionData => {
  try {
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
      winner: {
        index: null,
        name: null
      },
      nextStarter: null,
      turns: [],
      bids: []
    });
    const round = sessionData.rounds[sessionData.rounds.length - 1];
    console.log(`Round ${round.index} started with ${round.organ.group} ${round.organ.organ}`);
  }
  catch (error) {
    console.log(`ERROR: ${error.message}\n${error.stack}`);
  }
};
