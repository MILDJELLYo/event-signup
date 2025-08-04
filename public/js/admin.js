// Modal open/close
document.getElementById('createBtn').addEventListener('click', () => {
  document.getElementById('createModal').style.display = 'flex';
  showTab(1);
});
document.getElementById('closeCreateModal').addEventListener('click', () => {
  document.getElementById('createModal').style.display = 'none';
});
window.addEventListener('click', e => {
  if (e.target === document.getElementById('createModal')) {
    document.getElementById('createModal').style.display = 'none';
  }
});

// Signups modal close
document.getElementById('closeSignupsModal').addEventListener('click', () => {
  document.getElementById('signupsModal').style.display = 'none';
});
window.addEventListener('click', e => {
  if (e.target === document.getElementById('signupsModal')) {
    document.getElementById('signupsModal').style.display = 'none';
  }
});

// Tab buttons & logic
const tabButtons = document.querySelectorAll('.tab-btn');
const tabs = document.querySelectorAll('.tab');

function showTab(n) {
  tabs.forEach(t => t.classList.remove('active'));
  tabButtons.forEach(b => b.classList.remove('active'));

  document.querySelector(`.tab[data-tab="${n}"]`).classList.add('active');
  document.querySelector(`.tab-btn[data-tab="${n}"]`).classList.add('active');
}

// Navigation buttons
document.getElementById('toStep2').addEventListener('click', () => {
  if (validateStep1()) {
    showTab(2);
  }
});
document.getElementById('backToStep1').addEventListener('click', () => showTab(1));
document.getElementById('toStep3').addEventListener('click', () => {
  if (validateStep2()) {
    populateReview();
    showTab(3);
  }
});
document.getElementById('backToStep2').addEventListener('click', () => showTab(2));

// Validate Step 1 inputs
function validateStep1() {
  const title = document.getElementById('title').value.trim();
  const date = document.getElementById('date').value.trim();
  const location = document.getElementById('location').value.trim();
  const description = document.getElementById('description').value.trim();
  const contactName = document.getElementById('contactName').value.trim();
  const contactEmail = document.getElementById('contactEmail').value.trim();

  if (!title || !date || !location || !description || !contactName || !contactEmail) {
    alert('Please fill out all details fields.');
    return false;
  }
  return true;
}

// Validate Step 2 inputs (at least one slot)
function validateStep2() {
  const slots = document.querySelectorAll('.time-slot');
  if (slots.length === 0) {
    alert('Please add at least one time slot.');
    return false;
  }
  for (const slot of slots) {
    const time = slot.querySelector('.slot-time').value.trim();
    const maxSpots = slot.querySelector('.slot-maxSpots').value;
    const hours = slot.querySelector('.slot-hours').value;
    if (!time || !maxSpots || !hours || maxSpots <= 0 || hours <= 0) {
      alert('Please fill out all time slot fields with valid values.');
      return false;
    }
  }
  return true;
}

// Add time slot input group
document.getElementById('addSlotBtn').addEventListener('click', () => {
  const container = document.getElementById('timeSlotsContainer');
  const slotDiv = document.createElement('div');
  slotDiv.classList.add('time-slot');
  slotDiv.style.marginBottom = '1rem';
  slotDiv.innerHTML = `
    <label>Time</label>
    <input type="time" class="slot-time" required />
    <label>Max Spots</label>
    <input type="number" class="slot-maxSpots" min="1" required />
    <label>Service Hours</label>
    <input type="number" class="slot-hours" min="1" required />
    <button type="button" class="removeSlotBtn" style="margin-left:10px;">Remove</button>
  `;
  container.appendChild(slotDiv);

  slotDiv.querySelector('.removeSlotBtn').addEventListener('click', () => {
    slotDiv.remove();
  });
});

// Populate review tab with event summary
function populateReview() {
  const title = document.getElementById('title').value.trim();
  const date = document.getElementById('date').value.trim();
  const location = document.getElementById('location').value.trim();
  const description = document.getElementById('description').value.trim();
  const contactName = document.getElementById('contactName').value.trim();
  const contactEmail = document.getElementById('contactEmail').value.trim();

  const timeSlots = Array.from(document.querySelectorAll('.time-slot')).map(slotEl => ({
    time: slotEl.querySelector('.slot-time').value.trim(),
    maxSpots: slotEl.querySelector('.slot-maxSpots').value,
    hours: slotEl.querySelector('.slot-hours').value
  }));

  let reviewText = 
`Title: ${title}
Date: ${date}
Location: ${location}
Description: ${description}
Contact: ${contactName} (${contactEmail})

Time Slots:
`;

  timeSlots.forEach(slot => {
    reviewText += ` - ${slot.time}, Max Spots: ${slot.maxSpots}, Service Hours: ${slot.hours}\n`;
  });

  document.getElementById('reviewContent').textContent = reviewText;
}

// Load events and display in admin list (your original code, unchanged)
function loadEvents() {
  fetch('/api/events')
    .then(res => res.json())
    .then(events => {
      const eventsList = document.getElementById('eventsList');
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

      // View signups button click
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

      // TODO: Add edit and delete handlers as needed
    });
}

loadEvents();

// Handle event creation form submission (on review tab's "Create Event" button)
document.getElementById('createEventForm').addEventListener('submit', e => {
  e.preventDefault();

  if (!validateStep1() || !validateStep2()) {
    alert('Please complete all required fields before submitting.');
    return;
  }

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

  fetch('/api/events', {
    method: 'POST',
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
      alert('Event created successfully!');
      location.reload();
    })
    .catch(err => alert(err.error || 'Error creating event'));
});
