const list = document.getElementById('eventsList');
const dateScroll = document.getElementById('dateScroll');

function requireLogin(req, res, next) {
  if (!req.session.user) {
    return res.redirect('/login.html'); // redirect if not logged in
  }
  next();
}

// Helper function to parse date correctly (prevents timezone shift)
function parseLocalDate(dateString) {
  // If it's already a date object, return it
  if (dateString instanceof Date) return dateString;
  
  // Parse as local date (YYYY-MM-DD format)
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
}

fetch('/api/events')
  .then(res => res.json())
  .then(events => {
    if (!events.length) {
      list.innerHTML = "<p>No events yet.</p>";
      return;
    }

    // Group events by date
    const eventsByDate = {};
    events.forEach(e => {
      const dateObj = parseLocalDate(e.date);
      const dateKey = dateObj.toDateString();
      if (!eventsByDate[dateKey]) eventsByDate[dateKey] = [];
      eventsByDate[dateKey].push(e);
    });

    // Determine month to display (use earliest event)
    const firstEventDate = parseLocalDate(events[0].date);
    const year = firstEventDate.getFullYear();
    const month = firstEventDate.getMonth(); // 0-based
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayKey = today.toDateString();

    // Create horizontal month calendar
    let todayButton = null;
    for (let day = 1; day <= daysInMonth; day++) {
      const dateObj = new Date(year, month, day);
      const dateKey = dateObj.toDateString();
      const weekday = dateObj.toLocaleString('en-US', { weekday: 'short' });

      const btn = document.createElement('button');
      btn.innerHTML = `<span class="day-num">${day}</span><span class="weekday">${weekday}</span>`;

      // Highlight today
      if (dateKey === todayKey) {
        btn.classList.add('today');
        todayButton = btn;
      }

      // Highlight if there is an event
      if (eventsByDate[dateKey]) {
        btn.classList.add('has-event');
        btn.addEventListener('click', () => {
          document.getElementById(dateKey).scrollIntoView({ behavior: 'smooth', block: 'start' });
          document.querySelectorAll('#dateScroll button').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
        });
      }

      dateScroll.appendChild(btn);
    }

    // Auto-scroll date bar to today
    if (todayButton) {
      todayButton.scrollIntoView({ behavior: 'smooth', inline: 'center' });
    }

    // Render events grouped by day
    Object.keys(eventsByDate).forEach(dateStr => {
      const dayHeader = document.createElement('div');
      dayHeader.className = 'event-date-header';
      const dateObj = new Date(dateStr);
      dayHeader.textContent = dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
      dayHeader.id = dateStr;
      list.appendChild(dayHeader);

      eventsByDate[dateStr].forEach(e => {
        const div = document.createElement('div');
        div.className = 'event-card';

        const dateObj = parseLocalDate(e.date);
        const monthShort = dateObj.toLocaleString('en-US', { month: 'short' });
        const dayNum = dateObj.getDate();

        div.innerHTML = `
          <div class="event-date">
            <span class="month">${monthShort}</span>
            <span class="day">${dayNum}</span>
          </div>
          <div class="event-details">
            <h3>${e.title}</h3>
            <p class="event-location"><i class="fas fa-map-marker-alt"></i> ${e.location}</p>
            <p class="event-time"><i class="fas fa-clock"></i> ${e.timeSlots.length} time slot(s)</p>
            <a href="event.html?id=${e.id}" class="btn">View & Sign Up</a>
          </div>
        `;
        list.appendChild(div);
      });
    });
  })
  .catch(err => {
    console.error('Failed to load events:', err);
    list.innerHTML = "<p>Unable to load events.</p>";
  });