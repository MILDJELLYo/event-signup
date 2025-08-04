// Step elements
const stepDetails = document.getElementById('step-details');
const stepDate = document.getElementById('step-date');
const stepSlots = document.getElementById('step-slots');

const createModal = document.getElementById('createModal');
const eventsList = document.getElementById('eventsList');

let editingEventId = null; // Track editing state

// Open create modal and reset form
document.getElementById('createBtn').addEventListener('click', () => {
  createModal.style.display = 'flex';
  showStep('details');
  resetForm();
});

// Close create modal
document.getElementById('closeCreateModal').addEventListener('click', () => {
  createModal.style.display = 'none';
});

// Click outside modal closes it
window.addEventListener('click', e => {
  if (e.target === createModal) {
    createModal.style.display = 'none';
  }
});

// Show/hide steps
function showStep(step) {
  stepDetails.style.display = 'none';
  stepDate.style.display = 'none';
  stepSlots.style.display = 'none';

  if (step === 'details') stepDetails.style.display = 'block';
  else if (step === 'date') stepDate.style.display = 'block';
  else if (step === 'slots') stepSlots.style.display = 'block';
}

// Navigation buttons between steps
document.getElementById('nextToDate').addEventListener('click', () => {
  if (!validateDetailsStep()) return;
  showStep('date');
});

document.getElementById('backToDetails').addEventListener('click', () => {
  showStep('details');
});

document.getElementById('nextToSlots').addEventListener('click', () => {
  if (!validateDateStep()) return;
  showStep('slots');
});

document.getElementById('backToDate').addEventListener('click', () => {
  showStep('date');
});

// Validate details step fields
function validateDetailsStep() {
  const title = document.getElementById('title').value.trim();
  const location = document.getElementById('location').value.trim();
  const description = document.getElementById('description').value.trim();
  const contactName = document.getElementById('contactName').value.trim();
  const contactEmail = document.getElementById('contactEmail').value.trim();

  if (!title || !location || !description || !contactName || !contactEmail) {
    alert('Please fill out all event details.');
    return false;
  }
  return true;
}

// Validate date step field
function validateDateStep() {
  const date = document.getElementById('date').value.trim();
  if (!date) {
    alert('Please select a date.');
    return false;
  }
  return true;
}

// Add and remove time slot buttons
document.getElementById('addSlotBtn').addEventListener('click', () => {
  addTimeSlot();
});

document.getElementById('removeSlotBtn').addEventListener('click', () => {
  const container = document.getElementById('timeSlotsContainer');
  const slots = container.querySelectorAll('.time-slot');
  if (slots.length > 0) {
    container.removeChild(slots[slots.length - 1]);
  }
});

// Function to add a time slot input group
function addTimeSlot(slot = null) {
  const container = document.getElementById('timeSlotsContainer');
  const slotDiv = document.createElement('div');
  slotDiv.classList.add('time-slot');
  slotDiv.style.marginBottom = '1rem';
  slotDiv.innerHTML = `
    <label>Time</label>
    <input type="time" class="slot-time" required value="${slot ? slot.time : ''}" />
    <label>Max Spots</label>
    <input type="number" class="slot-maxSpots" min="1" required value="${slot ? slot.maxSpots : ''}" />
    <label>Service Hours</label>
    <input type="number" class="slot-hours" min="1" required value="${slot ? slot.hours : ''}" />
  `;
  container.appendChild(slotDiv);
}

// Load events and render admin list
function loadEvents() {
  fetch('/api/events')
    .then(res => res.json())
    .then(events => {
      eventsList.innerHTML = '';

      events.forEach(event => {
        const eventCard = document.createElement('div');
        eventCard.classList.add('event-card');
        eventCard.innerHTML = `
          <h2>${event.title}</h2>
          <p>${new Date(event.date).toLocaleDateString('en-US')} • Spots Left: ${event.timeSlots.reduce((acc, slot) => acc + (slot.maxSpots - slot.signups.length), 0)}</p>
          <button class="viewSignupsBtn" data-id="${event.id}">View Sign-Ups</button>
          <button class="editBtn" data-id="${event.id}">Edit</button>
          <button class="deleteBtn" data-id="${event.id}" style="background:#dc2626;">Delete</button>
        `;
        eventsList.appendChild(eventCard);
      });

      // Attach event handlers
      attachEventHandlers();
    });
}

