/*
  next
  Returns the name of the next module in a session of OrganMatch.
*/
// FUNCTIONS
// Returns the module to be executed next.
module.exports = (versionData, sessionData) => {
  try {
    if (sessionData.endTime) {
      return [];
    }
    else if (sessionData.startTime) {
      if (sessionData.rounds.length) {
        const round = sessionData.rounds[sessionData.rounds.length - 1];
        if (round.endTime) {
          return 'startRound';
        }
        else {
          if (round.turns.length) {
            const turn = round.turns[round.turns.length - 1];
            if (turn.endTime) {
              if (turn.player.index === round.ender) {
                return ['endRound'];
              }
              else {
                return ['startTurn'];
              }
            }
            else {
              return ['endTurn'];
            }
          }
          else {
            return ['startTurn'];
          }
        }
      }
      else {
        return ['startRound'];
      }
    }
    else {
      if (sessionData.playerIDs.length < versionData.limits.playerCount.min) {
        return ['addPlayer'];
      }
      else if (sessionData.playerIDs.length === versionData.limits.playerCount.max) {
        return ['startSession'];
      }
      else {
        return ['addPlayer', 'startSession'];
      }
    }
  }
  catch (error) {
    console.log(`ERROR: ${error.message}\n${error.stack}`);
    return false;
  }
};
