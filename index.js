/*
  index.js
  OrganMatch main script.
*/

// ########## IMPORTS

// Module to keep secrets local.
require('dotenv').config();
// Module to access files.
const fs = require('fs');
// Module to create a web server.
const http2 = require('http2');

// ########## GLOBAL CONSTANTS
// Data on all current sessions.
const sessions = {};
// SSE responses for player lists.
const newsStreams = {};
// Data on version 02.
const versionData = require('./getVersion')('02');
const key = fs.readFileSync(process.env.KEY);
const cert = fs.readFileSync(process.env.CERT);
// Organ images.
const organSVGs = {};
['heart', 'liver', 'lung'].forEach(organ => {
  organSVGs[organ] = fs.readFileSync(`images/${organ}.svg`, 'utf8');
});
// Influence images.
const influenceSVGs = {};
['addict', 'bribe', 'child', 'urgency'].forEach(influence => {
  influenceSVGs[influence] = fs.readFileSync(`images/${influence}.svg`, 'utf8');
});
// Other images.
const etcSVGs = {};
['minutes'].forEach(item => {
  etcSVGs[item] = fs.readFileSync(`images/${item}.svg`, 'utf8');
});

// ########## FUNCTIONS

// Serves a page.
const serveTemplate = (name, params, res) => {
  res.setHeader('Content-Type', 'text/html');
  const template = fs.readFileSync(`${name}.html`, 'utf8');
  const style = fs.readFileSync('style.css', 'utf8');
  const styledTemplate = template.replace('__style__', `<style>\n${style}\n</style>`);
  const page = styledTemplate.replace('__params__', JSON.stringify(params));
  // Send the page.
  res.write(page);
  // Close the response.
  res.end();
};
// Serves a script.
const serveScript = (name, res) => {
  res.setHeader('Content-Type', 'text/javascript');
  const script = fs.readFileSync(name, 'utf8');
  // Send the script.
  res.write(script);
  // Close the response.
  res.end();
};
// Prepares to serve an event stream.
const serveEventStart = res => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
};
// Returns an event-stream message.
const sendEventMsg = (streamRes, data) => {
  const msg = `data: ${data}\n\n`;
  streamRes.write(msg);
};
// Parses a query string and returns a query-parameters object.
const parse = queryString => {
  // Parse the query string into a URLSearchParams object.
  const USParams = new URLSearchParams(queryString);
  // Convert it to an object.
  const params = {};
  Array.from(USParams.entries()).forEach(entry => {
    params[entry[0]] = entry[1];
  });
  return params;
};
// Returns an object describing all player IDs and names.
const getPlayers = sessionData => {
  const data = {};
  const {players} = sessionData;
  Object.keys(players).forEach(playerID => {
    data[playerID] = players[playerID].playerName;
  });
  return data;
};
// Broadcasts messages to clients.
const broadcast = (sessionCode, onlyPlayers, subtype, value) => {
  Object.keys(newsStreams[sessionCode]).forEach(userID => {
    if (! onlyPlayers || userID !== 'Leader') {
      sendEventMsg(newsStreams[sessionCode][userID], `${subtype}=${value}`);
    }
  });
};
// Returns whether a patient matches an organ.
const isMatch = (organ, patient) => {
  const isGroupMatch = organ.group === patient.group;
  if (isGroupMatch) {
    return patient.organNeed.map(need => need.organ).includes(organ.organ);
  }
  else {
    return false;
  }
};
// Returns the IDs of the bidders a player can use an influence on the bids of.
const influenceTargets = (versionData, round, influence) => {
  const limits = versionData.limits.influences;
  const {turnsEnded, bids} = round;
  const {turnPlayerID} = round.turns[turnsEnded];
  const turnUseCount = bids.reduce(
    (count, bid) => count + bid.influences.filter(use => use.playerID === turnPlayerID).length, 0
  );
  const targetIndexes = [];
  // If the player is still permitted to use an influence:
  if (turnUseCount < limits.perTurn.max) {
    // For each bid made in the turn:
    bids.forEach((bid, index) => {
      const {influences} = bid;
      // If any player is still permitted to influence it:
      if (influences.length < limits.perBid.max) {
        // If the turn player is still permitted to influence it:
        const playerBidUseCount = influences.filter(use => use.playerID === turnPlayerID).length;
        if (playerBidUseCount < limits.perTurnBid.max) {
          // If the influence type differs from that of all existing influences on the bid:
          if (influences.every(use => use.impact !== influence.impact)) {
            // Add the bid’s index to the eligible bids’ indexes.
            targetIndexes.push(index);
          }
        }
      }
    });
  }
  const targetBidders = targetIndexes.map(index => bids[index].playerID);
  return targetBidders;
};
// Returns specifications for a turn player’s next move.
const taskSpecs = (hasMovedPatient, hasWaivedInfluence, round, hand) => {
  const {patients, influences} = hand;
  // Initialize the specifications.
  const specs = {
    bid: [],
    influence: []
  };
  // If the turn player has not yet moved a patient:
  if (! hasMovedPatient) {
    // Add the indexes of the patients eligible to be bid to the specifications.
    const matchIndexes = patients
    .map((patient, index) => isMatch(round.roundOrgan, patient) ? index : -1)
    .filter(index => index > -1);
    specs.bid = matchIndexes;
  }
  // Add the permitted influence uses to the specifications.
  specs.influence = influences.map(
    influence => influenceTargets(versionData, round, influence)
  );
  // Return the specifications.
  return specs;
};
// Sends move specifications, if any, to a player and returns whether there were any.
const sendTasks = (hasMovedPatient, hasWaivedInfluence, sessionCode, playerID, round, hand) => {
  let anySpecs = false;
  const specs = taskSpecs(hasMovedPatient, hasWaivedInfluence, round, hand);
  const stream = newsStreams[sessionCode][playerID];
  // If the player has not yet moved a patient:
  if (! hasMovedPatient) {
    // Tell the player to bid, if possible, or otherwise to replace.
    if (specs.bid.length) {
      sendEventMsg(stream, `chooseBid=${specs.bid.join('\t')}`);
    }
    else {
      sendEventMsg(stream, 'chooseReplace');
    }
    anySpecs = true;
  }
  // Send the player the influence options, if any.
  specs.influence.forEach((spec, index) => {
    if (spec.length) {
      sendEventMsg(stream, `chooseInfluence=${index}\t${spec.join('\t')}`);
      anySpecs = true;
    }
  });
  return anySpecs;
};
// Returns the specification of a patient.
const patientSpec = patient => {
  const {organNeed, group, priority} = patient;
  const organ0 = organNeed[0].organ;
  const qP0 = organNeed[0].queuePosition;
  const needCount = organNeed.length === 2;
  const organ1 = needCount ? organNeed[1].organ : '';
  const qP1 = needCount ? organNeed[1].queuePosition : '';
  return [organ0, qP0, organ1, qP1, group, priority];
};
// Returns a date-time string.
const nowString = () => (new Date()).toISOString();
// Starts a turn.
const startTurn = sessionData => {
  // Add the turn facts to the session data.
  const round = sessionData.rounds[sessionData.roundsEnded];
  const turnNum = round.turnsEnded;
  const {sessionCode, playerIDs, players} = sessionData;
  const turnPlayerID
    = playerIDs[(playerIDs.indexOf(round.roundStarterID) + turnNum) % playerIDs.length];
  const turn = {
    turnNum,
    turnPlayerID,
    startTime: nowString(),
    bid: false,
    replaced: false,
    influenced: false,
    influenceWaived: false,
    endTime: null
  };
  round.turns.push(turn);
  // Notify the players of the deciding player.
  broadcast(sessionCode, true, 'turnStart', turnPlayerID);
  // Notify the deciding player of the next patient and influence tasks.
  sendTasks(false, false, sessionCode, turnPlayerID, round, players[turnPlayerID].hand.current);
};
// Starts a round.
const startRound = sessionData => {
  // Notify all users of the round facts.
  const roundID = sessionData.roundsEnded;
  const {sessionCode, playerIDs, rounds, piles} = sessionData;
  const playerCount = playerIDs.length;
  const roundStarterID = roundID ? rounds[roundID - 1].nextStarterID : playerIDs[0];
  const starterIndex = playerIDs.indexOf(roundStarterID);
  const roundEnderID = playerIDs[(starterIndex + playerCount - 1) % playerCount];
  const roundOrgan = piles.organs.latent.shift();
  // If there is still a supply of organs:
  if (roundOrgan) {
    const roundNewsParts = [roundID, roundOrgan.organ, roundOrgan.group];
    broadcast(sessionCode, false, 'roundStart', roundNewsParts.join('\t'));
    console.log(`Round ${roundID} started`);
    // Initialize a round record and add it to the session data.
    sessionData.rounds.push({
      roundID,
      startTime: nowString(),
      endTime: null,
      roundStarterID,
      roundEnderID,
      roundOrgan,
      winner: {
        playerID: null,
        patient: null
      },
      nextStarterID: null,
      turnsEnded: 0,
      turns: [],
      bids: [],
      oksBy: []
    });
    // Start the first turn.
    startTurn(sessionData);
  }
  // Otherwise, i.e. if the supply of organs has been exhausted:
  else {
    // Notify all users of the session end.
    const {players} = sessionData;
    const maxRoundsWon = playerIDs
    .map(id => players[id].roundsWon)
    .reduce((max, current) => Math.max(max, current));
    const winners = playerIDs.filter(id => players[id].roundsWon === maxRoundsWon);
    const organSum = Object.values(organSVGs).join(' + ');
    broadcast(
      sessionCode, false, 'sessionEnd', `${organSum} = 0\t${winners.join(', ')}`
    );
  }
};
// Records and deletes a session.
const exportSession = sessionData => {
  // Record the session.
  const {sessionCode} = sessionData;
  fs.writeFileSync(
    `sessions/${sessionData.endTime.slice(0, 13)}-${sessionCode}.json`,
    `${JSON.stringify(sessionData, null, 2)}\n`
  );
  // Delete the session from the collection of sessions.
  delete sessions[sessionCode];
  // Close the news streams.
  const sessionStreams = newsStreams[sessionCode];
  const userIDs = Object.keys(sessionStreams);
  userIDs.forEach(id => {
    sessionStreams[id].end();
  });
};
// Ends a round.
const endRound = sessionData => {
  const round = sessionData.rounds[sessionData.roundsEnded];
  const {bids} = round;
  const {sessionCode, players} = sessionData;
  // If there were any bids in the round:
  if (bids.length) {
    // Add the winner and its patient to the round data.
    const scores = bids.map(bid => {
      const {netPriority} = bid;
      const qP = bid
      .patient
      .organNeed
      .filter(need => need.organ === round.roundOrgan.organ)[0]
      .queuePosition;
      return 100 * netPriority - qP;
    });
    const winningBidIndex = scores.reduce(
      (windex, score, index) => score > scores[windex] ? index : windex, 0
    );
    const winningBid = bids[winningBidIndex];
    const winningPlayerID = winningBid.playerID;
    round.winner = {
      playerID: winningPlayerID,
      patient: winningBid.patient
    };
    const player = players[winningPlayerID];
    player.roundsWon++;
    // Notify all players of the round winner.
    broadcast(
      sessionCode,
      true,
      'roundWinner',
      `${round.roundNum}\t${winningPlayerID}\t${player.roundsWon}`
    );
    // Return the other bid cards to the latent piles.
    bids.forEach((bid, index) => {
      if (index !== winningBidIndex) {
        sessionData.piles.patients.push(bid.patient);
      }
      sessionData.piles.influences.push(...bid.influences.map(card => card.influence));
    });
    // If the winner has not won enough rounds to win the session:
    if (player.roundsWon < versionData.limits.winningRounds.max) {
      // Add the next round’s starter to the session data.
      round.nextStarterID = winningPlayerID;
      // If there are losing bidders:
      if (bids.length > 1) {
        // For each losing bidder:
        const losingPlayerIDs = bids.map(bid => bid.playerID).filter(id => id !== winningPlayerID);
        losingPlayerIDs.forEach(id => {
          // Draw an influence card.
          const card = sessionData.piles.influences.shift();
          players[id].hand.current.influences.push(card);
          // Notify the player about it.
          sendEventMsg(
            newsStreams[sessionCode][id], `handInfluenceAdd=${card.influenceName}\t${card.impact}`
          );
        });
      }
    }
  }
  // Otherwise, i.e. if there were no bids in the round:
  else {
    // Add the next round’s starter to the session data.
    round.nextStarterID = round.roundStarterID;
    // Notify the players of the winnerless round end.
    broadcast(sessionCode, true, 'roundEnd');
  }
  // Add the round data to the session data.
  round.endTime = nowString();
  sessionData.roundsEnded++;
};
// Handles a round-end approval and returns whether all players have approved.
const roundOK = (sessionData, playerID) => {
  // Add the approval to the session data.
  const round = sessionData.rounds[sessionData.roundsEnded - 1];
  round.oksBy.push(playerID);
  // If this is not the last required approval:
  const okCount = new Set(round.oksBy);
  const allOKd = okCount.size === sessionData.playerIDs.length;
  if (! allOKd) {
    // Notify all players.
    broadcast(sessionData.sessionCode, true, 'roundOKd', playerID);
  }
  // Return whether all players have approved.
  return allOKd;
};
// Returns the image of an organ.
const organImage = organName => `<img src="images/${organName}.svg" alt="${organName}>`;
// Processes a post-approval round end.
const finishRound = sessionData => {
  const round = sessionData.rounds[sessionData.roundsEnded - 1];
  // If the round has ended the session:
  const roundWinnerID = round.winner && round.winner.playerID;
  const {sessionCode, players} = sessionData;
  const sessionWon
    = roundWinnerID
    && players[roundWinnerID].roundsWon === versionData.limits.winningRounds.max;
  if (sessionWon || ! sessionData.piles.organs.latent.length) {
    // Add the session winners to the session data.
    const winnerIDs = Object.keys(players).reduce((winners, id) => {
      if (winners.length) {
        if (players[id].roundsWon > players[winners[0]].roundsWon) {
          return [id];
        }
        else if (players[id].roundsWon === players[winners[0]].roundsWon) {
          return winners.concat(id);
        }
        else {
          return winners;
        }
      }
      else {
        return [id];
      }
    }, []);
    sessionData.winnerIDs.push(...winnerIDs);
    // Notify the users.
    const organs = ['heart', 'lung', 'liver'];
    const organImages = organs.map(organ => organImage(organ)).join('');
    const reason = roundWinnerID
      ? `🙌 ${versionData.limits.winningRounds.max}`
      : `${organImages} = 0`;
    broadcast(sessionCode, false, 'sessionEnd', `${reason}\t${winnerIDs.join(', ')}`);
    // End the session.
    sessionData.endTime = nowString();
    console.log(`Session ${sessionCode} ended; won by ${winnerIDs.join(' and ')}`);
    // Record and delete the session.
    exportSession(sessionData);
  }
  // Otherwise, i.e. if this is not the final round:
  else {
    // Start the next round.
    startRound(sessionData);
  }
};
// Ends a turn.
const endTurn = sessionData => {
  const round = sessionData.rounds[sessionData.roundsEnded];
  const turnNum = round.turnsEnded;
  const turn = round.turns[turnNum];
  // Add the turn’s end time to the session data.
  turn.endTime = nowString();
  // Increment the turn count in the session data.
  round.turnsEnded++;
  // Notify all players.
  broadcast(sessionData.sessionCode, true, 'turnEnd');
  // If this was the last turn in the round:
  if (turnNum === sessionData.playerIDs.length - 1) {
    // End the round.
    endRound(sessionData);
  }
  // Otherwise, i.e. if the round’s turns are not yet exhausted:
  else {
    // Start the next turn.
    startTurn(sessionData);
  }
};
// Returns the time in minutes before a session is stopped.
const minutesLeft = (versionData, sessionData) => {
  const creationTime = (new Date(sessionData.creationTime)).getTime();
  const minutesElapsed = Math.round(((Date.now() - creationTime)) / 60000);
  return Math.max(0, versionData.limits.sessionTime.max - minutesElapsed);
};
// Notifies all users that no time is left.
const noTimeNotice = sessionCode => {
  broadcast(
    sessionCode,
    false,
    'sessionEnd',
    '<img src="images/minutes.svg" alt="minutes left> = 0\t∅'
  );
  console.log(`Session ${sessionCode} stopped for exhausting allowed time`);
};
// Handles requests.
const requestHandler = (req, res) => {
  const {method} = req;
  const bodyParts = [];
  req.on('error', err => {
    console.error(`${err.message}\n${err.stack}`);
  })
  .on('data', chunk => {
    bodyParts.push(chunk);
  })
  .on('end', () => {
    let {url} = req;
    if (url.startsWith('/organmatch')) {
      url = url.replace(/^\/organmatch/, '') || '/';
    }
    if (url.endsWith('?')){
      url = url.substring(0, url.length - 1);
    }
    // If the request method was GET:
    if (method === 'GET') {
      // Get any query parameters as an object.
      const absURL = `https://localhost${url}`;
      const urlBase = url.replace(/^\/|\?.+|\/\w+.svg$/g, '');
      const params = parse((new URL(absURL)).search);
      // If a script was requested:
      if (url.endsWith('.js')) {
        // Serve it.
        serveScript(url.slice(1), res);
      }
      // Otherwise, if an image was requested:
      else if (url.startsWith('/images/')) {
        // Serve it and close the response.
        res.setHeader('Content-Type', 'image/svg+xml');
        const image = fs.readFileSync(url.slice(1), 'utf8');
        res.write(image);
        res.end();
      }
      // Otherwise, if the home page was requested:
      else if (['home', 'home.html', ''].includes(urlBase)) {
        // Serve it.
        serveTemplate('home', {}, res);
      }
      // Otherwise, if the game documentation was requested:
      else if (urlBase === 'about') {
        // Serve it.
        serveTemplate('about', {}, res);
      }
      // Otherwise, if the session-creation form was requested:
      else if (urlBase === 'createForm') {
        // Serve it.
        serveTemplate('createForm', {}, res);
      }
      // Otherwise, if the session-joining form was requested:
      else if (urlBase === 'joinForm') {
        // Serve it.
        serveTemplate('joinForm', {}, res);
      }
      // Otherwise, if adding a news stream was requested:
      else if (urlBase === 'newsRequest') {
        const {sessionCode, userID} = params;
        console.log(`News stream for session ${sessionCode} requested by ${userID}`);
        // Send the stream headers to the client.
        serveEventStart(res);
        // Add the response to the news streams.
        const sessionStreams = newsStreams[sessionCode];
        if (sessionStreams) {
          sessionStreams[userID] = res;
          // If the news stream is later closed:
          req.on('close', () => {
            // Delete the user’s news stream.
            delete sessionStreams[userID];
            // If the session data still exist:
            const sessionData = sessions[sessionCode];
            if (sessionData) {
              const userNews = userID === 'Leader' ? 'The leader' : `Player ${userID}`;
              // Notify all users that the session has been aborted.
              broadcast(sessionCode, false, 'sessionEnd', `${userNews} ❌\tNone`);
              console.log(`Session ${sessionCode} aborted by ${userID}`);
              // Add the end time to the session data.
              sessionData.endTime = nowString();
              // Record and delete the session and close all news streams.
              exportSession(sessionData);
            }
          });
        }
      }
      // Otherwise, if the session was started by the leader:
      else if (urlBase === 'startSession') {
        const {sessionCode} = params;
        const sessionData = sessions[sessionCode];
        // Set the start time in the session data.
        sessionData.startTime = nowString();
        // Notify all users.
        broadcast(sessionCode, false, 'sessionStart');
        console.log(`Session ${sessionCode} started`);
        // Notify all users of the time left.
        const minutes = minutesLeft(versionData, sessionData);
        broadcast(sessionCode, false, 'timeLeft', minutes);
        // Shuffle the player IDs in the session data.
        const shuffler = sessionData.playerIDs.map(id => [id, Math.random()]);
        shuffler.sort((a, b) => a[1] - b[1]);
        sessionData.playerIDs = shuffler.map(pair => pair[0]);
        // Notify all players of the shuffling.
        broadcast(sessionCode, true, 'playersShuffled', sessionData.playerIDs.join('\t'));
        // For each player:
        sessionData.playerIDs.forEach(id => {
          const {patients} = sessionData.players[id].hand.initial;
          // For each patient card in the player’s hand:
          patients.forEach(patient => {
            // Notify the player to insert the card at the end.
            const news = patientSpec(patient).join('\t');
            sendEventMsg(newsStreams[sessionCode][id], `handPatientAdd=end\t${news}`);
          });
        });
        // Start the first round.
        startRound(sessionData);
        // Close the response.
        res.end();
      }
      // Otherwise, if a bid or replacement was made:
      else if (urlBase === 'patient') {
        const {sessionCode, playerID, task, index} = params;
        const sessionData = sessions[sessionCode];
        // If any time is left:
        const timeLeft = minutesLeft(versionData, sessionData);
        if (timeLeft) {
          // Notify all users of the time left.
          broadcast(sessionCode, false, 'timeLeft', minutesLeft(versionData, sessionData));
          const player = sessionData.players[playerID];
          const round = sessionData.rounds[sessionData.roundsEnded];
          const {bids, turns} = round;
          const turn = turns[turns.length - 1];
          // If the move was a bid:
          if (task === 'bid') {
            // Notify all players of the bid.
            const patient = player.hand.current.patients[index];
            const bidNews = [playerID].concat(patientSpec(patient)).join('\t');
            broadcast(sessionCode, true, 'didBid', bidNews);
            // Add the bid to the round data.
            bids.push({
              playerID,
              patient,
              influences: [],
              netPriority: patient.priority
            });
            // Add the bid to the turn data.
            turn.bid = true;
          }
          // Otherwise, i.e. if the move was a replacement:
          else {
            // Add the replacement to the turn data.
            turn.replaced = true;
            // Notify all players.
            broadcast(sessionCode, true, 'didReplace', playerID);
          }
          // Draw a new patient.
          const newPatient = sessionData.piles.patients.shift();
          // Substitute the new patient in the hand for the lost one.
          const currentHand = player.hand.current;
          currentHand.patients[index] = newPatient;
          // Notify the player of the change.
          const newPlayerNews = [index].concat(patientSpec(newPatient)).join('\t');
          const newPlayerMsg = `handPatientAdd=${newPlayerNews}`;
          sendEventMsg(newsStreams[sessionCode][playerID], newPlayerMsg);
          // Send specifications, if any, for the next move to the player.
          const anySpecs = sendTasks(
            true, turn.influenceWaived, sessionCode, playerID, round, currentHand
          );
          // If there were none:
          if (! anySpecs) {
            // End the turn.
            endTurn(sessionData);
          }
        }
        // Otherwise, i.e. if no time is left:
        else {
          // Notify all users that the session has been ended.
          noTimeNotice(sessionCode);
          // Record and delete the session.
          exportSession(sessionData);
        }
        // Close the response.
        res.end();
      }
      // Otherwise, if an influence card was used:
      else if (urlBase === 'influence') {
        const {sessionCode, playerID, index, bidderID} = params;
        const sessionData = sessions[sessionCode];
        // If any time is left:
        const timeLeft = minutesLeft(versionData, sessionData);
        if (timeLeft) {
          // Notify all users of the time left.
          broadcast(sessionCode, false, 'timeLeft', minutesLeft(versionData, sessionData));
          const player = sessionData.players[playerID];
          const round = sessionData.rounds[sessionData.roundsEnded];
          const {bids, turns} = round;
          // Add the use to the session data.
          const currentHand = player.hand.current;
          const {influences} = currentHand;
          const use = {
            playerID,
            influence: influences[index]
          };
          const bidIndex = bids.findIndex(bid => bid.playerID === bidderID);
          const bid = bids[bidIndex];
          bid.influences.push(use);
          bid.netPriority = bid.patient.priority + bid.influences.reduce(
            (change, use) => change + use.influence.impact, 0
          );
          const turn = turns[turns.length - 1];
          turn.influenced = true;
          // Notify all players of the use.
          const {impact} = use.influence;
          const signedImpact = impact > 0 ? `+${impact}` : `&minus;${Math.abs(impact)}`;
          const useNews = `${playerID}\t${bidderID}\t${signedImpact}\t${bid.netPriority}`;
          broadcast(sessionCode, true, 'didInfluence', useNews);
          // Remove the card from the player’s hand.
          influences.splice(index, 1);
          // Send specifications, if any, for the next move to the player.
          const hasMovedPatient = turn.bid || turn.replaced;
          const anySpecs = sendTasks(
            hasMovedPatient, false, sessionCode, playerID, round, currentHand
          );
          // If there were none:
          if (! anySpecs) {
            // End the turn.
            endTurn(sessionData);
          }
        }
        // Otherwise, i.e. if no time is left:
        else {
          // Notify all users that the session has been ended.
          noTimeNotice(sessionCode);
          // Record and delete the session.
          exportSession(sessionData);
        }
        // Close the response.
        res.end();
      }
      // Otherwise, if a player waived influence:
      else if (urlBase === 'influenceNone') {
        const {sessionCode, playerID} = params;
        const sessionData = sessions[sessionCode];
        // If any time is left:
        const timeLeft = minutesLeft(versionData, sessionData);
        if (timeLeft) {
          // Notify all users of the time left.
          broadcast(sessionCode, false, 'timeLeft', minutesLeft(versionData, sessionData));
          // Add the waiver to the session data.
          const round = sessionData.rounds[sessionData.roundsEnded];
          const {turns} = round;
          const turn = turns[turns.length - 1];
          turn.influenceWaived = true;
          // If the player has not yet moved a patient:
          const hasMovedPatient = turn.bid || turn.replaced;
          if (! hasMovedPatient) {
            // Send specifications for the patient move to the player.
            const player = sessionData.players[playerID];
            const currentHand = player.hand.current;
            sendTasks(hasMovedPatient, true, sessionCode, playerID, round, currentHand);
          }
          // Otherwise, i.e. if the player has moved a patient and thus has no move options:
          else {
            // End the turn.
            endTurn(sessionData);
          }
        }
        // Otherwise, i.e. if no time is left:
        else {
          // Notify all users that the session has been ended.
          noTimeNotice(sessionCode);
          // Record and delete the session.
          exportSession(sessionData);
        }
        // Close the response.
        res.end();
      }
      // Otherwise, if a player approved finishing a round:
      else if (urlBase === 'roundOK') {
        const {sessionCode, playerID} = params;
        console.log(`roundOK received from ${playerID}`);
        const sessionData = sessions[sessionCode];
        // If any time is left:
        const timeLeft = minutesLeft(versionData, sessionData);
        if (timeLeft) {
          // Notify all users of the time left.
          broadcast(sessionCode, false, 'timeLeft', minutesLeft(versionData, sessionData));
          // Process the approval.
          const allOKd = roundOK(sessionData, playerID);
          // If all players have approved:
          if (allOKd) {
            // Finish the round.
            finishRound(sessionData);
          }
        }
        // Otherwise, i.e. if no time is left:
        else {
          // Notify all users that the session has been ended.
          noTimeNotice(sessionCode);
          // Record and delete the session.
          exportSession(sessionData);
        }
        // Close the response.
        res.end();
      }
    }
    // Otherwise, if the request method was POST:
    else if (method === 'POST') {
      // Identify the limits on player counts.
      const minPlayerCount = versionData.limits.playerCount.min;
      const maxPlayerCount = versionData.limits.playerCount.max;
      // Get the data as an object.
      const params = parse(Buffer.concat(bodyParts).toString());
      // If a session creation was requested:
      if (url === '/createSession') {
        // Create a session and get its data.
        const sessionData = require('./createSession')(versionData);
        const {sessionCode} = sessionData;
        // Add them to the data on all current sessions.
        sessions[sessionCode] = sessionData;
        // Initialize the new-player streams for the session.
        newsStreams[sessionCode] = {};
        // Serve a session-status page.
        serveTemplate('leaderStatus', {
          minPlayerCount,
          maxPlayerCount,
          proxy: process.env.PROXY || '',
          sessionCode
        }, res);
        console.log(`Session ${sessionCode} created`);
      }
      // Otherwise, if the user asked to join a session:
      else if (url === '/joinSession') {
        const {sessionCode, playerName} = params;
        // If the session code is valid:
        const sessionCodeOK = Object.keys(sessions).includes(sessionCode);
        if (sessionCodeOK) {
          const sessionData = sessions[sessionCode];
          let playerData = getPlayers(sessionData);
          const playerNames = Object.values(playerData);
          // If the user is already a player:
          if (playerNames.includes(playerName)) {
            // Serve an error page.
            serveTemplate(
              'error', {error: `${playerName} is already a player in session ${sessionCode}`}, res
            );
          }
          // Otherwise, if no more players are permitted:
          else if (playerNames.length === versionData.limits.playerCount.max) {
            // Serve an error page.
            serveTemplate(
              'error', {error: `Joining session ${sessionCode} would give it too many players`}, res
            );
          }
          // Otherwise, if the session has already started:
          else if (sessionData.startTime) {
            // Serve an error page.
            serveTemplate('error', {error: `Session ${sessionCode} has already started`}, res);
          }
          // Otherwise, i.e. if the user is permitted to join the session:
          else {
            // Assign an ID to the player, starting with “A” for the first.
            const playerID = String.fromCharCode(65 + playerNames.length);
            // Send the new player’s ID and name to all other players and the leader.
            broadcast(sessionCode, false, 'playerAdd', `${playerID}\t${playerName}`);
            // Add the player to the session data and to the list of players.
            require('./addPlayer')(versionData, sessionData, playerID, playerName, '');
            playerData = getPlayers(sessionData);
            // Serve a session-status page.
            serveTemplate(
              'playerStatus', {
                sessionCode,
                playerID,
                playerData,
                groupData: versionData.matchGroups.groups,
                minPlayerCount,
                maxPlayerCount,
                organSVGs,
                influenceSVGs,
                etcSVGs
              },
              res
            );
          }
        }
        // Otherwise, i.e. if the session code is invalid:
        else {
          // Serve an error page.
          serveTemplate(
            'error', {error: `There is no session with code <q>${sessionCode}</q>`}, res
          );
        }
      }
    }
  });
};

// ########## SERVER

if (key && cert) {
  const server = http2.createSecureServer(
    {
      key,
      cert,
      allowHTTP1: true
    },
    requestHandler
  );
  // Change the default idle time before the server emits a timeout event to 20 minutes.
  server.setTimeout(1200000);
  if (server) {
    const {PORT} = process.env;
    server.listen(PORT);
    console.log(`OrganMatch server listening on port ${PORT} (${process.env.PROXY})`);
  }
}
