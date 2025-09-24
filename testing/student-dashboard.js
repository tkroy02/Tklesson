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

// Global variables
let sessionsDataLoaded = false;
let tutorsLoaded = false;
let bookingsLoaded = false;
let sessionsLoaded = false;
let currentUser = null;
let userData = null;
let inactivityTimer;
let lastVisible = null;
let isFirstLoad = true;

function resetInactivityTimer() {
  clearTimeout(inactivityTimer);
  inactivityTimer = setTimeout(logoutDueToInactivity, 2 * 60 * 60 * 1000);
}

function logoutDueToInactivity() {
  alert('You have been logged out due to inactivity.');
  auth.signOut().then(() => {
    window.location.href = 'student-login.html';
  });
}

function setupActivityListeners() {
  const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
  events.forEach(event => {
    document.addEventListener(event, resetInactivityTimer);
  });

  const menuItems = document.querySelectorAll('.menu-item a');
  menuItems.forEach(item => {
    item.addEventListener('click', resetInactivityTimer);
  });
}

function getStatusClass(status) {
  switch(status) {
    case 'confirmed':
    case 'completed':
      return 'status-verified';
    case 'pending':
      return 'status-pending';
    case 'cancelled':
      return 'status-cancelled';
    case 'reschedule_requested':
      return 'status-reschedule-requested';
    default:
      return 'status-pending';
  }
}

function getActionTimestamp(session) {
  let actionTime = new Date();
  let actionType = 'Unknown';
  
  if (session.cancelledAt) {
    actionTime = session.cancelledAt.toDate();
    if (session.cancelledBy === 'student') {
      actionType = 'Student Cancelled';
    } else if (session.cancelledBy === 'tutor') {
      actionType = 'Tutor Cancelled';
    } else {
      actionType = 'Cancelled';
    }
  } else if (session.completedAt) {
    actionTime = session.completedAt.toDate();
    actionType = 'Completed';
  } else if (session.rescheduleAcceptedAt) {
    actionTime = session.rescheduleAcceptedAt.toDate();
    actionType = 'Rescheduled';
  } else if (session.rescheduleRequestedAt) {
    actionTime = session.rescheduleRequestedAt.toDate();
    if (session.rescheduleRequestedBy === 'tutor') {
      actionType = 'Tutor Reschedule Request';
    } else if (session.rescheduleRequestedBy === 'student') {
      actionType = 'Student Reschedule Request';
    } else {
      actionType = 'Reschedule Requested';
    }
  } else if (session.confirmedAt) {
    actionTime = session.confirmedAt.toDate();
    if (session.autoConfirmed) {
      actionType = 'Auto-Confirmed';
    } else {
      actionType = 'Tutor Confirmed';
    }
  } else if (session.bookedAt) {
    actionTime = session.bookedAt.toDate();
    actionType = 'Student Booked';
  } else {
    actionTime = session.date.toDate();
    actionType = 'Scheduled';
  }
  
  return { actionTime, actionType };
}

function getActionTypeClass(actionType) {
  switch(actionType.toLowerCase()) {
    case 'student booked':
    case 'tutor confirmed':
    case 'auto-confirmed':
    case 'completed':
      return 'status-verified';
    case 'student cancelled':
    case 'tutor cancelled':
    case 'cancelled':
      return 'status-pending';
    case 'tutor reschedule request':
    case 'student reschedule request':
    case 'reschedule requested':
    case 'rescheduled':
      return 'status-warning';
    default:
      return 'status-pending';
  }
}

function loadSessionHistory(snapshot) {
  const container = document.getElementById('sessionsContainer');
  
  if (snapshot.empty) {
    container.innerHTML = '<div class="empty-state"><i class="fas fa-history"></i><h3>No Session History</h3><p>You haven\'t had any sessions yet.</p></div>';
    return;
  }
  
  let html = `
    <table class="sessions-table">
      <thead>
        <tr>
          <th>Session Date</th>
          <th>Session Time</th>
          <th>Tutor</th>
          <th>Subject</th>
          <th>Duration</th>
          <th>Status</th>
          <th>Action Date</th>
          <th>Action Type</th>
        </tr>
      </thead>
      <tbody>
  `;
  
  snapshot.forEach(doc => {
    const session = doc.data();
    const sessionDate = session.date.toDate();
    const formattedDate = sessionDate.toLocaleDateString();
    const formattedTime = sessionDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    
    const { actionTime, actionType } = getActionTimestamp(session);
    const actionDate = actionTime.toLocaleDateString();
    const actionTimeFormatted = actionTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    
    html += `
      <tr>
        <td>${formattedDate}</td>
        <td>${formattedTime}</td>
        <td>${session.tutorName || 'Unknown'}</td>
        <td>${session.subject || 'No subject'}</td>
        <td>${session.duration || '1'} hours</td>
        <td><span class="status-badge ${getStatusClass(session.status)}">${session.status || 'unknown'}</span></td>
        <td class="timestamp-cell">
          <div>${actionDate}</div>
          <div style="font-size: 11px; color: var(--gray-light);">${actionTimeFormatted}</div>
        </td>
        <td><span class="status-badge ${getActionTypeClass(actionType)}">${actionType}</span></td>
      </tr>
    `;
  });
  
  html += '</tbody></table>';
  container.innerHTML = html;
  setupHistoryFilters();
}

