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

    // Build slot dropdown options for cancel modal
    let slotOptions = '';
    event.timeSlots.forEach((slot, index) => {
      slotOptions += `<option value="${index}">${slot.time} (${slot.hours} Service Hours)</option>`;
    });

    // Top event info + cancel button
    let html = `
      <h1>${event.title}</h1>
      <div style="border: 1px solid #ccc; padding: 1rem; border-radius: 8px; margin-bottom: 1rem;">
        <p><strong>Date:</strong> ${dateStr}</p>
        <p><strong>Location:</strong> ${event.location}</p>
        <p><strong>Description:</strong></p>
        <p>${event.description}</p>
        <p><strong>Contact:</strong> ${event.contactName} - <a href="mailto:${event.contactEmail}">${event.contactEmail}</a></p>
        <button id="openCancelModal" style="background:#dc2626; margin-top:1rem;">Cancel My Signup</button>
      </div>
      <h2>Available Slots</h2>
    `;

    // Render slots
    event.timeSlots.forEach((slot, index) => {
      const spotsLeft = slot.maxSpots - slot.signups.length;

      html += `
        <div style="border: 1px solid #ddd; padding: 1rem; border-radius: 8px; margin-bottom: 1rem;">
          <p><strong>${event.scheduleType === "timeSlots" ? formatTime(slot.time) : slot.time}</strong></p>
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
              : `
              <div style="color:red; font-weight:bold; margin-bottom:0.5rem;">Full - Join Waitlist</div>
              <form data-slot="${index}" class="waitlistForm">
                <label for="wlFirstName_${index}">First Name</label>
                <input type="text" id="wlFirstName_${index}" name="firstName" required>
                <label for="wlLastName_${index}">Last Name</label>
                <input type="text" id="wlLastName_${index}" name="lastName" required>
                <button type="submit">Join Waitlist</button>
              </form>`
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

          ${
            slot.waitlist && slot.waitlist.length > 0
              ? `
              <h4 style="margin-top:1rem;">Waitlist</h4>
              <ul>
                ${slot.waitlist.map(name => `<li>${name}</li>`).join('')}
              </ul>`
              : ''
          }
        </div>
      `;
    });

    container.innerHTML = html;

    // Signup form handling
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

    // Waitlist form handling
    document.querySelectorAll('.waitlistForm').forEach(form => {
      form.addEventListener('submit', e => {
        e.preventDefault();
        const slotIndex = e.target.dataset.slot;
        const firstName = e.target.firstName.value.trim();
        const lastName = e.target.lastName.value.trim();
        const name = `${firstName} ${lastName}`;

        fetch(`/api/events/${eventId}/waitlist`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slotIndex, name })
        })
          .then(res => {
            if (!res.ok) return res.json().then(err => Promise.reject(err));
            return res.json();
          })
          .then(() => location.reload())
          .catch(err => alert(err.error || 'Error joining waitlist'));
      });
    });

    // Modal handling for cancel signup
    const cancelModal = document.getElementById('cancelModal');
    const closeCancelModal = document.getElementById('closeCancelModal');
    document.getElementById('openCancelModal').addEventListener('click', () => {
      document.getElementById('cancelSlot').innerHTML = slotOptions;
      cancelModal.style.display = 'flex';
    });
    closeCancelModal.addEventListener('click', () => cancelModal.style.display = 'none');
    window.addEventListener('click', e => { if (e.target === cancelModal) cancelModal.style.display = 'none'; });

    // Cancel form submit
    document.getElementById('cancelForm').addEventListener('submit', e => {
      e.preventDefault();
      const slotIndex = document.getElementById('cancelSlot').value;
      const name = document.getElementById('cancelName').value.trim();

      fetch(`/api/events/${eventId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slotIndex, name })
      })
        .then(res => {
          if (!res.ok) return res.json().then(err => Promise.reject(err));
          return res.json();
        })
        .then(() => location.reload())
        .catch(err => alert(err.error || 'Error canceling signup'));
    });
  })
  .catch(() => {
    container.innerHTML = "<p>Failed to load event. Please try again later.</p>";
  });
