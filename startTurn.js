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
        const round = sessionData.rounds[sessionData.rounds.length - 1];
        // Initialize a turn record.
        const turn = {
          id: round.turns.length + 1,
          startTime: Date.now(),
          endTime: null,
          playerIndex: null,
          playerName: null,
          hand: {
            initial: {
              patient: [],
              influence: []
            },
            matches: [],
            changes: {
              patient: {
                isBid: null,
                handIndex: null,
                card: null
              },
              influence: []
            },
            current: {
              patient: [],
              influence: []
            }
          },
          bids: {
            initial: [],
            current: []
          }
        };
        // If this is not the first turn of its round:
        if (round.turns.length) {
          const priorTurn = round.turns[round.turns.length - 1];
          if (priorTurn.endTime){
            const priorPlayerIndex = priorTurn.playerIndex;
            if (priorPlayerIndex !== null) {
              // Add the turn’s player to the session data.
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
          turn.playerIndex = round.starter;
        }
        turn.playerName = sessionData.players[turn.playerIndex].name;
        // Add the player’s hand to the session data.
        turn.hand.initial = JSON.parse(
          JSON.stringify(sessionData.players[turn.playerIndex].hand.current)
        );
        turn.hand.current = JSON.parse(JSON.stringify(turn.hand.initial));
        // Add the turn record to the turn records of the round.
        round.turns.push(turn);
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