function appendSessionHistory(snapshot) {
  const container = document.querySelector('#sessionsContainer tbody');
  
  snapshot.forEach(doc => {
    const session = doc.data();
    const sessionDate = session.date.toDate();
    const formattedDate = sessionDate.toLocaleDateString();
    const formattedTime = sessionDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    
    const { actionTime, actionType } = getActionTimestamp(session);
    const actionDate = actionTime.toLocaleDateString();
    const actionTimeFormatted = actionTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${formattedDate}</td>
      <td>${formattedTime}</td>
      <td>${session.tutorName || 'Unknown'}</td>
      <td>${session.subject || 'No subject'}</td>
      <td>${session.duration || '1'} hours</td>
      <td><span class="status-badge ${getStatusClass(session.status)}">${session.status || 'unknown'}</span></td>
      <td class="timestamp-cell">
        <div>${actionDate}</div>
        <div style="font-size: 11px; color: var(--gray-light);">${actionTimeFormatted}</div>
      </td>
      <td><span class="status-badge ${getActionTypeClass(actionType)}">${actionType}</span></td>
    `;
    container.appendChild(row);
  });
  
  setupHistoryFilters();
}

function setupHistoryFilters() {
  const historyFilter = document.getElementById('historyFilter');
  const actionTypeFilter = document.getElementById('actionTypeFilter');
  
  if (!historyFilter || !actionTypeFilter) return;
  
  const applyFilters = () => {
    const timeFilter = historyFilter.value;
    const actionFilter = actionTypeFilter.value;
    const rows = document.querySelectorAll('#sessionsContainer tbody tr');
    
    let visibleCount = 0;
    const now = new Date();
    
    rows.forEach(row => {
      let showRow = true;
      
      if (timeFilter !== 'all') {
        const actionDateText = row.cells[6].textContent.trim();
        const actionDate = new Date(actionDateText);
        
        if (!isNaN(actionDate.getTime())) {
          let startDate;
          
          switch(timeFilter) {
            case 'month':
              startDate = new Date(now.getFullYear(), now.getMonth(), 1);
              break;
            case '3months':
              startDate = new Date(now);
              startDate.setMonth(now.getMonth() - 3);
              break;
            case 'year':
              startDate = new Date(now.getFullYear(), 0, 1);
              break;
            default:
              startDate = null;
          }
          
          if (startDate && actionDate < startDate) {
            showRow = false;
          }
        }
      }
      
      if (actionFilter !== 'all' && showRow) {
        const actionType = row.cells[7].textContent.trim().toLowerCase();
        showRow = actionType === actionFilter.toLowerCase();
      }
      
      row.style.display = showRow ? '' : 'none';
      if (showRow) visibleCount++;
    });
    
    const table = document.querySelector('#sessionsContainer table');
    let noResultsMsg = table.querySelector('.no-results-message');
    
    if (visibleCount === 0) {
      if (!noResultsMsg) {
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
      }
    } else if (noResultsMsg) {
      noResultsMsg.remove();
    }
  };
  
  historyFilter.addEventListener('change', applyFilters);
  actionTypeFilter.addEventListener('change', applyFilters);
}

async function loadRescheduleData(bookingId) {
  try {
    const rescheduleQuery = await db.collection('rescheduleRequests')
      .where('sessionId', '==', bookingId)
      .where('status', '==', 'pending')
      .get();
      
    if (!rescheduleQuery.empty) {
      const request = rescheduleQuery.docs[0].data();
      const newDate = request.requestedDate.toDate();
      const proposedTime = newDate.toLocaleString();
      const reason = request.reason || 'No reason provided';
      
      const proposedTimeElement = document.getElementById(`proposedTime-${bookingId}`);
      const reasonElement = document.getElementById(`rescheduleReason-${bookingId}`);
      
      if (proposedTimeElement) proposedTimeElement.textContent = proposedTime;
      if (reasonElement) reasonElement.textContent = reason;
    } else {
      const proposedTimeElement = document.getElementById(`proposedTime-${bookingId}`);
      const reasonElement = document.getElementById(`rescheduleReason-${bookingId}`);
      
      if (proposedTimeElement) proposedTimeElement.textContent = 'Not specified';
      if (reasonElement) reasonElement.textContent = 'No reason provided';
    }
  } catch (error) {
    console.error('Error loading reschedule data:', error);
    const proposedTimeElement = document.getElementById(`proposedTime-${bookingId}`);
    const reasonElement = document.getElementById(`rescheduleReason-${bookingId}`);
    
    if (proposedTimeElement) proposedTimeElement.textContent = 'Error loading';
    if (reasonElement) reasonElement.textContent = 'Error loading';
  }
}

function loadBookings(snapshot) {
  const container = document.getElementById('bookingsContainer');
  
  if (snapshot.empty) {
    container.innerHTML = '<div class="empty-state"><i class="fas fa-calendar-times"></i><h3>No Upcoming Bookings</h3><p>You have no upcoming sessions scheduled.</p></div>';
    return;
  }
  
  let html = '';
  const bookingPromises = [];
  
  snapshot.forEach(doc => {
    const booking = doc.data();
    const date = booking.date.toDate();
    const formattedDate = date.toLocaleDateString();
    const formattedTime = date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    
    const hasRescheduleRequest = booking.status === 'reschedule_requested';
    const statusClass = booking.status === 'confirmed' ? 'status-verified' : 
                       hasRescheduleRequest ? 'status-reschedule-requested' : 'status-pending';
    const statusText = booking.status === 'confirmed' ? 'Confirmed' : 
                      hasRescheduleRequest ? 'Reschedule Requested' : 'Pending';

    html += `
      <div class="session-card ${hasRescheduleRequest ? 'reschedule-requested' : ''}" id="booking-${doc.id}">
        <div class="session-header">
          <div class="session-title">${booking.subject || 'No subject'}</div>
          <div class="session-date">${formattedDate} at ${formattedTime}</div>
        </div>
        <div class="session-details">
          <div class="session-detail">
            <i class="fas fa-user-tie"></i>
            <span>Tutor: ${booking.tutorName || 'Unknown'}</span>
          </div>
          <div class="session-detail">
            <i class="fas fa-clock"></i>
            <span>Duration: ${booking.duration || '1'} hours</span>
          </div>
          <div class="session-detail">
            <i class="fas fa-video"></i>
            <span>Type: ${booking.sessionType === 'in-person' ? 'In-Person' : 'Online'}</span>
          </div>
          <div class="session-detail">
            <i class="fas fa-hourglass-half"></i>
            <span>Status: <span class="status-badge ${statusClass}">${statusText}</span></span>
          </div>
          ${hasRescheduleRequest ? `
          <div class="session-detail">
            <i class="fas fa-info-circle"></i>
            <span>New Time Proposed: <span id="proposedTime-${doc.id}">Loading...</span></span>
          </div>
          <div class="session-detail">
            <i class="fas fa-comment"></i>
            <span>Reason: <span id="rescheduleReason-${doc.id}">Loading...</span></span>
          </div>
          ` : ''}
        </div>
        <div class="session-actions">
          ${booking.status === 'confirmed' ? 
            `<button class="btn-primary" onclick="joinSession('${doc.id}')">Join Session</button>` : 
            ''}
          ${hasRescheduleRequest ? `
          <div class="reschedule-actions">
            <button class="btn-success" onclick="acceptReschedule('${doc.id}')">Accept New Time</button>
            <button class="btn-danger" onclick="declineReschedule('${doc.id}')">Decline</button>
          </div>
          ` : ''}
          <button class="btn-outline" onclick="cancelBooking('${doc.id}')">Cancel</button>
        </div>
      </div>
    `;
    
    if (hasRescheduleRequest) {
      bookingPromises.push(loadRescheduleData(doc.id));
    }
  });

  container.innerHTML = html;
  
  Promise.all(bookingPromises).then(() => {
    console.log('All reschedule data loaded');
  }).catch(error => {
    console.error('Error loading reschedule data:', error);
  });
  
  setupBookingFilter();
}

async function acceptReschedule(bookingId) {
  try {
    const rescheduleQuery = await db.collection('rescheduleRequests')
      .where('sessionId', '==', bookingId)
      .where('status', '==', 'pending')
      .get();
      
    if (rescheduleQuery.empty) {
      alert('No reschedule request found for this booking.');
      return;
    }
    
    const rescheduleRequest = rescheduleQuery.docs[0].data();
    const newDate = rescheduleRequest.requestedDate;
    const originalDate = rescheduleRequest.originalDate;
    const respondedAt = new Date();
    
    await db.collection('bookedSessions').doc(bookingId).update({
      date: newDate,
      status: 'confirmed',
      rescheduleStatus: 'accepted',
      rescheduleRespondedAt: respondedAt,
      rescheduleTimeline: {
        requestedAt: rescheduleRequest.requestedAt || new Date(),
        respondedAt: respondedAt,
        acceptedAt: respondedAt
      }
    });
    
    await updateSessionHistory(bookingId, newDate, originalDate);
    await updateRescheduleRequest(bookingId, 'accepted');
    
    alert('Reschedule accepted! The session has been updated.');
    loadUserBookings();
  } catch (error) {
    console.error('Error accepting reschedule:', error);
    alert('Failed to accept reschedule. Please try again.');
  }
}

async function declineReschedule(bookingId) {
  const reason = prompt('Please provide a reason for declining the reschedule request:');
  if (reason === null) return;
  
  try {
    await db.collection('bookedSessions').doc(bookingId).update({
      status: 'confirmed',
      rescheduleStatus: 'declined',
      rescheduleDeclineReason: reason,
      rescheduleRespondedAt: new Date()
    });
    
    await updateRescheduleRequest(bookingId, 'declined');
    alert('Reschedule request declined.');
    loadUserBookings();
  } catch (error) {
    console.error('Error declining reschedule:', error);
    alert('Failed to decline reschedule. Please try again.');
  }
}

async function updateRescheduleRequest(bookingId, status) {
  try {
    const rescheduleQuery = await db.collection('rescheduleRequests')
      .where('sessionId', '==', bookingId)
      .where('status', '==', 'pending')
      .get();
      
    if (!rescheduleQuery.empty) {
      const requestDoc = rescheduleQuery.docs[0];
      await db.collection('rescheduleRequests').doc(requestDoc.id).update({
        status: status,
        respondedAt: new Date()
      });
    }
  } catch (error) {
    console.error('Error updating reschedule request:', error);
  }
}

async function updateSessionHistory(bookingId, newDate, originalDate) {
  try {
    const sessionQuery = await db.collection('sessions')
      .where('bookingId', '==', bookingId)
      .get();
      
    if (!sessionQuery.empty) {
      const sessionDoc = sessionQuery.docs[0];
      await db.collection('sessions').doc(sessionDoc.id).update({
        date: newDate,
        originalDate: originalDate,
        rescheduled: true,
        rescheduleAcceptedAt: new Date()
      });
    } else {
      const bookingDoc = await db.collection('bookedSessions').doc(bookingId).get();
      const booking = bookingDoc.data();
      
      await db.collection('sessions').add({
        bookingId: bookingId,
        tutorId: booking.tutorId,
        tutorName: booking.tutorName,
        studentId: booking.studentId,
        studentName: booking.studentName,
        subject: booking.subject,
        date: newDate,
        originalDate: originalDate,
        duration: booking.duration,
        sessionType: booking.sessionType,
        status: 'rescheduled',
        rescheduled: true,
        rescheduleAcceptedAt: new Date(),
        createdAt: new Date()
      });
    }
  } catch (error) {
    console.error('Error updating session history:', error);
  }
}

function setupBookingFilter() {
  const filterSelect = document.getElementById('bookingFilter');
  if (!filterSelect) return;
  
  filterSelect.addEventListener('change', function() {
    const filterValue = this.value;
    const bookingCards = document.querySelectorAll('.session-card');
    
    bookingCards.forEach(card => {
      switch(filterValue) {
        case 'all':
          card.style.display = 'block';
          break;
        case 'upcoming':
          card.style.display = 'block';
          break;
        case 'reschedule':
          if (card.classList.contains('reschedule-requested')) {
            card.style.display = 'block';
          } else {
            card.style.display = 'none';
          }
          break;
        case 'pending':
          const statusBadge = card.querySelector('.status-badge');
          if (statusBadge && statusBadge.textContent.includes('Pending')) {
            card.style.display = 'block';
          } else {
            card.style.display = 'none';
          }
          break;
      }
    });
  });
}

function setupRescheduleListener() {
  const userId = auth.currentUser.uid;
  
  db.collection('bookedSessions')
    .where('studentId', '==', userId)
    .where('status', 'in', ['reschedule_requested', 'confirmed', 'pending'])
    .onSnapshot((snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'modified') {
          const booking = change.doc.data();
          if (booking.status === 'reschedule_requested') {
            showRescheduleNotification(change.doc.id, booking);
          }
        }
      });
    });
}

function showRescheduleNotification(bookingId, booking) {
  alert(`New reschedule request from ${booking.tutorName} for your ${booking.subject} session. Check your bookings to respond.`);
}

function viewRescheduleRequest(bookingId) {
  document.querySelectorAll('.menu-item a').forEach(a => a.classList.remove('active'));
  document.querySelector('.dashboard-section.active').classList.remove('active');
  
  document.querySelector('a[data-section="bookings"]').classList.add('active');
  document.getElementById('bookings').classList.add('active');
  
  setTimeout(() => {
    const bookingElement = document.getElementById(`booking-${bookingId}`);
    if (bookingElement) {
      bookingElement.scrollIntoView({ behavior: 'smooth' });
      bookingElement.style.animation = 'pulse 2s infinite';
    }
  }, 100);
}

function updateUpcomingSessionsCount(count) {
  const countElement = document.getElementById('upcomingSessionsCount');
  if (countElement) {
    countElement.textContent = count;
  }
}

function loadUserBookings() {
  const userId = auth.currentUser.uid;
  
  db.collection('bookedSessions')
    .where('studentId', '==', userId)
    .where('status', 'in', ['confirmed', 'pending', 'reschedule_requested'])
    .where('date', '>=', new Date())
    .orderBy('date', 'asc')
    .get()
    .then((querySnapshot) => {
      updateUpcomingSessionsCount(querySnapshot.size);
      loadBookings(querySnapshot);
    })
    .catch((error) => {
      console.error('Error loading booked sessions:', error);
      document.getElementById('bookingsContainer').innerHTML = '<div class="error-state"><i class="fas fa-exclamation-circle"></i><h3>Error Loading Bookings</h3><p>Failed to load your bookings. Please try again later.</p></div>';
    });
}

function loadUserSessionHistory(loadMore = false) {
  if (!loadMore && sessionsDataLoaded) {
    return;
  }
  
  const userId = auth.currentUser.uid;
  let query = db.collection('bookedSessions')
    .where('studentId', '==', userId)
    .orderBy('date', 'desc')
    .limit(10);

  if (loadMore && lastVisible) {
    query = query.startAfter(lastVisible);
  }

  query.get().then((querySnapshot) => {
    if (!querySnapshot.empty) {
      lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1];
    }
    
    if (isFirstLoad || loadMore) {
      if (loadMore) {
        appendSessionHistory(querySnapshot);
      } else {
        loadSessionHistory(querySnapshot);
        sessionsDataLoaded = true;
      }
      isFirstLoad = false;
    }
    
    document.getElementById('loadMoreBtn').style.display = 
      querySnapshot.docs.length === 10 ? 'block' : 'none';
  });
}

function refreshSessionsHistory() {
  sessionsDataLoaded = false;
  isFirstLoad = true;
  lastVisible = null;
  
  const currentTimeFilter = document.getElementById('historyFilter').value;
  const currentActionFilter = document.getElementById('actionTypeFilter').value;
  
  loadUserSessionHistory();
  
  setTimeout(() => {
    document.getElementById('historyFilter').value = currentTimeFilter;
    document.getElementById('actionTypeFilter').value = currentActionFilter;
    setupHistoryFilters();
  }, 500);
}

function updateUserStats() {
  const userId = auth.currentUser.uid;
  
  db.collection('sessions')
    .where('studentId', '==', userId)
    .where('status', '==', 'completed')
    .get()
    .then((querySnapshot) => {
      const tutorIds = [];
      let totalHours = 0;
      
      querySnapshot.forEach((doc) => {
        const session = doc.data();
        if (session.tutorId && !tutorIds.includes(session.tutorId)) {
          tutorIds.push(session.tutorId);
        }
        totalHours += parseFloat(session.duration) || 1;
      });
      
      document.getElementById('tutorsCount').textContent = tutorIds.length;
      document.getElementById('hoursLearned').textContent = totalHours.toFixed(1);
    })
    .catch((error) => {
      console.error('Error loading stats:', error);
    });
}

function loadTutorsForScheduling() {
  const tutorSelect = document.getElementById('tutor');
  const tutorSpinner = document.getElementById('tutorSpinner');
  
  while (tutorSelect.options.length > 1) {
    tutorSelect.remove(1);
  }
  
  tutorSpinner.style.display = 'block';
  
  db.collection('tutors')
    .where('available', '==', true)
    .where('approved', '==', true)
    .get()
    .then((querySnapshot) => {
      tutorSpinner.style.display = 'none';
      
      if (querySnapshot.empty) {
        tutorSelect.innerHTML = '<option value="">No available tutors found</option>';
        return;
      }
      
      querySnapshot.forEach((doc) => {
        const tutor = doc.data();
        const option = document.createElement('option');
        option.value = doc.id;
        
        const tutorName = tutor.personal?.fullName || 'Unknown Tutor';
        let subjectsText = 'No subjects listed';
        
        if (tutor.subjects && tutor.subjects.subjects && tutor.subjects.subjects.length > 0) {
          subjectsText = tutor.subjects.subjects.join(', ');
        } else if (tutor.subjects && Array.isArray(tutor.subjects)) {
          subjectsText = tutor.subjects.join(', ');
        }
        
        option.textContent = `${tutorName} - ${subjectsText}`;
        option.setAttribute('data-hourly-rate', tutor.professional?.hourlyRate || 30);
        tutorSelect.appendChild(option);
      });
    })
    .catch((error) => {
      tutorSpinner.style.display = 'none';
      console.error('Error loading tutors:', error);
      alert('Failed to load tutors. Please try again.');
    });
}

function loadAvailableTutors() {
  const container = document.getElementById('availableTutorsContainer');
  container.innerHTML = '<div class="spinner" id="tutorsSpinner"></div>';
  
  db.collection('tutors')
    .where('available', '==', true)
    .where('approved', '==', true)
    .get()
    .then((querySnapshot) => {
      container.innerHTML = '';
      
      if (querySnapshot.empty) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-user-slash"></i><h3>No Available Tutors</h3><p>There are no tutors available at the moment. Please check back later.</p></div>';
        return;
      }
      
      querySnapshot.forEach((doc) => {
        const tutor = doc.data();
        const tutorCard = document.createElement('div');
        tutorCard.className = 'tutor-card';
        tutorCard.innerHTML = `
          <div class="tutor-header">
            <div class="tutor-avatar">
              <img src="${tutor.photoURL || 'https://via.placeholder.com/70'}" alt="${tutor.personal?.fullName}">
            </div>
            <div class="tutor-name">${tutor.personal?.fullName || 'Unknown Tutor'}</div>
            <div class="tutor-subject">${tutor.subjects?.subjects ? tutor.subjects.subjects.join(', ') : 'No subjects listed'}</div>
          </div>
          <div class="tutor-details">
            <p><i class="fas fa-graduation-cap"></i> ${tutor.professional?.qualifications || 'No qualifications listed'}</p>
            <p><i class="fas fa-star"></i> Rating: ${tutor.rating || 'No rating'} (${tutor.reviewCount || 0} reviews)</p>
            <p><i class="fas fa-dollar-sign"></i> $${tutor.professional?.hourlyRate || 'N/A'}/hour</p>
            <p><i class="fas fa-clock"></i> Response time: ${tutor.responseTime || 'Unknown'}</p>
            <button class="btn-primary" onclick="bookTutor('${doc.id}')">Book Session</button>
          </div>
        `;
        container.appendChild(tutorCard);
      });
    })
    .catch((error) => {
      console.error('Error loading available tutors:', error);
      container.innerHTML = '<div class="error-state"><i class="fas fa-exclamation-circle"></i><h3>Error Loading Tutors</h3><p>Failed to load available tutors. Please try again later.</p></div>';
    });
}

function loadMyTutors() {
  const container = document.getElementById('myTutorsContainer');
  container.innerHTML = '<div class="spinner"></div>';
  
  const userId = auth.currentUser.uid;
  
  db.collection('sessions')
    .where('studentId', '==', userId)
    .where('status', '==', 'completed')
    .get()
    .then((querySnapshot) => {
      container.innerHTML = '';
      
      if (querySnapshot.empty) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-user-slash"></i><h3>No Tutors Yet</h3><p>You haven\'t had any sessions with tutors yet. Book your first session to get started!</p></div>';
        return;
      }
      
      const tutorIds = [];
      querySnapshot.forEach((doc) => {
        const session = doc.data();
        if (session.tutorId && !tutorIds.includes(session.tutorId)) {
          tutorIds.push(session.tutorId);
        }
      });
      
      if (tutorIds.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-user-slash"></i><h3>No Tutors Yet</h3><p>You haven\'t had any sessions with tutors yet. Book your first session to get started!</p></div>';
        return;
      }
      
      const tutorPromises = tutorIds.map(tutorId => 
        db.collection('tutors').doc(tutorId).get()
      );
      
      Promise.all(tutorPromises)
        .then((tutorSnapshots) => {
          tutorSnapshots.forEach((tutorDoc) => {
            if (tutorDoc.exists) {
              const tutor = tutorDoc.data();
              const tutorCard = document.createElement('div');
              tutorCard.className = 'tutor-card';
              tutorCard.innerHTML = `
                <div class="tutor-header">
                  <div class="tutor-avatar">
                    <img src="${tutor.photoURL || 'https://via.placeholder.com/70'}" alt="${tutor.name}">
                  </div>
                  <div class="tutor-name">${tutor.personal?.fullName || 'Unknown Tutor'}</div>
                  <div class="tutor-subject">${tutor.subjects?.subjects ? tutor.subjects.subjects.join(', ') : 'No subjects listed'}</div>
                </div>
                <div class="tutor-details">
                  <p><i class="fas fa-graduation-cap"></i> ${tutor.professional?.qualifications || 'No qualifications listed'}</p>
                  <p><i class="fas fa-star"></i> Rating: ${tutor.rating || 'No rating'} (${tutor.reviewCount || 0} reviews)</p>
                  <p><i class="fas fa-clock"></i> Last session: Completed</p>
                  <button class="btn-primary" onclick="bookTutor('${tutorDoc.id}')">Book Again</button>
                </div>
              `;
              container.appendChild(tutorCard);
            }
          });
        })
        .catch((error) => {
          console.error('Error loading tutor details:', error);
          container.innerHTML = '<div class="error-state"><i class="fas fa-exclamation-circle"></i><h3>Error Loading Tutors</h3><p>Failed to load your tutors. Please try again later.</p></div>';
        });
    })
    .catch((error) => {
      console.error('Error loading sessions:', error);
      container.innerHTML = '<div class="error-state"><i class="fas fa-exclamation-circle"></i><h3>Error Loading Tutors</h3><p>Failed to load your tutors. Please try again later.</p></div>';
    });
}

function bookTutor(tutorId) {
  document.querySelectorAll('.menu-item a').forEach(a => a.classList.remove('active'));
  document.querySelector('.dashboard-section.active').classList.remove('active');
  
  document.querySelector('a[data-section="scheduling"]').classList.add('active');
  document.getElementById('scheduling').classList.add('active');
  
  setTimeout(() => {
    const tutorSelect = document.getElementById('tutor');
    tutorSelect.value = tutorId;
    const event = new Event('change');
    tutorSelect.dispatchEvent(event);
  }, 100);
}

function joinSession(sessionId) {
  alert(`Joining session ${sessionId}. This would typically open the video meeting.`);
}

function cancelBooking(bookingId) {
  if (confirm('Are you sure you want to cancel this booking?')) {
    db.collection('bookedSessions').doc(bookingId).update({
      status: 'cancelled',
      cancelledAt: new Date()
    })
    .then(() => {
      alert('Booking cancelled successfully.');
      loadUserBookings();
    })
    .catch((error) => {
      console.error('Error cancelling booking:', error);
      alert('Failed to cancel booking. Please try again.');
    });
  }
}

function addBookingToUI(bookingId, bookingData) {
  const container = document.getElementById('bookingsContainer');
  const date = bookingData.date.toDate();
  const formattedDate = date.toLocaleDateString();
  const formattedTime = date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  
  const bookingCard = `
    <div class="session-card" id="booking-${bookingId}">
      <div class="session-header">
        <div class="session-title">${bookingData.subject || 'No subject'}</div>
        <div class="session-date">${formattedDate} at ${formattedTime}</div>
      </div>
      <div class="session-details">
        <div class="session-detail">
          <i class="fas fa-user-tie"></i>
          <span>Tutor: ${bookingData.tutorName || 'Unknown'}</span>
        </div>
        <div class="session-detail">
          <i class="fas fa-clock"></i>
          <span>Duration: ${bookingData.duration || '1'} hours</span>
        </div>
        <div class="session-detail">
          <i class="fas fa-video"></i>
          <span>Type: ${bookingData.sessionType === 'in-person' ? 'In-Person' : 'Online'}</span>
        </div>
        <div class="session-detail">
          <i class="fas fa-hourglass-half"></i>
          <span>Status: <span class="status-badge status-pending">Pending</span></span>
        </div>
      </div>
      <div class="session-actions">
        <button class="btn-outline" onclick="cancelBooking('${bookingId}')">Cancel</button>
      </div>
    </div>
  `;
  
  if (container.querySelector('.empty-state')) {
    container.innerHTML = bookingCard;
  } else {
    container.insertAdjacentHTML('afterbegin', bookingCard);
  }
}

function scheduleSession() {
  const tutorId = document.getElementById('tutor').value;
  const subject = document.getElementById('subject').value;
  const date = document.getElementById('date').value;
  const time = document.getElementById('time').value;
  const duration = document.getElementById('duration').value;
  const sessionType = document.getElementById('sessionType').value;
  const notes = document.getElementById('notes').value;
  
  if (!tutorId || !subject || !date || !time || !duration) {
    alert('Please fill in all required fields.');
    return;
  }
  
  const sessionDateTime = new Date(`${date}T${time}`);
  if (sessionDateTime <= new Date()) {
    alert('Please select a future date and time.');
    return;
  }
  
  const user = auth.currentUser;
  if (!user) {
    alert('You must be logged in to schedule a session.');
    return;
  }
  
  const tutorDoc = db.collection('tutors').doc(tutorId);
  
  tutorDoc.get().then((tutorSnapshot) => {
    if (!tutorSnapshot.exists) {
      alert('Selected tutor not found.');
      return;
    }
    
    const tutor = tutorSnapshot.data();
    const tutorName = tutor.personal?.fullName || 'Unknown Tutor';
    const studentName = userData?.personal?.fullName || user.displayName || 'Student';
    
    const bookingData = {
      tutorId: tutorId,
      tutorName: tutorName,
      studentId: user.uid,
      studentName: studentName,
      subject: subject,
      date: sessionDateTime,
      duration: parseInt(duration),
      sessionType: sessionType,
      notes: notes,
      status: 'pending',
      bookedAt: new Date(),
      createdAt: new Date()
    };
    
    db.collection('bookedSessions').add(bookingData)
      .then((docRef) => {
        alert('Session scheduled successfully! The tutor will confirm your booking soon.');
        document.getElementById('schedulingForm').reset();
        addBookingToUI(docRef.id, bookingData);
        updateUpcomingSessionsCount(parseInt(document.getElementById('upcomingSessionsCount').textContent) + 1);
      })
      .catch((error) => {
        console.error('Error scheduling session:', error);
        alert('Failed to schedule session. Please try again.');
      });
  });
}

function updateCost() {
  const tutorSelect = document.getElementById('tutor');
  const durationSelect = document.getElementById('duration');
  const costDisplay = document.getElementById('costDisplay');
  
  const selectedOption = tutorSelect.options[tutorSelect.selectedIndex];
  const hourlyRate = selectedOption ? parseFloat(selectedOption.getAttribute('data-hourly-rate')) || 30 : 30;
  const duration = parseInt(durationSelect.value) || 1;
  
  const totalCost = hourlyRate * duration;
  costDisplay.textContent = `$${totalCost}`;
}

function toggleSection(sectionId) {
  document.querySelectorAll('.dashboard-section').forEach(section => {
    section.classList.remove('active');
  });
  
  document.querySelectorAll('.menu-item a').forEach(a => {
    a.classList.remove('active');
  });
  
  document.getElementById(sectionId).classList.add('active');
  event.target.classList.add('active');
  
  switch(sectionId) {
    case 'dashboard':
      updateUserStats();
      loadUserBookings();
      break;
    case 'scheduling':
      loadTutorsForScheduling();
      break;
    case 'tutors':
      loadAvailableTutors();
      break;
    case 'my-tutors':
      loadMyTutors();
      break;
    case 'history':
      loadUserSessionHistory();
      break;
    case 'bookings':
      loadUserBookings();
      break;
  }
}

function logout() {
  auth.signOut().then(() => {
    window.location.href = 'student-login.html';
  });
}

function updateUserProfile() {
  const user = auth.currentUser;
  if (!user) return;
  
  const userDoc = db.collection('users').doc(user.uid);
  
  userDoc.get().then((doc) => {
    if (doc.exists) {
      userData = doc.data();
      document.getElementById('userName').textContent = userData.personal?.fullName || user.displayName || 'Student';
      document.getElementById('userEmail').textContent = user.email;
      
      if (userData.personal?.photoURL) {
        document.getElementById('userAvatar').src = userData.personal.photoURL;
      }
    } else {
      document.getElementById('userName').textContent = user.displayName || 'Student';
      document.getElementById('userEmail').textContent = user.email;
    }
  }).catch((error) => {
    console.error('Error loading user data:', error);
    document.getElementById('userName').textContent = user.displayName || 'Student';
    document.getElementById('userEmail').textContent = user.email;
  });
}

function initDashboard() {
  auth.onAuthStateChanged((user) => {
    if (user) {
      currentUser = user;
      updateUserProfile();
      resetInactivityTimer();
      setupActivityListeners();
      setupRescheduleListener();
      
      updateUserStats();
      loadUserBookings();
      loadUserSessionHistory();
      
      document.getElementById('tutor').addEventListener('change', updateCost);
      document.getElementById('duration').addEventListener('change', updateCost);
      
      document.querySelectorAll('.menu-item a').forEach(a => {
        a.addEventListener('click', function(e) {
          e.preventDefault();
          const sectionId = this.getAttribute('data-section');
          toggleSection(sectionId);
        });
      });
      
      document.getElementById('logoutBtn').addEventListener('click', logout);
      document.getElementById('loadMoreBtn').addEventListener('click', function() {
        loadUserSessionHistory(true);
      });
      
      document.getElementById('refreshHistoryBtn').addEventListener('click', refreshSessionsHistory);
      
    } else {
      window.location.href = 'student-login.html';
    }
  });
}

document.addEventListener('DOMContentLoaded', initDashboard);