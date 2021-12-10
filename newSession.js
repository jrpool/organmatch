/*
  newSession
  Creates a session of OrganMatch.
  Arguments:
  0: game version (e.g., 01).
  1: player count (e.g., 5).
*/
// IMPORTS
const fs = require('fs');
// CONSTANTS
const gameVersion = process.argv[2];
const playerCount = process.argv[3];
// FUNCTIONS
// Adds a session code to session data.
const createCode = sessionData => {
  const now = Date.now();
  const sessionCode = now.toString().slice(5, 10);
  sessionData.sessionCode = sessionCode;
}
// Adds organ cards to session data.
const createOrganCards = (versionData, sessionData) => {
  const cards = [];
  const {organs} = versionData;
  const groups = Object.keys(versionData.matchGroups.groups);
  const {count} = versionData.cardCounts.organ;
  organs.forEach(organ => {
    groups.forEach(group => {
      for (let i = 0; i < count; i++) {
        cards.push({
          organ,
          group
        });
      };
    });
  });
  sessionData.cards.organ = cards;
};
// Adds influence cards to session data.
const createInfluenceCards = (versionData, sessionData) => {
  const cards = [];
  const influences = versionData.influences.types;
  const {count} = versionData.cardCounts.influence;
  influences.forEach(influence => {
    const {name, impact} = influence;
    for (let i = 0; i < count; i++) {
      cards.push({
        name,
        impact
      });
    };
  });
  sessionData.cards.influence = cards;
};
// Adds patient cards to session data.
const createPatientCards = (versionData, sessionData) => {
  const {organs} = versionData;
  const groups = Object.keys(versionData.matchGroups.groups);
  const {types} = versionData.cardCounts.patient;
  const cards = [];
  Object.keys(types).forEach(typeName => {
    const {organCount, priority, count} = types[typeName];
    let organNeeds;
    if (organCount === 1) {
      organNeeds = organs.map(organ => [organ]);
    }
    else if (organCount === 2) {
      organNeeds = organs
      .flatMap(organ0 => organs.map(organ1 => [organ0, organ1]))
      .filter(pair => organs.indexOf(pair[0] < organs.indexOf(pair[1])));
    }
    organNeeds.forEach(organNeed => {
      groups.forEach(group => {
        for (let i = 0; i < count; i++) {
          cards.push({
            organNeed,
            group,
            priority
          });
        };
      })
    });
  });
  const patientCount = cards.length;
  const positions = new Array(patientCount);
  positions.fill(1);
  const taggedPositions = positions.map((position, index) => [index, Math.random()]);
  taggedPositions.sort((a, b) => a[1] - b[1]);
  const queuePositions = taggedPositions.map(pair => pair[0]);
  cards.forEach((card, index) => {
    card.queuePosition = queuePositions[index];
  });
  sessionData.cards.patient = cards;
};
// Creates a session file.
const newSession = () => {
  const sessionData = {
    playerCount: null,
    cards: {}
  };
  createCode(sessionData);
  sessionData.playerCount = playerCount;
  try {
    const versionJSON = fs.readFileSync(`gameVersions/v${gameVersion}.json`, 'utf8');
    const versionData = JSON.parse(versionJSON);
    const playerCountLimits = versionData.limits.playerCount;
    if (playerCount < playerCountLimits.min || playerCount > playerCountLimits.max) {
      console.log(
        `ERROR: player count not between ${playerCountLimits.min} and ${playerCountLimits.max}`
      );
      return false;
    }
    createOrganCards(versionData, sessionData);
    createInfluenceCards(versionData, sessionData);
    createPatientCards(versionData, sessionData);
    return sessionData;
  }
  catch(error) {
    console.log(`ERROR: no such version (${error.message})`);
    return false;
  };
};
// OPERATION
const sessionData = newSession(gameVersion, playerCount);
if (sessionData) {
  fs.writeFileSync(`on/${sessionData.sessionCode}.json`, JSON.stringify(sessionData, null, 2));
}
