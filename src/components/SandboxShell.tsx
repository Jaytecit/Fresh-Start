import {
  useEffect,
  useRef,
  type ReactNode,
} from 'react';
import { HelpTip } from './HelpTip';

const TAB_TIPS: Partial<Record<SandboxTabId, string>> = {
  edit: 'Build — draw joints, bones, and muscles, or load a preset.',
  creatures: 'Library of bodies and trained creatures. Use body or Use trained to load one.',
  train: 'Evolve brains, watch the pack, play the best, and save trained creatures.',
  world: 'Course — author practice grounds, obstacles, and markers.',
  h2h: 'Combat — race, boxing, or joust. Pick corners in the dock under the canvas.',
  discoveries: 'Trophies — secret goals unlocked while experimenting.',
  tutorial: 'Tutorial — optional pointers and a quick start.',
};

export type SandboxTabId =
  | 'skill'
  | 'edit'
  | 'creatures'
  | 'train'
  | 'world'
  | 'h2h'
  | 'discoveries'
  | 'tutorial';

export interface SandboxTab {
  id: SandboxTabId;
  label: string;
  content: ReactNode;
  /** Hover tip; falls back to the built-in tip for this tab id. */
  tip?: string;
}

interface Props {
  tabs: SandboxTab[];
  activeTab: SandboxTabId;
  onActiveTabChange: (id: SandboxTabId) => void;
  viewport: ReactNode;
  /** Full-width band above sidebar + viewport (Skill / Goal / Environment). */
  contextStrip?: ReactNode | null;
  /** Bottom chrome overlaid under the ground band (Train or Course). */
  dock?: ReactNode | null;
  /** Label in the dock bar (default Train). */
  dockLabel?: string;
  dockCollapsed: boolean;
  onDockCollapsedChange: (collapsed: boolean) => void;
  /** Reports dock height in CSS px for camera bottom inset. */
  onDockHeightChange?: (heightPx: number) => void;
  /**
   * When true, tab buttons are rendered elsewhere (e.g. topbar).
   * Sidebar still shows the active panel body.
   */
  hideTabRail?: boolean;
  /** Full-bleed modes (e.g. Trophy Room) — no side menu panel. */
  hideSidebar?: boolean;
}

/** Header tab rail — place between brand and immersive toggle. */
export function SandboxTabRail({
  tabs,
  activeTab,
  onActiveTabChange,
}: {
  tabs: SandboxTab[];
  activeTab: SandboxTabId;
  onActiveTabChange: (id: SandboxTabId) => void;
}) {
  return (
    <div className="topbar-tabs" role="tablist" aria-label="Sandbox panels">
      {tabs.map((tab) => {
        const classes = [
          tab.id === activeTab ? 'active' : '',
          tab.id === 'tutorial' ? 'topbar-tab-tutorial' : '',
          tab.label === 'Disco' ? 'topbar-tab-disco' : '',
        ]
          .filter(Boolean)
          .join(' ');
        const tip = tab.tip ?? TAB_TIPS[tab.id];
        const btn = (
          <button
            type="button"
            role="tab"
            aria-selected={tab.id === activeTab}
            className={classes || undefined}
            onClick={() => onActiveTabChange(tab.id)}
          >
            {tab.label}
          </button>
        );
        return tip ? (
          <HelpTip key={tab.id} tip={tip}>
            {btn}
          </HelpTip>
        ) : (
          <span key={tab.id}>{btn}</span>
        );
      })}
    </div>
  );
}

/** B3 — left panel + optional bottom dock over the viewport. */
export function SandboxShell({
  tabs,
  activeTab,
  onActiveTabChange,
  viewport,
  contextStrip,
  dock,
  dockLabel = 'Train',
  dockCollapsed,
  onDockCollapsedChange,
  onDockHeightChange,
  hideTabRail = false,
  hideSidebar = false,
}: Props) {
  const dockRef = useRef<HTMLDivElement>(null);
  const showDock = dock != null && !hideSidebar;
  const showStrip = !hideSidebar && contextStrip != null;

  useEffect(() => {
    if (!showDock) {
      onDockHeightChange?.(0);
      return;
    }
    const el = dockRef.current;
    if (!el) return;

    const report = () => {
      onDockHeightChange?.(el.getBoundingClientRect().height);
    };
    report();
    const ro = new ResizeObserver(report);
    ro.observe(el);
    return () => ro.disconnect();
  }, [showDock, dockCollapsed, onDockHeightChange]);

  // Re-measure when dock body content swaps (summary ↔ full) without tearing down RO.
  useEffect(() => {
    if (!showDock || !dockRef.current) return;
    onDockHeightChange?.(dockRef.current.getBoundingClientRect().height);
  }, [dock, showDock, onDockHeightChange]);

  const active = tabs.find((t) => t.id === activeTab) ?? tabs[0];

  return (
    <div
      className={
        hideSidebar
          ? 'main sandbox-shell sandbox-shell-fullbleed'
          : 'main sandbox-shell'
      }
    >
      {showStrip && contextStrip}

      <div
        className={
          hideSidebar
            ? 'sandbox-shell-body sandbox-shell-body-fullbleed'
            : 'sandbox-shell-body'
        }
      >
        {!hideSidebar && (
          <aside className="sandbox-sidebar">
            {!hideTabRail && (
              <div className="tab-rail" role="tablist" aria-label="Sandbox panels">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={tab.id === active?.id}
                    className={tab.id === active?.id ? 'active' : ''}
                    onClick={() => onActiveTabChange(tab.id)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            )}
            <div
              className="tab-panel"
              role="tabpanel"
              aria-label={active?.label ?? 'Panel'}
            >
              {active?.content}
            </div>
          </aside>
        )}

        <div className={hideSidebar ? 'viewport viewport-fullbleed' : 'viewport'}>
          {viewport}
          {showDock && (
            <div
              ref={dockRef}
              className={
                dockCollapsed ? 'bottom-dock bottom-dock-collapsed' : 'bottom-dock'
              }
            >
              <div className="bottom-dock-bar">
                <span className="bottom-dock-label">{dockLabel}</span>
                <button
                  type="button"
                  className="bottom-dock-toggle"
                  aria-expanded={!dockCollapsed}
                  onClick={() => onDockCollapsedChange(!dockCollapsed)}
                >
                  {dockCollapsed ? 'Expand ▴' : 'Collapse ▾'}
                </button>
              </div>
              <div className="bottom-dock-body">{dock}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
