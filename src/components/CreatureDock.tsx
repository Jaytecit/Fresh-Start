import type { ReactNode } from 'react';
import type { EditTool } from '../editor/EditorCanvas';
import { isFeatureEnabled } from '../port/featureFlags';
import { HelpTip } from './HelpTip';

const TOOLS: EditTool[] = ['joint', 'bone', 'muscle', 'select'];

function toolTip(t: EditTool): string {
  if (t === 'joint') {
    return 'Place massy contact points. Mark feet or wheels on a selected joint.';
  }
  if (t === 'bone') {
    return 'Connect two joints with a bone capsule (or solid strut).';
  }
  if (t === 'muscle') {
    return 'Add an actuator between bones — needed before Evolve can run.';
  }
  if (t === 'select') {
    return 'Select and drag parts. Multi-select with modifiers.';
  }
  return 'Pin joints to draw a cosmetic cloth covering.';
}

interface Props {
  tool: EditTool;
  onToolChange: (tool: EditTool) => void;
  editPhysics: boolean;
  collapsed?: boolean;
  /** Tool-specific extras (cloth draw, solid strut) + hint + undo/clear. */
  toolsExtras?: ReactNode;
  /** Body options: snap, masses, physics settle. */
  options?: ReactNode;
  /** Selection / part inspectors. */
  inspector?: ReactNode;
}

/** Creature builder bottom dock — three columns under the Edit canvas. */
export function CreatureDock({
  tool,
  onToolChange,
  editPhysics,
  collapsed,
  toolsExtras,
  options,
  inspector,
}: Props) {
  const tools: EditTool[] = [
    ...TOOLS,
    ...(isFeatureEnabled('cosmeticCloth') ? (['cloth'] as EditTool[]) : []),
  ];

  const toolButtons = (
    <div className="button-row wrap">
      {tools.map((t) => (
        <HelpTip key={t} tip={toolTip(t)}>
          <button
            type="button"
            className={tool === t ? 'active' : ''}
            disabled={editPhysics}
            onClick={() => onToolChange(t)}
          >
            {t === 'cloth' ? 'cloth' : t}
          </button>
        </HelpTip>
      ))}
    </div>
  );

  if (collapsed) {
    return (
      <div className="dock-summary">
        {toolButtons}
        <span className="dock-summary-stats">
          {editPhysics ? 'Physics settle' : `Tool · ${tool}`}
        </span>
      </div>
    );
  }

  return (
    <div className="dock-full creature-dock">
      <div className="creature-dock-grid">
        <div className="creature-dock-col creature-dock-tools">
          <h3 className="subhead">Tools</h3>
          {toolButtons}
          {toolsExtras}
        </div>
        <div className="creature-dock-col creature-dock-options">
          <h3 className="subhead">Body</h3>
          {options}
        </div>
        <div className="creature-dock-col creature-dock-inspect">
          <h3 className="subhead">Inspect</h3>
          {inspector ?? (
            <p className="hint muted">Select a joint, bone, or muscle.</p>
          )}
        </div>
      </div>
    </div>
  );
}
