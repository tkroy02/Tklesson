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

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Global variables
let currentUser = null;
let userData = null;
let inactivityTimer;
let pendingSessions = [];
let confirmedSessions = [];
let sessionsLoaded = false;
let lastVisibleSession = null;
let isFirstLoad = true;
let sessionsDataLoaded = false;

function resetInactivityTimer() {
    // Clear existing timer
    clearTimeout(inactivityTimer);
    
    // Set new timer (2 hours = 2 * 60 * 60 * 1000 milliseconds)
    inactivityTimer = setTimeout(logoutDueToInactivity, 2 * 60 * 60 * 1000);
}

function logoutDueToInactivity() {
    alert('You have been logged out due to inactivity.');
    auth.signOut().then(() => {
        window.location.href = 'tutor-login.html';
    });
}

function setupActivityListeners() {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    
    events.forEach(event => {
        document.addEventListener(event, resetInactivityTimer);
    });
    
    // Also reset timer when navigating between sections
    const menuItems = document.querySelectorAll('.menu-item a');
    menuItems.forEach(item => {
        item.addEventListener('click', resetInactivityTimer);
    });
}

// Helper function to safely get user's full name with role
function getUserDisplayInfo(userData, currentUser, defaultRole = 'Tutor') {
    // Use 'fullName' field from Firestore
    const name = userData?.fullName || currentUser?.displayName || 
                    currentUser?.email?.split('@')[0] || defaultRole;
    
    // Capitalize the first letter of role (convert "tutor" to "Tutor")
    const role = userData?.role ? 
                userData.role.charAt(0).toUpperCase() + userData.role.slice(1) : 
                defaultRole;
    
    return { name, role };
}

// Check authentication state
auth.onAuthStateChanged((user) => {
    if (user) {
        // Start inactivity timer
        resetInactivityTimer();
        setupActivityListeners();
        
        // Load user data
        currentUser = user;
        loadUserData(user.uid);
        loadTutorData(user.uid);
        loadTutoringOpportunities(user.uid);
    } else {
        // Clear timer if user logs out manually
        clearTimeout(inactivityTimer);
        window.location.href = 'tutor-login.html';
    }
});

// Load user data from Firestore
async function loadUserData(uid) {
    try {
        // Load from tutors collection
        const userDoc = await db.collection('tutors').doc(uid).get();
        if (userDoc.exists) {
            userData = userDoc.data();
            updateProfileUI(userData);
            updateUIWithUserData();
        } else {
            console.log("No user data found");
        }
    } catch (error) {
        console.error("Error loading user data:", error);
    }
}

// Reschedule session function
async function rescheduleSession(sessionId, currentBooking) {
    try {
        // Get the new date and time from modal
        const newDate = document.getElementById('newDate').value;
        const newTime = document.getElementById('newTime').value;
        const reason = document.getElementById('rescheduleReason').value;
        
        if (!newDate || !newTime) {
            alert('Please select both date and time');
            return;
        }
        
        // Combine date and time
        const newDateTime = new Date(`${newDate}T${newTime}`);
        
        // Create reschedule request in Firestore
        await db.collection('rescheduleRequests').add({
            sessionId: sessionId,
            tutorId: currentUser.uid,
            studentId: currentBooking.studentId,
            originalDate: currentBooking.date,
            requestedDate: newDateTime,
            reason: reason,
            status: 'pending',
            requestedAt: new Date(),
            requestedBy: 'tutor'
        });
        
        // Update session status to indicate reschedule requested
        await db.collection('bookedSessions').doc(sessionId).update({
            status: 'reschedule_requested',
            rescheduleRequestedAt: new Date()
        });
        
        // Close modal and show success message
        closeRescheduleModal();
        alert('Reschedule request sent to student successfully!');
        
        // Refresh the bookings display
        loadTutorData(currentUser.uid);
        
    } catch (error) {
        console.error("Error requesting reschedule:", error);
        alert('Error sending reschedule request. Please try again.');
    }
}

