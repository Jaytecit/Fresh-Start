import { useEffect, useRef, useState } from 'react';

export interface ShareDialogProps {
  open: boolean;
  url: string;
  busy?: boolean;
  error?: string | null;
  onClose: () => void;
}

export function ShareDialog({
  open,
  url,
  busy = false,
  error = null,
  onClose,
}: ShareDialogProps) {
  const [copied, setCopied] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      setCopied(false);
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const copy = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      // Fallback for older browsers / denied clipboard.
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
    <div className="share-dialog-backdrop" role="presentation" onClick={onClose}>
      <div
        ref={dialogRef}
        className="share-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-dialog-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="share-dialog-title">Share Creature</h2>
        {busy ? (
          <p className="hint">Creating share link…</p>
        ) : error ? (
          <p className="share-dialog-error">{error}</p>
        ) : (
          <>
            <p className="hint">Your creature is ready to share.</p>
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
        {busy || error ? (
          <div className="button-row" style={{ marginTop: '0.75rem' }}>
            <button type="button" onClick={onClose} disabled={busy}>
              Close
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
