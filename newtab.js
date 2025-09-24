// newtab.js
'use strict';

/* =======================================================
   DOM ELEMENTS & CONSTANTS
======================================================= */

// Root container for bookmarks
const $root = document.getElementById('bookmarks-root');

// Container for top sites (most visited)
const $topSitesContainer = document.getElementById('top-sites');

// Search modal elements
const $searchModal = document.getElementById('search-modal');
const $searchInput = document.getElementById('search-input');
const $searchResults = document.getElementById('search-results');

// Edit modal elements
const $editModal = document.getElementById('edit-modal');
const $editTitle = document.getElementById('edit-title');
const $editUrl = document.getElementById('edit-url');
const $editFolder = document.getElementById('edit-folder');
const $updateButton = document.getElementById('update-bookmark');
const $cancelButton = document.getElementById('cancel-edit');

// Key used to store collapsed folder state in chrome.storage.local
const STORAGE_KEY = 'collapsedState';

// Global arrays to store bookmarks and folders
const allBookmarks = [];
let allFolders = [];
let currentEditingBookmark = null;

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
 * Generate a favicon URL for a given URL using Google's favicon service.
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

/**
 * Collect all folders recursively for the folder dropdown
 * @param {Object} node 
 * @param {Array} folders 
 */
function collectAllFolders(node, folders = []) {
  if (node.children && !node.url) {
    folders.push({ id: node.id, title: node.title || 'Untitled Folder' });
    node.children.forEach(child => {
      if (child.children && !child.url) {
        collectAllFolders(child, folders);
      }
    });
  }
}

/* =======================================================
   SEARCH MODAL FUNCTIONALITY
======================================================= */

/**
 * Show search modal
 */
function showSearchModal() {
  $searchModal.classList.remove('hidden');
  $searchInput.focus();
  $searchInput.value = '';
  $searchResults.innerHTML = '';
}

/**
 * Hide search modal
 */
function hideSearchModal() {
  $searchModal.classList.add('hidden');
  $searchInput.value = '';
  $searchResults.innerHTML = '';
}

/**
 * Search bookmarks and show top 5 results
 * @param {string} query 
 */
function searchBookmarks(query) {
  const q = query.trim().toLowerCase();
  if (!q) {
    $searchResults.innerHTML = '';
    return;
  }

  const results = allBookmarks
    .filter(bookmark =>
      bookmark.title.toLowerCase().includes(q) ||
      bookmark.url.toLowerCase().includes(q)
    )
    .slice(0, 5);

  $searchResults.innerHTML = '';

  if (results.length === 0) {
    $searchResults.innerHTML = '<div class="empty">No bookmarks found</div>';
    return;
  }

  results.forEach(bookmark => {
    const resultCard = createSearchResultCard(bookmark);
    $searchResults.appendChild(resultCard);
  });
}

/**
 * Create a search result card
 * @param {Object} bookmark 
 * @returns {HTMLElement}
 */
function createSearchResultCard(bookmark) {
  const card = document.createElement('a');
  card.className = 'search-result-card';
  card.href = bookmark.url;
  card.target = '_blank';
  card.rel = 'noopener noreferrer';

  // Favicon
  const fav = document.createElement('div');
  fav.className = 'bookmark-fav';
  const img = document.createElement('img');
  img.src = faviconForUrl(bookmark.url);
  img.alt = '';
  fav.appendChild(img);

  // Bookmark body
  const body = document.createElement('div');
  body.className = 'bookmark-body';

  const titleEl = document.createElement('div');
  titleEl.className = 'bookmark-title';
  titleEl.textContent = bookmark.title || bookmark.url;

  const urlEl = document.createElement('div');
  urlEl.className = 'bookmark-url';
  try {
    urlEl.textContent = new URL(bookmark.url).hostname;
  } catch {
    urlEl.textContent = bookmark.url;
  }

  body.append(titleEl, urlEl);
  card.append(fav, body);

  card.addEventListener('click', e => {
    e.preventDefault();
    window.location.href = bookmark.url;
    hideSearchModal();
  });

  return card;
}

/* =======================================================
   EDIT MODAL FUNCTIONALITY
======================================================= */

/**
 * Show edit modal for a bookmark
 * @param {Object} bookmark 
 */
function showEditModal(bookmark) {
  currentEditingBookmark = bookmark;
  $editTitle.value = bookmark.title || '';
  $editUrl.value = bookmark.url || '';

  // Populate folder dropdown
  $editFolder.innerHTML = '';
  allFolders.forEach(folder => {
    const option = document.createElement('option');
    option.value = folder.id;
    option.textContent = folder.title;
    option.selected = folder.id === bookmark.parentId;
    $editFolder.appendChild(option);
  });

  $editModal.classList.remove('hidden');
  $editTitle.focus();
  checkForChanges();
}

