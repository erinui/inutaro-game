import assert from 'node:assert/strict';
import {test} from 'node:test';
import {fontFacesCss,validateFontPolicy} from '../scripts/lib/home-fonts.mjs';
const policy={layoutFeatures:['liga','kern','rtla']};
test('HP-FONT-02: disjoint faces cover every original codepoint and keep shaping clusters together',()=>{
 const fonts={...policy,expectedCodePoints:[102,105,26085],singleFaceSets:[[102,105]],faces:[{file:'assets/versioned/core.aaaaaaaaaaaaaaaa.woff2',characters:[102,105]},{file:'assets/versioned/jp.bbbbbbbbbbbbbbbb.woff2',characters:[26085]}]};
 const css=fontFacesCss(fonts);
 assert.match(css,/font-display:swap/);assert.match(css,/unicode-range:U\+66,U\+69/);assert.match(css,/core\.aaaaaaaaaaaaaaaa\.woff2/);
 assert.throws(()=>fontFacesCss({...fonts,faces:[fonts.faces[0]]}),/coverage/);
 assert.throws(()=>fontFacesCss({...fonts,faces:[fonts.faces[0],{...fonts.faces[1],characters:[105,26085]}]}),/overlap/);
 assert.throws(()=>fontFacesCss({...fonts,faces:[{...fonts.faces[0],characters:[102]},{...fonts.faces[1],characters:[105,26085]}]}),/cluster/);
});
test('HP-FONT-02: a future vertical/width feature requires regeneration instead of silently using a stripped subset',()=>{
 assert.equal(validateFontPolicy('p{font-family:KeinannPop}',policy),true);
 assert.throws(()=>validateFontPolicy('p{writing-mode:vertical-rl}',policy),/font policy/);
 assert.throws(()=>validateFontPolicy('p{font-feature-settings:"fwid"}',policy),/font policy/);
 assert.throws(()=>validateFontPolicy('p{font-variant-ligatures:discretionary-ligatures}',policy),/font policy/);
});
