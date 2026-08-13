import type { BoxingMatchResult, HeadToHeadResult, JoustMatchResult } from '../sim/simulation';
import type { CombatMode } from '../combat/types';

interface Props {
  mode: CombatMode;
  boxingRunning: boolean;
  joustingRunning: boolean;
  raceRunning: boolean;
  boxingProgress: {
    episodeT: number;
    episodeDuration: number;
    points: [number, number];
  } | null;
  joustingProgress: {
    episodeT: number;
    episodeDuration: number;
    totals: [number, number];
    phase: string;
  } | null;
  raceProgress: { episodeT: number; episodeDuration: number } | null;
  lastBoxing: BoxingMatchResult | null;
  lastJoust: JoustMatchResult | null;
  lastRace: HeadToHeadResult | null;
}

function winnerLine(winner: 0 | 1 | null, drawLabel = 'Draw'): string {
  if (winner === null) return drawLabel;
  return winner === 0 ? 'Corner A wins' : 'Corner B wins';
}

/** Sidebar scoreboard for Combat — live + last result. Match controls stay in the dock. */
export function CombatScoreboard({
  mode,
  boxingRunning,
  joustingRunning,
  raceRunning,
  boxingProgress,
  joustingProgress,
  raceProgress,
  lastBoxing,
  lastJoust,
  lastRace,
}: Props) {
  const door =
    mode === 'joust'
      ? 'Train this body in Train. Play a pass in Combat.'
      : mode === 'boxing'
        ? 'Train this body in Train. Play a match in Combat.'
        : 'Train bodies in Train. Race two trained brains here.';

  let live: string | null = null;
  if (mode === 'boxing' && boxingRunning && boxingProgress) {
    live = `${boxingProgress.episodeT.toFixed(1)} / ${boxingProgress.episodeDuration.toFixed(0)}s · A ${boxingProgress.points[0]}–${boxingProgress.points[1]} B`;
  } else if (mode === 'joust' && joustingRunning && joustingProgress) {
    live = `${joustingProgress.phase} · ${joustingProgress.episodeT.toFixed(1)}s · A ${joustingProgress.totals[0].toFixed(1)} · B ${joustingProgress.totals[1].toFixed(1)}`;
  } else if (mode === 'race' && raceRunning && raceProgress) {
    live = `${raceProgress.episodeT.toFixed(1)}s / ${raceProgress.episodeDuration.toFixed(0)}s`;
  }

  const boxingIdle = mode === 'boxing' && lastBoxing && !boxingRunning;
  const joustIdle = mode === 'joust' && lastJoust && !joustingRunning;
  const raceIdle = mode === 'race' && lastRace && !raceRunning;

  return (
    <section className="combat-scoreboard">
      <h2>Combat</h2>
      <p className="hint muted">{door}</p>
      <p className="hint muted">
        Pick corners and start from the Combat dock under the canvas.
      </p>

      {live && (
        <>
          <h3 className="subhead">Live</h3>
          <p className="hint">{live}</p>
        </>
      )}

      {boxingIdle && lastBoxing && (
        <>
          <h3 className="subhead">Last match</h3>
          <ul className="stats">
            <li>
              A {lastBoxing.score.fighters[0].points}–
              {lastBoxing.score.fighters[1].points} B ·{' '}
              {winnerLine(lastBoxing.winner)}
            </li>
            <li>
              Hits {lastBoxing.score.fighters[0].hits}–
              {lastBoxing.score.fighters[1].hits}
            </li>
          </ul>
        </>
      )}

      {joustIdle && lastJoust && (
        <>
          <h3 className="subhead">Last pass</h3>
          <ul className="stats">
            <li>
              {winnerLine(lastJoust.winner)} · {lastJoust.reason}
            </li>
            <li>
              A {lastJoust.scorecard.fighters[0].total.toFixed(1)} · B{' '}
              {lastJoust.scorecard.fighters[1].total.toFixed(1)}
            </li>
            <li>
              Hit {lastJoust.scorecard.fighters[0].hitQuality.toFixed(1)}–
              {lastJoust.scorecard.fighters[1].hitQuality.toFixed(1)}
            </li>
            <li>
              Stay up {lastJoust.scorecard.fighters[0].stayUp.toFixed(1)}–
              {lastJoust.scorecard.fighters[1].stayUp.toFixed(1)}
            </li>
            <li>
              Unhorse {lastJoust.scorecard.fighters[0].unhorse.toFixed(1)}–
              {lastJoust.scorecard.fighters[1].unhorse.toFixed(1)}
            </li>
          </ul>
        </>
      )}

      {raceIdle && lastRace && (
        <>
          <h3 className="subhead">Last race</h3>
          <ul className="stats">
            <li>
              A: {lastRace.fitness[0].toFixed(3)}
              {lastRace.fitness[0] >= lastRace.fitness[1] ? ' · winner' : ''}
            </li>
            <li>
              B: {lastRace.fitness[1].toFixed(3)}
              {lastRace.fitness[1] > lastRace.fitness[0] ? ' · winner' : ''}
            </li>
          </ul>
        </>
      )}
    </section>
  );
}
