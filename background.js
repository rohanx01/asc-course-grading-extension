// background.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "fetchGrades") {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (!tabs.length) {
                sendResponse({ error: "No active tab found." });
                return;
            }
            const tabId = tabs[0].id;
            
            // Pass the array of course codes to the scraper
            performInPageScrape(tabId, request.courseCodes)
                .then(htmlArray => sendResponse({ data: htmlArray }))
                .catch(error => sendResponse({ error: error.message }));
        });
        return true; 
    }
});

async function performInPageScrape(tabId, courseCodes) {
    const results = await chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: scrapeFunction,
        args: [courseCodes] // Pass the array here
    });
    const resultValue = results[0];
    if (typeof resultValue === 'string' && resultValue.startsWith('Error:')) {
        throw new Error(resultValue);
    }
    return resultValue;
}

async function scrapeFunction(courseCodes) {
    const waitForElementInFrame = (frame, selector) => {
        return new Promise((resolve, reject) => {
            const timeout = 10000;
            const interval = 200;
            let elapsedTime = 0;
            const checkInterval = setInterval(() => {
                if (frame.document.querySelector(selector)) {
                    clearInterval(checkInterval);
                    resolve();
                }
                elapsedTime += interval;
                if (elapsedTime >= timeout) {
                    clearInterval(checkInterval);
                    reject(new Error(`Timed out waiting for selector "${selector}"`));
                }
            }, interval);
        });
    };

    try {
        const menuFrame = window.frames['leftPage'];
        const mainFrame = window.frames['rightPage'];
        if (!menuFrame || !mainFrame) throw new Error("Could not find page frames.");

        const statsLink = menuFrame.document.querySelector('a[href*="gradstatistics.jsp"]');
        if (!statsLink) throw new Error(`Could not find 'Grading statistics' link.`);
        
        const allResults = []; // Array to store the HTML of each grade table

        // --- THIS IS THE NEW LOOPING LOGIC ---
        for (const courseCode of courseCodes) {
            console.log(`Processing course: ${courseCode}`);
            
            // 1. Navigate to the search page
            statsLink.click();
            await waitForElementInFrame(mainFrame, 'input[name="txtcrsecode"]');

            // 2. Fill and submit the form for the current course
            const mainFrameDoc = mainFrame.document;
            const yearInput = mainFrameDoc.querySelector('select[name="year"]');
            const semInput = mainFrameDoc.querySelector('select[name="semester"]');
            const courseInput = mainFrameDoc.querySelector('input[name="txtcrsecode"]');
            const submitButton = mainFrameDoc.querySelector('input[name="submit"]');

            if (!courseInput || !submitButton || !yearInput || !semInput) throw new Error("Could not find all form elements.");
            
            yearInput.value = "2024";
            semInput.value = "1";
            courseInput.value = courseCode;
            
            const form = submitButton.closest('form');
            if (!form) throw new Error("Could not find the form element to submit.");
            
            HTMLFormElement.prototype.submit.call(form);
            
            // 3. Wait for the results and scrape the table
            await waitForElementInFrame(mainFrame, '#grades'); 
            const gradesTable = mainFrame.document.getElementById('grades');
            if (gradesTable) {
                allResults.push(gradesTable.outerHTML);
            } else {
                allResults.push(``);
            }
        }
        // --- END OF LOOP ---

        return allResults; // Return the array of all HTML tables

    } catch (error) {
        return `Error: ${error.message}`;
    }
}