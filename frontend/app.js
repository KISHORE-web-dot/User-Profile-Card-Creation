/**
 * ProfileForge — app.js
 * Handles form submission, POST request to FastAPI backend,
 * rendering profile cards, and UI interactions.
 */

const API_BASE = 'http://127.0.0.1:8000';

// ── DOM REFS ──────────────────────────────────────────────────────────────
const form           = document.getElementById('profileForm');
const generateBtn    = document.getElementById('generateBtn');
const clearBtn       = document.getElementById('clearBtn');
const bioTextarea    = document.getElementById('bio');
const bioCount       = document.getElementById('bioCount');
const themePicker    = document.getElementById('themePicker');
const cardsGallery   = document.getElementById('cardsGallery');
const emptyState     = document.getElementById('emptyState');
const cardCountBadge = document.getElementById('cardCount');
const loadingOverlay = document.getElementById('loadingOverlay');
const formToast      = document.getElementById('formToast');
const cardModal      = document.getElementById('cardModal');
const modalClose     = document.getElementById('modalClose');
const modalCardContainer = document.getElementById('modalCardContainer');

// ── STATE ─────────────────────────────────────────────────────────────────
let selectedTheme = 'purple';
let cards         = []; // local mirror of generated cards

// ── INIT ──────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadExistingCards();
  setupEventListeners();
});

// ── EVENT LISTENERS ───────────────────────────────────────────────────────
function setupEventListeners() {
  // Bio character counter
  bioTextarea.addEventListener('input', () => {
    bioCount.textContent = bioTextarea.value.length;
  });

  // Theme picker
  themePicker.querySelectorAll('.theme-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      themePicker.querySelectorAll('.theme-btn').forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-pressed', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-pressed', 'true');
      selectedTheme = btn.dataset.theme;
    });
  });

  // Form submission
  form.addEventListener('submit', handleFormSubmit);

  // Clear button
  clearBtn.addEventListener('click', handleClear);

  // Modal close
  modalClose.addEventListener('click', closeModal);
  cardModal.addEventListener('click', e => {
    if (e.target === cardModal) closeModal();
  });

  // Keyboard navigation for modal
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !cardModal.hidden) closeModal();
  });
}

