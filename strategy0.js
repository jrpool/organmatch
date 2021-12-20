/*
  strategy0
  Makes a decision of a player in a turn of a round of a session of OrganMatch.
*/
// FUNCTIONS
// Makes a decision.
module.exports = (action, versionData, sessionData)  => {
  try {
    const {rounds} = sessionData;
    const round = rounds[rounds.length - 1];
    const {turns} = round;
    const turn = turns[turns.length - 1];
    // Decision on which patient to bid.
    if (action === 'bid') {
      const {matches} = turn.hand;
      return matches.length - 1;
    }
    // Decision on which patient to replace.
    else if (action === 'swap') {
      const {patients} = turn.hand.current;
      return patients.length - 1;
    }
    // Decision on which influences to use on which bids.
    else if (action === 'use') {
      const influences = Array.from(turn.hand.current.influences);
      const bids = turn.bids.current;
      let turnCount = 0;
      const {limits} = versionData;
      const uses = [];
      bids.forEach((bid, bidIndex) => {
        let bidCount = bid.influences.length;
        let turnBidCount = 0;
        while (
          influences.length
          && bidCount < limits.influences.perBid.max
          && turnBidCount < limits.influences.perTurnBid.max
          && turnCount < limits.influences.perTurn.max
        ) {
          uses.push({
            index: influences.length - 1,
            bidIndex
          });
          bidCount++;
          turnBidCount++;
          turnCount++;
        }
      });
      return uses;
    }
  }
  catch (error) {
    console.log(`ERROR: ${error.message}\n${error.stack}`);
  }
};
