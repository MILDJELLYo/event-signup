const params = new URLSearchParams(window.location.search);
const eventId = params.get('id');
const container = document.getElementById('eventContainer');

fetch(`/api/events/${eventId}`)
  .then(res => res.json())
  .then(event => {
    const spotsLeft = event.maxSpots - event.signups.length;
    const eventFull = spotsLeft <= 0;

    container.innerHTML = `
      <h1>${event.title}</h1>
      <div style="margin-bottom:1rem;">
        <p><strong>Date:</strong> ${event.date}<br>
           <strong>Location:</strong> ${event.location}<br>
           <strong>Hours:</strong> ${event.hours}</p>
      </div>

      <div style="background:#f3f4f6;padding:1rem;border-radius:8px;margin-bottom:1rem;">
        <h3>About this Event</h3>
        <p>${event.description}</p>
        <h3>Contact</h3>
        <p>${event.contactName} - <a href="mailto:${event.contactEmail}">${event.contactEmail}</a></p>
      </div>

      ${eventFull ? `<div style="background:#dc2626;color:white;padding:10px;border-radius:8px;margin-bottom:1rem;text-align:center;font-weight:600;">
        Event Full
      </div>` : ''}

      <form id="signupForm" ${eventFull ? 'style="display:none;"' : ''}>
        <label>First Name</label>
        <input type="text" id="firstName" required>
        <label>Last Name</label>
        <input type="text" id="lastName" required>
        <button type="submit">Sign Up</button>
      </form>

      <div class="spots" id="spotsLeft">Spots left: ${spotsLeft}</div>

      <h2>Sign-Up List</h2>
      <table>
        <thead><tr><th>Name</th></tr></thead>
        <tbody id="signupList">
          ${event.signups.map(n => `<tr><td>${n}</td></tr>`).join('')}
        </tbody>
      </table>
    `;

    if (!eventFull) {
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
        .then(updatedEvent => location.reload());
      });
    }
  });
