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

// Release whose new-feature announcement the user has dismissed.
const TOAST_KEY = 'tj:featureToast:dismissedVersion'

export function getDismissedFeatureVersion(): string | null {
  try {
    return localStorage.getItem(TOAST_KEY)
  } catch {
    return null
  }
}

export function setDismissedFeatureVersion(version: string): void {
  try {
    localStorage.setItem(TOAST_KEY, version)
  } catch {
    // non-fatal — the announcement just comes back next launch
  }
}
