function loadEvents() {
    fetch('/api/events')
      .then(res => res.json())
      .then(events => {
        const list = document.getElementById('eventsList');
        list.innerHTML = '';
        events.forEach(e => {
          const div = document.createElement('div');
          div.className = 'event-card';
          div.innerHTML = `
            <h2>${e.title}</h2>
            <p>Date: ${e.date} • Spots Left: ${e.maxSpots - e.signups.length}</p>
            <button onclick="viewSignups('${e.id}')">View Sign-Ups</button>
            <button onclick="deleteEvent('${e.id}')" class="danger">Delete</button>
          `;
          list.appendChild(div);
        });
      });
  }
  
  function deleteEvent(id) {
    if (!confirm('Delete this event?')) return;
    fetch(`/api/events/${id}`, { method: 'DELETE' })
      .then(() => loadEvents());
  }
  
  // Modal controls
  const createModal = document.getElementById('createModal');
  const signupsModal = document.getElementById('signupsModal');
  
  document.getElementById('createBtn').addEventListener('click', () => {
    createModal.style.display = 'flex';
  });
  document.getElementById('closeCreateModal').addEventListener('click', () => {
    createModal.style.display = 'none';
  });
  document.getElementById('closeSignupsModal').addEventListener('click', () => {
    signupsModal.style.display = 'none';
  });
  window.addEventListener('click', e => {
    if (e.target === createModal) createModal.style.display = 'none';
    if (e.target === signupsModal) signupsModal.style.display = 'none';
  });
  
  // Create event form submit
  document.getElementById('createEventForm').addEventListener('submit', e => {
    e.preventDefault();
    const title = document.getElementById('title').value;
    const date = document.getElementById('date').value;
    const location = document.getElementById('location').value;
    const hours = document.getElementById('hours').value;
    const maxSpots = document.getElementById('maxSpots').value;
    
    fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, date, location, hours, maxSpots })
    })
    .then(() => {
      createModal.style.display = 'none';
      e.target.reset();
      loadEvents();
    });
  });
  
  // View signups in modal
  function viewSignups(id) {
    fetch(`/api/events/${id}`)
      .then(res => res.json())
      .then(event => {
        document.getElementById('signupsTitle').textContent = `Sign-Ups for ${event.title}`;
        const tbody = document.getElementById('signupsTable').querySelector('tbody');
        tbody.innerHTML = '';
        if (event.signups.length === 0) {
          tbody.innerHTML = `<tr><td colspan="2">No sign-ups yet</td></tr>`;
        } else {
          event.signups.forEach((name, index) => {
            const row = `<tr><td>${index + 1}</td><td>${name}</td></tr>`;
            tbody.innerHTML += row;
          });
        }
        signupsModal.style.display = 'flex';
      });
  }
  
  loadEvents();
  