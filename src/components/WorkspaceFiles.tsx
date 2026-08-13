import type { ReactNode } from 'react';
import { unnamedBodyReason } from '../library/fileVocabulary';

interface Props {
  bodyName: string;
  onBodyNameChange: (name: string) => void;
  hasBody: boolean;
  hasBrain: boolean;
  disabled?: boolean;
  loadControl?: ReactNode;
  showSaveBody?: boolean;
  onSaveBody?: () => void;
  showExportBody?: boolean;
  onExportBody?: () => void;
  showImportBody?: boolean;
  onImportBody?: () => void;
  showSaveBrain?: boolean;
  onSaveBrain?: () => void;
  showSaveTrained?: boolean;
  onSaveTrained?: () => void;
  showExportTrained?: boolean;
  onExportTrained?: () => void;
  showImportTrained?: boolean;
  onImportTrained?: () => void;
  showShareTrained?: boolean;
  onShareTrained?: () => void;
  shareBusy?: boolean;
  canShare?: boolean;
}

/** Shared Name + Save/Export/Import actions for Edit and Train docks. */
export function WorkspaceFiles({
  bodyName,
  onBodyNameChange,
  hasBody,
  hasBrain,
  disabled = false,
  loadControl,
  showSaveBody,
  onSaveBody,
  showExportBody,
  onExportBody,
  showImportBody,
  onImportBody,
  showSaveBrain,
  onSaveBrain,
  showSaveTrained,
  onSaveTrained,
  showExportTrained,
  onExportTrained,
  showImportTrained,
  onImportTrained,
  showShareTrained,
  onShareTrained,
  shareBusy = false,
  canShare = false,
}: Props) {
  const unnamed = unnamedBodyReason(bodyName);
  const needName = !!unnamed;
  const bodyOk = hasBody && !disabled;
  const brainOk = hasBrain && !disabled;

  return (
    <div className="workspace-files">
      <h3 className="subhead">Files</h3>
      {loadControl}
      <label className="field-row">
        <span>Name</span>
        <input
          type="text"
          value={bodyName}
          disabled={disabled}
          onChange={(e) => onBodyNameChange(e.target.value)}
          placeholder="Body name"
          aria-label="Body name"
        />
      </label>
      {needName && (
        <p className="hint muted">{unnamed}</p>
      )}
      <div className="button-row wrap">
        {showSaveBody && (
          <button
            type="button"
            disabled={!bodyOk || needName}
            onClick={onSaveBody}
            title={needName ? unnamed ?? undefined : 'Save this body to the library'}
          >
            Save body
          </button>
        )}
        {showExportBody && (
          <button
            type="button"
            disabled={!bodyOk}
            onClick={onExportBody}
            title="Download body only (no brain)"
          >
            Export body
          </button>
        )}
        {showImportBody && (
          <button type="button" disabled={disabled} onClick={onImportBody}>
            Import body
          </button>
        )}
        {showSaveBrain && (
          <button
            type="button"
            disabled={!brainOk || needName}
            onClick={onSaveBrain}
            title="Save weights for this body and goal"
          >
            Save brain
          </button>
        )}
        {showSaveTrained && (
          <button
            type="button"
            disabled={!brainOk || needName}
            onClick={onSaveTrained}
            title="Save body + brain + goal in the library"
          >
            Save trained
          </button>
        )}
        {showExportTrained && (
          <button
            type="button"
            disabled={!brainOk || needName}
            onClick={onExportTrained}
            title="Download body + brain + goal JSON"
          >
            Export trained
          </button>
        )}
        {showImportTrained && (
          <button type="button" disabled={disabled} onClick={onImportTrained}>
            Import trained
          </button>
        )}
        {showShareTrained && (
          <button
            type="button"
            disabled={!brainOk || !canShare || shareBusy}
            onClick={onShareTrained}
          >
            {shareBusy ? 'Sharing…' : 'Share trained'}
          </button>
        )}
      </div>
    </div>
  );
}
