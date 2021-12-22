// createSession
const params = JSON.parse(document.getElementById('params').textContent);
const {docRoot} = params;
const queryParams = URL.searchParams(document.url).entries;
if (queryParams.has('sessionCode')) {
  const sessionCode = queryParams.get('sessionCode');
  document.getElementById('sessionCode').value = sessionCode;
}
document.getElementById('joinSession').action = `${docRoot}/joinSession`;
