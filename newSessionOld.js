/*
  newSession
  Creates a session of OrganMatch.
  Arguments:
  0: game version (e.g., 01).
*/
// IMPORTS
const fs = require('fs');
// CONSTANTS
const gameVersion = process.argv[2];
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
// Returns an array, shuffled.
const shuffle = cards => {
  const shuffler = cards.map(card => [card, Math.random()]);
  shuffler.sort((a, b) => a[1] - b[1]);
  return shuffler.map(pair => pair[0]);
};
// Returns patient data.
const createPatientData = versionData => {
  const {organs} = versionData;
  const groups = Object.keys(versionData.matchGroups.groups);
  const {types} = versionData.cardCounts.patient;
  const organQPCount = groups.length * types.reduce(
    (total, current) => total + current.organCount * current.count, 0
  );
  const organQPs = organs.map(organ => ({
    organ,
    qps: shuffle(
      (new Array(organQPCount)).fill(1).map((element, index) => index)
    )
  }));
  console.log(organQPs);
  let organQPIndexes = organs.map(organ => ({
    organ: 0
  }));
  const cards = [];
  types.forEach(type => {
    const {organCount, priority, count} = type;
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
          console.log(organQPs[organQPIndex]);
          cards.push({
            organNeed: organNeed.map(organ => ({
              organ,
              queuePosition: organQPs[organQPIndexes[organ]++]
            })),
            group,
            priority
          });
        };
      })
    });
  });
  return cards;
};
// Returns data for a session.
const newSession = () => {
  const sessionData = {
    gameVersion,
    sessionCode: createCode(),
    playersJoined: 0,
    piles: {
      latent: {
        organ: [],
        influence: [],
        patient: []
      },
      current: {
        organ: null
      },
      extinct: {
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
    const latentPiles = sessionData.piles.latent;
    latentPiles.organ = shuffle(createOrganData(versionData));
    latentPiles.influence = shuffle(createInfluenceData(versionData));
    latentPiles.patient = shuffle(createPatientData(versionData));
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
  console.log(`Session ${sessionData.sessionCode} created`);
}
