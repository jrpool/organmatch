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
        influenceName: type.name,
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
  const groupTypes = matchGroups(versionData);
  const cards = [];
  // For each type of patient card:
  versionData.patientCards.types.forEach(type => {
    const {count, group, organNeed, priority} = type;
    // For each patient of that type:
    for (let i = 0; i < count; i++) {
      // If the card is group-specific:
      if (group) {
        // Create a card.
        const card = {
          organNeed,
          group,
          priority,
          waitTime: Math.random()
        };
        // Add it to the collection of cards.
        cards.push(card);
      }
      // Otherwise, i.e. if the card applies to every group:
      else {
        // For each group:
        groupTypes.forEach(group => {
          // Create a card.
          const card = {
            organNeed,
            group,
            priority,
            waitTime: Math.random()
          };
          cards.push(card);
        });
      }
    }
  });
  cards.sort((a, b) => a.waitTime < b.waitTime);
  cards.forEach((card, index) => {
    card.waitTime = index;
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
      playerIDs: [],
      startTime: null,
      roundsEnded: 0,
      endTime: null,
      winnerIDs: [],
      piles: {
        organs: {
          latent: [],
          current: null,
          old: []
        },
        patients: [],
        influences: []
      },
      players: {},
      rounds: []
    };
    // Populate the card piles in the session data.
    const {piles} = sessionData;
    piles.organs.latent = shuffle(createOrganCards(versionData));
    piles.influences = shuffle(createInfluenceCards(versionData));
    piles.patients = shuffle(createPatientCards(versionData));
    return sessionData;
  }
  catch(error) {
    console.log(`ERROR: ${error.message}\n${error.stack}`);
    return false;
  }
};
