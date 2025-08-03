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
      const dateStr = new Date(e.date).toLocaleDateString('en-US');
      div.innerHTML = `
        <h2>${e.title}</h2>
        <p>${dateStr} • ${e.location}</p>
        <p>${e.timeSlots.length} time slot(s)</p>
        <a href="event.html?id=${e.id}"><button>View & Sign Up</button></a>
      `;
      list.appendChild(div);
    });
  });
