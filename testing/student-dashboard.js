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

// Initialize Firebase with error handling
try {
  firebase.initializeApp(firebaseConfig);
} catch (error) {
  console.error('Firebase initialization failed:', error);
}

// Initialize Firebase services with null checks
const auth = firebase.auth?.() || null;
const db = firebase.firestore?.() || null;

// Constants
const SESSION_STATUS = {
  COMPLETED: 'completed',
  PENDING: 'pending', 
  CANCELLED: 'cancelled'
};

const ACTION_TYPES = {
  SCHEDULED: 'scheduled',
  CANCELLED: 'cancelled',
  COMPLETED: 'completed'
};

const TIME_FILTERS = {
  ALL: 'all',
  MONTH: 'month',
  THREE_MONTHS: '3months',
  YEAR: 'year'
};

/* ------------------------------
   Session History Rendering
--------------------------------*/

/**
 * Displays tutoring sessions in a table with error handling and performance optimizations
 * @param {firebase.firestore.QuerySnapshot} snapshot - Firestore query snapshot
 */
function appendSessionHistory(snapshot) {
  const container = document.getElementById('sessionsContainer');
  
  if (!container) {
    console.error('Sessions container not found');
    return;
  }
  
  // Clear previous content and show loading state
  container.innerHTML = '<tr><td colspan="8">Loading sessions...</td></tr>';
  
  if (!snapshot) {
    container.innerHTML = '<tr><td colspan="8">Error loading data</td></tr>';
    return;
  }
  
  if (snapshot.empty) {
    container.innerHTML = '<tr><td colspan="8">No sessions found</td></tr>';
    return;
  }
  
  try {
    const fragment = document.createDocumentFragment();
    let validSessionCount = 0;
    
    snapshot.forEach(doc => {
      if (!doc.exists) return;
      
      const session = doc.data();
      if (isValidSession(session)) {
        const row = createSessionRow(session);
        if (row) {
          fragment.appendChild(row);
          validSessionCount++;
        }
      }
    });
    
    if (validSessionCount === 0) {
      container.innerHTML = '<tr><td colspan="8">No valid sessions found</td></tr>';
      return;
    }
    
    // Efficient batch update
    container.innerHTML = '';
    container.appendChild(fragment);
    
    // Refresh filters if they exist
    if (window.historyFilters) {
      window.historyFilters.refresh();
    }
    
  } catch (error) {
    console.error('Error rendering sessions:', error);
    container.innerHTML = '<tr><td colspan="8">Error displaying sessions</td></tr>';
  }
}

/**
 * XSS protection utility function
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
function escapeHtml(str) {
  if (str == null) return '';
  
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}

/**
 * Creates a table row for a session
 * @param {Object} session - Session data
 * @returns {HTMLTableRowElement} Table row element
 */
function createSessionRow(session) {
  try {
    const row = document.createElement('tr');
    const sessionDate = session.date.toDate();
    
    // Format dates with fallbacks
    const formattedDate = sessionDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
    
    const formattedTime = sessionDate.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
    
    const { actionTime, actionType } = getActionTimestamp(session);
    const actionDate = actionTime.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
    
    const actionTimeFormatted = actionTime.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
    
    // Store raw data for filtering
    row.dataset.date = actionTime.toISOString();
    row.dataset.actionType = actionType.toLowerCase();
    row.dataset.status = (session.status || '').toLowerCase();
    
    row.innerHTML = `
      <td>${escapeHtml(formattedDate)}</td>
      <td>${escapeHtml(formattedTime)}</td>
      <td>${escapeHtml(session.tutorName || 'Unknown')}</td>
      <td>${escapeHtml(session.subject || 'No subject')}</td>
      <td>${escapeHtml((session.duration || '1') + ' hours')}</td>
      <td>
        <span class="status-badge ${getStatusClass(session.status)}">
          ${escapeHtml(session.status || 'unknown')}
        </span>
      </td>
      <td class="timestamp-cell">
        <div>${escapeHtml(actionDate)}</div>
        <div class="timestamp-time">${escapeHtml(actionTimeFormatted)}</div>
      </td>
      <td>
        <span class="status-badge ${getActionTypeClass(actionType)}">
          ${escapeHtml(actionType)}
        </span>
      </td>
    `;
    
    return row;
  } catch (error) {
    console.error('Error creating session row:', error, session);
    return null;
  }
}

