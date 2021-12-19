/*
  endRound
  Processes the end of a round of a session of OrganMatch.
*/
// IMPORTS
const fs = require('fs');
// FUNCTIONS
// Processes the end of a round.
module.exports = (versionData, sessionData)  => {
  try {
    const round = sessionData.rounds[sessionData.rounds.length - 1];
    // If the round has any bids:
    if (round.bids.length) {
      // Identify the round’s winning bid and winner.
      const scoreBid = bid => bid.netPriority - bid.patient.queuePosition / 1000;
      round.bids.sort((a, b) => scoreBid(b) - scoreBid(a));
      round.winner = round.bids[0].playerIndex;
      const {wins} = sessionData.players[round.winner];
      wins.push(round.bids[0]);
      // If the victory ends the session:
      if (wins.length === versionData.limits.winningRounds.max) {
        // Add the winner to the session data.
        sessionData.winner.index = round.winner;
        sessionData.winner.name = sessionData.players[round.winner].name;
        // End the session.
        sessionData.endTime = Date.now();
        return;
      }
    }
    // If the organs have been exhausted:
    if (! sessionData.piles.organs.latent.length) {
      // End the session.
      sessionData.endTime = Date.now();
      // Record the session.
      fs.writeFileSync(`on/${sessionData.sessionCode}.json`, JSON.stringify(sessionData, null, 2));
    }
  }
  catch (error) {
    console.log(`ERROR: ${error.message}\n${error.stack}`);
  }
};
