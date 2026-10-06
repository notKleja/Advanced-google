const queryInput = document.querySelector('#query');
const searchForm = document.querySelector('#searchForm');
const siteFilter = document.querySelector('#siteFilter');
const fileTypeFilter = document.querySelector('#fileTypeFilter');
const customSite = document.querySelector('#customSite');
const clearSiteButton = document.querySelector('#clearSite');
const clearFileTypeButton = document.querySelector('#clearFileType');
const filterStatus = document.querySelector('#filterStatus');

const sitePattern = /(?:^|\s)site:([^\s]+)/gi;
const fileTypePattern = /(?:^|\s)filetype:([^\s]+)/gi;

function normalizeQuery(value) {
  return value.replace(/\s+/g, ' ').trim();
}

function readOperator(pattern) {
  pattern.lastIndex = 0;
  const match = pattern.exec(queryInput.value);
  pattern.lastIndex = 0;
  return match?.[1] || '';
}

function setOperator(name, value) {
  const pattern = name === 'site' ? sitePattern : fileTypePattern;
  pattern.lastIndex = 0;
  const withoutExisting = queryInput.value.replace(pattern, ' ');
  pattern.lastIndex = 0;
  queryInput.value = normalizeQuery(`${withoutExisting} ${value ? `${name}:${value}` : ''}`);
  queryInput.setSelectionRange(queryInput.value.length, queryInput.value.length);
  syncFilterControls();
  queryInput.focus();
}

function selectKnownValue(select, value, customInput = null) {
  const known = [...select.options].some((option) => option.value === value);
  select.value = value && known ? value : value && customInput ? 'custom' : '';
  if (customInput) {
    customInput.hidden = select.value !== 'custom';
    customInput.value = select.value === 'custom' ? value : '';
  }
}

function syncFilterControls(announce = false) {
  const site = readOperator(sitePattern);
  const fileType = readOperator(fileTypePattern);
  selectKnownValue(siteFilter, site, customSite);
  selectKnownValue(fileTypeFilter, fileType);
  clearSiteButton.hidden = !site;
  clearFileTypeButton.hidden = !fileType;

  if (announce) {
    const active = [site && `site ${site}`, fileType && `file type ${fileType}`].filter(Boolean);
    filterStatus.textContent = active.length ? `Active filters: ${active.join(', ')}` : 'All filters cleared';
  }
}

function handleFilterChange(select, operator, customInput = null) {
  if (select.value === 'custom' && customInput) {
    customInput.hidden = false;
    customInput.focus();
    return;
  }
  if (customInput) customInput.hidden = true;
  setOperator(operator, select.value);
  syncFilterControls(true);
}

function applySelectionAction(action) {
  const start = queryInput.selectionStart;
  const end = queryInput.selectionEnd;
  const selected = queryInput.value.slice(start, end);
  if (!selected) {
    filterStatus.textContent = 'Select part of the query first';
    queryInput.focus();
    return;
  }

  let replacement = selected;
  if (action === 'exact') replacement = `"${selected.replace(/^"|"$/g, '')}"`;
  if (action === 'exclude') replacement = `-${selected.replace(/^-/, '')}`;
  if (action === 'clear') {
    replacement = selected
      .replace(/["+]/g, '')
      .replace(/(^|\s)-(?=\S)/g, '$1')
      .replace(sitePattern, ' ')
      .replace(fileTypePattern, ' ');
  }

  queryInput.setRangeText(replacement, start, end, 'select');
  syncFilterControls(true);
  queryInput.focus();
}

function googleSearchUrl() {
  return `https://www.google.com/search?q=${encodeURIComponent(queryInput.value.trim())}`;
}

function searchGoogle(openInNewTab) {
  if (!searchForm.reportValidity()) return;
  const url = googleSearchUrl();
  if (openInNewTab) window.open(url, '_blank', 'noopener');
  else window.location.assign(url);
}

searchForm.addEventListener('submit', (event) => {
  event.preventDefault();
  searchGoogle(false);
});
document.querySelector('#searchIconButton').addEventListener('click', () => searchGoogle(false));
document.querySelector('#newTabButton').addEventListener('click', () => searchGoogle(true));
document.querySelectorAll('[data-selection-action]').forEach((button) => {
  button.addEventListener('click', () => applySelectionAction(button.dataset.selectionAction));
});
queryInput.addEventListener('input', () => syncFilterControls());
siteFilter.addEventListener('change', () => handleFilterChange(siteFilter, 'site', customSite));
fileTypeFilter.addEventListener('change', () => handleFilterChange(fileTypeFilter, 'filetype'));
customSite.addEventListener('change', () => setOperator('site', customSite.value.trim().replace(/^site:/i, '')));
clearSiteButton.addEventListener('click', () => setOperator('site', ''));
clearFileTypeButton.addEventListener('click', () => setOperator('filetype', ''));

syncFilterControls();

const invisibleFooter = document.querySelector('#invisible-footer');
let isFullscreen = false;

function exitFullscreen() {
  document.querySelector('#fullscreen-content')?.remove();
  isFullscreen = false;
  window.clearTimeout(cursorTimer);
  document.body.classList.remove('fullscreen-active', 'cursor-hidden');
  invisibleFooter.setAttribute('aria-label', 'Enter distraction-free fullscreen');
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
}

function enterFullscreen() {
  if (isFullscreen) return;
  const fullscreenContent = document.createElement('div');
  fullscreenContent.id = 'fullscreen-content';
  fullscreenContent.className = 'fullscreen-content';
  fullscreenContent.addEventListener('click', exitFullscreen);
  document.body.append(fullscreenContent);
  isFullscreen = true;
  document.body.classList.add('fullscreen-active');
  resetCursorTimer();
  invisibleFooter.setAttribute('aria-label', 'Exit distraction-free fullscreen');
  document.documentElement.requestFullscreen?.().catch(() => {});
}

invisibleFooter.addEventListener('click', () => isFullscreen ? exitFullscreen() : enterFullscreen());
document.addEventListener('fullscreenchange', () => {
  if (!document.fullscreenElement && isFullscreen) exitFullscreen();
});

let cursorTimer;
function resetCursorTimer() {
  document.body.classList.remove('cursor-hidden');
  window.clearTimeout(cursorTimer);
  if (isFullscreen) {
    cursorTimer = window.setTimeout(() => document.body.classList.add('cursor-hidden'), 5000);
  }
}

['pointermove', 'pointerdown', 'keydown', 'touchstart'].forEach((eventName) => {
  document.addEventListener(eventName, resetCursorTimer, { passive: true });
});
