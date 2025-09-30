// content.js

// Injection guard to prevent the script from running multiple times
if (typeof window.ascHelperInjected === 'undefined') {
    window.ascHelperInjected = true;
    console.log(`✅ ASC Helper Content Script injected into frame: "${window.name}"`);

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        // This guard ensures that ONLY the script inside the 'rightPage' frame will act as the master.
        if (request.action === "ping" && window.name === 'rightPage') {
            console.log("Ping received by the correct 'rightPage' frame.");
            try {
                // 1. From 'rightPage', access the sibling 'leftPage' frame via the parent window.
                const menuFrame = window.parent.frames['leftPage'];
                if (!menuFrame) {
                    throw new Error("Could not access the 'leftPage' menu frame from the 'rightPage'.");
                }

                // 2. Look for the link inside the menu frame's document.
                const statsLink = menuFrame.document.querySelector('a[href*="gradstatistics.jsp"]');
                
                if (statsLink) {
                    console.log("SUCCESS: Found link in sibling 'leftPage' frame:", statsLink.href);
                    // 3. Respond with the tokenized URL.
                    sendResponse({ 
                        status: "ready", 
                        href: statsLink.href,
                        cookie: window.parent.document.cookie // Send cookies if needed 
                    });
                } else {
                    throw new Error("Could not find the 'Grading Statistics' link inside the 'leftPage' frame.");
                }
            } catch (error) {
                console.error("Error in rightPage frame:", error.message);
                sendResponse({ status: "error", message: error.message });
            }
        }
        // Scripts in all other frames will ignore the ping.
    });
}