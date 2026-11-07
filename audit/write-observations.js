"use strict";
const fs=require("node:fs");
const path=require("node:path");
const {runVersion}=require("./compare");
const root=path.resolve(__dirname,"..");
const summaries=[];
fs.mkdirSync(path.join(root,"reports","jobrad"),{recursive:true});
for(const name of fs.readdirSync(path.join(root,"cases")).filter(n=>n.endsWith(".json")).sort()){
  for(const version of ["main","finance"]){
    const r=runVersion(path.join(root,"cases",name),version);
    if(name.startsWith("jobrad"))fs.writeFileSync(path.join(root,"reports","jobrad",`${version}-${name}`),JSON.stringify(r,null,2)+"\n");
    const k=r.kiz?.households?.A;
    summaries.push({caseFile:name,version,caseId:r.caseId || null,status:r.status || r.kiz?.status,validationErrors:r.validation?.errors?.map(e=>e.code) || [],adapterWarnings:r.adapterWarnings || [],kizStatus:k?.status || null,kizReason:k?.decisionReason || null,kizMonthly:k?.amounts?.finalPayableAmount ?? null,wohngeldStatus:r.wohngeld?.amount?.status || null,wohngeldMonthly:r.wohngeld?.amount?.payableWohngeldAmount ?? null,result:r.result || null});
  }
}
fs.writeFileSync(path.join(root,"reports","synthetic-observations.json"),JSON.stringify({evidenceKind:"SYNTHETIC_ENGINE_OBSERVATIONS_NOT_LEGAL_ORACLE",results:summaries},null,2)+"\n");
console.log(`${summaries.length} observations saved; original snapshots unchanged.`);
