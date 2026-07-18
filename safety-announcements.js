(function () {
  'use strict';

  const byId = id => document.getElementById(id);
  const prototypeKey = 'masofishPrototypeSafetyAnnouncements';

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    })[character]);
  }

  function severityClass(severity) {
    return {
      critical: 'bg-error-container text-on-error-container border-error/30',
      warning: 'bg-amber-50 text-amber-950 border-amber-300',
      advisory: 'bg-blue-50 text-blue-950 border-blue-300',
      information: 'bg-secondary-container/35 text-on-secondary-container border-secondary/30'
    }[severity] || 'bg-surface-container-low text-on-surface border-outline-variant';
  }

  function severityIcon(severity) {
    return {
      critical: 'emergency',
      warning: 'warning',
      advisory: 'info',
      information: 'campaign'
    }[severity] || 'campaign';
  }

  function readPrototypeAlerts() {
    try {
      return JSON.parse(localStorage.getItem(prototypeKey) || '[]');
    } catch (_) {
      return [];
    }
  }

  function savePrototypeAlerts(items) {
    localStorage.setItem(prototypeKey, JSON.stringify(items));
  }

  function renderAlerts(items, canManage) {
    const list = byId('manualSafetyAlertList');
    const empty = byId('manualSafetyAlertEmpty');
    if (!list || !empty) return;

    if (!items.length) {
      list.innerHTML = '';
      empty.hidden = false;
      return;
    }

    empty.hidden = true;
    list.innerHTML = items.map(item => `
      <article class="rounded-xl border p-4 ${severityClass(item.severity)}">
        <div class="flex items-start justify-between gap-3">
          <div class="flex items-start gap-3">
            <span class="material-symbols-outlined mt-0.5">${severityIcon(item.severity)}</span>
            <div>
              <p class="text-xs font-extrabold uppercase tracking-wider">${escapeHtml(item.severity || 'advisory')}</p>
              <h3 class="font-black text-lg mt-1">${escapeHtml(item.title)}</h3>
              <p class="text-sm mt-2 whitespace-pre-wrap">${escapeHtml(item.message)}</p>
              <div class="flex flex-wrap gap-x-4 gap-y-1 text-xs mt-3 opacity-80">
                ${item.area ? `<span>Area: ${escapeHtml(item.area)}</span>` : ''}
                <span>Posted by ${escapeHtml(item.author_name || 'System Administrator')}</span>
                ${item.expires_at ? `<span>Expires ${new Date(item.expires_at).toLocaleString()}</span>` : ''}
              </div>
            </div>
          </div>
          ${canManage ? `<button type="button" data-delete-safety-alert="${escapeHtml(item.id)}" class="w-9 h-9 rounded-full bg-white/60 text-error flex items-center justify-center" aria-label="Delete safety announcement"><span class="material-symbols-outlined text-[20px]">delete</span></button>` : ''}
        </div>
      </article>`).join('');
  }

  async function getRole(client, userId) {
    if (!client || !userId) return 'user';
    const { data, error } = await client
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.warn('Could not read profile role:', error);
      return 'user';
    }
    return data?.role || 'user';
  }

  async function loadRealAlerts(client) {
    const { data, error } = await client
      .from('safety_announcements')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      const text = `${error.message || ''} ${error.details || ''}`.toLowerCase();
      if (text.includes('safety_announcements') || text.includes('does not exist') || text.includes('relation')) {
        byId('safetyDatabaseNotice').hidden = false;
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

  async function initialize() {
    const ready = await window.masofishAuthReady;
    if (!ready) return;

    const prototype = ready.mode !== 'supabase';
    const client = window.MASOFISH_AUTH?.client;
    const user = ready.session?.user || {
      id: 'prototype-admin',
      email: 'prototype@masofish.local',
      user_metadata: { full_name: 'Prototype Administrator' }
    };
    const role = prototype ? 'admin' : await getRole(client, user.id);
    const canManage = role === 'admin';

    byId('safetyAdminPanel').hidden = !canManage;
    byId('safetyAdminStatus').textContent =
      prototype ? 'Prototype administrator mode' : `Signed in as ${role}`;

    async function load() {
      const alerts = prototype ? readPrototypeAlerts() : await loadRealAlerts(client);
      renderAlerts(alerts, canManage);
    }

    byId('safetyAnnouncementForm').addEventListener('submit', async event => {
      event.preventDefault();
      if (!canManage) return;

      const submit = byId('publishSafetyAnnouncementButton');
      submit.disabled = true;
      submit.textContent = 'Publishing…';

      const payload = {
        title: byId('safetyTitle').value.trim(),
        message: byId('safetyMessage').value.trim(),
        severity: byId('safetySeverity').value,
        area: byId('safetyArea').value.trim() || null,
        starts_at: byId('safetyStartsAt').value ? new Date(byId('safetyStartsAt').value).toISOString() : new Date().toISOString(),
        expires_at: byId('safetyExpiresAt').value ? new Date(byId('safetyExpiresAt').value).toISOString() : null,
        status: 'active',
        created_by: user.id,
        author_name:
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.email?.split('@')[0] ||
          'System Administrator'
      };

      try {
        if (!payload.title || !payload.message) {
          throw new Error('A title and message are required.');
        }

        if (prototype) {
          const alerts = readPrototypeAlerts();
          alerts.unshift({
            ...payload,
            id: `prototype-alert-${crypto.randomUUID()}`,
            created_at: new Date().toISOString()
          });
          savePrototypeAlerts(alerts);
        } else {
          const { error } = await client.from('safety_announcements').insert(payload);
          if (error) throw error;
        }

        byId('safetyAnnouncementForm').reset();
        await load();
      } catch (error) {
        alert(error.message || 'The safety announcement could not be published.');
      } finally {
        submit.disabled = false;
        submit.textContent = 'Publish Safety Announcement';
      }
    });

    byId('manualSafetyAlertList').addEventListener('click', async event => {
      const button = event.target.closest('[data-delete-safety-alert]');
      if (!button || !canManage) return;
      if (!confirm('Delete this safety announcement?')) return;

      const id = button.dataset.deleteSafetyAlert;
      try {
        if (prototype) {
          savePrototypeAlerts(readPrototypeAlerts().filter(item => item.id !== id));
        } else {
          const { error } = await client.from('safety_announcements').delete().eq('id', id);
          if (error) throw error;
        }
        await load();
      } catch (error) {
        alert(error.message || 'The announcement could not be deleted.');
      }
    });

    await load();
  }

  initialize().catch(error => {
    console.error('Safety announcements failed:', error);
    byId('manualSafetyAlertEmpty').hidden = false;
    byId('manualSafetyAlertEmpty').textContent = 'Safety announcements could not be loaded.';
  });
})();