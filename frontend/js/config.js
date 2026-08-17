(function () {
  var local = ['localhost', '127.0.0.1'].includes(window.location.hostname);
  window.API_URL = local
    ? 'http://localhost:3001'
    : 'https://SEU-APP.up.railway.app'; // substituir pela URL real do Railway
})();
