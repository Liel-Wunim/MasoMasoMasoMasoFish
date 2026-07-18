(function () {
  'use strict';

  const service = window.MASOFISH_CATCH_LOG;
  const byId = id => document.getElementById(id);
  const modal = byId('catchModal');

  const state = {
    catches: [],
    search: '',
    disposition: 'all',
    sort: 'newest',
    editing: null
  };

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    })[character]);
  }

  function formatDate(item) {
    if (!item.catch_date) return 'Date not recorded';
    const date = new Date(`${item.catch_date}T${item.catch_time || '00:00'}`);
    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: item.catch_time ? 'numeric' : undefined,
      minute: item.catch_time ? '2-digit' : undefined
    });
  }

  function dispositionLabel(value) {
    return {
      harvested: 'Harvested',
      released: 'Released',
      sold: 'Sold',
      kept: 'Kept',
      other: 'Other'
    }[value] || 'Other';
  }

  function dispositionClass(value) {
    return {
      harvested: 'bg-secondary-container/45 text-on-secondary-container',
      released: 'bg-blue-100 text-blue-900',
      sold: 'bg-violet-100 text-violet-900',
      kept: 'bg-amber-100 text-amber-950',
      other: 'bg-slate-100 text-slate-800'
    }[value] || 'bg-slate-100 text-slate-800';
  }

  function filtered() {
    let items = [...state.catches];

    if (state.search) {
      const term = state.search.toLowerCase();
      items = items.filter(item =>
        [item.fish_name, item.local_name, item.scientific_name, item.catch_location, item.notes]
          .some(value => String(value || '').toLowerCase().includes(term))
      );
    }

    if (state.disposition !== 'all') {
      items = items.filter(item => item.disposition === state.disposition);
    }

    if (state.sort === 'oldest') {
      items.sort((a, b) => new Date(`${a.catch_date}T${a.catch_time || '00:00'}`) - new Date(`${b.catch_date}T${b.catch_time || '00:00'}`));
    } else if (state.sort === 'heaviest') {
      items.sort((a, b) => Number(b.weight_kg || 0) - Number(a.weight_kg || 0));
    } else if (state.sort === 'freshest') {
      items.sort((a, b) => Number(b.freshness_score || -1) - Number(a.freshness_score || -1));
    } else {
      items.sort((a, b) => new Date(`${b.catch_date}T${b.catch_time || '00:00'}`) - new Date(`${a.catch_date}T${a.catch_time || '00:00'}`));
    }

    return items;
  }

  function updateStats() {
    const totalWeight = state.catches.reduce((sum, item) => sum + Number(item.weight_kg || 0), 0);
    const species = new Set(state.catches.map(item => item.fish_name?.trim().toLowerCase()).filter(Boolean));
    const freshnessValues = state.catches.map(item => Number(item.freshness_score)).filter(Number.isFinite);
    const averageFreshness = freshnessValues.length
      ? Math.round((freshnessValues.reduce((sum, value) => sum + value, 0) / freshnessValues.length) * 100)
      : null;

    byId('totalCatchCount').textContent = state.catches.length;
    byId('totalCatchWeight').textContent = `${totalWeight.toFixed(1)} kg`;
    byId('speciesCount').textContent = species.size;
    byId('averageFreshness').textContent = averageFreshness === null ? '—' : `${averageFreshness}%`;
  }

  function render() {
    byId('catchLoading').hidden = true;
    const items = filtered();
    const grid = byId('catchGrid');

    byId('catchEmpty').hidden = items.length > 0;
    grid.innerHTML = items.map(item => {
      const confidence = Number.isFinite(Number(item.confidence_score))
        ? `${Math.round(Number(item.confidence_score) * 100)}% AI`
        : null;
      const freshness = Number.isFinite(Number(item.freshness_score))
        ? `${Math.round(Number(item.freshness_score) * 100)}% fresh`
        : null;

      return `
        <article class="rounded-xl border border-outline-variant bg-white overflow-hidden shadow-sm">
          <div class="catch-card-image bg-surface-container-low flex items-center justify-center relative">
            ${item.display_image_url
              ? `<img src="${escapeHtml(item.display_image_url)}" alt="${escapeHtml(item.fish_name)} catch" class="w-full h-full object-cover"/>`
              : `<span class="material-symbols-outlined text-6xl text-on-surface-variant/40">set_meal</span>`}
            <div class="absolute top-3 left-3 flex flex-wrap gap-2">
              ${confidence ? `<span class="rounded-full bg-primary/85 text-white px-3 py-1 text-xs font-extrabold">${confidence}</span>` : ''}
              ${freshness ? `<span class="rounded-full bg-secondary/90 text-white px-3 py-1 text-xs font-extrabold">${freshness}</span>` : ''}
            </div>
          </div>

          <div class="p-4">
            <div class="flex items-start justify-between gap-3">
              <div>
                <h2 class="text-xl font-black text-primary">${escapeHtml(item.fish_name)}</h2>
                <p class="text-sm text-on-surface-variant">${escapeHtml(item.local_name || item.scientific_name || 'Name details not recorded')}</p>
              </div>
              <span class="rounded-full px-3 py-1 text-xs font-extrabold ${dispositionClass(item.disposition)}">${dispositionLabel(item.disposition)}</span>
            </div>

            <div class="grid grid-cols-2 gap-3 mt-4 text-sm">
              <div><span class="block text-xs uppercase font-bold text-on-surface-variant">Weight</span><strong>${item.weight_kg ?? '—'}${item.weight_kg !== null && item.weight_kg !== undefined ? ' kg' : ''}</strong></div>
              <div><span class="block text-xs uppercase font-bold text-on-surface-variant">Length</span><strong>${item.length_cm ?? '—'}${item.length_cm !== null && item.length_cm !== undefined ? ' cm' : ''}</strong></div>
            </div>

            <div class="mt-4 space-y-2 text-sm text-on-surface-variant">
              <p class="flex items-center gap-2"><span class="material-symbols-outlined text-[18px]">calendar_month</span>${escapeHtml(formatDate(item))}</p>
              <p class="flex items-center gap-2"><span class="material-symbols-outlined text-[18px]">location_on</span>${escapeHtml(item.catch_location || 'Location not recorded')}</p>
            </div>

            ${item.notes ? `<p class="text-sm text-on-surface-variant mt-3 line-clamp-3">${escapeHtml(item.notes)}</p>` : ''}

            <div class="grid grid-cols-2 gap-2 mt-4">
              <button type="button" class="edit-catch-button rounded-xl bg-surface-container-high text-primary p-3 font-extrabold" data-id="${escapeHtml(item.id)}">Edit</button>
              <button type="button" class="delete-catch-button rounded-xl bg-error-container text-on-error-container p-3 font-extrabold" data-id="${escapeHtml(item.id)}">Delete</button>
            </div>
          </div>
        </article>`;
    }).join('');

    grid.querySelectorAll('.edit-catch-button').forEach(button => {
      button.addEventListener('click', () => openEdit(button.dataset.id));
    });
    grid.querySelectorAll('.delete-catch-button').forEach(button => {
      button.addEventListener('click', () => deleteCatch(button.dataset.id));
    });

    updateStats();
  }

  function showFormMessage(text, type = 'error') {
    const box = byId('catchFormMessage');
    box.hidden = false;
    box.className = 'rounded-xl border p-3 text-sm';
    if (type === 'success') box.classList.add('bg-emerald-50', 'border-emerald-200', 'text-emerald-900');
    else box.classList.add('bg-red-50', 'border-red-200', 'text-red-900');
    box.textContent = text;
  }

  function openModal() {
    modal.hidden = false;
    document.body.classList.add('catch-scroll-lock');
  }

  function closeModal() {
    modal.hidden = true;
    document.body.classList.remove('catch-scroll-lock');
  }

  function resetForm() {
    state.editing = null;
    byId('catchForm').reset();
    byId('catchRecordId').value = '';
    byId('catchDate').value = new Date().toISOString().slice(0, 10);
    byId('catchModalTitle').textContent = 'Add Catch';
    byId('saveCatchButton').textContent = 'Save Catch';
    byId('catchAiFields').hidden = true;
    byId('catchFormMessage').hidden = true;
  }

  function openAdd() {
    resetForm();
    openModal();
    setTimeout(() => byId('catchFishName').focus(), 50);
  }

  function openEdit(id) {
    const item = state.catches.find(entry => entry.id === id);
    if (!item) return;

    resetForm();
    state.editing = item;
    byId('catchRecordId').value = item.id;
    byId('catchFishName').value = item.fish_name || '';
    byId('catchLocalName').value = item.local_name || '';
    byId('catchScientificName').value = item.scientific_name || '';
    byId('catchWeight').value = item.weight_kg ?? '';
    byId('catchLength').value = item.length_cm ?? '';
    byId('catchDate').value = item.catch_date || '';
    byId('catchTime').value = item.catch_time || '';
    byId('catchDisposition').value = item.disposition || 'harvested';
    byId('catchLocation').value = item.catch_location || '';
    byId('catchNotes').value = item.notes || '';
    byId('catchModalTitle').textContent = 'Edit Catch';
    byId('saveCatchButton').textContent = 'Update Catch';

    if (Number.isFinite(Number(item.confidence_score)) || Number.isFinite(Number(item.freshness_score))) {
      byId('catchAiFields').hidden = false;
      byId('catchConfidenceDisplay').textContent = Number.isFinite(Number(item.confidence_score))
        ? `${Math.round(Number(item.confidence_score) * 100)}%`
        : '—';
      byId('catchFreshnessDisplay').textContent = Number.isFinite(Number(item.freshness_score))
        ? `${Math.round(Number(item.freshness_score) * 100)}% — ${item.freshness_status || ''}`
        : '—';
    }

    openModal();
  }

  async function load() {
    byId('catchLoading').hidden = false;
    state.catches = await service.list();
    render();
  }

  async function save(event) {
    event.preventDefault();
    const submit = byId('saveCatchButton');
    submit.disabled = true;
    submit.textContent = state.editing ? 'Updating…' : 'Saving…';

    const payload = {
      fish_name: byId('catchFishName').value,
      local_name: byId('catchLocalName').value,
      scientific_name: byId('catchScientificName').value,
      weight_kg: byId('catchWeight').value,
      length_cm: byId('catchLength').value,
      catch_date: byId('catchDate').value,
      catch_time: byId('catchTime').value,
      disposition: byId('catchDisposition').value,
      catch_location: byId('catchLocation').value,
      notes: byId('catchNotes').value,
      confidence_score: state.editing?.confidence_score ?? null,
      freshness_score: state.editing?.freshness_score ?? null,
      freshness_status: state.editing?.freshness_status ?? null,
      source: state.editing?.source || 'manual'
    };
    const image = byId('catchImage').files?.[0] || null;

    try {
      if (state.editing) await service.update(state.editing.id, payload, image);
      else await service.create(payload, image);

      closeModal();
      await load();
    } catch (error) {
      showFormMessage(error.message || 'The catch could not be saved.');
    } finally {
      submit.disabled = false;
      submit.textContent = state.editing ? 'Update Catch' : 'Save Catch';
    }
  }

  async function deleteCatch(id) {
    if (!confirm('Delete this catch record permanently?')) return;
    try {
      await service.remove(id);
      await load();
    } catch (error) {
      alert(error.message || 'The catch record could not be deleted.');
    }
  }

  [byId('addCatchButton'), byId('emptyAddCatchButton')].forEach(button => button.addEventListener('click', openAdd));
  [byId('closeCatchModalButton'), byId('cancelCatchButton')].forEach(button => button.addEventListener('click', closeModal));
  modal.addEventListener('click', event => { if (event.target === modal) closeModal(); });
  byId('catchForm').addEventListener('submit', save);

  byId('catchSearchInput').addEventListener('input', event => {
    state.search = event.target.value.trim();
    render();
  });
  byId('catchDispositionFilter').addEventListener('change', event => {
    state.disposition = event.target.value;
    render();
  });
  byId('catchSortSelect').addEventListener('change', event => {
    state.sort = event.target.value;
    render();
  });

  load().catch(error => {
    console.error(error);
    byId('catchLoading').hidden = true;
    byId('catchEmpty').hidden = false;
    byId('catchEmpty').querySelector('p').textContent = error.message || 'Catch records could not be loaded.';
  });
})();