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
    const player = sessionData.players[turn.player.index];
    const strategy = require(`./${player.strategyName}`);
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
      // As long as the player must choose whether and, if so, how to use influences:
      const usable = require('./usable');
      let usables = usable(versionData, sessionData);
      console.log(`>>> usables count is ${usables.length}`);
      while (usables.length) {
        console.log(`Player ${player.name} may exercise influence`);
        // Get the player’s next use choice.
        const useWant = strategy('use', versionData, sessionData);
        console.log(`>>> Influence choice: ${useWant.handIndex} on ${useWant.bidIndex}`);
        if (useWant) {
          const bidPlayerName = turn.bids.current[useWant.bidIndex].player.name;
          const {impact} = turn.hand.current.influences[useWant.handIndex];
          const impactTerm = impact > 0 ? `+${impact}` : impact;
          console.log(`Proposal to influence the bid of ${bidPlayerName} by ${impactTerm}`);
          // If it is permitted:
          if (usables.some(
            usable => usable.handIndex === useWant.handIndex && usable.bidIndex === useWant.bidIndex
          )) {
            // Apply it, removing the influence from the player’s and turn’s current hands.
            const {handIndex} = useWant;
            player.hand.current.influences.splice(handIndex, handIndex + 1);
            const influence = {
              turnIndex: turn.index,
              player: {
                index: turn.player.index,
                name: turn.player.name
              },
              influence: turn.hand.current.influences.splice(handIndex, handIndex + 1)[0]
            };
            const roundBid = round.bids[useWant.bidIndex];
            const turnBid = turn.bids.current[useWant.bidIndex];
            roundBid.influences.push(influence);
            turnBid.influences.push(influence);
            const oldNetPriority = roundBid.netPriority;
            const priorityLimits = versionData.limits.priorities;
            const newNetPriority = Math.min(
              priorityLimits.max, Math.max(priorityLimits.min, oldNetPriority + impact)
            );
            roundBid.netPriority += impact;
            turnBid.netPriority += impact;
            turn.hand.changes.influences.push(influence.influence);
            console.log(
              `Permitted. The net priority was ${oldNetPriority} and is now ${newNetPriority}`
            );
            console.log(`>>> Count of influences in hand: ${turn.hand.current.influences.length}`);
            usables = usable(versionData, sessionData);
          }
          // Otherwise, i.e. if the use choice is prohibited:
          else {
            console.log('Prohibited');
          }
        }
      }
      turn.endTime = (new Date()).toISOString();
    }
    // If the turn is the last turn of its round:
    if (turn.player.index === round.ender) {
      // End the round.
      round.endTime = (new Date()).toISOString();
    }
  }
  catch (error) {
    console.log(`ERROR: ${error.message}\n${error.stack}`);
    sessionData.endTime = (new Date()).toISOString();
  }
};
