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
        const courseCode = courseCodeInput.value.trim().toUpperCase();

        if (!courseCode) {
            showStatus("Please enter a course code.", "error");
            return;
        }

        // Disable button and show loading
        getStatsBtn.disabled = true;
        showStatus("Fetching grades...", "loading");
        
        console.log("Popup sending message to background script for:", courseCode);
        
        // Send a message to the background script
        chrome.runtime.sendMessage(
            {
                action: "fetchGrades",
                courseCode: courseCode
            },
            (response) => {
                // Re-enable button
                getStatsBtn.disabled = false;
                
                console.log("Response received:", response);
                
                // Handle the response
                if (response && response.error) {
                    console.error("Error received from background script:", response.error);
                    showStatus(response.error, "error");
                } else if (response && response.data) {
                    console.log("HTML received from background script:");
                    console.log(response.data);
                    showStatus("✅ Grades fetched successfully!", "success");
                    
                    // TODO: Parse and display the grades here
                } else {
                    showStatus("❌ No response received", "error");
                }
            }
        );
    });

    function showStatus(message, type) {
        statusDiv.textContent = message;
        statusDiv.className = type;
        statusDiv.style.display = 'block';
    }
});