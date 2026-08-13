import { isUnnamedBody } from '../library/fileVocabulary';

export type BrainStatus =
  | { kind: 'none' }
  | { kind: 'session'; goalTitle: string }
  | { kind: 'saved'; label: string }
  | { kind: 'mismatch' };

interface Props {
  bodyName: string;
  brain: BrainStatus;
  bound: boolean;
  /** Compact “Workspace: Body / Brain / Bound” for full-bleed rooms. */
  compact?: boolean;
}

/** Always-visible Body / Brain / Bound chip. */
export function WorkspaceStatus({ bodyName, brain, bound, compact }: Props) {
  const bodyLabel = isUnnamedBody(bodyName)
    ? 'unnamed'
    : bodyName.trim() || 'unnamed';
  let brainLabel = 'none';
  if (brain.kind === 'session') brainLabel = `${brain.goalTitle} session (unsaved)`;
  else if (brain.kind === 'saved') brainLabel = brain.label;
  else if (brain.kind === 'mismatch') brainLabel = 'mismatch (won’t run)';

  return (
    <p
      className={
        compact ? 'workspace-status workspace-status-compact' : 'workspace-status'
      }
      aria-label="Workspace files"
      title="The brain fits this body’s muscles and sensors when Bound is yes."
    >
      {compact && <span className="workspace-status-prefix">Workspace: </span>}
      <span>
        Body: <strong>{bodyLabel}</strong>
      </span>
      <span className="workspace-status-sep">·</span>
      <span>
        Brain: <strong>{brainLabel}</strong>
      </span>
      <span className="workspace-status-sep">·</span>
      <span>
        Bound: <strong>{bound ? 'yes' : 'no'}</strong>
      </span>
    </p>
  );
}
