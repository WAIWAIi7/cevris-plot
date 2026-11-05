import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { zipSync } from 'fflate';
import { PRODUCT } from '../shared/identity.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'), entries={};
async function collect(relative){
  for(const item of await fs.readdir(path.join(root,relative),{withFileTypes:true})){
    const name=relative+'/'+item.name;
    if(item.isSymbolicLink())throw new Error('No links in frontend bundle.');
    if(item.isDirectory())await collect(name);
    else entries[name]=[new Uint8Array(await fs.readFile(path.join(root,name))),{mtime:new Date('2026-01-01T00:00:00Z')}];
  }
}
await collect('build');
for(const name of ['build/app.js','build/app.css','build/index.html'])if(!entries[name])throw new Error('Incomplete frontend.');
const data=zipSync(entries,{level:6}), file='cevris-plot-frontend.zip';
await fs.mkdir(path.join(root,'dist'),{recursive:true});await fs.writeFile(path.join(root,'dist',file),data);
const entry={version:PRODUCT.version,file,sha256:createHash('sha256').update(data).digest('hex'),urls:[`https://github.com/WAIWAIi7/cevris-plot/releases/download/v${PRODUCT.version}/${file}`]};
await fs.writeFile(path.join(root,'scripts/frontend-manifest.json'),JSON.stringify(entry,null,2)+'\n');
console.log(JSON.stringify(entry));
