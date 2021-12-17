/*
  endTurn
  Makes the decisions of a player in a turn of OrganMatch and returns the session data.
*/
// FUNCTIONS
// Makes and returns the decisions of a player in a turn.
module.exports = (versionData, sessionData, strategy)  => {
  const round = sessionData.rounds[sessionData.rounds.length - 1];
  const turn = round.turns[round.turns.length - 1];
  let matchIndex = null;
  const uses = [];
  // If the player must choose a player to bid:
  if (turn.hand.matches.length) {
    // Choose one and revise the session data accordingly.
    matchIndex = strategy('bid', versionData, sessionData);
    const bidMatch = turn.hand.matches[matchIndex];
    turn.hand.changes.bid.patient = bidMatch.patient;
    turn.hand.changes.bid.netPriority = bidMatch.patient.priority;
    turn.hand.current.patient.slice(bidMatch.handIndex, bidMatch.handIndex + 1);
    turn.bids.current.push(turn.hand.changes.bid);
  }
  // If the player must choose whether and, if so, how to use influence:
  if (turn.hand.current.influence.length) {
    // Make choices and revise the session data accordingly.
    uses.push(...strategy('use', versionData, sessionData));
    uses.forEach(use => {
      const influence = turn.hand.current.influence[use.handIndex];
      turn.hand.changes.bid.influence.push(influence);
      turn.hand.current.influence.slice(uses.handIndex, uses.handIndex + 1);
      turn.bids.current[use.bidIndex].influence.push({
        userID: turn.playerIndex + 1,
        influence
      });
      turn.bids.current[use.bidIndex].netPriority += influence.impact;
    });
  }
  return sessionData;
};
