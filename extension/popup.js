// popup.js
document.addEventListener('DOMContentLoaded', function() {
    const addCourseBtn = document.getElementById('add-course-btn');
    const getStatsBtn = document.getElementById('get-stats-btn');
    const courseList = document.getElementById('course-list');
    const statusDiv = document.getElementById('status');
    const chartsContainer = document.getElementById('charts-container');
    const historyContainer = document.getElementById('history-container');
    const clearHistoryBtn = document.getElementById('clear-history-btn');

    const showStatus = (message, isSuccess = false) => {
        statusDiv.textContent = message;
        if (isSuccess) {
            statusDiv.style.color = '#2e7d32';
            statusDiv.style.borderColor = '#2e7d32';
            statusDiv.style.backgroundColor = '#e8f5e9';
        } else {
            statusDiv.style.color = '#c62828';
            statusDiv.style.borderColor = '#c62828';
            statusDiv.style.backgroundColor = '#ffebee';
        }
        statusDiv.style.display = 'block';
    };

    let allCourseData = {}; // Variable to hold all fetched data in memory

    // --- Main Logic on Popup Open ---
    chrome.storage.local.get(['allCourseData'], (result) => {
        if (result.allCourseData) {
            allCourseData = result.allCourseData;
            console.log("Loaded data from storage.");
            renderHistory(allCourseData);
            // Optional: You can uncomment the next line to show the last session's charts on open.
            // processData(allCourseData);
        }
    });

    // --- NEW: Event listener for the Clear History button ---
    clearHistoryBtn.addEventListener('click', () => {
        if (confirm("Are you sure you want to delete all search history?")) {
            chrome.storage.local.remove('allCourseData', () => {
                allCourseData = {};
                renderHistory({}); // Clear history links
                chartsContainer.innerHTML = ''; // Also clear the charts
                console.log("History cleared.");
            });
        }
    });

    // --- NEW: Event listener for history clicks ---
    historyContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('history-link')) {
            const courseCode = e.target.dataset.coursecode;
            const courseData = { [courseCode]: allCourseData[courseCode] };
            processData(courseData, true); // `true` tells it to append
        }
    });

// --- NEW: Function to render the history links ---
    function renderHistory(data) {
        historyContainer.innerHTML = ''; // Clear old links
        if (!data) return;
        const courseCodes = Object.keys(data).sort();
        courseCodes.forEach(code => {
            const link = document.createElement('span');
            link.className = 'history-link';
            link.textContent = code;
            link.dataset.coursecode = code; // Store code in a data attribute
            historyContainer.appendChild(link);
        });
    }

    // Function to parse the HTML table and extract grade data
    function processData(data,append=false) {
            chartsContainer.innerHTML = '';
            if (!data || Object.keys(data).length === 0) {
                chartsContainer.textContent = 'No data to display.';
                return;
            }

            for (const courseCode in data) {
                const courseData = data[courseCode];

                if (typeof courseData !== 'object') continue;
                
                const courseBlock = document.createElement('div');
                courseBlock.className = 'course-block';
                courseBlock.innerHTML = `<h2>${courseCode}</h2>`;
                
                // Create the grid container for this course's charts
                const chartsGrid = document.createElement('div');
                chartsGrid.className = 'charts-grid';
                
                for (const year in courseData) {
                    const yearData = courseData[year];

                    for (const semester in yearData) {
                        const htmlString = yearData[semester];
                        if (htmlString && htmlString !== "Not Found") {
                            const parsedData = parseGradeTable(htmlString);
                            // --- NEW DISPLAY LOGIC ---
                    if (parsedData === null) {
                        // Case 1: Course was not offered
                        const infoEl = document.createElement('div');
                        infoEl.className = 'chart-container'; // Use same styling for alignment
                        infoEl.innerHTML = `<h4>Year: ${year} - Semester ${semester}</h4><p><i>Not offered in this semester.</i></p>`;
                        chartsGrid.appendChild(infoEl);
                    } else if (parsedData && Object.keys(parsedData.sections).length > 0) {
                        // Case 2: Data found, create chart
                        const chartContainer = document.createElement('div');
                        chartContainer.className = 'chart-container';
                        const canvas = document.createElement('canvas');
                        chartContainer.appendChild(canvas);
                        chartsGrid.appendChild(chartContainer);
                        createGroupedBarChart(canvas, parsedData);
                    } else {
                        // Case 3: Page was found, but no grade data was parsed
                        const infoEl = document.createElement('div');
                        infoEl.className = 'chart-container';
                        infoEl.innerHTML = `<h4>Year: ${year} - Semester ${semester}</h4><p><i>No grade data found.</i></p>`;
                        chartsGrid.appendChild(infoEl);
                    }
                    // -------------------------
                        }
                    }
                }
                
                // Add the grid to the main course block
                courseBlock.appendChild(chartsGrid);
                chartsContainer.appendChild(courseBlock);
            }
    }

    // Function to add a new row to the table
    const addCourseRow = () => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><input type="text" class="course-code" placeholder="e.g., CS101"></td>
            <td><input type="checkbox" class="sem1"></td>
            <td><input type="checkbox" class="sem2"></td>
            <td><span class="action-btn remove-row">X</span></td>
        `;
        courseList.appendChild(row);

        const newInput = row.querySelector('.course-code');
        newInput.focus();
    };

    // Add one row to start with
    addCourseRow();

    addCourseBtn.addEventListener('click', addCourseRow);

    // Handle remove button clicks using event delegation
    courseList.addEventListener('click', (e) => {
        if (e.target.classList.contains('remove-row')) {
            e.target.closest('tr').remove();
        }
    });

    getStatsBtn.addEventListener('click', () => {
        statusDiv.style.display = 'none';
        const coursesToScrape = {};
        const rows = courseList.querySelectorAll('tr');

        rows.forEach(row => {
            const courseCodeInput = row.querySelector('.course-code');
            const sem1Checked = row.querySelector('.sem1').checked;
            const sem2Checked = row.querySelector('.sem2').checked;
            
            const courseCode = courseCodeInput.value.trim().toUpperCase();
            if (courseCode) {
                const semesters = [];
                if (sem1Checked) semesters.push(1);
                if (sem2Checked) semesters.push(2);
                
                if (semesters.length > 0) {
                    coursesToScrape[courseCode] = semesters;
                }
            }
        });

        
        if (Object.keys(coursesToScrape).length === 0) {
            showStatus("Please enter at least one course.");
            return;
        }
        

        getStatsBtn.disabled = true;
        getStatsBtn.textContent = 'Working...';

        chrome.runtime.sendMessage({ action: "fetchGrades", courses: coursesToScrape }, (response) => {
            getStatsBtn.disabled = false;
            getStatsBtn.textContent = 'Get All Stats';
            
            // --- CORRECTED ERROR HANDLING ---
            if (response && response.data.error) {
                console.error("Error from background script:", response.error);
                showStatus(response.data.error,false); // Show the error...
                return; // ...and STOP execution here.
            }
            if (response && response.data) {
                console.log("Data received:", response);
                const mergedData = { ...allCourseData, ...response.data };
                allCourseData = mergedData; // Update our in-memory data

                // Save merged data and re-render everything
                chrome.storage.local.set({ allCourseData: mergedData }, () => {
                    console.log("Data saved. Refreshing display.");
                    renderHistory(mergedData); // Refresh history links
                    processData(response.data, true); // Append only the new charts
                });
            } else {
                showStatus("Error: Received an empty or invalid response.",false);
            }
            
            getStatsBtn.disabled = false;
            getStatsBtn.textContent = 'Get All Stats';
        });
    });
});