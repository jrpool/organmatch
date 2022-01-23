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
// Data on version 01.
const versionData = require('./getVersion')('01');
const key = fs.readFileSync(process.env.KEY);
const cert = fs.readFileSync(process.env.CERT);

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
// Parses a query string into a query-parameters object.
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
// Returns an object describing player IDs and names.
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
// Returns a list item identifying a player before a session starts.
const playerListItem = (sessionData, playerID) => {
  const {playerName} = sessionData.players[playerID];
  const idNews = `[<span class="mono">${playerID}</span>]`;
  const winCountNews = `rounds won: <span id="winCount${playerID}">0</span>`;
  const winListNews = `(<span id="winList${playerID}"></span>)`;
  return `<li>${idNews} ${playerName}; ${winCountNews} ${winListNews}</li>`;
};
// Notifies all users of a revised list of players before a session starts.
const revisePlayerLists = sessionCode => {
  const sessionData = sessions[sessionCode];
  const {playerIDs} = sessionData;
  const playerList = playerIDs
  .map(id => playerListItem(sessionData, id))
  .join('#newline#');
  broadcast(sessionCode, false, 'revision', playerList);
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
// Returns specifications for a turn player’s next move.
const nextPatientMove = (round, hand) => {
  const {patients} = hand;
  const matchNums = patients
  .map((patient, index) => isMatch(round.roundOrgan, patient) ? index + 1 : 0)
  .filter(index => index);
  // If there are any matches between patients and the organ:
  if (matchNums.length) {
    // Return the bid specifications.
    return `bid\t${matchNums.join('\t')}`;
  }
  // Otherwise, i.e. if there are no patient matches:
  else {
    // Return the replacement specifications.
    const patientNums = patients.map((patient, index) => index + 1);
    return `swap\t${patientNums.join('\t')}`;
  }
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
  // Notify all users of the turn facts.
  const round = sessionData.rounds[sessionData.roundsEnded];
  const turnNum = round.turnsEnded;
  const {playerIDs} = sessionData;
  const turnPlayerID
    = playerIDs[(playerIDs.indexOf(round.roundStarterID) + turnNum) % playerIDs.length];
  const turn = {
    turnNum,
    turnPlayerID,
    startTime: nowString(),
    bid: false,
    influenced: false,
    endTime: null
  };
  round.turns.push(turn);
  const {sessionCode} = sessionData;
  broadcast(sessionCode, false, 'turn', `${turnNum}\t: current`);
  // For each player:
  sessionData.playerIDs.forEach(id => {
    // If the player is the turn player:
    if (id === turnPlayerID) {
      // Notify the leader and the player of the player’s next task.
      const moveSpec = nextPatientMove(round, sessionData.players[id].hand.current);
      const taskMsg = `task=${moveSpec}`;
      const streams = newsStreams[sessionCode];
      sendEventMsg(streams.Leader, taskMsg);
      sendEventMsg(streams[id], taskMsg);
      // Notify the leader of the new turn player’s hand.
      const {patients} = sessionData.players[id].hand.current;
      patients.forEach(patient => {
        const news = patientSpec(patient).join('\t');
        sendEventMsg(newsStreams[sessionCode].Leader, `handPatientAdd=${news}`);
      });
    }
    // Otherwise, i.e. if the player is not the turn player:
    else {
      // Notify the player of the player’s task.
      sendEventMsg(newsStreams[sessionCode][id], 'task=wait');
    }
  });
};
// Starts a round.
const startRound = sessionData => {
  // Notify all users of the round facts.
  const roundNum = sessionData.roundsEnded;
  const {sessionCode, playerIDs} = sessionData;
  const playerCount = playerIDs.length;
  const roundStarterID = roundNum ? sessionData.rounds[roundNum - 1].nextStarterID : playerIDs[0];
  const starterIndex = playerIDs.indexOf(roundStarterID);
  const roundEnderID = playerIDs[(starterIndex + playerCount - 1) % playerCount];
  const roundOrgan = sessionData.piles.organs.latent.shift();
  const roundNewsParts = [roundNum, roundOrgan.organ, roundOrgan.group];
  broadcast(sessionCode, false, 'round', roundNewsParts.join('\t'));
  const turnPlayerIDs = playerIDs.slice(starterIndex).concat(playerIDs.slice(0, starterIndex));
  turnPlayerIDs.forEach((id, index) => {
    broadcast(sessionCode, false, 'turnInit', `${index}\t${id}`);
  });
  // Initialize a round record and add it to the session data.
  sessionData.rounds.push({
    roundNum,
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
    oksBy: new Set()
  });
  // Start the first turn.
  startTurn(sessionData);
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
    // Notify all users of the winner.
    broadcast(sessionCode,  false, 'roundWinner', `${round.roundNum}\t${winningPlayerID}`);
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
      // Notify all users of the next round’s starter.
      broadcast(sessionCode, false, 'roundImpact', `false\t${round.nextStarterID}`);
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
    // Otherwise, i.e. if the winner has won the session:
    else {
      // Notify all users of the round’s finality.
      broadcast(sessionCode, false, 'roundImpact', 'true\t');
    }
  }
  // Otherwise, i.e. if there were no bids in the round:
  else {
    // Add the next round’s starter to the session data.
    round.nextStarterID = round.roundStarterID;
    // Notify all users of the next round’s starter.
    broadcast(sessionCode, false, 'roundImpact', `false\t${round.nextStarterID}`);
  }
  // Add the round data to the session data.
  round.endTime = nowString();
  sessionData.roundsEnded++;
  // Notify the players of their task of approving the round end.
  broadcast(sessionCode, true, 'task', 'roundOK');
};
// Handles a round-end approval and returns whether all players have approved.
const roundOK = (sessionData, playerID) => {
  // Add the approval to the session data.
  const round = sessionData.rounds[sessionData.roundsEnded - 1];
  round.oksBy.add(playerID);
  // If this is not the last required approval:
  const allOKd = round.oksBy.size === sessionData.playerIDs.length;
  if (! allOKd) {
    // Notify all users.
    broadcast(sessionData.sessionCode, false, 'roundOKd', playerID);
  }
  // Return whether all players have approved.
  return allOKd;
};
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
    broadcast(sessionCode, false, 'sessionStage', `Ended; won by ${winnerIDs.join(' and ')}`, );
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
  // Notify all users.
  const turnSummary = ` ${turn.bid ? 'bid' : 'replaced'}${turn.influenced ? '; influenced' : ''}`;
  broadcast(sessionData.sessionCode, false, 'turn', `${turnNum}\t:${turnSummary}`);
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
// Returns the indexes of the bids a player can use an influence on.
const targets = (versionData, playerID, influence, bids) => {
  const limits = versionData.limits.influences;
  const turnUseCount = bids.reduce(
    (count, bid) => count + bid.influences.filter(use => use.playerID === playerID).length, 0
  );
  const targetIndexes = [];
  // If the player is still permitted to use an influence:
  if (turnUseCount < limits.perTurn.max) {
    // For each bid made in the turn:
    bids.forEach((bid, index) => {
      const {influences} = bid;
      // If any player is still permitted to influence it:
      if (influences.length < limits.perBid.max) {
        // If the turn’s player is still permitted to influence it:
        const playerBidUseCount = influences.filter(use => use.playerID === playerID).length;
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
  return targetIndexes;
};
// Manages an influence decision.
const prepInfluence = (versionData, sessionData, playerID, bids, startIndex) => {
  // If the player has any more influence cards and there are any bids in the turn:
  const {influences} = sessionData.players[playerID].hand.current;
  if (influences.length > startIndex && bids.length) {
    // For each card until a usable one is found:
    let index = startIndex;
    while (index > -1 && index < influences.length) {
      // If the player can use it on any bids:
      const targetIndexes = targets(versionData, playerID, influences[index], bids);
      if (targetIndexes.length) {
        // Notify the player and the leader of the task.
        const {sessionCode} = sessionData;
        const taskNews
          = `use\t${index + 1}\t${targetIndexes.map(index => index + 1).join('\t')}`;
        sendEventMsg(newsStreams[sessionCode][playerID], `task=${taskNews}`);
        sendEventMsg(newsStreams[sessionCode].Leader, `task=${taskNews}`);
        index = -1;
      }
      else {
        index++;
      }
    }
    // If no usable influence card was found:
    if (index > -1) {
      // End the turn and start the next turn or round.
      endTurn(sessionData);
    }
  }
  // Otherwise, i.e. if the player cannot use any influence cards:
  else {
    // End the turn and start the next turn or round.
    endTurn(sessionData);
  }
};
// Returns the time in minutes before a session is stopped.
const minutesLeft = (versionData, sessionData) => {
  const creationTime = (new Date(sessionData.creationTime)).getTime();
  const minutesElapsed = Math.round(((Date.now() - creationTime)) / 60000);
  return Math.max(0, versionData.limits.sessionTime.max - minutesElapsed);
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
      const urlBase = url.replace(/^\/|\?.+/g, '');
      const params = parse((new URL(absURL)).search);
      // If a script was requested:
      if (url.endsWith('.js')) {
        // Serve it.
        serveScript(url.slice(1), res);
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
        sessionStreams[userID] = res;
        // If the user later closes the request:
        req.on('close', () => {
          // Delete the user’s news stream.
          delete sessionStreams[userID];
          const sessionData = sessions[sessionCode];
          let userNews;
          // If the user was the leader:
          if (userID === 'Leader') {
            userNews = 'The leader';
            // Notify all users that the session has been aborted.
            broadcast(sessionCode, false, 'sessionStage', 'Aborted');
            console.log(`Session ${sessionCode} aborted`);
            // Add the end time to the session data.
            sessionData.endTime = nowString();
            // Record and delete the session.
            exportSession(sessionData);
          }
          // Otherwise, i.e. if the user was a player:
          else {
            userNews = `Player ${userID} (${sessionData.players[userID].playerName})`;
            // Remove the player from the session data.
            delete sessionData.players[userID];
            const {playerIDs} = sessionData;
            playerIDs.splice(playerIDs.indexOf(userID), 1);
            // Notify all users.
            revisePlayerLists(sessionCode);
          }
          console.log(`${userNews} in session ${sessionCode} has closed the connection`);
        });
      }
      // Otherwise, if the session was started by the leader:
      else if (urlBase === 'startSession') {
        const {sessionCode} = params;
        const sessionData = sessions[sessionCode];
        // Set the start time in the session data.
        sessionData.startTime = nowString();
        // Notify all users.
        const minutes = minutesLeft(versionData, sessionData);
        broadcast(
          sessionCode,
          false,
          'sessionStage',
          `Started; <span id="timeLeft">${minutes}</span> minutes left`
        );
        console.log(`Session ${sessionCode} started`);
        // Shuffle the player IDs in the session data.
        const shuffler = sessionData.playerIDs.map(id => [id, Math.random()]);
        shuffler.sort((a, b) => a[1] - b[1]);
        sessionData.playerIDs = shuffler.map(pair => pair[0]);
        // Notify all users of the shuffling.
        revisePlayerLists(sessionCode);
        // For each player:
        sessionData.playerIDs.forEach((id, index) => {
          const {patients, influences} = sessionData.players[id].hand.initial;
          // For each patient card in the player’s hand:
          patients.forEach(patient => {
            // Notify the player of the card.
            const news = patientSpec(patient).join('\t');
            sendEventMsg(newsStreams[sessionCode][id], `handPatientAdd=${news}`);
            // If the player is the session’s starter:
            if (index === 0) {
              // Notify the leader of the card.
              sendEventMsg(newsStreams[sessionCode].Leader, `handPatientAdd=${news}`);
            }
          });
          // For each influence card in the player’s hand:
          influences.forEach(influence => {
            // Notify the player of the card.
            const {influenceName, impact} = influence;
            const news = [influenceName, impact].join('\t');
            sendEventMsg(newsStreams[sessionCode][id], `handInfluenceAdd=${news}`);
            // If the player is the session’s starter:
            if (index === 0) {
              // Notify the leader of the card.
              sendEventMsg(newsStreams[sessionCode].Leader, `handInfluenceAdd=${news}`);
            }
          });
        });
        // Start the first round.
        startRound(sessionData);
        // Close the response.
        res.end();
      }
      // Otherwise, if a bid or replacement was made:
      else if (['bid', 'swap'].includes(urlBase)) {
        const {sessionCode, playerID, cardNum} = params;
        const sessionData = sessions[sessionCode];
        // If any time is left:
        const timeLeft = minutesLeft(versionData, sessionData);
        if (timeLeft) {
          // Notify all users of the time left.
          broadcast(sessionCode, false, 'timeLeft', minutesLeft(versionData, sessionData));
          const player = sessionData.players[playerID];
          const round = sessionData.rounds[sessionData.roundsEnded];
          const {bids, turns} = round;
          // If the move was a bid:
          if (urlBase === 'bid') {
            // Notify all users of the bid.
            const patient = player.hand.current.patients[cardNum - 1];
            const bidNews = `Bid by ${playerID}: ${patientSpec(patient).join('\t')}`;
            broadcast(sessionCode, false, 'bidAdd', bidNews);
            // Add the bid to the round data.
            bids.push({
              playerID,
              patient,
              influences: [],
              netPriority: patient.priority
            });
            // Add the bid to the turn data.
            const turn = turns[turns.length - 1];
            turn.bid = true;
          }
          // Draw a patient to replace the lost patient.
          const newPatient = sessionData.piles.patients.shift();
          player.hand.current.patients[cardNum - 1] = newPatient;
          // Notify the player of the replacement.
          const replacementNews = [cardNum].concat(patientSpec(newPatient)).join('\t');
          const replacementMsg = `handPatientReplace=${replacementNews}`;
          sendEventMsg(newsStreams[sessionCode][playerID], replacementMsg);
          // Prepare a possible influence decision by the player.
          prepInfluence(versionData, sessionData, playerID, bids, 0);
        }
        // Otherwise, i.e. if no time is left:
        else {
          // Notify all users that the session has been ended.
          broadcast(sessionCode, false, 'sessionStage', 'Stopped; allowed time exhausted');
          console.log(`Session ${sessionCode} stopped for exhausting allowed time`);
          // Record and delete the session.
          exportSession(sessionData);
        }
        // Close the response.
        res.end();
      }
      // Otherwise, if a decision was made about an influence card:
      else if (urlBase === 'use') {
        const {sessionCode, playerID, targetNum} = params;
        const cardNum = Number.parseInt(params.cardNum);
        const sessionData = sessions[sessionCode];
        // If any time is left:
        const timeLeft = minutesLeft(versionData, sessionData);
        if (timeLeft) {
          // Notify all users of the time left.
          broadcast(sessionCode, false, 'timeLeft', minutesLeft(versionData, sessionData));
          const player = sessionData.players[playerID];
          const round = sessionData.rounds[sessionData.roundsEnded];
          const {bids, turns} = round;
          // If the decision was to use the card:
          if (params.targetNum !== 'keep') {
            const bid = bids[targetNum - 1];
            // Add the use to the session data.
            const {influences} = player.hand.current;
            const use = {
              playerID,
              influence: influences[cardNum - 1]
            };
            bid.influences.push(use);
            const freePriority = bid.patient.priority + bid.influences.reduce(
              (change, use) => change + use.influence.impact, 0
            );
            const limits = versionData.limits.bidPriority;
            bid.netPriority = Math.min(freePriority, Math.max(freePriority, limits.min));
            const turn = turns[turns.length - 1];
            turn.influenced = true;
            // Notify all users of the use.
            const {impact} = use.influence;
            const signedImpact = impact > 0 ? `+ ${impact}` : `- ${Math.abs(impact)}`;
            const useNews = ` ${signedImpact} by ${playerID} (net ${bid.netPriority})`;
            broadcast(sessionCode, false, 'use', `${targetNum}\t${useNews}`);
            // Remove the card from the player’s hand.
            influences.splice(cardNum - 1, 1);
            // Notify the player and the leader of the hand change.
            sendEventMsg(newsStreams[sessionCode][playerID], `influenceRemove=${cardNum}`);
            sendEventMsg(newsStreams[sessionCode].Leader, `influenceRemove=${cardNum}`);
          }
          // Prepare another possible influence decision by the player.
          const nextInfluenceIndex = cardNum - (targetNum === 'keep' ? 0 : 1);
          prepInfluence(versionData, sessionData, playerID, bids, nextInfluenceIndex);
        }
        // Otherwise, i.e. if no time is left:
        else {
          // Notify all users that the session has been ended.
          broadcast(sessionCode, false, 'sessionStage', 'Stopped; allowed time exhausted');
          console.log(`Session ${sessionCode} stopped for exhausting allowed time`);
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
          broadcast(sessionCode, false, 'sessionStage', 'Stopped; allowed time exhausted');
          console.log(`Session ${sessionCode} stopped for exhausting allowed time`);
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
          // If the user is already a player:
          const playerData = getPlayers(sessionData);
          const playerNames = Object.values(playerData);
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
            broadcast(sessionCode, false, 'addition', `${playerID}\t${playerName}`);
            // Add the player to the session data.
            require('./addPlayer')(versionData, sessionData, playerID, playerName, '');
            // Compile a list of players, including the added one.
            const {playerIDs} = sessionData;
            const playerListItems = playerIDs.map(
              playerID => playerListItem(sessionData, playerID)
            );
            const playerList = playerListItems.join('\n');
            // Serve a session-status page, including the list.
            serveTemplate(
              'playerStatus',
              {sessionCode, playerList, playerID, playerName, minPlayerCount, maxPlayerCount},
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
