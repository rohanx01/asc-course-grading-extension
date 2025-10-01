// background.js

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "fetchGrades") {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (!tabs.length) {
                sendResponse({ error: "No active tab found." });
                return;
            }
            const tabId = tabs[0].id;
            
            performInPageScrape(tabId, request.courseCodes)
                .then(htmlArray => sendResponse({ data: htmlArray }))
                .catch(error => sendResponse({ error: error.message }));
        });
        return true; 
    }
});

async function performInPageScrape(tabId, courseCodes) {
    try {
        // --- STEP 1: Execute the main scraping script to get the data ---
        const results = await chrome.scripting.executeScript({
            target: { tabId: tabId },
            func: scrapeFunction,
            args: [courseCodes]
        });
        
        const resultValue = results[0].result;
        if (typeof resultValue === 'string' && resultValue.startsWith('Error:')) {
            throw new Error(resultValue);
        }
        return resultValue; // Return the data to the popup

    } finally {
        // --- STEP 2: GUARANTEED - This runs after the scraping is done ---
        // Inject a final, simple script to navigate the user back.
        console.log("Scraping finished. Navigating back to 'Running Courses'.");
        await chrome.scripting.executeScript({
            target: { tabId: tabId },
            func: () => {
                const menuFrame = window.frames['leftPage'];
                if (menuFrame) {
                    const runCoursesLink = menuFrame.document.querySelector('a[href*="allDept.jsp"]');
                    if (runCoursesLink) {
                        runCoursesLink.click();
                    }
                }
            }
        });
    }
}

// This "master script" now ONLY focuses on scraping data.
// The 'finally' block has been REMOVED from this function.
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
        
        const allResults = [];

        for (const courseCode of courseCodes) {
            statsLink.click();
            await waitForElementInFrame(mainFrame, 'input[name="txtcrsecode"]');

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
            
            await waitForElementInFrame(mainFrame, '#grades'); 
            const gradesTable = mainFrame.document.getElementById('grades');
            if (gradesTable) {
                allResults.push(gradesTable.outerHTML);
            } else {
                allResults.push(``);
            }
        }
        return allResults;
    } catch (error) {
        return `Error: ${error.message}`;
    }
}