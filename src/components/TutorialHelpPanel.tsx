import { useState } from 'react';
import { getTutorialHelp } from '../help/tutorialHelpContent';

interface Props {
  helpKey: string;
  onReturn: () => void;
  onExit: () => void;
}

/** Left viewport overlay — contextual help after a Tutorial jump. */
export function TutorialHelpPanel({ helpKey, onReturn, onExit }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const content = getTutorialHelp(helpKey);

  if (!content) return null;

  if (collapsed) {
    return (
      <aside className="tutorial-help-panel tutorial-help-panel-collapsed">
        <button
          type="button"
          className="tutorial-help-expand"
          aria-expanded={false}
          onClick={() => setCollapsed(false)}
          title="Expand tutorial help"
        >
          ▸ Help
        </button>
      </aside>
    );
  }

  return (
    <aside className="tutorial-help-panel" aria-label="Tutorial help">
      <div className="tutorial-help-bar">
        <span className="tutorial-help-eyebrow">From tutorial</span>
        <div className="tutorial-help-bar-actions">
          <button
            type="button"
            aria-expanded
            onClick={() => setCollapsed(true)}
            title="Collapse"
          >
            ▾
          </button>
          <button type="button" onClick={onExit} title="Dismiss help">
            ✕
          </button>
        </div>
      </div>
      <h2>{content.title}</h2>
      {content.body.map((p) => (
        <p key={p}>{p}</p>
      ))}
      <div className="tutorial-help-actions">
        <button type="button" className="tutorial-help-return" onClick={onReturn}>
          ← Return to tutorial
        </button>
      </div>
    </aside>
  );
}
