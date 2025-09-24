// Profile Edit Button Handler
document.getElementById('editProfileBtn').addEventListener('click', function() {
  const profileForm = document.getElementById('profileForm');
  if (profileForm.style.display === 'none') {
    profileForm.style.display = 'block';
    this.textContent = 'Cancel Edit';
  } else {
    profileForm.style.display = 'none';
    this.textContent = 'Edit Profile';
  }
});

// Save Profile Button Handler
document.getElementById('saveProfileBtn').addEventListener('click', function() {
  const name = document.getElementById('fullName').value;
  const phone = document.getElementById('phone').value;
  
  if (!name) {
    alert('Please enter your name.');
    return;
  }
  
  // Update user data in Firestore
  const userId = auth.currentUser.uid;
  db.collection('students').doc(userId).update({
    name: name,
    phone: phone,
    updatedAt: new Date()
  })
  .then(() => {
    alert('Profile updated successfully!');
    document.getElementById('profileForm').style.display = 'none';
    document.getElementById('editProfileBtn').textContent = 'Edit Profile';
    
    // Update displayed user info
    document.getElementById('userName').textContent = name;
    document.getElementById('profileName').textContent = name;
    userData.name = name;
    userData.phone = phone;
  })
  .catch((error) => {
    console.error('Error updating profile:', error);
    alert('Failed to update profile. Please try again.');
  });
});

// Logout Button Handler
document.getElementById('logoutBtn').addEventListener('click', function() {
  if (confirm('Are you sure you want to logout?')) {
    auth.signOut().then(() => {
      window.location.href = 'student-login.html';
    });
  }
});

// User Data Loading (from auth state change)
auth.onAuthStateChanged((user) => {
  if (user) {
    currentUser = user;
    
    // Get user data from Firestore
    db.collection('students').doc(user.uid).get()
      .then((doc) => {
        if (doc.exists) {
          userData = doc.data();
          
          // Update UI with user data
          document.getElementById('userName').textContent = userData.name || 'Unknown User';
          document.getElementById('profileName').textContent = userData.name || 'Unknown User';
          document.getElementById('profileEmail').textContent = user.email;
          document.getElementById('fullName').value = userData.name || '';
          document.getElementById('email').value = user.email;
          document.getElementById('phone').value = userData.phone || '';
        } else {
          console.error('No user data found');
          alert('Error loading user data. Please try logging in again.');
          auth.signOut();
        }
      })
      .catch((error) => {
        console.error('Error getting user data:', error);
        alert('Error loading user data. Please try again.');
      });
  } else {
    // User is not logged in, redirect to login page
    window.location.href = 'student-login.html';
  }
});



