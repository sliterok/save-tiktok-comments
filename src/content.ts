setInterval(() => chrome.runtime.sendMessage("keepAlive"), 5_000);

let scrollInterval: number | null = null;

chrome.runtime.onMessage.addListener((msg, _sender, respond) => {
    if (msg === "keepAlive") {
        respond("pong");
        return true;
    };

    if (msg.type === 'toggle_scroll') {
        if (msg.state) {
            if (scrollInterval) return;
            scrollInterval = window.setInterval(() => {
              window.scrollBy(0, document.body.scrollHeight);
            }, 100);
        } else {
            if (scrollInterval) {
                clearInterval(scrollInterval);
                scrollInterval = null;
            }
        }
        respond(true);
        return true;
    }
});