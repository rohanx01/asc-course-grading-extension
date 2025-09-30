// background.js

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "fetchGrades") {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (!tabs.length) {
                sendResponse({ error: "No active tab found." });
                return;
            }
            
            // Send the ping to ALL frames in the tab.
            // Only the 'leftPage' frame is programmed to respond with the link.
            chrome.tabs.sendMessage(tabs[0].id, { action: "ping" }, async (response) => {
                if (chrome.runtime.lastError || !response || response.status === "error") {
                    sendResponse({ error: response?.message || "Could not get a valid response from the menu frame." });
                    return;
                }

                const referrerUrl = response.href;
                const courseCode = request.courseCode;
                const year = "2024";
                const semester = "1";

                const targetUrl = `https://asc.iitb.ac.in/academic/Grading/statistics/gradstatforcrse.jsp?year=${year}&semester=${semester}&txtcrsecode=${courseCode}&submit=SUBMIT`;
                
                try {
                    const fetchResponse = await fetch(targetUrl, { headers: { 'Referer': referrerUrl } });
                    if (!fetchResponse.ok) throw new Error(`HTTP error! Status: ${fetchResponse.status}`);
                    const htmlText = await fetchResponse.text();
                    sendResponse({ data: htmlText });
                } catch (error) {
                    sendResponse({ error: error.message });
                }
            });
        });
        return true;
    }
});