// Open reschedule modal
function openRescheduleModal(sessionId, booking) {
    console.log('Opening reschedule modal for session:', sessionId);
    console.log('Booking data:', booking);
    console.log('Pending sessions:', pendingSessions.map(s => s.id));
    console.log('Confirmed sessions:', confirmedSessions.map(s => s.id));
    
    const modal = document.getElementById('rescheduleModal');
    document.getElementById('rescheduleSessionId').value = sessionId;

    
    // Set minimum date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    document.getElementById('newDate').min = tomorrow.toISOString().split('T')[0];
    
    // Pre-fill current date/time as placeholder
    const currentDate = booking.date.toDate();
    document.getElementById('newDate').value = currentDate.toISOString().split('T')[0];
    document.getElementById('newTime').value = currentDate.toTimeString().slice(0, 5);
    
    modal.style.display = 'block';
}

// Close reschedule modal
function closeRescheduleModal() {
    document.getElementById('rescheduleModal').style.display = 'none';
    document.getElementById('rescheduleForm').reset();
}

// Load session history with filters and pagination
function loadUserSessionHistory(loadMore = false) {
  if (!loadMore && sessionsDataLoaded) return;

  const userId = currentUser.uid;
  let query = db.collection('bookedSessions')
    .where('tutorId', '==', userId)
    .orderBy('date', 'desc')
    .limit(10);

  if (loadMore && lastVisibleSession) {
    query = query.startAfter(lastVisibleSession);
  }

  query.get().then((querySnapshot) => {
    if (!querySnapshot.empty) {
      lastVisibleSession = querySnapshot.docs[querySnapshot.docs.length - 1];
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
  }).catch(error => {
    console.error("Error loading session history:", error);
  });
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
          <th>Student</th>
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
        <td>${session.studentName || 'Unknown Student'}</td>
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
      <td>${session.studentName || 'Unknown Student'}</td>
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

// Helper functions
function getActionTimestamp(session) {
  let actionTime = new Date();
  let actionType = 'Unknown';

  if (session.cancelledAt) {
    actionTime = session.cancelledAt.toDate();
    if (session.cancelledBy === 'tutor') {
      actionType = 'Tutor Cancelled';
    } else if (session.cancelledBy === 'student') {
      actionType = 'Student Cancelled';
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

function getActionTypeClass(actionType) {
  switch(actionType.toLowerCase()) {
    case 'tutor confirmed':
    case 'completed':
    case 'auto-confirmed':
      return 'status-verified';
    case 'tutor cancelled':
    case 'student cancelled':
      return 'status-cancelled';
    case 'tutor reschedule request':
    case 'student reschedule request':
    case 'rescheduled':
      return 'status-warning';
    default:
      return 'status-pending';
  }
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

      // Apply time filter
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

      // Apply action type filter
      if (actionFilter !== 'all' && showRow) {
        const actionTypeText = row.cells[7].textContent.trim().toLowerCase().replace(/\s+/g, ' ');
        
        const filterMapping = {
          'tutor confirmed': ['tutor confirmed'],
          'completed': ['completed'],
          'tutor cancelled': ['tutor cancelled'],
          'tutor reschedule request': ['tutor reschedule request'],
          'rescheduled': ['rescheduled', 'auto-confirmed']
        };
        
        if (filterMapping[actionFilter]) {
          const matches = filterMapping[actionFilter].some(expected => 
            actionTypeText.includes(expected.toLowerCase())
          );
          showRow = matches;
        } else {
          showRow = true;
        }
      }

      row.style.display = showRow ? '' : 'none';
      if (showRow) visibleCount++;
    });

    // Show/hide no results message
    const table = document.querySelector('#sessionsContainer table');
    let tbody = table ? table.querySelector('tbody') : null;
    
    if (tbody) {
      let noResultsMsg = tbody.querySelector('.no-results-message');

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
          tbody.appendChild(noResultsMsg);
        }
      } else if (noResultsMsg) {
        noResultsMsg.remove();
      }
    }
  };

  historyFilter.addEventListener('change', applyFilters);
  actionTypeFilter.addEventListener('change', applyFilters);
  
  setTimeout(applyFilters, 100);
}

