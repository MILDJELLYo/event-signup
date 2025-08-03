const params = new URLSearchParams(window.location.search);
const eventId = params.get('id');
const container = document.getElementById('eventContainer');

function formatTime(timeStr) {
  const [hour, minute] = timeStr.split(':').map(Number);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minute.toString().padStart(2, '0')} ${ampm}`;
}

fetch(`/api/events/${eventId}`)
  .then(res => res.json())
  .then(event => {
    const dateStr = new Date(event.date).toLocaleDateString('en-US');
    let html = `
      <h1>${event.title}</h1>
      <div style="border: 1px solid #ccc; padding: 1rem; border-radius: 8px; margin-bottom: 1rem;">
        <p><strong>Date:</strong> ${dateStr}</p>
        <p><strong>Location:</strong> ${event.location}</p>
        <p><strong>Description:</strong></p>
        <p>${event.description}</p>
        <p><strong>Contact:</strong> ${event.contactName} - <a href="mailto:${event.contactEmail}">${event.contactEmail}</a></p>
      </div>
      <h2>Available Time Slots</h2>
    `;

    event.timeSlots.forEach((slot, index) => {
      const spotsLeft = slot.maxSpots - slot.signups.length;
      html += `
        <div style="border: 1px solid #ddd; padding: 1rem; border-radius: 8px; margin-bottom: 1rem;">
          <p><strong>${formatTime(slot.time)}</strong></p>
          <p style="color: gray;">${slot.hours} Service Hours</p>
          <p>Spots left: ${spotsLeft}</p>
          ${
            spotsLeft > 0
              ? `
              <form data-slot="${index}" class="signupForm">
                <label for="firstName_${index}">First Name</label>
                <input type="text" id="firstName_${index}" name="firstName" required>
                <label for="lastName_${index}">Last Name</label>
                <input type="text" id="lastName_${index}" name="lastName" required>
                <button type="submit">Sign Up</button>
              </form>`
              : `<div style="color:red; font-weight:bold;">Full</div>`
          }
          <table style="width: 100%; margin-top: 1rem; border-collapse: collapse;">
            <thead>
              <tr><th style="text-align:left; border-bottom: 1px solid #ccc;">Signed Up</th></tr>
            </thead>
            <tbody>
              ${
                slot.signups.length > 0
                  ? slot.signups
                      .map(name => `<tr><td style="padding: 6px 0; border-bottom: 1px solid #eee;">${name}</td></tr>`)
                      .join('')
                  : '<tr><td>No sign-ups yet</td></tr>'
              }
            </tbody>
          </table>
        </div>
      `;
    });

    container.innerHTML = html;

    document.querySelectorAll('.signupForm').forEach(form => {
      form.addEventListener('submit', e => {
        e.preventDefault();
        const slotIndex = e.target.dataset.slot;
        const firstName = e.target.firstName.value.trim();
        const lastName = e.target.lastName.value.trim();
        const name = `${firstName} ${lastName}`;

        fetch(`/api/events/${eventId}/signup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slotIndex, name })
        })
          .then(res => {
            if (!res.ok) return res.json().then(err => Promise.reject(err));
            return res.json();
          })
          .then(() => location.reload())
          .catch(err => alert(err.error || 'Error signing up'));
      });
    });
  })
  .catch(() => {
    container.innerHTML = "<p>Failed to load event. Please try again later.</p>";
  });
