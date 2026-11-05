import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { diagnostics, renderProject, closeRWorkers } from '../server/runtime.mjs';
import { exampleProject } from '../shared/examples.mjs';
try {
  const info = await diagnostics();
  assert(info.ready, info.error || 'R is not ready');
  for (const format of ['svg','png','pdf','tiff']) {
    const result = await renderProject(exampleProject('violin'), format);
    assert((await fs.stat(result.file)).size > 1000);
  }
  console.log('R, required libraries, fonts and SVG/PNG/PDF/TIFF rendering verified.');
} finally { closeRWorkers(); }
