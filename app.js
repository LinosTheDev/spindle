// app.js

const clientId = 'f4bc390330824ced9bb1276bb947f315';
const redirectUri = 'https://spindle.click/callback.html';
const scopes = ['playlist-read-private', 'user-library-read'];

document.getElementById('loginBtn').addEventListener('click', () => {
  const url = `https://accounts.spotify.com/authorize?client_id=${clientId}&response_type=token&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scopes.join('%20')}`;
  window.location.href = url;
});

window.onload = async () => {
  const token = localStorage.getItem('spotify_token');
  if (!token) return;

  const headers = {
    Authorization: 'Bearer ' + token
  };

  // 1. Get user's playlists
  const playlistRes = await fetch('https://api.spotify.com/v1/me/playlists', { headers });
  const playlistData = await playlistRes.json();
  const playlists = playlistData.items;

  // 2. Get tracks from first playlist
  const firstPlaylist = playlists[0];
  const tracksRes = await fetch(firstPlaylist.tracks.href, { headers });
  const tracksData = await tracksRes.json();
  const seedTrack = tracksData.items[0].track.id;

  // 3. Get recommendations
  const recRes = await fetch(`https://api.spotify.com/v1/recommendations?seed_tracks=${seedTrack}&limit=5`, { headers });
  const recData = await recRes.json();

  // 4. Display results
  const container = document.getElementById('recommendations');
  recData.tracks.forEach(track => {
    const card = document.createElement('div');
    card.innerHTML = `
      <p><strong>${track.name}</strong> by ${track.artists[0].name}</p>
      <img src="${track.album.images[0].url}" width="200"/>
      <br><a href="${track.external_urls.spotify}" target="_blank">Open in Spotify</a>
    `;
    container.appendChild(card);
  });
};
