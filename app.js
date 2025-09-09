// --- Constants ---
const clientId = "f4bc390330824ced9bb1276bb947f315";
const redirectUri = "https://spindle.click/callback.html";
const scopes = ["playlist-read-private", "user-library-read"];

// --- Login Button ---
const loginBtn = document.getElementById("loginBtn");
if (loginBtn) {
  loginBtn.addEventListener("click", () => {
const authUrl =
    "https://accounts.spotify.com/authorize" +
    "?client_id=f4bc390330824ced9bb1276bb947f315" +
    "&response_type=token" +
    "&redirect_uri=" + encodeURIComponent("https://spindle.click/callback.html") +
    "&scope=" + encodeURIComponent(["playlist-read-private", "user-library-read"].join(" "));
    window.location.href = authUrl;
  });
}

// --- On Page Load ---
window.onload = async () => {
  const token = localStorage.getItem("spotify_token");
  if (!token) return; // Not logged in

  const headers = { Authorization: "Bearer " + token };

  // Fetch user's playlists
  try {
    const playlistsRes = await fetch("https://api.spotify.com/v1/me/playlists", { headers });
    const playlistsData = await playlistsRes.json();

    const container = document.getElementById("playlists");
    if (!container) return;

    container.innerHTML = "<h2>Your Playlists</h2>";

    playlistsData.items.forEach(playlist => {
      const button = document.createElement("button");
      button.textContent = playlist.name;
      button.style.margin = "5px";
      button.onclick = () => selectPlaylist(playlist.id, token);
      container.appendChild(button);
    });
  } catch (err) {
    console.error("Error fetching playlists:", err);
  }
};

// --- Select Playlist & Fetch Recommendations ---
async function selectPlaylist(playlistId, token) {
  const headers = { Authorization: "Bearer " + token };

  try {
    // Get tracks from selected playlist
    const tracksRes = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, { headers });
    const tracksData = await tracksRes.json();

    // Use first valid track as seed
    const firstTrack = tracksData.items.find(item => item.track && item.track.id);
    if (!firstTrack) {
      alert("Couldn't find a valid track in this playlist.");
      return;
    }
    const seedTrackId = firstTrack.track.id;

    // Get recommendations
    const recRes = await fetch(`https://api.spotify.com/v1/recommendations?seed_tracks=${seedTrackId}&limit=10`, { headers });
    const recData = await recRes.json();

    const recContainer = document.getElementById("recommendations");
    if (!recContainer) return;

    recContainer.innerHTML = "<h2>Recommended Songs</h2>";

    recData.tracks.forEach(track => {
      const card = document.createElement("div");
      card.style.margin = "15px 0";
      card.innerHTML = `
        <p><strong>${track.name}</strong> by ${track.artists[0].name}</p>
        <img src="${track.album.images[0]?.url}" width="200"/>
        <br><a href="${track.external_urls.spotify}" target="_blank">Open in Spotify</a>
      `;
      recContainer.appendChild(card);
    });

  } catch (err) {
    console.error("Error fetching recommendations:", err);
  }
}