// Load tutor-specific data - FIXED VERSION
async function loadTutorData(uid) {
    try {
        const tutorDoc = await db.collection('tutors').doc(uid).get();
        if (tutorDoc.exists) {
            const tutorData = tutorDoc.data();
            
            // Update availability toggle
            const availabilityToggle = document.getElementById('availabilityToggle');
            if (availabilityToggle) {
                availabilityToggle.checked = tutorData.available === true;
                updateAvailabilityLabel(tutorData.available);
            }
            
            // Load upcoming sessions
            const sessionsSnapshot = await db.collection('bookedSessions')
                .where('tutorId', '==', uid)
                .where('status', 'in', ['pending', 'confirmed'])
                .orderBy('date', 'asc')
                .get();
            
            updateUpcomingSessionsCount(sessionsSnapshot.size);
            loadBookings(sessionsSnapshot);
            
            // Load students who have booked sessions with this tutor
            const studentIds = new Set();
            sessionsSnapshot.forEach(doc => {
                const booking = doc.data();
                if (booking.userId) {
                    studentIds.add(booking.userId);
                }
            });
            
            // Convert Set to Array for querying
            const studentIdsArray = Array.from(studentIds);
            
            if (studentIdsArray.length > 0) {
                const studentsSnapshot = await db.collection('tutors')
                    .where('role', '==', 'student')
                    .where(firebase.firestore.FieldPath.documentId(), 'in', studentIdsArray)
                    .get();
                
                loadStudents(studentsSnapshot);
                document.getElementById('activeStudentsCount').textContent = studentsSnapshot.size;
            } else {
                document.getElementById('activeStudentsCount').textContent = '0';
                document.getElementById('studentsContainer').innerHTML = '<p>You have no students yet.</p>';
            }
            
            // Load session history
            const historySnapshot = await db.collection('bookedSessions')
                .where('tutorId', '==', uid)
                .where('status', 'in', ['completed', 'cancelled'])
                .orderBy('date', 'desc')
                .get();
            
            loadSessionHistory(historySnapshot);
            
            // Load earnings based on actual completed sessions
            const completedSessions = await db.collection('bookedSessions')
                .where('tutorId', '==', uid)
                .where('status', '==', 'completed')
                .get();
            
            loadEarnings(uid, completedSessions);
        }
    } catch (error) {
        console.error("Error loading tutor data:", error);
    }
}

// Update UI with user data
function updateUIWithUserData() {
    if (!currentUser || !userData) return;
    
    // Get display info using the helper function
    const { name, role } = getUserDisplayInfo(userData, currentUser);
    
    // Update user name and role in sidebar
    document.getElementById('userName').textContent = name;
    document.getElementById('userRole').textContent = role;
    
    // Update profile section
    document.getElementById('profileName').textContent = name;
    document.getElementById('profileEmail').textContent = currentUser.email || 'No email';
    document.getElementById('profileRole').textContent = role + ' Account';
    
    // Update form fields - use fullName from Firestore
    document.getElementById('name').value = userData.fullName || name;
    document.getElementById('email').value = currentUser.email || '';
    document.getElementById('phone').value = userData.phone || '';
    document.getElementById('role').value = role;
    
    // Update stats with sample data
    document.getElementById('upcomingSessionsCount').textContent = userData.upcomingSessions || 3;
    document.getElementById('activeStudentsCount').textContent = userData.activeStudents || 5;
    document.getElementById('monthlyEarnings').textContent = '$' + (userData.monthlyEarnings || 450);
}