// Attach buttons inside event cards
function attachEventHandlers() {
  // View signups
  document.querySelectorAll('.viewSignupsBtn').forEach(btn => {
    btn.addEventListener('click', e => {
      const id = e.target.dataset.id;
      fetch(`/api/events/${id}`)
        .then(res => res.json())
        .then(event => {
          document.getElementById('signupsTitle').textContent = `Sign-Ups for ${event.title}`;
          const container = document.getElementById('signupsContent');
          container.innerHTML = '';
          event.timeSlots.forEach(slot => {
            container.innerHTML += `
              <h3>${slot.time} — ${slot.signups.length} / ${slot.maxSpots}</h3>
              <ul>
                ${slot.signups.map(name => `<li>${name}</li>`).join('')}
              </ul>
            `;
          });
          document.getElementById('signupsModal').style.display = 'flex';
        });
    });
  });

  // Edit event
  document.querySelectorAll('.editBtn').forEach(btn => {
    btn.addEventListener('click', e => {
      const id = e.target.dataset.id;
      fetch(`/api/events/${id}`)
        .then(res => res.json())
        .then(event => {
          editingEventId = id;
          createModal.style.display = 'flex';
          showStep('details');

          // Prefill form fields
          document.getElementById('title').value = event.title;
          document.getElementById('date').value = event.date.split('T')[0];
          document.getElementById('location').value = event.location;
          document.getElementById('description').value = event.description;
          document.getElementById('contactName').value = event.contactName;
          document.getElementById('contactEmail').value = event.contactEmail;

          // Clear and add time slots
          const container = document.getElementById('timeSlotsContainer');
          container.innerHTML = '';
          event.timeSlots.forEach(slot => addTimeSlot(slot));

          // Switch button text to Update
          document.getElementById('createEventSubmit').textContent = 'Update Event';
        });
    });
  });

  // Delete event
  document.querySelectorAll('.deleteBtn').forEach(btn => {
    btn.addEventListener('click', e => {
      const id = e.target.dataset.id;
      if (!confirm('Are you sure you want to delete this event?')) return;
      fetch(`/api/events/${id}`, { method: 'DELETE' })
        .then(res => {
          if (!res.ok) throw new Error('Delete failed');
          loadEvents();
        })
        .catch(() => alert('Error deleting event'));
    });
  });
}

// Close signups modal
document.getElementById('closeSignupsModal').addEventListener('click', () => {
  document.getElementById('signupsModal').style.display = 'none';
});

// Click outside signups modal closes it
window.addEventListener('click', e => {
  if (e.target === document.getElementById('signupsModal')) {
    document.getElementById('signupsModal').style.display = 'none';
  }
});

// Handle create/update event submission
document.getElementById('createEventForm').addEventListener('submit', e => {
  e.preventDefault();

  const title = document.getElementById('title').value.trim();
  const date = document.getElementById('date').value.trim();
  const location = document.getElementById('location').value.trim();
  const description = document.getElementById('description').value.trim();
  const contactName = document.getElementById('contactName').value.trim();
  const contactEmail = document.getElementById('contactEmail').value.trim();

  const timeSlots = Array.from(document.querySelectorAll('.time-slot')).map(slotEl => ({
    time: slotEl.querySelector('.slot-time').value.trim(),
    maxSpots: parseInt(slotEl.querySelector('.slot-maxSpots').value, 10),
    hours: parseInt(slotEl.querySelector('.slot-hours').value, 10),
    signups: []
  }));

  if (!title || !date || !location || !description || !contactName || !contactEmail) {
    alert('Please fill in all fields');
    return;
  }

  if (timeSlots.length === 0) {
    alert('Please add at least one time slot.');
    return;
  }

  const url = editingEventId ? `/api/events/${editingEventId}` : '/api/events';
  const method = editingEventId ? 'PUT' : 'POST';

  fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title,
      date,
      location,
      description,
      contactName,
      contactEmail,
      timeSlots
    })
  })
    .then(res => {
      if (!res.ok) return res.json().then(err => Promise.reject(err));
      return res.json();
    })
    .then(() => {
      alert(editingEventId ? 'Event updated successfully!' : 'Event created successfully!');
      createModal.style.display = 'none';
      loadEvents();
      resetForm();
      editingEventId = null;
      document.getElementById('createEventSubmit').textContent = 'Create Event';
      showStep('details');
    })
    .catch(err => alert(err.error || (editingEventId ? 'Error updating event' : 'Error creating event')));
});

// Reset form helper
function resetForm() {
  document.getElementById('createEventForm').reset();
  document.getElementById('timeSlotsContainer').innerHTML = '';
}

// Initial load
loadEvents();
