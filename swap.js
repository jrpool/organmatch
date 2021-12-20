/*
  bid
  Replaces a patient in a turn of a round of a session of OrganMatch.
*/
// FUNCTIONS
// Replaces a patient.
module.exports = (sessionData, index) => {
  try {
    const round = sessionData.rounds[sessionData.rounds.length - 1];
    const turn = round.turns[round.turns.length - 1];
    const player = sessionData.players[turn.player.index];
    // Replace the specified patient and revise the session data accordingly.
    const patient = turn.hand.initial.patients[index];
    const drawn = sessionData.piles.patients.shift();
    sessionData.piles.patients.push(patient);
    turn.hand.changes.patient = {
      isBid: false,
      index,
      patient,
      drawn
    };
    player.hand.current.patients.splice(index, 1);
    turn.hand.current.patients.splice(index, 1);
    player.hand.current.patients.push(drawn);
    turn.hand.current.patients.push(drawn);
    console.log(`Player ${player.name} replaced a ${patient.priority} patient`);
    console.log(`A priority-${drawn.priority} patient was drawn to replace it`);
  }
  catch (error) {
    console.log(`ERROR: ${error.message}\n${error.stack}`);
    sessionData.endTime = Date.now();
  }
};
