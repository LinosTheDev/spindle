const clientId = "f4bc390330824ced9bb1276bb947f315";
const redirectUri = "https://spindle.click/";
const scopes = ["user-read-private", "playlist-read-private"];

// --- PKCE Helpers ---
function generateRandomString(length) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
  return result;
}

async function sha256(plain) {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// --- Login Redirect ---
document.getElementById("loginBtn").addEventListener("click", async () => {
  const codeVerifier = generateRandomString(128);
  const codeChallenge = await sha256(codeVerifier);
  localStorage.setItem("code_verifier", codeVerifier);

  const authUrl = `https://accounts.spotify.com/authorize?` +
    `client_id=${clientId}` +
    `&response_type=code` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&code_challenge_method=S256` +
    `&code_challenge=${codeChallenge}` +
    `&scope=${encodeURIComponent(scopes.join(" "))}`;

  window.location.href = authUrl;
});

// --- On Load: Check for ?code in URL ---
(async function () {
  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");

  if (code) {
    const codeVerifier = localStorage.getItem("code_verifier");

    const body = new URLSearchParams({
      client_id: clientId,
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier
    });

    const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body
    });

    const tokenData = await tokenRes.json();

    if (tokenData.access_token) {
      localStorage.setItem("spotify_token", tokenData.access_token);
      // Clean up the URL
      window.history.replaceState({}, document.title, "/");
      loadSpotify(tokenData.access_token);
    } else {
      alert("Failed to get token. Try logging in again.");
    }
  } else {
    const token = localStorage.getItem("spotify_token");
    if (token) loadSpotify(token);
  }
})();

async function loadSpotify(token) {
  document.getElementById("loginBtn").style.display = "none";

  const headers = { Authorization: `Bearer ${token}` };

  // User Profile
  const user = await fetch("https://api.spotify.com/v1/me", { headers }).then(r => r.json());
  document.getElementById("user").innerHTML = `<h2>Logged in as ${user.display_name}</h2>`;

  // User Playlists
  const playlists = await fetch("https://api.spotify.com/v1/me/playlists?limit=50", { headers }).then(r => r.json());
  const plDiv = document.getElementById("playlists");
  plDiv.innerHTML = "<h2>Your Playlists</h2>";
  playlists.items.forEach(pl => {
    const btn = document.createElement("button");
    btn.textContent = pl.name;
    btn.onclick = () => fetchRecommendations(pl.id, token);
    plDiv.appendChild(btn);
  });
}

async function fetchRecommendations(playlistId, token) {
  const headers = { Authorization: `Bearer ${token}` };

  const tracks = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, { headers }).then(r => r.json());
  const firstTrack = tracks.items.find(t => t.track && t.track.id);
  if (!firstTrack) return alert("No valid track in playlist");

  const seed = firstTrack.track.id;
  const recs = await fetch(`https://api.spotify.com/v1/recommendations?seed_tracks=${seed}&limit=10`, { headers }).then(r => r.json());

  const recDiv = document.getElementById("recommendations");
  recDiv.innerHTML = "<h2>Recommendations</h2>";
  recs.tracks.forEach(t => {
    const el = document.createElement("div");
    el.innerHTML = `
      <p><strong>${t.name}</strong> by ${t.artists.map(a => a.name).join(", ")}</p>
      <img src="${t.album.images[0]?.url}" width="200"><br>
      <a href="${t.external_urls.spotify}" target="_blank">Open in Spotify</a><br><br>
    `;
    recDiv.appendChild(el);
  });
}
