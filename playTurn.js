/*
  playTurn
  Performs the mandatory actions of a turn of OrganMatch.
  Arguments:
  0: session code (e.g., 45678).
*/
// IMPORTS
const fs = require('fs');
// CONSTANTS
const sessionCode = process.argv[2];
// FUNCTIONS
// Performs the mandatory actions of a turn.
const playTurn = () => {
  try {
    const sessionJSON = fs.readFileSync(`on/${sessionCode}.json`, 'utf8');
    const sessionData = JSON.parse(sessionJSON);
    const {startTime, endTime, players, piles, rounds} = sessionData;
    if (endTime) {
      return 'sessionAlreadyEnded';
    }
    else if (startTime) {
      if (rounds.length) {
        const thisRound = rounds[rounds.length - 1];
        const {turns} = thisRound;
        if (turns.length) {
          const turn = turns[turns.length - 1];
          const {playerIndex, matchingPatients} = turn;
          let {endTime, bidPatient, netPriority} = turn;
          if (playerIndex) {
            const {organ} = piles.current;
            const player = players[playerIndex];
            const {hand} = player;
            let {bid} = player;
            const {patientCards} = hand;
            // Identify the turn player’s matching patient cards.
            const matchIndexes = patientCards
            .map((patient, index) => {
              const {organNeed} = patient;
              if (
                organNeed.some(need => need.organ === organ.organ)
                && patient.group === organ.group
              ) {
                return index;
              }
              else {
                return null;
              }
            })
            .filter(index => index !== null);
            // Record them.
            matchIndexes.forEach(index => {
              matchingPatients.push(patientCards[index]);
            });
            // If there is 1 of them:
            const matchCount = matchIndexes.length;
            if (matchCount === 1) {
              if (bid) {
                return 'bidNotEmpty';
              }
              else {
                // Bid it and record the bid in both the turn and the player.
                bidPatient = bid = patientCards.splice(matchIndexes[0], 1);
                netPriority = bid.priority;
                // If the hand contains no influence cards, end the turn.
                const influenceCount = hand.influenceCards.length;
                let reportEnd = '';
                if (! influenceCount) {
                  endTime = Date.now();
                  reportEnd = ' and ended';
                }
                require('./recordSession')(sessionData);
                return `Turn ${turns.length} played${reportEnd}`;
              }
            }
          }
          else {
            return 'noTurnPlayer'
          }
        }
        else{
          return 'noTurnStarted';
        }
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
