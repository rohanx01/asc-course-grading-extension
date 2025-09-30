// background.js

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "fetchGrades") {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (!tabs.length) {
                sendResponse({ error: "No active tab found." });
                return;
            }
            const tabId = tabs[0].id;
            
            performInPageScrape(tabId, request.courseCode)
                .then(html => sendResponse({ data: html }))
                .catch(error => sendResponse({ error: error.message }));
        });
        return true; 
    }
});

async function performInPageScrape(tabId, courseCode) {
    const results = await chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: scrapeFunction,
        args: [courseCode]
    });
    
    if (results[0].result && results[0].result.startsWith('Error:')) {
        throw new Error(results[0].result);
    }
    
    return results[0].result;
}

// This "master script" is injected into the page to perform the automation.
async function scrapeFunction(courseCode) {
    // --- THIS IS THE NEW, MORE ROBUST HELPER FUNCTION ---
    const waitForElementInFrame = (frame, selector) => {
        return new Promise((resolve, reject) => {
            const timeout = 10000; // 10 seconds
            const interval = 200;  // Check every 200ms
            let elapsedTime = 0;

            const checkInterval = setInterval(() => {
                // Check if the element exists in the frame's document
                if (frame.document.querySelector(selector)) {
                    clearInterval(checkInterval);
                    resolve();
                }

                elapsedTime += interval;
                if (elapsedTime >= timeout) {
                    clearInterval(checkInterval);
                    reject(new Error(`Timed out after ${timeout/1000}s waiting for selector "${selector}"`));
                }
            }, interval);
        });
    };
    // ---------------------------------------------------

    try {
        console.log("In-page script starting...");
        
        const menuFrame = window.frames['leftPage'];
        const mainFrame = window.frames['rightPage'];
        if (!menuFrame || !mainFrame) throw new Error("Could not find the necessary page frames.");

        const statsLink = menuFrame.document.querySelector('a[href*="gradstatistics.jsp"]');
        if (!statsLink) throw new Error(`Could not find 'Grading statistics' link.`);
        
        statsLink.click();
        
        // Wait for the search form's input box to appear
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
        
        // Wait for an element from the results page. You may need to adjust this selector.
        // Let's assume the results are in a table with a specific background color.
        await waitForElementInFrame(mainFrame, '#grades'); 

        // --- THIS IS THE KEY CHANGE ---
        // Find the results table by its ID
        const gradesTable = mainFrame.document.getElementById('grades');
        
        // Return only the HTML of the table itself
        if (gradesTable) {
            return gradesTable.outerHTML;
        } else {
            throw new Error("Could not find the final grades table with id='grades'.");
        }
        // -----------------------------

    } catch (error) {
        console.error("In-page script error:", error);
        return `Error: ${error.message}`;
    }
}