function loadTutorsForScheduling() {
  const tutorSelect = document.getElementById('tutor');
  const tutorSpinner = document.getElementById('tutorSpinner');
  
  // Clear existing options except the first one
  while (tutorSelect.options.length > 1) {
    tutorSelect.remove(1);
  }
  
  tutorSpinner.style.display = 'block';
  
  // Query tutors who are available and approved
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
        
        // Extract tutor name and subjects
        const tutorName = tutor.personal?.fullName || 'Unknown Tutor';
        let subjectsText = 'No subjects listed';
        
        // Check for nested subjects structure
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


// Set up tutor selection change event
document.getElementById('tutor').addEventListener('change', function() {
  const tutorId = this.value;
  const subjectSelect = document.getElementById('subject');
  const priceSummary = document.getElementById('priceSummary');
  const hourlyRateSpan = document.getElementById('hourlyRate');
  const durationDisplay = document.getElementById('durationDisplay');
  const totalPriceSpan = document.getElementById('totalPrice');
  
  if (!tutorId) {
    subjectSelect.innerHTML = '<option value="">Select a tutor first</option>';
    subjectSelect.disabled = true;
    priceSummary.style.display = 'none';
    return;
  }
  
  // Get tutor data to populate subjects and hourly rate
  db.collection('tutors').doc(tutorId).get()
    .then((doc) => {
      if (doc.exists) {
        const tutor = doc.data();
        
        // Populate subjects
        subjectSelect.innerHTML = '';
        let subjects = [];
        
        // Check for nested subjects structure
        if (tutor.subjects && tutor.subjects.subjects && tutor.subjects.subjects.length > 0) {
          subjects = tutor.subjects.subjects;
        } else if (tutor.subjects && Array.isArray(tutor.subjects)) {
          subjects = tutor.subjects;
        }
        
        if (subjects.length > 0) {
          subjects.forEach(subject => {
            const option = document.createElement('option');
            option.value = subject;
            option.textContent = subject;
            subjectSelect.appendChild(option);
          });
          subjectSelect.disabled = false;
        } else {
          subjectSelect.innerHTML = '<option value="">No subjects available</option>';
          subjectSelect.disabled = true;
        }
        
        // Show price summary
        const hourlyRate = parseFloat(tutor.professional?.hourlyRate) || 30;
        const duration = parseFloat(document.getElementById('duration').value) || 1.5;
        const totalPrice = hourlyRate * duration;
        
        hourlyRateSpan.textContent = hourlyRate;
        durationDisplay.textContent = duration;
        totalPriceSpan.textContent = totalPrice.toFixed(2);
        priceSummary.style.display = 'block';
      }
    })
    .catch((error) => {
      console.error('Error loading tutor details:', error);
      subjectSelect.innerHTML = '<option value="">Error loading subjects</option>';
      subjectSelect.disabled = true;
      priceSummary.style.display = 'none';
    });
});



// Set up duration change event to update price
document.getElementById('duration').addEventListener('change', function() {
  const tutorSelect = document.getElementById('tutor');
  const tutorId = tutorSelect.value;
  
  if (!tutorId) return;
  
  // Get tutor hourly rate
  db.collection('tutors').doc(tutorId).get()
    .then((doc) => {
      if (doc.exists) {
        const tutor = doc.data();
        const hourlyRate = parseFloat(tutor.professional?.hourlyRate) || 30;
        const duration = parseFloat(this.value) || 1.5;
        const totalPrice = hourlyRate * duration;
        
        document.getElementById('hourlyRate').textContent = hourlyRate;
        document.getElementById('durationDisplay').textContent = duration;
        document.getElementById('totalPrice').textContent = totalPrice.toFixed(2);
      }
    })
    .catch((error) => {
      console.error('Error loading tutor details:', error);
    });
});


// Set up scheduling form submission
document.getElementById('schedulingForm').addEventListener('submit', function(e) {
  e.preventDefault();
  
  const tutorId = document.getElementById('tutor').value;
  const subject = document.getElementById('subject').value;
  const date = document.getElementById('date').value;
  const time = document.getElementById('time').value;
  const duration = document.getElementById('duration').value;
  const sessionType = document.getElementById('sessionType').value;
  const notes = document.getElementById('notes').value;
  
  if (!tutorId || !subject || !date || !time) {
    alert('Please fill in all required fields.');
    return;
  }
  
  // Combine date and time
  const dateTime = new Date(`${date}T${time}`);
  
  // Get tutor details for the booking
  db.collection('tutors').doc(tutorId).get()
    .then((tutorDoc) => {
      if (!tutorDoc.exists) {
        alert('Selected tutor not found.');
        return;
      }
      
      const tutor = tutorDoc.data();
      const studentId = auth.currentUser.uid;
      const studentName = userData?.name || 'Unknown Student';
      
      // Generate a unique slot ID
      const slotId = 'slot_' + Date.now();
      
      // Create booking in the bookedSessions collection
      db.collection('bookedSessions').add({
        slotId: slotId,
        tutorId: tutorId,
        tutorName: tutor.personal?.fullName || 'Unknown Tutor',
        studentId: studentId,
        studentName: studentName,
        subject: subject,
        date: dateTime,
        duration: duration,
        sessionType: sessionType,
        notes: notes,
        status: 'pending',
        bookedAt: new Date(),
        hourlyRate: parseFloat(tutor.professional?.hourlyRate) || 30,
        totalPrice: (parseFloat(tutor.professional?.hourlyRate) || 30) * parseFloat(duration)
      })
      .then((docRef) => {
        alert('Session booked successfully! It is now pending confirmation from the tutor.');
        document.getElementById('schedulingForm').reset();
        document.getElementById('priceSummary').style.display = 'none';
        document.getElementById('subject').innerHTML = '<option value="">Select a tutor first</option>';
        document.getElementById('subject').disabled = true;
        
        // Immediately add the new booking to the UI
        addBookingToUI(docRef.id, {
          slotId: slotId,
          tutorId: tutorId,
          tutorName: tutor.personal?.fullName || 'Unknown Tutor',
          studentId: studentId,
          studentName: studentName,
          subject: subject,
          date: firebase.firestore.Timestamp.fromDate(dateTime),
          duration: duration,
          sessionType: sessionType,
          notes: notes,
          status: 'pending',
          bookedAt: new Date(),
          hourlyRate: parseFloat(tutor.professional?.hourlyRate) || 30,
          totalPrice: (parseFloat(tutor.professional?.hourlyRate) || 30) * parseFloat(duration)
        });
      })
      .catch((error) => {
        console.error('Error creating booking:', error);
        alert('Failed to book session. Please try again.');
      });
    })
    .catch((error) => {
      console.error('Error getting tutor details:', error);
      alert('Failed to book session. Please try again.');
    });
});


// Add new booking to UI immediately
function addBookingToUI(bookingId, bookingData) {
  const container = document.getElementById('bookingsContainer');
  
  // Format date and time
  const date = bookingData.date.toDate();
  const formattedDate = date.toLocaleDateString();
  const formattedTime = date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  
  // Create booking card HTML
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
  
  // If container has empty state message, replace it
  if (container.innerHTML.includes('no upcoming bookings') || container.innerHTML.includes('<p>Loading')) {
    container.innerHTML = bookingCard;
  } else {
    // Prepend the new booking to the top
    container.innerHTML = bookingCard + container.innerHTML;
  }
  
  // Update upcoming sessions count
  const currentCount = parseInt(document.getElementById('upcomingSessionsCount').textContent);
  document.getElementById('upcomingSessionsCount').textContent = currentCount + 1;
}


// Book a tutor function (used from tutors section)
function bookTutor(tutorId) {
  // Switch to scheduling tab and pre-select the tutor
  document.querySelectorAll('.menu-item a').forEach(a => a.classList.remove('active'));
  document.querySelector('.dashboard-section.active').classList.remove('active');
  
  document.querySelector('a[data-section="scheduling"]').classList.add('active');
  document.getElementById('scheduling').classList.add('active');
  
  // Wait for the scheduling section to be visible, then select the tutor
  setTimeout(() => {
    const tutorSelect = document.getElementById('tutor');
    tutorSelect.value = tutorId;
    
    // Trigger change event to load subjects
    const event = new Event('change');
    tutorSelect.dispatchEvent(event);
  }, 100);
}


// In the navigation setup - loads scheduling data when section is activated
if (sectionId === 'scheduling') {
  loadTutorsForScheduling();
}


// Loading Tutors

function loadMyTutors() {
  const container = document.getElementById('myTutorsContainer');
  container.innerHTML = '<div class="spinner"></div>';
  
  // Get the current user ID
  const userId = auth.currentUser.uid;
  
  // Query sessions where this student is involved and status is completed
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
      
      // Collect unique tutor IDs
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
      
      // Get tutor details for each tutor ID
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


function loadAvailableTutors() {
  const container = document.getElementById('availableTutorsContainer');
  container.innerHTML = '<div class="spinner" id="tutorsSpinner"></div>';
  
  // Query tutors who are available and approved
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


function bookTutor(tutorId) {
  // Switch to scheduling tab and pre-select the tutor
  document.querySelectorAll('.menu-item a').forEach(a => a.classList.remove('active'));
  document.querySelector('.dashboard-section.active').classList.remove('active');
  
  document.querySelector('a[data-section="scheduling"]').classList.add('active');
  document.getElementById('scheduling').classList.add('active');
  
  // Wait for the scheduling section to be visible, then select the tutor
  setTimeout(() => {
    const tutorSelect = document.getElementById('tutor');
    tutorSelect.value = tutorId;
    
    // Trigger change event to load subjects
    const event = new Event('change');
    tutorSelect.dispatchEvent(event);
  }, 100);
}


// Set up tabs in the tutors section
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', function() {
    // Update active tab
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    this.classList.add('active');
    
    // Show the corresponding tab content
    const tabId = this.getAttribute('data-tab');
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.remove('active');
    });
    document.getElementById(`${tabId}-tab`).classList.add('active');
    
    // Show search only for available tutors
    const searchContainer = document.getElementById('tutorSearchContainer');
    if (tabId === 'available-tutors') {
      searchContainer.style.display = 'block';
    } else {
      searchContainer.style.display = 'none';
    }
  });
});


} else if (sectionId === 'tutors') {
  // Load both my tutors and available tutors when the tutors section is opened
  if (!tutorsLoaded) {
    loadMyTutors();
    loadAvailableTutors();
    tutorsLoaded = true;
  }
}