/**
 * Validates session data structure
 * @param {Object} session - Session data to validate
 * @returns {boolean} True if valid
 */
function isValidSession(session) {
  return session && 
         session.date && 
         typeof session.date.toDate === 'function' &&
         session.tutorName !== undefined;
}

/* ------------------------------
   Activity Monitor (Inactivity logout)
--------------------------------*/
class ActivityMonitor {
  constructor(timeoutMs = 2 * 60 * 60 * 1000) { // default 2 hours
    this.timeoutMs = timeoutMs;
    this.timer = null;
    this.handlers = new Map();
    this.isActive = true;
    
    this.setupActivityListeners();
    this.resetInactivityTimer();
  }

  /**
   * Sets up activity event listeners
   */
  setupActivityListeners() {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    events.forEach(event => {
      const handler = () => this.handleActivity();
      document.addEventListener(event, handler, { passive: true });
      this.handlers.set(event, handler);
    });

    // Section navigation listeners
    const menuItems = document.querySelectorAll('.menu-item a');
    menuItems.forEach((item, index) => {
      const handler = () => this.handleActivity();
      item.addEventListener('click', handler);
      this.handlers.set(`menuItem-${index}`, handler);
    });
  }

  /**
   * Handles user activity
   */
  handleActivity() {
    if (!this.isActive) return;
    this.resetInactivityTimer();
  }

