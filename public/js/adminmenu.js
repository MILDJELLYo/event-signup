async function showAdminMenu() {
    try {
      const res = await fetch('/api/userinfo');
      if (!res.ok) return;
  
      const user = await res.json();
      console.log('USER INFO:', user);
  
      if (user.role === 'exec_board') {
        const adminSection = document.querySelector('.admin-links');
        if (adminSection) {
          adminSection.style.display = 'block';
        }
      }
    } catch (err) {
      console.error('Admin role check failed:', err);
    }
  }
  
  document.addEventListener('DOMContentLoaded', showAdminMenu);
  
  
       // Dropdown toggle
  document.querySelectorAll('.admin-dropdown .dropdown-toggle').forEach(toggle => {
    toggle.addEventListener('click', e => {
      e.preventDefault();
      const dropdown = toggle.parentElement;
      dropdown.classList.toggle('open');
    });
  });