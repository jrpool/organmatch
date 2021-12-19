/*
  script
  Performs a sequence of OrganMatch operations.
*/
const versionData = require('./getVersion')('02');
if (versionData) {
  console.log('Version 01 found');
  const sessionData = require('./newSession')(versionData);
  if (sessionData) {
    const {sessionCode} = sessionData;
    console.log(`Session ${sessionCode} created`);
    require('./addPlayers')(versionData, sessionData, [
      ['Susan Colowick', 'strategy0'],
      ['Jonathan Pool', 'strategy0'],
      ['Mike Harbour', 'strategy0'],
      ['Naomi Smith', 'strategy0']
    ]);
    const listPlayers = () => sessionData.players.map(player => player.name).join('\n');
    console.log(`Added players:\n${listPlayers()}`);
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
      console.log('Round ended');
    }
    console.log('Session ended');
  }
  else {
    console.log('ERROR: could not create session');
  }
}
else {
  console.log('ERROR: could not find version');
}
