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
    // Decision on which influence on which bid to exercise next.
    else if (action === 'use') {
      const usable = require('./usable');
      const usables = usable(versionData, sessionData);
      if (usables.length) {
        return usables[usables.length - 1];
      }
      else {
        return [];
      }
    }
  }
  catch (error) {
    console.log(`ERROR: ${error.message}\n${error.stack}`);
  }
};
