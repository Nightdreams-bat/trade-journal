// Local-only display name for the greeting ("Good evening, Matei"). No
// account, email, or password — just a name kept on this machine, same
// storage pattern as the theme preference (see themeMode.tsx).

const NAME_KEY = 'tj:userName'
const PROMPT_SEEN_KEY = 'tj:namePromptSeen'

export function getStoredName(): string {
  try {
    return localStorage.getItem(NAME_KEY) ?? ''
  } catch {
    return ''
  }
}

export function setStoredName(name: string): void {
  try {
    localStorage.setItem(NAME_KEY, name.trim())
  } catch {
    // private mode / storage disabled — the choice just won't persist
  }
}

export function hasSeenNamePrompt(): boolean {
  try {
    return localStorage.getItem(PROMPT_SEEN_KEY) === '1'
  } catch {
    return true
  }
}

export function markNamePromptSeen(): void {
  try {
    localStorage.setItem(PROMPT_SEEN_KEY, '1')
  } catch {
    // ignore
  }
}
