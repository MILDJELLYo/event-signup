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
      div.innerHTML = `
        <h2>${e.title}</h2>
        <p>${e.date} • ${e.location}</p>
        <p>Spots left: ${e.maxSpots - e.signups.length}</p>
        <a href="event.html?id=${e.id}"><button>Sign Up</button></a>
      `;
      list.appendChild(div);
    });
  });
