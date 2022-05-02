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
// Creates and returns all offer cards for a session.
const createOfferCards = versionData => {
  const cards = [];
  // For each offer-card type:
  const {types} = versionData.offerCards;
  types.forEach(type => {
    const {count, groupID, organs} = type;
    // For each card of that type:
    for (let i = 0; i < count; i++) {
      // If the card is group-specific:
      if (groupID) {
        // Create it.
        cards.push({
          organs,
          groupID
        });
      }
      // Otherwise, i.e. if it is group-generic:
      else {
        // Create one card per donor/patient group.
        const {groups} = versionData.matchGroups;
        Object.keys(groups).forEach(groupID => {
          cards.push({
            organs,
            groupID
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
  // For each card type:
  const {types} = versionData.influenceCards;
  types.forEach(type => {
    // Create the specified count of them.
    const {id, impact, count} = type;
    for (let i = 0; i < count; i++) {
      cards.push({
        id,
        impact
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
        const {groups} = versionData.matchGroups;
        const groupIDs = Object.keys(groups);
        groupIDs.forEach(groupID => {
          // Create a card.
          const card = {
            organNeed,
            groupID,
            priority,
            waitTime: Math.random()
          };
          cards.push(card);
        });
      }
    }
  });
  // Replace the wait times with random serial integers doubling as patient IDs.
  cards.sort((a, b) => a.waitTime < b.waitTime);
  cards.forEach((card, index) => {
    card.waitTime = index;
  });
  // Return the cards in ID order.
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
        offers: {
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
    piles.offers.latent = shuffle(createOfferCards(versionData));
    piles.patients = shuffle(createPatientCards(versionData));
    piles.influences = shuffle(createInfluenceCards(versionData));
    return sessionData;
  }
  catch(error) {
    console.log(`ERROR: ${error.message}\n${error.stack}`);
    return false;
  }
};
