"use strict";
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const root = path.resolve(__dirname, "..");
function verify() {
  const manifest = require("../provenance/source-integrity.json");
  const issues = [];
  for (const file of manifest.files) {
    const data = fs.readFileSync(path.join(root, file.path));
    const sha256 = crypto.createHash("sha256").update(data).digest("hex");
    const blob = crypto.createHash("sha1").update(`blob ${data.length}\0`).update(data).digest("hex");
    if (sha256 !== file.sha256 || blob !== file.sourceGitBlobSha) issues.push(file.path);
  }
  for (const file of manifest.documentationExports || []) {
    const data=fs.readFileSync(path.join(root,file.path));
    if(crypto.createHash("sha256").update(data).digest("hex")!==file.exportSha256)issues.push(file.path);
  }
  const listed = new Set(manifest.files.map(f => f.path));
  for (const file of fs.readdirSync(path.join(root, "snapshots"), {recursive:true, withFileTypes:true})) {
    const parent = file.parentPath || file.path;
    if (file.isFile()) {
      const name = path.relative(root, path.join(parent, file.name)).split(path.sep).join("/");
      if (!listed.has(name)) issues.push(`UNLISTED:${name}`);
    }
  }
  return {status:issues.length ? "FAILED" : "VERIFIED", checkedFiles:manifest.files.length, checkedRedactedDocuments:(manifest.documentationExports || []).length, issues};
}
if (require.main === module) {
  const result = verify(); console.log(JSON.stringify(result, null, 2));
  if (result.issues.length) process.exitCode = 1;
}
module.exports = {verify};
