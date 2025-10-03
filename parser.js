// parser.js

function parseGradeTable(htmlString) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');

    // --- NEW ROBUSTNESS CHECK ---
    // Check for the "NOT offered" message first.
    const notOfferedEl = doc.querySelector('font[color="red"]');
    if (notOfferedEl && notOfferedEl.textContent.includes("NOT offered in this semester")) {
        return null; // Return null to indicate the course was not offered.
    }
    // ----------------------------

    const mainTable = doc.getElementById('grades');
    if (!mainTable) return null;

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
    const sectionTables = mainTable.querySelectorAll('td[valign="top"] > table');

    sectionTables.forEach(table => {
        const sectionHeader = table.querySelector('th')?.textContent || '';
        const sectionMatch = sectionHeader.match(/section (\S+)/); // \S+ matches non-whitespace (e.g., D3, S1)
        if (!sectionMatch) return;

        const sectionName = sectionMatch[1];
        const sectionGrades = {};
        const gradeRows = table.querySelectorAll('tr');

        gradeRows.forEach(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length === 2) {
                const grade = cells[0].textContent.trim();
                const count = parseInt(cells[1].textContent.trim(), 10);
                if (grade && !isNaN(count) && grade.length <= 2 && grade !== 'II') {
                    sectionGrades[grade] = count;
                    allGrades.add(grade);
                }
            }
        });
        sections[sectionName] = sectionGrades;
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
            label: `Section ${sectionName}`,
            data: parsedData.allGrades.map(grade => sectionData[grade] || 0), // Use 0 if a section doesn't have a specific grade
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