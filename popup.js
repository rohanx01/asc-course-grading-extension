document.addEventListener('DOMContentLoaded', function() {
    const getStatsBtn = document.getElementById('getStatsBtn');
    const courseCodeInput = document.getElementById('courseCodeInput');

    getStatsBtn.addEventListener('click', function() {
        const courseCode = courseCodeInput.value.trim().toLowerCase();

        if (courseCode) {
            console.log("Popup sending message to background script for:", courseCode);
            
            // Send a message to the background script
            chrome.runtime.sendMessage(
                {
                    action: "fetchGrades",
                    courseCode: courseCode
                },
                (response) => {
                    // This is the callback function that handles the response
                    if (response.error) {
                        console.error("Error received from background script:", response.error);
                    } else {
                        console.log("HTML received from background script:");
                        console.log(response.data);
                    }
                }
            );
        } else {
            console.log("No course code entered.");
        }
    });
});