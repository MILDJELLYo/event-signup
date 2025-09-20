const accountsList = document.getElementById('accountsList');
const searchInput = document.getElementById('searchInput');
const hoursFilter = document.getElementById('hoursFilter');
const hoursValue = document.getElementById('hoursValue');
const tableHeaders = document.querySelectorAll('.table-headers [data-field]');

const sheetCSV = "https://docs.google.com/spreadsheets/d/e/2PACX-1vT9nsgWRuANHKqhFPeAWN88MvusJSzkQtcm4nUdaVIjAky1WifmSchquUEg0BV5r1dEvedKnKjtyiwC/pub?gid=0&single=true&output=csv";
const REQUIRED_HOURS = 30;
const REQUIRED_MEETINGS = 10;

let accounts = [];
let sortField = null;
let sortAsc = true;

async function fetchAccounts() {
  const url = "https://api.allorigins.win/raw?url=" + encodeURIComponent(sheetCSV);
  const res = await fetch(url);
  const csvText = await res.text();

  const rows = csvText.split("\n").filter(r => r.trim() !== "");
  const headers = rows[0].split(",").map(h => h.trim());

  accounts = rows.slice(1).map(row => {
    const values = row.split(",").map(v => v.trim());
    let obj = {};
    headers.forEach((h, i) => obj[h] = values[i]);
    return obj;
  });
}

function displayAccounts(list) {
  accountsList.innerHTML = "";
  if(list.length === 0) {
    accountsList.innerHTML = "<p>No members found.</p>";
    return;
  }

  list.forEach(member => {
    const completedHours = Number(member["Service hours"]) || 0;
    const meetingCredit = Number(member["Meeting Credit"]) || 0;
    const progressPercent = Math.min(100, Math.round((completedHours / REQUIRED_HOURS) * 100));
    const hoursColor = completedHours >= REQUIRED_HOURS ? "#16a34a" : "#dc2626";
    const meetingsColor = meetingCredit >= REQUIRED_MEETINGS ? "#16a34a" : "#dc2626";

    if(completedHours > Number(hoursFilter.value)) return; // skip over threshold

    const div = document.createElement('div');
    div.className = 'account-card';
    div.innerHTML = `
      <h3>${member["Name"]}</h3>
      <p><strong>Position:</strong> ${member["Position"]}</p>
      <p><strong>Service Hours:</strong> ${completedHours} / ${REQUIRED_HOURS}</p>
      <div class="progress-container">
        <div class="progress-bar" style="width: ${progressPercent}%; background-color: ${hoursColor};"></div>
      </div>
      <p><strong>Meetings Attended:</strong> <span style="color: ${meetingsColor}">${meetingCredit}</span> / ${REQUIRED_MEETINGS}</p>
    `;
    accountsList.appendChild(div);
  });
}

// Sorting logic
function sortAccounts(list) {
  if(!sortField) return list;
  return list.slice().sort((a, b) => {
    let valA = a[sortField] || "";
    let valB = b[sortField] || "";
    if(sortField === "Service hours" || sortField === "Meeting Credit") {
      valA = Number(valA) || 0;
      valB = Number(valB) || 0;
    } else {
      valA = valA.toLowerCase();
      valB = valB.toLowerCase();
    }
    if(valA < valB) return sortAsc ? -1 : 1;
    if(valA > valB) return sortAsc ? 1 : -1;
    return 0;
  });
}

// Filter + display
function updateDisplay() {
  const query = searchInput.value.toLowerCase();
  const filtered = accounts.filter(member =>
    member["Name"].toLowerCase().includes(query) ||
    member["Position"].toLowerCase().includes(query)
  );
  displayAccounts(sortAccounts(filtered));
}

// Event listeners
searchInput.addEventListener('input', updateDisplay);

hoursFilter.addEventListener('input', () => {
  hoursValue.textContent = hoursFilter.value;
  updateDisplay();
});

tableHeaders.forEach(header => {
  header.addEventListener('click', () => {
    const field = header.dataset.field;
    if(sortField === field) sortAsc = !sortAsc;
    else { sortField = field; sortAsc = true; }
    updateDisplay();
  });
});

// Initial fetch & display
fetchAccounts().then(updateDisplay);

tableHeaders.forEach(header => {
  header.innerHTML += '<span class="sort-arrow"></span>'; // add arrow span
  header.addEventListener('click', () => {
    const field = header.dataset.field;
    if(sortField === field) sortAsc = !sortAsc;
    else { sortField = field; sortAsc = true; sortField = field; }

    // Update arrows
    tableHeaders.forEach(h => {
      const arrow = h.querySelector('.sort-arrow');
      if(h.dataset.field === field) arrow.textContent = sortAsc ? '▲' : '▼';
      else arrow.textContent = '';
    });

    updateDisplay();
  });
});


