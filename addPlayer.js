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
const playerName = process.argv[2];
const sessionCode = process.argv[3];
// FUNCTIONS
// Adds a player to a session and returns the index of the player.
const addPlayer = () => {
  const sessionFileNames = fs.readdirSync('on');
  if (sessionFileNames.includes(`${sessionCode}.json`)) {
    const sessionJSON = fs.readFileSync(`on/${sessionCode}.json`, 'utf8');
    const sessionData = JSON.parse(sessionJSON);
    const {playerCount, playersJoined, players} = sessionData;
    if (playersJoined < playerCount) {
      const playerIndex = playersJoined;
      sessionData.playersJoined++;
      const player = players[playerIndex];
      player.joinTime = Date.now();
      player.name = playerName;
      fs.writeFileSync(`on/${sessionCode}.json`, `${JSON.stringify(sessionData, null, 2)}\n`);
      return playerIndex;
    }
    else {
      return 'sessionFull';
    }
  }
  else {
    return 'noSuchSession';
  }
};
// OPERATION
const playerIndex = addPlayer();
if (typeof playerIndex === 'number') {
  console.log(`Added ${playerName} to session ${sessionCode} as player ${playerIndex}`);
}
else {
  console.log(` ERROR: ${playerIndex}`);
}

const handSize = versionData.cardCounts.hand.count;
for (let player = 0; player < playerCount; player++) {
  const deal = sessionData.piles.latent.patient.splice(0, handSize);
  sessionData.players.push({
    joinTime: null,
    name: null,
    hand: {
      patients: deal,
      influences: []
    },
    wins: []
  });
};
