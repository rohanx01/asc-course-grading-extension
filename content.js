// content.js
console.log("✅ ASC Helper Content Script is running!");
console.log("Frame location:", window.location.href);
console.log("Is top frame:", window === window.top);

// content.js

// This script will be injected into ALL frames, but the logic below
// ensures that only the script in the 'leftPage' frame will do the work.

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // SAFETY GUARD: Only the menu frame should respond to the ping.
    if (request.action === "ping" && window.name === 'leftPage') {
        console.log("✅ Ping received by the correct 'leftPage' frame.");
        try {
            // Find the link within this frame's document
            const statsLink = document.querySelector('a[href*="gradstatistics.jsp"]');
            if (statsLink) {
                console.log("Found link in 'leftPage'. Responding with href:", statsLink.href);
                sendResponse({ status: "ready", href: statsLink.href });
            } else {
                throw new Error("Could not find 'Grading Statistics' link in the 'leftPage' frame.");
            }
        } catch (error) {
            console.error("Error in leftPage frame:", error.message);
            sendResponse({ status: "error", message: error.message });
        }
    }
    // All other frames will ignore the ping and do nothing.
});