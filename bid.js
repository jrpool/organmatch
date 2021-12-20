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
    const organ = sessionData.piles.organs.current;
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
      queuePosition: patient.organNeed.find(need => need.organ === organ.organ).queuePosition,
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
    console.log(
      `Player ${player.name} bid a priority-${patient.priority} and drew a priority-${drawn.priority}`
    );
  }
  catch (error) {
    console.log(`ERROR: ${error.message}\n${error.stack}`);
    sessionData.endTime = (new Date()).toISOString();
  }
};
