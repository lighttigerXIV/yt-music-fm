if (typeof importScripts === 'function') {
	importScripts("env.js", "lastfm.js");
}

chrome.runtime.onMessage.addListener((message, _sender, _sendResponse) => {
	if (message.action === "nowPlaying") {
		sendNowPlayingRequest(message.title, message.artist, message.album).catch(console.error);
	}

	if (message.action === "scrobble") {
		sendScrobbleRequest(message.title, message.artist, message.album).catch(console.error);
	}
});
