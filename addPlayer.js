/*
  addPlayer
  Adds a player to a session of OrganMatch.
  Arguments:
  0: player name (e.g., Jane Doe).
  1: session code (e.g., 45678).
*/
// IMPORTS
const fs = require('fs');
// CONSTANTS
const name = process.argv[2];
const sessionCode = process.argv[3];
// FUNCTIONS
// Adds a player to a session and returns the new count of players joined.
const addPlayer = () => {
  try {
    const sessionJSON = fs.readFileSync(`on/${sessionCode}.json`, 'utf8');
    const sessionData = JSON.parse(sessionJSON);
    const {gameVersion, playersJoined, piles, players} = sessionData;
    const versionJSON = fs.readFileSync(`gameVersions/v${gameVersion}.json`, 'utf8');
    const versionData = JSON.parse(versionJSON);
    const {playerCount} = versionData.limits;
    const {handSize} = versionData;
    if (playersJoined < playerCount.max) {
      sessionData.playersJoined++;
      players.push({
        name,
        joinTime: Date.now(),
        hand: {
          patientCards: piles.latent.patient.splice(0, handSize),
          influenceCards: []
        },
        wins: []
      });
      fs.writeFileSync(`on/${sessionCode}.json`, `${JSON.stringify(sessionData, null, 2)}\n`);
      return sessionData.playersJoined;
    }
    else {
      return 'sessionFull';
    }
  }
  catch (error) {
    return error.message;
  }
};
// OPERATION
const joinCount = addPlayer();
if (typeof joinCount === 'number') {
  console.log(`Added ${name} to session ${sessionCode}; players joined: ${joinCount}`);
}
else {
  console.log(` ERROR: ${joinCount}`);
}
