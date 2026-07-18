(function () {
  'use strict';

  const auth = window.MASOFISH_AUTH || {};
  const configured = auth.configured;
  const client = auth.client;

  const loginTab = document.getElementById('loginTab');
  const signupTab = document.getElementById('signupTab');
  const loginForm = document.getElementById('loginForm');
  const signupForm = document.getElementById('signupForm');
  const setupPanel = document.getElementById('setupPanel');
  const authPanel = document.getElementById('authPanel');
  const message = document.getElementById('authMessage');
  const continuePrototype = document.getElementById('continuePrototype');

  function safeNextPage() {
    const candidate = new URLSearchParams(location.search).get('next') || 'index.html';
    const safe =
      !candidate.startsWith('//') &&
      !candidate.includes('://') &&
      /^[a-zA-Z0-9._~!$&'()*+,;=:@%/?#-]+$/.test(candidate);
    return safe ? candidate : 'index.html';
  }

  function showMessage(text, type = 'info') {
    message.hidden = false;
    message.className = 'rounded-xl border p-3 text-sm';
    if (type === 'error') {
      message.classList.add('bg-red-50', 'border-red-200', 'text-red-900');
    } else if (type === 'success') {
      message.classList.add('bg-emerald-50', 'border-emerald-200', 'text-emerald-900');
    } else {
      message.classList.add('bg-slate-50', 'border-slate-200', 'text-slate-700');
    }
    message.textContent = text;
  }

  function clearMessage() {
    message.hidden = true;
    message.textContent = '';
  }

  function selectTab(tab) {
    const loginSelected = tab === 'login';
    loginForm.hidden = !loginSelected;
    signupForm.hidden = loginSelected;

    loginTab.className = loginSelected
      ? 'auth-tab auth-tab-active'
      : 'auth-tab';
    signupTab.className = loginSelected
      ? 'auth-tab'
      : 'auth-tab auth-tab-active';

    loginTab.setAttribute('aria-selected', String(loginSelected));
    signupTab.setAttribute('aria-selected', String(!loginSelected));
    clearMessage();
  }

  async function redirectIfSignedIn() {
    if (!configured) return;
    const { data, error } = await client.auth.getSession();
    if (!error && data.session) {
      location.replace(safeNextPage());
    }
  }

  loginTab.addEventListener('click', () => selectTab('login'));
  signupTab.addEventListener('click', () => selectTab('signup'));

  document.querySelectorAll('[data-toggle-password]').forEach(button => {
    button.addEventListener('click', () => {
      const input = document.getElementById(button.dataset.togglePassword);
      const showing = input.type === 'text';
      input.type = showing ? 'password' : 'text';
      button.textContent = showing ? 'Show' : 'Hide';
    });
  });

  loginForm.addEventListener('submit', async event => {
    event.preventDefault();
    clearMessage();

    if (!configured) {
      showMessage('Connect the Supabase project before using real login.', 'error');
      return;
    }

    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const submit = loginForm.querySelector('button[type="submit"]');

    submit.disabled = true;
    submit.textContent = 'Signing in…';

    try {
      const { error } = await client.auth.signInWithPassword({ email, password });
      if (error) throw error;
      location.replace(safeNextPage());
    } catch (error) {
      showMessage(error.message || 'Unable to sign in. Check the email and password.', 'error');
    } finally {
      submit.disabled = false;
      submit.textContent = 'Sign In';
    }
  });

  signupForm.addEventListener('submit', async event => {
    event.preventDefault();
    clearMessage();

    if (!configured) {
      showMessage('Connect the Supabase project before creating real accounts.', 'error');
      return;
    }

    const fullName = document.getElementById('signupName').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;
    const confirmPassword = document.getElementById('signupConfirmPassword').value;
    const submit = signupForm.querySelector('button[type="submit"]');

    if (fullName.length < 2) {
      showMessage('Please enter your complete name.', 'error');
      return;
    }
    if (password.length < 8) {
      showMessage('Use a password with at least 8 characters.', 'error');
      return;
    }
    if (password !== confirmPassword) {
      showMessage('The passwords do not match.', 'error');
      return;
    }

    submit.disabled = true;
    submit.textContent = 'Creating account…';

    try {
      const redirectUrl = new URL('auth.html?verified=1', location.href).href;
      const { data, error } = await client.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: 'user'
          },
          emailRedirectTo: redirectUrl
        }
      });

      if (error) throw error;

      if (data.session) {
        location.replace(safeNextPage());
      } else {
        showMessage(
          'Account created. Check your email and confirm the address before signing in.',
          'success'
        );
        selectTab('login');
        document.getElementById('loginEmail').value = email;
      }
    } catch (error) {
      showMessage(error.message || 'The account could not be created.', 'error');
    } finally {
      submit.disabled = false;
      submit.textContent = 'Create Account';
    }
  });

  document.getElementById('forgotPassword').addEventListener('click', async () => {
    clearMessage();

    if (!configured) {
      showMessage('Connect the Supabase project before requesting a password reset.', 'error');
      return;
    }

    const email = document.getElementById('loginEmail').value.trim();
    if (!email) {
      showMessage('Enter your email address first, then select Forgot password.', 'error');
      return;
    }

    try {
      const redirectTo = new URL('auth.html', location.href).href;
      const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo });
      if (error) throw error;
      showMessage('A password-reset email has been requested. Check your inbox.', 'success');
    } catch (error) {
      showMessage(error.message || 'The reset email could not be requested.', 'error');
    }
  });

  continuePrototype.addEventListener('click', () => {
    localStorage.setItem('masofishPrototypeMode', '1');
    location.replace(safeNextPage());
  });

  if (!configured) {
    authPanel.hidden = true;
    setupPanel.hidden = false;
    if (auth.config?.allowPrototypeMode === false) {
      continuePrototype.hidden = true;
    }
  } else {
    setupPanel.hidden = true;
    authPanel.hidden = false;
    redirectIfSignedIn().catch(error => console.error(error));
  }

  const params = new URLSearchParams(location.search);
  if (params.get('verified') === '1') {
    showMessage('Email confirmed. You may now sign in.', 'success');
  }
  if (params.get('reason') === 'signed-out') {
    showMessage('You have signed out successfully.', 'success');
  }
})();