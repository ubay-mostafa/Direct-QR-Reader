/**
 *  author: Ubay haje mostafa 
 *  date: 22-05-2026
 * 
 */


// When the user clicks the extension icon, inject everything into the current tab
chrome.action.onClicked.addListener(async (tab) => {
    // Step 1: inject the jsQR library
    await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["jsQR.js"]
    });

    // Step 2: make sure jsQR is available on window
    // (the library uses module.exports which doesn't auto-attach to window in extensions)
    await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
            if (typeof window.jsQR === 'undefined') {
                if (typeof jsQR !== 'undefined') window.jsQR = jsQR;
                else if (window.module && window.module.exports) window.jsQR = window.module.exports;
            }
        }
    });

    // Step 3: inject the main content script (overlay + scanning logic)
    await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content.js"]
    });
});

// When content.js asks for a screenshot, take one and send it back
chrome.runtime.onMessage.addListener((msg, sender) => {
    if (msg.type !== "CAPTURE") return;

    // captureVisibleTab takes a PNG of the full visible tab
    chrome.tabs.captureVisibleTab(sender.tab.windowId, { format: "png" }, (dataUrl) => {
        chrome.tabs.sendMessage(sender.tab.id, {
            type: "SCREENSHOT",
            dataUrl,
            region: msg.region
        });
    });
});