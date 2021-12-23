// leaderStatus
const params = (new URL(document.url)).searchParams;
const {sessionCode} = params;
document.getElementById('sessionCode').textContent = sessionCode;
