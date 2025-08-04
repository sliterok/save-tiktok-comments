import { randomWait } from "./common";

export async function sendPageDown(id: number) {
  await chrome.debugger.sendCommand({ tabId: id }, "Input.dispatchKeyEvent", {
    type: "keyDown",
    code: "PageDown",
    key: "PageDown",
    windowsVirtualKeyCode: 34,
    isUserGesture: true
  });

  await randomWait(5);

  await chrome.debugger.sendCommand({ tabId: id }, "Input.dispatchKeyEvent", {
    type: "keyUp",
    code: "PageDown",
    key: "PageDown",
    windowsVirtualKeyCode: 34,
    isUserGesture: true
  });  
}