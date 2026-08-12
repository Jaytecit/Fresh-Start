/**
 * Skill-category auto-place + valid moves.
 * Run: npm run smoke:skill-categories
 */
import {
  CHUTE_DROPPER,
  MOTOR_CART,
  SIMPLE_FLAPPER,
  SIMPLE_GLIDER,
  SIMPLE_HOPPER,
} from '../src/creature/presets.ts';
import { BOXOBOT } from '../src/creature/boxoBot.ts';
import { JOUSTBOT } from '../src/creature/joustBot.ts';
import { ULTI_GROOVE_BOT_II } from '../src/creature/ultiGrooveBotII.ts';
import { cloneDesign } from '../src/creature/types.ts';
import {
  inferSkillPlacement,
  isValidSkillPlacement,
  placementKey,
  resolveSkillPlacement,
} from '../src/library/skillCategories.ts';

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

function main(): void {
  const hopper = inferSkillPlacement(SIMPLE_HOPPER);
  assert(hopper.category === 'walk_jump', `hopper → ${hopper.category}`);

  const flapper = inferSkillPlacement(SIMPLE_FLAPPER);
  assert(
    flapper.category === 'flying' && flapper.flyingSub === 'wing',
    `flapper → ${placementKey(flapper)}`,
  );

  const glider = inferSkillPlacement(SIMPLE_GLIDER);
  assert(
    glider.category === 'flying' && glider.flyingSub === 'glide',
    `glider → ${placementKey(glider)}`,
  );

  const chute = inferSkillPlacement(CHUTE_DROPPER);
  assert(
    chute.category === 'flying' && chute.flyingSub === 'parachute',
    `chute → ${placementKey(chute)}`,
  );

  const cart = inferSkillPlacement(MOTOR_CART);
  assert(cart.category === 'wheeled', `cart → ${cart.category}`);

  const boxer = inferSkillPlacement(BOXOBOT);
  assert(boxer.category === 'boxer', `boxobot → ${boxer.category}`);

  const joust = inferSkillPlacement(JOUSTBOT);
  assert(joust.category === 'joust', `joustbot → ${joust.category}`);

  const dancer = inferSkillPlacement(ULTI_GROOVE_BOT_II);
  assert(
    dancer.category === 'walk_jump',
    `disco body must not auto-place into disco, got ${dancer.category}`,
  );
  assert(
    isValidSkillPlacement(ULTI_GROOVE_BOT_II, { category: 'disco' }),
    'disco is always a valid manual move',
  );
  const moved = resolveSkillPlacement(ULTI_GROOVE_BOT_II, { category: 'disco' });
  assert(moved.category === 'disco', 'manual disco override sticks');

  assert(
    !isValidSkillPlacement(SIMPLE_HOPPER, { category: 'boxer' }),
    'hopper cannot be a boxer',
  );
  assert(
    !isValidSkillPlacement(SIMPLE_HOPPER, { category: 'wheeled' }),
    'hopper cannot be wheeled',
  );
  assert(
    !isValidSkillPlacement(SIMPLE_HOPPER, {
      category: 'flying',
      flyingSub: 'wing',
    }),
    'hopper cannot be a flyer',
  );
  assert(
    isValidSkillPlacement(SIMPLE_HOPPER, { category: 'multi' }),
    'multi is always valid',
  );
  assert(
    isValidSkillPlacement(SIMPLE_HOPPER, { category: 'walk_jump' }),
    'walk/jump is always valid',
  );

  const mixed = cloneDesign(SIMPLE_FLAPPER);
  mixed.joints = mixed.joints.map((j, i) =>
    i === 0 ? { ...j, isWheel: true } : j,
  );
  const mixPlace = inferSkillPlacement(mixed);
  assert(mixPlace.category === 'multi', `wing+wheel → ${mixPlace.category}`);

  const invalid = resolveSkillPlacement(SIMPLE_HOPPER, { category: 'boxer' });
  assert(
    invalid.category === 'walk_jump',
    'invalid override falls back to inferred',
  );

  console.log('smoke-skill-categories OK');
}

main();
