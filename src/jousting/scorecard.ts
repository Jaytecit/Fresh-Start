import { JOUSTING_RULE_VERSION, type JoustingDivisionId } from './eligibility';
import { aftermathUpright, type JoustPassState } from './pass';
import {
  meanHitAccuracy,
  meanHitPower,
  type JoustFighterHits,
  type JoustHitEvent,
  type JoustOwner,
} from './scoring';

export interface JoustFighterCard {
  hitQuality: number;
  stayUp: number;
  unhorse: number;
  knockback: number;
  commit: number;
  total: number;
}

export interface JoustScorecard {
  divisionId: JoustingDivisionId;
  ruleVersion: 1;
  fighters: [JoustFighterCard, JoustFighterCard];
  hits: [JoustFighterHits, JoustFighterHits];
  events: JoustHitEvent[];
  pass: JoustPassState;
}

/** Train-tab priority tilt (score mix only; no physics). */
export interface JoustingPriorities {
  hit: number;
  stayUp: number;
  unhorse: number;
  knockback: number;
  commit: number;
}

export type JoustingPriorityKey = keyof JoustingPriorities;

export const DEFAULT_JOUSTING_PRIORITIES: JoustingPriorities = {
  hit: 0.5,
  stayUp: 0.5,
  unhorse: 0.5,
  knockback: 0.5,
  commit: 0.5,
};

export const JOUSTING_PRIORITY_LABELS: Record<JoustingPriorityKey, string> = {
  hit: 'Hit',
  stayUp: 'Stay up',
  unhorse: 'Unhorse',
  knockback: 'Knockback',
  commit: 'Commit',
};

export const JOUSTING_PRIORITY_KEYS: readonly JoustingPriorityKey[] = [
  'hit',
  'stayUp',
  'unhorse',
  'knockback',
  'commit',
] as const;

export function joustPriorityScale(priority: number): number {
  const p = Math.min(1, Math.max(0, priority));
  return 0.25 + 1.5 * p;
}

export function emptyJoustFighterCard(): JoustFighterCard {
  return {
    hitQuality: 0,
    stayUp: 0,
    unhorse: 0,
    knockback: 0,
    commit: 0,
    total: 0,
  };
}

export function addJoustFighterCards(
  a: JoustFighterCard,
  b: JoustFighterCard,
): JoustFighterCard {
  return {
    hitQuality: a.hitQuality + b.hitQuality,
    stayUp: a.stayUp + b.stayUp,
    unhorse: a.unhorse + b.unhorse,
    knockback: a.knockback + b.knockback,
    commit: a.commit + b.commit,
    total: a.total + b.total,
  };
}

export function createJoustScorecard(
  pass: JoustPassState,
  divisionId: JoustingDivisionId = 'mounted',
): JoustScorecard {
  return {
    divisionId,
    ruleVersion: JOUSTING_RULE_VERSION,
    fighters: [emptyJoustFighterCard(), emptyJoustFighterCard()],
    hits: [
      {
        attempts: 0,
        hits: 0,
        totalPower: 0,
        peakPower: 0,
        totalAccuracy: 0,
        hitPoints: 0,
      },
      {
        attempts: 0,
        hits: 0,
        totalPower: 0,
        peakPower: 0,
        totalAccuracy: 0,
        hitPoints: 0,
      },
    ],
    events: [],
    pass,
  };
}

function fighterCard(
  owner: JoustOwner,
  hits: JoustFighterHits,
  pass: JoustPassState,
  priorities: JoustingPriorities,
): JoustFighterCard {
  const rival = owner === 0 ? 1 : 0;
  const sh = joustPriorityScale(priorities.hit);
  const ss = joustPriorityScale(priorities.stayUp);
  const su = joustPriorityScale(priorities.unhorse);
  const sk = joustPriorityScale(priorities.knockback);
  const sc = joustPriorityScale(priorities.commit);

  const ownUpright = aftermathUpright(pass, owner);
  const rivalUpright = aftermathUpright(pass, rival);
  const hitQuality =
    (hits.hitPoints * 1.4 +
      hits.hits * 1.2 +
      meanHitAccuracy(hits) * 4 +
      Math.min(24, meanHitPower(hits)) * 0.15) *
    sh;
  const stayUp = ownUpright * 10 * ss;
  const unhorse =
    ((1 - rivalUpright) * 8 + (pass.knockdown[rival] ? 6 : 0)) * su;
  const knockback = Math.min(16, Math.max(0, pass.peakKnockback[owner])) * 0.7 * sk;

  let commit = 0;
  if (hits.hits === 0) {
    commit = Math.max(0, pass.closingAtClosest) * 0.35 * sc;
    if (!pass.approached || pass.minComDist > 22) {
      commit -= 8 * sc;
    }
  } else {
    commit = 2 * sc;
  }
  if (pass.clashReason === 'timeout' && hits.hits === 0) {
    commit -= 4 * sc;
  }

  const total = hitQuality + stayUp + unhorse + knockback + commit;
  return { hitQuality, stayUp, unhorse, knockback, commit, total };
}

export function freezeJoustScorecard(
  card: JoustScorecard,
  priorities: JoustingPriorities = DEFAULT_JOUSTING_PRIORITIES,
): JoustScorecard {
  card.fighters[0] = fighterCard(0, card.hits[0], card.pass, priorities);
  card.fighters[1] = fighterCard(1, card.hits[1], card.pass, priorities);
  return card;
}

export function joustWinner(
  card: JoustScorecard,
): JoustOwner | null {
  const a = card.fighters[0].total;
  const b = card.fighters[1].total;
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  if (a === b) return null;
  return a > b ? 0 : 1;
}

export interface JoustFitnessBreakdown {
  hitQuality: number;
  stayUp: number;
  unhorse: number;
  knockback: number;
  commit: number;
  winBonus: number;
  conceded: number;
  collapse: number;
  fitness: number;
}

export function computeJoustingFitness(
  card: JoustScorecard,
  winner: JoustOwner | null,
  priorities: JoustingPriorities = DEFAULT_JOUSTING_PRIORITIES,
): JoustFitnessBreakdown {
  const own = card.fighters[0];
  const rival = card.fighters[1];
  const ss = joustPriorityScale(priorities.stayUp);
  const sh = joustPriorityScale(priorities.hit);
  const ownUpright = aftermathUpright(card.pass, 0);
  const winBonus = (winner === 0 ? 8 : 0) * sh;
  const conceded = rival.hitQuality * 0.35;
  const collapse = ownUpright < 0.4 ? (0.4 - ownUpright) * 18 * ss : 0;
  const fitness =
    own.total + winBonus - conceded - collapse;
  return {
    hitQuality: own.hitQuality,
    stayUp: own.stayUp,
    unhorse: own.unhorse,
    knockback: own.knockback,
    commit: own.commit,
    winBonus,
    conceded,
    collapse,
    fitness,
  };
}
