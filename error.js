// playerStatus
const params = JSON.parse(document.getElementById('params').textContent);
const {error} = params;
document.getElementById('error').innerHTML = error;
