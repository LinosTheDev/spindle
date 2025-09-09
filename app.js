const clientId = "f4bc390330824ced9bb1276bb947f315";
const scopes = ["playlist-read-private", "user-library-read"];
const redirectUri = "https://spindle.click/";


// --- LOGIN BUTTON ---
document.getElementById("loginBtn").addEventListener("click", () => {
  const authUrl =
    "https://accounts.spotify.com/authorize" +
    "?client_id=f4bc390330824ced9bb1276bb947f315" +
    "&response_type=token" +
    "&redirect_uri=" + encodeURIComponent("https://spindle.click/") +
    "&scope=" + encodeURIComponent("playlist-read-private user-library-read");

  window.location.href = authUrl;
  
});

// --- GET TOKEN FROM URL HASH ---
function getTokenFromHash() {
  const hash = window.location.hash.substring(1);
  const params = new URLSearchParams(hash);
  const token = params.get("access_token");
  if (token) {
    localStorage.setItem("spotify_token", token);
    window.location.hash = ""; // clean URL
    return token;
  }
  return localStorage.getItem("spotify_token");
}

const token = getTokenFromHash();
if (token) {
  document.getElementById("loginBtn").style.display = "none"; // hide login

  // --- FETCH USER PROFILE ---
  fetch("https://api.spotify.com/v1/me", {
    headers: { Authorization: "Bearer " + token }
  })
  .then(res => res.json())
  .then(user => {
    document.getElementById("user").innerHTML = `<h2>Logged in as ${user.display_name}</h2>`;
  });

  // --- FETCH PLAYLISTS ---
  fetch("https://api.spotify.com/v1/me/playlists?limit=50", {
    headers: { Authorization: "Bearer " + token }
  })
  .then(res => res.json())
  .then(data => {
    const container = document.getElementById("playlists");
    container.innerHTML = "<h2>Your Playlists</h2>";
    data.items.forEach(pl => {
      const btn = document.createElement("button");
      btn.textContent = pl.name;
      btn.onclick = () => fetchRecommendations(pl.id, token);
      container.appendChild(btn);
    });
  });
}

// --- FETCH RECOMMENDATIONS ---
function fetchRecommendations(playlistId, token) {
  fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
    headers: { Authorization: "Bearer " + token }
  })
  .then(res => res.json())
  .then(tracksData => {
    const firstTrack = tracksData.items.find(i => i.track && i.track.id);
    if (!firstTrack) { alert("No valid tracks in this playlist."); return; }
    const seedTrack = firstTrack.track.id;

    fetch(`https://api.spotify.com/v1/recommendations?seed_tracks=${seedTrack}&limit=10`, {
      headers: { Authorization: "Bearer " + token }
    })
    .then(res => res.json())
    .then(recData => {
      const recContainer = document.getElementById("recommendations");
      recContainer.innerHTML = "<h2>Recommended Songs</h2>";
      recData.tracks.forEach(track => {
        const div = document.createElement("div");
        div.style.margin = "15px 0";
        div.innerHTML = `
          <p><strong>${track.name}</strong> by ${track.artists[0].name}</p>
          <img src="${track.album.images[0]?.url}" width="200"/>
          <br><a href="${track.external_urls.spotify}" target="_blank">Open in Spotify</a>
        `;
        recContainer.appendChild(div);
      });
    });
  });
}
