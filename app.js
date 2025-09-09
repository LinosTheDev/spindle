// --- CONFIG ---
const clientId = "f4bc390330824ced9bb1276bb947f315";
const redirectUri = "https://spindle.click/callback.html";
const scopes = ["playlist-read-private", "user-library-read"];

// --- HELPERS ---
function generateRandomString(length) {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < length; i++) text += possible.charAt(Math.floor(Math.random() * possible.length));
  return text;
}

async function sha256(plain) {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// --- LOGIN BUTTON ---
const loginBtn = document.getElementById("loginBtn");
if (loginBtn) {
  loginBtn.addEventListener("click", async () => {
    const codeVerifier = generateRandomString(128);
    localStorage.setItem("code_verifier", codeVerifier);
    const codeChallenge = await sha256(codeVerifier);

    const authUrl =
      "https://accounts.spotify.com/authorize" +
      "?response_type=code" +
      "&client_id=" + clientId +
      "&scope=" + encodeURIComponent(scopes.join(" ")) +
      "&redirect_uri=" + encodeURIComponent(redirectUri) +
      "&code_challenge_method=S256" +
      "&code_challenge=" + codeChallenge;

    window.location.href = authUrl;
  });
}

// --- HANDLE REDIRECT & EXCHANGE CODE FOR TOKEN ---
async function handleRedirect() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");
  if (!code) return;

  const codeVerifier = localStorage.getItem("code_verifier");
  const body = new URLSearchParams({
    client_id: clientId,
    grant_type: "authorization_code",
    code: code,
    redirect_uri: redirectUri,
    code_verifier: codeVerifier
  });

  const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body
  });

  const tokenData = await tokenRes.json();
  localStorage.setItem("spotify_token", tokenData.access_token);

  // Redirect to main page
  window.location.href = "https://spindle.click/";
}

// --- FETCH USER PROFILE ---
async function fetchUserProfile(token) {
  const res = await fetch("https://api.spotify.com/v1/me", {
    headers: { Authorization: "Bearer " + token }
  });
  const data = await res.json();
  const userContainer = document.getElementById("user");
  if (userContainer) {
    userContainer.innerHTML = `<h2>Logged in as ${data.display_name}</h2>`;
  }
}

// --- FETCH PLAYLISTS ---
async function fetchPlaylists(token) {
  const headers = { Authorization: "Bearer " + token };
  const res = await fetch("https://api.spotify.com/v1/me/playlists?limit=50", { headers });
  const data = await res.json();

  const container = document.getElementById("playlists");
  container.innerHTML = "<h2>Your Playlists</h2>";

  data.items.forEach(pl => {
    const btn = document.createElement("button");
    btn.textContent = pl.name;
    btn.style.margin = "5px";
    btn.onclick = () => fetchRecommendations(pl.id, token);
    container.appendChild(btn);
  });
}

// --- FETCH RECOMMENDATIONS ---
async function fetchRecommendations(playlistId, token) {
  const headers = { Authorization: "Bearer " + token };
  const tracksRes = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, { headers });
  const tracksData = await tracksRes.json();

  const firstTrack = tracksData.items.find(i => i.track && i.track.id);
  if (!firstTrack) { alert("No valid tracks in this playlist."); return; }
  const seedTrack = firstTrack.track.id;

  const recRes = await fetch(`https://api.spotify.com/v1/recommendations?seed_tracks=${seedTrack}&limit=10`, { headers });
  const recData = await recRes.json();

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
}

// --- MAIN ---
(async () => {
  await handleRedirect();
  const token = localStorage.getItem("spotify_token");
  if (token) {
    fetchUserProfile(token);
    fetchPlaylists(token);
  }
})();
