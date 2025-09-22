// newtab.js
'use strict';

/* =======================================================
   DOM ELEMENTS & CONSTANTS
======================================================= */

// Root container for bookmarks
const $root = document.getElementById('bookmarks-root');

// Container for top sites (most visited)
const $topSitesContainer = document.getElementById('top-sites');

// Static search input
const $searchInput = document.getElementById('bookmark-search');

// Key used to store collapsed folder state in chrome.storage.local
const STORAGE_KEY = 'collapsedState';

// Global array to store all bookmark cards for search functionality
const allBookmarkCards = [];

/* =======================================================
   HELPER FUNCTIONS
======================================================= */

/**
 * Load collapsed folder state from Chrome storage.
 * @returns {Promise<Object>} - A map of folderId -> boolean (true if collapsed)
 */
function loadCollapsedState() {
  return new Promise(resolve => {
    chrome.storage.local.get([STORAGE_KEY], res => {
      resolve(res[STORAGE_KEY] || {});
    });
  });
}

/**
 * Save collapsed folder state to Chrome storage.
 * @param {Object} state - Map of folderId -> boolean
 */
function saveCollapsedState(state) {
  chrome.storage.local.set({ [STORAGE_KEY]: state });
}

/**
 * Generate a favicon URL for a given URL using Google’s favicon service.
 * @param {string} url
 * @returns {string} - Favicon URL or empty string if invalid
 */
function faviconForUrl(url) {


  try {
    const u = new URL(url);
    return `chrome-extension://${chrome.runtime.id}/_favicon/?pageUrl=${encodeURIComponent(u)}&size=64`;
  } catch {
    return '';
  }
}

/* =======================================================
   BOOKMARK CARD CREATION
======================================================= */

/**
 * Create a single bookmark card element.
 * @param {Object} node - Bookmark node containing url and title
 * @returns {HTMLElement} - Bookmark card element
 */
function createBookmarkCard(node) {
  const a = document.createElement('a');
  a.className = 'bookmark-card';
  a.href = node.url;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  a.title = node.title || node.url;

  // Favicon
  const fav = document.createElement('div');
  fav.className = 'bookmark-fav';
  const img = document.createElement('img');
  img.src = faviconForUrl(node.url);
  img.alt = '';
  fav.appendChild(img);

  // Bookmark body (title + domain)
  const body = document.createElement('div');
  body.className = 'bookmark-body';
  const titleEl = document.createElement('div');
  titleEl.className = 'bookmark-title';
  titleEl.textContent = node.title || node.url;

  const urlEl = document.createElement('div');
  urlEl.className = 'bookmark-url';
  try {
    urlEl.textContent = new URL(node.url).hostname;
  } catch {
    urlEl.textContent = node.url;
  }

  body.append(titleEl, urlEl);
  a.append(fav, body);

  // Open bookmark in new tab
  a.addEventListener('click', e => {
    e.preventDefault();
    chrome.tabs.create({ url: node.url });
  });

  return a;
}

/* =======================================================
   TOP SITES SECTION
======================================================= */

/**
 * Render the “Most Visited” top sites in the top row.
 * Each site is displayed as an icon-only square card.
 */
function renderTopSites() {
  if (!$topSitesContainer || !chrome.topSites) return;

  chrome.topSites.get(sites => {
    $topSitesContainer.innerHTML = ''; // Clear container

    sites.forEach(site => {
      const a = document.createElement('a');
      a.className = 'top-site-card';
      a.href = site.url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.title = site.url;

      const img = document.createElement('img');
      img.src = `chrome-extension://${chrome.runtime.id}/_favicon/?pageUrl=${encodeURIComponent(new URL(site.url))}&size=64`;
      img.alt = '';

      a.appendChild(img);

      a.addEventListener('click', e => {
        e.preventDefault();
        chrome.tabs.create({ url: site.url });
      });

      $topSitesContainer.appendChild(a);
    });
  });
}

/* =======================================================
   BOOKMARK FOLDERS SECTION
======================================================= */

/**
 * Render a bookmark folder node.
 * Only renders leaf bookmarks (ignores nested folders for simplicity).
 * @param {Object} node - Bookmark folder node
 * @param {HTMLElement} container - Parent container to append folder
 * @param {Object} collapsedState - Map of folderId -> collapsed boolean
 * @param {Object} collapsedStateRef - Wrapper for persisting state updates
 */
