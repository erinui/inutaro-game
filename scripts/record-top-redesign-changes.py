"""Record reviewed TOP-only fragments without replacing earlier acceptance baselines."""
import difflib
import hashlib
import json
import subprocess
from pathlib import Path

root = Path(__file__).resolve().parent.parent
base = '97ba5f0'
baseline = json.loads((root / 'tests/fixtures/top-redesign-baseline.json').read_text())
sha = lambda value: hashlib.sha256(value).hexdigest()
report = {'design': 'TOP v2 / PC main / 2026-10-18', 'baseCommit': base, 'beforeHashes': {}, 'afterHashes': {}, 'changes': []}
for file in ['index.html', 'home.css', 'home.js', 'scripts/build-site.mjs', 'scripts/lib/home-assets.mjs', 'config/home-performance-assets.json']:
    before = subprocess.check_output(['git', 'show', f'{base}:{file}'], cwd=root)
    after = (root / file).read_bytes()
    if file in baseline['sourceHashes']:
        assert sha(before) == baseline['sourceHashes'][file], file
    report['beforeHashes'][file] = sha(before)
    report['afterHashes'][file] = sha(after)
    old, new = before.decode().splitlines(keepends=True), after.decode().splitlines(keepends=True)
    for group in difflib.SequenceMatcher(a=old, b=new, autojunk=False).get_grouped_opcodes(5):
        original = ''.join(old[group[0][1]:group[-1][2]])
        adopted = ''.join(new[group[0][3]:group[-1][4]])
        assert adopted and after.decode().count(adopted) == 1, (file, 'nonunique fragment')
        report['changes'].append({'file': file, 'before': original, 'after': adopted, 'count': 1})
(root / 'tests/fixtures/top-redesign-changes.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
print('Recorded', len(report['changes']), 'reviewed fragments; previous baselines unchanged')
