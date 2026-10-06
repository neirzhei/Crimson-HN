const BASE_ALGOLIA_SEARCH = 'https://hn.algolia.com/api/v1';

// 24 Items = 4 Columns x 6 Rows
const PAGE_SIZE = 24;

let currentCategory = 'top';
let currentPage = 0;
let totalPages = 10;

function initCustomUI() {
  document.body.classList.add('hn-app-active');
  document.body.innerHTML = `
    <!-- Top Navigation Bar with Logo + Square Navigation Buttons -->
    <header class="navbar">
      <div class="nav-left">
        <div class="logo-box" id="nav-home">
          <h1>HACKER NEWS</h1>
        </div>
        <button id="prev-btn" class="header-nav-btn hidden" title="Previous">&lt;</button>
        <button id="more-btn" class="header-nav-btn hidden" title="Next">&gt;</button>
      </div>
      <nav class="nav-links">
        <a href="#" data-category="new">NEW</a>
        <a href="#" data-category="past">PAST</a>
        <a href="#" data-category="comments">COMMENTS</a>
        <a href="#" data-category="ask">ASK</a>
        <a href="#" data-category="show">SHOW</a>
        <a href="#" data-category="jobs">JOBS</a>
      </nav>
    </header>

    <!-- Main Grid View -->
    <main id="grid-view" class="container">
      <div id="posts-grid" class="posts-grid"></div>
    </main>

    <!-- Detail / Thread View -->
    <main id="thread-view" class="thread-container hidden">
      <!-- Left Pane (30% width) -->
      <aside id="thread-left-pane" class="thread-sidebar">
        <div id="thread-post-card" class="thread-post-card"></div>
        <div id="thread-comments" class="thread-comments-list"></div>
      </aside>

      <!-- Right Pane (70% width iframe preview) -->
      <section id="thread-right-pane" class="thread-web-preview">
        <iframe id="web-frame" src="about:blank" frameborder="0"></iframe>
      </section>
    </main>
  `;

  setupNavigation();
  loadCategory('top');
}

function setupNavigation() {
  document.getElementById('nav-home').addEventListener('click', () => {
    setActiveNav(null);
    loadCategory('top');
  });

  document.querySelectorAll('.nav-links a').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const cat = link.getAttribute('data-category');
      setActiveNav(link);
      loadCategory(cat);
    });
  });

  document.getElementById('prev-btn').addEventListener('click', () => {
    if (currentPage > 0) {
      currentPage--;
      fetchAndRenderCategory();
    }
  });

  document.getElementById('more-btn').addEventListener('click', () => {
    if (currentPage < totalPages - 1) {
      currentPage++;
      fetchAndRenderCategory();
    }
  });
}

function setActiveNav(activeLink) {
  document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));
  if (activeLink) activeLink.classList.add('active');
}

function showGridView() {
  document.getElementById('thread-view').classList.add('hidden');
  document.getElementById('grid-view').classList.remove('hidden');
  document.getElementById('web-frame').src = 'about:blank';
}

function formatTimeAgo(timestamp) {
  if (!timestamp) return '0m';
  const seconds = Math.floor((Date.now() - timestamp * 1000) / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 365) return `${days}d`;
  return `${Math.floor(days / 365)}y`;
}

function formatDomain(url) {
  if (!url) return 'self';
  try {
    const parsed = new URL(url);
    let hostname = parsed.hostname.replace(/^www\./, '');
    let pathname = parsed.pathname === '/' ? '' : parsed.pathname;
    let full = hostname + pathname;
    return full.length > 22 ? full.substring(0, 19) + '...' : full;
  } catch (e) {
    return url;
  }
}

async function loadCategory(category) {
  currentCategory = category;
  currentPage = 0;
  showGridView();
  await fetchAndRenderCategory();
}

