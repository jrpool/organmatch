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
        const round = sessionData.rounds[sessionData.rounds.length - 1];
        if (round.turns.length) {
          const turn = round.turns[round.turns.length - 1];
          if (turn.playerIndex === null) {
            console.log('ERROR: no turn player');
            return false;
          }
          else {
            const player = sessionData.players[turn.playerIndex];
            // Identify the turn player’s matching patient cards.
            const matchIndexes = turn.hand.initial.patient.map((patient, index) => {
              if (
                patient.organNeed.some(need => need.organ === sessionData.piles.current.organ.organ)
                && patient.group === sessionData.piles.current.organ.group
              ) {
                return index;
              }
              else {
                return null;
              }
            }).filter(index => index !== null);
            // Add them to the session data.
            matchIndexes.forEach(index => {
              turn.hand.matches.push(turn.hand.initial.patient[index]);
            });
            // If the count of them is 1:
            const matchCount = matchIndexes.length;
            if (matchCount === 1) {
              if (player.bid) {
                console.log('ERROR: bid not empty before turn played');
                return false;
              }
              else {
                // Bid it and revise the session data accordingly.
                const bid = {patient: turn.hand.initial.patient.splice(matchIndexes[0], 1)};
                bid.netPriority = bid.patient.priority;
                turn.hand.changes.bid = bid;
                turn.bids.final.push(bid);
                const roundBid = {bid};
                roundBid.turnID = round.turns.length;
                roundBid.playerID = turn.playerIndex + 1;
                player.hand.current.splice(matchIndexes[0], 1);
                // Replace the bid player and revise the session data accordingly.
                const drawnPatient = sessionData.piles.latent.patient.shift();
                turn.hand.changes.draw = drawnPatient;
                turn.hand.final.patient.push(drawnPatient);
                player.hand.current.patient.push(drawnPatient);
                // If the hand contains no influence cards:
                const influenceCount = turn.hand.initial.influence.length;
                if (! influenceCount) {
                  // End the turn.
                  turn.endTime = Date.now();
                }
              }
            }
            return sessionData;
          }
        }
        else{
          console.log('ERROR: no turn started');
          return false;
        }
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
