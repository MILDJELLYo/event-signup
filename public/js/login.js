document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  try {
    const response = await fetch('/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message);
    }

    alert(`✅ Welcome ${data.email}!`);
    // Optionally save token and redirect
    window.location.href = '/index.html';
  } catch (err) {
    document.getElementById('error-message').innerText = err.message;
  }
});
