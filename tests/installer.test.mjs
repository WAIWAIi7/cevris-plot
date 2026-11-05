import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { download } from '../scripts/download.mjs';

async function fixture(run) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'cevris-install-'));
  const data = Buffer.from('verified runtime bytes');
  const checksum = createHash('sha256').update(data).digest('hex');
  let requests = 0;
  const server = http.createServer((req, res) => { requests++; run.handler(req, res, requests, data); });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const target = path.join(root, 'runtime.zip');
  try { await run.check({ url: `http://127.0.0.1:${server.address().port}`, target, checksum, data, count: () => requests }); }
  finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); await fs.rm(root, { recursive: true, force: true }); }
}
test('OpenSSL downloader recovers truncated transfers and reuses a verified cache', async () => {
  await fixture({
    handler(req,res,n,data) { if (n < 3) { res.writeHead(200, {'Content-Length': 999}); res.write('partial'); res.socket.destroy(); } else res.end(data); },
    async check({url,target,checksum,data,count}) {
      await download(url,target,{checksum,retryMs:1,log:()=>{}});
      assert.deepEqual(await fs.readFile(target),data); assert.equal(count(),3);
      assert.equal((await download(url,target,{checksum})).cached,true); assert.equal(count(),3);
      assert.deepEqual((await fs.readdir(path.dirname(target))), ['runtime.zip']);
    },
  });
});
test('bad checksums never replace an existing file, and incomplete files are removed', async () => {
  await fixture({ handler(req,res){res.end('corrupt');}, async check({url,target,checksum}) {
    await fs.writeFile(target,'existing');
    await assert.rejects(download(url,target,{checksum,attempts:2,retryMs:1,log:()=>{}}),/SHA-256/);
    assert.equal(await fs.readFile(target,'utf8'),'existing');
    assert.deepEqual(await fs.readdir(path.dirname(target)),['runtime.zip']);
  }});
});
test('404 is reported without repeated retries and a second mirror remains usable', async () => {
  await fixture({ handler(req,res,n,data){ if(req.url==='/missing'){res.writeHead(404);res.end();}else res.end(data); }, async check({url,target,checksum,count}) {
    await assert.rejects(download(url+'/missing',target,{checksum,log:()=>{}}),/404/); assert.equal(count(),1);
    await download(url+'/mirror',target,{checksum}); assert.equal(count(),2);
  }});
});
test('stalled downloads have a total deadline and clean partial files', async () => {
  await fixture({ handler(req,res){res.writeHead(200);res.write('partial');}, async check({url,target}) {
    await assert.rejects(download(url,target,{timeoutMs:80,attempts:1,log:()=>{}}));
    assert.deepEqual(await fs.readdir(path.dirname(target)),[]);
  }});
});
test('downloads reject non-HTTPS remote URLs and URL credentials', async () => {
  await assert.rejects(download('http://example.com/file','unused'),/HTTPS/);
  await assert.rejects(download('https://user:secret@example.com/file','unused'),/Credentials/);
});

const windows = process.platform === 'win32';
const powershell = path.join(process.env.WINDIR || 'C:/Windows','System32/WindowsPowerShell/v1.0/powershell.exe');
const psQuote = value => "'" + value.replaceAll("'", "''") + "'";
const common = path.resolve('scripts/install-common.ps1');
test('Windows process runner preserves spaces, quotes and trailing slashes', {skip:!windows}, async () => {
  const expected = ['folder with spaces', 'a"b', 'C:\\last\\', '模拟数据'];
  const script = `. ${psQuote(common)}; $code=Invoke-InstallTool ${psQuote(process.execPath)} @('-e','console.log(JSON.stringify(process.argv.slice(1)))','--',${expected.map(psQuote).join(',')}) 20; exit $code`;
  const {stdout} = await promisify(execFile)(powershell,['-NoProfile','-ExecutionPolicy','Bypass','-Command',script],{windowsHide:true,encoding:'utf8'});
  // Console encoding varies on Windows, so Unicode is exercised without relying on decoded terminal text.
  const decoded = JSON.parse(stdout.trim()); assert.deepEqual(decoded.slice(0,3),expected.slice(0,3)); assert.equal(decoded.length,4);
});
test('Windows process runner fails promptly on a hung child', {skip:!windows}, async () => {
  const script = `$ErrorActionPreference='Stop'; . ${psQuote(common)}; Invoke-InstallTool ${psQuote(process.execPath)} @('-e','setInterval(()=>{},1000)') 1`;
  await assert.rejects(promisify(execFile)(powershell,['-NoProfile','-ExecutionPolicy','Bypass','-Command',script],{windowsHide:true,timeout:12000}), error => /timed out/.test(error.stderr));
});

test('an agent-bundled Node without npm is not selected as a complete installation runtime', {skip:!windows}, async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'cevris-bare-node-'));
  try {
    const bare = path.join(root, 'node.exe');
    await fs.copyFile(process.execPath, bare);
    const script = `. ${psQuote(common)}; if (Test-InstallNode ${psQuote(bare)}) { throw 'Bare Node was accepted despite missing npm.' }; Write-Output 'fallback-required'`;
    const {stdout} = await promisify(execFile)(powershell,['-NoProfile','-ExecutionPolicy','Bypass','-Command',script],{windowsHide:true,timeout:30000});
    assert.match(stdout, /fallback-required/);
  } finally { await fs.rm(root, {recursive:true,force:true}); }
});
