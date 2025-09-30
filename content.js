// content.js

if (!window.ascHelperInjected) {
    window.ascHelperInjected = true;
    console.log("✅ ASC Helper Content Script is running!");
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "ping") {
        sendResponse({ status: "ready" });
    }
});

chrome.runtime.onConnect.addListener((port) => {
    console.assert(port.name === "scrape-channel");
    port.onMessage.addListener((request) => {
        if (request.action === "startScraping") {
            scrapeWithFrames(request.courseCode)
                .then(html => port.postMessage({ data: html }))
                .catch(error => port.postMessage({ error: error.message }));
        }
    });
});

function scrapeWithFrames(courseCode) {
    return new Promise((resolve, reject) => {
        // Load the main page that contains the frameset
        const PORTAL_URL = 'https://asc.iitb.ac.in/acadmenu/index.jsp';
        
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        document.body.appendChild(iframe);

        iframe.onload = async () => {
            try {
                console.log("Iframe loaded. Accessing internal frames...");
                
                // Get access to the documents of the frames INSIDE the iframe
                const menuFrameDoc = iframe.contentWindow.frames['left'].document;
                const mainFrame = iframe.contentWindow.frames['right2'];

                // --- 1. Click through the menu in the left frame ---
                const clickMenuLink = async (text) => {
                    const link = Array.from(menuFrameDoc.querySelectorAll('*')).find(el => el.textContent.trim() === text);
                    if (!link) throw new Error(`Could not find menu link: ${text}`);
                    
                    link.click();
                    console.log(`Clicked "${text}". Waiting for main frame to navigate...`);
                    // Wait for the main frame to finish loading after the click
                    await new Promise(res => {
                        const listener = () => {
                            mainFrame.removeEventListener('load', listener);
                            res();
                        };
                        mainFrame.addEventListener('load', listener);
                    });
                };

                await clickMenuLink("Academic");
                await clickMenuLink("All About Courses");
                await clickMenuLink("Grading statistics");

                console.log("Menu navigation complete. Now on search page.");

                // --- 2. Fill and submit the form in the right frame ---
                const mainFrameDoc = mainFrame.document;
                const courseInput = mainFrameDoc.querySelector('input[name="txtcrsecode"]');
                const submitButton = mainFrameDoc.querySelector('input[name="submit"]');
                if (!courseInput || !submitButton) throw new Error("Could not find form elements.");
                
                courseInput.value = courseCode;
                submitButton.click();
                
                // Wait for the final results page to load in the main frame
                await new Promise(res => {
                    const listener = () => {
                        mainFrame.removeEventListener('load', listener);
                        res();
                    };
                    mainFrame.addEventListener('load', listener);
                });
                
                console.log("SUCCESS: Reached final results page.");
                
                // --- 3. Scrape the final HTML ---
                const finalHtml = mainFrame.document.documentElement.outerHTML;
                document.body.removeChild(iframe);
                resolve(finalHtml);

            } catch (error) {
                document.body.removeChild(iframe);
                reject(error);
            }
        };

        iframe.onerror = () => {
            document.body.removeChild(iframe);
            reject(new Error("The iframe was blocked from loading."));
        };
        
        iframe.src = PORTAL_URL;
    });
}