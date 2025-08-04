// Use a Map to store data per tabId: Map<number, { comments: any[] }>
const tabsData = new Map();

const TIKTOK_COMMENT_API_PATTERN = '*://*.tiktok.com/api/comment/list*';

function setupDebugger(tabId) {
  chrome.debugger.sendCommand({ tabId }, 'Network.enable', () => {
    if (chrome.runtime.lastError) return;
    chrome.debugger.sendCommand(
      { tabId },
      'Network.setRequestInterception',
      { patterns: [{ urlPattern: TIKTOK_COMMENT_API_PATTERN, interceptionStage: 'HeadersReceived' }] }
    );
  });
}

function attachDebugger(tabId) {
  if (tabsData.has(tabId)) return; // Already tracking this tab

  chrome.debugger.attach({ tabId }, '1.2', () => {
    if (chrome.runtime.lastError) {
      console.error(`Attach failed for tab ${tabId}: ${chrome.runtime.lastError.message}`);
      return;
    }
    tabsData.set(tabId, { comments: [] });
    setupDebugger(tabId);
  });
}

function detachDebugger(tabId) {
  if (!tabsData.has(tabId)) return;
  
  chrome.debugger.detach({ tabId: tabId }, () => {
    tabsData.delete(tabId);
  });
}

// Attach to existing and new TikTok tabs
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (tab.url && tab.url.includes('tiktok.com')) {
    if (changeInfo.status === 'complete') {
      attachDebugger(tabId);
    }
  } else {
    detachDebugger(tabId);
  }
});

// Clean up when a tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
  detachDebugger(tabId);
});

// Handle intercepted network requests
chrome.debugger.onEvent.addListener((source, method, params) => {
  if (method === 'Network.requestIntercepted' && tabsData.has(source.tabId)) {
    const { interceptionId } = params;

    chrome.debugger.sendCommand(
      { tabId: source.tabId },
      'Network.getResponseBodyForInterception',
      { interceptionId },
      (response) => {
        if (response && response.body) {
          try {
            const data = JSON.parse(response.base64Encoded ? atob(response.body) : response.body);
            if (data && data.comments) {
              const tabData = tabsData.get(source.tabId);
              const existingCids = new Set(tabData.comments.map(c => c.cid));
              const newComments = data.comments.filter(c => !existingCids.has(c.cid));
              
              if (newComments.length > 0) {
                tabData.comments.push(...newComments);
              }
            }
          } catch (e) {
            console.error('Failed to parse response body:', e);
          }
        }
        chrome.debugger.sendCommand({ tabId: source.tabId }, 'Network.continueInterceptedRequest', { interceptionId });
      }
    );
  } else if (params.interceptionId) {
    // Ensure any other intercepted requests are continued
    chrome.debugger.sendCommand({ tabId: source.tabId }, 'Network.continueInterceptedRequest', { interceptionId: params.interceptionId });
  }
});

// Listen for data requests from the popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'get_popup_data') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length > 0) {
        const tab = tabs[0];
        const data = tabsData.get(tab.id);
        sendResponse({
          title: tab.title,
          comments: data ? data.comments : []
        });
      } else {
        sendResponse({ title: 'No active tab found', comments: [] });
      }
    });
    return true; // Indicates async response
  }
});

// Initial check on startup
chrome.tabs.query({ url: '*://*.tiktok.com/*' }, (tabs) => {
  for (const tab of tabs) {
    attachDebugger(tab.id);
  }
});
