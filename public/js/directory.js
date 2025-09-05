const directoryList = document.getElementById('directoryList');
const searchInput = document.getElementById('directorySearch');

// Replace with your CSV URL
const sheetCSV = "https://docs.google.com/spreadsheets/d/e/2PACX-1vT9nsgWRuANHKqhFPeAWN88MvusJSzkQtcm4nUdaVIjAky1WifmSchquUEg0BV5r1dEvedKnKjtyiwC/pub?gid=411848997&single=true&output=csv";

// Parse CSV into array of objects
async function fetchMembers() {
  const res = await fetch(sheetCSV);
  const csvText = await res.text();

  const rows = csvText.split("\n").filter(r => r.trim() !== "");
  const headers = rows[0].split(",");

  const members = rows.slice(1).map(row => {
    const values = row.split(",");
    let obj = {};
    headers.forEach((h, i) => {
      obj[h.trim()] = values[i].trim();
    });
    return obj;
  });

  return members;
}

function displayMembers(list) {
  directoryList.innerHTML = "";
  if(list.length === 0) {
    directoryList.innerHTML = "<p>No members found.</p>";
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
    directoryList.appendChild(div);
  });
}

// Fetch and display
fetchMembers().then(members => {
  displayMembers(members);

  // Search functionality
  searchInput.addEventListener('input', () => {
    const query = searchInput.value.toLowerCase();
    const filtered = members.filter(member =>
      member.Name.toLowerCase().includes(query) ||
      member.Position.toLowerCase().includes(query) ||
      member.Grade.toLowerCase().includes(query) ||
      member.Email.toLowerCase().includes(query)
    );
    displayMembers(filtered);
  });
});
