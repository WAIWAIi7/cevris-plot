import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { registerSkill } from '../scripts/register-skill.mjs';
test('host registration links the app, repeats safely and preserves other installations', async () => {
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'cevris-host-'));
  try {
    const appRoot=path.join(root,'app with spaces'), directory=path.join(root,'skills');
    await fs.mkdir(appRoot);
    const result=await registerSkill({host:'dsh',directory,appRoot});
    const skill=await fs.readFile(path.join(result.directory,'SKILL.md'),'utf8');
    assert(skill.includes(JSON.stringify(appRoot))); assert(skill.includes('name: cevris-plot'));
    await registerSkill({host:'dsh',directory,appRoot});
    await assert.rejects(registerSkill({host:'dsh',directory,appRoot:root}),/another installation/);
    await registerSkill({host:'dsh',directory,appRoot:root,replace:true});
    assert((await fs.readdir(directory)).some(name=>name.startsWith('cevris-plot.backup-')));
  } finally {await fs.rm(root,{recursive:true,force:true});}
});
test('Doubao registration requires the actual client skill directory', async () => {
  await assert.rejects(registerSkill({host:'doubao'}),/actual host skill directory/);
});
