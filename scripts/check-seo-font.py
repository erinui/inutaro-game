"""Recompress the complete JP font and verify coverage, metrics and outlines."""
import argparse
import hashlib
import json
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.ttLib.woff2 import compress

parser = argparse.ArgumentParser()
parser.add_argument("source")
parser.add_argument("candidate")
parser.add_argument("report")
args = parser.parse_args()
compress(args.source, args.candidate)


def signature(filename):
    font = TTFont(filename, recalcBBoxes=False, recalcTimestamp=False)
    glyphs = {}
    for name in font.getGlyphOrder():
        glyph = font["glyf"][name]
        coordinates, ends, flags = glyph.getCoordinates(font["glyf"])
        glyphs[name] = {
            "coordinates": list(map(list, coordinates)),
            "ends": list(ends), "flags": list(flags),
            "program": list(glyph.program.getBytecode()) if hasattr(glyph, "program") else [],
        }
    result = {
        "cmap": font.getBestCmap(), "order": font.getGlyphOrder(),
        "metrics": font["hmtx"].metrics, "glyphs": glyphs,
        "names": [(n.nameID, n.platformID, n.platEncID, n.langID, n.toUnicode()) for n in font["name"].names],
        "layout": {tag: font.getTableData(tag).hex() for tag in ["GSUB", "GPOS", "kern", "OS/2", "hhea"] if tag in font},
    }
    font.close()
    return result


before = signature(args.source)
after = signature(args.candidate)
for key in before:
    assert before[key] == after[key], f"Font signature changed: {key}"
digest = hashlib.sha256(json.dumps(before, ensure_ascii=True, sort_keys=True).encode()).hexdigest()
report = {
    "sourceSha256": hashlib.sha256(Path(args.source).read_bytes()).hexdigest(),
    "candidateSha256": hashlib.sha256(Path(args.candidate).read_bytes()).hexdigest(),
    "candidateBytes": Path(args.candidate).stat().st_size,
    "glyphCount": len(before["order"]), "characters": len(before["cmap"]),
    "coverageMetricsOutlinesNamesLayoutEqual": True, "signatureSha256": digest,
}
Path(args.report).write_text(json.dumps(report, indent=2) + "\n")
print(json.dumps(report))
