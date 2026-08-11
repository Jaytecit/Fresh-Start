/**
 * C6/C7 — Share payload validation, local store, and catalog gallery.
 * Run: npm run smoke:share
 */
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRng, makeShape, randomWeights } from '../src/brain/network.ts';
import { SIMPLE_HOPPER } from '../src/creature/presets.ts';
import { cloneDesign } from '../src/creature/types.ts';
import {
  galleryEntryFromShareSummary,
  listCatalogFs,
  readCatalogFs,
  writeCatalogFs,
} from '../src/library/catalogStoreFs.ts';
import {
  exportModelJson,
  importModelJson,
} from '../src/library/jsonIO.ts';
import { createShareId, isValidShareId } from '../src/library/shareIds.ts';
import {
  readShareFs,
  writeShareFs,
} from '../src/library/shareStoreFs.ts';
import {
  validateSharePayload,
} from '../src/library/shareValidate.ts';

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

function buildSampleModelJson(): string {
  const design = cloneDesign(SIMPLE_HOPPER);
  const shape = makeShape(design.muscles.length);
  const weights = randomWeights(shape, createRng(42));
  return exportModelJson({
    name: 'TriangleWalkerT',
    task: 'run',
    shape,
    weights,
    fitness: 12.34,
    design,
  });
}

function testSerializeUnchanged(): void {
  const json = buildSampleModelJson();
  const again = buildSampleModelJson();
  assert(json === again, 'exportModelJson must be deterministic for fixed seed');
  const validated = validateSharePayload(json);
  assert(validated.ok, 'valid export must pass share validation');
  if (!validated.ok) return;
  const reimported = importModelJson(validated.raw);
  assert(reimported.ok, 'validated share raw must import');
  if (!reimported.ok) return;
  const original = importModelJson(json);
  assert(original.ok, 'original export must import');
  if (!original.ok) return;
  assert(original.value.name === reimported.value.name, 'name preserved');
  assert(original.value.task === reimported.value.task, 'task preserved');
  assert(
    original.value.fitness === reimported.value.fitness,
    'fitness preserved',
  );
  assert(
    original.value.shape.weightCount === reimported.value.shape.weightCount,
    'shape preserved',
  );
  assert(
    original.value.weights.length === reimported.value.weights.length,
    'weights length preserved',
  );
  for (let i = 0; i < original.value.weights.length; i++) {
    assert(
      original.value.weights[i] === reimported.value.weights[i],
      `weight[${i}] mismatch`,
    );
  }
  assert(
    original.value.design.joints.length ===
      reimported.value.design.joints.length,
    'joints preserved',
  );
  console.log('serialize / validate round-trip OK');
}

function testRejectInvalid(): void {
  const badKind = validateSharePayload(
    JSON.stringify({ kind: 'nope', version: 1 }),
  );
  assert(!badKind.ok && badKind.code === 'invalid_model', 'reject bad kind');

  const badVersion = validateSharePayload(
    JSON.stringify({
      kind: 'freshstart-model',
      version: 99,
      name: 'X',
      task: 'run',
      shape: { inputCount: 1, hiddenCount: 1, outputCount: 1, weightCount: 1 },
      weightsB64: 'AA==',
      fitness: 0,
      design: cloneDesign(SIMPLE_HOPPER),
    }),
  );
  assert(
    !badVersion.ok && badVersion.code === 'unsupported_version',
    'reject unsupported version',
  );

  const huge = 'x'.repeat(300 * 1024);
  const tooLarge = validateSharePayload(huge);
  assert(!tooLarge.ok && tooLarge.code === 'too_large', 'reject oversized');

  const corrupt = validateSharePayload('{not json');
  assert(!corrupt.ok && corrupt.code === 'invalid_json', 'reject corrupt JSON');

  console.log('invalid payload rejection OK');
}

async function testFsStoreRoundTrip(): Promise<void> {
  const dir = await mkdtemp(join(tmpdir(), 'solemn-share-'));
  try {
    const id = createShareId();
    assert(isValidShareId(id), 'share id format');
    const json = buildSampleModelJson();
    const validated = validateSharePayload(json);
    assert(validated.ok, 'sample must validate');
    if (!validated.ok) return;
    await writeShareFs(dir, id, validated.raw);
    const loaded = await readShareFs(dir, id);
    assert(loaded !== null, 'stored share must load');
    const missing = await readShareFs(dir, createShareId());
    assert(missing === null, 'missing id returns null');
    const again = validateSharePayload(loaded!);
    assert(again.ok, 'loaded share must validate');
    if (!again.ok) return;
    const imported = importModelJson(again.raw);
    assert(imported.ok, 'loaded share must import via canonical importer');
    // Cross-browser invariant: storage is filesystem/Blob, not localStorage.
    assert(
      !again.raw.includes('freshstart_saved_models'),
      'share payload must not embed localStorage keys',
    );
    console.log('filesystem store round-trip OK');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

function testIdUtility(): void {
  const a = createShareId();
  const b = createShareId();
  assert(a !== b, 'ids must not collide trivially');
  assert(!isValidShareId('1'), 'reject sequential short ids');
  assert(!isValidShareId('../etc'), 'reject path-like ids');
  console.log('share id utility OK');
}

async function testCatalogOptIn(): Promise<void> {
  const root = await mkdtemp(join(tmpdir(), 'solemn-catalog-'));
  const shareDir = join(root, 'shares');
  const catalogDir = join(root, 'catalog');
  try {
    const json = buildSampleModelJson();
    const validated = validateSharePayload(json);
    assert(validated.ok, 'sample must validate');
    if (!validated.ok) return;

    const unlistedId = createShareId();
    await writeShareFs(shareDir, unlistedId, validated.raw);
    let gallery = await listCatalogFs(catalogDir);
    assert(gallery.length === 0, 'unlisted share must not appear in gallery');

    const listedId = createShareId();
    await writeShareFs(shareDir, listedId, validated.raw);
    const m = validated.model;
    const entry = galleryEntryFromShareSummary(listedId, {
      name: m.name,
      task: m.task,
      fitness: m.fitness,
      joints: m.design.joints.length,
      bones: m.design.bones.length,
      muscles: m.design.muscles.length,
      inputCount: m.shape.inputCount,
      hiddenCount: m.shape.hiddenCount,
      outputCount: m.shape.outputCount,
      version: m.version,
    });
    await writeCatalogFs(catalogDir, entry);

    const loaded = await readCatalogFs(catalogDir, listedId);
    assert(loaded !== null, 'catalog entry must load');
    assert(loaded!.id === listedId, 'catalog id matches');
    assert(!('weightsB64' in (loaded as object)), 'catalog has no weights');

    gallery = await listCatalogFs(catalogDir);
    assert(gallery.length === 1, 'gallery returns only listed entries');
    assert(gallery[0]!.id === listedId, 'gallery entry id matches');

    const shareRaw = await readShareFs(shareDir, listedId);
    assert(shareRaw !== null, 'full share still loads');
    const imported = importModelJson(shareRaw!);
    assert(imported.ok, 'listed share still imports via canonical path');

    console.log('catalog opt-in / gallery OK');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function main(): Promise<void> {
  testIdUtility();
  testSerializeUnchanged();
  testRejectInvalid();
  await testFsStoreRoundTrip();
  await testCatalogOptIn();
  console.log('smoke:share passed');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
