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