/**
 * Hide edit modal
 */
function hideEditModal() {
  $editModal.classList.add('hidden');
  currentEditingBookmark = null;
  $updateButton.disabled = true;
}

/**
 * Check if any changes were made and enable/disable update button
 */
function checkForChanges() {
  if (!currentEditingBookmark) return;

  const titleChanged = $editTitle.value !== (currentEditingBookmark.title || '');
  const urlChanged = $editUrl.value !== (currentEditingBookmark.url || '');
  const folderChanged = $editFolder.value !== currentEditingBookmark.parentId;

  $updateButton.disabled = !(titleChanged || urlChanged || folderChanged);
}

/**
 * Update the bookmark with new values
 */
function updateBookmark() {
  if (!currentEditingBookmark) return;

  const newTitle = $editTitle.value.trim();
  const newUrl = $editUrl.value.trim();
  const newParentId = $editFolder.value;

  // Update title and URL
  const updateData = {};
  if (newTitle !== currentEditingBookmark.title) {
    updateData.title = newTitle;
  }
  if (newUrl !== currentEditingBookmark.url) {
    updateData.url = newUrl;
  }

  chrome.bookmarks.update(currentEditingBookmark.id, updateData, () => {
    // Move to new folder if changed
    if (newParentId !== currentEditingBookmark.parentId) {
      chrome.bookmarks.move(currentEditingBookmark.id, { parentId: newParentId }, () => {
        hideEditModal();
        renderAll(); // Refresh the display
      });
    } else {
      hideEditModal();
      renderAll(); // Refresh the display
    }
  });
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

  // Three-dot menu button
  const menuButton = document.createElement('button');
  menuButton.className = 'bookmark-menu';
  menuButton.innerHTML = '⋯';
  menuButton.title = 'Edit bookmark';

  menuButton.addEventListener('click', e => {
    e.preventDefault();
    e.stopPropagation();
    showEditModal(node);
  });

  a.append(fav, body, menuButton);

  // Open bookmark in same tab
  a.addEventListener('click', e => {
    // Don't navigate if clicking the menu button
    if (e.target === menuButton) return;
    e.preventDefault();
    window.location.href = node.url;
  });

  return a;
}

/* =======================================================
   TOP SITES SECTION
======================================================= */

/**
 * Render the "Most Visited" top sites in the top row.
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
        window.location.href = site.url;
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
        allBookmarks.push({
          ...child,
          title: child.title || '',
          url: child.url || ''
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
  allBookmarks.length = 0;
  allFolders.length = 0;

  const collapsedState = await loadCollapsedState();
  const collapsedStateRef = { state: collapsedState };

  chrome.bookmarks.getTree(tree => {
    if (!tree || !tree.length) {
      $root.innerHTML = `<div class="empty">No bookmarks found</div>`;
      return;
    }

    const rootNode = tree[0];
    const topChildren = Array.isArray(rootNode.children) ? rootNode.children : [];

    // Collect all folders for the dropdown
    topChildren.forEach(child => collectAllFolders(child, allFolders));

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
   KEYBOARD SHORTCUTS & EVENT LISTENERS
======================================================= */

// Keyboard shortcut to open search modal (Ctrl/Cmd + K)
document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault();
    showSearchModal();
  }

  // Close modals on Escape
  if (e.key === 'Escape') {
    if (!$searchModal.classList.contains('hidden')) {
      hideSearchModal();
    }
    if (!$editModal.classList.contains('hidden')) {
      hideEditModal();
    }
  }
});

// Search input event listener
$searchInput.addEventListener('input', e => {
  searchBookmarks(e.target.value);
});

// Search modal overlay click to close
$searchModal.addEventListener('click', e => {
  if (e.target === $searchModal || e.target.classList.contains('search-modal-overlay')) {
    hideSearchModal();
  }
});

// Edit modal event listeners
$editModal.addEventListener('click', e => {
  if (e.target === $editModal || e.target.classList.contains('edit-modal-overlay')) {
    hideEditModal();
  }
});

$editTitle.addEventListener('input', checkForChanges);
$editUrl.addEventListener('input', checkForChanges);
$editFolder.addEventListener('change', checkForChanges);

$cancelButton.addEventListener('click', hideEditModal);
$updateButton.addEventListener('click', updateBookmark);

/* =======================================================
   INITIALIZATION
======================================================= */

document.addEventListener('DOMContentLoaded', () => {
  renderTopSites(); // Render most visited sites in top row
  renderAll();      // Render leaf-folder bookmarks
});