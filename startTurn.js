/*
  startTurn
  Starts a turn of the current round of a session of OrganMatch.
*/
// FUNCTIONS
// Starts a turn.
module.exports = sessionData => {
  try {
    const round = sessionData.rounds[sessionData.rounds.length - 1];
    // Identify the turn’s player.
    const playerIndex = round.turns.length
      ? (round.turns[round.turns.length - 1].playerIndex + 1) % sessionData.players.length
      : round.starter;
    const player = sessionData.players[playerIndex];
    const playerName = player.name;
    /*
      Make the arrays of cards in the current hand new arrays of the cards in the initial hand,
      so that changes to the current arrays will not affect the initial arrays.
    */
    const initial = player.hand.current;
    const current = {
      patients: [...initial.patients],
      influences: [...initial.influences]
    };
    const matches = [];
    // Identify the turn player’s matching patient cards.
    const matchIndexes = initial.patients.map((patient, index) => {
      if (
        patient.organNeed.some(need => need.organ === sessionData.piles.organs.current.organ)
        && patient.group === sessionData.piles.organs.current.group
      ) {
        return index;
      }
      else {
        return null;
      }
    }).filter(index => index !== null);
    // Add them to the session data.
    matchIndexes.forEach(index => {
      matches.push({
        index,
        patient: initial.patients[index]
      });
    });
    // Initialize a turn record.
    const turn = {
      index: round.turns.length,
      startTime: Date.now(),
      endTime: null,
      playerIndex,
      playerName,
      hand: {
        initial,
        matches,
        changes: {
          patient: {
            isBid: null,
            index: null,
            patient: null,
            drawn: null
          },
          influences: []
        },
        current
      },
      bids: {
        initial: [],
        current: []
      }
    };
    // Add the turn record to the turn records of the round.
    round.turns.push(turn);
    // If the count of matches is 1:
    if (matchIndexes.length === 1) {
      // Bid and replace it and revise the session data accordingly.
      require('./bid')(sessionData, 0);
    }
  }
  catch (error) {
    console.log(`ERROR: ${error.message}\n${error.stack}`);
  }
};
