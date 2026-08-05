// ----------------------------- State ----------------------------------------------
// Settings
let lastfmUsername = "";
let lastfmSessionKey = ""
let scrobble = false;

// Session
let loggedIn = false;

// Last FM
let sentNowPlaying = false;
let sentScrobble = false;
let secondsPlayed = 0;

// Track
let title = "";
let artist = "";
let album = "";
let coverURL = "";

// ------------------------------ Listeners ----------------------------------------
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
	if (message.action === "getTrack") {
		sendResponse({
			title: title,
			artist: artist,
			album: album,
			coverURL: coverURL
		});
	}

	if (message.action === "getSession") {
		sendResponse({
			loggedIn: session.loggedIn,
			username: session.username,
			token: session.token,
		});
	}

	if (message.action === "changedScrobble") {
		chrome.storage.local.get(["scrobble"]).then((result) => {
			scrobble = result.scrobble !== false;

			console.debug("Scrobble changed to: ", scrobble);

			if (scrobble) {
				sendNowPlaying();
			}
		});
	}
});

function sendNowPlaying() {

}

let nowPlayingTimeout = null;

async function loadScrobbling() {
	setInterval(async () => {
		if (!loggedIn) { return; }

		const metadata = navigator.mediaSession.metadata;

		if (!metadata) { return; }


		const metaTitle = metadata.title;
		const metaArtist = metadata.artist;
		const metaAlbum = metadata.album;
		const metaCoverURL = metadata.artwork[metadata.artwork.length - 1].src;
		const domTime = document.querySelector("ytmusic-player-bar .time-info")?.textContent.trim();

		if (metaTitle === "" || metaArtist === "" || !domTime) { return; }

		const [_currentStr, lengthStr] = domTime?.split("/").map(s => s.trim()) ?? [];
		const trackDurationSeconds = timeToSeconds(lengthStr);

		const isNewTrack = metaTitle !== title || metaArtist !== artist || metaAlbum !== album

		const canSendScrobbleRequest = trackDurationSeconds > 30 // Tracks has at least 30 seconds
			&& (secondsPlayed >= trackDurationSeconds / 2 || secondsPlayed > 4 * 60) // Played enough of the track or podcast (half the track or 4 minutes)
			&& !sentScrobble // Hasn't sent the scrobble request

		if (canSendScrobbleRequest) {
			sentScrobble = true;

			if (!scrobble) { return; }

			chrome.runtime.sendMessage({
				action: "scrobble",
				title: title,
				artist: artist,
				album: album,
				duration: trackDurationSeconds
			});


			console.debug(`SCROBBLED TRACK:\nTitle: ${title}\nArtist: ${artist}\nAlbum: ${album}`);
		}


		if (isNewTrack) {
			sentNowPlaying = false;
			sentScrobble = false;
			secondsPlayed = 0;

			title = metaTitle;
			artist = metaArtist;
			album = metaAlbum;
			coverURL = metaCoverURL;

			// Tell poupup that track has changed
			chrome.runtime.sendMessage({
				action: "trackChanged"
			});

			console.debug(`NEW TRACK:\nTitle: ${title}\nArtist: ${artist}\nAlbum: ${album}`);
		}

		secondsPlayed++;

		if (!sentNowPlaying && secondsPlayed >= 5) {
			if (!scrobble) { return; }

			sentNowPlaying = true;

			// Send message to background to then use LAST FM API to change the now playing track
			chrome.runtime.sendMessage({
				action: "nowPlaying",
				title: title,
				artist: artist,
				album: album,
				duration: trackDurationSeconds
			});


			console.debug(`NOW PLAYING TRACK:\nTitle: ${title}\nArtist: ${artist}\nAlbum: ${album}`);
		}
	}, 1000)
}

async function loadSettings() {
	const { sessionKey: lSessionKey, username: lUsername, scrobble: lScrobble } = await chrome.storage.local.get(["sessionKey", "username", "scrobble"]);

	lastfmSessionKey = lSessionKey;
	lastfmUsername = lUsername;
	scrobble = lScrobble !== false;

	loggedIn = lastfmSessionKey !== undefined && lastfmUsername !== undefined;

	console.debug("[session key, username, scrobble]", lSessionKey, lastfmUsername, scrobble);
}

function timeToSeconds(timeStr) {
	const parts = timeStr.split(":").map(Number);

	if (parts.length === 2) {
		const [min, sec] = parts;
		return min * 60 + sec;
	} else if (parts.length === 3) {
		const [h, min, sec] = parts;
		return h * 3600 + min * 60 + sec;
	}

	return 0;
}


loadSettings();
loadScrobbling();