// Update profile UI with user data
function updateProfileUI(data) {
    // Tutors collection uses 'fullName' field
    const name = data.fullName || data.name || currentUser.displayName || 
                (currentUser.email ? currentUser.email.split('@')[0] : 'Tutor');
    const email = data.email || currentUser.email || 'No email provided';
    const phone = data.phone || 'Not provided';
    const role = data.role ? data.role.charAt(0).toUpperCase() + data.role.slice(1) : 'Tutor';
    
    document.getElementById('userName').textContent = name;
    document.getElementById('profileName').textContent = name;
    document.getElementById('userRole').textContent = role;
    document.getElementById('profileRole').textContent = `${role} Account`;
    document.getElementById('profileEmail').textContent = email;
    
    // Form fields
    document.getElementById('name').value = name;
    document.getElementById('email').value = email;
    document.getElementById('phone').value = phone;
    document.getElementById('role').value = role;
}

// Update availability label
function updateAvailabilityLabel(isAvailable) {
    const label = document.getElementById('availabilityLabel');
    if (label) {
        label.textContent = isAvailable ? 'Available' : 'Not Available';
    }
}

// Toggle availability status
async function toggleAvailability(isAvailable) {
    if (!currentUser) return;
    
    try {
        // Update in Firestore
        await db.collection('tutors').doc(currentUser.uid).update({
            available: isAvailable,
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Update UI
        updateAvailabilityLabel(isAvailable);
        
        console.log("Availability updated to:", isAvailable);
    } catch (error) {
        console.error("Error updating availability:", error);
        alert("Error updating availability. Please try again.");
        
        // Revert toggle on error
        const toggle = document.getElementById('availabilityToggle');
        if (toggle) {
            toggle.checked = !isAvailable;
            updateAvailabilityLabel(!isAvailable);
        }
    }
}

// Update upcoming sessions count
function updateUpcomingSessionsCount(count) {
    document.getElementById('upcomingSessionsCount').textContent = count;
}

// Load bookings - CLEAN CORRECT VERSION
async function loadBookings(snapshot) {
    const bookingsContainer = document.getElementById('bookingsContainer');
    
    if (snapshot.empty) {
        bookingsContainer.innerHTML = '<p>You have no upcoming bookings.</p>';
        confirmedSessions = []; // Clear the array
        return;
    }
    
    let bookingsHTML = '';
    confirmedSessions = []; // Reset and populate
    
    // Process each booking and fetch student details
    for (const doc of snapshot.docs) {
        const booking = doc.data();
        booking.id = doc.id;
        confirmedSessions.push(booking); // STORE IN confirmedSessions ARRAY
        
        console.log('Booking data:', booking);
        
        // Fetch student name from student document
        let studentName = 'Student';
        if (booking.studentId && booking.studentId !== "students") {
            try {
                const studentDoc = await db.collection('students').doc(booking.studentId).get();
                if (studentDoc.exists) {
                    const studentData = studentDoc.data();
                    studentName = studentData.fullName || 'Student';
                }
            } catch (error) {
                console.error("Error loading student data:", error);
            }
        }
        
        // Create the booking card HTML
        bookingsHTML += createBookingCard(booking, studentName);
    }
    
    bookingsContainer.innerHTML = bookingsHTML;
    
    // Add event listeners to action buttons
    setTimeout(() => {
        addBookingActionListeners();
    }, 100);
}

// Create booking card HTML - SEPARATE FUNCTION (not nested!)
function createBookingCard(booking, studentName) {
    const date = booking.date.toDate();
    const formattedDate = date.toLocaleDateString();
    const formattedTime = date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    
    // Use the provided studentName and booking data
    const subject = booking.subject || 'General Tutoring';
    const location = booking.location || booking.sessionType || 'online';
    const meetLink = booking.meetLink || '#';
    
    return `
        <div class="session-card">
            <div class="session-header">
                <div class="session-title">${subject} Session with ${studentName}</div>
                <div class="session-date">${formattedDate}, ${formattedTime}</div>
            </div>
            <div class="session-details">
                <div class="session-detail">
                    <i class="fas fa-user"></i> Student: ${studentName}
                </div>
                <div class="session-detail">
                    <i class="fas ${location === 'online' ? 'fa-video' : 'fa-map-marker-alt'}"></i> 
                    ${location === 'online' ? 'Online (Google Meet)' : location}
                </div>
            </div>
            <div class="session-actions">
                ${location === 'online' ? 
                    `<button class="btn-primary join-session-btn" data-meet-link="${meetLink}">Join Session</button>` : 
                    ''}
                <button class="btn-outline reschedule-btn" data-session-id="${booking.id}">Reschedule</button>
                <button class="btn-outline cancel-booking-btn">Cancel</button>
            </div>
        </div>
    `;
}

// Load students - SEPARATE FUNCTION (not nested!)
function loadStudents(snapshot) {
    const studentsContainer = document.getElementById('studentsContainer');
    
    if (snapshot.empty) {
        studentsContainer.innerHTML = '<p>You have no students yet.</p>';
        return;
    }
    
    let studentsHTML = '<div class="tutors-container">';
    snapshot.forEach(doc => {
        const student = doc.data();
        studentsHTML += createStudentCard(student);
    });
    studentsHTML += '</div>';
    
    studentsContainer.innerHTML = studentsHTML;
}

// Create student card HTML - SEPARATE FUNCTION (not nested!)
function createStudentCard(student) {
    return `
        <div class="tutor-card">
            <div class="tutor-header">
                <div class="tutor-avatar">
                    <i class="fas fa-user-graduate"></i>
                </div>
                <div class="tutor-name">${getUserDisplayInfo(student, null, 'Student').name}</div>
                <div class="tutor-subject">${getUserDisplayInfo(student, null, 'Student').role}</div>
            </div>
            <div class="tutor-details">
                <p><i class="fas fa-envelope"></i> ${student.email}</p>
                <p><i class="fas fa-phone"></i> ${student.phone || 'Not provided'}</p>
                <p><i class="fas fa-book"></i> Subjects: ${student.subjects ? student.subjects.join(', ') : 'Not specified'}</p>
            </div>
        </div>
    `;
}

// Add event listeners to booking action buttons - SEPARATE FUNCTION
function addBookingActionListeners() {
    // Join session buttons
    document.querySelectorAll('.join-session-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const meetLink = this.getAttribute('data-meet-link');
            if (meetLink && meetLink !== '#') {
                window.open(meetLink, '_blank');
            } else {
                alert('Meeting link not available');
            }
        });
    });
    
    // Reschedule buttons - UPDATED VERSION
