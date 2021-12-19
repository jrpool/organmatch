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
    // Move the current organ card to the old pile.
    const currentOrgan = sessionData.piles.organs.current;
    sessionData.piles.organs.old.push(currentOrgan);
    sessionData.piles.organs.current = null;
    let sessionEnded = false;
    const round = sessionData.rounds[sessionData.rounds.length - 1];
    // If the round has any bids:
    if (round.bids.length) {
      // Identify the round’s winning bid, winner, and next starter.
      const scoreBid = bid => bid.netPriority - bid.queuePosition / 1000;
      round.bids.sort((a, b) => scoreBid(b) - scoreBid(a));
      const winnerIndex = round.bids[0].player.index;
      const winner = sessionData.players[winnerIndex];
      round.nextStarter = round.winner.index = winnerIndex;
      round.winner.name = winner.name;
      const {wins} = winner;
      wins.push(round.bids[0]);
      // Make losing bidders return the bid patients to the pile and draw influence cards.
      round.bids.slice(1).forEach(losingBid => {
        sessionData.piles.patients.push(losingBid.patient);
        sessionData.players[losingBid.player.index].hand.current.influences.push(
          sessionData.piles.influences.shift()
        );
      });
      // If the victory ends the session:
      if (wins.length === versionData.limits.winningRounds.max) {
        // Add the winner to the session data.
        sessionData.winners.push({
          index: winnerIndex,
          name: sessionData.players[winnerIndex].name
        });
        // End the session.
        sessionEnded = true;
      }
    }
    // Otherwise, i.e. if the round has no bids:
    else {
      // Identify the next round’s starter.
      round.nextStarter = round.starter;
    }
    // If no player has won enough rounds to end the session but the organs have been exhausted:
    if (! sessionEnded && ! sessionData.piles.organs.latent.length) {
      // End the session.
      sessionEnded = true;
    }
    // If the session has ended:
    if (sessionEnded) {
      // Add this fact and the winners to the session data and record the session.
      sessionData.endTime = Date.now();
      const playerWinCounts = sessionData.players.map(player => player.wins.length);
      const maxCount = Math.max(...playerWinCounts);
      const winners = sessionData.players.filter(player => player.wins.length === maxCount);
      sessionData.winners = winners.map(winner => ({
        index: winner.index,
        name: winner.name
      }));
      fs.writeFileSync(`on/${sessionData.sessionCode}.json`, JSON.stringify(sessionData, null, 2));
    }
  }
  catch (error) {
    console.log(`ERROR: ${error.message}\n${error.stack}`);
  }
};
