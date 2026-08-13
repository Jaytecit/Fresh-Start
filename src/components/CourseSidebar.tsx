import {
  deleteEnvironmentPackage,
  duplicateEnvironmentPackage,
  type EnvironmentPackage,
} from "../library/environmentPackages";
import { isFeatureEnabled } from "../port/featureFlags";
import type { EnvironmentDesign } from "../env/types";
import { CollapsiblePanel } from "./CollapsiblePanel";

interface Props {
  envDesign: EnvironmentDesign;
  envPackages: EnvironmentPackage[];
  libraryOpen: boolean;
  onLibraryToggle: () => void;
  onCommitEnv: (
    env: EnvironmentDesign,
    opts?: { packageId?: string },
  ) => void;
  onClearSelection: () => void;
  onRefreshPackages: () => void;
}

/** Course mode sidebar — library of environments; tools live in the Course dock. */
export function CourseSidebar({
  envDesign,
  envPackages,
  libraryOpen,
  onLibraryToggle,
  onCommitEnv,
  onClearSelection,
  onRefreshPackages,
}: Props) {
  return (
    <div className="panel-stack">
      {isFeatureEnabled("environmentsRepo") ? (
        <>
          <section>
            <h2>Course</h2>
            <p className="hint muted">
              Place and resize on the canvas with the Course dock below.
              Name, theme, save, and export live in that dock. Pick the
              training course from the Skill / Goal / Environment strip
              above.
            </p>
            <p className="hint">
              {envDesign.name || "Untitled course"} · {envDesign.theme}
              {envDesign.obstacles.length > 0
                ? ` · ${envDesign.obstacles.length} obstacles`
                : ""}
              {envDesign.terrain ? " · terrain" : ""}
              {envDesign.tower ? " · tower" : ""}
            </p>
          </section>
          <CollapsiblePanel
            title="Environment library"
            open={libraryOpen}
            onToggle={onLibraryToggle}
          >
            <div className="button-col">
              {envPackages.map((pkg) => (
                <div key={pkg.id} className="library-row">
                  <button
                    type="button"
                    onClick={() => {
                      onCommitEnv(pkg.environment, {
                        packageId: pkg.id,
                      });
                      onClearSelection();
                    }}
                    title={
                      pkg.source === "builtin"
                        ? "Builtin flat ground"
                        : `rev ${pkg.revision}`
                    }
                  >
                    {pkg.displayName}
                    {pkg.source === "builtin" ? " ★" : ""}
                    {pkg.environment.obstacles.length > 0
                      ? ` (${pkg.environment.obstacles.length} obst)`
                      : ""}
                    {pkg.environment.terrain ? ` · terrain` : ""}
                    {pkg.environment.tower ? ` · tower` : ""}
                  </button>
                  {pkg.source !== "builtin" && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          duplicateEnvironmentPackage(pkg.id);
                          onRefreshPackages();
                        }}
                        title="Duplicate"
                      >
                        +
                      </button>
                      <button
                        type="button"
                        className="danger-ghost"
                        onClick={() => {
                          deleteEnvironmentPackage(pkg.id);
                          onRefreshPackages();
                        }}
                      >
                        ×
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          </CollapsiblePanel>
        </>
      ) : (
        <p className="hint muted">Environments disabled.</p>
      )}
    </div>
  );
}