document.querySelectorAll('.reschedule-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        const sessionId = this.getAttribute('data-session-id');
        const booking = findBookingInCurrentSessions(sessionId); // Use the improved function
        
        if (booking) {
            openRescheduleModal(sessionId, booking);
        } else {
            console.error('Booking not found for session ID:', sessionId);
            console.log('Available pending sessions:', pendingSessions.map(s => s.id));
            console.log('Available confirmed sessions:', confirmedSessions.map(s => s.id));
        }
    });
});
    
    // Cancel buttons
    document.querySelectorAll('.cancel-booking-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            if (confirm('Are you sure you want to cancel this booking?')) {
                alert('Cancel booking functionality coming soon!');
            }
        });
    });
    
    // Modal event listeners (only add these once)
    const closeModalBtn = document.querySelector('.close-modal');
    const cancelModalBtn = document.querySelector('.cancel-modal');
    const rescheduleForm = document.getElementById('rescheduleForm');
    
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', closeRescheduleModal);
    }
    if (cancelModalBtn) {
        cancelModalBtn.addEventListener('click', closeRescheduleModal);
    }
    if (rescheduleForm) {
        rescheduleForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const sessionId = document.getElementById('rescheduleSessionId').value;
            const booking = pendingSessions.find(s => s.id === sessionId) || 
                           findBookingInCurrentSessions(sessionId);
            if (booking) {
                rescheduleSession(sessionId, booking);
            }
        });
    }
}

// Helper function to find booking in current sessions
function findBookingInCurrentSessions(sessionId) {
    // Search in both pending and confirmed sessions
    const pendingSession = pendingSessions.find(session => session.id === sessionId);
    const confirmedSession = confirmedSessions.find(session => session.id === sessionId);
    
    return pendingSession || confirmedSession || null;
}

