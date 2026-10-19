import path from 'node:path';
import {htmlNodes,attrs} from './home-youtube-snapshot.mjs';
export function applyStaticImageMetadata(html,document,manifest){
 const outputs=new Map((manifest.outputs||[]).map(e=>[e.file,e]));
 const edits=[];
 for(const node of htmlNodes(html).filter(n=>n.tag==='img')){
  const url=node.attrs.src;
  if(!url||/^(?:[a-z]+:|\/|#)/i.test(url))continue;
  const source=path.posix.normalize(path.posix.join(path.posix.dirname(document),url.split(/[?#]/)[0]));
  let image=outputs.get(source)||manifest.imageDimensions?.[source],replacement;
  const character='assets/characters/chara_inutaro_origin.png';
  const headerCharacter=manifest.topImageBindings?.[character];
  if(headerCharacter&&(node.parent?.attrs.class||'').split(/\s/).includes('brand')&&[character,manifest.bindings?.[character],headerCharacter].includes(source)){
   image=outputs.get(headerCharacter);replacement=path.posix.relative(path.posix.dirname(document),headerCharacter);
  }
  if(source==='assets/icon-192.png'&&(node.parent?.attrs.class||'').split(/\s/).includes('brand')&&manifest.headerLogo){
   image=manifest.headerLogo;replacement=path.posix.relative(path.posix.dirname(document),image.file);
  }
  if(!image?.width||!image.height)continue;
  const values={width:image.width,height:image.height,decoding:'async'};
  if(replacement)values.src=replacement;
  edits.push({start:node.start,end:node.openEnd,value:attrs(html.slice(node.start,node.openEnd),values)});
 }
 for(const edit of edits.reverse())html=html.slice(0,edit.start)+edit.value+html.slice(edit.end);
 return html;
}
