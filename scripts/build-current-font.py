"""Subset the trusted original font for this release's text; preserve every glyph."""
import json, sys
from pathlib import Path
from fontTools import subset
from fontTools.ttLib import TTFont
root=Path(__file__).resolve().parent.parent
source=root/'assets/fonts/keinann-pop-jp.ttf'
original=TTFont(source,recalcTimestamp=False)
cmap=original.getBestCmap()
policy=json.loads((root/'config/home-font-partitions.json').read_text())
import hashlib
assert hashlib.sha256(source.read_bytes()).hexdigest()==policy['sourceSha256']
# Static TOP/shaping clusters, plus all current externally hydrated card text.
codes=set(policy['groups'][0]['characters'])
for name in ['youtube-latest','note-latest','suzuri-latest','line-stamps']:
    data=json.loads((root/f'assets/home-city/{name}.json').read_text())
    for item in data.get('videos',data.get('items',[])):
        for field in ['title','excerpt','kind']:
            codes.update(map(ord,item.get(field,'') or ''))
codes=sorted(codes & set(cmap))
font=TTFont(source,recalcBBoxes=False,recalcTimestamp=False)
options=subset.Options();options.layout_features=['liga','kern','rtla'];options.name_IDs=['*'];options.name_legacy=True;options.name_languages=['*'];options.glyph_names=True
subsetter=subset.Subsetter(options=options);subsetter.populate(unicodes=codes);subsetter.subset(font)
for table in font['cmap'].tables:
    if table.isUnicode() and hasattr(table,'cmap'):
        table.cmap={c:g for c,g in table.cmap.items() if c in codes}
for field in ['xMin','yMin','xMax','yMax']:setattr(font['head'],field,getattr(original['head'],field))
font.flavor='woff2';font.save(sys.argv[1])
result=TTFont(sys.argv[1],recalcTimestamp=False)
assert set(result.getBestCmap())==set(codes)
for code,glyph in result.getBestCmap().items():
    old=cmap[code]
    assert result['hmtx'][glyph]==original['hmtx'][old],(code,'metrics')
    a,ae,af=result['glyf'][glyph].getCoordinates(result['glyf']);b,be,bf=original['glyf'][old].getCoordinates(original['glyf'])
    assert list(a)==list(b) and list(ae)==list(be) and list(af)==list(bf),(code,'outline')
print(json.dumps(codes))