// Load session history
function loadSessionHistory(snapshot) {
    const sessionsContainer = document.getElementById('sessionsContainer');
    
    if (snapshot.empty) {
        sessionsContainer.innerHTML = '<p>No session history found.</p>';
        return;
    }
    
    let sessionsHTML = '<table class="sessions-table">';
    sessionsHTML += `
        <thead>
            <tr>
                <th>Date</th>
                <th>Student</th>
                <th>Subject</th>
                <th>Duration</th>
                <th>Status</th>
            </tr>
        </thead>
        <tbody>
    `;
    
    snapshot.forEach(doc => {
        const session = doc.data();
        const date = session.date.toDate();
        const formattedDate = date.toLocaleDateString();
        
        sessionsHTML += `
            <tr>
                <td>${formattedDate}</td>
                <td>${session.userName}</td>
                <td>${session.subject}</td>
                <td>${session.duration || '1.5h'}</td>
                <td><span class="status-badge ${session.status === 'completed' ? 'status-verified' : ''}">${session.status}</span></td>
            </tr>
        `;
    });
    
    sessionsHTML += '</tbody></table>';
    sessionsContainer.innerHTML = sessionsHTML;
}

// Load earnings
function loadEarnings(uid, completedSessions) {
    let totalEarnings = 0;
    let sessionCount = completedSessions.size;
    let totalHours = 0;
    
    completedSessions.forEach(doc => {
        const session = doc.data();
        const hours = session.duration || 1.5; // Default to 1.5 hours if not specified
        const rate = session.hourlyRate || 40; // Default to $40 if not specified
        
        totalEarnings += hours * rate;
        totalHours += hours;
    });
    
    document.getElementById('monthlyEarnings').textContent = `$${totalEarnings.toFixed(2)}`;
    
    const earningsContainer = document.getElementById('earningsContainer');
    earningsContainer.innerHTML = `
        <table class="sessions-table">
            <thead>
                <tr>
                    <th>Metric</th>
                    <th>Value</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>Total Sessions Completed</td>
                    <td>${sessionCount}</td>
                </tr>
                <tr>
                    <td>Total Hours Tutored</td>
                    <td>${totalHours.toFixed(1)}</td>
                </tr>
                <tr>
                    <td>Total Earnings</td>
                    <td>$${totalEarnings.toFixed(2)}</td>
                </tr>
                <tr>
                    <td>Average Hourly Rate</td>
                    <td>$${sessionCount > 0 ? (totalEarnings / totalHours).toFixed(2) : '0.00'}</td>
                </tr>
            </tbody>
        </table>
    `;
}

