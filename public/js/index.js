fetch('/api/events')
  .then(res => res.json())
  .then(events => {
    const list = document.getElementById('eventsList');
    if (!events.length) {
      list.innerHTML = "<p>No events yet.</p>";
      return;
    }
    events.forEach(e => {
      const div = document.createElement('div');
      div.className = 'event-card';

      // Extract month/day
      const dateObj = new Date(e.date);
      const month = dateObj.toLocaleString('en-US', { month: 'short' });
      const day = dateObj.getDate();

      div.innerHTML = `
        <div class="event-date">
          <span class="month">${month}</span>
          <span class="day">${day}</span>
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
