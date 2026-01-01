/********************
 * CONFIG
 ********************/
const REQUIRED_HOURS = 30;
const REQUIRED_MEETINGS = 10;

const COLS = {
  Email: 0,
  Position: 1,
  "Service hours": 2,
  "Meeting Credit": 3,
  Name: 18
};

/********************
 * STATE
 ********************/
let accounts = [];
let apiAccounts = [];
let sortField = null;
let sortAsc = true;

// DOM
let tableBody;
let searchInput;
let hoursFilter;
let hoursValue;

/********************
 * HELPERS
 ********************/
function cleanCSVCell(cell) {
  return (cell || "").trim().replace(/^"|"$/g, "");
}

/********************
 * FETCH CSV
 ********************/
async function fetchAccounts() {
  const sheetCSV =
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vT9nsgWRuANHKqhFPeAWN88MvusJSzkQtcm4nUdaVIjAky1WifmSchquUEg0BV5r1dEvedKnKjtyiwC/pub?gid=0&single=true&output=csv";

  const url =
    "https://api.allorigins.win/raw?url=" + encodeURIComponent(sheetCSV);

  const res = await fetch(url);
  const csvText = await res.text();

  const rows = csvText.split("\n").filter(r => r.trim());
  accounts = rows.slice(1).map(row => {
    const cols = row.split(",");
    return {
      Email: cleanCSVCell(cols[COLS.Email]).toLowerCase(),
      Name: cleanCSVCell(cols[COLS.Name]),
      Position: cleanCSVCell(cols[COLS.Position]),
      "Service hours": Number(cleanCSVCell(cols[COLS["Service hours"]]) || 0),
      "Meeting Credit": Number(cleanCSVCell(cols[COLS["Meeting Credit"]]) || 0)
    };
  });
}

/********************
 * FETCH API (SAFE)
 ********************/
async function fetchAllAPIAccounts() {
  try {
    const res = await fetch("/api/userinfo");

    if (!res.ok) throw new Error("API route missing");

    const text = await res.text();

    // Guard: if server returned HTML, ignore it
    if (text.trim().startsWith("<")) {
      throw new Error("HTML returned instead of JSON");
    }

    apiAccounts = JSON.parse(text);
    console.log("API data loaded");

  } catch (err) {
    console.warn("⚠ API unavailable — using CSV-only data");
    apiAccounts = [];
  }
}

/********************
 * TABLE RENDER
 ********************/
function displayAccounts(list) {
  tableBody.innerHTML = "";

  if (!list.length) {
    tableBody.innerHTML =
      "<tr><td colspan='4'>No members found.</td></tr>";
    return;
  }

  list.forEach(member => {
    const tr = document.createElement("tr");

    // NAME (clickable)
    const nameTd = document.createElement("td");
    nameTd.textContent = member.Name;
    nameTd.style.cursor = "pointer";
    nameTd.style.textDecoration = "underline";
    nameTd.addEventListener("click", () => openMemberModal(member));
    tr.appendChild(nameTd);

    // POSITION
    const posTd = document.createElement("td");
    posTd.textContent = member.Position;
    tr.appendChild(posTd);

    // SERVICE HOURS
    const hoursTd = document.createElement("td");
    hoursTd.textContent = member["Service hours"];
    hoursTd.style.color =
      member["Service hours"] >= REQUIRED_HOURS ? "#16a34a" : "#dc2626";
    tr.appendChild(hoursTd);

    // MEETING CREDIT
    const meetTd = document.createElement("td");
    meetTd.textContent = member["Meeting Credit"];
    meetTd.style.color =
      member["Meeting Credit"] >= REQUIRED_MEETINGS ? "#16a34a" : "#dc2626";
    tr.appendChild(meetTd);

    tableBody.appendChild(tr);
  });
}


/********************
 * SORTING
 ********************/
function sortAccounts(list) {
  if (!sortField) return list;

  return [...list].sort((a, b) => {
    let A = a[sortField];
    let B = b[sortField];

    if (typeof A === "number") return sortAsc ? A - B : B - A;

    A = A.toLowerCase();
    B = B.toLowerCase();
    if (A < B) return sortAsc ? -1 : 1;
    if (A > B) return sortAsc ? 1 : -1;
    return 0;
  });
}

/********************
 * FILTER + SEARCH
 ********************/
function updateDisplay() {
  const q = searchInput.value.toLowerCase();
  const maxHours = Number(hoursFilter.value);

  const filtered = accounts.filter(m =>
    (m.Name.toLowerCase().includes(q) ||
      m.Position.toLowerCase().includes(q)) &&
    m["Service hours"] <= maxHours
  );

  displayAccounts(sortAccounts(filtered));
}

/********************
 * UI SETUP
 ********************/
function setupFilters() {
  searchInput.placeholder = "Search name or position…";
  searchInput.className = "search-bar";

  hoursFilter.type = "range";
  hoursFilter.min = 0;
  hoursFilter.max = REQUIRED_HOURS;
  hoursFilter.value = REQUIRED_HOURS;

  hoursValue.textContent = REQUIRED_HOURS;

  const container = document.querySelector(".container");
  container.insertBefore(searchInput, tableBody.parentNode);
  container.insertBefore(hoursValue, tableBody.parentNode);
  container.insertBefore(hoursFilter, tableBody.parentNode);

  searchInput.oninput = updateDisplay;
  hoursFilter.oninput = () => {
    hoursValue.textContent = hoursFilter.value;
    updateDisplay();
  };
}

