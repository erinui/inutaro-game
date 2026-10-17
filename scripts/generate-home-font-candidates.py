"""Generate (never adopt) disjoint complete-coverage WOFF2 partitions."""
import argparse, hashlib, json, re
from pathlib import Path
from html.parser import HTMLParser
from fontTools.ttLib import TTFont
from fontTools import subset, version

class Text(HTMLParser):
    def __init__(self): super().__init__(); self.parts=[]; self.skip=[]
    def handle_starttag(self,tag,attrs):
        if tag in ('script','style'): self.skip.append(tag)
        self.parts.extend(v for k,v in attrs if k in ('alt','aria-label','title') and v)
    def handle_endtag(self,tag):
        if self.skip and self.skip[-1]==tag:self.skip.pop()
    def handle_data(self,data):
        if not self.skip:self.parts.append(data)

p=argparse.ArgumentParser();p.add_argument('output');p.add_argument('--partition');p.add_argument('--chunk',type=int,default=128);p.add_argument('--page-groups',action='store_true');p.add_argument('--horizontal-only',action='store_true');args=p.parse_args()
root=Path(__file__).resolve().parent.parent;out=Path(args.output);out.mkdir(parents=True,exist_ok=True)
source=root/'assets/fonts/keinann-pop-jp.ttf';original=TTFont(source,recalcTimestamp=False);cmap=original.getBestCmap()
texts=[];top=[]
for name in ['index.html','games/index.html',*[f'pages/{n}.html' for n in ['characters','blog','illustrations','terms','privacy']]]:
    parser=Text();parser.feed((root/name).read_text());texts.extend(parser.parts)
    if name=='index.html':top.extend(parser.parts)
for name in ['home.js','site-nav.js','site-migration.js','home.css']:
    text=(root/name).read_text();parts=re.findall(r'[\u3000-\u9fff\uff00-\uffef]+',text);texts.extend(parts);top.extend(parts)
core=sorted(set(map(ord,''.join(texts))) & set(cmap));remaining=sorted(set(cmap)-set(core))
groups=[('core',core)]+[(f'other-{i//args.chunk:03d}',remaining[i:i+args.chunk]) for i in range(0,len(remaining),args.chunk)]
if args.page_groups:
    # Keep Latin kerning/ligatures, Japanese combining clusters and punctuation
    # in one face instead of splitting a shaped run across arbitrary chunks.
    first_codes=set(map(ord,''.join(top))) | set(range(0x20,0x530)) | set(range(0xff61,0xffa0)) | set(range(0x3000,0x3100)) | {0xff01,0xff1f}
    first=sorted(first_codes & set(cmap)); used=set(first);groups=[('core-top',first)]
    known=[]
    for name in ['youtube-latest','note-latest','suzuri-latest','line-stamps']:
        data=json.loads((root/f'assets/home-city/{name}.json').read_text())
        for item in data.get('videos',data.get('items',[])):
            known.extend([item.get('title',''),item.get('excerpt',''),item.get('kind','')])
    frequency={c:''.join(known).count(chr(c)) for c in set(map(ord,''.join(known))) & set(cmap)-used}
    dynamic=sorted(frequency,key=lambda c:(-frequency[c],c))
    for label,codes in [('common',dynamic),('static',sorted(set(core)-used-set(dynamic)))]:
        for i in range(0,len(codes),args.chunk):groups.append((f'{label}-{i//args.chunk:03d}',codes[i:i+args.chunk]));used.update(codes[i:i+args.chunk])
    rest=sorted(set(cmap)-used)
    groups.extend((f'other-{i//args.chunk:03d}',rest[i:i+args.chunk]) for i in range(0,len(rest),args.chunk))
if args.partition:
    frozen=json.loads(Path(args.partition).read_text());assert frozen['sourceSha256']==hashlib.sha256(source.read_bytes()).hexdigest(),'source changed'
    groups=[(g['name'],g['characters']) for g in frozen['groups']]
    args.horizontal_only=frozen['layoutFeatures']==['liga','kern','rtla']
result={'sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'fontTools':version,'chunk':args.chunk,'layoutFeatures':['liga','kern','rtla'] if args.horizontal_only else ['*'],'globalBoundsPreserved':True,'sourceCharacters':len(cmap),'groups':[]}
covered=set()
for name,characters in groups:
    font=TTFont(source,recalcBBoxes=False,recalcTimestamp=False)
    options=subset.Options();options.layout_features=['liga','kern','rtla'] if args.horizontal_only else ['*'];options.name_IDs=['*'];options.name_legacy=True;options.name_languages=['*'];options.glyph_names=True
    tool=subset.Subsetter(options=options);tool.populate(unicodes=characters);tool.subset(font)
    # Layout closure can preserve aliases of a retained glyph. Keep the glyph
    # dependency but partition its Unicode mapping into exactly one face.
    for table in font['cmap'].tables:
        if table.isUnicode() and hasattr(table,'cmap'):
            table.cmap={code:glyph for code,glyph in table.cmap.items() if code in characters}
    for field in ['xMin','yMin','xMax','yMax']:
        setattr(font['head'],field,getattr(original['head'],field))
    font.flavor='woff2'
    filename=out/f'keinann-pop-jp-{name}.woff2';font.save(filename)
    candidate=TTFont(filename,recalcTimestamp=False);newmap=candidate.getBestCmap()
    assert set(newmap)==set(characters),(name,'cmap changed')
    assert not covered.intersection(newmap),'overlap';covered.update(newmap)
    for code,glyph in newmap.items():
        old=cmap[code]
        assert candidate['hmtx'][glyph]==original['hmtx'][old],(name,code,'metrics')
        a,ae,af=candidate['glyf'][glyph].getCoordinates(candidate['glyf']);b,be,bf=original['glyf'][old].getCoordinates(original['glyf'])
        assert list(a)==list(b) and list(ae)==list(be) and list(af)==list(bf),(name,code,'outline')
    result['groups'].append({'name':name,'file':str(filename),'bytes':filename.stat().st_size,'sha256':hashlib.sha256(filename.read_bytes()).hexdigest(),'characters':characters,'unicodeRange':','.join(f'U+{c:X}' for c in characters)})
assert covered==set(cmap),'coverage loss'
result['coverageMetricsOutlinesEqual']=True
(out/'font-report.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'coreCharacters':len(result['groups'][0]['characters']),'coreBytes':result['groups'][0]['bytes'],'groups':len(groups),'allBytes':sum(g['bytes'] for g in result['groups']),'coverageMetricsOutlinesEqual':True}))
