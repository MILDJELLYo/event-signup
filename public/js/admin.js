function loadEvents() {
  fetch('/api/events')
    .then(res => res.json())
    .then(events => {
      const list = document.getElementById('eventsList');
      list.innerHTML = '';
      events.forEach(e => {
        const div = document.createElement('div');
        div.className = 'event-card';
        const dateStr = new Date(e.date).toLocaleDateString('en-US');
        div.innerHTML = `
          <h2>${e.title}</h2>
          <p>${dateStr} • ${e.location}</p>
          <p>${e.timeSlots.length} time slot(s)</p>
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

// Create event modal logic
const createModal = document.getElementById('createModal');
document.getElementById('createBtn').addEventListener('click', () => createModal.style.display = 'flex');
document.getElementById('closeCreateModal').addEventListener('click', () => createModal.style.display = 'none');
window.addEventListener('click', e => { if (e.target === createModal) createModal.style.display = 'none'; });

document.getElementById('addSlotBtn').addEventListener('click', () => {
  const container = document.getElementById('timeSlotsContainer');
  if (container.children.length >= 5) return alert('Max 5 time slots allowed.');
  const slotDiv = document.createElement('div');
  slotDiv.innerHTML = `
    <label>Time</label>
    <input type="time" class="slot-time" required>
    <label>Hours</label>
    <input type="text" class="slot-hours" required>
    <label>Max Spots</label>
    <input type="number" class="slot-maxSpots" min="1" required>
    <hr>
  `;
  container.appendChild(slotDiv);
});

document.getElementById('createEventForm').addEventListener('submit', e => {
  e.preventDefault();
  const slots = [];
  document.querySelectorAll('#timeSlotsContainer div').forEach(div => {
    slots.push({
      time: div.querySelector('.slot-time').value,
      hours: div.querySelector('.slot-hours').value,
      maxSpots: div.querySelector('.slot-maxSpots').value
    });
  });
  const eventData = {
    title: document.getElementById('title').value,
    date: document.getElementById('date').value,
    location: document.getElementById('location').value,
    description: document.getElementById('description').value,
    contactName: document.getElementById('contactName').value,
    contactEmail: document.getElementById('contactEmail').value,
    timeSlots: slots
  };
  
  fetch('/api/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(eventData)
  })
  .then(() => {
    createModal.style.display = 'none';
    e.target.reset();
    document.getElementById('timeSlotsContainer').innerHTML = '';
    loadEvents();
  });
});

function viewSignups(id) {
  fetch(`/api/events/${id}`)
    .then(res => res.json())
    .then(event => {
      document.getElementById('signupsTitle').textContent = `Sign-Ups for ${event.title}`;
      const contentDiv = document.getElementById('signupsContent');
      contentDiv.innerHTML = '';
      event.timeSlots.forEach((slot, index) => {
        const dateStr = new Date(event.date).toLocaleDateString('en-US');
        const slotDiv = document.createElement('div');
        slotDiv.innerHTML = `<p><strong>${slot.time} (${slot.hours}) - ${dateStr}</strong></p>`;
        if (slot.signups.length === 0) {
          slotDiv.innerHTML += `<p>No signups yet</p>`;
        } else {
          slot.signups.forEach((name, i) => {
            slotDiv.innerHTML += `<p>${i + 1}. ${name}</p>`;
          });
        }
        contentDiv.appendChild(slotDiv);
        contentDiv.appendChild(document.createElement('hr'));
      });
      document.getElementById('signupsModal').style.display = 'flex';
    });
}

document.getElementById('closeSignupsModal').addEventListener('click', () => {
  document.getElementById('signupsModal').style.display = 'none';
});

loadEvents();
