/*
  script
  Performs a sequence of OrganMatch operations.
*/
const versionData = require('./getVersion')('01');
if (versionData) {
  const sessionData = require('./newSession')(versionData);
  if (sessionData) {
    try {
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
      require('./startSession')(sessionData);
      while (sessionData.endTime === null) {
        require('./startRound')(sessionData);
        const round = sessionData.rounds[sessionData.rounds.length - 1];
        while (sessionData.endTime === null && round.endTime === null) {
          require('./startTurn')(sessionData);
          require('./endTurn')(versionData, sessionData);
        }
        require('./endRound')(versionData, sessionData);
      }
    }
    catch (error) {
      console.log(JSON.stringify(sessionData, null, 2));
    }
  }
}
