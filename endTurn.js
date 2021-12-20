/*
  endTurn
  Ends a turn of a round of a session of OrganMatch.
*/
// FUNCTIONS
// Ends a turn.
module.exports = (versionData, sessionData)  => {
  try {
    const round = sessionData.rounds[sessionData.rounds.length - 1];
    const turn = round.turns[round.turns.length - 1];
    const strategy = require(`./${sessionData.players[turn.player.index].strategyName}`);
    // If the turn has not yet ended:
    if (! turn.endTime) {
      let index = null;
      // If the player must choose a patient to bid:
      if (turn.hand.matches.length > 1) {
        // Get and apply the player’s choice.
        index = strategy('bid', versionData, sessionData);
        require('./bid')(sessionData, index);
      }
      // Otherwise, if the player must choose a patient to replace:
      else if (! turn.hand.matches.length) {
        // Get and apply the player’s choice.
        index = strategy('swap', versionData, sessionData);
        require('./swap')(sessionData, index);
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
            player: {
              index: turn.player.index,
              name: turn.player.name
            },
            influence: turn.hand.current.influences.slice(use.index, use.index + 1)[0]
          };
          const roundBid = round.bids[use.bidIndex];
          const turnBid = turn.bids.current[use.bidIndex];
          roundBid.influences.push(influence);
          turnBid.influences.push(influence);
          const {impact} = influence.influence;
          roundBid.netPriority += impact;
          turnBid.netPriority += impact;
          turn.hand.changes.influences.push(influence.influence);
          const impactTerm = impact > 0 ? `+${impact}` : impact;
          console.log(
            `Player ${turn.player.name} applied ${impactTerm} to the ${turnBid.player.name} bid`
          );
        });
      }
      turn.endTime = Date.now();
    }
    // If the turn is the last turn of its round:
    if (turn.player.index === round.ender) {
      // End the round.
      round.endTime = Date.now();
    }
  }
  catch (error) {
    console.log(`ERROR: ${error.message}\n${error.stack}`);
    sessionData.endTime = Date.now();
  }
};
