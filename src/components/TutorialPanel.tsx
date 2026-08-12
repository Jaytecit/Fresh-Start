import { useEffect, useMemo, useState, type ReactNode } from 'react';
import tutorialMd from '../../docs/TUTORIAL.md?raw';
import type { TutorialHelpKey } from '../help/tutorialHelpContent';
import type { SandboxTabId } from './SandboxShell';

type TutorialView = 'guided' | 'quickstart';

export type TutorialJumpTarget = Extract<
  SandboxTabId,
  'edit' | 'creatures' | 'train' | 'world' | 'discoveries' | 'skill' | 'h2h'
>;

export interface TutorialJump {
  tab: TutorialJumpTarget;
  chapterId: string;
  helpKey: TutorialHelpKey;
  view: TutorialView;
}

interface Props {
  onJump: (jump: TutorialJump) => void;
  canJumpH2h?: boolean;
  canJumpDiscoveries?: boolean;
  hoverHelpEnabled: boolean;
  onHoverHelpChange: (on: boolean) => void;
  /** Restore chapter after Return from a tutorial jump. */
  resumeChapterId?: string | null;
  resumeView?: TutorialView | null;
}

interface Chapter {
  id: string;
  title: string;
  body: ReactNode;
}

function JumpButton({
  label,
  tab,
  chapterId,
  helpKey,
  view,
  onJump,
}: {
  label: string;
  tab: TutorialJumpTarget;
  chapterId: string;
  helpKey: TutorialHelpKey;
  view: TutorialView;
  onJump: (jump: TutorialJump) => void;
}) {
  return (
    <button
      type="button"
      className="tutorial-jump"
      onClick={() => onJump({ tab, chapterId, helpKey, view })}
    >
      {label}
    </button>
  );
}

/** Lightweight markdown for the quick-start doc (headings, lists, tables, bold). */
function SimpleMarkdown({ source }: { source: string }) {
  const blocks = useMemo(() => parseMarkdownBlocks(source), [source]);
  return <div className="tutorial-md">{blocks}</div>;
}