//Dashboard Display Features
// Update upcoming sessions count
function updateUpcomingSessionsCount(count) {
  document.getElementById('upcomingSessionsCount').textContent = count;
}

// Update user stats (called during initialization)
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

// Load user bookings (updates upcoming sessions count)
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
        });
}


// Load user bookings
function loadUserBookings() {
    const userId = auth.currentUser.uid;
    
    // Query upcoming bookings including reschedule requests
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

// Load bookings into UI
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
        
        // Check if this booking has a reschedule request
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
        
        // Store promise for loading reschedule data if needed
        if (hasRescheduleRequest) {
            bookingPromises.push(loadRescheduleData(doc.id));
        }
    });

    container.innerHTML = html;
    
    // Load reschedule data for all bookings that need it
    Promise.all(bookingPromises).then(() => {
        console.log('All reschedule data loaded');
    }).catch(error => {
        console.error('Error loading reschedule data:', error);
    });
    
    // Add filter functionality
    setupBookingFilter();
}

// Load reschedule data from rescheduleRequests collection
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
            
            // Update the UI elements
            const proposedTimeElement = document.getElementById(`proposedTime-${bookingId}`);
            const reasonElement = document.getElementById(`rescheduleReason-${bookingId}`);
            
            if (proposedTimeElement) proposedTimeElement.textContent = proposedTime;
            if (reasonElement) reasonElement.textContent = reason;
        } else {
            // No reschedule request found, show default values
            const proposedTimeElement = document.getElementById(`proposedTime-${bookingId}`);
            const reasonElement = document.getElementById(`rescheduleReason-${bookingId}`);
            
            if (proposedTimeElement) proposedTimeElement.textContent = 'Not specified';
            if (reasonElement) reasonElement.textContent = 'No reason provided';
        }
    } catch (error) {
        console.error('Error loading reschedule data:', error);
        
        // Show error state
        const proposedTimeElement = document.getElementById(`proposedTime-${bookingId}`);
        const reasonElement = document.getElementById(`rescheduleReason-${bookingId}`);
        
        if (proposedTimeElement) proposedTimeElement.textContent = 'Error loading';
        if (reasonElement) reasonElement.textContent = 'Error loading';
    }
}

