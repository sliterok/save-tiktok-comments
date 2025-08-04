# TikTok Comment Exporter

A browser extension to easily export and save comments from any TikTok video or photo post.

## Features

- **Export Comments**: Save all captured comments to a file in either JSON or plain text (TXT) format.
- **Copy to Clipboard**: Quickly copy all comments to your clipboard.
- **Auto-Scroll**: Automatically scrolls the page to load all available comments for capture.
- **Modern UI**: A clean and intuitive interface with automatic light and dark theme support based on your system preferences.

## Installation

To install the extension locally, follow these steps:

1.  **Clone the repository** or download the source code.
2.  **Install dependencies**: Open a terminal in the project directory and run:
    ```bash
    pnpm install
    ```
3.  **Build the extension**: Run the build command to compile the TypeScript files.
    ```bash
    npm run build
    ```
    This will create a `dist` folder with the necessary JavaScript files.
4.  **Load the extension in your browser**:
    - Open Chrome and navigate to `chrome://extensions`.
    - Enable "Developer mode" in the top right corner.
    - Click "Load unpacked" and select the project's root directory (`tiktok-comments-ext`).

## How to Use

1.  Navigate to any video or photo page on `tiktok.com`.
2.  Click the extension icon in your browser's toolbar to open the popup.
3.  If not all comments are loaded, click the **"Auto-scroll"** button to start loading them. Click it again to stop.
4.  Once comments are captured, you can:
    - **Save as JSON/Text**: Click the "Save JSON" or "Save Text" buttons to download the files.
    - **Copy to Clipboard**: Click the copy icon next to the save buttons.
5.  If no comments are captured after the page loads, a **(reload)** link will appear. Clicking it will refresh the page to try again.

---

## A Note on Permissions and Privacy

This extension uses the `chrome.debugger` permission to capture comments. Here’s why:

- **Why is it needed?** The `debugger` permission allows the extension to intercept the network traffic between your browser and TikTok's servers. This is the most reliable way to capture the comment data as you scroll, without resorting to less reliable methods like screen scraping.

- **Is it secure?** The extension is designed to *only* listen to the specific API requests that load comments on TikTok. It does not access your personal data, passwords, or browsing history on other websites. The source code is available for you to review.

- **Browser Warning**: When the extension is active on a TikTok tab, Chrome will display a warning bar at the top of the window (e.g., "TikTok Comment Exporter is debugging this browser"). This is a standard security feature from Chrome to let you know that an extension is interacting with the page. The warning will disappear when you close the TikTok tab.