if (typeof importScripts === 'function') {
    importScripts("env.js", "lastfm.js", "session.js");
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "nowPlaying") {
        setNowPlaying(message.track).catch(console.error);
    }
    
    if (message.action === "scrobble") {
        scrobble(message.track).catch(console.error);
    }
});