// Cancel a booking
function cancelBooking(bookingId) {
    if (confirm('Are you sure you want to cancel this booking?')) {
        // Update the booking status to cancelled
        db.collection('bookedSessions').doc(bookingId).update({
            status: 'cancelled',
            cancelledAt: new Date(),
            cancelledBy: 'student'
        })
        .then(() => {
            alert('Booking cancelled successfully.');
            // Reload the bookings
            loadUserBookings();
        })
        .catch((error) => {
            console.error('Error cancelling booking:', error);
            alert('Failed to cancel booking. Please try again.');
        });
    }
}

// Accept reschedule request
async function acceptReschedule(bookingId) {
    try {
        // Find the reschedule request to get the proposed new time
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
        
        // Update the booking with the new date
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
        
        // Also update in sessions history if it exists
        await updateSessionHistory(bookingId, newDate, originalDate);
        
        // Update the reschedule request status
        await updateRescheduleRequest(bookingId, 'accepted');
        
        alert('Reschedule accepted! The session has been updated.');
        loadUserBookings(); // Refresh the bookings display
        
    } catch (error) {
        console.error('Error accepting reschedule:', error);
        alert('Failed to accept reschedule. Please try again.');
    }
}

// Decline reschedule request
async function declineReschedule(bookingId) {
    const reason = prompt('Please provide a reason for declining the reschedule request:');
    if (reason === null) return; // User cancelled
    
    try {
        // Update the booking status back to confirmed (no date change needed)
        await db.collection('bookedSessions').doc(bookingId).update({
            status: 'confirmed',
            rescheduleStatus: 'declined',
            rescheduleDeclineReason: reason,
            rescheduleRespondedAt: new Date()
        });
        
        // Update the reschedule request status
        await updateRescheduleRequest(bookingId, 'declined');
        
        alert('Reschedule request declined.');
        loadUserBookings(); // Refresh the bookings display
        
    } catch (error) {
        console.error('Error declining reschedule:', error);
        alert('Failed to decline reschedule. Please try again.');
    }
}

// Update reschedule request in the rescheduleRequests collection
async function updateRescheduleRequest(bookingId, status) {
    try {
        // Find the reschedule request for this booking
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

// Helper function to update session history
async function updateSessionHistory(bookingId, newDate, originalDate) {
    try {
        // Check if this session exists in history
        const sessionQuery = await db.collection('sessions')
            .where('bookingId', '==', bookingId)
            .get();
            
        if (!sessionQuery.empty) {
            // Update existing session record
            const sessionDoc = sessionQuery.docs[0];
            await db.collection('sessions').doc(sessionDoc.id).update({
                date: newDate,
                originalDate: originalDate,
                rescheduled: true,
                rescheduleAcceptedAt: new Date()
            });
        } else {
            // Create a new session history record
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
        // Don't fail the whole operation if history update fails
    }
}

// Setup booking filter
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
                    // You might want to add logic to hide past sessions
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

// Real-time listener for reschedule requests
function setupRescheduleListener() {
    const userId = auth.currentUser.uid;
    
    db.collection('bookedSessions')
        .where('studentId', '==', userId)
        .where('status', 'in', ['reschedule_requested', 'confirmed', 'pending'])
        .onSnapshot((snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'modified') {
                    const booking = change.doc.data();
                    
                    // Check if this is a new reschedule request
                    if (booking.status === 'reschedule_requested') {
                        // Show notification to student
                        showRescheduleNotification(change.doc.id, booking);
                    }
                }
            });
        });
}

