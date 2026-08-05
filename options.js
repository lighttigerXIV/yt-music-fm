async function init() {
	const { sessionKey, username } = await chrome.storage.local.get(["sessionKey", "username"]);
	let loggedIn = sessionKey !== undefined && username !== undefined;

	console.debug("[Session, Username]", sessionKey, username)

	let noLoginDiv = document.getElementById("no-login-div");
	let loggedInDiv = document.getElementById("logged-in-div");
	let usernameDiv = document.getElementById("username");
	let versionDiv = document.getElementById("version");

	noLoginDiv.style.display = "none"
	loggedInDiv.style.display = "none"
	usernameDiv.textContent = ""

	if (loggedIn) {
		loggedInDiv.style.display = "flex";
		usernameDiv.textContent = username;
	} else {
		noLoginDiv.style.display = "flex";
	}

	versionDiv.textContent = chrome.runtime.getManifest().version;
}

init();

document.getElementById("authorize-button").addEventListener("click", async () => {
	await authorizeUser();
	init();
});

document.getElementById("unauthorize-button").addEventListener("click", async () => {
	await chrome.storage.local.clear();
	init();
});



async function authorizeUser() {
	let url = `https://ws.audioscrobbler.com/2.0/?method=auth.getToken&api_key=${API_KEY}&format=json`;
	let response = await fetch(url);
	let data = await response.json();
	let token = data.token;

	window.open(`https://www.last.fm/api/auth/?api_key=${API_KEY}&token=${token}`, "_blank");

	for (let attempt = 1; attempt <= 8; attempt++) {
		await new Promise(resolve => setTimeout(resolve, 2000));

		const params = {
			method: "auth.getSession",
			api_key: API_KEY,
			token: token
		}

		const apiSig = md5(buildSignatureBase(params, SHARED_SECRET))

		url = `https://ws.audioscrobbler.com/2.0/?method=auth.getSession&api_key=${API_KEY}&token=${token}&api_sig=${apiSig}&format=json`;
		response = await fetch(url);
		data = await response.json();

		if (!data.session) {
			continue;
		}

		let sessionKey = data.session.key;
		let username = data.session.name;

		console.debug("New [Session | Username]", sessionKey, username)

		await chrome.storage.local.set({ sessionKey: sessionKey });
		await chrome.storage.local.set({ username: username });

		break;
	}
}