// ── FORM SUBMISSION ───────────────────────────────────────────────────────
async function handleFormSubmit(e) {
  e.preventDefault();

  if (!validateForm()) return;

  const payload = buildPayload();

  setLoadingState(true);
  hideToast();

  try {
    const response = await fetch(`${API_BASE}/api/profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || `Server error: ${response.status}`);
    }

    const card = await response.json();
    cards.unshift(card);
    prependCardToGallery(card);
    updateCardCount();
    showToast('✦ Profile card generated successfully!', 'success');

  } catch (err) {
    if (err.name === 'TypeError') {
      showToast('⚠ Could not connect to the backend. Is it running on port 8000?', 'error');
    } else {
      showToast(`⚠ ${err.message}`, 'error');
    }
    console.error('Profile generation error:', err);
  } finally {
    setLoadingState(false);
  }
}

// ── VALIDATION ────────────────────────────────────────────────────────────
function validateForm() {
  let valid = true;

  const name = document.getElementById('name').value.trim();
  const bio  = document.getElementById('bio').value.trim();

  clearError('nameError');
  clearError('bioError');

  if (!name) {
    showError('nameError', 'Name is required.');
    document.getElementById('name').focus();
    valid = false;
  }

  if (!bio) {
    showError('bioError', 'Bio is required.');
    if (valid) document.getElementById('bio').focus();
    valid = false;
  }

  return valid;
}

function showError(id, msg) {
  const el = document.getElementById(id);
  if (el) el.textContent = msg;
}

function clearError(id) {
  const el = document.getElementById(id);
  if (el) el.textContent = '';
}

// ── PAYLOAD BUILDER ───────────────────────────────────────────────────────
function buildPayload() {
  return {
    name:      document.getElementById('name').value.trim(),
    title:     document.getElementById('title').value.trim(),
    bio:       document.getElementById('bio').value.trim(),
    image_url: document.getElementById('imageUrl').value.trim(),
    location:  document.getElementById('location').value.trim(),
    email:     document.getElementById('email').value.trim(),
    website:   document.getElementById('website').value.trim(),
    twitter:   document.getElementById('twitter').value.trim(),
    github:    document.getElementById('github').value.trim(),
    skills:    document.getElementById('skills').value.trim(),
    theme:     selectedTheme,
  };
}

// ── LOAD EXISTING CARDS ───────────────────────────────────────────────────
async function loadExistingCards() {
  try {
    const response = await fetch(`${API_BASE}/api/profiles`);
    if (!response.ok) return;
    const data = await response.json();
    cards = data;
    data.forEach(card => appendCardToGallery(card));
    updateCardCount();
  } catch (_) {
    // Backend may not be running yet; silently skip
  }
}

// ── CARD RENDERING ────────────────────────────────────────────────────────
function buildCardHTML(card, isModal = false) {
  const avatarContent = card.image_url
    ? `<img src="${escHtml(card.image_url)}" alt="${escHtml(card.name)} avatar" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" /><div class="card-avatar-initials" style="display:none;">${escHtml(card.initials)}</div>`
    : `<div class="card-avatar-initials">${escHtml(card.initials)}</div>`;

  const skillsHTML = card.skills.length
    ? `<div class="card-skills">${card.skills.map(s => `<span class="skill-tag">${escHtml(s)}</span>`).join('')}</div>`
    : '';

  const metaItems = [];
  if (card.location) metaItems.push(`<span class="card-meta-item"><span aria-hidden="true">📍</span> ${escHtml(card.location)}</span>`);
  if (card.email)    metaItems.push(`<span class="card-meta-item"><span aria-hidden="true">✉</span> <a href="mailto:${escHtml(card.email)}">${escHtml(card.email)}</a></span>`);
  if (card.website)  metaItems.push(`<span class="card-meta-item"><span aria-hidden="true">🔗</span> <a href="${escHtml(card.website)}" target="_blank" rel="noopener">${escHtml(card.website.replace(/^https?:\/\//, ''))}</a></span>`);

  const socialLinks = [];
  if (card.twitter) socialLinks.push(`<a href="https://twitter.com/${escHtml(card.twitter)}" class="social-link" target="_blank" rel="noopener" aria-label="Twitter profile">𝕏 @${escHtml(card.twitter)}</a>`);
  if (card.github)  socialLinks.push(`<a href="https://github.com/${escHtml(card.github)}" class="social-link" target="_blank" rel="noopener" aria-label="GitHub profile">⌥ ${escHtml(card.github)}</a>`);

  const actionsHTML = isModal ? '' : `
    <div class="card-actions" aria-label="Card actions">
      <button class="card-action-btn" title="Preview card" onclick="openModal(${card.id})" aria-label="Preview card">⤢</button>
      <button class="card-action-btn delete-btn" title="Delete card" onclick="deleteCard(${card.id})" aria-label="Delete card">✕</button>
    </div>`;

  return `
    <article class="profile-card theme-${escHtml(card.theme)}" data-card-id="${card.id}" aria-label="Profile card for ${escHtml(card.name)}">
      <div class="card-banner">
        ${actionsHTML}
      </div>
      <div class="card-body">
        <div class="card-avatar-wrap">
          <div class="card-avatar">${avatarContent}</div>
        </div>
        <h3 class="card-name">${escHtml(card.name)}</h3>
        ${card.title ? `<p class="card-title-text">${escHtml(card.title)}</p>` : ''}
        <p class="card-bio">${escHtml(card.bio)}</p>
        ${metaItems.length ? `<div class="card-meta">${metaItems.join('')}</div>` : ''}
        ${skillsHTML}
        ${socialLinks.length ? `<div class="card-socials">${socialLinks.join('')}</div>` : ''}
      </div>
    </article>`;
}

function prependCardToGallery(card) {
  emptyState.style.display = 'none';
  const wrapper = document.createElement('div');
  wrapper.innerHTML = buildCardHTML(card);
  const cardEl = wrapper.firstElementChild;
  cardsGallery.insertBefore(cardEl, cardsGallery.firstChild);
}

function appendCardToGallery(card) {
  emptyState.style.display = 'none';
  const wrapper = document.createElement('div');
  wrapper.innerHTML = buildCardHTML(card);
  const cardEl = wrapper.firstElementChild;
  cardEl.style.animation = 'none'; // No animation on initial load
  cardsGallery.appendChild(cardEl);
}

function removeCardFromGallery(cardId) {
  const el = cardsGallery.querySelector(`[data-card-id="${cardId}"]`);
  if (el) {
    el.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    el.style.opacity = '0';
    el.style.transform = 'scale(0.9)';
    setTimeout(() => el.remove(), 300);
  }
}

// ── MODAL ─────────────────────────────────────────────────────────────────
function openModal(cardId) {
  const card = cards.find(c => c.id === cardId);
  if (!card) return;
  modalCardContainer.innerHTML = buildCardHTML(card, true);
  cardModal.hidden = false;
  document.body.style.overflow = 'hidden';
  modalClose.focus();
}

function closeModal() {
  cardModal.hidden = true;
  document.body.style.overflow = '';
  modalCardContainer.innerHTML = '';
}

// ── DELETE ────────────────────────────────────────────────────────────────
async function deleteCard(cardId) {
  if (!confirm('Delete this profile card?')) return;

  try {
    const response = await fetch(`${API_BASE}/api/profile/${cardId}`, { method: 'DELETE' });
    if (!response.ok && response.status !== 204) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to delete card.');
    }
    cards = cards.filter(c => c.id !== cardId);
    removeCardFromGallery(cardId);
    updateCardCount();
    if (cards.length === 0) emptyState.style.display = 'flex';
    showToast('Card deleted.', 'success');
  } catch (err) {
    showToast(`⚠ ${err.message}`, 'error');
  }
}

// ── UI HELPERS ────────────────────────────────────────────────────────────
function updateCardCount() {
  const n = cards.length;
  cardCountBadge.textContent = n === 0 ? '0 cards generated' : n === 1 ? '1 card generated' : `${n} cards generated`;
}

function setLoadingState(on) {
  loadingOverlay.classList.toggle('visible', on);
  generateBtn.disabled = on;
  generateBtn.classList.toggle('loading', on);
}

function showToast(msg, type = 'success') {
  formToast.textContent = msg;
  formToast.className = `form-toast ${type}`;
  // Trigger reflow
  formToast.offsetHeight;
  formToast.classList.add('show');
  clearTimeout(formToast._timer);
  formToast._timer = setTimeout(hideToast, 4000);
}

function hideToast() {
  formToast.classList.remove('show');
}

function handleClear() {
  form.reset();
  bioCount.textContent = '0';
  selectedTheme = 'purple';
  themePicker.querySelectorAll('.theme-btn').forEach(b => {
    b.classList.remove('active');
    b.setAttribute('aria-pressed', 'false');
  });
  document.getElementById('theme-purple').classList.add('active');
  document.getElementById('theme-purple').setAttribute('aria-pressed', 'true');
  clearError('nameError');
  clearError('bioError');
  hideToast();
}

// ── SECURITY ──────────────────────────────────────────────────────────────
function escHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
