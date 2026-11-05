import fs from 'node:fs/promises';
try {
  const dependencies = ['csv-parse', 'exceljs', 'fflate', 'zod'];
  // A parent project's node_modules must not make a fresh portable install
  // appear complete. Its own dependencies must be present before importing.
  await Promise.all(dependencies.map(name => fs.access(new URL('../node_modules/' + name + '/package.json', import.meta.url))));
  await Promise.all(dependencies.map(name => import(name)));
  console.log('Server dependencies ready.');
} catch (error) { console.error('Runtime dependencies need installation: ' + error.code); process.exitCode = 1; }
