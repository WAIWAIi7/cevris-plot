import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {zipSync,strToU8} from 'fflate';
import {extractZip} from '../scripts/extract-zip.mjs';
test('bootstrap ZIP extraction supports long paths and Unicode without registry changes',async()=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'cevris-zip-'));
  try {
    const name=('long-path-segment/'.repeat(15))+'模拟数据.txt', zip=path.join(root,'input.zip');
    await fs.writeFile(zip,zipSync({[name]:strToU8('preserved')},{level:6}));
    await extractZip(zip,path.join(root,'out'));
    assert.equal(await fs.readFile(path.join(root,'out',name),'utf8'),'preserved');
    await assert.rejects(extractZip(zip,path.join(root,'out')),/empty/);
  } finally {await fs.rm(root,{recursive:true,force:true});}
});
test('bootstrap ZIP extraction rejects traversal before writing any entry',async()=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'cevris-zip-'));
  try {
    const zip=path.join(root,'unsafe.zip');
    await fs.writeFile(zip,zipSync({'safe.txt':strToU8('ok'),'../escape.txt':strToU8('bad')}));
    await assert.rejects(extractZip(zip,path.join(root,'out')),/Unsafe/);
    assert.deepEqual(await fs.readdir(root),['unsafe.zip']);
  } finally {await fs.rm(root,{recursive:true,force:true});}
});
