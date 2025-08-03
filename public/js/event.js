const params = new URLSearchParams(window.location.search);
const eventId = params.get('id');
const container = document.getElementById('eventContainer');

fetch(`/api/events/${eventId}`)
  .then(res => res.json())
  .then(event => {
    const dateStr = new Date(event.date).toLocaleDateString('en-US');
    let html = `
      <h1>${event.title}</h1>
      <div style="border: 1px solid #ccc; padding: 1rem; border-radius: 8px; margin-bottom: 1rem;">
        <p><strong>Date:</strong> ${dateStr}</p>
        <p><strong>Location:</strong> ${event.location}</p>
        <p>${event.description}</p>
        <p><strong>Contact:</strong> ${event.contactName} - <a href="mailto:${event.contactEmail}">${event.contactEmail}</a></p>
      </div>
    `;

    html += `<h2>Available Time Slots</h2>`;
    event.timeSlots.forEach((slot, index) => {
      const spotsLeft = slot.maxSpots - slot.signups.length;
      html += `
        <div style="border: 1px solid #ddd; padding: 1rem; border-radius: 8px; margin-bottom: 1rem;">
          <p><strong>${slot.time}</strong> (${slot.hours})</p>
          <p>Spots left: ${spotsLeft}</p>
          ${spotsLeft > 0 ? `
            <form data-slot="${index}" class="signupForm">
              <label>First Name</label>
              <input type="text" name="firstName" required>
              <label>Last Name</label>
              <input type="text" name="lastName" required>
              <button type="submit">Sign Up</button>
            </form>
          ` : `<div style="color:red;font-weight:bold;">Full</div>`}
        </div>
      `;
    });

    container.innerHTML = html;

    document.querySelectorAll('.signupForm').forEach(form => {
      form.addEventListener('submit', e => {
        e.preventDefault();
        const slotIndex = e.target.dataset.slot;
        const name = `${e.target.firstName.value} ${e.target.lastName.value}`;
        fetch(`/api/events/${eventId}/signup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slotIndex, name })
        })
        .then(res => res.json())
        .then(() => location.reload());
      });
    });
  });
