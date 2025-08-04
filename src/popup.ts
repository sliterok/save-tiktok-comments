document.addEventListener('DOMContentLoaded', () => {
  const titleEl = document.getElementById('tab-title');
  const countEl = document.getElementById('comment-count');
  const exportJsonButton = document.getElementById('exportJson') as HTMLButtonElement;
  const copyJsonButton = document.getElementById('copyJson') as HTMLButtonElement;
  const copyTextButton = document.getElementById('copyText') as HTMLButtonElement;
  const scrollButton = document.getElementById('scroll-to-bottom') as HTMLButtonElement;
  const reloadButton = document.getElementById('reload-comments') as HTMLButtonElement;

  let comments = [];
  let currentTab;
  let isScrolling = false;

  function cleanTabTitle(title) {
    if (!title) return 'No title';
    // Remove notification count like (1), (2), etc., and the "| TikTok" suffix.
    return title.replace(/^\(\d+\)\s*/, '').replace(/\s*\|\s*TikTok$/, '').trim();
  }

  function updateUI(retrievedComments, tab) {
    comments = retrievedComments || [];
    currentTab = tab;

    const isTikTok = tab && tab.url && tab.url.includes('tiktok.com');
    const isVideoOrPhoto = isTikTok && (tab.url.includes('/video/') || tab.url.includes('/photo/'));

    if (isVideoOrPhoto) {
        const cleanedTitle = cleanTabTitle(tab.title);
        titleEl.textContent = cleanedTitle;
        titleEl.title = cleanedTitle;
        countEl.textContent = `${comments.length} comments captured`;

        const hasComments = comments.length > 0;
        exportJsonButton.disabled = !hasComments;
        copyJsonButton.disabled = !hasComments;
        copyTextButton.disabled = !hasComments;
        scrollButton.disabled = false;
        reloadButton.style.display = hasComments ? 'none' : 'block';
    } else {
        titleEl.textContent = 'Not a TikTok Video/Photo';
        countEl.textContent = '';
        exportJsonButton.disabled = true;
        copyJsonButton.disabled = true;
        copyTextButton.disabled = true;
        scrollButton.disabled = true;
        reloadButton.style.display = 'none';
    }
  }

  // Request data from the background script when the popup is opened
  chrome.runtime.sendMessage({ type: 'get_popup_data' }, (response) => {
    if (chrome.runtime.lastError) {
      console.error(chrome.runtime.lastError.message);
      updateUI([], null);
      return;
    }
    updateUI(response.comments, response.tab);
  });

  // Listen for messages from the background script
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'comments_updated') {
      chrome.runtime.sendMessage({ type: 'get_popup_data' }, (response) => {
        if (chrome.runtime.lastError) {
          console.error(chrome.runtime.lastError.message);
          return;
        }
        updateUI(response.comments, response.tab);
      });
    }
  });

  exportJsonButton.addEventListener('click', () => {
    if (comments.length > 0 && currentTab) {
      const url = new URL(currentTab.url);
      const pathParts = url.pathname.split('/').filter(p => p); // filter out empty strings
      // expected path: /@username/video/videoid or /@username/photo/photoid
      const username = pathParts[0].substring(1);
      const videoId = pathParts[2];
      const title = cleanTabTitle(currentTab.title).replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const filename = `${username}_${videoId}_${title}.json`;

      const blob = new Blob([JSON.stringify(comments, null, 2)], { type: 'application/json' });
      const blobUrl = URL.createObjectURL(blob);
      chrome.downloads.download({
        url: blobUrl,
        filename: filename
      }, () => URL.revokeObjectURL(blobUrl));
    }
  });

  copyJsonButton.addEventListener('click', () => {
    if (comments.length > 0) {
      navigator.clipboard.writeText(JSON.stringify(comments, null, 2));
    }
  });

  copyTextButton.addEventListener('click', () => {
    if (comments.length > 0) {
      const commentTexts = comments.map(comment => comment.text.replace(/\n/g, ' ')); // Replace newlines to keep one comment per line
      const textContent = commentTexts.join('\n');
      navigator.clipboard.writeText(textContent);
    }
  });

  chrome.runtime.sendMessage({ type: 'get_scroll_state' }, (response) => {
    if (response && response.isScrolling) {
      isScrolling = true;
      scrollButton.textContent = 'Stop Scrolling';
    }
  });

  scrollButton.addEventListener('click', () => {
    isScrolling = !isScrolling;
    scrollButton.textContent = isScrolling ? 'Stop Scrolling' : 'Auto-scroll';
    chrome.runtime.sendMessage({ type: 'toggle_scroll', state: isScrolling });
  });

  reloadButton.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length > 0) {
        chrome.tabs.reload(tabs[0].id);
        window.close();
      }
    });
  });
});
