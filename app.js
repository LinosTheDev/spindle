// app.js

const clientId = 'YOUR_CLIENT_ID';
const redirectUri = 'http://localhost:5500/callback.html';
const scopes = ['playlist-read-private', 'user-library-read'];

document.getElementById('loginBtn').addEventListener('click', () => {
  const url = `https://accounts.spotify.com/authorize?client_id=${clientId}&response_type=token&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scopes.join('%20')}`;
  window.location.href = url;
});