  /**
   * Resets the inactivity timer
   */
  resetInactivityTimer() {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.logoutDueToInactivity(), this.timeoutMs);
  }

  /**
   * Handles logout due to inactivity
   */
  async logoutDueToInactivity() {
    if (!this.isActive) return;
    
    this.isActive = false;
    
    try {
      // Show gentle notification instead of alert
      this.showLogoutNotification();
      
      // Small delay to let user see the notification
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (auth) {
        await auth.signOut();
      }
      
      window.location.href = 'student-login.html';
    } catch (error) {
      console.error('Logout error:', error);
      window.location.href = 'student-login.html';
    }
  }

  /**
   * Shows a user-friendly logout notification
   */
  showLogoutNotification() {
    // Create a non-intrusive notification
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #ff6b6b;
      color: white;
      padding: 12px 20px;
      border-radius: 4px;
      z-index: 10000;
      font-family: inherit;
    `;
    notification.textContent = 'Session expired due to inactivity. Redirecting to login...';
    
    document.body.appendChild(notification);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 3000);
  }

  /**
   * Pauses the activity monitor (useful during loading states)
   */
  pause() {
    this.isActive = false;
    clearTimeout(this.timer);
  }

  /**
   * Resumes the activity monitor
   */
  resume() {
    this.isActive = true;
    this.resetInactivityTimer();
  }

  /**
   * Cleans up event listeners and timers
   */
  cleanup() {
    this.isActive = false;
    clearTimeout(this.timer);
    
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

/* ------------------------------
   History Filters
--------------------------------*/
class HistoryFilters {
  constructor() {
    this.historyFilter = document.getElementById('historyFilter');
    this.actionTypeFilter = document.getElementById('actionTypeFilter');
    this.isInitialized = false;
    
    this.init();
  }

  /**
   * Initializes the filter system
   */
  init() {
    if (!this.validateElements()) {
      console.warn('History filters: Required elements not found');
      return;
    }
    
    this.setupEventListeners();
    this.applyFilters();
    this.isInitialized = true;
    
    console.log('History filters initialized successfully');
  }

  /**
   * Validates required DOM elements
   */
  validateElements() {
    return !!(this.historyFilter && this.actionTypeFilter);
  }

  /**
   * Sets up event listeners with debouncing
   */
  setupEventListeners() {
    const debouncedApplyFilters = this.debounce(() => this.applyFilters(), 150);
    
    this.historyFilter.addEventListener('change', debouncedApplyFilters);
    this.actionTypeFilter.addEventListener('change', debouncedApplyFilters);
    
    // Store cleanup references
    this.cleanupHandlers = {
      historyFilter: () => this.historyFilter.removeEventListener('change', debouncedApplyFilters),
      actionTypeFilter: () => this.actionTypeFilter.removeEventListener('change', debouncedApplyFilters)
    };
  }

  /**
   * Debounce function for performance
   */
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  /**
   * Gets start date for time-based filtering
   */
  getStartDateForFilter(timeFilter) {
    const now = new Date();
    
    switch(timeFilter) {
      case TIME_FILTERS.MONTH:
        return new Date(now.getFullYear(), now.getMonth(), 1);
      case TIME_FILTERS.THREE_MONTHS:
        return new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
      case TIME_FILTERS.YEAR:
        return new Date(now.getFullYear(), 0, 1);
      default:
        return null;
    }
  }

  /**
   * Applies current filters to the session list
   */
  applyFilters() {
    if (!this.isInitialized) return;
    
    try {
      const timeFilter = this.historyFilter.value;
      const actionFilter = this.actionTypeFilter.value.toLowerCase();
      const startDate = timeFilter !== TIME_FILTERS.ALL ? this.getStartDateForFilter(timeFilter) : null;
      
      const rows = document.querySelectorAll('#sessionsContainer tr[data-date]');
      let visibleCount = 0;
      
      rows.forEach(row => {
        const shouldShow = this.shouldShowRow(row, startDate, actionFilter);
        row.style.display = shouldShow ? '' : 'none';
        if (shouldShow) visibleCount++;
      });
      
      this.updateNoResultsMessage(visibleCount);
      
    } catch (error) {
      console.error('Error applying filters:', error);
    }
  }

  /**
   * Determines if a row should be shown based on filters
   */
  shouldShowRow(row, startDate, actionFilter) {
    // Time filter
    if (startDate) {
      const rowDate = new Date(row.dataset.date);
      if (rowDate < startDate) return false;
    }
    
    // Action type filter
    if (actionFilter !== TIME_FILTERS.ALL) {
      const rowActionType = row.dataset.actionType;
      if (rowActionType !== actionFilter) return false;
    }
    
    return true;
  }

  /**
   * Updates the no results message
   */
  updateNoResultsMessage(visibleCount) {
    const container = document.getElementById('sessionsContainer');
    if (!container) return;
    
    let noResultsMsg = container.querySelector('.no-results-message');
    
    if (visibleCount === 0 && !noResultsMsg) {
      noResultsMsg = document.createElement('tr');
      noResultsMsg.className = 'no-results-message';
      noResultsMsg.innerHTML = `
        <td colspan="8">
          <div class="no-results-content">
            <i class="fas fa-search"></i>
            <h4>No matching sessions found</h4>
            <p>Try adjusting your filters</p>
          </div>
        </td>
      `;
      container.appendChild(noResultsMsg);
    } else if (visibleCount > 0 && noResultsMsg) {
      noResultsMsg.remove();
    }
  }

  /**
   * Refreshes filters after content updates
   */
  refresh() {
    if (this.isInitialized) {
      this.applyFilters();
    }
  }

  /**
   * Cleans up event listeners
   */
  cleanup() {
    if (this.cleanupHandlers) {
      this.cleanupHandlers.historyFilter();
      this.cleanupHandlers.actionTypeFilter();
    }
    this.isInitialized = false;
  }
}

/* ------------------------------
   Helper Functions
--------------------------------*/

/**
 * Extracts action timestamp and type from session data
 */
function getActionTimestamp(session) {
  return {
    actionTime: session.date?.toDate() || new Date(),
    actionType: session.actionType || ACTION_TYPES.SCHEDULED
  };
}

/**
 * Gets CSS class for session status
 */
function getStatusClass(status) {
  const statusMap = {
    [SESSION_STATUS.COMPLETED]: 'status-completed',
    [SESSION_STATUS.PENDING]: 'status-pending',
    [SESSION_STATUS.CANCELLED]: 'status-cancelled'
  };
  
  return statusMap[status?.toLowerCase()] || 'status-unknown';
}

/**
 * Gets CSS class for action type
 */
function getActionTypeClass(actionType) {
  const actionMap = {
    [ACTION_TYPES.SCHEDULED]: 'action-scheduled',
    [ACTION_TYPES.CANCELLED]: 'action-cancelled',
    [ACTION_TYPES.COMPLETED]: 'action-completed'
  };
  
  return actionMap[actionType?.toLowerCase()] || 'action-unknown';
}

/* ------------------------------
   Initialization
--------------------------------*/

// Initialize components with error handling
let activityMonitor;
let historyFilters;

document.addEventListener('DOMContentLoaded', () => {
  try {
    activityMonitor = new ActivityMonitor();
    historyFilters = new HistoryFilters();
    
    // Make available globally for debugging
    window.activityMonitor = activityMonitor;
    window.historyFilters = historyFilters;
    
  } catch (error) {
    console.error('Initialization error:', error);
  }
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  if (activityMonitor) {
    activityMonitor.cleanup();
  }
  if (historyFilters) {
    historyFilters.cleanup();
  }
});

// Constants for consistency
const FALLBACK_MESSAGES = {
    NOT_SPECIFIED: 'Not specified',
    ERROR: 'Error retrieving time'
};

/**
 * Updates upcoming sessions count with safety checks
 */
function updateUpcomingSessionsCount(count) {
    const countElement = document.getElementById('upcomingSessionsCount');
    if (!countElement) {
        console.warn('Upcoming sessions count element not found');
        return false;
    }
    
    countElement.textContent = count;
    return true;
}

/**
 * Fetches proposed reschedule time with comprehensive error handling
 */
async function getProposedTime(bookingId) {
    if (!isValidBookingId(bookingId)) {
        return FALLBACK_MESSAGES.NOT_SPECIFIED;
    }

    try {
        const proposedTime = await fetchProposedTimeFromFirestore(bookingId);
        return proposedTime || FALLBACK_MESSAGES.NOT_SPECIFIED;
    } catch (error) {
        console.error(`Error getting proposed time for booking ${bookingId}:`, error);
        return FALLBACK_MESSAGES.ERROR;
    }
}

// Helper functions
function isValidBookingId(bookingId) {
    return bookingId && typeof bookingId === 'string' && bookingId.length > 0;
}

async function fetchProposedTimeFromFirestore(bookingId) {
    const snapshot = await db.collection('rescheduleRequests')
        .where('sessionId', '==', bookingId)
        .where('status', '==', 'pending')
        .limit(1)
        .get();

    if (snapshot.empty) return null;

    const request = snapshot.docs[0].data();
    return formatProposedTime(request.requestedDate);
}

function formatProposedTime(timestamp) {
    if (!timestamp || typeof timestamp.toDate !== 'function') return null;
    
    const date = timestamp.toDate();
    return isValidDate(date) ? date.toLocaleString() : null;
}

function isValidDate(date) {
    return date instanceof Date && !isNaN(date.getTime());
}

const RESCHEDULE_MESSAGES = {
    NO_REASON: 'No reason provided',
    ERROR: 'Error retrieving reason'
};

async function getRescheduleReason(bookingId) {
    if (!bookingId || typeof bookingId !== 'string') {
        return RESCHEDULE_MESSAGES.NO_REASON;
    }

    try {
        const snapshot = await db.collection('rescheduleRequests')
            .where('sessionId', '==', bookingId)
            .where('status', '==', 'pending')
            .limit(1)
            .get();
            
        return snapshot.empty ? 
            RESCHEDULE_MESSAGES.NO_REASON : 
            (snapshot.docs[0].data().reason || RESCHEDULE_MESSAGES.NO_REASON);
            
    } catch (error) {
        console.error('Error getting reschedule reason:', error);
        return RESCHEDULE_MESSAGES.ERROR;
    }
}

// Constants for consistency
const BOOKING_STATUS = {
    CONFIRMED: 'confirmed',
    RESCHEDULE_REQUESTED: 'reschedule_requested',
    PENDING: 'pending'
};

const STATUS_CLASSES = {
    [BOOKING_STATUS.CONFIRMED]: 'status-verified',
    [BOOKING_STATUS.RESCHEDULE_REQUESTED]: 'status-reschedule-requested',
    [BOOKING_STATUS.PENDING]: 'status-pending'
};

const STATUS_TEXTS = {
    [BOOKING_STATUS.CONFIRMED]: 'Confirmed',
    [BOOKING_STATUS.RESCHEDULE_REQUESTED]: 'Reschedule Requested',
    [BOOKING_STATUS.PENDING]: 'Pending'
};

/**
 * Loads and displays bookings with proper error handling and XSS protection
 * @param {firebase.firestore.QuerySnapshot} snapshot - Firestore query snapshot
 */
async function loadBookings(snapshot) {
    const container = document.getElementById('bookingsContainer');
    
    if (!container) {
        console.error('Bookings container not found');
        return;
    }
    
    // Show loading state
    container.innerHTML = '<div class="loading">Loading bookings...</div>';
    
    try {
        if (!snapshot) {
            throw new Error('No snapshot provided');
        }
        
        if (snapshot.empty) {
            container.innerHTML = '<p class="no-bookings">You have no upcoming bookings.</p>';
            return;
        }
        
        const bookings = await processBookings(snapshot);
        renderBookings(container, bookings);
        setupBookingFilter();
        
    } catch (error) {
        console.error('Error loading bookings:', error);
        container.innerHTML = '<p class="error">Error loading bookings. Please try again.</p>';
    }
}

/**
 * Processes booking data and fetches additional reschedule info
 */
async function processBookings(snapshot) {
    const bookings = [];
    const reschedulePromises = [];
    
    snapshot.forEach(doc => {
        const booking = {
            id: doc.id,
            ...doc.data(),
            date: doc.data().date?.toDate?.(),
            hasRescheduleRequest: doc.data().status === BOOKING_STATUS.RESCHEDULE_REQUESTED
        };
        
        bookings.push(booking);
        
        if (booking.hasRescheduleRequest) {
            reschedulePromises.push(
                loadRescheduleData(booking.id).then(data => {
                    booking.rescheduleData = data;
                })
            );
        }
    });
    
    // Wait for all reschedule data to load
    await Promise.allSettled(reschedulePromises);
    return bookings;
}

/**
 * Renders bookings to the container efficiently
 */
function renderBookings(container, bookings) {
    const fragment = document.createDocumentFragment();
    
    bookings.forEach(booking => {
        const card = createBookingCard(booking);
        if (card) {
            fragment.appendChild(card);
        }
    });
    
    container.innerHTML = '';
    container.appendChild(fragment);
}

/**
 * Creates a booking card element with XSS protection
 */
function createBookingCard(booking) {
    try {
        const card = document.createElement('div');
        card.className = `session-card ${booking.hasRescheduleRequest ? 'reschedule-requested' : ''}`;
        card.id = `booking-${escapeHtml(booking.id)}`;
        
        const date = booking.date || new Date();
        const formattedDate = isValidDate(date) ? date.toLocaleDateString() : 'Invalid date';
        const formattedTime = isValidDate(date) ? date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Invalid time';
        
        const statusClass = STATUS_CLASSES[booking.status] || 'status-pending';
        const statusText = STATUS_TEXTS[booking.status] || 'Pending';
        
        card.innerHTML = `
            <div class="session-header">
                <div class="session-title">${escapeHtml(booking.subject || 'No subject')}</div>
                <div class="session-date">${escapeHtml(formattedDate)} at ${escapeHtml(formattedTime)}</div>
            </div>
            <div class="session-details">
                ${createSessionDetail('fa-user-tie', 'Tutor:', escapeHtml(booking.tutorName || 'Unknown'))}
                ${createSessionDetail('fa-clock', 'Duration:', `${escapeHtml(booking.duration || '1')} hours`)}
                ${createSessionDetail('fa-video', 'Type:', escapeHtml(booking.sessionType === 'in-person' ? 'In-Person' : 'Online'))}
                ${createSessionDetail('fa-hourglass-half', 'Status:', `<span class="status-badge ${statusClass}">${escapeHtml(statusText)}</span>`)}
                ${booking.hasRescheduleRequest ? createRescheduleDetails(booking) : ''}
            </div>
            <div class="session-actions">
                ${createActionButtons(booking)}
            </div>
        `;
        
        return card;
    } catch (error) {
        console.error('Error creating booking card:', error, booking);
        return null;
    }
}

/**
 * Creates session detail HTML
 */
function createSessionDetail(icon, label, value) {
    return `
        <div class="session-detail">
            <i class="fas ${icon}"></i>
            <span>${escapeHtml(label)} ${value}</span>
        </div>
    `;
}

/**
 * Creates reschedule details section
 */
function createRescheduleDetails(booking) {
    const proposedTime = booking.rescheduleData?.proposedTime || 'Loading...';
    const reason = booking.rescheduleData?.reason || 'Loading...';
    
    return `
        ${createSessionDetail('fa-info-circle', 'New Time Proposed:', `<span id="proposedTime-${escapeHtml(booking.id)}">${escapeHtml(proposedTime)}</span>`)}
        ${createSessionDetail('fa-comment', 'Reason:', `<span id="rescheduleReason-${escapeHtml(booking.id)}">${escapeHtml(reason)}</span>`)}
    `;
}

/**
 * Creates action buttons based on booking status
 */
function createActionButtons(booking) {
    const buttons = [];
    
    if (booking.status === BOOKING_STATUS.CONFIRMED) {
        buttons.push(`<button class="btn-primary" onclick="joinSession('${escapeHtml(booking.id)}')">Join Session</button>`);
    }
    
    if (booking.hasRescheduleRequest) {
        buttons.push(`
            <div class="reschedule-actions">
                <button class="btn-success" onclick="acceptReschedule('${escapeHtml(booking.id)}')">Accept New Time</button>
                <button class="btn-danger" onclick="declineReschedule('${escapeHtml(booking.id)}')">Decline</button>
            </div>
        `);
    }
    
    buttons.push(`<button class="btn-outline" onclick="cancelBooking('${escapeHtml(booking.id)}')">Cancel</button>`);
    
    return buttons.join('');
}

/**
 * XSS protection function
 */
function escapeHtml(str) {
    if (str == null) return '';
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
}

/**
 * Validates date object
 */
function isValidDate(date) {
    return date instanceof Date && !isNaN(date.getTime());
}

/**
 * Enhanced reschedule data loading
 */
async function loadRescheduleData(bookingId) {
    try {
        // Use your existing getProposedTime and getRescheduleReason functions
        const [proposedTime, reason] = await Promise.all([
            getProposedTime(bookingId),
            getRescheduleReason(bookingId)
        ]);
        
        return { proposedTime, reason };
    } catch (error) {
        console.error(`Error loading reschedule data for booking ${bookingId}:`, error);
        return { proposedTime: 'Error', reason: 'Error loading details' };
    }
}

// Accept reschedule request with enhanced features
async function acceptReschedule(bookingId) {
    // Validation
    if (!bookingId) {
        alert('Invalid booking ID');
        return;
    }
    
    // Confirmation
    if (!confirm('Are you sure you want to accept this reschedule request?')) {
        return;
    }
    
    try {
        // Show loading state
        showLoadingState(bookingId, true);
        
        const rescheduleQuery = await db.collection('rescheduleRequests')
            .where('sessionId', '==', bookingId)
            .where('status', '==', 'pending')
            .limit(1)
            .get();
            
        if (rescheduleQuery.empty) {
            alert('No pending reschedule request found for this booking.');
            return;
        }
        
        const rescheduleDoc = rescheduleQuery.docs[0];
        const rescheduleRequest = rescheduleDoc.data();
        const newDate = rescheduleRequest.requestedDate;
        const respondedAt = new Date();
        
        // Use batch write for atomic operation
        const batch = db.batch();
        
        // Update booking
        const bookingRef = db.collection('bookedSessions').doc(bookingId);
        batch.update(bookingRef, {
            date: newDate,
            status: 'confirmed',
            rescheduleStatus: 'accepted',
            rescheduleRespondedAt: respondedAt,
            lastUpdated: respondedAt
        });
        
        // Update reschedule request
        const rescheduleRef = db.collection('rescheduleRequests').doc(rescheduleDoc.id);
        batch.update(rescheduleRef, {
            status: 'accepted',
            respondedAt: respondedAt,
            acceptedAt: respondedAt
        });
        
        await batch.commit();
        
        // Update session history (non-critical)
        await updateSessionHistory(bookingId, newDate, rescheduleRequest.originalDate);
        
        // Show success
        showNotification('Reschedule accepted! Session updated successfully.', 'success');
        loadUserBookings(); // Refresh display
        
    } catch (error) {
        console.error('Error accepting reschedule:', error);
        showNotification('Failed to accept reschedule. Please try again.', 'error');
    } finally {
        showLoadingState(bookingId, false);
    }
}

// Decline reschedule request with enhanced features
async function declineReschedule(bookingId) {
    // Validation
    if (!bookingId || typeof bookingId !== 'string') {
        showNotification('Invalid booking ID', 'error');
        return;
    }
    
    // Get reason with validation
    const reason = await getDeclineReason();
    if (!reason) return; // User cancelled or invalid reason
    
    // Confirmation
    if (!confirm(`Decline this reschedule request?\nReason: ${reason}`)) {
        return;
    }
    
    try {
        showLoadingState(bookingId, true);
        
        const rescheduleQuery = await db.collection('rescheduleRequests')
            .where('sessionId', '==', bookingId)
            .where('status', '==', 'pending')
            .limit(1)
            .get();
            
        if (rescheduleQuery.empty) {
            showNotification('No pending reschedule request found.', 'warning');
            return;
        }
        
        // Atomic batch operation
        const batch = db.batch();
        const respondedAt = new Date();
        const rescheduleDoc = rescheduleQuery.docs[0];
        const rescheduleRequest = rescheduleDoc.data();
        
        // Update booking
        const bookingRef = db.collection('bookedSessions').doc(bookingId);
        batch.update(bookingRef, {
            status: 'confirmed',
            rescheduleStatus: 'declined',
            rescheduleDeclineReason: reason,
            rescheduleRespondedAt: respondedAt,
            rescheduleTimeline: {
                ...rescheduleRequest.rescheduleTimeline,
                respondedAt: respondedAt,
                declinedAt: respondedAt,
                declineReason: reason
            },
            lastUpdated: respondedAt
        });
        
        // Update reschedule request
        const rescheduleRef = db.collection('rescheduleRequests').doc(rescheduleDoc.id);
        batch.update(rescheduleRef, {
            status: 'declined',
            respondedAt: respondedAt,
            declinedAt: respondedAt,
            declineReason: reason,
            studentRespondedAt: respondedAt
        });
        
        await batch.commit();
        
        // Send notification to tutor
        await sendRescheduleResponseNotification(bookingId, 'declined', reason);
        
        showNotification('Reschedule request declined successfully.', 'success');
        loadUserBookings();
        
    } catch (error) {
        console.error('Error declining reschedule:', error);
        showNotification('Failed to decline reschedule. Please try again.', 'error');
    } finally {
        showLoadingState(bookingId, false);
    }
}

// Helper function to get decline reason with validation
async function getDeclineReason() {
    while (true) {
        const reason = prompt('Please provide a reason for declining the reschedule request:');
        
        if (reason === null) {
            return null; // User cancelled
        }
        
        if (reason && reason.trim().length >= 5) {
            return reason.trim();
        }
        
        alert('Please provide a reason with at least 5 characters.');
    }
}

// Loading state management
function showLoadingState(bookingId, isLoading) {
    const button = document.querySelector(`[onclick="declineReschedule('${bookingId}')"]`);
    if (button) {
        button.disabled = isLoading;
        button.innerHTML = isLoading ? 
            '<i class="fas fa-spinner fa-spin"></i> Declining...' : 
            'Decline';
    }
}

/**
 * Loads and displays user bookings from Firestore
 * @param {string} userId - Optional user ID (defaults to current user)
 */
async function loadUserBookings(userId = null) {
    try {
        // Get current user if no userId provided
        const currentUser = auth?.currentUser;
        if (!currentUser && !userId) {
            console.error('No user logged in');
            showNotification('Please log in to view bookings', 'error');
            return;
        }

        const targetUserId = userId || currentUser?.uid;
        const container = document.getElementById('bookingsContainer');
        
        if (!container) {
            console.error('Bookings container not found');
            return;
        }

        // Show loading state
        container.innerHTML = `
            <div class="loading-state">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Loading your bookings...</p>
            </div>
        `;

        // Query upcoming bookings
        const now = new Date();
        const bookingsQuery = db.collection('bookedSessions')
            .where('studentId', '==', targetUserId)
            .where('date', '>=', now)
            .orderBy('date', 'asc')
            .limit(50);

        const snapshot = await bookingsQuery.get();
        
        // Use your existing loadBookings function
        await loadBookings(snapshot);
        
        // Update upcoming sessions count
        updateUpcomingSessionsCount(snapshot.size);
        
        console.log(`Loaded ${snapshot.size} upcoming bookings`);
        
    } catch (error) {
        console.error('Error loading user bookings:', error);
        
        const container = document.getElementById('bookingsContainer');
        if (container) {
            container.innerHTML = `
                <div class="error-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h4>Error Loading Bookings</h4>
                    <p>${error.message}</p>
                    <button onclick="loadUserBookings()" class="btn-primary">
                        <i class="fas fa-redo"></i> Try Again
                    </button>
                </div>
            `;
        }
        
        showNotification('Failed to load bookings', 'error');
    }
}

/**
 * Real-time listener for booking updates
 */
function setupBookingsRealTimeListener(userId = null) {
    try {
        const currentUser = auth?.currentUser;
        const targetUserId = userId || currentUser?.uid;
        
        if (!targetUserId) {
            console.warn('No user ID for real-time listener');
            return;
        }

        const now = new Date();
        
        // Listen for real-time updates
        return db.collection('bookedSessions')
            .where('studentId', '==', targetUserId)
            .where('date', '>=', now)
            .orderBy('date', 'asc')
            .onSnapshot({
                next: (snapshot) => {
                    console.log('Real-time booking update received');
                    loadBookings(snapshot); // Reuse your existing function
                    updateUpcomingSessionsCount(snapshot.size);
                },
                error: (error) => {
                    console.error('Real-time listener error:', error);
                    // Don't show error to user - it might be temporary
                }
            });
            
    } catch (error) {
        console.error('Error setting up real-time listener:', error);
    }
}

/**
 * Enhanced version with filtering options
 */
async function loadUserBookingsWithFilters(options = {}) {
    const defaultOptions = {
        userId: null,
        status: null, // 'confirmed', 'pending', etc.
        limit: 50,
        upcomingOnly: true
    };
    
    const config = { ...defaultOptions, ...options };
    
    try {
        const currentUser = auth?.currentUser;
        const targetUserId = config.userId || currentUser?.uid;
        
        if (!targetUserId) {
            throw new Error('User not authenticated');
        }

        let query = db.collection('bookedSessions')
            .where('studentId', '==', targetUserId);

        // Apply filters
        if (config.upcomingOnly) {
            query = query.where('date', '>=', new Date());
        }
        
        if (config.status) {
            query = query.where('status', '==', config.status);
        }

        query = query.orderBy('date', config.upcomingOnly ? 'asc' : 'desc')
                    .limit(config.limit);

        const snapshot = await query.get();
        await loadBookings(snapshot);
        
        return snapshot;
        
    } catch (error) {
        console.error('Error loading filtered bookings:', error);
        throw error;
    }
}

/**
 * Initialize bookings system when page loads
 */
function initializeBookingsSystem() {
    // Load initial bookings
    auth?.onAuthStateChanged((user) => {
        if (user) {
            loadUserBookings(user.uid);
            setupBookingsRealTimeListener(user.uid);
        } else {
            // User logged out - clear bookings
            const container = document.getElementById('bookingsContainer');
            if (container) {
                container.innerHTML = '<p>Please log in to view your bookings</p>';
            }
            updateUpcomingSessionsCount(0);
        }
    });
}

// Add to your existing DOMContentLoaded event listener
document.addEventListener('DOMContentLoaded', () => {
    try {
        activityMonitor = new ActivityMonitor();
        historyFilters = new HistoryFilters();
        
        // Initialize bookings system
        initializeBookingsSystem();
        
        window.activityMonitor = activityMonitor;
        window.historyFilters = historyFilters;
        
    } catch (error) {
        console.error('Initialization error:', error);
    }
});

// Cleanup real-time listener when needed
let bookingsUnsubscribe = null;

function cleanupBookingsListener() {
    if (bookingsUnsubscribe) {
        bookingsUnsubscribe();
        bookingsUnsubscribe = null;
    }
}

// Update your beforeunload handler
window.addEventListener('beforeunload', () => {
    if (activityMonitor) activityMonitor.cleanup();
    if (historyFilters) historyFilters.cleanup();
    cleanupBookingsListener();
});

