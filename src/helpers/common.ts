export function randomWait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms + Math.random() * 10));
}
