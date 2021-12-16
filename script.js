/*
  script
  Performs a sequence of OrganMatch operations.
*/
const versionData = require('./getVersion')('01');
if (versionData) {
  console.log('Version 01 found');
  let sessionData = require('./newSession')(versionData);
  if (sessionData) {
    const {sessionCode} = sessionData;
    console.log(`Session ${sessionCode} created`);
    sessionData = require('./addPlayers')(versionData, sessionData, [
      'Susan Colowick',
      'Jonathan Pool',
      'Mike Harbour',
      'Naomi Smith'
    ]);
    if (sessionData) {
      sessionData = require('./startSession')(versionData, sessionData);
      if (sessionData) {
        console.log(
          `Session ${sessionCode} started with ${sessionData.players.length} players`
        );
        sessionData = require('./startRound')(sessionData);
        if (sessionData) {
          const roundID = sessionData.rounds.length;
          console.log(`Round ${roundID} of session ${sessionCode} started`);
          sessionData = require('./startTurn')(sessionData);
          if (sessionData) {
            const turnID = sessionData.rounds[sessionData.rounds.length - 1].turns.length;
            console.log(`Turn ${turnID} of round ${roundID} of session ${sessionCode} started`);
            sessionData = require('./playTurn')(sessionData);
            if (sessionData) {
              console.log(
                `Turn ${turnID} of round ${roundID} of session ${sessionCode} played`
              );
              const round = sessionData.rounds[roundID - 1];
              const turn = round.turns[turnID - 1];
              console.log(`Turn data:\n${JSON.stringify(turn, null, 2)}`);
            }
          }
        }
      }
    }
  }
}