async function fetchAndRenderCategory() {
  const postsGrid = document.getElementById('posts-grid');
  const prevBtn = document.getElementById('prev-btn');
  const moreBtn = document.getElementById('more-btn');

  postsGrid.innerHTML = '';
  // Hide header navigation buttons while fetching
  prevBtn.classList.add('hidden');
  moreBtn.classList.add('hidden');

  if (currentCategory === 'comments') {
    await loadGlobalCommentsFeed();
    return;
  }

  let endpoint = `${BASE_ALGOLIA_SEARCH}/search?tags=front_page&page=${currentPage}&hitsPerPage=${PAGE_SIZE}`;
  
  if (currentCategory === 'new') {
    endpoint = `${BASE_ALGOLIA_SEARCH}/search_by_date?tags=story&page=${currentPage}&hitsPerPage=${PAGE_SIZE}`;
  } else if (currentCategory === 'past') {
    endpoint = `${BASE_ALGOLIA_SEARCH}/search?tags=story&page=${currentPage}&hitsPerPage=${PAGE_SIZE}`;
  } else if (currentCategory === 'ask') {
    endpoint = `${BASE_ALGOLIA_SEARCH}/search?tags=ask_hn&page=${currentPage}&hitsPerPage=${PAGE_SIZE}`;
  } else if (currentCategory === 'show') {
    endpoint = `${BASE_ALGOLIA_SEARCH}/search?tags=show_hn&page=${currentPage}&hitsPerPage=${PAGE_SIZE}`;
  } else if (currentCategory === 'jobs') {
    endpoint = `${BASE_ALGOLIA_SEARCH}/search?tags=job&page=${currentPage}&hitsPerPage=${PAGE_SIZE}`;
  }

  try {
    const res = await fetch(endpoint);
    const data = await res.json();
    totalPages = data.nbPages || 10;

    data.hits.forEach(hit => {
      const item = {
        id: hit.objectID,
        title: hit.title || hit.story_title || 'Untitled',
        url: hit.url || hit.story_url,
        score: hit.points || 0,
        by: hit.author,
        time: hit.created_at_i,
        descendants: hit.num_comments || 0
      };
      postsGrid.appendChild(createStoryCard(item));
    });

    // Show square navigation buttons after page is rendered
    prevBtn.classList.remove('hidden');
    moreBtn.classList.remove('hidden');
    prevBtn.disabled = currentPage === 0;
    moreBtn.disabled = currentPage >= totalPages - 1;
  } catch (err) {
    postsGrid.innerHTML = '';
  }
}

function createStoryCard(item) {
  const card = document.createElement('div');
  card.className = 'card';

  const domain = item.url ? formatDomain(item.url) : 'self';
  const points = item.score || 0;
  const commentCount = item.descendants || 0;
  const time = formatTimeAgo(item.time);

  card.innerHTML = `
    <div class="card-title">${escapeHTML(item.title || '')}</div>
    <div class="card-footer">
      <div class="badge-domain">${escapeHTML(domain)}</div>
      <div class="badge-stats">${points} | ${commentCount} | ${time}</div>
    </div>
  `;

  card.addEventListener('click', () => openThreadView(item));
  return card;
}

async function openThreadView(post) {
  document.getElementById('prev-btn').classList.add('hidden');
  document.getElementById('more-btn').classList.add('hidden');

  document.getElementById('grid-view').classList.add('hidden');
  const threadView = document.getElementById('thread-view');
  const webFrame = document.getElementById('web-frame');
  const threadComments = document.getElementById('thread-comments');

  threadView.classList.remove('hidden');

  const hasLink = Boolean(post.url);

  if (hasLink) {
    threadView.classList.remove('center-mode');
    webFrame.src = post.url;
  } else {
    threadView.classList.add('center-mode');
    webFrame.src = 'about:blank';
  }

  const domain = post.url ? formatDomain(post.url) : 'self';
  const points = post.score || 0;
  const commentCount = post.descendants || 0;
  const time = formatTimeAgo(post.time);
  const author = post.by || 'anonymous';

  document.getElementById('thread-post-card').innerHTML = `
    <div class="card-title" id="thread-title-click">${escapeHTML(post.title || '')}</div>
    ${post.text ? `<div class="post-text-body">${post.text}</div>` : ''}
    <div>
      <span class="badge-poster">${escapeHTML(author)}</span>
    </div>
    <div class="thread-meta-row">
      <div class="badge-domain">${escapeHTML(domain)}</div>
      <div class="badge-stats">${points} | ${commentCount} | ${time}</div>
    </div>
  `;

  document.getElementById('thread-title-click').addEventListener('click', (e) => {
    e.stopPropagation();
    if (post.url) {
      window.open(post.url, '_blank');
    }
  });

  threadComments.innerHTML = '';

  try {
    const res = await fetch(`${BASE_ALGOLIA_SEARCH}/items/${post.id}`);
    const data = await res.json();

    threadComments.innerHTML = '';
    if (data.children && data.children.length > 0) {
      renderCommentList(data.children, threadComments);
    }
  } catch (e) {
    threadComments.innerHTML = '';
  }
}

