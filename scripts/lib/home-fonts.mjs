import path from 'node:path';
export function validateFontPolicy(css,policy){
 if(JSON.stringify(policy?.layoutFeatures)!==JSON.stringify(['liga','kern','rtla']))throw new Error('Unsupported font policy');
 const clean=css.replace(/\/\*[\s\S]*?\*\//g,'');
 if(/writing-mode\s*:\s*(?!horizontal-tb)[\w-]+|font-feature-settings\s*:|font-variant-(?:ligatures|east-asian|caps|alternates)\s*:/i.test(clean))throw new Error('CSS exceeds horizontal font policy; regenerate and verify fonts');
 return true;
}
export function fontFacesCss(fonts){
 const covered=new Set(),owner=new Map();
 for(const [index,face] of fonts.faces.entries()){
  if(!/^assets\/versioned\/[\w.-]+\.[a-f0-9]{16}\.woff2$/.test(face.file)||!Array.isArray(face.characters)||!face.characters.length)throw new Error('Invalid font face');
  for(const c of face.characters){
   if(!Number.isInteger(c)||c<0||c>0x10ffff)throw new Error('Invalid codepoint');
   if(covered.has(c))throw new Error('Font overlap');covered.add(c);owner.set(c,index);
  }
 }
 const expected=new Set(fonts.expectedCodePoints);
 if(covered.size!==expected.size||[...covered].some(c=>!expected.has(c)))throw new Error('Font coverage differs');
 for(const cluster of fonts.singleFaceSets||[])if(new Set(cluster.filter(c=>expected.has(c)).map(c=>owner.get(c))).size>1)throw new Error('Font cluster split');
 return fonts.faces.map(face=>`@font-face{font-family:"KeinannPop";font-style:normal;font-weight:400;font-display:swap;src:url("${path.posix.basename(face.file)}") format("woff2");unicode-range:${face.characters.map(c=>`U+${c.toString(16).toUpperCase()}`).join(',')};}`).join('\n');
}
