/**************************************
 * EVENT PAGE — EMAIL-BASED SIGNUPS
 * WITH CSV NAME LOOKUP
 **************************************/

const params = new URLSearchParams(window.location.search);
const eventId = params.get("id");
const container = document.getElementById("eventContainer");
const userEmailEl = document.getElementById("userEmail");

let currentUser = null;
let csvAccounts = [];

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

/**************************************
 * GET NAME FROM CSV BY EMAIL
 **************************************/
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
      currentUser.name = currentUser.email; // Fallback to email
    }

    if (userEmailEl) {
      userEmailEl.textContent = `${currentUser.name} (${currentUser.email})`;
    }
  } catch (err) {
    console.error("Failed to load user:", err);
    throw err;
  }
}

/**************************************
 * LOAD EVENT
 **************************************/
async function loadEvent() {
  const res = await fetch(`/api/events/${eventId}`);
  if (!res.ok) throw new Error("Failed to load event");

  return await res.json();
}

/**************************************
 * RENDER EVENT
 **************************************/
function renderEvent(event) {
  const dateObj = parseLocalDate(event.date);
  const dateStr = dateObj.toLocaleDateString("en-US");

  let slotOptions = "";

  event.timeSlots.forEach((slot, index) => {
    slotOptions += `<option value="${index}">
      ${event.scheduleType === "timeSlots"
        ? formatTime(slot.time)
        : slot.time}
    </option>`;
  });

  let html = `
    <h1>${event.title}</h1>

    <div style="border:1px solid #e5e7eb; padding:1rem; border-radius:8px; margin-bottom:1rem;">
      <p><strong>Date:</strong> ${dateStr}</p>
      <p><strong>Location:</strong> ${event.location}</p>
      <p><strong>Description:</strong></p>
      <p>${event.description}</p>
      <p><strong>Contact:</strong> ${event.contactName} –
        <a href="mailto:${event.contactEmail}">
          ${event.contactEmail}
        </a>
      </p>

      <button id="openCancelModal"
        style="background:#dc2626; margin-top:1rem;">
        Cancel My Signup
      </button>
    </div>

    <p style="color:#6b7280; font-size:14px; margin-bottom:12px;">
      Clicking "Sign Up" will register you as:
      <strong>${currentUser.name}</strong> (${currentUser.email})
    </p>

    <h2>Available Slots</h2>
  `;

  event.timeSlots.forEach((slot, index) => {
    const spotsLeft = slot.maxSpots - slot.signups.length;
    const isSignedUp = slot.signups.includes(currentUser.name);

    html += `
      <div style="border:1px solid #ddd; padding:1rem; border-radius:8px; margin-bottom:1rem;">
        <p><strong>${
          event.scheduleType === "timeSlots"
            ? formatTime(slot.time)
            : slot.time
        }</strong></p>

        <p style="color:gray;">${slot.hours} Service Hours</p>
        <p>Spots left: ${spotsLeft}</p>

        ${
          isSignedUp
            ? `<div style="color:#16a34a; font-weight:bold;">✓ You are signed up</div>`
            : spotsLeft > 0
            ? `
              <form data-slot="${index}" class="signupForm">
                <button type="submit">Sign Up</button>
              </form>
            `
            : `
              <div style="color:#dc2626; font-weight:bold;">Full — Join Waitlist</div>
              <form data-slot="${index}" class="waitlistForm">
                <button type="submit">Join Waitlist</button>
              </form>
            `
        }

        <table style="width:100%; margin-top:1rem; border-collapse:collapse;">
          <thead>
            <tr>
              <th style="text-align:left; border-bottom:1px solid #ccc;">
                Signed Up
              </th>
            </tr>
          </thead>
          <tbody>
            ${
              slot.signups.length
                ? slot.signups
                    .map(
                      name =>
                        `<tr><td style="padding:6px 0;">${name}</td></tr>`
                    )
                    .join("")
                : `<tr><td>No sign-ups yet</td></tr>`
            }
          </tbody>
        </table>

        ${
          slot.waitlist?.length
            ? `
              <h4 style="margin-top:1rem;">Waitlist</h4>
              <ul>
                ${slot.waitlist.map(n => `<li>${n}</li>`).join("")}
              </ul>
            `
            : ""
        }
      </div>
    `;
  });

  container.innerHTML = html;

  setupForms(event);
  setupCancelModal(slotOptions);
}

/**************************************
 * SIGNUP + WAITLIST HANDLERS
 **************************************/
function setupForms(event) {
  document.querySelectorAll(".signupForm").forEach(form => {
    form.addEventListener("submit", async e => {
      e.preventDefault();

      const slotIndex = e.target.dataset.slot;

      const res = await fetch(`/api/events/${eventId}/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slotIndex,
          email: currentUser.email,
          name: currentUser.name  // Send the CSV name
        })
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Signup failed");
        return;
      }

      alert(`Successfully signed up as ${currentUser.name}!`);
      location.reload();
    });
  });

  document.querySelectorAll(".waitlistForm").forEach(form => {
    form.addEventListener("submit", async e => {
      e.preventDefault();

      const slotIndex = e.target.dataset.slot;

      const res = await fetch(`/api/events/${eventId}/waitlist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slotIndex,
          email: currentUser.email,
          name: currentUser.name  // Send the CSV name
        })
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Waitlist failed");
        return;
      }

      alert(`Successfully joined waitlist as ${currentUser.name}!`);
      location.reload();
    });
  });
}

/**************************************
 * CANCEL MODAL
 **************************************/
function setupCancelModal(slotOptions) {
  const modal = document.getElementById("cancelModal");
  const closeBtn = document.getElementById("closeCancelModal");

  // Use event delegation for the open button
  document.addEventListener('click', (e) => {
    if (e.target && e.target.id === 'openCancelModal') {
      console.log("Opening cancel modal");
      document.getElementById("cancelSlot").innerHTML = slotOptions;
      modal.style.display = "flex";
    }
  });

  if (closeBtn) {
    closeBtn.onclick = () => {
      console.log("Closing modal");
      modal.style.display = "none";
    };
  }

  window.onclick = e => {
    if (e.target === modal) {
      console.log("Clicked outside modal");
      modal.style.display = "none";
    }
  };

  const cancelForm = document.getElementById("cancelForm");
  if (cancelForm) {
    cancelForm.onsubmit = async e => {
      e.preventDefault();

      const slotIndex = document.getElementById("cancelSlot").value;

      console.log("Cancelling with:", { 
        slotIndex, 
        email: currentUser.email,
        name: currentUser.name 
      });

      const res = await fetch(`/api/events/${eventId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          slotIndex,
          email: currentUser.email,
          name: currentUser.name
        })
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error("Cancel error response:", errText);
        try {
          const err = JSON.parse(errText);
          alert(err.error || "Cancel failed");
        } catch {
          alert("Cancel failed: " + errText);
        }
        return;
      }

      alert("Successfully cancelled signup!");
      location.reload();
    };
  }
}

/**************************************
 * INIT
 **************************************/
(async function init() {
  try {
    // Load CSV first to get names
    await fetchCSVAccounts();
    
    // Then load user and match with CSV
    await loadUser();
    
    // Finally load and render event
    const event = await loadEvent();
    renderEvent(event);
  } catch (err) {
    console.error(err);
    container.innerHTML =
      `<p style='color:red;'>Failed to load event: ${err.message}</p>`;
  }
})();