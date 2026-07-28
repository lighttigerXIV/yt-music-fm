
chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
    if (message.action === "nowPlaying") {
        await setNowPlaying(message.track);
    }
    if (message.action === "scrobble") {
        await scrobble(message.track);
    }
});