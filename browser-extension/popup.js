// Popup script for AI Governance Shield

// Load stats from storage
chrome.storage.local.get(['stats'], (result) => {
  const stats = result.stats || { allowed: 0, denied: 0, services: {} };

  // Update counts
  document.getElementById('allowed').textContent = stats.allowed || 0;
  document.getElementById('denied').textContent = stats.denied || 0;

  // Display services
  const servicesList = document.getElementById('services-list');
  const services = stats.services || {};

  if (Object.keys(services).length === 0) {
    servicesList.textContent = 'No activity yet';
  } else {
    servicesList.innerHTML = '';
    Object.entries(services)
      .slice(0, 5)  // Show top 5
      .forEach(([domain, counts]) => {
        const item = document.createElement('div');
        item.className = 'service-item';
        item.innerHTML = `
          <strong>${domain}</strong><br>
          <span style="color: #48bb78;">Allowed: ${counts.allowed}</span> |
          <span style="color: #f56565;">Denied: ${counts.denied}</span>
        `;
        servicesList.appendChild(item);
      });
  }
});

// View dashboard button
document.getElementById('viewDashboard').addEventListener('click', () => {
  chrome.tabs.create({ url: 'http://localhost:3000' });  // Grafana dashboard
});
