/*
  usable
  Returns the currently permitted influence uses in a turn of a round of a session of OrganMatch.
*/
// FUNCTIONS
// Returns the permitted influence uses.
module.exports = (versionData, sessionData) => {
  try {
    const round = sessionData.rounds[sessionData.rounds.length - 1];
    const turn = round.turns[round.turns.length - 1];
    const playerIndex = turn.player.index;
    const player = sessionData.players[playerIndex];
    // If the turn has not yet ended:
    const usables = [];
    if (! turn.endTime) {
      const limits = versionData.limits.influences;
      const perBids = turn.bids.current.map(bid => bid.influences);
      const {influences} = player.hand.current;
      // If the player is still permitted to use an influence:
      const perTurnCount = turn.hand.changes.influences.length;
      if (perTurnCount < limits.perTurn.max) {
        // For each bid made in the turn:
        perBids.forEach((perBid, bidIndex) => {
          // If any player is still permitted to influence it:
          if (perBid.length < limits.perBid.max) {
            // If the turn’s player is still permitted to influence it:
            const perTurnBidCount = perBid.filter(use => use.player.index === playerIndex).length;
            if (perTurnBidCount < limits.perTurnBid.max) {
              const perBidImpacts = perBids.map(use => use.impact);
              // For each influence in the player’s hand:
              influences.forEach((influence, handIndex) => {
                // If the turn’s player is permitted to use it on the bid:
                if (! perBidImpacts.includes(influence.impact)) {
                  // Add that use to the permitted uses.
                  usables.push({
                    handIndex,
                    bidIndex
                  });
                }
              });
            }
          }
        });
      }
    }
    return usables;
  }
  catch (error) {
    console.log(`ERROR: ${error.message}\n${error.stack}`);
    sessionData.endTime = (new Date()).toISOString();
  }
};
