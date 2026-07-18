(function () {
  'use strict';

  const auth = window.MASOFISH_AUTH || {};
  const header = document.querySelector('header');
  if (!header) return;

  const style = document.createElement('style');
  style.textContent = `
    .masofish-account-wrap { position: relative; margin-left: .25rem; flex: 0 0 auto; }
    .masofish-account-button {
      min-width: 42px; height: 42px; padding: 0 10px; border: 1px solid #c3c6d1;
      border-radius: 999px; background: #fff; color: #001e40; cursor: pointer;
      display: flex; align-items: center; justify-content: center; gap: 7px;
      font: 700 12px/1 Inter, Arial, sans-serif;
    }
    .masofish-account-button:hover { background: #f1f4f6; }
    .masofish-account-avatar {
      width: 26px; height: 26px; border-radius: 999px; display: grid; place-items: center;
      background: #003366; color: #fff; font-size: 12px;
    }
    .masofish-account-name { max-width: 105px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .masofish-account-menu {
      position: absolute; right: 0; top: calc(100% + 9px); width: min(280px, calc(100vw - 28px));
      padding: 12px; border: 1px solid #c3c6d1; border-radius: 12px; background: #fff;
      box-shadow: 0 16px 36px rgba(0, 30, 64, .18); color: #181c1e; z-index: 9999;
    }
    .masofish-account-menu[hidden] { display: none; }
    .masofish-account-email { margin: 3px 0 12px; color: #43474f; font: 400 12px/1.4 Inter, Arial, sans-serif; overflow-wrap: anywhere; }
    .masofish-account-menu strong { color: #001e40; font: 700 14px/1.4 Inter, Arial, sans-serif; }
    .masofish-account-action {
      width: 100%; border: 0; border-radius: 9px; padding: 11px 12px; cursor: pointer;
      display: flex; align-items: center; gap: 8px; background: #f1f4f6; color: #001e40;
      font: 700 13px/1 Inter, Arial, sans-serif;
    }
    .masofish-account-action:hover { background: #e0e3e5; }
    @media (max-width: 520px) { .masofish-account-name { display: none; } }
  `;
  document.head.appendChild(style);

  const wrap = document.createElement('div');
  wrap.className = 'masofish-account-wrap';
  wrap.innerHTML = `
    <button class="masofish-account-button" type="button" aria-expanded="false" aria-label="Open account menu">
      <span class="masofish-account-avatar" data-auth-avatar>U</span>
      <span class="masofish-account-name" data-auth-name>Account</span>
    </button>
    <div class="masofish-account-menu" hidden>
      <strong data-auth-menu-name>MASOFISH User</strong>
      <p class="masofish-account-email" data-auth-email></p>
      <button class="masofish-account-action" type="button" data-auth-signout>
        <span aria-hidden="true">↪</span>
        <span>Sign out</span>
      </button>
    </div>
  `;

  // Append to the right-side area when one exists; otherwise append directly to the header.
  const rightArea = Array.from(header.children).find((child, index) =>
    index > 0 && child.matches?.('div.flex, div[class*="items-center"]')
  );
  (rightArea || header).appendChild(wrap);

  const button = wrap.querySelector('.masofish-account-button');
  const menu = wrap.querySelector('.masofish-account-menu');
  const signOut = wrap.querySelector('[data-auth-signout]');

  button.addEventListener('click', (event) => {
    event.stopPropagation();
    const opening = menu.hidden;
    menu.hidden = !opening;
    button.setAttribute('aria-expanded', String(opening));
  });

  document.addEventListener('click', () => {
    menu.hidden = true;
    button.setAttribute('aria-expanded', 'false');
  });

  menu.addEventListener('click', event => event.stopPropagation());

  function displayUser(name, email, mode) {
    const cleanName = name || (mode === 'prototype' ? 'Prototype User' : 'MASOFISH User');
    const initial = cleanName.trim().charAt(0).toUpperCase() || 'U';

    wrap.querySelector('[data-auth-avatar]').textContent = initial;
    wrap.querySelector('[data-auth-name]').textContent = mode === 'prototype' ? 'Prototype' : cleanName.split(' ')[0];
    wrap.querySelector('[data-auth-menu-name]').textContent = cleanName;
    wrap.querySelector('[data-auth-email]').textContent =
      mode === 'prototype'
        ? 'Supabase has not been configured yet.'
        : (email || 'Signed in with Supabase');
  }

  async function initialize() {
    const ready = await window.masofishAuthReady;
    if (!ready) return;

    if (ready.mode === 'prototype') {
      displayUser('Prototype User', '', 'prototype');
      signOut.querySelector('span:last-child').textContent = 'Exit prototype mode';
      signOut.addEventListener('click', () => {
        localStorage.removeItem('masofishPrototypeMode');
        location.href = 'auth.html';
      });
      return;
    }

    if (ready.mode === 'disabled') {
      displayUser('Authentication Disabled', '', 'prototype');
      signOut.hidden = true;
      return;
    }

    const user = ready.session?.user;
    const fullName =
      user?.user_metadata?.full_name ||
      user?.user_metadata?.name ||
      user?.email?.split('@')[0] ||
      'MASOFISH User';

    displayUser(fullName, user?.email, 'supabase');

    signOut.addEventListener('click', async () => {
      signOut.disabled = true;
      signOut.querySelector('span:last-child').textContent = 'Signing out…';
      const { error } = await auth.client.auth.signOut();
      if (error) {
        console.error(error);
        signOut.disabled = false;
        signOut.querySelector('span:last-child').textContent = 'Try signing out again';
      }
    });
  }

  initialize().catch(error => console.error('Account menu failed:', error));
})();