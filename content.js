// Content script to extract attendance data from the page
function extractAttendanceData() {
  const subjects = [];
  
  try {
    // Get all text content split by lines
    const allText = document.body.innerText;
    const lines = allText.split('\n').map(l => l.trim()).filter(l => l);
    
    console.log('Total lines:', lines.length);
    
    // Pattern: 
    // Line N: percentage like "66.67%"
    // Line N+1: fraction like "2 / 3"
    // Line N+2: subject code like "CS2308"
    // Line N+3: subject name like "DS - II"
    // Line N+4: type like "Theory" or "Lab"
    
    for (let i = 0; i < lines.length - 4; i++) {
      const line = lines[i];
      
      // Check if this line is a percentage
      if (/^\d+\.?\d*%$/.test(line)) {
        const percentage = parseFloat(line.replace('%', ''));
        
        // Next line should be the fraction
        const nextLine = lines[i + 1];
        const fractionMatch = nextLine.match(/(\d+)\s*\/\s*(\d+)/);
        
        if (fractionMatch) {
          const attended = parseInt(fractionMatch[1]);
          const total = parseInt(fractionMatch[2]);
          
          // Next line should be subject code
          const codeLine = lines[i + 2];
          const codeMatch = codeLine.match(/^([A-Z]{2}\d{4})$/);
          
          if (codeMatch) {
            const code = codeMatch[1];
            
            // Next line is subject name
            const name = lines[i + 3] || 'Subject';
            
            // Next line is type (Theory/Lab)
            const type = lines[i + 4] || '';
            
            // Create unique key (code + type) to avoid duplicates
            const key = `${code}-${type}`;
            
            if (!subjects.find(s => `${s.code}-${s.type}` === key)) {
              subjects.push({
                code,
                name,
                type,
                attended,
                total,
                percentage
              });
              
              console.log('✅ Added subject:', { code, name, type, attended, total, percentage });
            }
          }
        }
      }
    }
    
    console.log('Final extracted subjects:', subjects);
    
  } catch (e) {
    console.error('Error in extractAttendanceData:', e);
  }
  
  // Store in Chrome storage for popup to access
  if (subjects.length > 0) {
    chrome.storage.local.set({ 
      attendanceData: subjects, 
      lastUpdated: new Date().toISOString() 
    });
    console.log('💾 Stored', subjects.length, 'subjects in storage');
  } else {
    console.log('❌ No subjects found to store');
  }
  
  return subjects;
}

// Extract data when page loads
setTimeout(() => {
  console.log('🔍 Starting attendance extraction...');
  extractAttendanceData();
}, 3000); // Wait 3 seconds for page to fully load

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractData') {
    console.log('📩 Received extract request from popup');
    const data = extractAttendanceData();
    sendResponse({ success: true, data });
  }
  return true;
});