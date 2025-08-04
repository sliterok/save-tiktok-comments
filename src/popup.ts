document.addEventListener('DOMContentLoaded', () => {
  const titleEl = document.getElementById('tab-title');
  const countEl = document.getElementById('comment-count');
  const exportJsonButton = document.getElementById('exportJson') as HTMLButtonElement;
  const copyJsonButton = document.getElementById('copyJson') as HTMLButtonElement;
  const copyTextButton = document.getElementById('copyText') as HTMLButtonElement;

  let comments = [];

  function updateUI(retrievedComments, tabTitle) {
    comments = retrievedComments || [];
    titleEl.textContent = tabTitle || 'No TikTok tab active';
    titleEl.title = tabTitle || 'No TikTok tab active';
    countEl.textContent = `${comments.length} comments captured`;

    const hasComments = comments.length > 0;
    exportJsonButton.disabled = !hasComments;
    copyJsonButton.disabled = !hasComments;
    copyTextButton.disabled = !hasComments;
  }

  // Request data from the background script when the popup is opened
  chrome.runtime.sendMessage({ type: 'get_popup_data' }, (response) => {
    if (chrome.runtime.lastError) {
      console.error(chrome.runtime.lastError.message);
      updateUI([], 'Error loading data');
      return;
    }
    updateUI(response.comments, response.title);
  });

  exportJsonButton.addEventListener('click', () => {
    if (comments.length > 0) {
      const blob = new Blob([JSON.stringify(comments, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      chrome.downloads.download({
        url: url,
        filename: 'tiktok-comments.json'
      }, () => URL.revokeObjectURL(url));
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
});
