// popup.js
document.addEventListener('DOMContentLoaded', () => {
    const statusDiv = document.getElementById('status');
    const resultsDiv = document.getElementById('results');

    // Immediately ask the background script for the cached data for the current tab
    chrome.runtime.sendMessage({ action: "get_cached_data" }, (response) => {
        if (!response) {
            statusDiv.textContent = 'Navigate to a course page to see grade stats.';
            return;
        }

        switch (response.status) {
            case 'scraping':
                statusDiv.textContent = 'Scraping in progress... 🤖';
                break;
            case 'error':
                statusDiv.textContent = `Error: ${response.error}`;
                break;
            case 'success':
                statusDiv.textContent = 'Grades loaded successfully!';
                resultsDiv.innerHTML = response.html;
                break;
            default:
                statusDiv.textContent = 'No data available for this page.';
        }
    });
});