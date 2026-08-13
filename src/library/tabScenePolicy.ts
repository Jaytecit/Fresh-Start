/**
 * Viewport load rules for tab switches vs explicit picks.
 *
 * Tab switches never surface invalid-body errors. Combat stays empty until a
 * trained corner is chosen. Explicit loads of an invalid body are denied.
 */
import { boxingEligibility, type BoxingDivisionId } from '../boxing/divisions';
import type { CombatCornerValue } from '../combat/types';
import type { SandboxTabId } from '../components/SandboxShell';
import { BOXOBOT } from '../creature/boxoBot';
import { JOUSTBOT } from '../creature/joustBot';
import { FLOPPY_CHAIN } from '../creature/presets';
import type { CreatureDesign } from '../creature/types';
import { ULTI_GROOVE_BOT_II } from '../creature/ultiGrooveBotII';
import { joustingEligibility, type JoustingDivisionId } from '../jousting/eligibility';
import { isUnnamedBody } from './fileVocabulary';
import type { SkillId } from '../skills/skills';

export function defaultBodyForSkill(skill: SkillId): CreatureDesign {
  if (skill === 'boxing') return BOXOBOT;
  if (skill === 'jousting') return JOUSTBOT;
  if (skill === 'disco') return ULTI_GROOVE_BOT_II;
  return FLOPPY_CHAIN;
}

export function bodyFitsSkill(
  design: CreatureDesign,
  skill: SkillId,
  boxingDivisionId: BoxingDivisionId,
  joustingDivisionId: JoustingDivisionId,
): boolean {
  if (design.joints.length === 0) return false;
  if (skill === 'boxing') {
    return boxingEligibility(design, boxingDivisionId).eligible;
  }
  if (skill === 'jousting') {
    return joustingEligibility(design, joustingDivisionId).eligible;
  }
  return true;
}

/** Body to spawn in Train after a tab/skill switch (clone before loading). */
export function trainSceneBody(
  workspace: CreatureDesign,
  skill: SkillId,
  boxingDivisionId: BoxingDivisionId,
  joustingDivisionId: JoustingDivisionId,
): CreatureDesign {
  if (bodyFitsSkill(workspace, skill, boxingDivisionId, joustingDivisionId)) {
    return workspace;
  }
  return defaultBodyForSkill(skill);
}

export function explicitLoadDenialReason(
  design: CreatureDesign,
  skill: SkillId,
  boxingDivisionId: BoxingDivisionId,
  joustingDivisionId: JoustingDivisionId,
): string | null {
  if (bodyFitsSkill(design, skill, boxingDivisionId, joustingDivisionId)) {
    return null;
  }
  if (design.joints.length === 0) {
    return 'That file has no body — load was cancelled.';
  }
  if (skill === 'boxing') {
    const result = boxingEligibility(design, boxingDivisionId);
    return `That body is not valid for Boxing (${boxingDivisionId}): ${result.reasons.join(' ')} Load was cancelled.`;
  }
  if (skill === 'jousting') {
    const result = joustingEligibility(design, joustingDivisionId);
    return `That body is not valid for Jousting (${joustingDivisionId}): ${result.reasons.join(' ')} Load was cancelled.`;
  }
  return 'That body is not valid for the current skill — load was cancelled.';
}

/**
 * Combat previews only trained picks. House dummy / JoustBot are match
 * opponents, not a default scene body.
 */
export function combatCornerLoadsIntoScene(
  corner: CombatCornerValue,
  workspaceReady: boolean,
): boolean {
  if (corner.kind === 'workspace') return workspaceReady;
  if (corner.kind === 'saved') return true;
  return corner.id === 'boxobot-v2t';
}

export function bodyIsUnsaved(
  design: CreatureDesign,
  baselineFingerprint: string,
  fingerprint: string,
): boolean {
  if (design.joints.length === 0) return false;
  if (isUnnamedBody(design.name)) return true;
  return fingerprint !== baselineFingerprint;
}

export function unsavedLeaveNotice(opts: {
  fromTab: SandboxTabId;
  bodyUnsaved: boolean;
  brainUnsaved: boolean;
}): string | null {
  if (opts.fromTab !== 'edit' && opts.fromTab !== 'train') return null;
  const bits: string[] = [];
  if (opts.bodyUnsaved) bits.push('an unsaved body');
  if (opts.fromTab === 'train' && opts.brainUnsaved) {
    bits.push('an unsaved brain');
  }
  if (bits.length === 0) return null;
  const tab = opts.fromTab === 'edit' ? 'Build' : 'Train';
  return `Leaving ${tab} with ${bits.join(' and ')}. Save it from the Library or Train dock if you want to keep it.`;
}
