/*
  getVersionData
  Gets data on a version of OrganMatch.
*/
// IMPORTS
const fs = require('fs');
// FUNCTIONS
// Gets data for a version identified by a string of digits.
module.exports = versionID => {
  try {
    const versionJSON = fs.readFileSync(`gameVersions/v${versionID}.json`, 'utf8');
    const versionData = JSON.parse(versionJSON);
    versionData.versionID = versionID;
    return versionData;
  }
  catch(error) {
    console.log(`ERROR: ${error.message}\n${error.stack}`);
    return false;
  }
};
