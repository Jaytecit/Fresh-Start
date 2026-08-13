import { useEffect, useRef, useState } from 'react';
import { isFeatureEnabled } from '../port/featureFlags';

export type ShareDialogPhase = 'confirm' | 'busy' | 'done' | 'error';

export interface ShareDialogProps {
  open: boolean;
  phase: ShareDialogPhase;
  url: string;
  error?: string | null;
  listed?: boolean;
  onClose: () => void;
  /** Called when the user confirms share creation (with opt-in listing). */
  onConfirm: (opts: { listPublic: boolean }) => void;
}

export function ShareDialog({
  open,
  phase,
  url,
  error = null,
  listed = false,
  onClose,
  onConfirm,
}: ShareDialogProps) {
  const [copied, setCopied] = useState(false);
  const [listPublic, setListPublic] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const showPublicOptIn = isFeatureEnabled('publicCreationsLibrary');

  useEffect(() => {
    if (!open) {
      setCopied(false);
      setListPublic(false);
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && phase !== 'busy') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose, phase]);

  if (!open) return null;

  const copy = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      const input = dialogRef.current?.querySelector('input');
      input?.select();
      try {
        document.execCommand('copy');
        setCopied(true);
      } catch {
        setCopied(false);
      }
    }
  };

  return (
    <div className="share-dialog-backdrop" role="presentation" onClick={() => {
      if (phase !== 'busy') onClose();
    }}>
      <div
        ref={dialogRef}
        className="share-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-dialog-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="share-dialog-title">Share Creature</h2>

        {phase === 'confirm' && (
          <>
            <p className="hint">
              Create a public link to this trained creature. Anyone with the
              link can open it.
            </p>
            {showPublicOptIn && (
              <label className="share-dialog-optin">
                <input
                  type="checkbox"
                  checked={listPublic}
                  onChange={(e) => setListPublic(e.target.checked)}
                />
                <span>
                  Also list in Public creations
                  <span className="hint muted">
                    {' '}
                    — discoverable in the Library
                  </span>
                </span>
              </label>
            )}
            <div className="button-row wrap" style={{ marginTop: '0.85rem' }}>
              <button
                type="button"
                className="primary"
                onClick={() => onConfirm({ listPublic })}
              >
                Create link
              </button>
              <button type="button" onClick={onClose}>
                Cancel
              </button>
            </div>
          </>
        )}

        {phase === 'busy' && <p className="hint">Creating share link…</p>}

        {phase === 'error' && (
          <>
            <p className="share-dialog-error">{error}</p>
            <div className="button-row" style={{ marginTop: '0.75rem' }}>
              <button type="button" onClick={onClose}>
                Close
              </button>
            </div>
          </>
        )}

        {phase === 'done' && (
          <>
            <p className="hint">
              Your creature is ready to share.
              {listed
                ? ' It is also listed in Public creations.'
                : ''}
            </p>
            <input
              className="share-dialog-url"
              type="text"
              readOnly
              value={url}
              onFocus={(e) => e.currentTarget.select()}
              aria-label="Share link"
            />
            <div className="button-row wrap" style={{ marginTop: '0.75rem' }}>
              <button type="button" className="primary" onClick={() => void copy()}>
                {copied ? 'Copied' : 'Copy Link'}
              </button>
              <a className="button-link" href={url} target="_blank" rel="noreferrer">
                Open Share Page
              </a>
              <button type="button" onClick={onClose}>
                Close
              </button>
            </div>
          </>
        )}

        {phase === 'busy' && (
          <div className="button-row" style={{ marginTop: '0.75rem' }}>
            <button type="button" disabled>
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
