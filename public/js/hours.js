function handleCredentialResponse(response) {
    // Decode the JWT token from Google
    const data = parseJwt(response.credential);
    const email = data.email;
    const name = data.name;
  
    document.getElementById("loginSection").style.display = "none";
    document.getElementById("hoursSection").style.display = "block";
    document.getElementById("welcomeMessage").innerText = `Welcome, ${name}!`;
  
    // Send email to server to get hours
    fetch(`/api/getHours?email=${encodeURIComponent(email)}`)
      .then(res => res.json())
      .then(data => {
        if (data.hours !== undefined) {
          document.getElementById("hoursCount").innerText = data.hours;
        } else {
          document.getElementById("hoursCount").innerText = "No record found.";
        }
      })
      .catch(err => {
        console.error("Error fetching hours:", err);
        document.getElementById("hoursCount").innerText = "Error fetching hours.";
      });
  }
  
  // Helper to decode JWT
  function parseJwt(token) {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(c =>
      '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
    ).join(''));
    return JSON.parse(jsonPayload);
  }
  