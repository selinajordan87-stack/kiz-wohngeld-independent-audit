"use strict";
const {spawnSync}=require("node:child_process");
const fs=require("node:fs");
const path=require("node:path");
const root=path.resolve(__dirname,"..");
const suites=[["integrity",["audit/verify-integrity.js"]],["main-original",["snapshots/main/tests/run-all-tests.js"]],["finance-original",["snapshots/finance/tests/run-all-tests.js"]],["audit-harness",["--test","audit/harness.test.js"]]];
const summary=[];
for(const [id,args] of suites){
  const r=spawnSync(process.execPath,args,{cwd:root,encoding:"utf8",maxBuffer:64*1024*1024});
  const output=(r.stdout || "")+(r.stderr || "");
  process.stdout.write(`\n${id}\n${output}`);
  summary.push({id,exitCode:r.status,error:r.error?.message || null,output});
}
const good=summary.every(x=>x.exitCode===0&&!x.error&&x.output.trim());
fs.mkdirSync(path.join(root,"reports"),{recursive:true});
fs.writeFileSync(path.join(root,"reports","test-results.json"),JSON.stringify({node:process.version,status:good?"PASSED":"FAILED",scope:"Only selected preserved tests and new synthetic adapter checks; not a legal certification",suites:summary},null,2)+"\n");
if(!good)process.exitCode=1;
