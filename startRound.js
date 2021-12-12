/*
  startRound
  Starts a round of OrganMatch.
  Arguments:
  0: session code (e.g., 45678).
*/
// IMPORTS
const fs = require('fs');
// CONSTANTS
const sessionCode = process.argv[2];
// FUNCTIONS
// Starts a round.
const startRound = () => {
  try {
    const sessionJSON = fs.readFileSync(`on/${sessionCode}.json`, 'utf8');
    const sessionData = JSON.parse(sessionJSON);
    const {startTime, endTime, piles, rounds} = sessionData;
    if (endTime) {
      return 'sessionAlreadyEnded';
    }
    else if (startTime) {
      if (piles.latent.organ.length) {
        if (piles.current.organ) {
          piles.extinct.organ.push(piles.current.organ);
        }
        piles.current.organ = piles.latent.organ.shift();
        const starter = rounds.length ? rounds[rounds.length - 1].winner : 0;
        if (starter) {
          rounds.push({
            startTime: Date.now(),
            starter,
            currentOrgan: piles.current.organ,
            turns: []
          });
          fs.writeFileSync(`on/${sessionCode}.json`, `${JSON.stringify(sessionData, null, 2)}\n`);
          return `Round ${rounds.length} started`;
        }
        else {
          return 'priorRoundWinnerless';
        }
      }
      else {
        return 'organCardsExhausted';
      }
    }
    else {
      return 'sessionNotYetStarted';
    }
  }
  catch (error) {
    return `${error.message}\n${error.stack}`;
  }
};
// OPERATION
console.log(startRound());
