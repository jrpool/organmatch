// join.js
const getCode = () => {
  const url = new URL(document.URL);
  const params = new URLSearchParams(url.search);
  const code = params.get('code');
  return code;
};
const showAll = async () => {
  const code = getCode();
  if (code) {
    document.getElementById('code').value = code;
  }
  document.getElementById('form').classList.remove('invisible');
};
showAll();
