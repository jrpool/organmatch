/*
  bid
  Bids and replaces a patient in a turn of a round of a session of OrganMatch.
*/
// FUNCTIONS
// Bids and replaces a patient.
module.exports = (sessionData, index) => {
  try {
    const round = sessionData.rounds[sessionData.rounds.length - 1];
    const turn = round.turns[round.turns.length - 1];
    const player = sessionData.players[turn.player.index];
    // Bid and replace the specified patient and revise the session data accordingly.
    const match = turn.hand.matches[index];
    const {patient} = match;
    const drawn = sessionData.piles.patients.shift();
    turn.hand.changes.patient = {
      isBid: true,
      index: match.index,
      patient,
      drawn
    };
    const bid = {
      turnIndex: turn.index,
      player: {
        index: turn.player.index,
        name: turn.player.name
      },
      patient,
      influences: [],
      netPriority: patient.priority
    };
    round.bids.push(bid);
    turn.bids.current.push(bid);
    player.hand.current.patients.splice(index, 1);
    turn.hand.current.patients.splice(index, 1);
    player.hand.current.patients.push(drawn);
    turn.hand.current.patients.push(drawn);
    // If the hand contains no influence cards:
    if (turn.hand.initial.influences.length === 0) {
      // End the turn.
      turn.endTime = Date.now();
    }
  }
  catch (error) {
    console.log(`ERROR: ${error.message}\n${error.stack}`);
    return false;
  }
};
