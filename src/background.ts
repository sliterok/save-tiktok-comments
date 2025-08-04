let commentsBuffer = [];
let attachedTabId = null;

const TIKTOK_COMMENT_API_PATTERN = '*://*.tiktok.com/api/comment/list*';

// Function to set up the debugger for a tab
function setupDebugger(tabId) {
  chrome.debugger.sendCommand({ tabId }, 'Network.enable', () => {
    if (chrome.runtime.lastError) {
      console.error('Failed to enable network:', chrome.runtime.lastError.message);
      return;
    }
    chrome.debugger.sendCommand(
      { tabId },
      'Network.setRequestInterception',
      {
        patterns: [{ urlPattern: TIKTOK_COMMENT_API_PATTERN, interceptionStage: 'HeadersReceived' }],
      },
      () => {
        if (chrome.runtime.lastError) {
          console.error('Failed to set request interception:', chrome.runtime.lastError.message);
        }
      }
    );
  });
}

// Function to attach the debugger to a tab
function attachDebugger(tabId) {
  if (attachedTabId === tabId) {
    return; // Already attached
  }

  if (attachedTabId) {
    try {
      chrome.debugger.detach({ tabId: attachedTabId });
    } catch (e) {
      console.warn(`Could not detach from tab ${attachedTabId}: ${e.message}`);
    }
  }
  
  commentsBuffer = [];
  chrome.storage.local.set({ comments: [] });

  chrome.debugger.attach({ tabId }, '1.2', () => {
    if (chrome.runtime.lastError) {
      console.error(`Attach failed: ${chrome.runtime.lastError.message}`);
      return;
    }
    attachedTabId = tabId;
    setupDebugger(tabId);
  });
}

// Function to detach the debugger from a tab
function detachDebugger(tabId) {
  if (attachedTabId === tabId) {
    try {
      chrome.debugger.detach({ tabId: tabId }, () => {
        if (chrome.runtime.lastError) {
          // It might have already been detached, so we can ignore this.
        }
        attachedTabId = null;
      });
    } catch (e) {
        console.warn(`Could not detach from tab ${tabId}: ${e.message}`);
        attachedTabId = null;
    }
  }
}

// Listeners for tab management
chrome.tabs.onActivated.addListener((activeInfo) => {
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    if (tab && tab.url && tab.url.includes('tiktok.com')) {
      attachDebugger(tab.id);
    } else if (attachedTabId) {
      detachDebugger(attachedTabId);
    }
  });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (tab.url && tab.url.includes('tiktok.com')) {
        if (changeInfo.status === 'complete') {
            attachDebugger(tabId);
        }
    } else {
        if (tabId === attachedTabId) {
            detachDebugger(tabId);
        }
    }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabId === attachedTabId) {
    detachDebugger(tabId);
  }
});

// Main logic: handle intercepted requests
chrome.debugger.onEvent.addListener((source, method, params) => {
  if (method === 'Network.requestIntercepted') {
    console.log(params)
    const { interceptionId } = params;

    chrome.debugger.sendCommand(
      { tabId: source.tabId },
      'Network.getResponseBodyForInterception',
      { interceptionId },
      (response) => {
        if (chrome.runtime.lastError) {
          console.log(`Could not get response body: ${chrome.runtime.lastError.message}`);
          // We must continue the request anyway.
          chrome.debugger.sendCommand({ tabId: source.tabId }, 'Network.continueInterceptedRequest', { interceptionId });
          return;
        }

        if (response && response.body) {
          try {
            const data = JSON.parse(atob(response.body));
            if (data && data.comments) {
              const newComments = data.comments.filter(c => !commentsBuffer.some(bc => bc.cid === c.cid));
              if (newComments.length > 0) {
                commentsBuffer.push(...newComments);
                chrome.storage.local.set({ comments: commentsBuffer });
              }
            }
          } catch (e) {
            console.error('Failed to parse response body:', e);
          }
        }
        
        // IMPORTANT: always continue the request
        chrome.debugger.sendCommand({ tabId: source.tabId }, 'Network.continueInterceptedRequest', { interceptionId });
      }
    );
  }
});

// Initial check on startup
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  if (tabs[0] && tabs[0].url && tabs[0].url.includes('tiktok.com')) {
    attachDebugger(tabs[0].id);
  }
});