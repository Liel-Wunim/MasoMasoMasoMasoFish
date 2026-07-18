(function () {
  'use strict';

  const style = document.createElement('style');
  style.textContent = `
    html.masofish-auth-pending body { visibility: hidden !important; }
    html.masofish-auth-pending::before {
      content: "Checking MASOFISH account…";
      position: fixed;
      inset: 0;
      z-index: 99999;
      display: grid;
      place-items: center;
      visibility: visible;
      background: #f7fafc;
      color: #001e40;
      font: 700 15px/1.4 Inter, Arial, sans-serif;
    }
  `;
  document.head.appendChild(style);
  document.documentElement.classList.add('masofish-auth-pending');

  function currentPage() {
    const path = location.pathname.endsWith('/')
      ? 'index.html'
      : location.pathname.split('/').pop() || 'index.html';
    return `${path}${location.search}${location.hash}`;
  }

  function goToAuth(reason) {
    const next = encodeURIComponent(currentPage());
    const suffix = reason ? `&reason=${encodeURIComponent(reason)}` : '';
    location.replace(`auth.html?next=${next}${suffix}`);
  }

  function allowPage() {
    document.documentElement.classList.remove('masofish-auth-pending');
    document.dispatchEvent(new CustomEvent('masofish:auth-ready'));
  }

  async function checkAuthentication() {
    const auth = window.MASOFISH_AUTH || {};
    const requireAuth = auth.config?.requireAuth !== false;

    if (!requireAuth) {
      allowPage();
      return { mode: 'disabled', session: null };
    }

    if (!auth.configured) {
      if (auth.config?.allowPrototypeMode !== false && auth.prototypeMode) {
        allowPage();
        return { mode: 'prototype', session: null };
      }
      goToAuth('setup');
      return null;
    }

    try {
      const { data, error } = await auth.client.auth.getSession();
      if (error) throw error;

      if (!data.session) {
        goToAuth('signin');
        return null;
      }

      allowPage();
      return { mode: 'supabase', session: data.session };
    } catch (error) {
      console.error('MASOFISH authentication check failed:', error);
      goToAuth('auth-error');
      return null;
    }
  }

  window.masofishAuthReady = checkAuthentication();

  window.MASOFISH_AUTH?.client?.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT') {
      goToAuth('signed-out');
    }
  });
})();