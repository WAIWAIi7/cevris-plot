// Build a portable resource bundle; this does not submit to or authenticate with Doubao.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {zipSync, unzipSync} from 'fflate';
import {PRODUCT} from '../shared/identity.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export function validateDoubaoBundle(entries, archiveBytes) {
  const names=Object.keys(entries), total=Object.values(entries).reduce((sum,bytes)=>sum+bytes.length,0);
  if(names.length>1024 || total>16_000_000 || archiveBytes>16_000_000) throw new Error('Doubao bundle exceeds the documented total size or entry limit.');
  for(const [name,bytes] of Object.entries(entries)) {
    if(bytes.length>2_000_000) throw new Error('Doubao individual file exceeds 2 MB: '+name);
    if(!name.startsWith('cevris-plot/') || /(^|\/)(\.\.|\.runtime|\.data|node_modules|verification)(\/|$)/.test(name)) throw new Error('Unexpected bundle path: '+name);
  }
  if(!entries['cevris-plot/SKILL.md'] || !entries['cevris-plot/assets/icon.svg'] || !entries['cevris-plot/build/app.js']) throw new Error('Incomplete Doubao skill bundle.');
  return {files:names.length,uncompressedBytes:total,archiveBytes};
}
async function build() {
  const entries=unzipSync(await fs.readFile(path.join(root,'dist/cevris-plot.zip')));
  const encode=text=>new TextEncoder().encode(text);
  // Dense vector demo thumbnails can exceed the host's per-file limit.
  // Render the same complete demo as a PNG inside its thumbnail SVG wrapper;
  // the editable project, 24,000-point data and full SVG export stay unchanged.
  const largeThumbnails=Object.keys(entries).filter(name=>/^cevris-plot\/build\/thumbnails\/[a-z0-9_]+\.svg$/.test(name) && entries[name].length>2_000_000);
  if(largeThumbnails.length) {
    const {exampleProject}=await import('../shared/examples.mjs');
    const {renderProject,closeRWorkers}=await import('../server/runtime.mjs');
    try {
      for(const name of largeThumbnails) {
        const id=path.basename(name,'.svg'), project=exampleProject(id);
        const result=await renderProject(project,'png'), png=await fs.readFile(result.file);
        entries[name]=encode(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${project.params.widthMm} ${project.params.heightMm}"><image width="${project.params.widthMm}" height="${project.params.heightMm}" href="data:image/png;base64,${png.toString('base64')}"/></svg>`);
      }
    } finally { closeRWorkers(); }
  }
  const skill=new TextDecoder().decode(entries['cevris-plot/SKILL.md']);
  if(!skill.startsWith('---\n') && !skill.startsWith('---\r\n'))throw new Error('Skill frontmatter is missing.');
  const normalized=skill.replaceAll('\r\n','\n'), split=normalized.indexOf('\n---\n',4);
  if(split<0)throw new Error('Skill frontmatter is incomplete.');
  const meta=`\nmetadata:\n  display_name: Cevris Plot\n  version: "${PRODUCT.version}"\n  icon: assets/icon.svg\n  target_host: doubao-desktop\n  license: MIT`;
  const adapter='\n\n## 豆包官方电脑版入口\n\n先阅读 docs/DOUBAO.md。只使用当前任务实际提供的本地文件与终端工具；确认本机 Windows x64、数据所在路径和可写工作目录。首次部署执行 scripts/install.ps1，资源目录只读时先复制应用到允许的工作目录。不要猜测豆包隐藏技能目录，不调用未注册的外部 API，不把远程容器的 loopback 地址交给用户当作本机编辑页。环境就绪后遵循以下完整绘图流程，交付实际图片和可编辑项目。\n';
  entries['cevris-plot/SKILL.md']=encode(normalized.slice(0,split)+meta+'\n---'+adapter+normalized.slice(split+5));
  entries['cevris-plot/assets/icon.svg']=encode('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="#e7eff5"/><path d="M15 14v36h36M22 40l9-14 9 7 10-15" fill="none" stroke="#426b89" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><circle cx="31" cy="26" r="4" fill="#b5522a"/></svg>');
  validateDoubaoBundle(entries,0);
  const zip=zipSync(entries,{level:6}), report=validateDoubaoBundle(entries,zip.length);
  await fs.writeFile(path.join(root,'dist/cevris-plot-doubao.zip'),zip);
  console.log(JSON.stringify({version:PRODUCT.version,...report,platformReviewed:false}));
}
if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) await build();
