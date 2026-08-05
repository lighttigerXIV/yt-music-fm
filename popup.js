// -------------------------------- Listeners -----------------------------------------------
chrome.runtime.onMessage.addListener((message, _sender, _sendResponse) => {
	if (message.action === "trackChanged") {
		loadSession();
	}
});

document.getElementById("open-settings").addEventListener("click", () => {
	chrome.runtime.openOptionsPage();
	window.close();
});

document.getElementById("settings-button").addEventListener("click", () => {
	chrome.runtime.openOptionsPage();
	window.close();
});

document.getElementById("scrobble-button").addEventListener("click", async () => {
	let { scrobble } = await chrome.storage.local.get(["scrobble"]);
	scrobble = scrobble !== false;

	if (!scrobble) {
		const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
		chrome.tabs.sendMessage(tab.id, { action: "changedScrobble" });
	}

	await chrome.storage.local.set({ scrobble: !scrobble });

	loadScrobble();
});



async function loadSession() {
	const { sessionKey, username } = await chrome.storage.local.get(["sessionKey", "username"]);
	let loggedIn = sessionKey !== undefined && username !== undefined;

	let noSessionPage = document.getElementById("no-session-page");
	let notInYoutubeMusicPage = document.getElementById("not-in-youtube-music-page");
	let noTrackPage = document.getElementById("no-track-page");
	let trackPage = document.getElementById("track-page");

	noSessionPage.hidden = true;
	notInYoutubeMusicPage.hidden = true;
	noTrackPage.hidden = true;
	trackPage.hidden = true;

	if (!loggedIn) {
		noSessionPage.hidden = false;
		return;
	}

	const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

	if (!tab.url?.includes("music.youtube.com")) {
		notInYoutubeMusicPage.hidden = false;
		return;
	}

	chrome.tabs.sendMessage(tab.id, { action: "getTrack" }, (response) => {
		if (chrome.runtime.lastError || !response) {
			console.log("Error:", chrome.runtime.lastError?.message);
			noTrackPage.hidden = false;
			return;
		}

		if (response.title === "") {
			noTrackPage.hidden = false;
			return;
		}

		trackPage.hidden = false;

		document.getElementById("track-page").style.backgroundImage = `url(${response.coverURL})`;
		document.getElementById("artwork").src = response.coverURL;
		document.getElementById("title").textContent = response.title;
		document.getElementById("album-artist").textContent = response.album === "" ? response.artist : `${response.artist} - ${response.album}`;
	});
}

async function loadScrobble() {
	let { scrobble } = await chrome.storage.local.get(["scrobble"]);
	scrobble = scrobble !== false;

	const scrobbleIcon = document.getElementById("scrobble-icon");
	const scrobbleState = document.getElementById("scrobble-state");

	if (scrobble) {
		scrobbleIcon.style.color = "var(--green)";
		scrobbleState.textContent = "Scrobbling";
		return;
	}

	scrobbleIcon.style.color = "var(--red)";
	scrobbleState.textContent = "Not Scrobbling";

	await chrome.storage.local.set({ scrobble: false });
}



loadSession();
loadScrobble();
