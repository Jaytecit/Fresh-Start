/**
 * Tab / combat scene load policy.
 * Run: npm run smoke:tab-scene
 */
import assert from 'node:assert/strict';
import { BOXOBOT } from '../src/creature/boxoBot.ts';
import { JOUSTBOT } from '../src/creature/joustBot.ts';
import { FLOPPY_CHAIN, SIMPLE_HOPPER } from '../src/creature/presets.ts';
import {
  bodyFitsSkill,
  bodyIsUnsaved,
  combatCornerLoadsIntoScene,
  defaultBodyForSkill,
  explicitLoadDenialReason,
  trainSceneBody,
  unsavedLeaveNotice,
} from '../src/library/tabScenePolicy.ts';

function main(): void {
  assert.equal(defaultBodyForSkill('boxing').name, BOXOBOT.name);
  assert.equal(defaultBodyForSkill('jousting').name, JOUSTBOT.name);
  assert.equal(defaultBodyForSkill('walking').name, FLOPPY_CHAIN.name);

  assert.equal(bodyFitsSkill(BOXOBOT, 'boxing', 'upright', 'mounted'), true);
  assert.equal(bodyFitsSkill(SIMPLE_HOPPER, 'boxing', 'upright', 'mounted'), false);
  assert.equal(bodyFitsSkill(JOUSTBOT, 'jousting', 'upright', 'mounted'), true);
  assert.equal(bodyFitsSkill(SIMPLE_HOPPER, 'jousting', 'upright', 'mounted'), false);
  assert.equal(bodyFitsSkill(SIMPLE_HOPPER, 'walking', 'upright', 'mounted'), true);
  assert.equal(
    bodyFitsSkill({ name: 'Empty', joints: [], bones: [], muscles: [] }, 'walking', 'upright', 'mounted'),
    false,
  );

  assert.equal(
    trainSceneBody(SIMPLE_HOPPER, 'boxing', 'upright', 'mounted').name,
    BOXOBOT.name,
  );
  assert.equal(
    trainSceneBody(BOXOBOT, 'boxing', 'upright', 'mounted').name,
    BOXOBOT.name,
  );
  assert.equal(
    trainSceneBody(SIMPLE_HOPPER, 'walking', 'upright', 'mounted').name,
    SIMPLE_HOPPER.name,
  );

  assert.equal(
    explicitLoadDenialReason(SIMPLE_HOPPER, 'walking', 'upright', 'mounted'),
    null,
  );
  const boxingDeny = explicitLoadDenialReason(
    SIMPLE_HOPPER,
    'boxing',
    'upright',
    'mounted',
  );
  assert.ok(boxingDeny && boxingDeny.includes('cancelled'));
  assert.equal(
    explicitLoadDenialReason(BOXOBOT, 'boxing', 'upright', 'mounted'),
    null,
  );

  assert.equal(
    combatCornerLoadsIntoScene({ kind: 'workspace' }, false),
    false,
  );
  assert.equal(
    combatCornerLoadsIntoScene({ kind: 'workspace' }, true),
    true,
  );
  assert.equal(
    combatCornerLoadsIntoScene({ kind: 'saved', modelId: 'abc' }, false),
    true,
  );
  assert.equal(
    combatCornerLoadsIntoScene({ kind: 'house', id: 'dummy' }, true),
    false,
  );
  assert.equal(
    combatCornerLoadsIntoScene({ kind: 'house', id: 'joustbot' }, true),
    false,
  );
  assert.equal(
    combatCornerLoadsIntoScene({ kind: 'house', id: 'boxobot-v2t' }, false),
    true,
  );

  assert.equal(
    unsavedLeaveNotice({
      fromTab: 'h2h',
      bodyUnsaved: true,
      brainUnsaved: true,
    }),
    null,
  );
  assert.equal(
    unsavedLeaveNotice({
      fromTab: 'edit',
      bodyUnsaved: false,
      brainUnsaved: true,
    }),
    null,
  );
  const buildNotice = unsavedLeaveNotice({
    fromTab: 'edit',
    bodyUnsaved: true,
    brainUnsaved: true,
  });
  assert.ok(buildNotice && buildNotice.includes('Build') && buildNotice.includes('unsaved body'));
  assert.ok(buildNotice && !buildNotice.includes('brain'));
  const trainNotice = unsavedLeaveNotice({
    fromTab: 'train',
    bodyUnsaved: true,
    brainUnsaved: true,
  });
  assert.ok(
    trainNotice &&
      trainNotice.includes('Train') &&
      trainNotice.includes('unsaved body') &&
      trainNotice.includes('unsaved brain'),
  );

  assert.equal(
    bodyIsUnsaved(SIMPLE_HOPPER, 'aaa', 'aaa'),
    false,
  );
  assert.equal(
    bodyIsUnsaved(SIMPLE_HOPPER, 'aaa', 'bbb'),
    true,
  );
  assert.equal(
    bodyIsUnsaved({ ...SIMPLE_HOPPER, name: 'Custom' }, 'aaa', 'aaa'),
    true,
  );
  assert.equal(
    bodyIsUnsaved({ name: 'Custom', joints: [], bones: [], muscles: [] }, 'x', 'y'),
    false,
  );

  console.log('smoke-tab-scene: ok');
}

main();
