document.addEventListener('DOMContentLoaded', function() {
    const getStatsBtn = document.getElementById('getStatsBtn');
    const courseCodeInput = document.getElementById('courseCodeInput');

    getStatsBtn.addEventListener('click', async function() {
        // We'll clean up the input to be safe (lowercase, no extra spaces)
        const courseCode = courseCodeInput.value.trim().toLowerCase();

        if (courseCode) {
            console.log("Fetching data for:", courseCode);
            
            // --- THIS IS THE UPDATED PART ---
            // Construct the exact URL from the network request you found
            const year = "2025"; // We can make this dynamic later
            const semester = "1"; // We can make this dynamic later
            const targetUrl = `https://asc.iitb.ac.in/academic/Grading/statistics/gradstatforcrse.jsp?year=${year}&semester=${semester}&txtcrsecode=${courseCode}&submit=SUBMIT`;
            
            console.log("Requesting URL:", targetUrl); // Log the URL to double-check it
            // -----------------------------

            try {
                const response = await fetch(targetUrl);
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                const htmlText = await response.text();
                
                // The parsing logic from before goes here
                const parser = new DOMParser();
                const doc = parser.parseFromString(htmlText, 'text/html');

                // 🕵️ Your detective work to find the right selectors starts here!
                // Example: const gradeElement = doc.querySelector('selector-for-your-data');
                // console.log(gradeElement.innerText);

                console.log("Got response, now you need to parse it!");


            } catch (error) {
                console.error("Failed to fetch or parse data:", error);
            }
        } else {
            console.log("Button clicked, but no course code was entered.");
        }
    });
});