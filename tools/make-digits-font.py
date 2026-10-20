"""Builds fonts/db-digits.woff: hand-authored 5x7 pixel digits 0-9 (the bundled pixel font's 5 looks like S).
Layered over Pixelify Sans with a unicode-range @font-face, so only digits come from here. Run: python3 tools/make-digits-font.py"""
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen
D = {
 '0': ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
 '1': ['..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '.###.'],
 '2': ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'],
 '3': ['####.', '....#', '....#', '.###.', '....#', '....#', '####.'],
 '4': ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'],
 '5': ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
 '6': ['..##.', '.#...', '#....', '####.', '#...#', '#...#', '.###.'],
 '7': ['#####', '....#', '...#.', '..#..', '.#...', '.#...', '.#...'],
 '8': ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'],
 '9': ['.###.', '#...#', '#...#', '.####', '....#', '...#.', '.##..'],
}
PX, LSB, ADV, BOLD = 92, 60, 586, 14   # pixel size (font units), left bearing, advance, extra stroke width
names = {c: 'digit_' + c for c in D}
order = ['.notdef', 'space'] + list(names.values())
fb = FontBuilder(1000, isTTF=True)
fb.setupGlyphOrder(order)
fb.setupCharacterMap({0x20: 'space', **{ord(c): n for c, n in names.items()}})
glyphs, metrics = {}, {}
def empty():
    return TTGlyphPen(None).glyph()
glyphs['.notdef'] = empty(); metrics['.notdef'] = (ADV, 0)
glyphs['space'] = empty(); metrics['space'] = (200, 0)
for c, rows in D.items():
    pen = TTGlyphPen(None)
    for j, r in enumerate(rows):
        i = 0
        while i < 5:
            if r[i] != '#': i += 1; continue
            k = i
            while k < 5 and r[k] == '#': k += 1
            x0, x1 = LSB + i * PX - BOLD // 2, LSB + k * PX + BOLD // 2
            y1 = (7 - j) * PX + 1; y0 = (6 - j) * PX - 1    # 1-unit overlap between rows: no seams
            pen.moveTo((x0, y0)); pen.lineTo((x0, y1)); pen.lineTo((x1, y1)); pen.lineTo((x1, y0)); pen.closePath()
            i = k
    glyphs[names[c]] = pen.glyph(); metrics[names[c]] = (ADV, LSB - BOLD // 2)
fb.setupGlyf(glyphs)
fb.setupHorizontalMetrics(metrics)
fb.setupHorizontalHeader(ascent=920, descent=-280)
fb.setupNameTable({'familyName': 'DB Digits', 'styleName': 'Regular'})
fb.setupOS2(sTypoAscender=920, sTypoDescender=-280, usWinAscent=922, usWinDescent=289, sCapHeight=644)
fb.setupPost()
fb.font.flavor = 'woff'
fb.save('fonts/db-digits.woff')
print('ok')
