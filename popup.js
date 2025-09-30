document.addEventListener('DOMContentLoaded', function() {
    const getStatsBtn = document.getElementById('getStatsBtn');
    const courseCodeInput = document.getElementById('courseCodeInput');
    const statusDiv = document.getElementById('status');

    getStatsBtn.addEventListener('click', function() {
        const courseCode = courseCodeInput.value.trim().toLowerCase();

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
                
                // Handle the response
                if (response.error) {
                    console.error("Error received from background script:", response.error);
                    showStatus(response.error, "error");
                } else {
                    console.log("HTML received from background script:");
                    console.log(response.data);
                    showStatus("Grades fetched successfully!", "success");
                    
                    // TODO: Parse and display the grades here
                    // You can parse response.data (the HTML) and display it nicely
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