/*
  script
  Performs a sequence of OrganMatch operations.
*/
const versionData = require('./getVersion')('01');
if (versionData) {
  console.log('Version 01 found');
  const sessionData = require('./newSession')(versionData);
  if (sessionData) {
    try {
      const {sessionCode} = sessionData;
      console.log(`Session ${sessionCode} created`);
      require('./addPlayers')(versionData, sessionData, [
        ['Susan Colowick', 'strategy0'],
        ['Jonathan Pool', 'strategy0'],
        ['Mike Harbour', 'strategy0'],
        ['Naomi Smith', 'strategy0'],
        ['Dick Rodstein', 'strategy0'],
        ['Lorna Graham', 'strategy0'],
        ['Joe Biden', 'strategy0'],
        ['Chuck Schumer', 'strategy0']
      ]);
      const listPlayers = () => sessionData.players.map(player => player.name).join('\n');
      require('./startSession')(sessionData);
      console.log(`Session started with shuffled players:\n${listPlayers()}`);
      while (sessionData.endTime === null) {
        require('./startRound')(sessionData);
        const round = sessionData.rounds[sessionData.rounds.length - 1];
        console.log(`Round ${round.index} started`);
        while (round.endTime === null) {
          require('./startTurn')(sessionData);
          const turn = round.turns[round.turns.length - 1];
          console.log(`Turn ${turn.index} started`);
          require('./endTurn')(versionData, sessionData);
          console.log('Turn ended');
        }
        require('./endRound')(versionData, sessionData);
        console.log(`Round won by ${round.winner.name || 'nobody'}`);
      }
      console.log(`Session ended. Winners: ${sessionData.winners.map(winner => winner.name)}`);
      console.log(`Organs still available: ${sessionData.piles.organs.latent.length}`);
    }
    catch (error) {
      console.log(JSON.stringify(sessionData, null, 2));
    }
  }
}
