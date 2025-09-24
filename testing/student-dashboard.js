// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBjo5LY4EsFlX8j_8NbLUObooUsCqJM8KM",
  authDomain: "tk-scheduler.firebaseapp.com",
  projectId: "tk-scheduler",
  storageBucket: "tk-scheduler.appspot.com",
  messagingSenderId: "746606755052",
  appId: "1:746606755052:web:d7eae92976cb2f2fa9f9c9",
  measurementId: "G-Q5L607R3N7"
};

// Initialize Firebase with compat version
firebase.initializeApp(firebaseConfig);

// Initialize Firebase services
const auth = firebase.auth();
const db = firebase.firestore();

//This function is necessary to reset
  // Clear existing timer
  clearTimeout(inactivityTimer);

  //This function is necessary to log out user if account is not used within 2hrs
  // Set new timer (2 hours = 2 * 60 * 60 * 1000 milliseconds)
  inactivityTimer = setTimeout(logoutDueToInactivity, 2 * 60 * 60 * 1000);
}

//This function further alerts user before logging them out. It then sends them back to login page
function logoutDueToInactivity() {
  alert('You have been logged out due to inactivity.');
  auth.signOut().then(() => {
    window.location.href = 'student-login.html';
  });
}


//This function displays a list of tutoring sessions in a table on a webpage. 
function appendSessionHistory(snapshot) {
  const container = document.getElementById('sessionsContainer');
  if (!container) {
    console.error('Sessions container not found');
    return;
  }
  
  if (!snapshot || snapshot.empty) {
    container.innerHTML = '<tr><td colspan="8">No sessions found</td></tr>';
    return;
  }
  
  const rows = [];
  snapshot.forEach(doc => {
    if (!doc.exists) return;
    
    const session = doc.data();
    if (!isValidSession(session)) {
      console.warn('Invalid session data:', session);
      return;
    }
    
    rows.push(createSessionRow(session));
  });
  
  if (rows.length === 0) {
    container.innerHTML = '<tr><td colspan="8">No valid sessions found</td></tr>';
    return;
  }
  
  container.innerHTML = '';
  rows.forEach(row => container.appendChild(row));
}

// XSS protection
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function createSessionRow(session) {
  const row = document.createElement('tr');
  const sessionDate = session.date.toDate();
  const formattedDate = sessionDate.toLocaleDateString();
  const formattedTime = sessionDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  
  const { actionTime, actionType } = getActionTimestamp(session);
  const actionDate = actionTime.toLocaleDateString();
  const actionTimeFormatted = actionTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  
  row.innerHTML = `
    <td>${escapeHtml(formattedDate)}</td>
    <td>${escapeHtml(formattedTime)}</td>
    <td>${escapeHtml(session.tutorName || 'Unknown')}</td>
    <td>${escapeHtml(session.subject || 'No subject')}</td>
    <td>${escapeHtml((session.duration || '1') + ' hours')}</td>
    <td><span class="status-badge ${getStatusClass(session.status)}">${escapeHtml(session.status || 'unknown')}</span></td>
    <td class="timestamp-cell">
      <div>${escapeHtml(actionDate)}</div>
      <div style="font-size: 11px; color: var(--gray-light);">${escapeHtml(actionTimeFormatted)}</div>
    </td>
    <td><span class="status-badge ${getActionTypeClass(actionType)}">${escapeHtml(actionType)}</span></td>
  `;
  
  return row;
}

// Basic validation (customize based on your data structure)
function isValidSession(session) {
  return session && 
         session.date && 
         typeof session.date.toDate === 'function' &&
         session.tutorName !== undefined;
}


// Append to existing table efficiently
function appendToTable(container, html) {
  const tbody = container.querySelector('tbody');
  
  // Use DocumentFragment for better performance
  const tempContainer = document.createElement('tbody');
  tempContainer.innerHTML = html;
  
  // Append nodes directly instead of re-parsing HTML
  while (tempContainer.firstChild) {
    tbody.appendChild(tempContainer.firstChild);
  }
}

class ActivityMonitor {
  constructor() {
    this.handlers = new Map();
    this.setupActivityListeners();
  }

  setupActivityListeners() {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    
    events.forEach(event => {
      const handler = () => this.resetInactivityTimer();
      document.addEventListener(event, handler);
      this.handlers.set(event, handler);
    });

    // Section navigation listeners
    const menuItems = document.querySelectorAll('.menu-item a');
    menuItems.forEach((item, index) => {
      const handler = () => this.resetInactivityTimer();
      item.addEventListener('click', handler);
      this.handlers.set(`menuItem-${index}`, handler);
    });
  }

  resetInactivityTimer() {
    // Your inactivity timer logic
    console.log('Activity detected - resetting timer');
  }

