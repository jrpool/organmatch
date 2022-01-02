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
      ? (round.turns[round.turns.length - 1].player.index + 1) % sessionData.players.length
      : round.starter;
    const player = sessionData.players[playerIndex];
    const playerName = player.playerName;
    // Make all hands independently modifiable.
    const currentHand = player.hand.current;
    const initial = {
      patients: [...currentHand.patients],
      influences: [...currentHand.influences]
    };
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
    // Initialize a turn record, with independent bid arrays.
    const turn = {
      index: round.turns.length,
      startTime: (new Date()).toISOString(),
      endTime: null,
      player: {
        index: playerIndex,
        name: playerName
      },
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
        initial: [...round.bids],
        current: [...round.bids]
      }
    };
    // Add the turn record to the turn records of the round.
    round.turns.push(turn);
    console.log(`▲ Turn ${turn.index} started`);
    // If the count of matches is 1:
    if (matchIndexes.length === 1) {
      // Bid and replace it and revise the session data accordingly.
      require('./bid')(sessionData, 0);
    }
  }
  catch (error) {
    console.log(`ERROR: ${error.message}\n${error.stack}`);
    sessionData.endTime = (new Date()).toISOString();
  }
};
