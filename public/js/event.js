const params = new URLSearchParams(window.location.search);
const eventId = params.get('id');
const container = document.getElementById('eventContainer');

fetch(`/api/events/${eventId}`)
  .then(res => res.json())
  .then(event => {
    container.innerHTML = `
      <h1>${event.title}</h1>
      <p><strong>Date:</strong> ${event.date}<br>
         <strong>Location:</strong> ${event.location}<br>
         <strong>Hours:</strong> ${event.hours}</p>
      <form id="signupForm">
        <label>First Name</label>
        <input type="text" id="firstName" required>
        <label>Last Name</label>
        <input type="text" id="lastName" required>
        <button type="submit">Sign Up</button>
      </form>
      <div class="spots">Spots left: ${event.maxSpots - event.signups.length}</div>
      <h2>Sign-Up List</h2>
      <table>
        <tbody id="signupList">
          ${event.signups.map(n => `<tr><td>${n}</td></tr>`).join('')}
        </tbody>
      </table>
    `;

    const form = document.getElementById('signupForm');
    form.addEventListener('submit', e => {
      e.preventDefault();
      const name = `${document.getElementById('firstName').value} ${document.getElementById('lastName').value}`;
      fetch(`/api/events/${eventId}/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      })
      .then(res => res.json())
      .then(updatedEvent => {
        location.reload();
      });
    });
  });
