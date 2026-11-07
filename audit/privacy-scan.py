"""Offline release-file scan; optional private denylist stays outside this repository."""
import argparse,hashlib,json,re,subprocess,zipfile,io
from pathlib import Path
parser=argparse.ArgumentParser()
parser.add_argument('--root',default=str(Path(__file__).resolve().parents[1]))
parser.add_argument('--denylist',help='Private JSON with regexes; never copy it into this repository')
parser.add_argument('--history',action='store_true')
parser.add_argument('--no-write',action='store_true',help='Final verification without changing repository files')
args=parser.parse_args()
root=Path(args.root).resolve()
rules=[
 ('credential-token',r'\b(?:ghp_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,}|AKIA[A-Z0-9]{16}|sk-[A-Za-z0-9_-]{30,})\b'),
 ('private-key',r'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----'),
 ('iban',r'\bDE\d{2}(?: ?\d){18}\b'),
 ('email',r'\b[A-Za-z0-9._%+-]+@(?!example\.invalid\b|example\.(?:com|org)\b)[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b'),
 ('insurance-id',r'\b\d{2}\d{6}[A-Z]\d{3}\b'),
]
private=[]
if args.denylist: private=json.loads(Path(args.denylist).read_text())
rules += [(f'private-marker-{i+1}',pat) for i,pat in enumerate(private)]
hits=[];hashes=[]; scanned=0
def scan(name,data,hash_file=True):
 global scanned
 scanned+=1
 if hash_file: hashes.append({'path':name,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()})
 if name.endswith('.zip'):
  with zipfile.ZipFile(io.BytesIO(data)) as z:
   for info in z.infolist():
    if not info.is_dir(): scan(name+'!'+info.filename,z.read(info),False)
  return
 text=data.decode('utf8',errors='replace')
 for kind,pattern in rules:
  if re.search(pattern,text,re.I): hits.append({'path':name,'category':kind})
for p in sorted(root.rglob('*')):
 if not p.is_file() or '.git' in p.relative_to(root).parts or 'node_modules' in p.relative_to(root).parts: continue
 if p.name in {'privacy-scan-results.json','release-file-manifest.json','history-scan-results.json'}:continue
 scan(p.relative_to(root).as_posix(),p.read_bytes())
history_entries=0
if args.history:
 log=subprocess.run(['git','log','--all','--format=fuller','--no-decorate'],cwd=root,capture_output=True,check=True).stdout
 scan('GIT_HISTORY_METADATA',log,False)
 objects=subprocess.run(['git','rev-list','--objects','--all'],cwd=root,capture_output=True,check=True,text=True).stdout.splitlines()
 for entry in objects:
  oid,_,name=entry.partition(' ')
  typ=subprocess.run(['git','cat-file','-t',oid],cwd=root,capture_output=True,check=True,text=True).stdout.strip()
  if typ=='blob':
   data=subprocess.run(['git','cat-file','blob',oid],cwd=root,capture_output=True,check=True).stdout
   scan('GIT_BLOB:'+name,data,False);history_entries+=1
report={'status':'NO_PATTERN_MATCHES' if not hits else 'REVIEW_REQUIRED','scannedItems':scanned,'historyBlobsScanned':history_entries,'privateMarkerChecks':len(private),'findings':hits,'limitation':'Pattern scan plus manual review; no mathematical guarantee of irreversibility or third-party account anonymity'}
if not args.no_write:
 out=root/'reports';out.mkdir(exist_ok=True)
 (out/('history-scan-results.json' if args.history else 'privacy-scan-results.json')).write_text(json.dumps(report,indent=2)+'\n')
 if not args.history:(out/'release-file-manifest.json').write_text(json.dumps(hashes,indent=2)+'\n')
print(json.dumps(report))
raise SystemExit(bool(hits))
