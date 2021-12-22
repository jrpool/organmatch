/*
  newSession
  Creates a session of OrganMatch.
*/
// FUNCTIONS
// Returns a session code.
const createCode = () => {
  const now = Date.now();
  const sessionCode = now.toString().slice(5, 10);
  return sessionCode;
};
// Returns an array of the names of the groups of a version.
const matchGroups = versionData => Object.keys(versionData.matchGroups.groups);
// Creates and returns all organ cards for a session.
const createOrganCards = versionData => {
  const cards = [];
  const cardTypes = versionData.organCards.types;
  cardTypes.forEach(type => {
    for (let i = 0; i < type.count; i++) {
      if (type.group) {
        cards.push({
          organ: type.organ,
          group: type.group
        });
      }
      else {
        const groups = matchGroups(versionData);
        groups.forEach(group => {
          cards.push({
            organ: type.organ,
            group
          });
        });
      }
    }
  });
  return cards;
};
// Creates and returns the influence cards for a session.
const createInfluenceCards = versionData => {
  const cards = [];
  const cardTypes = versionData.influenceCards.types;
  cardTypes.forEach(type => {
    for (let i = 0; i < type.count; i++) {
      cards.push({
        name: type.name,
        impact: type.impact
      });
    }
  });
  return cards;
};
// Returns an array, shuffled.
const shuffle = array => {
  const shuffler = array.map(item => [item, Math.random()]);
  shuffler.sort((a, b) => a[1] - b[1]);
  return shuffler.map(pair => pair[0]);
};
// Creates and returns the patient cards for a session.
const createPatientCards = versionData => {
  const organs = versionData.organCards.types.map(type => type.organ);
  const organQueueSizes = {};
  const groups = matchGroups(versionData);
  organs.forEach(organ => {
    organQueueSizes[organ] = versionData.patientCards.types.reduce((count, thisType) => {
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
      organQueues[organ][i] = [i, Math.random()];
    }
    organQueues[organ].sort((a, b) => a[1] - b[1]);
    organQueues[organ] = organQueues[organ].map(pair => pair[0]);
  });
  const queueIndexes = {};
  organs.forEach(organ => {
    queueIndexes[organ] = 0;
  });
  const cards = [];
  versionData.patientCards.types.forEach(type => {
    for (let i = 0; i < type.count; i++) {
      if (type.group) {
        const card = {
          organNeed: type.organNeed,
          group: type.group,
          priority: type.priority
        };
        type.organNeed.forEach((organ, index) => {
          card.organNeed[index] = {
            organ,
            queuePosition: organQueues[organ][queueIndexes[organ]++]
          };
        });
        cards.push(card);
      }
      else {
        groups.forEach(group => {
          const card = {
            organNeed: type.organNeed.map(organ => ({
              organ,
              queuePosition: null
            })),
            group,
            priority: type.priority
          };
          type.organNeed.forEach((organ, index) => {
            card.organNeed[index].queuePosition = organQueues[organ][queueIndexes[organ]++];
          });
          cards.push(card);
        });
      }
    }
  });
  return cards;
};
// Returns data for a session.
module.exports = versionData => {
  try {
    const sessionData = {
      versionID: versionData.versionID,
      sessionCode: createCode(),
      creationTime: (new Date()).toISOString(),
      playersJoined: 0,
      startTime: null,
      roundsEnded: 0,
      endTime: null,
      winners: [],
      piles: {
        organs: {
          latent: [],
          current: null,
          old: []
        },
        patients: [],
        influences: []
      },
      players: [],
      rounds: []
    };
    // Populate the card piles in the session data.
    const {piles} = sessionData;
    piles.organs.latent = shuffle(createOrganCards(versionData));
    piles.influences = shuffle(createInfluenceCards(versionData));
    piles.patients = shuffle(createPatientCards(versionData));
    console.log(`Created session ${sessionData.sessionCode}`);
    return sessionData;
  }
  catch(error) {
    console.log(`ERROR: ${error.message}\n${error.stack}`);
    return false;
  }
};
