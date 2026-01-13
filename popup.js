// Calculate classes needed for 75% attendance
function calculateClassesNeeded(attended, total, targetPercent = 75) {
  const currentPercent = (attended / total) * 100;
  
  if (currentPercent >= targetPercent) {
    // Calculate how many classes can be skipped
    let canSkip = 0;
    let tempAttended = attended;
    let tempTotal = total;
    
    while (tempTotal > 0) {
      tempTotal++;
      const newPercent = (tempAttended / tempTotal) * 100;
      if (newPercent < targetPercent) {
        break;
      }
      canSkip++;
    }
    
    return {
      status: 'good',
      classesNeeded: 0,
      canSkip: canSkip,
      message: canSkip > 0 ? `You can skip ${canSkip} class${canSkip > 1 ? 'es' : ''}` : 'Maintain current attendance'
    };
  } else {
    // Calculate classes needed to reach 75%
    let needed = 0;
    let tempAttended = attended;
    let tempTotal = total;
    
    while (true) {
      tempAttended++;
      tempTotal++;
      needed++;
      const newPercent = (tempAttended / tempTotal) * 100;
      if (newPercent >= targetPercent) {
        break;
      }
      if (needed > 1000) break; // Safety check
    }
    
    return {
      status: 'danger',
      classesNeeded: needed,
      canSkip: 0,
      message: `Attend next ${needed} class${needed > 1 ? 'es' : ''} continuously`
    };
  }
}

function getStatusClass(percentage) {
  if (percentage >= 75) return 'good';
  if (percentage >= 70) return 'warning';
  return 'danger';
}

function renderSubjects(subjects) {
  if (!subjects || subjects.length === 0) {
    return `
      <div class="empty-state">
        <div style="font-size: 50px; margin-bottom: 10px;">📭</div>
        <p>No attendance data found.</p>
        <p style="font-size: 12px; margin-top: 5px;">Make sure you're on the attendance page.</p>
        <button class="refresh-btn" id="emptyRefreshBtn">Refresh</button>
      </div>
    `;
  }
  
  return `
    <div class="container">
      ${subjects.map(subject => {
        const calc = calculateClassesNeeded(subject.attended, subject.total);
        const statusClass = getStatusClass(subject.percentage);
        
        return `
          <div class="subject-card">
            <div class="subject-header">
              <div class="subject-info">
                <h3>${subject.code} - ${subject.type || ''}</h3>
                <p>${subject.name}</p>
              </div>
              <div class="percentage ${statusClass}">
                ${subject.percentage.toFixed(1)}%
              </div>
            </div>
            
            <div class="attendance-stats">
              <div class="stat">
                <div style="font-weight: 600;">${subject.attended}</div>
                <div style="font-size: 11px; color: #999;">Attended</div>
              </div>
              <div class="stat">
                <div style="font-weight: 600;">${subject.total}</div>
                <div style="font-size: 11px; color: #999;">Total</div>
              </div>
              <div class="stat">
                <div style="font-weight: 600;">${subject.total - subject.attended}</div>
                <div style="font-size: 11px; color: #999;">Missed</div>
              </div>
            </div>
            
            <div class="recommendation ${calc.status}">
              ${calc.message}
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function refreshData() {
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="loading">
      <div style="font-size: 40px; margin-bottom: 10px;">🔄</div>
      <div>Refreshing data...</div>
    </div>
  `;
  
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    if (tabs[0]?.url?.includes('learner.vierp.in/attendance')) {
      chrome.tabs.sendMessage(tabs[0].id, {action: 'extractData'}, (response) => {
        if (response && response.success) {
          chrome.storage.local.set({ 
            attendanceData: response.data, 
            lastUpdated: new Date().toISOString() 
          }, () => {
            loadData();
          });
        } else {
          showError();
        }
      });
    } else {
      showError('Please open the attendance page first');
    }
  });
}

function showError(message = 'Please navigate to the attendance page') {
  document.getElementById('content').innerHTML = `
    <div class="error">
      <div style="font-size: 50px; margin-bottom: 10px;">⚠️</div>
      <p>${message}</p>
      <button class="refresh-btn" id="errorRefreshBtn">Try Again</button>
    </div>
  `;
  
  // Add event listener after button is created
  setTimeout(() => {
    const btn = document.getElementById('errorRefreshBtn');
    if (btn) btn.addEventListener('click', refreshData);
  }, 0);
}

function loadData() {
  chrome.storage.local.get(['attendanceData', 'lastUpdated'], (result) => {
    if (result.attendanceData && result.attendanceData.length > 0) {
      document.getElementById('content').innerHTML = renderSubjects(result.attendanceData);
      
      // Add event listener for refresh button if it exists
      setTimeout(() => {
        const btn = document.getElementById('emptyRefreshBtn');
        if (btn) btn.addEventListener('click', refreshData);
      }, 0);
    } else {
      // Try to extract from current page
      chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        if (tabs[0]?.url?.includes('learner.vierp.in/attendance')) {
          refreshData();
        } else {
          showError();
        }
      });
    }
  });
}

// Load data when popup opens
document.addEventListener('DOMContentLoaded', loadData);