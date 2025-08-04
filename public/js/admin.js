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

// === Schedule Type Handling ===
const scheduleTypeButtons = document.querySelectorAll('.schedule-type-btn');
const timeSlotsSection = document.getElementById('timeSlotsSection');
const lunchPeriodsSection = document.getElementById('lunchPeriodsSection');

scheduleTypeButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const type = btn.dataset.type;

    // Hide both sections first
    timeSlotsSection.style.display = 'none';
    lunchPeriodsSection.style.display = 'none';

    if (type === 'timeslots') {
      timeSlotsSection.style.display = 'block';
    } else if (type === 'lunch') {
      lunchPeriodsSection.style.display = 'block';
    }
  });
});

// === Time Slot Add/Remove ===
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

// === Lunch Period Handling ===
const lunch5aMax = document.getElementById('lunch5aMax');
const lunch5aHours = document.getElementById('lunch5aHours');
const lunch5bMax = document.getElementById('lunch5bMax');
const lunch5bHours = document.getElementById('lunch5bHours');

function getLunchPeriodsData() {
  return [
    {
      period: '5A',
      maxSpots: parseInt(lunch5aMax.value, 10),
      hours: parseInt(lunch5aHours.value, 10),
      signups: []
    },
    {
      period: '5B',
      maxSpots: parseInt(lunch5bMax.value, 10),
      hours: parseInt(lunch5bHours.value, 10),
      signups: []
    }
  ];
}

removeSlotBtn.addEventListener('click', () => {
  const slots = timeSlotsContainer.querySelectorAll('.time-slot');
  if (slots.length > 0) {
    timeSlotsContainer.removeChild(slots[slots.length - 1]);
  }
});

// Schedule type selection
let scheduleType = "";
const btnTimeSlots = document.getElementById('btnTimeSlots');
const btnLunchPeriods = document.getElementById('btnLunchPeriods');
const timeSlotsSection = document.getElementById('timeSlotsSection');
const lunchPeriodSection = document.getElementById('lunchPeriodSection');
const lunchPeriodSelect = document.getElementById('lunchPeriod');

btnTimeSlots.addEventListener('click', () => {
  scheduleType = "timeSlots";
  btnTimeSlots.classList.add('active');
  btnLunchPeriods.classList.remove('active');
  timeSlotsSection.style.display = 'block';
  lunchPeriodSection.style.display = 'none';
});

btnLunchPeriods.addEventListener('click', () => {
  scheduleType = "lunchPeriods";
  btnLunchPeriods.classList.add('active');
  btnTimeSlots.classList.remove('active');
  lunchPeriodSection.style.display = 'block';
  timeSlotsSection.style.display = 'none';
});