// Load tutoring opportunities (pending sessions)
async function loadTutoringOpportunities(tutorId) {
    const container = document.getElementById('opportunitiesContainer');
    container.innerHTML = '<div class="spinner" id="opportunitiesSpinner"></div>';
    
    try {
        // Query sessions where this tutor is assigned and status is pending
        const querySnapshot = await db.collection('bookedSessions')
            .where('tutorId', '==', tutorId)
            .where('status', '==', 'pending')
            .orderBy('date', 'asc')
            .get();
        
        pendingSessions = [];
        let pendingCount = 0;
        
        container.innerHTML = '';
        
        if (querySnapshot.empty) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-calendar-times"></i>
                    <h3>No Pending Sessions</h3>
                    <p>You don't have any pending session requests at the moment.</p>
                </div>
            `;
            document.getElementById('pendingSessionsCount').textContent = '0';
            document.getElementById('pendingCount').textContent = '0';
            return;
        }

        
        // Process each session
        for (const doc of querySnapshot.docs) {
            const session = doc.data();
            session.id = doc.id;
            pendingSessions.push(session);
            
            // Get student details
            let studentData = {};
            try {
                const studentDoc = await db.collection('students').doc(session.studentId).get();
                if (studentDoc.exists) {
                    studentData = studentDoc.data();
                }
            } catch (error) {
                console.error("Error loading student data:", error);
            }
            
            // Create session card
            const sessionCard = createSessionCard(session, studentData);
            container.appendChild(sessionCard);
            pendingCount++;
        }
        
        // Update counts
        updatePendingCount(pendingCount);
        
    } catch (error) {
        console.error("Error loading tutoring opportunities:", error);
        container.innerHTML = `
            <div class="error-state">
                <i class="fas fa-exclamation-circle"></i>
                <h3>Error Loading Opportunities</h3>
                <p>Failed to load tutoring opportunities. Please try again.</p>
            </div>
        `;
    }
}

// Create session card HTML - FROM PROJECT1
function createSessionCard(session, studentData) {
    const date = session.date.toDate();
    const formattedDate = date.toLocaleDateString();
    const formattedTime = date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    
    const card = document.createElement('div');
    card.className = 'session-card';
    card.id = `session-${session.id}`;
    
    card.innerHTML = `
        <div class="session-header">
            <div class="session-title">${session.subject} Session Request</div>
            <div class="session-date">${formattedDate}, ${formattedTime}</div>
        </div>
        <div class="session-details">
            <div class="session-detail">
                <i class="fas fa-user"></i> Student: ${studentData.fullName || 'Student'}
            </div>
            <div class="session-detail">
                <i class="fas fa-book"></i> Subject: ${session.subject || 'General Tutoring'}
            </div>
            <div class="session-detail">
                <i class="fas fa-clock"></i> Duration: ${session.duration || '1.5'} hours
            </div>
            <div class="session-detail">
                <i class="fas ${session.location === 'online' ? 'fa-video' : 'fa-map-marker-alt'}"></i> 
                ${session.location === 'online' ? 'Online' : session.location}
            </div>
            ${session.notes ? `
            <div class="session-detail">
                <i class="fas fa-sticky-note"></i> Notes: ${session.notes}
            </div>
            ` : ''}
        </div>
        <div class="session-actions">
            <button class="btn-primary accept-btn" onclick="acceptSession('${session.id}')">Accept</button>
            <button class="btn-outline decline-btn" onclick="declineSession('${session.id}')">Decline</button>
        </div>
    `;
    
    return card;
}

// Update pending count
function updatePendingCount(count) {
    document.getElementById('pendingSessionsCount').textContent = count;
    document.getElementById('pendingCount').textContent = count;
}

// Accept session function
async function acceptSession(sessionId) {
    try {
        // Update session status to confirmed
        await db.collection('bookedSessions').doc(sessionId).update({
            status: 'confirmed',
            confirmedAt: firebase.firestore.FieldValue.serverTimestamp(),
            confirmedBy: 'tutor'
        });
        
        // Remove from pending display
        const sessionCard = document.getElementById(`session-${sessionId}`);
        if (sessionCard) {
            sessionCard.remove();
        }
        
        // Update counts
        const currentCount = parseInt(document.getElementById('pendingSessionsCount').textContent);
        document.getElementById('pendingSessionsCount').textContent = Math.max(0, currentCount - 1);
        document.getElementById('pendingCount').textContent = Math.max(0, currentCount - 1);
        
        // Show success message
        alert('Session accepted successfully!');
        
        // Reload tutor data to update all sections
        loadTutorData(currentUser.uid);
        
    } catch (error) {
        console.error("Error accepting session:", error);
        alert('Error accepting session. Please try again.');
    }
}

// Decline session function
async function declineSession(sessionId) {
    if (!confirm('Are you sure you want to decline this session?')) {
        return;
    }
    
    try {
        // Update session status to declined
        await db.collection('bookedSessions').doc(sessionId).update({
            status: 'declined',
            declinedAt: firebase.firestore.FieldValue.serverTimestamp(),
            declinedBy: 'tutor'
        });
        
        // Remove from pending display
        const sessionCard = document.getElementById(`session-${sessionId}`);
        if (sessionCard) {
            sessionCard.remove();
        }
        
        // Update counts
        const currentCount = parseInt(document.getElementById('pendingSessionsCount').textContent);
        document.getElementById('pendingSessionsCount').textContent = Math.max(0, currentCount - 1);
        document.getElementById('pendingCount').textContent = Math.max(0, currentCount - 1);
        
        // Show success message
        alert('Session declined successfully.');
        
        // Reload tutor data to update all sections
        loadTutorData(currentUser.uid);
        
    } catch (error) {
        console.error("Error declining session:", error);
        alert('Error declining session. Please try again.');
    }
}

// Update profile function
async function updateProfile(event) {
    event.preventDefault();
    
    if (!currentUser) return;
    
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const phone = document.getElementById('phone').value;
    
    try {
        // Update in Firestore
        await db.collection('tutors').doc(currentUser.uid).update({
            fullName: name,
            email: email,
            phone: phone,
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Update UI
        updateProfileUI({ fullName: name, email: email, phone: phone, role: 'tutor' });
        
        alert('Profile updated successfully!');
    } catch (error) {
        console.error("Error updating profile:", error);
        alert("Error updating profile. Please try again.");
    }
}

// Logout function
function logout() {
    if (confirm('Are you sure you want to logout?')) {
        clearTimeout(inactivityTimer);
        auth.signOut().then(() => {
            window.location.href = 'tutor-login.html';
        });
    }
}

// Navigation functions
function showSection(sectionId) {
    // Hide all sections
    document.querySelectorAll('.content-section').forEach(section => {
        section.style.display = 'none';
    });
    
    // Remove active class from all menu items
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Show selected section
    document.getElementById(sectionId).style.display = 'block';
    
    // Add active class to clicked menu item
    const activeMenuItem = document.querySelector(`[onclick="showSection('${sectionId}')"]`);
    if (activeMenuItem) {
        activeMenuItem.classList.add('active');
    }
    
    // Load section-specific data
    switch(sectionId) {
        case 'dashboard':
            loadTutorData(currentUser.uid);
            break;
        case 'opportunities':
            loadTutoringOpportunities(currentUser.uid);
            break;
        case 'bookings':
            loadTutorData(currentUser.uid);
            break;
        case 'students':
            loadTutorData(currentUser.uid);
            break;
        case 'history':
            loadUserSessionHistory(false);
            break;
        case 'earnings':
            loadTutorData(currentUser.uid);
            break;
        case 'profile':
            // Profile data is already loaded
            break;
    }
}

// Initialize dashboard
document.addEventListener('DOMContentLoaded', function() {
    // Set default section
    showSection('dashboard');
    
    // Add event listeners
    document.getElementById('profileForm').addEventListener('submit', updateProfile);
    
    // Add modal event listeners
    const closeModalBtn = document.querySelector('.close-modal');
    const cancelModalBtn = document.querySelector('.cancel-modal');
    const rescheduleForm = document.getElementById('rescheduleForm');
    
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', closeRescheduleModal);
    }
    if (cancelModalBtn) {
        cancelModalBtn.addEventListener('click', closeRescheduleModal);
    }
    if (rescheduleForm) {
        rescheduleForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const sessionId = document.getElementById('rescheduleSessionId').value;
            const booking = findBookingInCurrentSessions(sessionId);
            if (booking) {
                rescheduleSession(sessionId, booking);
            }
        });
    }
    
    // Add availability toggle listener
    const availabilityToggle = document.getElementById('availabilityToggle');
    if (availabilityToggle) {
        availabilityToggle.addEventListener('change', function() {
            toggleAvailability(this.checked);
        });
    }
    
    // Add logout listener
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
    
    // Add load more button listener
    const loadMoreBtn = document.getElementById('loadMoreBtn');
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', function() {
            loadUserSessionHistory(true);
        });
    }
});

// Close modal when clicking outside
window.addEventListener('click', function(event) {
    const modal = document.getElementById('rescheduleModal');
    if (event.target === modal) {
        closeRescheduleModal();
    }
});