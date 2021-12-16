/*
  startRound
  Starts a round of OrganMatch and returns the session data.
*/
// FUNCTIONS
// Starts a round.
module.exports = sessionData => {
  try {
    if (sessionData.endTime) {
      console.log('ERROR: session already ended');
      return false;
    }
    else if (sessionData.startTime) {
      if (sessionData.piles.latent.organ.length) {
        // If this is not the first round:
        if (sessionData.piles.current.organ) {
          // Move the current organ card to the extinct pile.
          sessionData.piles.extinct.organ.push(sessionData.piles.current.organ);
        }
        // Move the top latent organ card to the current pile.
        sessionData.piles.current.organ = sessionData.piles.latent.organ.shift();
        // Identify the players who will start and end the round.
        const starter = sessionData.rounds.length
        ? sessionData.rounds[sessionData.rounds.length - 1].nextStarter
        : 0;
        const ender = (starter + sessionData.players.length - 1) % sessionData.players.length;
        if (typeof starter === 'number') {
          // Initialize a round record and add it to the session data.
          sessionData.rounds.push({
            startTime: Date.now(),
            starter,
            ender,
            currentOrgan: sessionData.piles.current.organ,
            winner: null,
            nextStarter: null,
            turns: []
          });
          return sessionData;
        }
        else {
          console.log('ERROR: prior round winnerless');
          return false;
        }
      }
      else {
        console.log('ERROR: organ cards exhausted');
        return false;
      }
    }
    else {
      console.log('ERROR: session not yet started');
      return false;
    }
  }
  catch (error) {
    console.log(`ERROR: ${error.message}\n${error.stack}`);
    return false;
  }
};
