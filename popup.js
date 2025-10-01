document.addEventListener('DOMContentLoaded', function() {
    const getStatsBtn = document.getElementById('getStatsBtn');
    const courseCodeInput = document.getElementById('courseCodeInput');
    const statusDiv = document.getElementById('status');

    // Check current tab on load
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
            console.log("Current tab URL:", tabs[0].url);
            if (!tabs[0].url.startsWith('https://asc.iitb.ac.in/')) {
                showStatus("⚠️ Please navigate to asc.iitb.ac.in", "error");
            }
        }
    });

    getStatsBtn.addEventListener('click', function() {
        const courseInput = courseCodeInput.value.trim();
        if (!courseInput) return;

        // Split the input string by commas and clean up each code
        const courseCodes = courseInput.split(',').map(code => code.trim().toUpperCase());

        getStatsBtn.disabled = true;
        getStatsBtn.textContent = 'Working...';
        
        // Send the array of course codes to the background script
        chrome.runtime.sendMessage({ action: "fetchGrades", courseCodes: courseCodes }, (response) => {
            if (response && response.error) {
                console.error("Error from background script:", response.error);
            } else if (response && response.data) {
                console.log(`SUCCESS! Received ${response.data.length} grade tables:`);
                console.log(response.data); // This will be an array of HTML strings
            } else {
                console.error("Received an empty or invalid response.");
            }
            
            getStatsBtn.disabled = false;
            getStatsBtn.textContent = 'Get Stats';
        });
    });

    function showStatus(message, type) {
        statusDiv.textContent = message;
        statusDiv.className = type;
        statusDiv.style.display = 'block';
    }
});