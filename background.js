// background.js

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "fetchGrades") {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (!tabs.length) {
                sendResponse({ error: "No active tab found." });
                return;
            }
            performInPageScrape(tabs[0].id, request.courses)
                .then(data => sendResponse({ data: data }))
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

// This "master script" is injected into the page to perform the automation.
async function scrapeFunction(coursesToScrape) {
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
        
        const finalResults = {};
        const currentYear = new Date().getFullYear();

        // Outer loop: Iterate through each course from the popup
        for (const courseCode in coursesToScrape) {
            console.log(`--- Processing Course: ${courseCode} ---`);
            finalResults[courseCode] = {};
            const semestersToScrape = coursesToScrape[courseCode];

            // Middle loop: Iterate through the last 4 years
            for (let year = currentYear - 1; year >= currentYear - 4; year--) {
                finalResults[courseCode][year] = {};
                
                // Inner loop: Iterate through selected semesters for that course
                for (const semester of semestersToScrape) {
                    console.log(`Fetching: ${courseCode}, Year: ${year}, Sem: ${semester}`);
                    
                    // 1. Navigate to the search page for each request
                    statsLink.click();
                    await waitForElementInFrame(mainFrame, 'input[name="txtcrsecode"]');

                    // 2. Fill and submit the form
                    const mainFrameDoc = mainFrame.document;
                    mainFrameDoc.querySelector('select[name="year"]').value = year;
                    mainFrameDoc.querySelector('select[name="semester"]').value = semester;
                    mainFrameDoc.querySelector('input[name="txtcrsecode"]').value = courseCode;
                    const form = mainFrameDoc.querySelector('input[name="submit"]').closest('form');
                    HTMLFormElement.prototype.submit.call(form);
                    
                    // 3. Wait for results and scrape the table
                    try {
                        await waitForElementInFrame(mainFrame, '#grades'); 
                        const gradesTable = mainFrame.document.getElementById('grades');
                        finalResults[courseCode][year][semester] = gradesTable ? gradesTable.outerHTML : "Not Found";
                    } catch (e) {
                        console.warn(`No grade table found for ${courseCode} (${year}-${semester}). It might not exist.`);
                        finalResults[courseCode][year][semester] = "Not Found";
                    }
                }
            }
        }

        return finalResults; // Return the final structured object

    } catch (error) {
        console.error("In-page script error:", error);
        return { error: error.message }; // Return an error object
    }
}