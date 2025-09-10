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

    try {
      const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body
      });

      const tokenData = await tokenRes.json();
      if (tokenData.access_token) {
        localStorage.setItem("spotify_token", tokenData.access_token);
        window.history.replaceState({}, document.title, "/");
        loadSpotify(tokenData.access_token);
      } else {
        alert("Failed to get token. Try logging in again.");
      }
    } catch (err) {
      console.error(err);
      alert("Error obtaining Spotify token.");
    }
  } else {
    const token = localStorage.getItem("spotify_token");
    if (token) loadSpotify(token);
  }
})();

// --- Load User Profile & Playlists ---
async function loadSpotify(token) {
  document.getElementById("loginBtn").style.display = "none";
  const headers = { Authorization: `Bearer ${token}` };

  try {
    // User Profile
    const user = await fetch("https://api.spotify.com/v1/me", { headers }).then(r => r.json());
    document.getElementById("user").innerHTML = `<h2>Logged in as ${user.display_name}</h2>`;

    // Playlists
    const playlists = await fetch("https://api.spotify.com/v1/me/playlists?limit=50", { headers }).then(r => r.json());
    const plDiv = document.getElementById("playlists");
    plDiv.innerHTML = "<h2>Your Playlists</h2>";

    playlists.items.forEach(pl => {
      const btn = document.createElement("button");
      btn.textContent = pl.name;
      btn.onclick = () => fetchRecommendations(pl.id, token);
      plDiv.appendChild(btn);
    });
  } catch (err) {
    console.error(err);
    alert("Failed to load Spotify profile or playlists.");
  }
}

// --- Fetch Recommendations via ReccoBeats ---
async function fetchRecommendations(playlistId, token) {
  const headers = { Authorization: `Bearer ${token}` };

  try {
    // --- Get playlist metadata ---
    const playlistInfo = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}`, { headers }).then(r => r.json());

    // --- Display playlist info ---
    const plDiv = document.getElementById("playlists");
    plDiv.innerHTML = `
      <h2>${playlistInfo.name}</h2>
      ${playlistInfo.images[0] ? `<img src="${playlistInfo.images[0].url}" width="300" style="border-radius: 10px; margin-bottom: 1rem;" />` : ''}
      <p><strong>${playlistInfo.tracks.total}</strong> track(s)</p>
      <p><em>Here's what ReccoBeats suggests based on this playlist:</em></p>
    `;

    // --- Get first track from playlist ---
    const tracksData = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, { headers }).then(r => r.json());
    const firstTrack = tracksData.items.find(i => i.track && i.track.id);
    if (!firstTrack) return alert("No valid tracks in this playlist.");

    const seedId = firstTrack.track.id;
    console.log("Seed track ID:", seedId);

    // --- Fetch recommendations from ReccoBeats ---
    const recRes = await fetch(`https://api.reccobeats.com/v1/track/recommendation?seeds=${seedId}&size=10`);
    if (!recRes.ok) {
      console.error("ReccoBeats response status:", recRes.status, recRes.statusText);
      if (recRes.status === 400) return alert("Bad request to ReccoBeats. Seed track may be invalid.");
      if (recRes.status === 429) return alert("Hit ReccoBeats rate limit. Try again later.");
      throw new Error(`ReccoBeats error: ${recRes.status}`);
    }

    const recDataRaw = await recRes.json();
    console.log("Raw ReccoBeats response:", recDataRaw);

    // --- Use content array directly ---
    const recData = recDataRaw.content || [];
    if (!Array.isArray(recData) || recData.length === 0) return alert("No recommendations found from ReccoBeats.");

    // --- Display recommendations ---
    const recContainer = document.getElementById("recommendations");
    recContainer.innerHTML = "<h2>Recommended Songs</h2>";

    recData.forEach(t => {
      const div = document.createElement("div");
      div.style.margin = "15px 0";
      div.innerHTML = `
        <p><strong>${t.trackTitle}</strong> by ${t.artists.map(a => a.name).join(", ")}</p>
        <a href="${t.href}" target="_blank"><img src="${t.albumArt || "https://via.placeholder.com/300?text=Album+Art"}" width="200" style="border-radius: 10px;" /></a>
        <br><a href="${t.href}" target="_blank">Open in Spotify</a>
      `;
      recContainer.appendChild(div);
    });

  } catch (err) {
    console.error("Failed to fetch ReccoBeats recommendations:", err);
    alert("Failed to fetch ReccoBeats recommendations. See console for details.");
  }
}
