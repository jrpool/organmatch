#!/usr/bin/env node

const gameData = 
  const response = await fetch('vs/v00.json');
  return await response.json();
};
const getPlayerCount = gameData => {
  const limits = gameData.playerCount;
  const url = new URL(document.URL);
  const params = new URLSearchParams(url.search);
  const count = params.get('playerCount');
  return count && count >= limits[0] && count <= limits[1] ? count : null;
};
const createCode = () => {
  const now = Date.now();
  return now.toString().slice(5, 10);
}
const createGame = async (code, playerCount, timeLimit) => {
  await fetch(`createGame.js?code=${code}&playerCount=${playerCount}&timeLimit=${timeLimit}`);
};
const showAll = async () => {
  const gameData = await getV00();
  const playerCount = getPlayerCount(gameData);
  const {timeLimit} = gameData;
  const code = createCode();
  await createGame(code, playerCount, timeLimit);
  const shortLink = `join.html?code=${code}`;
  const longLink = `https://jpdev.pro/jpdev/om/${shortLink}`;
  document.getElementById('playerCount').textContent = playerCount;
  document.getElementById('longLink').textContent = longLink;
  document.getElementById('shortLink').href = shortLink;
  document.getElementById('timeLimit').textContent = timeLimit;
  document.getElementById('section').classList.remove('invisible');
};
showAll();
