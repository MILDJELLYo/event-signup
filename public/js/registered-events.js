/**************************************
 * REGISTERED EVENTS PAGE
 **************************************/

let currentUser = null;
let csvAccounts = [];
let allEvents = [];
let registeredEvents = [];

/**************************************
 * CSV COLUMNS
 **************************************/
const COLS = {
  Email: 0,
  Position: 1,
  "Service hours": 2,
  "Meeting Credit": 3,
  Name: 18
};

/**************************************
 * HELPERS
 **************************************/
function parseLocalDate(dateString) {
  // If it's already a date object, return it
  if (dateString instanceof Date) return dateString;
  
  // Parse as local date (YYYY-MM-DD format)
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function formatTime(timeStr) {
  const [hour, minute] = timeStr.split(":").map(Number);
  const ampm = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minute.toString().padStart(2, "0")} ${ampm}`;
}

function cleanCSVCell(cell) {
  return (cell || "").trim().replace(/^"|"$/g, "");
}

function formatDate(dateStr) {
  const date = parseLocalDate(dateStr);
  return date.toLocaleDateString("en-US", { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
}

function isPastEvent(dateStr) {
  const eventDate = parseLocalDate(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return eventDate < today;
}

/**************************************
 * FETCH CSV DATA
 **************************************/
async function fetchCSVAccounts() {
  const sheetCSV =
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vT9nsgWRuANHKqhFPeAWN88MvusJSzkQtcm4nUdaVIjAky1WifmSchquUEg0BV5r1dEvedKnKjtyiwC/pub?gid=0&single=true&output=csv";

  const url =
    "https://api.allorigins.win/raw?url=" + encodeURIComponent(sheetCSV);

  try {
    const res = await fetch(url);
    const csvText = await res.text();

    const rows = csvText.split("\n").filter(r => r.trim());
    csvAccounts = rows.slice(1).map(row => {
      const cols = row.split(",");
      return {
        Email: cleanCSVCell(cols[COLS.Email]).toLowerCase(),
        Name: cleanCSVCell(cols[COLS.Name]),
        Position: cleanCSVCell(cols[COLS.Position]),
        "Service hours": Number(cleanCSVCell(cols[COLS["Service hours"]]) || 0),
        "Meeting Credit": Number(cleanCSVCell(cols[COLS["Meeting Credit"]]) || 0)
      };
    });
    console.log("CSV accounts loaded:", csvAccounts.length);
  } catch (err) {
    console.error("Failed to load CSV:", err);
    csvAccounts = [];
  }
}

function getNameFromCSV(email) {
  if (!email) return null;
  
  const emailLower = email.toLowerCase();
  const match = csvAccounts.find(acc => acc.Email === emailLower);
  
  return match ? match.Name : null;
}

/**************************************
 * LOAD USER
 **************************************/
async function loadUser() {
  try {
    const res = await fetch("/api/userinfo");
    if (!res.ok) throw new Error("Not logged in");

    currentUser = await res.json();
    
    // API returns 'identifier' instead of 'email'
    currentUser.email = currentUser.identifier || currentUser.email;
    
    console.log("Current user email:", currentUser.email);
    
    // Get name from CSV
    const csvName = getNameFromCSV(currentUser.email);
    
    if (csvName) {
      currentUser.name = csvName;
      console.log(`✓ Matched email ${currentUser.email} to name: ${csvName}`);
    } else {
      console.warn(`⚠ No CSV match found for email: ${currentUser.email}`);
      currentUser.name = currentUser.email;
    }

    // Update UI
    const userNameEl = document.getElementById("userName");
    if (userNameEl) {
      userNameEl.textContent = `${currentUser.name} (${currentUser.email})`;
    }
    
  } catch (err) {
    console.error("Failed to load user:", err);
    throw err;
  }
}

/**************************************
 * FETCH ALL EVENTS
 **************************************/
async function fetchAllEvents() {
  try {
    const res = await fetch("/api/events");
    if (!res.ok) throw new Error("Failed to load events");
    
    allEvents = await res.json();
    console.log("All events loaded:", allEvents.length);
  } catch (err) {
    console.error("Failed to fetch events:", err);
    allEvents = [];
  }
}

/**************************************
 * FIND REGISTERED EVENTS
 **************************************/
function findRegisteredEvents() {
  registeredEvents = [];
  let totalHours = 0;

  allEvents.forEach(event => {
    event.timeSlots.forEach((slot, slotIndex) => {
      // Check if user is signed up
      const isSignedUp = slot.signups.includes(currentUser.name);
      const isWaitlisted = slot.waitlist && slot.waitlist.includes(currentUser.name);

      if (isSignedUp || isWaitlisted) {
        registeredEvents.push({
          event,
          slotIndex,
          slot,
          isWaitlisted,
          hours: isWaitlisted ? 0 : slot.hours
        });

        if (!isWaitlisted) {
          totalHours += slot.hours;
        }
      }
    });
  });

  // Update total hours
  const totalHoursEl = document.getElementById("totalHours");
  if (totalHoursEl) {
    totalHoursEl.textContent = totalHours;
  }

  console.log("Registered events found:", registeredEvents.length);
  return registeredEvents;
}

/**************************************
 * RENDER EVENTS
 **************************************/
function renderEvents() {
  const container = document.getElementById("eventsContainer");
  const loadingState = document.getElementById("loadingState");
  const noEventsState = document.getElementById("noEventsState");
  
  const showPast = document.getElementById("showPastEvents").checked;
  const showWaitlist = document.getElementById("showWaitlist").checked;

  // Filter events
  let filteredEvents = registeredEvents.filter(item => {
    const isPast = isPastEvent(item.event.date);
    const isWaitlist = item.isWaitlisted;

    if (!showPast && isPast) return false;
    if (!showWaitlist && isWaitlist) return false;
    return true;
  });

  // Sort by date (earliest first)
  filteredEvents.sort((a, b) => 
    new Date(a.event.date) - new Date(b.event.date)
  );

  loadingState.style.display = "none";

  if (filteredEvents.length === 0) {
    noEventsState.style.display = "block";
    container.innerHTML = "";
    return;
  }

  noEventsState.style.display = "none";
  
  let html = "";

  filteredEvents.forEach(item => {
    const { event, slot, slotIndex, isWaitlisted, hours } = item;
    const isPast = isPastEvent(event.date);
    const dateObj = parseLocalDate(event.date);

    html += `
      <div class="event-card" style="${isPast ? 'opacity:0.6;' : ''}">
        <!-- Date Block -->
        <div class="event-date" style="${isPast ? 'background:#6b7280;' : ''}">
          <div class="month">${dateObj.toLocaleDateString('en-US', { month: 'short' })}</div>
          <div class="day">${dateObj.getDate()}</div>
        </div>

        <!-- Event Details -->
        <div class="event-details">
          <h3>
            ${event.title}
            ${isPast ? '<span style="color:#6b7280; font-size:0.9rem; font-weight:normal;"> (Past)</span>' : ''}
            ${isWaitlisted ? '<span style="color:#f59e0b; font-size:0.9rem; font-weight:normal;"> (Waitlist)</span>' : ''}
          </h3>
          
          <p><strong>Date:</strong> ${formatDate(event.date)}</p>
          <p><strong>Time Slot:</strong> ${
            event.scheduleType === "timeSlots" 
              ? formatTime(slot.time) 
              : slot.time
          }</p>
          <p><strong>Location:</strong> ${event.location}</p>
          <p><strong>Service Hours:</strong> ${isWaitlisted ? '(Waitlist - 0 hours)' : `${hours} hours`}</p>

          <div style="margin-top:1rem; display:flex; gap:0.5rem;">
            <a href="event.html?id=${event.id}" class="btn" style="text-decoration:none;">
              <i class="fas fa-info-circle"></i> View Details
            </a>
            
            ${!isPast ? `
              <button 
                onclick="openCancelModal('${event.id}', ${slotIndex}, '${event.title}', '${slot.time}', ${isWaitlisted})"
                class="danger"
                style="background:#dc2626;">
                <i class="fas fa-times-circle"></i> Cancel Registration
              </button>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

/**************************************
 * CANCEL MODAL
 **************************************/
let cancelData = null;

function openCancelModal(eventId, slotIndex, eventTitle, slotTime, isWaitlisted) {
  cancelData = { eventId, slotIndex, isWaitlisted };
  
  const infoHtml = `
    <p style="margin:0;"><strong>Event:</strong> ${eventTitle}</p>
    <p style="margin:0;"><strong>Time Slot:</strong> ${slotTime}</p>
    <p style="margin:0;"><strong>Status:</strong> ${isWaitlisted ? 'Waitlist' : 'Confirmed'}</p>
  `;
  
  document.getElementById("cancelEventInfo").innerHTML = infoHtml;
  document.getElementById("cancelModal").style.display = "flex";
}

document.getElementById("closeCancelModal").addEventListener("click", () => {
  document.getElementById("cancelModal").style.display = "none";
});

document.getElementById("cancelModalCancel").addEventListener("click", () => {
  document.getElementById("cancelModal").style.display = "none";
});

document.getElementById("confirmCancel").addEventListener("click", async () => {
  if (!cancelData) return;

  const { eventId, slotIndex, isWaitlisted } = cancelData;
  const endpoint = isWaitlisted ? 'cancel-waitlist' : 'cancel';

  try {
    const res = await fetch(`/api/events/${eventId}/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        slotIndex,
        email: currentUser.email,
        name: currentUser.name
      })
    });

    if (!res.ok) {
      const err = await res.json();
      alert(err.error || "Cancel failed");
      return;
    }

    alert("Registration cancelled successfully!");
    location.reload();

  } catch (err) {
    console.error("Cancel error:", err);
    alert("Failed to cancel registration. Please try again.");
  }
});

// Close modal when clicking outside
window.addEventListener("click", (e) => {
  const modal = document.getElementById("cancelModal");
  if (e.target === modal) {
    modal.style.display = "none";
  }
});

/**************************************
 * FILTER HANDLERS
 **************************************/
document.getElementById("showPastEvents").addEventListener("change", renderEvents);
document.getElementById("showWaitlist").addEventListener("change", renderEvents);

/**************************************
 * INIT
 **************************************/
(async function init() {
  try {
    // Load data
    await fetchCSVAccounts();
    await loadUser();
    await fetchAllEvents();
    
    // Find and render registered events
    findRegisteredEvents();
    renderEvents();

  } catch (err) {
    console.error("Initialization error:", err);
    document.getElementById("loadingState").innerHTML = `
      <p style="color:#dc2626;">
        <i class="fas fa-exclamation-circle"></i> 
        Failed to load events. Please refresh the page.
      </p>
    `;
  }
})();