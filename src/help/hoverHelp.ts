/** Persisted newcomer hover-help preference (Tutorial tab toggle). */

const HOVER_HELP_KEY = 'freshstart_hover_help_v1';

export function loadHoverHelpEnabled(): boolean {
  try {
    const raw = localStorage.getItem(HOVER_HELP_KEY);
    if (raw === '0') return false;
    if (raw === '1') return true;
  } catch {
    /* ignore */
  }
  return true; // ON by default
}

export function saveHoverHelpEnabled(on: boolean): void {
  try {
    localStorage.setItem(HOVER_HELP_KEY, on ? '1' : '0');
  } catch {
    /* ignore */
  }
}
