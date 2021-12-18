/*
  endTurn
  Applies the decisions of a player to a turn of a round of a session of OrganMatch.
*/
// FUNCTIONS
// Applies the decisions of a player to a turn.
module.exports = (versionData, sessionData, strategy)  => {
  const round = sessionData.rounds[sessionData.rounds.length - 1];
  const turn = round.turns[round.turns.length - 1];
  let index = null;
  // If the player must choose a patient to bid:
  if (turn.hand.matches.length > 1) {
    // Get and apply the player’s choice.
    index = strategy('bid', versionData, sessionData);
    require('./bid')(sessionData, index);
  }
  // If the player must choose whether and, if so, how to use influences:
  if (turn.hand.current.influences.length) {
    // Get the player’s choices, constrained by the version limits.
    const limits = versionData.limits.influences;
    const moreAllowed = {
      perTurn: limits.perTurn.max,
      perBid: limits.perBid.max,
      perTurnBid: limits.perTurnBid.max
    };
    const uses = strategy('use', versionData, sessionData)
    .slice(0, moreAllowed.perTurn)
    .filter(use => {
      const {bidIndex} = use;
      const bidPriorCount = turn.bids.current[bidIndex].influences.length;
      if (bidPriorCount < moreAllowed.perBid) {
        if (moreAllowed.perTurnBid) {
          moreAllowed.perTurnBid--;
          return true;
        }
      }
      return false;
    });
    // Apply the choices.
    uses.forEach(use => {
      const influence = {
        turnIndex: turn.index,
        playerIndex: turn.playerIndex,
        playerName: turn.playerName,
        influence: turn.hand.current.influences.slice(use.index, use.index + 1)
      };
      round.bids[use.index].influence.push(influence);
      turn.bids.current[use.index].influence.push(influence);
      const {impact} = influence.influence;
      round.bids[use.index].netPriority += impact;
      turn.bids.current[use.index].netPriority += impact;
      turn.hand.changes.influences.push(influence.influence);
    });
  }
  return sessionData;
};
