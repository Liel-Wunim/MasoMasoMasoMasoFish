(function () {
  'use strict';

  const container = document.getElementById('dashboardRecentCatchList');
  const empty = document.getElementById('dashboardRecentCatchEmpty');
  if (!container || !window.MASOFISH_CATCH_LOG) return;

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    })[character]);
  }

  function dispositionLabel(value) {
    return {
      harvested: 'HARVESTED',
      released: 'RELEASED',
      sold: 'SOLD',
      kept: 'KEPT',
      other: 'OTHER'
    }[value] || 'OTHER';
  }

  function card(item) {
    const confidence = Number.isFinite(Number(item.confidence_score))
      ? `${Math.round(Number(item.confidence_score) * 100)}% AI Match`
      : 'Manual Record';

    return `
      <a href="catch-log.html" class="min-w-[280px] bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm active:scale-[0.98] transition-all">
        <div class="h-40 relative bg-surface-container-low flex items-center justify-center">
          ${item.display_image_url
            ? `<img class="w-full h-full object-cover" src="${escapeHtml(item.display_image_url)}" alt="${escapeHtml(item.fish_name)} catch"/>`
            : `<span class="material-symbols-outlined text-6xl text-on-surface-variant/40">set_meal</span>`}
          <div class="absolute top-3 left-3">
            <span class="bg-primary/85 text-white px-3 py-1 rounded-full text-xs font-extrabold flex items-center gap-1">
              <span class="material-symbols-outlined text-[14px]">auto_awesome</span>${confidence}
            </span>
          </div>
        </div>
        <div class="p-4">
          <div class="flex justify-between gap-3">
            <div>
              <h4 class="font-headline-sm text-headline-sm">${escapeHtml(item.fish_name)}</h4>
              <p class="font-body-sm text-on-surface-variant">${item.weight_kg ?? '—'} kg • ${item.length_cm ?? '—'} cm</p>
            </div>
            <span class="bg-secondary-container/45 text-on-secondary-container px-2 py-1 rounded text-xs font-extrabold h-fit">${dispositionLabel(item.disposition)}</span>
          </div>
          <div class="mt-3 flex items-center gap-2 text-on-surface-variant">
            <span class="material-symbols-outlined text-[18px]">location_on</span>
            <span class="font-label-md text-label-md">${escapeHtml(item.catch_location || 'Location not recorded')}</span>
          </div>
        </div>
      </a>`;
  }

  window.MASOFISH_CATCH_LOG.list({ limit: 5 })
    .then(items => {
      container.innerHTML = items.map(card).join('');
      empty.hidden = items.length > 0;
    })
    .catch(error => {
      console.error('Recent catch dashboard failed:', error);
      container.innerHTML = '';
      empty.hidden = false;
      empty.textContent = 'Catch log unavailable.';
    });
})();

// --- WEATHER & NOTIFICATION SETUP ---
let weatherNotifications = [];
const WEATHER_API_KEY = 'sb_publishable__YfC34NFu45KPAzZq0UrqQ_GSK-BuiX'; 

// Coordinates default to your primary location framework context
const LATITUDE = 9.4815;
const LONGITUDE = 123.3808;

/**
 * Grabs real-time data from the weather endpoint
 */
async function checkWeatherUpdate(lat, lon) {
    if (WEATHER_API_KEY === 'sb_publishable__YfC34NFu45KPAzZq0UrqQ_GSK-BuiX') {
        console.warn("Please configure a valid OpenWeatherMap API key.");
        return;
    }

    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${WEATHER_API_KEY}&units=metric`;
    
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('API down or incorrect coordinates');
        
        const data = await response.json();
        addWeatherNotification(data);
    } catch (error) {
        console.error("Weather refresh failed:", error);
    }
}

/**
 * Builds the text structure and updates arrays/badges
 */
function addWeatherNotification(weatherData) {
    const newAlert = {
        id: Date.now(),
        title: `Weather: ${weatherData.weather[0].main}`,
        description: `It is ${weatherData.main.temp}°C with ${weatherData.weather[0].description} in ${weatherData.name}.`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        read: false
    };
    
    weatherNotifications.unshift(newAlert);
    renderNotificationBadge();
    triggerDesktopNotification(newAlert.title, newAlert.description);
}

/**
 * Toggles visibility counter red-dot badge
 */
function renderNotificationBadge() {
    const bellBadge = document.getElementById('bell-badge');
    if (!bellBadge) return;

    const unreadCount = weatherNotifications.filter(n => !n.read).length;
    
    if (unreadCount > 0) {
        bellBadge.textContent = unreadCount;
        bellBadge.style.display = 'flex';
    } else {
        bellBadge.style.display = 'none';
    }
}

/**
 * Renders dropdown dynamic lists when open
 */
function toggleNotificationDropdown() {
    const dropdown = document.getElementById('notification-dropdown');
    if (!dropdown) return;

    dropdown.classList.toggle('show');
    
    // Once viewed, clear active status flags
    weatherNotifications.forEach(n => n.read = true);
    renderNotificationBadge();
    
    if (weatherNotifications.length === 0) {
        dropdown.innerHTML = '<div class="notification-item empty">No current weather updates</div>';
        return;
    }
    
    dropdown.innerHTML = weatherNotifications.map(n => `
        <div class="notification-item">
            <div class="notification-header">
                <span class="notification-title">${n.title}</span>
                <span class="notification-time">${n.time}</span>
            </div>
            <p class="notification-desc">${n.description}</p>
        </div>
    `).join('');
}

/**
 * Pushes browser dashboard alert card frames
 */
function triggerDesktopNotification(title, body) {
    if (Notification.permission === "granted") {
        new Notification(title, { body: body });
    }
}

// --- SETUP TRIGGERS ON BOOT ---
document.addEventListener('DOMContentLoaded', () => {
    const bellButton = document.getElementById('bell-button');
    
    if (bellButton) {
        bellButton.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleNotificationDropdown();
        });
    }

    // Dismiss active panels when clicking outside container
    window.addEventListener('click', () => {
        const dropdown = document.getElementById('notification-dropdown');
        if (dropdown && dropdown.classList.contains('show')) {
            dropdown.classList.remove('show');
        }
    });

    // Request desktop operating system visibility permissions early
    if (Notification.permission !== "granted" && Notification.permission !== "denied") {
        Notification.requestPermission();
    }

    // Check on startup
    checkWeatherUpdate(LATITUDE, LONGITUDE);

    // Refresh weather details every 30 minutes automatically
    setInterval(() => {
        checkWeatherUpdate(LATITUDE, LONGITUDE);
    }, 1800000);
});