// Load events
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
          <p>${new Date(event.date).toLocaleDateString('en-US')}</p>
          <button class="viewSignupsBtn" data-id="${event.id}">View Sign-Ups</button>
        `;
        eventsList.appendChild(eventCard);
      });

      document.querySelectorAll('.viewSignupsBtn').forEach(btn => {
        btn.addEventListener('click', e => {
          const id = e.target.dataset.id;
          fetch(`/api/events/${id}`)
            .then(res => res.json())
            .then(event => {
              document.getElementById('signupsTitle').textContent = `Sign-Ups for ${event.title}`;
              const container = document.getElementById('signupsContent');
              container.innerHTML = '';
              document.getElementById('signupsModal').style.display = 'flex';
            });
        });
      });
    });
}
loadEvents();

// Multi-step form
const form = document.getElementById('createEventForm');
const pages = Array.from(document.querySelectorAll('.page'));
const progressSteps = Array.from(document.querySelectorAll('.progress-bar .step'));
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const submitBtn = document.getElementById('submitBtn');

let currentPage = 0;

function showPage(page) {
  pages.forEach((p, i) => {
    p.style.display = i === page ? 'block' : 'none';
  });
  progressSteps.forEach((ps, i) => {
    ps.classList.toggle('active', i === page);
  });

  prevBtn.disabled = page === 0;
  nextBtn.style.display = page === pages.length - 1 ? 'none' : 'inline-block';
  submitBtn.style.display = page === pages.length - 1 ? 'inline-block' : 'none';

  if (page === pages.length - 1) showReview();
}

function validatePage(page) {
  const inputs = pages[page].querySelectorAll('input, textarea, select');
  for (const input of inputs) {
    if (!input.checkValidity()) {
      input.reportValidity();
      return false;
    }
  }
  if (page === 2) {
    if (!scheduleType) {
      alert('Please select a schedule type.');
      return false;
    }
    if (scheduleType === "timeSlots" && timeSlotsContainer.querySelectorAll('.time-slot').length === 0) {
      alert('Please add at least one time slot.');
      return false;
    }
    if (scheduleType === "lunchPeriods" && !lunchPeriodSelect.value) {
      alert('Please select a lunch period.');
      return false;
    }
  }
  return true;
}

function showReview() {
  const reviewDiv = document.getElementById('reviewContent');
  const title = document.getElementById('title').value;
  const location = document.getElementById('location').value;
  const description = document.getElementById('description').value;
  const contactName = document.getElementById('contactName').value;
  const contactEmail = document.getElementById('contactEmail').value;
  const date = document.getElementById('date').value;

  let review = `Title: ${title}\nLocation: ${location}\nDescription: ${description}\nContact: ${contactName} (${contactEmail})\nDate: ${date}\nSchedule Type: ${scheduleType}\n`;

  if (scheduleType === "timeSlots") {
    const slots = Array.from(document.querySelectorAll('.time-slot')).map((slot, i) => {
      return `${i + 1}. ${slot.querySelector('.slot-time').value} — Max: ${slot.querySelector('.slot-maxSpots').value}, Hours: ${slot.querySelector('.slot-hours').value}`;
    }).join('\n');
    review += `Time Slots:\n${slots}`;
  } else {
    review += `Lunch Period: ${lunchPeriodSelect.value}`;
  }
  reviewDiv.textContent = review;
}

prevBtn.addEventListener('click', () => {
  if (currentPage > 0) {
    currentPage--;
    showPage(currentPage);
  }
});

nextBtn.addEventListener('click', () => {
  if (!validatePage(currentPage)) return;
  if (currentPage < pages.length - 1) {
    currentPage++;
    showPage(currentPage);
  }
});

showPage(currentPage);

// Submit
form.addEventListener('submit', e => {
  e.preventDefault();
  if (!validatePage(currentPage)) return;

  const title = document.getElementById('title').value.trim();
  const date = document.getElementById('date').value.trim();
  const location = document.getElementById('location').value.trim();
  const description = document.getElementById('description').value.trim();
  const contactName = document.getElementById('contactName').value.trim();
  const contactEmail = document.getElementById('contactEmail').value.trim();

  const payload = {
    title,
    date,
    location,
    description,
    contactName,
    contactEmail,
    scheduleType
  };

  if (scheduleType === "timeSlots") {
    payload.timeSlots = Array.from(document.querySelectorAll('.time-slot')).map(slotEl => ({
      time: slotEl.querySelector('.slot-time').value.trim(),
      maxSpots: parseInt(slotEl.querySelector('.slot-maxSpots').value, 10),
      hours: parseInt(slotEl.querySelector('.slot-hours').value, 10),
      signups: []
    }));
  } else if (scheduleType === "lunchPeriods") {
    payload.lunchPeriod = lunchPeriodSelect.value;
  }

  fetch('/api/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
    .then(res => res.json())
    .then(() => {
      alert('Event created!');
      form.reset();
      timeSlotsContainer.innerHTML = '';
      scheduleType = "";
      currentPage = 0;
      showPage(currentPage);
      document.getElementById('createModal').style.display = 'none';
      loadEvents();
    })
    .catch(() => alert('Error creating event.'));
});

// Calendar UI
const calendarElement = document.getElementById('calendar');
const hiddenDateInput = document.getElementById('date');
let today = new Date();
let selectedDate = today;
let calendarMonth = today.getMonth();
let calendarYear = today.getFullYear();

function renderCalendar(month, year) {
  calendarElement.innerHTML = '';
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

  const weekdays = document.createElement('div');
  weekdays.classList.add('calendar-weekdays');
  ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach(day => {
    const d = document.createElement('div');
    d.textContent = day;
    weekdays.appendChild(d);
  });
  calendarElement.appendChild(weekdays);

  const daysGrid = document.createElement('div');
  daysGrid.classList.add('calendar-days');

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Fill empty slots before the first day
  for (let i = 0; i < firstDay; i++) {
    const emptyCell = document.createElement('div');
    emptyCell.classList.add('calendar-day', 'disabled');
    daysGrid.appendChild(emptyCell);
  }

  // Fill actual days
  for (let day = 1; day <= daysInMonth; day++) {
    const cell = document.createElement('div');
    cell.classList.add('calendar-day');
    cell.textContent = day;

    const thisDate = new Date(year, month, day);
    if (
      thisDate.toDateString() === selectedDate.toDateString()
    ) {
      cell.classList.add('selected');
    }

    cell.addEventListener('click', () => {
      selectedDate = thisDate;
      hiddenDateInput.value = selectedDate.toISOString().split('T')[0];
      renderCalendar(month, year);
    });

    daysGrid.appendChild(cell);
  }

  calendarElement.appendChild(daysGrid);
}

// Initial render
renderCalendar(calendarMonth, calendarYear);