// Add new booking to UI immediately
function addBookingToUI(bookingId, bookingData) {
    const container = document.getElementById('bookingsContainer');
    
    // Format date and time
    const date = bookingData.date.toDate();
    const formattedDate = date.toLocaleDateString();
    const formattedTime = date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    
    // Create booking card HTML
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
    
    // If container has empty state message, replace it
    if (container.innerHTML.includes('no upcoming bookings') || container.innerHTML.includes('<p>Loading')) {
        container.innerHTML = bookingCard;
    } else {
        // Prepend the new booking to the top
        container.innerHTML = bookingCard + container.innerHTML;
    }
    
    // Update upcoming sessions count
    const currentCount = parseInt(document.getElementById('upcomingSessionsCount').textContent);
    document.getElementById('upcomingSessionsCount').textContent = currentCount + 1;
}

// Update upcoming sessions count
function updateUpcomingSessionsCount(count) {
    const countElement = document.getElementById('upcomingSessionsCount');
    if (countElement) {
        countElement.textContent = count;
    }
}


//Session History Data Structure

// Available timestamp fields in bookedSessions collection
bookedAt: timestamp        // When student initially booked
confirmedAt: timestamp     // When tutor confirmed
cancelledAt: timestamp     // When session was cancelled
rescheduleRequestedAt: timestamp  // When reschedule was requested
rescheduleRespondedAt: timestamp  // When reschedule was responded to
date: timestamp            // Scheduled session date/time

function getActionTimestamp(session) {
  let actionTime = new Date();
  let actionType = 'Unknown';
  
  // Priority order for determining the most relevant action
  if (session.cancelledAt) {
    actionTime = session.cancelledAt.toDate();
    actionType = session.cancelledBy === 'student' ? 'Student Cancelled' : 
                session.cancelledBy === 'tutor' ? 'Tutor Cancelled' : 'Cancelled';
  } else if (session.completedAt) {
    actionTime = session.completedAt.toDate();
    actionType = 'Completed';
  } else if (session.rescheduleAcceptedAt) {
    actionTime = session.rescheduleAcceptedAt.toDate();
    actionType = 'Rescheduled';
  } else if (session.rescheduleRequestedAt) {
    actionTime = session.rescheduleRequestedAt.toDate();
    actionType = session.rescheduleRequestedBy === 'tutor' ? 'Tutor Reschedule Request' :
                session.rescheduleRequestedBy === 'student' ? 'Student Reschedule Request' : 'Reschedule Requested';
  } else if (session.confirmedAt) {
    actionTime = session.confirmedAt.toDate();
    actionType = session.autoConfirmed ? 'Auto-Confirmed' : 'Tutor Confirmed';
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
    case 'completed': return 'status-verified';
    case 'pending': return 'status-pending';
    case 'cancelled': return 'status-cancelled';
    case 'reschedule_requested': return 'status-reschedule-requested';
    default: return 'status-pending';
  }
}

function getActionTypeClass(actionType) {
  switch(actionType.toLowerCase()) {
    case 'student booked':
    case 'tutor confirmed':
    case 'auto-confirmed':
    case 'completed': return 'status-verified';
    case 'student cancelled':
    case 'tutor cancelled':
    case 'cancelled': return 'status-pending';
    case 'tutor reschedule request':
    case 'student reschedule request':
    case 'reschedule requested':
    case 'rescheduled': return 'status-warning';
    default: return 'status-pending';
  }
}


// Query to load session history
function loadUserSessionHistory(loadMore = false) {
  const userId = auth.currentUser.uid;
  let query = db.collection('bookedSessions')
    .where('studentId', '==', userId)
    .orderBy('date', 'desc')  // Most recent first
    .limit(10);               // Pagination

  // Additional filtering options available:
  const filterOptions = {
    time: ['all', 'month', '3months', 'year'],
    actionType: [
      'all', 'student booked', 'tutor confirmed', 'auto-confirmed',
      'completed', 'student cancelled', 'tutor cancelled',
      'tutor reschedule request', 'student reschedule request', 'rescheduled'
    ]
  };
}


