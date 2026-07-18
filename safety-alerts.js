(function () {
  'use strict';

  const REFRESH_INTERVAL_MS = 15 * 60 * 1000;
  const NOTIFICATION_MEMORY_KEY = 'masofishLastSafetyNotification';
  const NOTIFICATION_COOLDOWN_MS = 2 * 60 * 60 * 1000;

  const PAGASA_LINKS = {
    gale: 'https://www.pagasa.dost.gov.ph/marine/gale-warning',
    weather: 'https://www.pagasa.dost.gov.ph/weather/weather-advisory',
    cyclone: 'https://www.pagasa.dost.gov.ph/tropical-cyclone/severe-weather-bulletin',
    visayas: 'https://www.pagasa.dost.gov.ph/regional-forecast/visprsd',
    marine: 'https://www.pagasa.dost.gov.ph/marine/high-seas-forecast'
  };

  function numeric(values) {
    return values.map(Number).filter(Number.isFinite);
  }

  function max(values, fallback = 0) {
    const valid = numeric(values);
    return valid.length ? Math.max(...valid) : fallback;
  }

  function severityRank(level) {
    return { normal: 0, advisory: 1, warning: 2, danger: 3, unavailable: -1 }[level] ?? -1;
  }

  function levelLabel(level) {
    return {
      normal: 'Conditions Update',
      advisory: 'Sea Advisory',
      warning: 'Sea Safety Warning',
      danger: 'High-Risk Sea Warning',
      unavailable: 'Safety Data Unavailable'
    }[level] || 'Sea Safety Update';
  }

  function levelIcon(level) {
    return {
      normal: 'verified_user',
      advisory: 'info',
      warning: 'warning',
      danger: 'emergency',
      unavailable: 'cloud_off'
    }[level] || 'info';
  }

  function levelClasses(level) {
    return {
      normal: 'bg-secondary-container/35 text-on-secondary-container border-secondary/30',
      advisory: 'bg-blue-50 text-blue-950 border-blue-300',
      warning: 'bg-amber-50 text-amber-950 border-amber-300',
      danger: 'bg-error-container text-on-error-container border-error/40',
      unavailable: 'bg-surface-container-high text-on-surface-variant border-outline-variant'
    }[level] || 'bg-surface-container-high text-on-surface-variant border-outline-variant';
  }

  function weatherRows(data, count = 6) {
    return window.MASOFISH_WEATHER?.nextHours(data, count) || [];
  }

  function marineRows(data, count = 6) {
    return window.MASOFISH_MARINE?.nextHours(data, count) || [];
  }

  function evaluate(weatherData, marineData) {
    const weather = window.MASOFISH_WEATHER;
    const marine = window.MASOFISH_MARINE;
    const upcomingWeather = weatherRows(weatherData, 6);
    const upcomingMarine = marineRows(marineData, 6);

    if (!upcomingWeather.length && !upcomingMarine.length) {
      return {
        level: 'unavailable',
        title: 'Sea-safety data unavailable',
        message: 'Weather and marine conditions could not be evaluated. Check official PAGASA advisories before going to sea.',
        reasons: ['No recent forecast data was available.'],
        recommendations: ['Review official PAGASA warnings before departure.'],
        metrics: {},
        generatedAt: new Date().toISOString(),
        officialLinks: PAGASA_LINKS
      };
    }

    const maxWind = max(upcomingWeather.map(row => row.windSpeed));
    const maxRain = max(upcomingWeather.map(row => row.rain));
    const maxWave = max(upcomingMarine.map(row => row.waveHeight));
    const weatherCodes = upcomingWeather.map(row => Number(row.code)).filter(Number.isFinite);
    const currentMarine = marine?.currentConditions(marineData) || {};
    const currentWeather = weather?.currentConditions(weatherData) || {};
    const thunderstorm = weatherCodes.some(code => [95, 96, 99].includes(code));
    const violentRain = weatherCodes.some(code => [65, 82].includes(code));
    const fog = weatherCodes.some(code => [45, 48].includes(code));

    const reasons = [];
    let level = 'normal';

    if (thunderstorm) {
      level = 'danger';
      reasons.push('Thunderstorm conditions are forecast within the next six hours.');
    }
    if (maxWind >= 35) {
      level = 'danger';
      reasons.push(`Wind may reach about ${Math.round(maxWind)} km/h.`);
    }
    if (maxWave >= 2.5) {
      level = 'danger';
      reasons.push(`Wave height may reach about ${maxWave.toFixed(1)} m.`);
    }

    if (severityRank(level) < severityRank('warning')) {
      if (violentRain) {
        level = 'warning';
        reasons.push('Heavy or violent rain showers are forecast.');
      }
      if (maxWind >= 25) {
        level = 'warning';
        reasons.push(`Wind may reach about ${Math.round(maxWind)} km/h.`);
      }
      if (maxWave >= 1.5) {
        level = 'warning';
        reasons.push(`Wave height may reach about ${maxWave.toFixed(1)} m.`);
      }
      if (maxRain >= 70) {
        level = 'warning';
        reasons.push(`Rain probability may reach ${Math.round(maxRain)}%.`);
      }
    }

    if (severityRank(level) < severityRank('advisory')) {
      if (fog) {
        level = 'advisory';
        reasons.push('Fog may reduce visibility.');
      }
      if (maxWind >= 20) {
        level = 'advisory';
        reasons.push(`Breezy conditions may reach about ${Math.round(maxWind)} km/h.`);
      }
      if (maxWave >= 1.0) {
        level = 'advisory';
        reasons.push(`Wave height may reach about ${maxWave.toFixed(1)} m.`);
      }
      if (maxRain >= 50) {
        level = 'advisory';
        reasons.push(`Rain probability may reach ${Math.round(maxRain)}%.`);
      }
    }

    if (!reasons.length) {
      reasons.push('No elevated app safety threshold was detected in the next six hours.');
    }

    const recommendations = [];
    if (level === 'danger') {
      recommendations.push(
        'Delay small-boat travel and remain near a safe harbor.',
        'Check current PAGASA gale, thunderstorm, and tropical-cyclone advisories.',
        'Inform family or a trusted contact of your location and plans.'
      );
    } else if (level === 'warning') {
      recommendations.push(
        'Reconsider departure, especially for small or lightly equipped boats.',
        'Wear life jackets and carry communication and emergency equipment.',
        'Monitor official advisories and be prepared to return to shore early.'
      );
    } else if (level === 'advisory') {
      recommendations.push(
        'Review the latest forecast before departure.',
        'Carry life jackets, lights, a whistle, and a charged communication device.',
        'Monitor changing clouds, wind, waves, and visibility.'
      );
    } else {
      recommendations.push(
        'Continue checking official advisories because conditions can change quickly.',
        'Carry required safety equipment and share your trip plan.'
      );
    }

    const message =
      level === 'danger'
        ? 'High-risk conditions may affect small-boat activity. Consider remaining ashore until conditions improve.'
        : level === 'warning'
          ? 'Potentially unsafe weather or wave conditions may develop. Use extra caution and consider delaying departure.'
          : level === 'advisory'
            ? 'Conditions need closer monitoring before and during fishing activity.'
            : 'No elevated MASOFISH threshold was detected, but official warnings must still be checked.';

    return {
      level,
      label: levelLabel(level),
      title: levelLabel(level),
      message,
      reasons,
      recommendations,
      metrics: {
        currentWeather: currentWeather ? weather?.weatherInfo(currentWeather.code)?.label : null,
        currentWind: Number.isFinite(currentWeather?.windSpeed) ? currentWeather.windSpeed : null,
        maximumWindSixHours: maxWind,
        maximumRainProbabilitySixHours: maxRain,
        currentWaveHeight: Number.isFinite(currentMarine?.waveHeight) ? currentMarine.waveHeight : null,
        maximumWaveHeightSixHours: maxWave,
        seaLevelTrend: currentMarine?.trend || null
      },
      generatedAt: new Date().toISOString(),
      officialLinks: PAGASA_LINKS,
      disclaimer: 'MASOFISH automatic alerts are decision-support estimates, not official government warnings.'
    };
  }

  async function getAutomaticAdvisory(options = {}) {
    const force = Boolean(options.force);
    const weather = window.MASOFISH_WEATHER;
    const marine = window.MASOFISH_MARINE;

    if (!weather || !marine) {
      throw new Error('Weather or marine module is not available on this page.');
    }

    const [weatherResult, marineResult] = await Promise.all([
      weather.fetchForecast({ force }),
      marine.fetchMarine({ force })
    ]);

    return {
      advisory: evaluate(weatherResult.data, marineResult.data),
      weatherResult,
      marineResult
    };
  }

  function metricLine(advisory) {
    const parts = [];
    const metrics = advisory.metrics || {};

    if (Number.isFinite(metrics.maximumWindSixHours)) {
      parts.push(`Wind up to ${Math.round(metrics.maximumWindSixHours)} km/h`);
    }
    if (Number.isFinite(metrics.maximumWaveHeightSixHours)) {
      parts.push(`Waves up to ${metrics.maximumWaveHeightSixHours.toFixed(1)} m`);
    }
    if (Number.isFinite(metrics.maximumRainProbabilitySixHours)) {
      parts.push(`Rain chance up to ${Math.round(metrics.maximumRainProbabilitySixHours)}%`);
    }

    return parts.join(' • ');
  }

  function renderBanner(element, advisory) {
    if (!element) return;

    element.className = `rounded-xl border p-4 ${levelClasses(advisory.level)}`;
    element.innerHTML = `
      <div class="flex items-start gap-3">
        <span class="material-symbols-outlined mt-0.5" style="${advisory.level === 'danger' ? "font-variation-settings:'FILL' 1;" : ''}">
          ${levelIcon(advisory.level)}
        </span>
        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap justify-between gap-2">
            <p class="font-extrabold uppercase tracking-wider text-xs">${advisory.label || levelLabel(advisory.level)}</p>
            <span class="text-xs opacity-75">${new Date(advisory.generatedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
          </div>
          <h2 class="font-black text-lg mt-1">${advisory.title}</h2>
          <p class="text-sm mt-1">${advisory.message}</p>
          ${metricLine(advisory) ? `<p class="text-xs font-bold mt-2">${metricLine(advisory)}</p>` : ''}
          <div class="flex flex-wrap gap-2 mt-3">
            <a href="announcements.html#sea-safety-center" class="rounded-lg bg-white/70 text-primary px-3 py-2 text-xs font-extrabold">View Safety Details</a>
            <a href="${PAGASA_LINKS.gale}" target="_blank" rel="noopener noreferrer" class="rounded-lg border border-current/25 px-3 py-2 text-xs font-extrabold">Check PAGASA</a>
          </div>
        </div>
      </div>`;
  }

  function renderDetailedCard(element, advisory) {
    if (!element) return;

    element.className = `rounded-2xl border overflow-hidden ${levelClasses(advisory.level)}`;
    element.innerHTML = `
      <div class="p-5">
        <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div class="flex items-start gap-3">
            <span class="material-symbols-outlined text-3xl mt-0.5">${levelIcon(advisory.level)}</span>
            <div>
              <p class="text-xs font-extrabold uppercase tracking-[.16em]">${advisory.label}</p>
              <h2 class="text-2xl font-black mt-1">${advisory.title}</h2>
              <p class="text-sm mt-2">${advisory.message}</p>
            </div>
          </div>
          <button type="button" data-refresh-safety class="rounded-xl bg-white/70 text-primary px-4 py-3 font-extrabold flex items-center justify-center gap-2 shrink-0">
            <span class="material-symbols-outlined">refresh</span>
            Refresh
          </button>
        </div>

        <div class="grid sm:grid-cols-3 gap-3 mt-5">
          <div class="rounded-xl bg-white/60 p-3">
            <p class="text-xs uppercase font-bold opacity-75">Maximum Wind</p>
            <p class="text-xl font-black mt-1">${Number.isFinite(advisory.metrics.maximumWindSixHours) ? `${Math.round(advisory.metrics.maximumWindSixHours)} km/h` : 'Unavailable'}</p>
          </div>
          <div class="rounded-xl bg-white/60 p-3">
            <p class="text-xs uppercase font-bold opacity-75">Maximum Waves</p>
            <p class="text-xl font-black mt-1">${Number.isFinite(advisory.metrics.maximumWaveHeightSixHours) ? `${advisory.metrics.maximumWaveHeightSixHours.toFixed(1)} m` : 'Unavailable'}</p>
          </div>
          <div class="rounded-xl bg-white/60 p-3">
            <p class="text-xs uppercase font-bold opacity-75">Rain Probability</p>
            <p class="text-xl font-black mt-1">${Number.isFinite(advisory.metrics.maximumRainProbabilitySixHours) ? `${Math.round(advisory.metrics.maximumRainProbabilitySixHours)}%` : 'Unavailable'}</p>
          </div>
        </div>

        <div class="grid md:grid-cols-2 gap-4 mt-5">
          <section class="rounded-xl bg-white/60 p-4">
            <h3 class="font-black flex items-center gap-2"><span class="material-symbols-outlined">analytics</span>Why this alert was generated</h3>
            <ul class="list-disc pl-5 mt-3 space-y-2 text-sm">
              ${advisory.reasons.map(reason => `<li>${reason}</li>`).join('')}
            </ul>
          </section>
          <section class="rounded-xl bg-white/60 p-4">
            <h3 class="font-black flex items-center gap-2"><span class="material-symbols-outlined">health_and_safety</span>Recommended precautions</h3>
            <ul class="list-disc pl-5 mt-3 space-y-2 text-sm">
              ${advisory.recommendations.map(item => `<li>${item}</li>`).join('')}
            </ul>
          </section>
        </div>

        <div class="mt-5 rounded-xl bg-white/60 p-4 text-sm">
          <p class="font-bold">${advisory.disclaimer}</p>
          <p class="mt-1 opacity-80">Always check official PAGASA bulletins before departure and while conditions are changing.</p>
        </div>
      </div>`;
  }

  async function fetchManualAlerts() {
    const auth = window.MASOFISH_AUTH || {};
    if (!auth.configured || !auth.client) return [];

    const { data, error } = await auth.client
      .from('safety_announcements')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      const text = `${error.message || ''} ${error.details || ''}`.toLowerCase();
      if (text.includes('safety_announcements') || text.includes('does not exist') || text.includes('relation')) {
        return [];
      }
      throw error;
    }

    const now = Date.now();
    return (data || []).filter(item => {
      const starts = item.starts_at ? new Date(item.starts_at).getTime() : 0;
      const expires = item.expires_at ? new Date(item.expires_at).getTime() : Number.POSITIVE_INFINITY;
      return starts <= now && expires >= now;
    });
  }

  function notificationSignature(advisory) {
    return `${advisory.level}:${advisory.reasons.join('|')}`;
  }

  function mayNotify(advisory) {
    return ['warning', 'danger'].includes(advisory.level);
  }

  async function requestNotifications() {
    if (!('Notification' in window)) {
      throw new Error('Browser notifications are not supported on this device.');
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      throw new Error('Notification permission was not granted.');
    }
    return permission;
  }

  function notifyIfNeeded(advisory) {
    if (!('Notification' in window) || Notification.permission !== 'granted' || !mayNotify(advisory)) return false;

    const signature = notificationSignature(advisory);
    let previous = null;
    try {
      previous = JSON.parse(localStorage.getItem(NOTIFICATION_MEMORY_KEY) || 'null');
    } catch (_) {
      previous = null;
    }

    if (previous?.signature === signature && Date.now() - previous.sentAt < NOTIFICATION_COOLDOWN_MS) {
      return false;
    }

    new Notification(`MASOFISH: ${advisory.title}`, {
      body: advisory.message,
      icon: undefined,
      tag: 'masofish-sea-safety'
    });

    localStorage.setItem(NOTIFICATION_MEMORY_KEY, JSON.stringify({
      signature,
      sentAt: Date.now()
    }));
    return true;
  }

  async function refreshPageAlerts(options = {}) {
    const result = await getAutomaticAdvisory(options);
    const advisory = result.advisory;

    document.querySelectorAll('[data-masofish-safety-banner]').forEach(element => {
      renderBanner(element, advisory);
    });

    document.querySelectorAll('[data-masofish-safety-detail]').forEach(element => {
      renderDetailedCard(element, advisory);
    });

    notifyIfNeeded(advisory);
    document.dispatchEvent(new CustomEvent('masofish:safety-updated', { detail: result }));
    return result;
  }

  function bindNotificationButtons() {
    document.querySelectorAll('[data-enable-safety-notifications]').forEach(button => {
      button.addEventListener('click', async () => {
        const original = button.innerHTML;
        button.disabled = true;
        button.textContent = 'Requesting permission…';

        try {
          await requestNotifications();
          button.textContent = 'Safety alerts enabled';
          const current = await refreshPageAlerts();
          notifyIfNeeded(current.advisory);
        } catch (error) {
          button.textContent = error.message || 'Unable to enable alerts';
        } finally {
          setTimeout(() => {
            button.disabled = false;
            button.innerHTML = original;
          }, 3000);
        }
      });
    });
  }

  function bindRefreshButtons() {
    document.addEventListener('click', event => {
      const button = event.target.closest('[data-refresh-safety]');
      if (!button) return;
      button.disabled = true;
      refreshPageAlerts({ force: true })
        .catch(error => console.error(error))
        .finally(() => { button.disabled = false; });
    });
  }

  window.MASOFISH_SAFETY = {
    PAGASA_LINKS,
    evaluate,
    getAutomaticAdvisory,
    fetchManualAlerts,
    renderBanner,
    renderDetailedCard,
    requestNotifications,
    refreshPageAlerts
  };

  bindNotificationButtons();
  bindRefreshButtons();

  if (document.querySelector('[data-masofish-safety-banner], [data-masofish-safety-detail]')) {
    refreshPageAlerts().catch(error => {
      console.error('Sea-safety alert failed:', error);
      const fallback = {
        level: 'unavailable',
        label: levelLabel('unavailable'),
        title: 'Sea-safety data unavailable',
        message: 'The automatic safety check could not be loaded. Review official PAGASA advisories before going to sea.',
        reasons: [error.message || 'Forecast data could not be loaded.'],
        recommendations: ['Check official PAGASA warnings before departure.'],
        metrics: {},
        generatedAt: new Date().toISOString(),
        officialLinks: PAGASA_LINKS,
        disclaimer: 'MASOFISH automatic alerts are decision-support estimates, not official government warnings.'
      };
      document.querySelectorAll('[data-masofish-safety-banner]').forEach(element => renderBanner(element, fallback));
      document.querySelectorAll('[data-masofish-safety-detail]').forEach(element => renderDetailedCard(element, fallback));
    });

    setInterval(() => {
      refreshPageAlerts().catch(error => console.error(error));
    }, REFRESH_INTERVAL_MS);
  }
})();