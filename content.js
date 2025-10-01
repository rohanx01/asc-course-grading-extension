// content.js

// Injection guard to prevent the script from running multiple times in the same frame load.
if (typeof window.ascHelperInjected === 'undefined') {
    window.ascHelperInjected = true;

    const frameName = window.name; // Get the name of the current frame
    console.log(`ASC Helper content script injected into frame: "${frameName}"`);

    // Only the script inside the 'rightPage' frame should do the work.
    if (frameName === 'rightPage') {
        
        /**
         * This function runs once the frame's content has loaded.
         * It simply checks if the target form exists on the page.
         */
        const checkForCourseForm = () => {
            console.log("DOM loaded. Checking for course form...");
            const targetSelector = 'form[action="crseedetailupdate.jsp"]';

            if (document.querySelector(targetSelector)) {
                console.log("🎯 Course form FOUND! Sending message to background script.");
                chrome.runtime.sendMessage({ action: "course_page_detected" });
            } else {
                console.log("❌ Course form not found on this page.");
            }
        };

        // --- The Robust Check ---
        // We check the document's state to decide whether to run now or wait.
        if (document.readyState === 'interactive' || document.readyState === 'complete') {
            checkForCourseForm(); // Run immediately if DOM is already ready
        } else {
            window.addEventListener('DOMContentLoaded', checkForCourseForm); // Wait for the event
        }
    }
}