function renderFolder(node, container, collapsedState, collapsedStateRef) {
  const section = document.createElement('section');
  section.className = 'folder';
  section.dataset.folderId = node.id;

  // Folder header (clickable to toggle collapse)
  const header = document.createElement('div');
  header.className = 'folder-header';
  header.tabIndex = 0;
  header.setAttribute('role', 'button');

  const arrow = document.createElement('div');
  arrow.className = 'arrow';
  arrow.textContent = '▾';

  const titleText = document.createElement('div');
  titleText.className = 'title-text';
  titleText.textContent = node.title || 'Untitled Folder';

  header.append(arrow, titleText);
  section.appendChild(header);

  // Children container
  const childrenWrap = document.createElement('div');
  childrenWrap.className = 'folder-children';

  // Only render bookmarks, ignore nested folders
  if (Array.isArray(node.children)) {
    node.children.forEach(child => {
      if (child.url) {
        const card = createBookmarkCard(child);
        childrenWrap.appendChild(card);

        // Store for search functionality
        allBookmarkCards.push({
          card,
          title: (child.title || '').toLowerCase(),
          url: (child.url || '').toLowerCase()
        });
      }
    });
  }

  section.appendChild(childrenWrap);

  // Apply persisted collapsed state
  const isCollapsed = !!collapsedState[node.id];
  if (isCollapsed) {
    header.classList.add('collapsed');
    childrenWrap.style.display = 'none';
    header.setAttribute('aria-expanded', 'false');
  } else {
    header.setAttribute('aria-expanded', 'true');
  }

  // Toggle folder collapse/expand
  const toggle = () => {
    const collapsed = header.classList.toggle('collapsed');
    childrenWrap.style.display = collapsed ? 'none' : 'grid';
    header.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
    collapsedStateRef.state[node.id] = collapsed;
    saveCollapsedState(collapsedStateRef.state);
  };

  header.addEventListener('click', toggle);
  header.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggle();
    }
  });

  container.appendChild(section);
}

/**
 * Recursively collect all leaf folders (folders with bookmarks but no subfolders)
 * @param {Object} node
 * @returns {Array} leaf folders
 */
function collectLeafFolders(node) {
  if (!node.children) return [];

  const childFolders = node.children.filter(c => c.children && !c.url);
  const bookmarks = node.children.filter(c => c.url);

  if (childFolders.length === 0 && bookmarks.length > 0) return [node];

  return childFolders.flatMap(f => collectLeafFolders(f));
}

/**
 * Render all bookmarks in leaf folders.
 * Handles loading collapsed state and storing bookmark cards for search.
 */
async function renderAll() {
  $root.innerHTML = '';
  allBookmarkCards.length = 0;

  const collapsedState = await loadCollapsedState();
  const collapsedStateRef = { state: collapsedState };

  chrome.bookmarks.getTree(tree => {
    if (!tree || !tree.length) {
      $root.innerHTML = `<div class="empty">No bookmarks found</div>`;
      return;
    }

    const rootNode = tree[0];
    const topChildren = Array.isArray(rootNode.children) ? rootNode.children : [];

    const leafFolders = topChildren.flatMap(collectLeafFolders);

    if (!leafFolders.length) {
      $root.innerHTML = `<div class="empty">No bookmarks to display</div>`;
      return;
    }

    leafFolders.forEach(folder => {
      renderFolder(folder, $root, collapsedState, collapsedStateRef);
    });
  });
}

/* =======================================================
   SEARCH FUNCTIONALITY
======================================================= */

/**
 * Filter bookmarks based on search query.
 * Updates display of bookmark cards dynamically.
 * @param {string} query
 */
function filterBookmarks(query) {
  const q = query.trim().toLowerCase();
  allBookmarkCards.forEach(({ card, title, url }) => {
    card.style.display = !q || title.includes(q) || url.includes(q) ? 'flex' : 'none';
  });
}

// Attach search input listener (static search bar)
if ($searchInput) {
  $searchInput.addEventListener('input', () => {
    filterBookmarks($searchInput.value);
  });
}

/* =======================================================
   INITIALIZATION
======================================================= */

document.addEventListener('DOMContentLoaded', () => {
  renderTopSites(); // Render most visited sites in top row
  renderAll();      // Render leaf-folder bookmarks
});
