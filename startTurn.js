/*
  startTurn
  Starts a turn of OrganMatch.
  Arguments:
  0: session code (e.g., 45678).
*/
// IMPORTS
const fs = require('fs');
// CONSTANTS
const sessionCode = process.argv[2];
// FUNCTIONS
// Starts a turn.
const startTurn = () => {
  try {
    const sessionJSON = fs.readFileSync(`on/${sessionCode}.json`, 'utf8');
    const sessionData = JSON.parse(sessionJSON);
    const {startTime, endTime, players, rounds} = sessionData;
    if (endTime) {
      return 'sessionAlreadyEnded';
    }
    else if (startTime) {
      if (rounds.length) {
        const thisRound = rounds[rounds.length - 1];
        const {turns} = thisRound;
        const turn = {
          startTime: Date.now(),
          endTime: null,
          playerIndex: null,
          matchingPatients: [],
          bidPatient: null,
          influencesReceived: [],
          netPriority: null,
          replacedPatient: null,
          newPatient: null,
          influencesSent: [],
        };
        if (turns.length) {
          const priorTurn = turns[turns.length - 1];
          if (priorTurn.endTime){
            const priorPlayerIndex = priorTurn.playerIndex;
            if (priorPlayerIndex !== null) {
              turn.playerIndex = (priorPlayerIndex + 1) % players.length;
            }
            else {
              return 'noPriorPlayer';
            }
          }
          return 'priorTurnNotEnded';
        }
        else {
          turn.playerIndex = thisRound.starter;
        }
        turns.push(turn);
        require('./recordSession')(sessionData);
        return `Turn ${turns.length} started`;
      }
      else {
        return 'noRoundStarted';
      }
    }
    else {
      return 'sessionNotYetStarted';
    }
  }
  catch (error) {
    return `${error.message}\n${error.stack}`;
  }
};
// OPERATION
console.log(startTurn());
