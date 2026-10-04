(function () {
  'use strict';

  function buildHeader() {
    const mainTable = document.getElementById('hnmain');
    if (!mainTable) return;

    const topTd = mainTable.querySelector('tr:first-child > td');
    if (!topTd) return;

    const navLinks = Array.from(topTd.querySelectorAll('.pagetop a'));

    const headerContainer = document.createElement('header');
    headerContainer.className = 'hn-reader-header';

    let navHTML = '';
    navLinks.forEach((link) => {
      const txt = link.textContent.toLowerCase();
      if (txt.includes('submit') || txt.includes('login') || link.querySelector('b') || txt.includes('hacker news')) {
        return;
      }
      navHTML += `<a href="${link.href}" class="hn-nav-link">${link.textContent}</a>`;
    });

    headerContainer.innerHTML = `
      <div class="hn-header-inner">
        <div class="hn-brand">
          <a href="/" class="hn-logo-badge">HN</a>
        </div>
        <nav class="hn-nav">${navHTML}</nav>
      </div>
    `;

    document.body.insertBefore(headerContainer, document.body.firstChild);
  }

  // Parse story details
  function parseStoryData(row) {
    const id = row.getAttribute('id');
    const subtextRow = row.nextElementSibling;

    const titleA = row.querySelector('.titleline > a');
    if (!titleA) return null;

    const title = titleA.textContent;
    const url = titleA.getAttribute('href');
    const siteBit = row.querySelector('.sitestr');
    const domain = siteBit ? siteBit.textContent : (url.startsWith('item?') ? 'news.ycombinator.com' : 'external');

    let points = '0 points';
    let author = 'anonymous';
    let age = '';
    let commentsText = '0 comments';
    let commentsUrl = `item?id=${id}`;

    if (subtextRow) {
      const scoreEl = subtextRow.querySelector('.score');
      if (scoreEl) points = scoreEl.textContent;

      const authorEl = subtextRow.querySelector('.hnuser');
      if (authorEl) author = authorEl.textContent;

      const ageEl = subtextRow.querySelector('.age a');
      if (ageEl) age = ageEl.textContent;

      const links = Array.from(subtextRow.querySelectorAll('a'));
      links.forEach((l) => {
        const txt = l.textContent.toLowerCase();
        if (txt.includes('comment') || txt.includes('discuss')) {
          commentsText = l.textContent;
          commentsUrl = l.getAttribute('href');
        }
      });
    }

    return { id, title, url, domain, points, author, age, commentsText, commentsUrl };
  }

  // Transform Feed Screen (Home)
  function transformFeed() {
    const storyRows = document.querySelectorAll('tr.athing');
    if (!storyRows.length || document.querySelector('table.comment-tree')) return;

    const feedContainer = document.createElement('div');
    feedContainer.className = 'hn-feed';

    storyRows.forEach((row) => {
      const data = parseStoryData(row);
      if (!data) return;

      const card = document.createElement('article');
      card.className = 'hn-story-card';

      // Meta displays ONLY: points • comments • time ago
      card.innerHTML = `
        <div class="hn-story-content">
          <div class="hn-story-title-row">
            <a href="${data.url}" class="hn-story-title" target="_blank" rel="noreferrer">${data.title}</a>
            <span class="hn-story-domain">${data.domain}</span>
          </div>
          <div class="hn-story-meta">
            <span>${data.points}</span>
            <span class="hn-dot">•</span>
            <span>${data.commentsText}</span>
            <span class="hn-dot">•</span>
            <span>${data.age}</span>
          </div>
        </div>
      `;

      // Click card area opens comments thread
      card.addEventListener('click', (e) => {
        if (e.target.closest('a')) return;
        window.location.href = data.commentsUrl;
      });

      feedContainer.appendChild(card);
    });

    // Restore "MORE" pagination link
    const moreLinkOriginal = document.querySelector('a.morelink');
    if (moreLinkOriginal) {
      const moreBtn = document.createElement('a');
      moreBtn.className = 'hn-more-btn';
      moreBtn.href = moreLinkOriginal.getAttribute('href');
      moreBtn.textContent = 'MORE →';
      feedContainer.appendChild(moreBtn);
    }

    const mainTable = document.getElementById('hnmain');
    if (mainTable) {
      const targetCell = mainTable.querySelector('tr:nth-child(3) > td');
      if (targetCell) {
        targetCell.innerHTML = '';
        targetCell.appendChild(feedContainer);
      }
    }
  }

  // Transform Item Page (Comments View)
  function transformItemPage() {
    const commentTree = document.querySelector('table.comment-tree');
    const mainStoryRow = document.querySelector('tr.athing');
    if (!mainStoryRow && !commentTree) return;

    // Main Article Header Card (Keeps author name)
    if (mainStoryRow) {
      const data = parseStoryData(mainStoryRow);
      if (data) {
        const topCard = document.createElement('div');
        topCard.className = 'hn-story-card hn-main-article-card';
        topCard.innerHTML = `
          <div class="hn-story-content">
            <div class="hn-story-title-row">
              <a href="${data.url}" class="hn-story-title large" target="_blank" rel="noreferrer">${data.title}</a>
              <span class="hn-story-domain">${data.domain}</span>
            </div>
            <div class="hn-story-meta">
              <span class="hn-crimson-text">${data.points}</span>
              <span class="hn-dot">•</span>
              <span>posted by <strong>${data.author}</strong></span>
              <span class="hn-dot">•</span>
              <span>${data.age}</span>
            </div>
          </div>
        `;
        mainStoryRow.closest('table').replaceWith(topCard);
      }
    }

    // Remove input boxes/forms
    document.querySelectorAll('form, textarea, input, .voter, .votearrow').forEach(el => el.remove());

    // Comment Tree
    if (commentTree) {
      const commentRows = Array.from(commentTree.querySelectorAll('tr.comtr'));
      const commentsContainer = document.createElement('div');
      commentsContainer.className = 'hn-comments-container';

      commentRows.forEach((row) => {
        const commentId = row.getAttribute('id');
        const indentTd = row.querySelector('td.ind');
        const indentImg = indentTd ? indentTd.querySelector('img') : null;
        const indentWidth = indentImg ? parseInt(indentImg.getAttribute('width'), 10) : 0;
        const depth = Math.floor(indentWidth / 40);

        const textEl = row.querySelector('.commtext');
        if (!textEl) return;

        const userEl = row.querySelector('.hnuser');
        const ageEl = row.querySelector('.age a');

        const user = userEl ? userEl.textContent : 'deleted';
        const age = ageEl ? ageEl.textContent : '';

        const isRoot = (depth === 0);
        const commentCard = document.createElement('div');
        commentCard.className = `hn-comment-card ${isRoot ? 'is-root' : 'is-reply'}`;
        commentCard.setAttribute('data-id', commentId);
        commentCard.setAttribute('data-depth', depth);

        if (!isRoot) {
          commentCard.style.marginLeft = `${depth * 20}px`;
        }

        commentCard.innerHTML = `
          <div class="hn-comment-header">
            <span class="hn-comment-author">${user}</span>
            <span class="hn-comment-time">${age}</span>
          </div>
          <div class="hn-comment-text">${textEl.innerHTML}</div>
        `;

        // Click comment card body to collapse/expand
        commentCard.addEventListener('click', (e) => {
          if (e.target.closest('a')) return;

          const isCollapsed = commentCard.classList.contains('is-collapsed');
          const body = commentCard.querySelector('.hn-comment-text');

          if (isCollapsed) {
            commentCard.classList.remove('is-collapsed');
            if (body) body.style.display = 'block';
          } else {
            commentCard.classList.add('is-collapsed');
            if (body) body.style.display = 'none';
          }

          // Toggle sub-thread replies
          let nextCard = commentCard.nextElementSibling;
          while (nextCard && nextCard.classList.contains('hn-comment-card')) {
            const nextDepth = parseInt(nextCard.getAttribute('data-depth'), 10);
            if (nextDepth <= depth) break;

            nextCard.style.display = isCollapsed ? 'block' : 'none';
            nextCard = nextCard.nextElementSibling;
          }
        });

        commentsContainer.appendChild(commentCard);
      });

      commentTree.replaceWith(commentsContainer);
    }
  }

  // Safe footer removal without nuking parent HTML structures
  function purgeFooter() {
    document.querySelectorAll('.yclist').forEach(el => {
      const tr = el.closest('tr');
      if (tr) tr.remove();
    });

    document.querySelectorAll('#hnmain tr').forEach(tr => {
      const txt = tr.textContent;
      if ((txt.includes('Guidelines') && txt.includes('FAQ')) || txt.includes('Apply to YC')) {
        tr.remove();
      }
    });
  }

  buildHeader();
  transformFeed();
  transformItemPage();
  purgeFooter();
})();