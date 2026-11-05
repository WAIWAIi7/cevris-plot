// No npm dependencies: works while bootstrapping Node itself. Node's filesystem
// APIs support Windows long paths without changing machine registry policy.
import fs from 'node:fs/promises';
import path from 'node:path';
import { inflateRawSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
const table = Array.from({length:256},(_,n)=>{for(let i=0;i<8;i++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
function crc32(bytes){let n=0xffffffff;for(const byte of bytes)n=table[(n^byte)&255]^(n>>>8);return (n^0xffffffff)>>>0;}
export async function extractZip(archive, destination) {
  if((await fs.stat(archive)).size>512*1024*1024)throw new Error('Archive size limit exceeded.');
  const zip=await fs.readFile(archive), root=path.resolve(destination);
  let end=-1;
  for(let i=zip.length-22;i>=Math.max(0,zip.length-65557);i--)if(zip.readUInt32LE(i)===0x06054b50 && i+22+zip.readUInt16LE(i+20)===zip.length){end=i;break;}
  if(end<0)throw new Error('ZIP directory missing.');
  const count=zip.readUInt16LE(end+10), offset=zip.readUInt32LE(end+16), size=zip.readUInt32LE(end+12);
  if(count===65535 || offset+size>end || zip.readUInt16LE(end+4)!==0 || zip.readUInt16LE(end+6)!==0)throw new Error('Unsupported ZIP64/multi-volume archive.');
  const records=[], names=new Set(); let cursor=offset,total=0;
  for(let i=0;i<count;i++){
    if(cursor+46>offset+size || zip.readUInt32LE(cursor)!==0x02014b50)throw new Error('Invalid ZIP record.');
    const flags=zip.readUInt16LE(cursor+8),method=zip.readUInt16LE(cursor+10),checksum=zip.readUInt32LE(cursor+16);
    const compressed=zip.readUInt32LE(cursor+20),unpacked=zip.readUInt32LE(cursor+24),nameLength=zip.readUInt16LE(cursor+28);
    const extraLength=zip.readUInt16LE(cursor+30),commentLength=zip.readUInt16LE(cursor+32),attributes=zip.readUInt32LE(cursor+38),local=zip.readUInt32LE(cursor+42);
    const name=zip.subarray(cursor+46,cursor+46+nameLength).toString('utf8').replaceAll('\\','/');
    cursor+=46+nameLength+extraLength+commentLength;
    const target=path.resolve(root,name),key=name.replace(/\/$/,'').toLowerCase();
    if(!name || /(^|\/)\.\.(\/|$)|[:\x00]/.test(name) || name.startsWith('/') || !target.startsWith(root+path.sep))throw new Error('Unsafe ZIP path.');
    if(names.has(key))throw new Error('Duplicate ZIP path.'); names.add(key);
    if(flags&1 || ![0,8].includes(method) || ((attributes>>>16)&0xf000)===0xa000)throw new Error('Encrypted, unsupported or symlink ZIP entry.');
    total+=unpacked;
    if(unpacked>256*1024*1024 || total>1024*1024*1024)throw new Error('Archive expansion limit exceeded.');
    if(local+30>offset || zip.readUInt32LE(local)!==0x04034b50)throw new Error('Invalid local ZIP header.');
    const start=local+30+zip.readUInt16LE(local+26)+zip.readUInt16LE(local+28);
    if(start+compressed>offset)throw new Error('Invalid ZIP data bounds.');
    records.push({name,target,start,compressed,unpacked,method,checksum});
  }
  const existing=await fs.readdir(root).catch(error=>{if(error.code==='ENOENT')return [];throw error;});
  if(existing.length)throw new Error('Extraction destination must be empty.');
  await fs.mkdir(root,{recursive:true});
  for(const r of records){
    if(r.name.endsWith('/')){await fs.mkdir(r.target,{recursive:true});continue;}
    const compressed=zip.subarray(r.start,r.start+r.compressed);
    const data=r.method===0?compressed:inflateRawSync(compressed,{maxOutputLength:Math.max(1,r.unpacked)});
    if(data.length!==r.unpacked || crc32(data)!==r.checksum)throw new Error('ZIP entry checksum mismatch.');
    await fs.mkdir(path.dirname(r.target),{recursive:true});
    await fs.writeFile(r.target,data,{flag:'wx'});
  }
  return {files:records.length,bytes:total};
}
if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{const [archive,destination]=process.argv.slice(2);if(!archive||!destination)throw new Error('Usage: node extract-zip.mjs ARCHIVE EMPTY_DIRECTORY');console.log(JSON.stringify(await extractZip(archive,destination)));}
  catch(error){console.error(error.message);process.exitCode=1;}
}
