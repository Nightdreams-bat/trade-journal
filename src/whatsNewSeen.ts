// Tracks the last release the user has viewed in the "What's New" tab.
// Local to this machine; failure to read/write storage is non-fatal.

const KEY = 'tj:whatsNew:lastSeenVersion'

export function getLastSeenVersion(): string | null {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
}

export function setLastSeenVersion(version: string): void {
  try {
    localStorage.setItem(KEY, version)
  } catch {
    // private mode / storage disabled — the dot just won't persist
  }
}
