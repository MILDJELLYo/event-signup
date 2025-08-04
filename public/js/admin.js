// Modal open/close
document.getElementById('createBtn').addEventListener('click', () => {
  document.getElementById('createModal').style.display = 'flex';
});
document.getElementById('closeCreateModal').addEventListener('click', () => {
  document.getElementById('createModal').style.display = 'none';
});
window.addEventListener('click', e => {
  if (e.target === document.getElementById('createModal')) {
    document.getElementById('createModal').style.display = 'none';
  }
});
document.getElementById('closeSignupsModal').addEventListener('click', () => {
  document.getElementById('signupsModal').style.display = 'none';
});
window.addEventListener('click', e => {
  if (e.target === document.getElementById('signupsModal')) {
    document.getElementById('signupsModal').style.display = 'none';
  }
});

// Time slot add/remove
const addSlotBtn = document.getElementById('addSlotBtn');
const removeSlotBtn = document.getElementById('removeSlotBtn');
const timeSlotsContainer = document.getElementById('timeSlotsContainer');

addSlotBtn.addEventListener('click', () => {
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
  `;
  timeSlotsContainer.appendChild(slotDiv);
});

removeSlotBtn.addEventListener('click', () => {
  const slots = timeSlotsContainer.querySelectorAll('.time-slot');
  if (slots.length > 0) {
    timeSlotsContainer.removeChild(slots[slots.length - 1]);
  }
});

// Load events into admin list
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

// Multi-step form handling
const form = document.getElementById('createEventForm');
const steps = Array.from(document.querySelectorAll('.step-content'));
const progressSteps = Array.from(document.querySelectorAll('.progress-bar .step'));
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const submitBtn = document.getElementById('submitBtn');

let currentStep = 0;

function showStep(step) {
  steps.forEach((s, i) => {
    s.classList.toggle('active', i === step);
  });
  progressSteps.forEach((ps, i) => {
    ps.classList.toggle('active', i === step);
  });

  prevBtn.disabled = step === 0;
  nextBtn.style.display = step === steps.length - 1 ? 'none' : 'inline-block';
  submitBtn.style.display = step === steps.length - 1 ? 'inline-block' : 'none';

  if (step === steps.length - 1) {
    showReview();
  }
}

function showReview() {
  const reviewDiv = document.getElementById('reviewContent');
  const title = document.getElementById('title').value.trim();
  const location = document.getElementById('location').value.trim();
  const description = document.getElementById('description').value.trim();
  const contactName = document.getElementById('contactName').value.trim();
  const contactEmail = document.getElementById('contactEmail').value.trim();
  const date = document.getElementById('date').value.trim();

  const timeSlots = Array.from(document.querySelectorAll('.time-slot')).map(slotEl => ({
    time: slotEl.querySelector('.slot-time').value.trim(),
    maxSpots: slotEl.querySelector('.slot-maxSpots').value.trim(),
    hours: slotEl.querySelector('.slot-hours').value.trim()
  }));

  let reviewText = `
Title: ${title}
Location: ${location}
Description: ${description}
Contact: ${contactName} (${contactEmail})
Date: ${date}

Time Slots:
`;

  timeSlots.forEach((slot, i) => {
    reviewText += `  ${i + 1}. Time: ${slot.time}, Max Spots: ${slot.maxSpots}, Service Hours: ${slot.hours}\n`;
  });

  reviewDiv.textContent = reviewText;
}

prevBtn.addEventListener('click', () => {
  if (currentStep > 0) {
    currentStep--;
    showStep(currentStep);
  }
});

nextBtn.addEventListener('click', () => {
  if (!validateStep(currentStep)) return;

  if (currentStep < steps.length - 1) {
    currentStep++;
    showStep(currentStep);
  }
});

function validateStep(step) {
  const inputs = steps[step].querySelectorAll('input, textarea');
  for (const input of inputs) {
    if (!input.checkValidity()) {
      input.reportValidity();
      return false;
    }
  }
  // Extra validation for time slots if step 3
  if (step === 2) {
    const slots = timeSlotsContainer.querySelectorAll('.time-slot');
    if (slots.length === 0) {
      alert('Please add at least one time slot.');
      return false;
    }
  }
  // For date step, check if a date is selected
  if (step === 1) {
    if (!document.getElementById('date').value) {
      alert('Please select a date.');
      return false;
    }
  }
  return true;
}

showStep(currentStep);

// Handle event creation submit
form.addEventListener('submit', e => {
  e.preventDefault();

  if (!validateStep(currentStep)) return;

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
      form.reset();
      timeSlotsContainer.innerHTML = '';
      currentStep = 0;
      showStep(currentStep);
      document.getElementById('createModal').style.display = 'none';
      loadEvents();
    })
    .catch(err => alert(err.error || 'Error creating event'));
});

/* === Custom Calendar UI === */

const calendarElement = document.getElementById('calendar');
const hiddenDateInput = document.getElementById('date');

let today = new Date();
let selectedDate = null;
let calendarMonth = today.getMonth();
let calendarYear = today.getFullYear();

function renderCalendar(month, year) {
  calendarElement.innerHTML = '';

  // Header with month and year and nav buttons
  const header = document.createElement('div');
  header.classList.add('calendar-header');

  const prevBtn = document.createElement('button');
  prevBtn.textContent = '<';
  prevBtn.addEventListener('click', () => {
    calendarMonth--;
    if (calendarMonth < 0) {
      calendarMonth = 11;
      calendarYear--;
    }
    renderCalendar(calendarMonth, calendarYear);
  });

  const nextBtn = document.createElement('button');
  nextBtn.textContent = '>';
  nextBtn.addEventListener('click', () => {
    calendarMonth++;
    if (calendarMonth > 11) {
      calendarMonth = 0;
      calendarYear++;
    }
    renderCalendar(calendarMonth, calendarYear);
  });

  const monthYear = document.createElement('div');
  monthYear.textContent = new Date(year, month).toLocaleString('default', { month: 'long', year: 'numeric' });

  header.appendChild(prevBtn);
  header.appendChild(monthYear);
  header.appendChild(nextBtn);

  calendarElement.appendChild(header);

  // Weekdays
  const weekdays = document.createElement('div');
  weekdays.classList.add('calendar-weekdays');
  ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach(day => {
    const d = document.createElement('div');
    d.textContent = day;
    weekdays.appendChild(d);
  });
  calendarElement.appendChild(weekdays);

  // Days
  const days = document.createElement('div');
  days.classList.add('calendar-days');

  // First day of month (0=Sun..6=Sat)
  const firstDayIndex = new Date(year, month, 1).getDay();

  // Days in month
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Fill blank days before first day
  for (let i = 0; i < firstDayIndex; i++) {
    const blank = document.createElement('div');
    blank.classList.add('calendar-day', 'disabled');
    days.appendChild(blank);
  }

  // Fill days
  for (let d = 1; d <= daysInMonth; d++) {
    const day = document.createElement('div');
    day.classList.add('calendar-day');
    day.textContent = d;

    const thisDate = new Date(year, month, d);

    // Disable past days before today
    const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    if (thisDate < todayOnly) {
      day.classList.add('disabled');
    } else {
      day.addEventListener('click', () => {
        selectedDate = thisDate;
        hiddenDateInput.value = selectedDate.toISOString().split('T')[0]; // yyyy-mm-dd format
        highlightSelectedDate();
      });
    }

    days.appendChild(day);
  }

  calendarElement.appendChild(days);
  highlightSelectedDate();
}

function highlightSelectedDate() {
  const dayElements = calendarElement.querySelectorAll('.calendar-day');
  dayElements.forEach(dayEl => {
    dayEl.classList.remove('selected');
  });

  if (!selectedDate) return;

  // Only highlight if calendar is showing the month & year of selectedDate
  if (selectedDate.getMonth() !== calendarMonth || selectedDate.getFullYear() !== calendarYear) return;

  // Find the day element that matches selectedDate date number
  const dayNumber = selectedDate.getDate();

  // The days start after firstDayIndex disabled days, so index of dayNumber is firstDayIndex + dayNumber - 1
  const firstDayIndex = new Date(calendarYear, calendarMonth, 1).getDay();
  const dayIndex = firstDayIndex + dayNumber - 1;
  const dayElementsArr = Array.from(calendarElement.querySelectorAll('.calendar-day'));

  if (dayElementsArr[dayIndex]) {
    dayElementsArr[dayIndex].classList.add('selected');
  }
}

// Initialize calendar with today's date selected by default
selectedDate = today;
calendarMonth = today.getMonth();
calendarYear = today.getFullYear();
hiddenDateInput.value = selectedDate.toISOString().split('T')[0];
renderCalendar(calendarMonth, calendarYear);