// RENDER RECURSIVE COMMENTS WITH CLICK-TO-COLLAPSE
function renderCommentList(comments, container) {
  comments.forEach(comment => {
    if (!comment.text && !comment.author) return;

    const card = document.createElement('div');
    card.className = 'comment-card';

    const author = comment.author || 'deleted';
    const time = formatTimeAgo(comment.created_at_i);

    card.innerHTML = `
      <div class="comment-header">
        <span class="comment-author-badge">[–] ${escapeHTML(author)} | ${time}</span>
      </div>
      <div class="comment-body">${comment.text || ''}</div>
    `;

    // Click commenter's name badge to collapse/expand entire comment thread
    const badge = card.querySelector('.comment-author-badge');
    badge.addEventListener('click', (e) => {
      e.stopPropagation();
      card.classList.toggle('collapsed');
      const isCollapsed = card.classList.contains('collapsed');
      badge.textContent = `${isCollapsed ? '[+]' : '[–]'} ${author} | ${time}`;
    });

    if (comment.children && comment.children.length > 0) {
      const childrenContainer = document.createElement('div');
      childrenContainer.className = 'nested-reply';
      renderCommentList(comment.children, childrenContainer);
      card.appendChild(childrenContainer);
    }

    container.appendChild(card);
  });
}

async function loadGlobalCommentsFeed() {
  const postsGrid = document.getElementById('posts-grid');
  const prevBtn = document.getElementById('prev-btn');
  const moreBtn = document.getElementById('more-btn');

  postsGrid.innerHTML = '';
  prevBtn.classList.add('hidden');
  moreBtn.classList.add('hidden');

  try {
    const res = await fetch(`${BASE_ALGOLIA_SEARCH}/search_by_date?tags=comment&page=${currentPage}&hitsPerPage=${PAGE_SIZE}`);
    const data = await res.json();
    totalPages = data.nbPages || 10;

    data.hits.forEach(item => {
      const card = document.createElement('div');
      card.className = 'card';
      const time = formatTimeAgo(item.created_at_i);

      card.innerHTML = `
        <div class="comment-header" style="margin-bottom:0.3rem;">
          <span class="comment-author-badge">${escapeHTML(item.author)} | ${time}</span>
        </div>
        <div class="card-title" style="font-size:0.85rem; font-weight:normal;">${item.comment_text || ''}</div>
        <div class="card-footer">
          <div class="badge-domain">Story ID: ${item.story_id}</div>
        </div>
      `;

      card.addEventListener('click', () => {
        openThreadView({
          id: item.story_id,
          title: item.story_title || 'Story Thread',
          url: item.story_url,
          by: item.author,
          time: item.created_at_i
        });
      });

      postsGrid.appendChild(card);
    });

    prevBtn.classList.remove('hidden');
    moreBtn.classList.remove('hidden');
    prevBtn.disabled = currentPage === 0;
    moreBtn.disabled = currentPage >= totalPages - 1;
  } catch (e) {
    postsGrid.innerHTML = '';
  }
}

function escapeHTML(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

initCustomUI();