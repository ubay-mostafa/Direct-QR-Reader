/**
 *  author: Ubay haje mostafa 
 *  date: 22-05-2026
 * 
 */


function main() {
    // If overlay is already open, clicking the icon again closes it
    if (document.getElementById("qr-overlay")) {
        document.getElementById("qr-overlay").remove();
        document.getElementById("qr-selection")?.remove();
        return;
    }

    // -- Dark overlay that covers the whole page --
    const overlay = document.createElement("div");
    overlay.id = "qr-overlay";
    overlay.style.position = "fixed";
    overlay.style.top = "0";
    overlay.style.left = "0";
    overlay.style.width = "100%";
    overlay.style.height = "100%";
    overlay.style.background = "rgba(0, 0, 0, 0.6)";
    overlay.style.zIndex = "2147483647";
    overlay.style.cursor = "crosshair";
    document.body.appendChild(overlay);

    // -- The bright selection box the user draws --
    const selection = document.createElement("div");
    selection.id = "qr-selection";
    selection.style.position = "fixed";
    selection.style.border = "2px solid white";
    selection.style.background = "rgba(255, 255, 255, 0.0)";
    selection.style.backdropFilter = "brightness(1.8)"; // brightens what's behind the box
    selection.style.zIndex = "2147483648";
    selection.style.pointerEvents = "none"; // let mouse events pass through to the overlay
    selection.style.display = "none";
    document.body.appendChild(selection);

    // -- Track where the drag started --
    let startX = null;
    let startY = null;

    // Start drawing on left click
    overlay.addEventListener("mousedown", (e) => {
        if (e.button !== 0) return; // left click only
        startX = e.clientX;
        startY = e.clientY;
        selection.style.display = "block";
    });


    // Update selection box as mouse moves
    overlay.addEventListener("mousemove", (e) => {
        if (startX === null) return;

        // Handle dragging in any direction
        const x = Math.min(e.clientX, startX);
        const y = Math.min(e.clientY, startY);
        const w = Math.abs(e.clientX - startX);
        const h = Math.abs(e.clientY - startY);

        selection.style.left = x + "px";
        selection.style.top = y + "px";
        selection.style.width = w + "px";
        selection.style.height = h + "px";
    });

    // On mouse release, capture the selected region
    overlay.addEventListener("mouseup", (e) => {
        if (startX === null) return;

        const x = Math.min(e.clientX, startX);
        const y = Math.min(e.clientY, startY);
        const w = Math.abs(e.clientX - startX);
        const h = Math.abs(e.clientY - startY);

        startX = null;
        startY = null;

        // Ignore accidental tiny clicks
        if (w < 10 || h < 10) return;

        // Remove overlay BEFORE screenshot so it doesn't appear in the image
        overlay.remove();
        document.getElementById("qr-selection")?.remove();

        // Ask background.js to take the screenshot
        chrome.runtime.sendMessage({ type: "CAPTURE", region: { x, y, w, h } });
    });

    // Escape key cancels the whole thing
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            overlay.remove();
            selection.remove();
        }
    });
}

main();

// -- Handle the screenshot sent back from background.js --
chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type !== "SCREENSHOT") return;

    const { dataUrl, region } = msg;
    const dpr = window.devicePixelRatio || 1; // handle retina/HiDPI screens

    const img = new Image();
    img.onload = () => {
        // Crop the screenshot down to just the selected region
        const canvas = document.createElement("canvas");
        canvas.width = region.w * dpr;
        canvas.height = region.h * dpr;
        const ctx = canvas.getContext("2d");

        ctx.drawImage(
            img,
            region.x * dpr, region.y * dpr, region.w * dpr, region.h * dpr, // source crop
            0, 0, canvas.width, canvas.height                                 // destination
        );

        // Feed the cropped pixels to jsQR
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = window.jsQR(imageData.data, canvas.width, canvas.height);

        // -- Show result below the selection area --
        const result = document.createElement("div");
        result.style.position = "fixed";
        result.style.left = region.x + "px";
        result.style.top = region.y + "px";
        result.style.width = region.w + "px";
        result.style.height = region.h + "px";
        result.style.textAlign = "center";
        result.style.display = "flex";
        result.style.alignItems = "center";
        result.style.justifyContent = "center";
        result.style.background = code ? "#1a1a2e" : "#5c1a1a";
        result.style.color = "#fff";
        result.style.padding = "10px 16px";
        result.style.borderRadius = "8px";
        result.style.fontSize = "14px";
        result.style.maxWidth = "400px";
        result.style.wordBreak = "break-all";
        result.style.zIndex = "2147483647";
        result.style.boxShadow = "0 4px 20px rgba(0,0,0,0.4)";
        result.style.lineHeight = "1.5";

        if (code) {
            const isUrl = /^https?:\/\//.test(code.data);

            // If it's a URL make it a clickable link, otherwise just show the text
            result.innerHTML = isUrl
                ? `<a href="${code.data}" target="_blank" style="color:#7eb8f7">${code.data}</a>`
                : `${code.data}`;

            // Click anywhere on the result box to copy to clipboard
            result.style.cursor = "pointer";
            result.title = "Click to copy";
            result.addEventListener("click", () => {
                navigator.clipboard.writeText(code.data);
                result.textContent = "Copied!";
                setTimeout(() => result.remove(), 1500);
            });
        } else {
            result.textContent = " No QR code found in selection";
        }

        document.body.appendChild(result);

        // Auto-remove the result after 6 seconds
        setTimeout(() => result.remove(), 4000);
    };

    img.src = dataUrl;
});