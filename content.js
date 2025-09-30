// content.js

console.log("✅ ASC Helper Content Script is running!");

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "ping") {
        // Find the "Grading statistics" link on the current page
        const links = Array.from(document.querySelectorAll('a'));
        const statsLink = links.find(a => a.textContent.trim() === "Grading statistics");

        if (statsLink) {
            // Respond with "ready" and the special tokenized URL
            sendResponse({ status: "ready", href: statsLink.href });
        } else {
            // If the link isn't found, send an error
            sendResponse({ status: "error", message: "Could not find 'Grading statistics' link on the current page." });
        }
    }
});