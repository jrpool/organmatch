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
    sessionData = require('./addPlayer')(versionData, sessionData, 'Susan Colowick');
    if (sessionData) {
      console.log(`Added player Susan Colowick to session ${sessionCode}`);
      sessionData = require('./addPlayer')(versionData, sessionData, 'Jonathan Pool');
      if (sessionData) {
        console.log(`Added player Jonathan Pool to session ${sessionCode}`);
        sessionData = require('./addPlayer')(versionData, sessionData, 'Mike Harbour');
        if (sessionData) {
          console.log(`Added player Mike Harbour to session ${sessionCode}`);
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
                  const round = sessionData.rounds[sessionData.rounds.length - 1];
                  const turn = round.turns[round.turns.length - 1];

                }
              }
            }
          }

      }
    }
  }
}
