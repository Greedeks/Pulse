document.addEventListener('DOMContentLoaded', function () {
  const form = document.getElementById('pulseForm');
  const container = document.querySelector('.content');
  const scrollBtn = document.querySelector('.btn-scroll-top');
  const footer = document.querySelector('.footer');
  const baseBottom = parseInt(window.getComputedStyle(scrollBtn).bottom, 10);

  // Cached handling
  function clearCache(url) {
    const cacheKey = `cache_${url}`;
    localStorage.removeItem(cacheKey);
  }

  function clearAllCache() { localStorage.clear(); }

  async function cachedFetch(url, ttl = 60 * 60 * 1000) {
    const cacheKey = `cache_${url}`;
    let cached = localStorage.getItem(cacheKey);
    try {
      if (cached) { const data = JSON.parse(cached);
        if (Date.now() - data.timestamp < ttl) {
          return new Response(JSON.stringify(data.value), { status: 200 });
        } else { clearCache(url); }
      }
    } catch (err) { clearCache(url); cached = null; }

    try {
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.clone().json();
        localStorage.setItem(cacheKey, JSON.stringify({ value: json, timestamp: Date.now() }));
      }
      return res;
    } catch (err) {
      if (cached) {
        const data = JSON.parse(cached);
        return new Response(JSON.stringify(data.value), { status: 200 });
      }
      throw err;
    }
  }

  setInterval(() => { clearAllCache(); }, 4 * 60 * 60 * 1000); 

  // URL handling
  function getUrlParams() {const params = new URLSearchParams(window.location.search);
    return {
      username: params.get('username'),
      repo: params.get('repo'),
      tag: params.get('tag')
    };
  }

  function updateUrlParams(username, repo, tag = '') {
    const params = new URLSearchParams();
    if (username) params.set('username', username);
    if (repo) params.set('repo', repo);
    if (tag) params.set('tag', tag);
    const newUrl = window.location.origin + window.location.pathname + '?' + params.toString();
    window.history.pushState({}, '', newUrl);
  }

  function autoFillFromUrl() {
    const { username, repo, tag } = getUrlParams();
    if (username) form.username.value = username;
    if (repo) form.repository.value = repo;
    if (tag) form.releaseTag.value = tag;
    if (username && repo) form.dispatchEvent(new Event('submit'));
  }

  // Handling link pasting
  function handleInput(value, clear = false) {
    if (!value) return;

    value = value.trim();
    value = value.replace(/^(https?:\/\/)?(zh\.)?github\.com\//i, '');
    let tag = '';

    if (clear) {
      form.username.value = '';
      form.repository.value = '';
      form.releaseTag.value = '';
    }

    const tagMatch = value.match(/^([\w-]+)\/([\w.-]+)\/releases\/tag\/([^/]+)/i);
    if (tagMatch) {
      form.username.value = tagMatch[1];
      form.repository.value = tagMatch[2];
      form.releaseTag.value = tagMatch[3];
      return;
    }

    const shortTagMatch = value.match(/^\/?releases\/tag\/([^/]+)/i);
    if (shortTagMatch) {
      form.releaseTag.value = shortTagMatch[1];
      return;
    }

    if (value.includes('@')) [value, tag] = value.split('@');

    const repoMatch = value.match(/^([\w-]+)\/([\w.-]+)(?:\/.*)?$/);
    if (repoMatch) {
      form.username.value = repoMatch[1];
      form.repository.value = repoMatch[2];
      form.releaseTag.value = tag || '';
    }
  }

  [form.username, form.repository, form.releaseTag].forEach(input => {
    input.addEventListener('input', () => {  handleInput(input.value, false); });
    input.addEventListener('paste', (e) => {  e.preventDefault();
      const pasteText = (e.clipboardData || window.clipboardData).getData('text');
      handleInput(pasteText, false);
      if (!form.username.value && !form.repository.value && !form.releaseTag.value) { input.value = pasteText; }
    });
  });

  // GitHub API
  async function fetchAllReleases(username, repo) {
    let releases = [], page = 1;
    while (true) {
      const res = await cachedFetch(`https://api.github.com/repos/${username}/${repo}/releases?page=${page}&per_page=100`);
      if (res.status === 403) throw new Error('GitHub API rate limit exceeded');
      if (res.status === 404) throw new Error('Repository not found');
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const data = await res.json();
      if (data.length === 0) break;
      releases = releases.concat(data);
      page++;
    }
    return releases;
  }

  // Handling Statistics 
  function calculateStatistics(releases) {
    let totalDownloads = 0;
    let totalReactions = 0;
    let totalReleases = releases.length;
    let totalAssets = 0;

    releases.forEach(release => {
      const releaseDownloadsCount = release.assets.reduce((sum, asset) => {
        totalAssets++;
        return sum + asset.download_count;
      }, 0);

      totalDownloads += releaseDownloadsCount;
      totalReactions += release.reactions ? release.reactions.total_count : 0;
    });

    return { totalDownloads, totalReactions, totalReleases, totalAssets };
  }

  function formatSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Render
  function renderStatistics(stats, releases) {
    const statsSection = document.createElement('div');
    statsSection.className = 'statistics-section';
    statsSection.innerHTML = `
         <div class="stat-card">
             <div class="stat-content">
                 <div class="stat-item">
                     <i class="fas fa-download stat-icon"></i>
                     <div class="stat-main-value">${stats.totalDownloads.toLocaleString()}</div>
                     <div class="stat-label">Total Downloads</div>
                     <div class="stat-description">
                         ${stats.totalReleases} releases<br>
                         ${stats.totalAssets} assets
                     </div>
                 </div>
                 <div class="stat-item">
                     <i class="fas fa-heart stat-icon"></i>
                     <div class="stat-main-value">${stats.totalReactions.toLocaleString()}</div>
                     <div class="stat-label">Total Reactions</div>
                     <div class="stat-description">
                         ${releases.filter(r => r.reactions).length} releases<br>
                         with reactions
                     </div>
                 </div>
             </div>
         </div>
     `;

    container.appendChild(statsSection);
  }

  function renderContributors(release) {
    if (!release.body) return [];
    const matches = [...release.body.matchAll(/@([a-zA-Z0-9-]+)/g)];
    const uniqueUsernames = [...new Set(matches.map(m => m[1]))];
    return uniqueUsernames.map(u => ({
      login: u,
      avatar: `https://github.com/${u}.png`,
      html_url: `https://github.com/${u}`
    }));
  }

  function renderReleases(allReleases, tag = '') {
    let releases = allReleases.filter(r => r.assets && r.assets.length > 0);
    if (releases.length === 0) {
      throw new Error(`No releases with files found${tag ? ` for tag "${tag}"` : ''}`);
    }

    const sortedByDate = [...releases].sort((a, b) => new Date(b.published_at) - new Date(a.published_at));
    const latestRelease = sortedByDate[0];

    if (tag && tag.toLowerCase() === 'latest') {
      releases = [latestRelease];
    }
    else if (tag) {
      releases = releases.filter(r => r.tag_name.toLowerCase() === tag.toLowerCase());
      if (releases.length === 0) {
        throw new Error(`No releases with files found for tag "${tag}"`);
      }
    }

    const stats = calculateStatistics(allReleases);
    container.innerHTML = '';
    renderStatistics(stats, allReleases);

    releases.forEach((r) => {
      const isLatest = r.tag_name.toLowerCase() === latestRelease.tag_name.toLowerCase();
      const contributors = renderContributors(r);
      const card = document.createElement('div');
      card.className = 'release-card';
      card.innerHTML = `
            <div class="release-header">
                <a href="https://github.com/${r.author.login}/${form.repository.value.trim()}/releases/tag/${r.tag_name}" 
                   target="_blank" 
                   class="version-link">
                    <span class="version">${r.tag_name}</span>
                </a>
            <div class="header-right">
              ${isLatest ? '<span class="latest-label"><i class="fas fa-star"></i> Latest</span>' :
              r.prerelease ? '<span class="pre-label"><i class="fas fa-flask"></i> Pre-release</span>' :
            '<span class="release-label"><i class="fas fa-check-circle"></i> Release</span>'}
            </div>
            </div>
            <div class="release-meta">
              <div class="release-meta-left">
                <a href="https://github.com/${r.author.login}" target="_blank" class="author-link">
                  <span class="release-author">
                    <img src="${r.author.avatar_url}" alt="${r.author.login}" class="author-avatar">
                    <span class="author-name">${r.author.login}</span>
                  </span>
                </a>
                <span class="release-published">
                  <i class="fas fa-calendar-alt"></i> Published: ${new Date(r.published_at).toLocaleDateString()}
                </span>
              </div>
                          
              <div class="release-meta-right">
                <div class="release-size">
                  <i class="fas fa-database"></i> Size: ${formatSize(r.assets.reduce((acc, a) => acc + a.size, 0))}
                </div>
                <div class="release-updated">
                  <i class="fas fa-sync-alt"></i> Updated: ${new Date(r.updated_at || r.published_at).toLocaleDateString()}
                </div>
              </div>
            </div>
            ${contributors.length > 0 ? `
            <div class="contributors-section">
              <div class="file-list-header">
                <span class="files-title"><i class="fas fa-users"></i> Contributors</span>
                <span class="contributors-count"><i class="fas fa-user-friends"></i> ${contributors.length}</span>
              </div>
              <div class="contributors-list">
                ${contributors.map(c => `
                  <a href="${c.html_url}" target="_blank" class="contrib-link">
                    <img src="${c.avatar}" alt="${c.login}" title="${c.login}" class="contrib-avatar">
                  </a>`).join('')}
              </div>
            </div>` : 
            ''}
            <div class="file-list">
                <div class="file-list-header">
                    <span class="files-title"><i class="fas fa-cube"></i> Assets</span>
                    <span class="files-title-downloads"><i class="fas fa-download"></i> ${r.assets.reduce((acc,a)=>acc+a.download_count,0)}</span>
                </div>
                ${r.assets.map(f=>`<div class="file-item"><a href="${f.browser_download_url}" target="_blank">${f.name}</a><span>${f.download_count}</span></div>`).join('')}
            </div>
            ${r.reactions ? `
            <div class="reactions-section">
                <div class="file-list-header">
                    <span class="files-title"><i class="fas fa-bell"></i> Reactions</span>
                    <span class="files-title-downloads"><i class="fas fa-heart"></i> ${r.reactions.total_count}</span>
                </div>
                <div class="reactions-items">
                    ${r.reactions['+1'] ? `<span><i class="fas fa-thumbs-up" style="color:#a4d7f4; filter: drop-shadow(0 0 8px rgba(164, 215, 244, 0.2));"></i> ${r.reactions['+1']}</span>` : ''}
                    ${r.reactions['-1'] ? `<span><i class="fas fa-thumbs-down" style="color:#a4d7f4; filter: drop-shadow(0 0 8px rgba(164, 215, 244, 0.2));"></i> ${r.reactions['-1']}</span>` : ''}
                    ${r.reactions.laugh ? `<span><i class="fas fa-smile" style="color:#a4d7f4; filter: drop-shadow(0 0 8px rgba(164, 215, 244, 0.2));"></i> ${r.reactions.laugh}</span>` : ''}
                    ${r.reactions.hooray ? `<span><i class="fas fa-hands-clapping" style="color:#a4d7f4; filter: drop-shadow(0 0 8px rgba(164, 215, 244, 0.2));"></i> ${r.reactions.hooray}</span>` : ''}
                    ${r.reactions.confused ? `<span><i class="fas fa-surprise" style="color:#a4d7f4; filter: drop-shadow(0 0 8px rgba(164, 215, 244, 0.2));"></i> ${r.reactions.confused}</span>` : ''}
                    ${r.reactions.heart ? `<span><i class="fas fa-heart" style="color:#a4d7f4; filter: drop-shadow(0 0 8px rgba(164, 215, 244, 0.2));"></i> ${r.reactions.heart}</span>` : ''}
                    ${r.reactions.rocket ? `<span><i class="fas fa-rocket" style="color:#a4d7f4; filter: drop-shadow(0 0 8px rgba(164, 215, 244, 0.2));"></i> ${r.reactions.rocket}</span>` : ''}
                    ${r.reactions.eyes ? `<span><i class="fas fa-eye" style="color:#a4d7f4; filter: drop-shadow(0 0 8px rgba(164, 215, 244, 0.2));"></i> ${r.reactions.eyes}</span>` : ''}
                </div>
            </div>` : ''}
        `;
      container.appendChild(card);
    });
  }

  // Scroll to top button handling
  function updateScrollBtnPosition() {
    if (window.scrollY > 300) { scrollBtn.classList.add('show'); } 
    else { scrollBtn.classList.remove('show'); }

    const footerRect = footer.getBoundingClientRect();
    const windowHeight = window.innerHeight;

    if (footerRect.top < windowHeight) { scrollBtn.style.bottom = baseBottom + (windowHeight - footerRect.top + 1) + 'px'; } 
    else { scrollBtn.style.bottom = baseBottom + 'px'; }
  }

  // Events & filling form
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const glassWindow = document.querySelector('.glass-window');
    glassWindow.classList.remove('shimmer-once');
    void glassWindow.offsetWidth;
    glassWindow.classList.add('shimmer-once');

    const username = form.username.value.trim();
    const repo = form.repository.value.trim();
    const tag = form.releaseTag.value.trim();

    updateUrlParams(username, repo, tag);

    const contentContainer = document.querySelector('.content-container');
    contentContainer.style.minHeight = container.offsetHeight + 'px';
    container.innerHTML = '<div class="loader"><div class="loader-spinner"></div></div>';

    try {
      const releases = await fetchAllReleases(username, repo);
      renderReleases(releases, tag);
    } catch (err) {
      container.innerHTML = `<p style="text-align:center; color: #a4d7f4;">${err.message}</p>`;
    }
    finally {
      contentContainer.style.minHeight = '';
    }
  });

  autoFillFromUrl();

  window.addEventListener('scroll', updateScrollBtnPosition);
  window.addEventListener('resize', updateScrollBtnPosition);
  window.addEventListener('orientationchange', updateScrollBtnPosition);
  
  scrollBtn.addEventListener('click', () => { window.scrollTo({ top: 0, behavior: 'smooth' }); });
  
  updateScrollBtnPosition();
});