function setupSorting() {
  document
    .querySelectorAll("#master-service-table th")
    .forEach(th => {
      th.onclick = () => {
        const field = th.textContent.trim();
        if (sortField === field) sortAsc = !sortAsc;
        else {
          sortField = field;
          sortAsc = true;
        }
        updateDisplay();
      };
    });
}

/********************
 * MODAL (CSV + API)
 ********************/
function openMemberModal(csvMember) {
  const apiMatch = apiAccounts.find(
    a => a.email?.toLowerCase() === csvMember.Email
  );

  const data = apiMatch || {
    name: csvMember.Name,
    email: csvMember.Email,
    position: csvMember.Position,
    serviceHours: csvMember["Service hours"],
    meetingCredit: csvMember["Meeting Credit"],
    events: []
  };

  document.getElementById("modalName").textContent = data.name;
  document.getElementById("modalEmail").textContent = data.email;
  document.getElementById("modalPosition").textContent = data.position;

  document.getElementById("modalHours").textContent =
    `${data.serviceHours} / ${REQUIRED_HOURS}`;

  document.getElementById("modalMeetings").textContent =
    `${data.meetingCredit} / ${REQUIRED_MEETINGS}`;

  const bar = document.getElementById("modalProgressBar");
  bar.style.width =
    Math.min(100, (data.serviceHours / REQUIRED_HOURS) * 100) + "%";
  bar.style.background =
    data.serviceHours >= REQUIRED_HOURS ? "#16a34a" : "#dc2626";

  const eventsBody = document.getElementById("modalEvents");
  eventsBody.innerHTML = "";

  if (data.events?.length) {
    data.events.forEach(e => {
      eventsBody.innerHTML += `
        <tr>
          <td>${e.eventName}</td>
          <td>${e.hoursEarned}</td>
        </tr>`;
    });
  } else {
    eventsBody.innerHTML =
      "<tr><td colspan='2' style='text-align:center'>No events recorded</td></tr>";
  }

  document.getElementById("memberModal").style.display = "flex";
}

/********************
 * INIT
 ********************/
async function init() {
  await fetchAccounts();
  await fetchAllAPIAccounts();
  setupFilters();
  setupSorting();
  updateDisplay();
}

document.addEventListener("DOMContentLoaded", () => {
  tableBody = document.querySelector("#master-service-table tbody");
  searchInput = document.createElement("input");
  hoursFilter = document.createElement("input");
  hoursValue = document.createElement("span");

  document.getElementById("closeModal").onclick = () =>
    (document.getElementById("memberModal").style.display = "none");

  document.getElementById("memberModal").onclick = e => {
    if (e.target.id === "memberModal")
      e.currentTarget.style.display = "none";
  };

  init();
});

const modal = document.getElementById("memberModal");
const closeBtn = document.getElementById("closeModal");

function openMemberModal(member) {
  // Populate modal fields
  document.getElementById("modalName").textContent = member.Name;
  document.getElementById("modalEmail").textContent = member.Email || "—";
  document.getElementById("modalPosition").textContent = member.Position;
  document.getElementById("modalHours").textContent = member["Service hours"];
  document.getElementById("modalMeetings").textContent = member["Meeting Credit"];
  
  populateModalEvents(); // Populates events table
  
  document.getElementById('memberModal').style.display = 'flex';

  // Progress bar (hours)
  const percent = Math.min(
    (member["Service hours"] / REQUIRED_HOURS) * 100,
    100
  );
  document.getElementById("modalProgressBar").style.width = percent + "%";

  // Events table (safe even if empty)
  const eventsBody = document.getElementById("modalEvents");
  eventsBody.innerHTML = "";

  if (Array.isArray(member.Events)) {
    member.Events.forEach(ev => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${ev.name}</td>
        <td>${ev.hours}</td>
      `;
      eventsBody.appendChild(tr);
    });
  }

  // 🔥 SHOW MODAL
 modal.style.setProperty("display", "flex", "important");

}

closeBtn.addEventListener("click", () => {
  modal.style.display = "none";
});

modal.addEventListener("click", e => {
  if (e.target === modal) {
    modal.style.display = "none";
  }
});

async function populateModalEvents() {
  const email = document.getElementById('modalEmail').textContent.trim();
  const eventsTableBody = document.getElementById('modalEvents');
  eventsTableBody.innerHTML = '';

  try {
    const res = await fetch(`/api/userinfo/email?email=${encodeURIComponent(email)}`);
    if (!res.ok) throw new Error('Failed to fetch user info');

    const member = await res.json();
    console.log('Member data for modal:', member);

    const events = Array.isArray(member.events) ? member.events : [];
    if (events.length === 0) {
      eventsTableBody.innerHTML = `<tr><td colspan="2" style="text-align:center">No service shifts recorded.</td></tr>`;
      return;
    }

    events.forEach(ev => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${ev.eventName || ev.name || 'Unknown Event'}</td>
        <td>${ev.hoursEarned ?? ev.hours ?? 0}</td>
      `;
      eventsTableBody.appendChild(tr);
    });

  } catch (err) {
    console.error('populateModalEvents error:', err);
    eventsTableBody.innerHTML = `<tr><td colspan="2" style="text-align:center">Error fetching service events.</td></tr>`;
  }
}
