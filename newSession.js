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
// Returns data on groups.
const matchGroups = versionData => Object.keys(versionData.matchGroups.groups);
// Returns organ cards.
const createOrganCards = (versionData, groups) => {
  const cards = [];
  const cardTypes = versionData.organCards.types;
  const cards = [];
  cardTypes.forEach(type => {
    const {organ, group, count} = type;
    for (let i = 0; i < count; i++) {
      if (group) {
        cards.push({
          organ,
          group
        });
      }
      else {
        groups.forEach(group => {
          cards.push({
            organ,
            group
          });
        });
      }
    }
  });
  return cards;
};
// Returns influence cards.
const createInfluenceCards = versionData => {
  const cards = [];
  const cardTypes = versionData.influenceCards.types;
  cardTypes.forEach(type => {
    const {name, impact, count} = type;
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
// Returns patient cards.
const createPatientCards = (versionData, groups) => {
  const {types} = versionData.patientCards;
  const organs = versionData.organCards.types.map(type => type.organ);
  const organQueueSizes = {};
  organs.forEach(organ => {
    organQueueSizes[organ] = types.reduce((count, thisType) => {
      if (thisType.organNeed.includes(organ)) {
        if (thisType.group) {
          return count + thisType.count;
        }
        else {
          return count + groups.length * thisType.count;
        }
      }
      else {
        return count;
      }
    }, 0);
  });
  const organQueues = {};
  organs.forEach(organ => {
    organQueues[organ] = (new Array(organQueueSizes[organ])).fill(1);
    for (let i = 0; i < organQueueSizes[organ]; i++) {
      organQueues[organ] = [i, Math.random()];
    };
    organQueues[organ].sort((a, b) => a[1] - b[1]).map(pair => pair[0]);
  });
  const queueIndexes = {};
  organs.forEach(organ => {
    queueIndexes[organ] = 0;
  });
  const cards = [];
  types.forEach(type => {
    const {organNeed, group, priority, count} = type;
    for (let i = 0; i < count; i++) {
      if (group) {
        const card = {
          organNeed,
          group,
          priority
        };
        organNeed.forEach((organ, index) => {
          card.organNeed[index] = {
            organ,
            queuePosition: queueIndexes[organ]++
          };
        });
      }
      else {
        groups.forEach(group => {
          const card = {
            organNeed,
            group,
            priority
          };
          organNeed.forEach((organ, index) => {
            card.organNeed[index] = {
              organ,
              queuePosition: queueIndexes[organ]++
            }
          });
        });
      }
    };
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
    const groups = matchGroups(versionData);
    latentPiles.organ = shuffle(createOrganCards(versionData, groups));
    latentPiles.influence = shuffle(createInfluenceCards(versionData));
    latentPiles.patient = shuffle(createPatientCards(versionData, groups));
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
