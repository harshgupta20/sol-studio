// UTF-8-safe base64 helpers. GitHub's contents/blobs APIs exchange file content
// as base64; `atob`/`btoa` are Latin-1 only, so we round-trip through TextEncoder.

export function decodeBase64ToText(b64: string): string {
  const clean = b64.replace(/\s/g, '');
  const bin = atob(clean);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
}

export function encodeTextToBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let bin = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

/**
 * Heuristic binary detection from decoded base64: a NUL byte in the first 8 KB
 * almost always means binary. We keep binary files out of the text workspace.
 */
export function base64LooksBinary(b64: string): boolean {
  const clean = b64.replace(/\s/g, '').slice(0, 12000); // ~9KB of bytes
  let bin: string;
  try {
    bin = atob(clean);
  } catch {
    return true;
  }
  const scan = Math.min(bin.length, 8192);
  for (let i = 0; i < scan; i++) {
    if (bin.charCodeAt(i) === 0) return true;
  }
  return false;
}
