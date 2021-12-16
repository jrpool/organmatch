/*
  playTurn
  Performs the mandatory actions of a turn of OrganMatch and returns the session data.
*/
// FUNCTIONS
// Performs the mandatory actions of a turn.
module.exports = sessionData => {
  try {
    if (sessionData.endTime) {
      console.log('ERROR: session already ended');
      return false;
    }
    else if (sessionData.startTime) {
      if (sessionData.rounds.length) {
        const thisRound = sessionData.rounds[sessionData.rounds.length - 1];
        if (thisRound.turns.length) {
          const turn = thisRound.turns[thisRound.turns.length - 1];
          if (turn.playerIndex === null) {
            console.log('ERROR: no turn player');
            return false;
          }
          else {
            const player = sessionData.players[turn.playerIndex];
            // Identify the turn player’s matching patient cards.
            const matchIndexes = player.hand.patientCards
            .map((patient, index) => {
              if (
                patient.organNeed.some(need => need.organ === sessionData.piles.current.organ.organ)
                && patient.group === sessionData.piles.current.organ.group
              ) {
                return index;
              }
              else {
                return null;
              }
            })
            .filter(index => index !== null);
            // Add them to the session data.
            matchIndexes.forEach(index => {
              turn.hand.matches.push(player.hand.patientCards[index]);
            });
            // If the count of them is 1:
            const matchCount = matchIndexes.length;
            if (matchCount === 1) {
              if (player.bid) {
                return 'bidNotEmpty';
              }
              else {
                // Bid it and record the bid in both the turn and the player.
                bidPatient = player.bid = player.hand.patientCards.splice(matchIndexes[0], 1);
                netPriority = player.bid.priority;
                const influenceCount = player.hand.influenceCards.length;
                // If the hand contains any influence cards:
                if (influenceCount) {
                  // Record progress.
                  require('./recordSession')(sessionData);
                  // Return the turn ID and the influence cards.
                  return {
                    turn: thisRound.turns.length,
                    usableCards: {
                      influence: player.hand.influenceCards
                    }
                  };
                }
                // Otherwise, i.e. if the hand contains no influence cards:
                else {
                  // End the turn.
                  turn.endTime = Date.now();
                  // Record the turn.
                  require('./recordSession')(sessionData);
                  // Return a turn-completion state.
                  return '';
                }
              }
            }
            // Otherwise, i.e. if the hand contains 2+ matching patient cards:
            else if (matchCount) {
              // Record progress.
              require('./recordSession')(sessionData);
              // Return the turn ID and the patient and influence cards:
              return {
                turn: thisRound.turns.length,
                usableCards: {
                  bidPatient: player.hand.patientCards,
                  influence: player.hand.influenceCards
                }
              };
            }
            // Otherwise, i.e. if the hand contains no matching patient card:
            else {
              // Record progress.
              require('./recordSession')(sessionData);
              // Return the turn ID and the replaceable patient cards:
              return {
                turn: thisRound.turns.length,
                usableCards: {
                  replacePatient: player.hand.patientCards
                }
              };
              return `Turn ${thisRound.turns.length} played and requires replacement finish`;
            }
          }
        }
        else{
          return 'noTurnStarted';
        }
      }
      else {
        return 'noRoundStarted';
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
console.log(playTurn());
