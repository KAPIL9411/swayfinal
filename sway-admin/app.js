/* SWAY admin panel - student ID review */

const API = 'https://sway-api.getfixyes.workers.dev';
const STORAGE_KEY = 'sway.admin.session';

const $ = (selector) => document.querySelector(selector);
const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

let session = readSession();
let activeStatus = 'pending';

/* ---------- session ---------- */

function readSession() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
  } catch {
    return null;
  }
}

function writeSession(next) {
  session = next;
  if (next) localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  else localStorage.removeItem(STORAGE_KEY);
}

async function refreshSession() {
  if (!session?.refresh_token) return false;

  const res = await fetch(`${API}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: session.refresh_token }),
  });

  if (!res.ok) return false;

  const body = await res.json();
  writeSession({
    ...session,
    access_token: body.session.access_token,
    refresh_token: body.session.refresh_token,
    expires_at: body.session.expires_at,
  });
  return true;
}

/* ---------- api ---------- */

async function api(path, options = {}, retry = true) {
  const headers = { ...(options.headers || {}) };
  if (options.body) headers['Content-Type'] = 'application/json';
  if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;

  const res = await fetch(`${API}${path}`, { ...options, headers });

  if (res.status === 401 && retry && (await refreshSession())) {
    return api(path, options, false);
  }

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(body.error || `Request failed (${res.status})`);
    error.status = res.status;
    throw error;
  }
  return body;
}

/* ---------- views ---------- */

function showLogin() {
  $('#loginView').hidden = false;
  $('#dashView').hidden = true;
  $('#logoutBtn').hidden = true;
  $('#who').textContent = '';
}

function showDashboard() {
  $('#loginView').hidden = true;
  $('#dashView').hidden = false;
  $('#logoutBtn').hidden = false;
  $('#who').textContent = session?.email || '';
}

function setNotice(message) {
  const notice = $('#notice');
  if (!message) {
    notice.hidden = true;
    notice.textContent = '';
    return;
  }
  notice.hidden = false;
  notice.textContent = message;
}

/* ---------- login ---------- */

$('#loginForm').addEventListener('submit', async (event) => {
  event.preventDefault();

  const email = $('#email').value.trim().toLowerCase();
  const password = $('#password').value;
  const errorBox = $('#loginError');
  const button = $('#loginBtn');

  errorBox.hidden = true;

  if (!email || !password) {
    errorBox.textContent = 'Enter your email and password.';
    errorBox.hidden = false;
    return;
  }

  button.disabled = true;
  button.textContent = 'Checking…';

  try {
    const body = await api(
      '/auth/admin-login',
      { method: 'POST', body: JSON.stringify({ email, password }) },
      false
    );

    writeSession({
      access_token: body.session.access_token,
      refresh_token: body.session.refresh_token,
      expires_at: body.session.expires_at,
      email: body.user.email,
    });

    $('#password').value = '';
    showDashboard();
    await loadAll();
  } catch (err) {
    errorBox.textContent = err.message;
    errorBox.hidden = false;
  } finally {
    button.disabled = false;
    button.textContent = 'Log in';
  }
});

$('#logoutBtn').addEventListener('click', () => {
  writeSession(null);
  showLogin();
});

/* ---------- data ---------- */

async function loadCounts() {
  try {
    const { counts } = await api('/verification/admin/counts');
    $('#statPending').textContent = counts.pending ?? 0;
    $('#statApproved').textContent = counts.approved ?? 0;
    $('#statRejected').textContent = counts.rejected ?? 0;
  } catch {
    $('#statPending').textContent = '–';
    $('#statApproved').textContent = '–';
    $('#statRejected').textContent = '–';
  }
}

async function loadList() {
  const list = $('#list');
  list.replaceChildren(el('div', 'empty', 'Loading…'));
  setNotice(null);

  try {
    const { requests, unavailable } = await api(`/verification/admin/list?status=${activeStatus}`);

    if (unavailable) {
      setNotice(
        'The verification tables are missing. Run sway-backend/sql/verification.sql in Supabase, then reload.'
      );
      list.replaceChildren();
      return;
    }

    render(requests);
  } catch (err) {
    if (err.status === 401) {
      writeSession(null);
      showLogin();
      return;
    }
    if (err.status === 403) {
      setNotice('This account is no longer an admin.');
      return;
    }
    setNotice(`Could not load the queue: ${err.message}`);
    list.replaceChildren();
  }
}

async function loadAll() {
  await Promise.all([loadCounts(), loadList()]);
}

/* ---------- rendering ---------- */

function render(requests) {
  const list = $('#list');
  list.replaceChildren();

  if (!requests.length) {
    const empty = el('div', 'empty');
    empty.append(
      el('strong', '', activeStatus === 'pending' ? 'Queue is clear' : 'Nothing here yet'),
      document.createTextNode(
        activeStatus === 'pending'
          ? 'No student IDs are waiting for review.'
          : 'Decisions will show up in this tab.'
      )
    );
    list.append(empty);
    return;
  }

  for (const request of requests) {
    list.append(renderCard(request));
  }
}

function renderCard(request) {
  const card = el('article', 'req');

  if (request.imageUrl) {
    const image = el('img', 'req-img');
    image.src = request.imageUrl;
    image.alt = `Student ID for ${request.username || request.email || 'student'}`;
    image.loading = 'lazy';
    image.addEventListener('click', () => openViewer(request.imageUrl));
    card.append(image);
  } else {
    card.append(el('div', 'req-img empty', 'Photo deleted after review'));
  }

  const body = el('div', 'req-body');

  const top = el('div', 'req-top');
  top.append(
    el('h2', 'req-college', request.collegeName || 'College not set'),
    el('span', 'req-time', formatDate(request.createdAt))
  );

  const meta = el('div', 'req-meta');
  meta.append(el('span', `chip status-${request.status}`, request.status));
  if (request.username) meta.append(el('span', 'chip', `@${request.username}`));
  if (request.email) meta.append(el('span', 'chip', request.email));

  body.append(top, meta);

  if (request.note) body.append(el('p', 'req-note', `Note: ${request.note}`));

  if (request.status === 'pending') {
    const actions = el('div', 'req-actions');
    const reject = el('button', 'btn-reject', 'Reject');
    const approve = el('button', 'btn-approve', 'Approve');

    reject.addEventListener('click', () => review(request, 'reject', reject, approve));
    approve.addEventListener('click', () => review(request, 'approve', reject, approve));

    actions.append(reject, approve);
    body.append(actions);
  }

  card.append(body);
  return card;
}

async function review(request, action, rejectBtn, approveBtn) {
  let note;

  if (action === 'reject') {
    note = window.prompt(
      'Why is this ID being rejected? The student sees this.',
      'The student ID could not be verified.'
    );
    if (note === null) return;
    note = note.trim().slice(0, 300);
  } else {
    const confirmed = window.confirm('Approve this student? The photo is deleted right after.');
    if (!confirmed) return;
  }

  rejectBtn.disabled = true;
  approveBtn.disabled = true;

  try {
    await api(`/verification/admin/${request.id}`, {
      method: 'POST',
      body: JSON.stringify({ action, note }),
    });

    if (action === 'approve') {
      await Promise.all([loadCounts(), loadList()]);
    } else {
      await Promise.all([loadCounts(), loadList()]);
    }
  } catch (err) {
    window.alert(`Could not save the decision: ${err.message}`);
    rejectBtn.disabled = false;
    approveBtn.disabled = false;
  }
}

function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/* ---------- image viewer ---------- */

function openViewer(url) {
  $('#viewerImg').src = url;
  $('#viewer').hidden = false;
}

$('#viewerClose').addEventListener('click', () => {
  $('#viewer').hidden = true;
  $('#viewerImg').removeAttribute('src');
});

$('#viewer').addEventListener('click', (event) => {
  if (event.target.id === 'viewer') {
    $('#viewer').hidden = true;
    $('#viewerImg').removeAttribute('src');
  }
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    $('#viewer').hidden = true;
    $('#viewerImg').removeAttribute('src');
  }
});

/* ---------- tabs ---------- */

document.querySelectorAll('.tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach((item) => item.classList.remove('active'));
    tab.classList.add('active');
    activeStatus = tab.dataset.status;
    loadList();
  });
});

$('#refreshBtn').addEventListener('click', () => loadAll());

/* ---------- boot ---------- */

if (session?.access_token) {
  showDashboard();
  loadAll();
} else {
  showLogin();
}
