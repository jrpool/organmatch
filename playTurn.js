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
          if (playerIndex !== null) {
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
                // If the hand contains any influence cards, record progress.
                if (influenceCount) {
                  require('./recordSession')(sessionData);
                  return `Turn ${turns.length} played with bid and requires finish`;
                }
                // Otherwise, i.e. if the hand contains no influence cards, end the turn.
                else {
                  endTime = Date.now();
                  require('./recordSession')(sessionData);
                  return `Turn ${turns.length} played with bid and ended`;
                }
              }
            }
            // Otherwise, i.e. if the hand contains 2+ matching patient cards:
            else if (matchCount) {
              // Record progress.
              require('./recordSession')(sessionData);
              return `Turn ${turns.length} played and requires bidding finish`;
            }
            // Otherwise, i.e. if the hand contains no matching patient card:
            else {
              // Record progress.
              require('./recordSession')(sessionData);
              return `Turn ${turns.length} played and requires replacement finish`;
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
console.log(playTurn());
