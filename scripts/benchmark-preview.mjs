import fs from "node:fs/promises";
import os from "node:os";
import {exampleProject} from "../shared/examples.mjs";
const base="http://127.0.0.1:"+(process.env.FIGURE_PORT||47831);
const {token}=await(await fetch(base+"/api/session")).json();
const nonce=Date.now(),samples=[];
for(const id of ["violin","beeswarm","volcano","heatmap","sankey"]){
 for(let i=0;i<4;i++){
  const p=exampleProject(id);p.params.pointSize=1.9+i*.11;p.labels.title+=" · 响应测量"+nonce+"-"+i;
  delete p.originalData;const start=performance.now();
  const response=await fetch(base+"/api/preview",{method:"POST",headers:{Authorization:"Bearer "+token,"Content-Type":"application/json"},body:JSON.stringify({project:p})});
  const result=await response.json();if(!response.ok)throw new Error(result.error);
  samples.push({id,rows:p.data.rows.length,roundTripMs:Math.round(performance.now()-start),rMs:result.metadata.renderMs,warm:result.metadata.warmWorker});
 }
}
const sorted=samples.map(x=>x.roundTripMs).sort((a,b)=>a-b);
const report={date:new Date().toISOString(),platform:os.platform(),cpu:os.cpus()[0].model,ramGiB:Math.round(os.totalmem()/2**30),note:"本机已有常驻 R 进程；20次未命中缓存的完整 HTTP 请求，含校验、绘图、读取SVG和JSON返回。不是大规模数据基准。",p50Ms:sorted[Math.floor(sorted.length*.5)],p95Ms:sorted[Math.ceil(sorted.length*.95)-1],samples};
await fs.mkdir("verification",{recursive:true});await fs.writeFile("verification/performance-v0.3.json",JSON.stringify(report,null,2));
console.log(JSON.stringify({p50Ms:report.p50Ms,p95Ms:report.p95Ms,requests:samples.length,allWarm:samples.every(s=>s.warm)},null,2));
