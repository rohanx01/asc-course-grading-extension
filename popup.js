// popup.js
document.addEventListener('DOMContentLoaded', function() {
    const getStatsBtn = document.getElementById('getStatsBtn');
    const courseCodeInput = document.getElementById('courseCodeInput');
    const statusDiv = document.getElementById('status');

    // Function to show status messages in the popup
    function showStatus(message, type) {
        statusDiv.textContent = message;
        statusDiv.className = type; // 'error' or 'success'
        statusDiv.style.display = 'block';
    }

    getStatsBtn.addEventListener('click', function() {
        statusDiv.style.display = 'none'; // Hide previous status messages
        const courseInput = courseCodeInput.value.trim();
        if (!courseInput) {
            showStatus("Please enter at least one course code.", "error");
            return;
        }

        const courseCodesRaw = courseInput.split(',');
        const validCourseCodes = [];
        const courseCodeRegex = /^[A-Z]{2,3}\s?\d{3,4}$/i; // Case-insensitive regex

        // --- NEW VALIDATION BLOCK ---
        for (const rawCode of courseCodesRaw) {
            const code = rawCode.trim();
            if (code && !courseCodeRegex.test(code)) {
                showStatus(`Invalid course code format: "${code}"`, "error");
                return; // Stop the process if any code is invalid
            }
            if (code) {
                // Clean the code by removing spaces and making it uppercase
                validCourseCodes.push(code.replace(/\s+/g, '').toUpperCase());
            }
        }
        // -----------------------------

        if (validCourseCodes.length === 0) {
            showStatus("Please enter at least one course code.", "error");
            return;
        }

        getStatsBtn.disabled = true;
        getStatsBtn.textContent = 'Working...';
        
        chrome.runtime.sendMessage({ action: "fetchGrades", courseCodes: validCourseCodes }, (response) => {
            if (response && response.error) {
                console.error("Error from background script:", response.error);
                showStatus(response.error, "error");

            } else if (response && response.data) {
                console.log(`SUCCESS! Received ${response.data.length} grade tables:`);
                console.log(response.data);
                showStatus(`Successfully fetched data for ${validCourseCodes.length} course(s).`, "success");

            } else {
                console.error("Received an empty or invalid response.");
                showStatus("An unknown error occurred.", "error");
            }
            
            getStatsBtn.disabled = false;
            getStatsBtn.textContent = 'Get Stats';
        });
    });
});