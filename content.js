let track = new Track("", "", "", "", false, undefined);
let session = new Session(undefined, undefined);
let scrobbled = false;
let nowPlayed = false;

async function loadSession() {
    const { token, username } = await chrome.storage.local.get(["token", "username"]);

    session = new Session(token, username);
}

loadSession();

const barObserver = new MutationObserver(async () => {
    let { activateScrobble } = await chrome.storage.local.get("activateScrobble");
    activateScrobble = activateScrobble !== false;

    if (!session.loggedIn) { return; }

    const metadata = navigator.mediaSession.metadata;
    const playing = navigator.mediaSession.playbackState === "playing";

    if (!metadata) { return; }

    const metaTitle = metadata.title;
    const metaArtist = metadata.artist;
    const metaAlbum = metadata.album;
    const metaArtwork = metadata.artwork[metadata.artwork.length - 1].src;

    if (metaTitle === "" || metaArtist === "" || metaAlbum === "") { return; }

    const domTime = document.querySelector("ytmusic-player-bar .time-info")?.textContent.trim();

    if (!domTime) return;

    const [currentStr, lengthStr] = domTime?.split("/").map(s => s.trim()) ?? [];

    const hasChanged = metaTitle !== track.title || metaArtist !== track.artist || metaAlbum != track.album || playing != track.playing;
    const changedPlayState = metaTitle === track.title || metaArtist === track.artist || metaAlbum == track.album;

    const trackLengthSeconds = timeToSeconds(lengthStr);
    const currentSeconds = timeToSeconds(currentStr);

    const hasMinLength = trackLengthSeconds > 30
    const hasScrobbledEnough = currentSeconds >= trackLengthSeconds / 2 || currentSeconds > 4 * 60
    const canScrobble = hasMinLength && hasScrobbledEnough && !scrobbled

    if (canScrobble) {
        scrobbled = true;

        if (!activateScrobble) { return; }

        chrome.runtime.sendMessage({
            action: "scrobble",
            track: track,
        });
    }

    if (hasChanged) {
        if (changedPlayState && !playing) { return; }

        nowPlayed = false;
        scrobbled = false;

        track.title = metadata.title;
        track.artist = metadata.artist;
        track.album = metadata.album;
        track.length = trackLengthSeconds;
        track.playing = playing;
        track.artwork = metaArtwork;

        console.log("New Track:", track);
    }

    if (!nowPlayed && hasChanged) {
        if (!activateScrobble) { return; }

        nowPlayed = true;

        chrome.runtime.sendMessage({
            action: "nowPlaying",
            track: track,
        });
    }
});

barObserver.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "getCurrentTrack") {
        sendResponse({
            title: track.title,
            artist: track.artist,
            album: track.album,
            playing: track.playing,
            artwork: track.artwork
        });
    }

    if (message.action === "getSession") {
        sendResponse({
            loggedIn: session.loggedIn,
            username: session.username,
            token: session.token,
        });
    }

    if (message.action === "scrobbleReEnabled") {
        nowPlayed = true;

        chrome.runtime.sendMessage({
            action: "nowPlaying",
            track: track,
        });
    }
});

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