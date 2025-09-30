// background.js

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "fetchGrades") {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (!tabs.length) {
                sendResponse({ error: "No active tab found." });
                return;
            }
            
            // Ping the content script to get the special Referer URL
            chrome.tabs.sendMessage(tabs[0].id, { action: "ping" }, async (response) => {
                // --- THIS IS THE CORRECTED ERROR HANDLING ---
                if (chrome.runtime.lastError) {
                    // This block runs if the content script doesn't exist on the page
                    sendResponse({ error: "Could not connect to the ASC page. Please refresh the page and try again." });
                    return;
                }
                if (response.status === "error") {
                    // This block runs if the content script exists, but sent back an error
                    sendResponse({ error: response.message });
                    return;
                }
                // ---------------------------------------------

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