document.addEventListener('DOMContentLoaded', () => {
  const exportJsonButton = document.getElementById('exportJson');
  const copyJsonButton = document.getElementById('copyJson');
  const copyCsvButton = document.getElementById('copyCsv');

  exportJsonButton.addEventListener('click', () => {
    chrome.storage.local.get('comments', ({ comments }) => {
      if (comments && comments.length > 0) {
        const blob = new Blob([JSON.stringify(comments, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        chrome.downloads.download({
          url: url,
          filename: 'tiktok-comments.json'
        }, () => {
          // Revoke the object URL after the download starts
          URL.revokeObjectURL(url);
        });
      }
    });
  });

  copyJsonButton.addEventListener('click', () => {
    chrome.storage.local.get('comments', ({ comments }) => {
      if (comments && comments.length > 0) {
        navigator.clipboard.writeText(JSON.stringify(comments, null, 2));
      }
    });
  });

  copyCsvButton.addEventListener('click', () => {
    chrome.storage.local.get('comments', ({ comments }) => {
      if (comments && Array.isArray(comments) && comments.length > 0) {
        const commentTexts = comments.map(comment => comment.text);
        const csvContent = commentTexts.join('\n');
        navigator.clipboard.writeText(csvContent);
      }
    });
  });
});