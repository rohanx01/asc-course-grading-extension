// content.js (Frame Detective Version 2.0)

// This injection guard ensures we only log the report once per frame.
if (typeof window.frameReported === 'undefined') {
    window.frameReported = true;

    // --- Data Collection ---
    const report = {
        frameName: window.name || '(no name)',
        isTopFrame: window === window.top,
        parentName: 'N/A (This is the top frame)',
        siblingNames: [] // New array to hold sibling names
    };

    // Safely try to access parent information
    if (!report.isTopFrame) {
        try {
            report.parentName = window.parent.name || '(no name)';
            // Loop through all frames belonging to the parent to get sibling names
            for (let i = 0; i < window.parent.frames.length; i++) {
                report.siblingNames.push(window.parent.frames[i].name || '(no name)');
            }
        } catch (e) {
            // This error is rare but possible with cross-origin frames.
        }
    }

    // --- Print Formatted Report ---
    console.group(`--- Frame Report for: "${report.frameName}" ---`);
    console.log(`Is Top Frame?:`, report.isTopFrame);
    console.log(`Parent's Name:`, report.parentName);
    console.log(`Sibling Frame Names:`, report.siblingNames); // New log
    console.log(`Frame URL:`, window.location.href);
    console.groupEnd();
}