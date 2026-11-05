import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { registerSkill } from '../scripts/register-skill.mjs';
import { validateDoubaoBundle } from '../scripts/package-doubao.mjs';
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

test('DeepSeek Harness registration honors its configured DSH_HOME', async () => {
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'cevris-dsh-home-')), before=process.env.DSH_HOME;
  try {
    process.env.DSH_HOME=path.join(root,'custom harness home');
    const result=await registerSkill({host:'dsh',appRoot:root});
    assert.equal(result.directory,path.join(process.env.DSH_HOME,'skills','cevris-plot'));
    assert.match(await fs.readFile(path.join(result.directory,'SKILL.md'),'utf8'),/scripts\/figure.mjs/);
  } finally {
    if(before===undefined)delete process.env.DSH_HOME;else process.env.DSH_HOME=before;
    await fs.rm(root,{recursive:true,force:true});
  }
});

test('Doubao packaging enforces documented resource limits and excludes local runtime data', () => {
  const bytes=new Uint8Array(1), entries={'cevris-plot/SKILL.md':bytes,'cevris-plot/assets/icon.svg':bytes,'cevris-plot/build/app.js':bytes};
  assert.equal(validateDoubaoBundle(entries,100).files,3);
  assert.throws(()=>validateDoubaoBundle(entries,16_000_001),/limit/);
  assert.throws(()=>validateDoubaoBundle({...entries,'cevris-plot/large.bin':new Uint8Array(2_000_001)},100),/2 MB/);
  assert.throws(()=>validateDoubaoBundle({...entries,'cevris-plot/.data/project.json':bytes},100),/Unexpected/);
  const many={...entries};for(let i=0;i<1024;i++)many['cevris-plot/a'+i]=bytes;
  assert.throws(()=>validateDoubaoBundle(many,100),/limit/);
});

test('DSH double-click registration reuses a saved external Node without PATH or FIGURE_NODE', {skip:process.platform!=='win32'}, async () => {
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'cevris-dsh-external-node-'));
  try {
    await fs.mkdir(path.join(root,'scripts'));await fs.mkdir(path.join(root,'.runtime'));
    for(const name of ['register-dsh.ps1','register-skill.mjs','download.ps1']) await fs.copyFile(path.resolve('scripts',name),path.join(root,'scripts',name));
    await fs.writeFile(path.join(root,'.runtime/runtime.json'),JSON.stringify({node:process.execPath}));
    const system=path.join(process.env.WINDIR,'System32'), powershell=path.join(system,'WindowsPowerShell/v1.0/powershell.exe');
    const env={...process.env,FIGURE_NODE:'',DSH_HOME:path.join(root,'harness'),PATH:system};
    for(const key of Object.keys(env))if(key.toLowerCase()==='path' && key!=='PATH')delete env[key];
    await promisify(execFile)(powershell,['-NoProfile','-ExecutionPolicy','Bypass','-File',path.join(root,'scripts/register-dsh.ps1')],{env,windowsHide:true,timeout:30000});
    const marker=JSON.parse(await fs.readFile(path.join(env.DSH_HOME,'skills/cevris-plot/.cevris-link.json'),'utf8'));
    assert.equal(marker.node,process.execPath);
    assert.equal(await fs.realpath(marker.app),await fs.realpath(root));
  } finally {await fs.rm(root,{recursive:true,force:true});}
});