  cleanup() {
    // Remove all event listeners
    this.handlers.forEach((handler, key) => {
      if (key.startsWith('menuItem-')) {
        const index = key.split('-')[1];
        const menuItems = document.querySelectorAll('.menu-item a');
        if (menuItems[index]) {
          menuItems[index].removeEventListener('click', handler);
        }
      } else {
        document.removeEventListener(key, handler);
      }
    });
    this.handlers.clear();
  }
}

// Initialize
const activityMonitor = new ActivityMonitor();

class HistoryFilters {
  constructor() {
    this.historyFilter = document.getElementById('historyFilter');
    this.actionTypeFilter = document.getElementById('actionTypeFilter');
    this.rows = document.querySelectorAll('#sessionsContainer tbody tr');
    
    if (!this.validateElements()) return;
    
    this.setupEventListeners();
    this.applyFilters(); // Apply initial filters
  }

  validateElements() {
    if (!this.historyFilter || !this.actionTypeFilter) {
      console.warn('Filter elements not found');
      return false;
    }
    
    if (this.rows.length === 0) {
      console.warn('No table rows found for filtering');
      return false;
    }
    
    return true;
  }

  setupEventListeners() {
    const throttledApplyFilters = this.throttle(() => this.applyFilters(), 100);
    
    this.historyFilter.addEventListener('change', throttledApplyFilters);
    this.actionTypeFilter.addEventListener('change', throttledApplyFilters);
    
    // Cleanup reference
    this.cleanup = () => {
      this.historyFilter.removeEventListener('change', throttledApplyFilters);
      this.actionTypeFilter.removeEventListener('change', throttledApplyFilters);
    };
  }

  // Throttle function for performance
  throttle(func, limit) {
    let inThrottle;
    return function(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  parseDate(dateString) {
    if (!dateString || dateString.trim() === '') return null;
    
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? null : date;
  }

  getStartDateForFilter(timeFilter, now) {
    switch(timeFilter) {
      case 'month':
        return new Date(now.getFullYear(), now.getMonth(), 1);
      case '3months':
        return new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
      case 'year':
        return new Date(now.getFullYear(), 0, 1);
      default:
        return null;
    }
  }

  shouldShowByTime(row, timeFilter, now) {
    if (timeFilter === 'all') return true;
    
    try {
      const actionDateText = row.cells[6]?.textContent?.trim();
      if (!actionDateText) return false;
      
      const actionDate = this.parseDate(actionDateText);
      if (!actionDate) return false;
      
      const startDate = this.getStartDateForFilter(timeFilter, now);
      return !startDate || actionDate >= startDate;
    } catch (error) {
      console.warn('Error processing time filter for row:', error);
      return false;
    }
  }

  shouldShowByAction(row, actionFilter) {
    if (actionFilter === 'all') return true;
    
    try {
      const actionType = row.cells[7]?.textContent?.trim().toLowerCase();
      return actionType === actionFilter.toLowerCase();
    } catch (error) {
      console.warn('Error processing action filter for row:', error);
      return false;
    }
  }

  updateNoResultsMessage(visibleCount, table) {
    let noResultsMsg = table.querySelector('.no-results-message');
    
    if (visibleCount === 0 && !noResultsMsg) {
      noResultsMsg = document.createElement('tr');
      noResultsMsg.className = 'no-results-message';
      noResultsMsg.innerHTML = `
        <td colspan="8" style="text-align: center; padding: 40px; color: var(--gray);">
          <i class="fas fa-search" style="font-size: 24px; margin-bottom: 10px; display: block;"></i>
          <h4>No matching sessions found</h4>
          <p>Try adjusting your filters</p>
        </td>
      `;
      table.querySelector('tbody').appendChild(noResultsMsg);
    } else if (visibleCount > 0 && noResultsMsg) {
      noResultsMsg.remove();
    }
  }

  applyFilters() {
    try {
      const timeFilter = this.historyFilter.value;
      const actionFilter = this.actionTypeFilter.value;
      const now = new Date();
      
      let visibleCount = 0;
      const table = document.querySelector('#sessionsContainer table');
      
      this.rows.forEach(row => {
        const showByTime = this.shouldShowByTime(row, timeFilter, now);
        const showByAction = this.shouldShowByAction(row, actionFilter);
        const showRow = showByTime && showByAction;
        
        row.style.display = showRow ? '' : 'none';
        if (showRow) visibleCount++;
      });
      
      this.updateNoResultsMessage(visibleCount, table);
      
    } catch (error) {
      console.error('Error applying filters:', error);
    }
  }
}

// Initialize filters
const historyFilters = new HistoryFilters();

