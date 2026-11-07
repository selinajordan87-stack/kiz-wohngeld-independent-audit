"""Create a reproducible code/data archive without .git, private inputs or nested downloads."""
from pathlib import Path
import argparse,hashlib,json,zipfile
p=argparse.ArgumentParser()
p.add_argument('--output',required=True)
a=p.parse_args()
root=Path(__file__).resolve().parents[1]
output=Path(a.output).resolve();output.parent.mkdir(parents=True,exist_ok=True)
excluded={'.git','node_modules','outputs','private','downloads','__pycache__'}
files=[f for f in sorted(root.rglob('*')) if f.is_file() and not any(x in excluded for x in f.relative_to(root).parts) and f.resolve()!=output and f.suffix not in {'.log','.bundle'} and not f.name.startswith('.env')]
with zipfile.ZipFile(output,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=9) as z:
 for f in files:
  info=zipfile.ZipInfo('kiz-wohngeld-independent-audit/'+f.relative_to(root).as_posix(),date_time=(2000,1,1,0,0,0))
  info.create_system=3;info.external_attr=0o100644<<16;info.compress_type=zipfile.ZIP_DEFLATED
  z.writestr(info,f.read_bytes())
with zipfile.ZipFile(output) as z:
 assert z.testzip() is None
 assert len(z.infolist())==len(files)
 assert not any('.git' in Path(x.filename).parts for x in z.infolist())
 assert len([x for x in z.infolist() if '/cases/' in x.filename and x.filename.endswith('.json')])==37
print(json.dumps({'files':len(files),'bytes':output.stat().st_size,'sha256':hashlib.sha256(output.read_bytes()).hexdigest(),'zipIntegrity':'PASS','syntheticCases':37,'originalGitHistoryIncluded':False}))
