/*
  bid
  Bids and replaces a patient in a turn of a round of a session of OrganMatch.
*/
// FUNCTIONS
// Bids and replaces a patient.
module.exports = (sessionData, matchIndex) => {
  try {
    const round = sessionData.rounds[sessionData.rounds.length - 1];
    const turn = round.turns[round.turns.length - 1];
    const player = sessionData.players[turn.player.index];
    // Bid and replace the specified patient and revise the session data accordingly.
    const match = turn.hand.matches[matchIndex];
    const organ = sessionData.piles.organs.current;
    const {patient} = match;
    const drawn = sessionData.piles.patients.shift();
    turn.hand.changes.patient = {
      isBid: true,
      patient,
      drawn
    };
    const bid = {
      turnIndex: turn.index,
      waitTime: patient.organNeed.find(need => need.organ === organ.organ).waitTime,
      player: {
        index: turn.player.index,
        name: turn.player.playerName
      },
      patient,
      influences: [],
      netPriority: patient.priority
    };
    round.bids.push(bid);
    turn.bids.current.push(bid);
    const {index} = match;
    player.hand.current.patients.splice(index, 1);
    turn.hand.current.patients.splice(index, 1);
    player.hand.current.patients.push(drawn);
    turn.hand.current.patients.push(drawn);
    console.log(
      `Player ${player.playerName} bid a priority-${patient.priority} and drew a priority-${drawn.priority}`
    );
  }
  catch (error) {
    console.log(`ERROR: ${error.message}\n${error.stack}`);
    sessionData.endTime = (new Date()).toISOString();
  }
};
