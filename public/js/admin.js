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
          <button onclick="copyLink('${e.id}')">Copy Link</button>
          <button onclick="deleteEvent('${e.id}')" class="danger">Delete</button>
        `;
        list.appendChild(div);
      });
    });
}

function copyLink(id) {
  const url = `${window.location.origin}/event.html?id=${id}`;
  navigator.clipboard.writeText(url).then(() => {
    alert("Signup link copied to clipboard!");
  });
}

function deleteEvent(id) {
  if (!confirm('Delete this event?')) return;
  fetch(`/api/events/${id}`, { method: 'DELETE' })
    .then(() => loadEvents());
}

// Modal handling
const createModal = document.getElementById('createModal');
document.getElementById('createBtn').addEventListener('click', () => createModal.style.display = 'flex');
document.getElementById('closeCreateModal').addEventListener('click', () => createModal.style.display = 'none');
window.addEventListener('click', e => { if (e.target === createModal) createModal.style.display = 'none'; });

document.getElementById('createEventForm').addEventListener('submit', e => {
  e.preventDefault();
  const eventData = {
    title: document.getElementById('title').value,
    date: document.getElementById('date').value,
    location: document.getElementById('location').value,
    hours: document.getElementById('hours').value,
    maxSpots: document.getElementById('maxSpots').value,
    description: document.getElementById('description').value,
    contactName: document.getElementById('contactName').value,
    contactEmail: document.getElementById('contactEmail').value
  };
  
  fetch('/api/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(eventData)
  })
  .then(() => {
    createModal.style.display = 'none';
    e.target.reset();
    loadEvents();
  });
});

function viewSignups(id) {
  fetch(`/api/events/${id}`)
    .then(res => res.json())
    .then(event => {
      document.getElementById('signupsTitle').textContent = `Sign-Ups for ${event.title}`;
      const tbody = document.querySelector('#signupsTable tbody');
      tbody.innerHTML = event.signups.length ? 
        event.signups.map((n, i) => `<tr><td>${i + 1}</td><td>${n}</td></tr>`).join('') :
        '<tr><td colspan="2">No signups yet</td></tr>';
      document.getElementById('signupsModal').style.display = 'flex';
    });
}

document.getElementById('closeSignupsModal').addEventListener('click', () => {
  document.getElementById('signupsModal').style.display = 'none';
});

loadEvents();
