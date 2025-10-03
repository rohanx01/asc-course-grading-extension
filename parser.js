// parser.js
Chart.register(ChartDataLabels);

function parseGradeTable(htmlString) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');

    const mainTable = doc.getElementById('grades');
    if (!mainTable) return null;

    // --- NEW EFFICIENT & ROBUST LOGIC ---
    // 1. Check for both conditions first, without exiting.
    const notOfferedEl = doc.querySelector('font[color="red"]');
    const isMarkedAsNotOffered = notOfferedEl && notOfferedEl.textContent.includes("NOT offered in this semester");

    const sectionTables = mainTable.querySelectorAll('td[valign="top"] > table');
    const hasGradeTables = sectionTables.length > 0;

    // 2. Apply the logic.
    if (!hasGradeTables && isMarkedAsNotOffered) {
        // Exit early only if there are no grade tables AND the "Not Offered" message is present.
        return null; 
    }
    // --- END OF NEW LOGIC ---

    // --- Extract Metadata ---
    const headerText = mainTable.querySelector('tr:first-child td')?.textContent || '';
    const yearMatch = headerText.match(/Year (\d{4})/);
    const semesterMatch = headerText.match(/Semester (\d)/);
    const year = yearMatch ? yearMatch[1] : 'Unknown Year';
    const semester = semesterMatch ? semesterMatch[1] : 'Unknown Sem';
    const courseName = mainTable.querySelector('tr:nth-child(4) td:nth-child(2)')?.textContent.trim() || 'Unknown Course';

    // --- Extract Grade Data for each Section ---
    const allGrades = new Set();
    const sections = {};

    sectionTables.forEach(table => {
        const sectionHeader = table.querySelector('th')?.textContent || '';
        let sectionName = null;
        
        // --- THIS IS THE NEW ROBUST LOGIC ---
        const sectionMatch = sectionHeader.match(/section (\S+)/);
        if (sectionMatch) {
            // Case 1: An explicit section name like "D1" or "M" is found.
            sectionName = sectionMatch[1];
        } else if (sectionHeader.includes("Total Grades Given")) {
            // Case 2: No explicit name, but it's a grades table (single-section course).
            sectionName = "NA"; // Assign a default name.
        } else {
            // If it's not a grades table at all, skip it.
            return; 
        }
        // ------------------------------------

        const sectionGrades = {};
        const gradeRows = table.querySelectorAll('tr');
        let sectionTotal = 0;

        gradeRows.forEach(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length === 2) {
                const grade = cells[0].textContent.trim();
                const count = parseInt(cells[1].textContent.trim(), 10);

                if (grade === 'Total') {
                    sectionTotal = count;
                } else if (grade && !isNaN(count) && grade.length <= 2 && grade !== 'II') {
                    sectionGrades[grade] = count;
                    allGrades.add(grade);
                }
            }

        });
        sections[sectionName] = {
            grades: sectionGrades,
            total: sectionTotal
        };
    });
    
    // Sort grades for consistent chart ordering (e.g., AA, AB, BB...)
    const sortedGrades = Array.from(allGrades).sort();

    return { courseName, year, semester, allGrades: sortedGrades, sections };
}

function createGroupedBarChart(canvasElement, parsedData) {
    const colors = ['rgba(255, 99, 132, 0.7)', 'rgba(54, 162, 235, 0.7)', 'rgba(255, 206, 86, 0.7)', 'rgba(75, 192, 192, 0.7)', 'rgba(153, 102, 255, 0.7)'];
    const borderColors = ['rgb(255, 99, 132)', 'rgb(54, 162, 235)', 'rgb(255, 206, 86)', 'rgb(75, 192, 192)', 'rgb(153, 102, 255)'];

    const datasets = Object.keys(parsedData.sections).map((sectionName, index) => {
        const sectionData = parsedData.sections[sectionName];
        return {
            label: `Section ${sectionName} (Total: ${sectionData.total})`,
            data: parsedData.allGrades.map(grade => sectionData.grades[grade] || 0), // Use 0 if a section doesn't have a specific grade
            backgroundColor: colors[index % colors.length],
            borderColor: borderColors[index % borderColors.length],
            borderWidth: 1
        };
    });

    new Chart(canvasElement, {
        type: 'bar',
        data: {
            labels: parsedData.allGrades,
            datasets: datasets
        },
        options: {
            plugins: {
                title: {
                    display: true,
                    text: `Year: ${parsedData.year} - Semester ${parsedData.semester}`
                },
                tooltip: {
                    enabled: false // Disable tooltips to avoid overlap issues
                },
                datalabels: {
                    anchor: 'end',
                    align: 'end',

                    offset: -6,
                    // Only show a label if the value is greater than 0
                    formatter: (value) => value > 0 ? value : '',
                    color: '#363636',
                    font: {
                        weight: 'normal',
                        size: 9
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: { display: true, text: 'Number of Students' }
                },
                x: {
                    title: { display: true, text: 'Grades' }
                }
            }
        }
    });
}