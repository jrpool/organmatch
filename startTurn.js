/*
  startTurn
  Starts a turn of OrganMatch.
*/
// FUNCTIONS
// Starts a turn and returns the session data.
module.exports = sessionData => {
  try {
    if (sessionData.endTime) {
      console.log('ERROR: session already ended');
      return false;
    }
    else if (sessionData.startTime) {
      if (sessionData.rounds.length) {
        const thisRound = sessionData.rounds[sessionData.rounds.length - 1];
        // Initialize a turn record.
        const turn = {
          id: thisRound.turns.length,
          startTime: Date.now(),
          endTime: null,
          playerIndex: null,
          hand: {
            initial: {
              patient: [],
              influence: []
            },
            matches: [],
            changes: {
              bid: {
                patient: null,
                influences: [],
                netPriority: null
              },
              surrender: null,
              draw: null,
              influence: {
                use: [],
                draw: null
              }
            },
            final: {
              patient: [],
              influence: []
            }
          },
          bids: {
            initial: [],
            final: []
          }
        };
        // If this is not the first turn of its round:
        if (thisRound.turns.length) {
          const priorTurn = thisRound.turns[thisRound.turns.length - 1];
          if (priorTurn.endTime){
            const priorPlayerIndex = priorTurn.playerIndex;
            if (priorPlayerIndex !== null) {
              // Identify the turn’s player.
              turn.playerIndex = (priorPlayerIndex + 1) % sessionData.players.length;
            }
            else {
              console.log('ERROR: no prior player');
              return false;
            }
          }
          console.log('ERROR: prior turn not ended');
          return false;
        }
        // Otherwise, i.e. if this is the first turn of its round:
        else {
          // Identify the turn’s player as the round’s starting player.
          turn.playerIndex = thisRound.starter;
        }
        // Add the player’s initial hand to the session data.
        turn.hand.initial = sessionData.players[turn.playerIndex].hand.current;
        // Add the turn record to the turn records of the round.
        thisRound.turns.push(turn);
        return sessionData;
      }
      else {
        console.log('ERROR: no round started');
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
