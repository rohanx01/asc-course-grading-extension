// background.js

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "fetchGrades") {
        chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
            if (!tabs.length) {
                sendResponse({ error: "No active tab found." });
                return;
            }
            
            const tab = tabs[0];
            
            // Check if we're on the ASC website
            if (!tab.url || !tab.url.startsWith('https://asc.iitb.ac.in/')) {
                sendResponse({ error: "Please navigate to asc.iitb.ac.in first." });
                return;
            }
            
            try {
                // Try to inject the content script if it's not already there
                await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    files: ['content.js']
                });
                
                // Wait a bit for the script to initialize
                await new Promise(resolve => setTimeout(resolve, 100));
            } catch (e) {
                // Script might already be injected, which is fine
                console.log("Content script might already be injected:", e);
            }
            
            // Ping the content script to get the special Referer URL
            chrome.tabs.sendMessage(tab.id, { action: "ping" }, async (response) => {
                if (chrome.runtime.lastError) {
                    sendResponse({ error: "Could not connect to the ASC page. Please refresh the page and try again." });
                    return;
                }
                if (response.status === "error") {
                    sendResponse({ error: response.message });
                    return;
                }

                const referrerUrl = response.href;
                const courseCode = request.courseCode;
                const year = "2024";
                const semester = "1";

                const targetUrl = `https://asc.iitb.ac.in/academic/Grading/statistics/gradstatforcrse.jsp?year=${year}&semester=${semester}&txtcrsecode=${courseCode}&submit=SUBMIT`;
                
                console.log("BACKGROUND: Using Referer:", referrerUrl);
                console.log("BACKGROUND: Fetching final grades from:", targetUrl);

                try {
                    const fetchResponse = await fetch(targetUrl, {
                        headers: {
                            'Referer': referrerUrl
                        }
                    });

                    if (!fetchResponse.ok) {
                        throw new Error(`HTTP error! Status: ${fetchResponse.status}`);
                    }

                    const htmlText = await fetchResponse.text();
                    sendResponse({ data: htmlText });

                } catch (error) {
                    sendResponse({ error: error.message });
                }
            });
        });

        return true; // Keep the message channel open for the async response
    }
});