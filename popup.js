document.getElementById("open-settings").addEventListener("click", () => {
    chrome.runtime.openOptionsPage();
    window.close();
});

document.getElementById("settings-button").addEventListener("click", () => {
    chrome.runtime.openOptionsPage();
    window.close();
});

document.getElementById("scrobble-button").addEventListener("click", async () => {
    let { activateScrobble } = await chrome.storage.local.get("activateScrobble");
    activateScrobble = activateScrobble !== false;

    if (!activateScrobble) {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        chrome.tabs.sendMessage(tab.id, { action: "scrobbleReEnabled" });
    }

    await chrome.storage.local.set({ activateScrobble: !activateScrobble });

    loadScrobble();
});

async function loadSession() {
    const { token, username } = await chrome.storage.local.get(["token", "username"]);
    let loggedIn = token !== undefined && username !== undefined;

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
    }

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab.url?.includes("music.youtube.com")) {
        notInYoutubeMusicPage.hidden = false;
        return;
    }

    chrome.tabs.sendMessage(tab.id, { action: "getCurrentTrack" }, (response) => {
        if (response.title === "") {
            noTrackPage.hidden = false;
            return;
        }

        trackPage.hidden = false;

        document.getElementById("artwork").src = response.artwork;
        document.getElementById("title").textContent = response.title;
        document.getElementById("album-artist").textContent = `${response.artist} - ${response.album}`;
    });
}

async function loadScrobble() {
    let { activateScrobble } = await chrome.storage.local.get("activateScrobble");
    activateScrobble = activateScrobble !== false;

    const scrobbleIcon = document.getElementById("scrobble-icon");
    const scrobbleState = document.getElementById("scrobble-state");

    if (activateScrobble) {
        scrobbleIcon.src = "icons/scrobbling.svg";
        scrobbleState.textContent = "Scrobbling";
        return;
    }

    scrobbleIcon.src = "icons/no-scrobbling.svg";
    scrobbleState.textContent = "Not Scrobbling";

    await chrome.storage.local.set({ activateScrobble: false });
}

loadSession();
loadScrobble();