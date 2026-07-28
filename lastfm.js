function buildSignatureBase(params, secret) {
    const sortedKeys = Object.keys(params).sort();
    let base = "";
    for (const key of sortedKeys) {
        base += key + params[key];
    }
    base += secret;
    return base;
}

function md5(string) {
    function rotateLeft(x, c) { return (x << c) | (x >>> (32 - c)); }
    function toHex(n) {
        let s = "", v;
        for (let i = 0; i <= 3; i++) {
            v = (n >>> (i * 8)) & 255;
            s += ("0" + v.toString(16)).slice(-2);
        }
        return s;
    }
    function utf8Encode(str) { return unescape(encodeURIComponent(str)); }

    const msg = utf8Encode(string);
    const msgLen = msg.length;
    const wordArray = [];
    for (let i = 0; i < msgLen - 3; i += 4) {
        wordArray.push(
            msg.charCodeAt(i) |
            (msg.charCodeAt(i + 1) << 8) |
            (msg.charCodeAt(i + 2) << 16) |
            (msg.charCodeAt(i + 3) << 24)
        );
    }
    let tail = [];
    const rem = msgLen % 4;
    for (let i = 0; i < rem; i++) tail.push(msg.charCodeAt(msgLen - rem + i));
    while (tail.length < 4) tail.push(0);
    let lastWord = tail[0] | (tail[1] << 8) | (tail[2] << 16) | (tail[3] << 24);
    if (rem === 0) wordArray.push(0x80);
    else wordArray.push(lastWord | (0x80 << (rem * 8)));

    while ((wordArray.length % 16) !== 14) wordArray.push(0);
    wordArray.push(msgLen * 8);
    wordArray.push(0);

    const S = [7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
        5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
        4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
        6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21];
    const K = [];
    for (let i = 0; i < 64; i++) K[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 4294967296);

    let a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476;

    for (let chunk = 0; chunk < wordArray.length; chunk += 16) {
        let A = a0, B = b0, C = c0, D = d0;
        for (let i = 0; i < 64; i++) {
            let F, g;
            if (i < 16) { F = (B & C) | (~B & D); g = i; }
            else if (i < 32) { F = (D & B) | (~D & C); g = (5 * i + 1) % 16; }
            else if (i < 48) { F = B ^ C ^ D; g = (3 * i + 5) % 16; }
            else { F = C ^ (B | ~D); g = (7 * i) % 16; }
            F = (F + A + K[i] + (wordArray[chunk + g] || 0)) | 0;
            A = D; D = C; C = B;
            B = (B + rotateLeft(F, S[i])) | 0;
        }
        a0 = (a0 + A) | 0; b0 = (b0 + B) | 0; c0 = (c0 + C) | 0; d0 = (d0 + D) | 0;
    }

    return toHex(a0) + toHex(b0) + toHex(c0) + toHex(d0);
}

async function scrobble(track) {
    var timestamp = new Date().getTime() / 1000;
    const { token } = await chrome.storage.local.get("token");

    const params = {
        method: "track.scrobble",
        api_key: API_KEY,
        sk: token,
        artist: track.artist,
        track: track.title,
        album: track.album,
        timestamp: timestamp
    }

    const apiSig = md5(buildSignatureBase(params, SHARED_SECRET));

    const body = new URLSearchParams({
        ...params,
        api_sig: apiSig,
        format: "json"
    });

    const response = await fetch("https://ws.audioscrobbler.com/2.0/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body
    });
}

async function setNowPlaying(track) {
    const { token } = await chrome.storage.local.get("token");
    if (!token) { throw "No Session Key" };

    const params = {
        method: "track.updateNowPlaying",
        api_key: API_KEY,
        sk: token,
        artist: track.artist,
        track: track.title,
        album: track.album,
        timestamp: new Date().getTime() / 1000
    }

    const apiSig = md5(buildSignatureBase(params, SHARED_SECRET));

    const body = new URLSearchParams({
        ...params,
        api_sig: apiSig,
        format: "json"
    });

    const response = await fetch("https://ws.audioscrobbler.com/2.0/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body
    });
}