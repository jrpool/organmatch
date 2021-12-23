// joinForm
const queryParams = (new URL(document.URL)).searchParams;
if (queryParams.has('sessionCode')) {
  const sessionCode = queryParams.get('sessionCode');
  document.getElementById('sessionCode').value = sessionCode;

}
