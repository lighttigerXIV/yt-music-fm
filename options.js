async function init() {
    const { token, username } = await chrome.storage.local.get(["token", "username"]);
    let loggedIn = token !== undefined && username !== undefined;

    let noLoginDiv = document.getElementById("no-login-div");
    let loggedInDiv = document.getElementById("logged-in-div");
    let usernameDiv = document.getElementById("username");


    if (loggedIn) {
        noLoginDiv.hidden = true;
        loggedInDiv.hidden = false;
        usernameDiv.textContent = username;
    } else {
        noLoginDiv.hidden = false;
        loggedInDiv.hidden = true;
        usernameDiv.textContent = "";
    }
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

    await new Promise(resolve => setTimeout(resolve, 14000));

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
        console.log("User did not authorize connection");
        return;
    }

    token = data.session.key;
    let username = data.session.name;

    await chrome.storage.local.set({ token: token });
    await chrome.storage.local.set({ username: username });

    init();
}