function parseMarkdownBlocks(source: string): ReactNode[] {
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const out: ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i += 1;
      continue;
    }

    if (line.startsWith('# ')) {
      out.push(<h1 key={key++}>{renderInline(line.slice(2).trim())}</h1>);
      i += 1;
      continue;
    }
    if (line.startsWith('## ')) {
      out.push(<h2 key={key++}>{renderInline(line.slice(3).trim())}</h2>);
      i += 1;
      continue;
    }

    if (line.trim().startsWith('|')) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        tableLines.push(lines[i]);
        i += 1;
      }
      const parsed = parseTable(tableLines);
      if (parsed) {
        out.push(
          <div key={key++} className="tutorial-md-table-wrap">
            <table>
              <thead>
                <tr>
                  {parsed.headers.map((h) => (
                    <th key={h}>{renderInline(h)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {parsed.rows.map((row, ri) => (
                  <tr key={ri}>
                    {row.map((cell, ci) => (
                      <td key={ci}>{renderInline(cell)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>,
        );
      }
      continue;
    }

    if (/^\d+\.\s/.test(line.trim())) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s/, ''));
        i += 1;
      }
      out.push(
        <ol key={key++}>
          {items.map((item, ii) => (
            <li key={ii}>{renderInline(item)}</li>
          ))}
        </ol>,
      );
      continue;
    }

    if (line.trim().startsWith('- ')) {
      const items: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('- ')) {
        items.push(lines[i].trim().slice(2));
        i += 1;
      }
      out.push(
        <ul key={key++}>
          {items.map((item, ii) => (
            <li key={ii}>{renderInline(item)}</li>
          ))}
        </ul>,
      );
      continue;
    }

    const para: string[] = [line];
    i += 1;
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].startsWith('#') &&
      !lines[i].trim().startsWith('|') &&
      !lines[i].trim().startsWith('- ') &&
      !/^\d+\.\s/.test(lines[i].trim())
    ) {
      para.push(lines[i]);
      i += 1;
    }
    out.push(<p key={key++}>{renderInline(para.join(' '))}</p>);
  }

  return out;
}

function parseTable(
  lines: string[],
): { headers: string[]; rows: string[][] } | null {
  if (lines.length < 2) return null;
  const split = (row: string) =>
    row
      .trim()
      .replace(/^\|/, '')
      .replace(/\|$/, '')
      .split('|')
      .map((c) => c.trim());
  const headers = split(lines[0]);
  const bodyStart = /^\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|?$/.test(lines[1])
    ? 2
    : 1;
  const rows = lines.slice(bodyStart).map(split);
  return { headers, rows };
}

function renderInline(text: string): ReactNode {
  const parts: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const token = m[0];
    if (token.startsWith('**')) {
      parts.push(<strong key={k++}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith('`')) {
      parts.push(<code key={k++}>{token.slice(1, -1)}</code>);
    } else {
      const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token);
      if (link) {
        parts.push(
          <a key={k++} href={link[2]} target="_blank" rel="noreferrer">
            {link[1]}
          </a>,
        );
      }
    }
    last = m.index + token.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.length === 1 ? parts[0] : <>{parts}</>;
}

function buildChapters(
  onJump: (jump: TutorialJump) => void,
  view: TutorialView,
  canJumpH2h: boolean,
  canJumpDiscoveries: boolean,
): Chapter[] {
  const jump = (
    label: string,
    tab: TutorialJumpTarget,
    chapterId: string,
    helpKey: TutorialHelpKey,
  ) => (
    <JumpButton
      label={label}
      tab={tab}
      chapterId={chapterId}
      helpKey={helpKey}
      view={view}
      onJump={onJump}
    />
  );

  return [
    {
      id: 'welcome',
      title: 'A note before you begin',
      body: (
        <>
          <p>
            Solemn Sandbox is meant to be a place where discovery happens by
            accident. Exploration and experimentation lead to the most creative
            end results. Being told what to do points people in a certain
            direction — and that is not what this place was designed for.
          </p>
          <p>
            This tutorial is here for those who want pointers and a starting
            point. Skip it whenever you like. Wander. Break things. Save what
            surprises you.
          </p>
          <p className="tutorial-aside">
            Prefer something shorter? Switch to{' '}
            <strong>Quick start</strong> above — that view shows the same
            content as <code>docs/TUTORIAL.md</code>.
          </p>
        </>
      ),
    },
    {
      id: 'idea',
      title: 'What this place is',
      body: (
        <>
          <p>
            You build little creatures from joints, bones, and muscles. You pick
            a challenge. Many “brains” try the course; the better ones influence
            the next round. When something works, you save it and keep playing.
          </p>
          <p>
            There is no campaign to finish and no single correct creature. The
            sandbox is the product: a serious workshop for silly experiments.
          </p>
          <ul>
            <li>
              <strong>Bodies</strong> are designs you draw or load.
            </li>
            <li>
              <strong>Brains</strong> are controllers that learn by trying many
              variations.
            </li>
            <li>
              <strong>Goals &amp; environments</strong> are the challenges you
              put those bodies into.
            </li>
          </ul>
        </>
      ),
    },
    {
      id: 'map',
      title: 'The map of the sandbox',
      body: (
        <>
          <p>
            The header tabs are rooms in the workshop. You can hop between them
            freely — nothing here locks you into a path.
          </p>
          <dl className="tutorial-map">
            <div>
              <dt>Skill</dt>
              <dd>
                Choose a skill family (walk, jump, fly, disco, and more) and see
                what that area is about.
              </dd>
            </div>
            <div>
              <dt>Creature builder</dt>
              <dd>
                Draw or load a body: joints, bones, muscles, feet, wheels,
                decorations.
              </dd>
            </div>
            <div>
              <dt>Creature Library</dt>
              <dd>
                Browse presets, your saved bodies, brains, and trophies tied to
                a design.
              </dd>
            </div>
            <div>
              <dt>Train</dt>
              <dd>
                Evolve brains, watch the pack, play the best, save a model.
              </dd>
            </div>
            <div>
              <dt>Environment builder</dt>
              <dd>
                Author practice courses — hills, obstacles, launch pads,
                markers.
              </dd>
            </div>
            {canJumpDiscoveries && (
              <div>
                <dt>Trophy room</dt>
                <dd>
                  Secret goals unlock while you experiment. Locked plaques stay
                  quiet until earned.
                </dd>
              </div>
            )}
            {canJumpH2h && (
              <div>
                <dt>H2H</dt>
                <dd>Pit two saved brains against each other on a goal.</dd>
              </div>
            )}
          </dl>
          <p>
            Above the canvas, a strip lets you pick <strong>Skill</strong>,{' '}
            <strong>Goal</strong>, and <strong>Env</strong> without leaving the
            main view.
          </p>
          <div className="tutorial-actions">
            {jump('Open Skill', 'skill', 'map', 'map-skill')}
            {jump('Open Creature builder', 'edit', 'map', 'map-edit')}
            {jump('Open Creature Library', 'creatures', 'map', 'map-creatures')}
          </div>
        </>
      ),
    },
    {
      id: 'first-loop',
      title: 'A gentle first loop',
      body: (
        <>
          <p>
            If you want a concrete starting point, this loop takes a few minutes
            and teaches the whole rhythm of the sandbox. Treat it as a
            suggestion, not homework.
          </p>
          <ol className="tutorial-steps">
            <li>
              <div>
                <strong>Confirm the starter setup.</strong> Walk, Run, Flat
                Ground, and a Floppy Chain are already loaded. Change skill on
                the strip or Skill tab if you want a different challenge.
              </div>
              {jump('Skill strip', 'skill', 'first-loop', 'first-loop-skill')}
            </li>
            <li>
              <div>
                <strong>Tweak or rebuild the body.</strong> Open the Creature
                builder — Floppy Chain is a friendly starter — or draw your own
                with the skill tips in mind.
              </div>
              {jump(
                'Creature builder',
                'edit',
                'first-loop',
                'first-loop-edit',
              )}
            </li>
            <li>
              <div>
                <strong>Evolve.</strong> Open Train and press Evolve. Ghost
                outlines are the rest of the pack trying beside the leader.
              </div>
              {jump('Train', 'train', 'first-loop', 'first-loop-train')}
            </li>
            <li>
              <div>
                <strong>Watch &amp; keep.</strong> After a few rounds, Play best
                shows the winner alone. Save model if you like it — you’ll find
                it later in the Creature Library.
              </div>
              {jump(
                'Creature Library',
                'creatures',
                'first-loop',
                'first-loop-creatures',
              )}
            </li>
          </ol>
          <p className="tutorial-aside">
            That is a full loop: body → goal → train → enjoy. Everything else in
            the sandbox is a variation on that idea.
          </p>
        </>
      ),
    },
    {
      id: 'building',
      title: 'When you draw your own',
      body: (
        <>
          <p>
            Drawing is optional on day one, but it is where the sandbox gets
            personal. A few quiet habits help bodies survive gravity long enough
            to learn:
          </p>
          <ul>
            <li>
              <strong>Triangles beat chains.</strong> Three joints with three
              bones hold shape; a long snake flops.
            </li>
            <li>
              Add at least one <strong>muscle</strong>. Mark{' '}
              <strong>feet</strong> if the goal cares about stepping.
            </li>
            <li>
              Start small. A sturdy hopper trains faster than a twenty-muscle
              masterpiece.
            </li>
            <li>
              Use <strong>Physics settle</strong> in the builder to see how the
              body rests before you train.
            </li>
            <li>
              <strong>Save current</strong> stores the body in your library;
              browse everything later under Creature Library.
            </li>
          </ul>
          <div className="tutorial-actions">
            {jump('Try the builder', 'edit', 'building', 'building-edit')}
          </div>
        </>
      ),
    },
    {
      id: 'training',
      title: 'Training without the mystery',
      body: (
        <>
          <p>
            Evolve tries many brains at once. Improvement is uneven — that is
            normal. A few pointers when you want them:
          </p>
          <ul>
            <li>
              If nothing improves, try a simpler body, a flatter env, or a
              shorter try length in Training setup.
            </li>
            <li>
              <strong>Play best</strong> is for watching;{' '}
              <strong>Keep training</strong> continues from the elite of the
              current run.
            </li>
            <li>
              Saved brains live under Creature Library. Train’s “Start from”
              can warm-start from a saved brain once you have one.
            </li>
            <li>
              Disco, flight, and wheeled goals need matching body bits (music
              routing, aero parts, wheels). Stick to Walk / Run until that feels
              natural — or ignore this advice and invent something strange.
            </li>
          </ul>
          <div className="tutorial-actions">
            {jump('Open Train', 'train', 'training', 'training-train')}
            {jump(
              'Browse saved brains',
              'creatures',
              'training',
              'training-creatures',
            )}
          </div>
        </>
      ),
    },
    {
      id: 'wander',
      title: 'Paths you might wander next',
      body: (
        <>
          <p>
            None of these are required. They are invitations when you feel stuck
            for ideas:
          </p>
          <ul>
            <li>Train the same walker on rough or obstacle courses.</li>
            <li>Build a hopper, switch Goal to Jump, and chase height.</li>
            <li>
              Open Environment builder, drop a few boxes, save the env, then
              train against it.
            </li>
            <li>
              Load Disco, pick a track, and mess with band → muscle routing
              (chaos is allowed).
            </li>
            <li>
              Leave Train running while you check the Trophy room — secrets
              unlock as you experiment.
            </li>
            {canJumpH2h && (
              <li>Save two models and try Head-to-Head.</li>
            )}
            <li>
              Mark gloves / targets and spar in Boxing, or a lance and charge
              in Jousting.
            </li>
          </ul>
          <div className="tutorial-actions">
            {jump(
              'Environment builder',
              'world',
              'wander',
              'wander-world',
            )}
            {canJumpDiscoveries &&
              jump(
                'Trophy room',
                'discoveries',
                'wander',
                'wander-discoveries',
              )}
            {canJumpH2h &&
              jump('Head-to-Head', 'h2h', 'wander', 'wander-h2h')}
          </div>
        </>
      ),
    },
    {
      id: 'advanced',
      title: 'Advanced — fine-tuning training',
      body: (
        <>
          <p>
            Everything here is optional — Evolve works fine on defaults. But
            when you want to steer a run instead of just watching it, these are
            the dials.
          </p>
          <h3>Training setup</h3>
          <ul>
            <li>
              <strong>Recipe</strong> presets sensible knob combinations; the
              rows below let you override each one.
            </li>
            <li>
              <strong>How many try</strong> is the whole population each round;{' '}
              <strong>How many you watch</strong> is only the on-screen pack —
              learning always uses everyone.
            </li>
            <li>
              <strong>Try length</strong> sets simulated seconds per attempt.
              Short tries iterate faster; long tries reward endurance.
            </li>
            <li>
              <strong>Mutation style</strong>: careful makes small tweaks, wild
              makes big leaps — useful when progress stalls.
            </li>
            <li>
              <strong>Start from</strong> warm-starts a run from this run’s
              best or a saved brain instead of random weights.
            </li>
            <li>
              <strong>Keep the champions</strong> copies the top scorers into
              the next round unchanged; <strong>who gets to breed</strong>{' '}
              trades exploiting the best against keeping variety.
            </li>
            <li>
              <strong>Schedules</strong>: settle down over time (mutations
              shrink), short tries first, stop a try after a fall, and mix two
              parents (crossover).
            </li>
          </ul>
          <h3>Priorities &amp; staged goals</h3>
          <ul>
            <li>
              <strong>Priorities</strong> sliders tilt the score mix — not the
              physics. Only sliders that actually affect the selected goal are
              shown (flight goals hide “Stay upright”; posture goals hide
              “Distance”).
            </li>
            <li>
              <strong>Train in stages</strong> walks Stay tall → Run → Sprint
              automatically as fitness clears each step.
            </li>
            <li>
              <strong>Train course stages</strong> (on envs with a course)
              starts with a short window and moves the finish out each clear.
            </li>
          </ul>
          <h3>More training options</h3>
          <ul>
            <li>
              <strong>Raycast whiskers</strong> add range sensors to the
              brain’s inputs — helpful on obstacle courses, but the input size
              changes, so evolve fresh.
            </li>
            <li>
              <strong>Race your record</strong> keeps your prior best on screen
              as a ghost; <strong>messy bodies</strong> jitters mass and length
              each try so brains stop overfitting one exact body.
            </li>
            <li>
              <strong>Evolve body traits</strong> lets limb mass, length, aero,
              and wheels evolve with the brain; <strong>evolve structure</strong>{' '}
              goes further and grows or prunes segments.
            </li>
            <li>
              <strong>Training log</strong> records each generation’s champion
              and patterns, downloadable as JSON when the run ends.
            </li>
          </ul>
          <h3>Reading the run</h3>
          <ul>
            <li>
              <strong>Rewards</strong> breaks the current best score into its
              terms — distance, air time, upright, zone bonuses — so you can
              see what the goal actually pays for.
            </li>
            <li>
              <strong>Stats</strong> and the <strong>network visualizer</strong>{' '}
              show fitness history and the live brain; performance diagnostics
              help when the sim chugs.
            </li>
          </ul>
          <h3>Scoring the course itself</h3>
          <p>
            The Environment builder has scoring tools beyond terrain: penalty
            zones (lose points per second inside), reward zones (touch-once
            bonus), start / checkpoint / finish markers for timed sprints, and
            launch pads + landing zones for flight goals.
          </p>
          <div className="tutorial-actions">
            {jump('Open Train', 'train', 'advanced', 'advanced-train')}
            {jump(
              'Environment builder',
              'world',
              'advanced',
              'advanced-world',
            )}
          </div>
        </>
      ),
    },
    {
      id: 'stuck',
      title: 'If something feels stuck',
      body: (
        <>
          <ul>
            <li>
              <strong>Empty design?</strong> Load a preset or place joints in
              the builder first.
            </li>
            <li>
              <strong>Evolve greyed out?</strong> The body needs muscles (or
              wheels) before training can start.
            </li>
            <li>
              <strong>Creature pancakes?</strong> Add cross-bracing — triangles
              or solid struts.
            </li>
            <li>
              <strong>Lost your best brain?</strong> Check Creature Library →
              Saved brains, or Save model after a good run.
            </li>
          </ul>
          <p>
            When you are ready, close this room and follow whatever curiosity
            shows up. The best experiments are usually the ones nobody wrote
            down for you.
          </p>
          <div className="tutorial-actions">
            {jump('Back to the builder', 'edit', 'stuck', 'stuck-edit')}
            {jump('Go train', 'train', 'stuck', 'stuck-train')}
          </div>
        </>
      ),
    },
  ];
}

/** Full-bleed tutorial room — guided chapters + TUTORIAL.md quick start. */
export function TutorialPanel({
  onJump,
  canJumpH2h = false,
  canJumpDiscoveries = false,
  hoverHelpEnabled,
  onHoverHelpChange,
  resumeChapterId,
  resumeView,
}: Props) {
  const [view, setView] = useState<TutorialView>('guided');
  const [chapterIndex, setChapterIndex] = useState(0);

  const chapters = useMemo(
    () => buildChapters(onJump, view, canJumpH2h, canJumpDiscoveries),
    [onJump, view, canJumpH2h, canJumpDiscoveries],
  );

  useEffect(() => {
    if (resumeView) setView(resumeView);
  }, [resumeView]);

  useEffect(() => {
    if (!resumeChapterId) return;
    const idx = chapters.findIndex((c) => c.id === resumeChapterId);
    if (idx >= 0) setChapterIndex(idx);
  }, [resumeChapterId, chapters]);

  const chapter = chapters[chapterIndex] ?? chapters[0];
  const atStart = chapterIndex <= 0;
  const atEnd = chapterIndex >= chapters.length - 1;

  return (
    <div className="tutorial-room">
      <div className="tutorial-room-atmosphere" aria-hidden />

      <header className="tutorial-room-header">
        <div className="tutorial-room-brand">
          <p className="tutorial-room-eyebrow">Solemn Sandbox</p>
          <h1>Tutorial</h1>
          <p className="tutorial-room-lede">
            Optional pointers for first-time visitors. Discovery by accident is
            still the preferred mode.
          </p>
        </div>

        <div className="tutorial-header-controls">
          <label className="tutorial-hover-toggle">
            <input
              type="checkbox"
              checked={hoverHelpEnabled}
              onChange={(e) => onHoverHelpChange(e.target.checked)}
            />
            <span>
              Hover help
              <span className="hint muted">
                {' '}
                — deeper tips when you point at controls
              </span>
            </span>
          </label>

          <div
            className="tutorial-view-toggle"
            role="tablist"
            aria-label="Tutorial format"
          >
            <button
              type="button"
              role="tab"
              aria-selected={view === 'guided'}
              className={view === 'guided' ? 'active' : undefined}
              onClick={() => setView('guided')}
            >
              Full tutorial
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={view === 'quickstart'}
              className={view === 'quickstart' ? 'active' : undefined}
              onClick={() => setView('quickstart')}
            >
              Quick start
            </button>
          </div>
        </div>
      </header>

      {view === 'quickstart' ? (
        <div className="tutorial-quickstart">
          <p className="tutorial-aside tutorial-quickstart-note">
            This is the short starter guide from <code>docs/TUTORIAL.md</code> —
            enough to get moving, not a full manual.
          </p>
          <SimpleMarkdown source={tutorialMd} />
          <div className="tutorial-actions">
            {jumpQuick('Open Creature builder', 'edit', onJump)}
            {jumpQuick('Open Train', 'train', onJump)}
            <button
              type="button"
              className="tutorial-jump tutorial-jump-secondary"
              onClick={() => setView('guided')}
            >
              Switch to full tutorial
            </button>
          </div>
        </div>
      ) : (
        <div className="tutorial-guided">
          <nav className="tutorial-chapter-nav" aria-label="Tutorial chapters">
            {chapters.map((c, i) => (
              <button
                key={c.id}
                type="button"
                className={
                  i === chapterIndex
                    ? 'tutorial-chapter-btn active'
                    : 'tutorial-chapter-btn'
                }
                onClick={() => setChapterIndex(i)}
              >
                <span className="tutorial-chapter-num">{i + 1}</span>
                <span className="tutorial-chapter-title">{c.title}</span>
              </button>
            ))}
          </nav>

          <article
            className="tutorial-chapter"
            aria-labelledby={`tutorial-chapter-${chapter.id}`}
          >
            <p className="tutorial-chapter-progress">
              Chapter {chapterIndex + 1} of {chapters.length}
            </p>
            <h2 id={`tutorial-chapter-${chapter.id}`}>{chapter.title}</h2>
            <div className="tutorial-chapter-body">{chapter.body}</div>

            <div className="tutorial-pager">
              <button
                type="button"
                disabled={atStart}
                onClick={() => setChapterIndex((i) => Math.max(0, i - 1))}
              >
                ← Previous
              </button>
              <button
                type="button"
                disabled={atEnd}
                onClick={() =>
                  setChapterIndex((i) => Math.min(chapters.length - 1, i + 1))
                }
              >
                Next →
              </button>
            </div>
          </article>
        </div>
      )}
    </div>
  );
}

function jumpQuick(
  label: string,
  tab: TutorialJumpTarget,
  onJump: (jump: TutorialJump) => void,
) {
  return (
    <JumpButton
      label={label}
      tab={tab}
      chapterId="welcome"
      helpKey={tab === 'train' ? 'first-loop-train' : 'first-loop-edit'}
      view="quickstart"
      onJump={onJump}
    />
  );
}
