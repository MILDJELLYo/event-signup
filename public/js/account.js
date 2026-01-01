/**************************************
 * ACCOUNT PAGE
 **************************************/

const REQUIRED_HOURS = 30;
const REQUIRED_MEETINGS = 9;

/**************************************
 * FETCH USER DATA
 **************************************/
async function fetchAccountData() {
  try {
    const res = await fetch('/api/userinfo');
    if (!res.ok) {
      throw new Error('Failed to load user data');
    }

    const data = await res.json();
    console.log('User data:', data);

    renderAccountData(data);

    // Hide loading, show content
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('accountContent').style.display = 'block';

  } catch (error) {
    console.error('Error fetching account data:', error);
    document.getElementById('loadingState').innerHTML = `
      <i class="fas fa-exclamation-triangle" style="color:#dc2626; font-size:2.5rem; margin-bottom:1rem;"></i>
      <p style="color:#dc2626;">Error loading account data. Please refresh the page.</p>
    `;
  }
}

/**************************************
 * RENDER ACCOUNT DATA
 **************************************/
function renderAccountData(data) {
  const serviceHours = data.serviceHours ?? 0;
  const meetingCredit = data.meetingCredit ?? 0;
  const position = data.position || 'Member';
  const events = Array.isArray(data.events) ? data.events : [];

  // Update quick stats
  document.getElementById('hoursValue').textContent = serviceHours;
  document.getElementById('meetingsValue').textContent = meetingCredit;
  document.getElementById('eventsValue').textContent = events.length;
  document.getElementById('positionValue').textContent = position;

  // Color code stats based on completion
  const hoursCard = document.getElementById('hoursCard');
  if (serviceHours >= REQUIRED_HOURS) {
    hoursCard.classList.add('success');
  } else if (serviceHours >= REQUIRED_HOURS * 0.7) {
    hoursCard.classList.add('warning');
  }

  const meetingsCard = document.getElementById('meetingsCard');
  if (meetingCredit >= REQUIRED_MEETINGS) {
    meetingsCard.classList.add('success');
  } else if (meetingCredit >= REQUIRED_MEETINGS * 0.7) {
    meetingsCard.classList.add('warning');
  }

  // Update progress section
  updateProgress(serviceHours);

  // Render events table
  renderEvents(events);

  // Download button
  document.getElementById('downloadBtn').onclick = () => {
    downloadReport(data);
  };
}

/**************************************
 * UPDATE PROGRESS VISUALIZATION
 **************************************/
function updateProgress(serviceHours) {
  const percentage = Math.min((serviceHours / REQUIRED_HOURS) * 100, 100);
  const remaining = Math.max(REQUIRED_HOURS - serviceHours, 0);

  // Circular progress
  const circumference = 2 * Math.PI * 65; // r=65
  const offset = circumference - (percentage / 100) * circumference;
  
  const circularBar = document.getElementById('circularBar');
  circularBar.style.strokeDashoffset = offset;
  
  if (percentage >= 100) {
    circularBar.classList.add('complete');
  }

  document.getElementById('circularValue').textContent = Math.round(percentage) + '%';

  // Linear progress
  const linearBar = document.getElementById('linearBar');
  linearBar.style.width = percentage + '%';
  
  if (percentage >= 100) {
    linearBar.classList.add('complete');
  }

  document.getElementById('progressText').textContent = 
    `${serviceHours} / ${REQUIRED_HOURS} hours`;

  // Progress badge
  const badge = document.getElementById('progressBadge');
  if (percentage >= 100) {
    badge.textContent = 'Completed';
    badge.className = 'badge success';
    badge.innerHTML = '<i class="fas fa-check-circle"></i> Completed';
  } else if (percentage >= 70) {
    badge.textContent = 'Almost There';
    badge.className = 'badge warning';
    badge.innerHTML = '<i class="fas fa-clock"></i> Almost There';
  } else {
    badge.textContent = 'In Progress';
    badge.className = 'badge danger';
    badge.innerHTML = '<i class="fas fa-hourglass-half"></i> In Progress';
  }

  // Hours remaining text
  const remainingText = document.getElementById('hoursRemaining');
  if (remaining === 0) {
    remainingText.textContent = '🎉 You\'ve met the service hour requirement!';
    remainingText.style.color = '#059669';
    remainingText.style.fontWeight = '600';
  } else {
    remainingText.textContent = `${remaining} hours remaining to meet requirement`;
    remainingText.style.color = '#6b7280';
  }
}

/**************************************
 * RENDER EVENTS TABLE
 **************************************/
function renderEvents(events) {
  const container = document.getElementById('eventsGrid');

  if (events.length === 0) {
    container.innerHTML = `
      <div class="no-events">
        <i class="fas fa-calendar-times"></i>
        <p>No service shifts recorded yet</p>
        <p style="font-size: 0.9rem; margin-top: 0.5rem;">
          <a href="eventlist.html" style="color: #b91c1c; text-decoration: underline;">
            Browse upcoming events
          </a>
        </p>
      </div>
    `;
    return;
  }

  let html = '';
  events.forEach(event => {
    const eventName = event.eventName || event.name || 'Unknown Event';
    const hours = event.hoursEarned ?? event.hours ?? 0;

    html += `
      <div class="event-row">
        <div class="event-name">
          <i class="fas fa-check-circle" style="color: #059669; margin-right: 0.5rem;"></i>
          ${eventName}
        </div>
        <div class="event-hours">
          <i class="fas fa-clock"></i>
          ${hours} ${hours === 1 ? 'hour' : 'hours'}
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

/**************************************
 * DOWNLOAD REPORT
 **************************************/
function downloadReport(data) {
  const serviceHours = data.serviceHours ?? 0;
  const meetingCredit = data.meetingCredit ?? 0;
  const position = data.position || 'Member';
  const events = Array.isArray(data.events) ? data.events : [];

  let reportText = `MHS STUDENT COUNCIL - SERVICE REPORT
========================================

Name: ${data.name || 'N/A'}
Email: ${data.identifier || data.email || 'N/A'}
Position: ${position}

SERVICE HOURS
-------------
Completed: ${serviceHours} hours
Required: ${REQUIRED_HOURS} hours
Status: ${serviceHours >= REQUIRED_HOURS ? 'COMPLETED ✓' : `NEEDS ${REQUIRED_HOURS - serviceHours} MORE HOURS`}

MEETINGS
--------
Attended: ${meetingCredit} meetings
Required: ${REQUIRED_MEETINGS} meetings
Status: ${meetingCredit >= REQUIRED_MEETINGS ? 'COMPLETED ✓' : `NEEDS ${REQUIRED_MEETINGS - meetingCredit} MORE MEETINGS`}

SERVICE SHIFTS COMPLETED
------------------------
`;

  if (events.length === 0) {
    reportText += 'No service shifts recorded.\n';
  } else {
    events.forEach((event, index) => {
      const eventName = event.eventName || event.name || 'Unknown Event';
      const hours = event.hoursEarned ?? event.hours ?? 0;
      reportText += `${index + 1}. ${eventName} - ${hours} hours\n`;
    });
  }

  reportText += `
========================================
Generated on: ${new Date().toLocaleString()}
`;

  // Create downloadable file
  const blob = new Blob([reportText], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `service_report_${new Date().toISOString().split('T')[0]}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  alert('Report downloaded successfully!');
}

/**************************************
 * INIT
 **************************************/
window.addEventListener('DOMContentLoaded', fetchAccountData);