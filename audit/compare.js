"use strict";
const {spawnSync} = require("node:child_process");
const path = require("node:path");
function runVersion(file, version) {
  const r=spawnSync(process.execPath,[path.join(__dirname,"run-case.js"),"--version",version,"--input",file],{encoding:"utf8",maxBuffer:32*1024*1024});
  if (r.status !== 0 || r.error) throw new Error(r.stderr || String(r.error));
  return JSON.parse(r.stdout);
}
function differences(a,b, prefix="", result=[]) {
  if (JSON.stringify(a) === JSON.stringify(b)) return result;
  if (a && b && typeof a === "object" && typeof b === "object") {
    for (const key of new Set([...Object.keys(a),...Object.keys(b)])) differences(a[key],b[key],prefix + "/" + key,result);
  } else result.push({path:prefix,main:a ?? null,finance:b ?? null});
  return result;
}
if (require.main === module) {
  try {
    const i=process.argv.indexOf("--input"), file=i>=0 ? process.argv[i+1] : process.argv[2];
    if (!file) throw new Error("node audit/compare.js --input cases/DATEI.json");
    const main=runVersion(file,"main"), finance=runVersion(file,"finance");
    const clean=x=>{const y=structuredClone(x);delete y.version;delete y.provenance;return y;};
    console.log(JSON.stringify({input:path.basename(file),differences:differences(clean(main),clean(finance)),main,finance},null,2));
  } catch (error) {console.error(error.stack);process.exitCode=1;}
}
module.exports={runVersion,differences};
