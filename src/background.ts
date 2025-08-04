import { sendPageDown } from "./helpers/keyboard";

// Use a Map to store data per tabId: Map<number, { comments: any[] }>
const tabsData = new Map();
let scrollInterval;
let scrollingTabId;

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

function startScrolling(tabId: number) {
  if (scrollInterval) return;
  scrollingTabId = tabId;
  scrollInterval = setInterval(() => {
    if (tabsData.has(scrollingTabId)) {
        sendPageDown(scrollingTabId);
    } else {
        stopScrolling();
    }
  }, 50);
}

function stopScrolling() {
  clearInterval(scrollInterval);
  scrollInterval = null;
  scrollingTabId = null;
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    const isTikTokUrl = tab.url && tab.url.includes('tiktok.com');

    if (tabId === scrollingTabId && changeInfo.url) {
        stopScrolling();
    }

    // If the tab is not on TikTok, ensure we are detached.
    if (!isTikTokUrl) {
        if (tabsData.has(tabId)) {
            chrome.debugger.detach({ tabId });
            tabsData.delete(tabId);
        }
        return;
    }

    // The tab is on TikTok.
    if (!tabsData.has(tabId)) {
        // If we aren't tracking this tab, attach the debugger.
        // This handles new tabs, restored tabs, and navigations from other sites.
        chrome.debugger.attach({ tabId }, '1.2', () => {
            if (chrome.runtime.lastError) {
                // e.g., another debugger is already attached.
                return;
            }
            tabsData.set(tabId, { comments: [] });
            setupDebugger(tabId);
        });
    } else {
        // We are already tracking this tab. If the URL changed, it's a new video.
        if (changeInfo.url) {
            const tabData = tabsData.get(tabId);
            if (tabData) {
                tabData.comments = [];
            }
        }
    }
});

chrome.tabs.onRemoved.addListener((tabId) => {
    if (tabId === scrollingTabId) {
        stopScrolling();
    }
    if (tabsData.has(tabId)) {
        chrome.debugger.detach({ tabId });
        tabsData.delete(tabId);
    }
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
            let decodedBody;
            if (response.base64Encoded) {
                // Decode base64 to a binary string
                const binaryString = atob(response.body);
                // Convert the binary string to a byte array
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }
                // Decode the byte array as UTF-8
                decodedBody = new TextDecoder('utf-8').decode(bytes);
            } else {
                decodedBody = response.body;
            }

            const data = JSON.parse(decodedBody);
            if (data && data.comments) {
              const tabData = tabsData.get(source.tabId);
              if (tabData) {
                  const existingCids = new Set(tabData.comments.map(c => c.cid));
                  const newComments = data.comments.filter(c => !existingCids.has(c.cid));
                  
                  if (newComments.length > 0) {
                    tabData.comments.push(...newComments);
                    chrome.runtime.sendMessage({
                      type: 'comments_updated',
                      count: tabData.comments.length
                    });
                  }
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
          tab: tab,
          comments: data ? data.comments : []
        });
      } else {
        sendResponse({ tab: null, comments: [] });
      }
    });
    return true; // Indicates async response
  }

  if (message.type === 'toggle_scroll') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs.length > 0) {
            const tabId = tabs[0].id;
            if (message.state) {
                startScrolling(tabId);
            } else {
                stopScrolling();
            }
        }
    });
    return true;
  }

  if (message.type === 'get_scroll_state') {
      sendResponse({ isScrolling: !!scrollInterval });
      return true;
  }
});

// Initial check on startup for already-open tabs
chrome.tabs.query({ url: '*://*.tiktok.com/*' }, (tabs) => {
  for (const tab of tabs) {
    if (!tabsData.has(tab.id)) {
        chrome.debugger.attach({ tabId: tab.id }, '1.2', () => {
            if (chrome.runtime.lastError) return;
            tabsData.set(tab.id, { comments: [] });
            setupDebugger(tab.id);
        });
    }
  }
});
