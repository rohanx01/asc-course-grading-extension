// background.js

// Listen for the signal from our content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // This is the trigger from content.js
    if (request.action === "course_page_detected") {
        const tabId = sender.tab.id;
        console.log(`Course page detected on tab ${tabId}. Starting proactive automation.`);
        
        // Clear old data for this tab
        chrome.storage.local.remove(tabId.toString());

        // Run the scraping process
        scrapeAndCacheData(tabId);
    }
    
    // This is the request from the popup asking for the data
    if (request.action === "get_cached_data") {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const activeTabId = tabs[0].id;
            chrome.storage.local.get(activeTabId.toString(), (result) => {
                sendResponse(result[activeTabId] || null);
            });
        });
        return true; // Indicates async response
    }
});

// Main function to run the whole scraping process
async function scrapeAndCacheData(tabId) {
    try {
        await chrome.storage.local.set({ [tabId]: { status: 'scraping' } });

        // 1. Get the course code
        const codeResults = await chrome.scripting.executeScript({
            target: { tabId: tabId },
            func: getCourseCodeFromPage,
        });

        if (!codeResults || !codeResults[0].result) {
            throw new Error("Could not find a course code on the page.");
        }
        const courseCode = codeResults[0].result;
        console.log(`Found course code: ${courseCode}.`);

        // 2. Perform the main scrape
        const html = await performInPageScrape(tabId, courseCode);
        console.log(`Successfully scraped grades for ${courseCode}. Caching.`);
 
        // 3. Cache the final HTML result
        await chrome.storage.local.set({ [tabId]: { status: 'success', html: html } });

    } catch (error) {
        console.error("Scraping failed:", error);
        await chrome.storage.local.set({ [tabId]: { status: 'error', error: error.message } });
    }
}

// Clean up storage when a tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
    chrome.storage.local.remove(tabId.toString());
});

// This is the small function injected to find the course code from the <font> tag
function getCourseCodeFromPage() {
    const titleElement = document.querySelector('font[color="red"][size="4"]');
    if (titleElement) {
        console.log("Found title element for course code extraction.", titleElement.textContent);
        const text = titleElement.textContent;
        // Use a regular expression to find a pattern like "ME 103" or "CS101"
        const match = text.match(/[A-Z]{2}\s*\d{3}/);
        return match ? match[0].replace(/\s+/g, '') : null; // Return cleaned code, e.g., "CS101"
    }
    console.log("Could not find the title element for course code extraction.");
    return null;
}

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