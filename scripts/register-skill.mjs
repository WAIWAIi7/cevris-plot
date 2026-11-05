// Register a small local entrypoint; runtime and user data remain in the app directory.
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
export async function registerSkill({host, directory, appRoot, replace = false}) {
  const root = path.resolve(appRoot || path.join(path.dirname(fileURLToPath(import.meta.url)), '..'));
  const config = await fs.readFile(path.join(root, '.runtime/runtime.json'),'utf8').then(s=>JSON.parse(s.replace(/^\uFEFF/,''))).catch(error=>{if(error.code==='ENOENT')return {};throw error;});
  const node = process.env.FIGURE_NODE || (config.node ? path.resolve(root,config.node) : process.execPath);
  let base = directory;
  if (!base && host === 'dsh') base = path.join(process.env.DSH_HOME || path.join(os.homedir(),'.dsh'),'skills');
  if (!base && host === 'agents') base = path.join(os.homedir(),'.agents','skills');
  if (!base && host === 'codex') base = path.join(process.env.CODEX_HOME || path.join(os.homedir(),'.codex'),'skills');
  if (!base) throw new Error('Supply --directory with the actual host skill directory; no Doubao-specific path is assumed.');
  const destination = path.join(path.resolve(base), 'cevris-plot');
  const marker = path.join(destination, '.cevris-link.json');
  const existing = await fs.stat(destination).catch(error=>{if(error.code==='ENOENT')return null;throw error;});
  if (existing) {
    const owned = await fs.readFile(marker,'utf8').then(JSON.parse).catch(()=>null);
    if (!owned || owned.app !== root) {
      if (!replace) throw new Error('Existing skill belongs to another installation. Use --replace to preserve a backup and update it.');
      await fs.rename(destination, destination + '.backup-' + Date.now());
    }
  }
  await fs.mkdir(destination,{recursive:true});
  const entry = `---\nname: cevris-plot\ndescription: Choose scientific figures from experimental context and render editable R-based plots with the installed local Cevris Plot app.\n---\n\n# Cevris Plot\n\nApplication: ${JSON.stringify(root)}\nNode executable: ${JSON.stringify(node)}\n\nRead the application's SKILL.md before preparing data. Use the host's authorized local file and terminal tools; no provider API key belongs in the plotting app. Run commands from the application directory using the Node executable above and scripts/figure.mjs. Start with doctor and catalog, then create/validate/draw. Deliver the actual generated image plus .figure.json. Use open --browser false when the user does not want a window.\n\nFor a restricted Windows environment, read docs/INSTALLATION.md and docs/AGENT_HOSTS.md in the application. Reuse the configured runtime. Do not run the R installer, modify registry/ACL settings, disable TLS checks, or request administrator rights to solve installation. If the host denies a necessary child process, report that capability limitation. A remote chat cannot access a user's loopback URL.\n`;
  await fs.writeFile(path.join(destination,'SKILL.md'),entry);
  await fs.writeFile(marker,JSON.stringify({app:root,host,node},null,2));
  return {host,directory:destination,app:root,refresh:'Refresh the host skill list or open a new session.'};
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args=process.argv.slice(2), options={};
    for(let i=0;i<args.length;i++) {
      if(args[i]==='--replace') options.replace=true;
      else if(['--host','--directory'].includes(args[i]) && args[i+1]) options[args[i].slice(2)]=args[++i];
      else throw new Error('Usage: node scripts/register-skill.mjs --host dsh|agents|codex|doubao [--directory DIR] [--replace]');
    }
    console.log(JSON.stringify(await registerSkill(options),null,2));
  } catch(error) {console.error(error.message);process.exitCode=1;}
}
