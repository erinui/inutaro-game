"""Record exact approved source fragments against the immutable P0 checkout."""
import difflib,hashlib,json,subprocess
from pathlib import Path
root=Path(__file__).resolve().parent.parent
baseline=json.loads((root/'.performance-evidence/20261017/start.json').read_text())
head=subprocess.check_output(['git','rev-parse','HEAD'],cwd=root).decode().strip()
assert head==baseline['head'],'HEAD changed: rebase and review the P0 provenance before recording'
files=['assets/home-city/youtube-latest.json','home.js','home.css','index.html','.github/workflows/update-youtube-latest.yml','scripts/update-youtube-latest.mjs','scripts/update-home-latest.mjs']
report={'baseCommit':head,'beforeHashes':{},'afterHashes':{},'changes':[]}
sha=lambda b:hashlib.sha256(b).hexdigest()
for file in files:
    old=subprocess.check_output(['git','show',f'{head}:{file}'],cwd=root)
    assert sha(old)==baseline['hashes'][file],(file,'P0 was not the expected source')
    new=(root/file).read_bytes()
    if old==new:continue
    report['beforeHashes'][file]=sha(old);report['afterHashes'][file]=sha(new)
    a=old.decode().splitlines(keepends=True);b=new.decode().splitlines(keepends=True)
    for group in difflib.SequenceMatcher(a=a,b=b,autojunk=False).get_grouped_opcodes(8):
        before=''.join(a[group[0][1]:group[-1][2]]);after=''.join(b[group[0][3]:group[-1][4]])
        assert after and new.decode().count(after)==1,(file,'nonunique fragment')
        report['changes'].append({'id':'HP-REG-01','file':file,'before':before,'after':after,'count':1})
(root/'tests/fixtures/home-performance-changes.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print('Recorded',len(report['changes']),'bounded fragments for',len(report['afterHashes']),'files; previous fixtures unchanged')
