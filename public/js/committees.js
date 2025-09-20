const committeeList = document.getElementById('committeeList');
const committeeSelect = document.getElementById('committeeSelect');

// Replace with your CSV URL
const sheetCSV = "https://docs.google.com/spreadsheets/d/e/2PACX-1vT9nsgWRuANHKqhFPeAWN88MvusJSzkQtcm4nUdaVIjAky1WifmSchquUEg0BV5r1dEvedKnKjtyiwC/pub?gid=411848997&single=true&output=csv";

async function fetchMembers() {
  const url = "https://api.allorigins.win/raw?url=" + encodeURIComponent(sheetCSV);
  const res = await fetch(url);
  const csvText = await res.text();

  const rows = csvText.split("\n").filter(r => r.trim() !== "");
  const headers = rows[0].split(",");

  const members = rows.slice(1).map(row => {
    const values = row.split(",");
    let obj = {};
    headers.forEach((h, i) => obj[h.trim()] = values[i].trim());
    return obj;
  });

  return members;
}

function displayMembers(list) {
  committeeList.innerHTML = "";
  if(list.length === 0) {
    committeeList.innerHTML = "<p>No members found.</p>";
    return;
  }

  list.forEach(member => {
    const div = document.createElement('div');
    div.className = 'directory-card';
    div.innerHTML = `
      <h3>${member.Name}</h3>
      <p class="role">${member.Position}</p>
      <p>Grade: ${member.Grade}</p>
      <p>Email: <a href="mailto:${member.Email}">${member.Email}</a></p>
    `;
    committeeList.appendChild(div);
  });
}

// Fetch members and populate dropdown
fetchMembers().then(members => {
  // Get unique committees
  const committees = [...new Set(members.map(m => m.Committee).filter(c => c))];
  committees.forEach(c => {
    const option = document.createElement('option');
    option.value = c;
    option.textContent = c;
    committeeSelect.appendChild(option);
  });

  // Show members when committee is selected
  committeeSelect.addEventListener('change', () => {
    const selected = committeeSelect.value;
    if(!selected) {
      committeeList.innerHTML = "<p>Please select a committee.</p>";
      return;
    }
    const filtered = members.filter(m => m.Committee === selected);
    displayMembers(filtered);
  });
});