setInterval(() => chrome.runtime.sendMessage("keepAlive"), 5_000);

chrome.runtime.onMessage.addListener((msg, _sender, respond) => {
    if (msg === "keepAlive") {
        respond("pong");
        return true;
    };
});
