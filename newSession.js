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
// Returns a session code.
const createCode = () => {
  const now = Date.now();
  const sessionCode = now.toString().slice(5, 10);
  return sessionCode;
}
// Returns organ data.
const createOrganData = versionData => {
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
  return cards;
};
// Returns influence data.
const createInfluenceData = versionData => {
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
  return cards;
};
// Returns patient data.
const createPatientData = versionData => {
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
      .filter(pair => organs.indexOf(pair[0]) < organs.indexOf(pair[1]));
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
  return cards;
};
// Shuffles an array of cards.
const shuffle = cards => {
  const shuffler = cards.map(card => [card, Math.random()]);
  shuffler.sort((a, b) => a[1] - b[1]);
  return shuffler.map(pair => pair[0]);
};
// Returns data for a session.
const newSession = () => {
  const sessionData = {
    gameVersion,
    sessionCode: createCode(),
    playerCount,
    playersJoined: 0,
    piles: {
      new: {
        organ: [],
        influence: [],
        patient: []
      },
      old: {
        organ: [],
        influence: [],
        patient: []
      }
    },
    players: []
  };
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
    const newPiles = sessionData.piles.new;
    newPiles.organ = shuffle(createOrganData(versionData));
    newPiles.influence = shuffle(createInfluenceData(versionData));
    newPiles.patient = shuffle(createPatientData(versionData));
    const handSize = versionData.cardCounts.hand.count;
    for (let player = 0; player < playerCount; player++) {
      const deal = sessionData.piles.new.patient.splice(0, handSize);
      sessionData.players.push({
        joined: null,
        name: '',
        hand: {
          patients: deal,
          influences: []
        },
        wins: []
      });
    };
    return sessionData;
  }
  catch(error) {
    console.log(`ERROR: no such version (${error.message})`);
    return false;
  };
};
// OPERATION
const sessionData = newSession();
if (sessionData) {
  fs.writeFileSync(
    `on/${sessionData.sessionCode}.json`, `${JSON.stringify(sessionData, null, 2)}\n`
  );
}
