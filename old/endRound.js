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
    // Move the current offer card to the old pile.
    const currentOrgan = sessionData.piles.offers.current;
    sessionData.piles.offers.old.push(currentOrgan);
    sessionData.piles.offers.current = null;
    let sessionEnded = false;
    const round = sessionData.rounds[sessionData.rounds.length - 1];
    const bidCount = round.bids.length;
    // If the round has any bids:
    if (bidCount) {
      const bidTerm = bidCount > 1 ? 'bids' : 'bid';
      console.log(`The round had ${round.bids.length} ${bidTerm}`);
      // Identify the round’s winning bid, winner, and next starter.
      const scoreBid = bid => bid.netPriority - bid.waitTime / 1000;
      round.bids.sort((a, b) => scoreBid(b) - scoreBid(a));
      const winnerIndex = round.bids[0].player.index;
      const winner = sessionData.players[winnerIndex];
      round.nextStarter = round.winner.index = winnerIndex;
      round.winner.playerName = winner.playerName;
      const {wins} = winner;
      wins.push(round.bids[0]);
      console.log(`The round winner was ${winner.playerName}`);
      // Return any influence cards on the winning bid to the pile.
      const winInfluenceCount = round.bids[0].influences.length;
      if (winInfluenceCount) {
        const winReturnNews = winInfluenceCount === 1
          ? '1 influence card'
          : `${winInfluenceCount} influence cards`;
        console.log(`Winning bidder ${winner.playerName} returned ${winReturnNews}`);
      }
      sessionData.piles.influences.push(...round.bids[0].influences.map(use => use.influence));
      // For each losing bid:
      round.bids.slice(1).forEach(losingBid => {
        // Return its patient and influence cards to the piles.
        sessionData.piles.patients.push(losingBid.patient);
        sessionData.piles.influences.push(...losingBid.influences.map(use => use.influence));
        // Draw an influence card.
        const drawn = sessionData.piles.influences.shift();
        const {impact} = drawn;
        const impactTerm = impact > 0 ? `+${impact}` : impact;
        sessionData.players[losingBid.player.index].hand.current.influences.push(drawn);
        console.log(
          `Bidder ${losingBid.player.playerName} returned the bid cards and drew a ${impactTerm} influence card`
        );
      });
      // If the victory ends the session:
      if (wins.length === versionData.limits.winningRounds.max) {
        // Add the winner to the session data.
        sessionData.winners.push({
          index: winnerIndex,
          name: sessionData.players[winnerIndex].playerName
        });
        // End the session.
        sessionEnded = true;
      }
    }
    // Otherwise, i.e. if the round has no bids:
    else {
      // Identify the next round’s starter.
      round.nextStarter = round.starter;
      console.log('The round had no bid and therefore no winner\n');
    }
    // If no player has won enough rounds to end the session but the organs have been exhausted:
    if (! sessionEnded && ! sessionData.piles.offers.latent.length) {
      // End the session.
      sessionEnded = true;
    }
    // If the session has ended:
    if (sessionEnded) {
      // Add this fact and the winners to the session data and record the session.
      sessionData.endTime = (new Date()).toISOString();
      const playerWinCounts = sessionData.players.map(player => player.wins.length);
      const maxCount = Math.max(...playerWinCounts);
      const winners = sessionData.players.filter(player => player.wins.length === maxCount);
      sessionData.winners = winners.map(winner => ({
        index: winner.index,
        name: winner.playerName
      }));
      fs.writeFileSync(`on/${sessionData.sessionCode}.json`, JSON.stringify(sessionData, null, 2));
      console.log(`Session ended at ${sessionData.endTime}`);
      let winnerNews = '';
      if (sessionData.winners.length > 1) {
        winnerNews
        = `tied by ${sessionData.winners.map(winner => winner.playerName).join(' and ')}`;
      }
      else {
        winnerNews = `won by ${sessionData.winners[0].playerName}`;
      }
      console.log(`\nThe session was ${winnerNews}`);
      console.log(`Organs still available: ${sessionData.piles.offers.latent.length}`);
      console.log(`Patients still available: ${sessionData.piles.patients.length}`);
    }
  }
  catch (error) {
    console.log(`ERROR: ${error.message}\n${error.stack}`);
    sessionData.endTime = (new Date()).toISOString();
  }
};
