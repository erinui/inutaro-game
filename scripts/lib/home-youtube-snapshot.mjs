import {validPublicUrl,validThumbnail} from './provider-url-policy.mjs';
import {sha256} from './home-assets.mjs';
const escape=text=>String(text).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const channel='https://www.youtube.com/@%E3%81%88%E3%82%8A%E3%81%AC%E3%81%84';
const voidTags=new Set(['area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr']);
// A span-preserving tokenizer for the project's well-formed HTML templates.
// It never serializes unrelated markup, scripts, metadata or text.
export function htmlNodes(html){
 const nodes=[],stack=[];let cursor=0;
 while(cursor<html.length){
  const start=html.indexOf('<',cursor);if(start<0)break;
  if(html.startsWith('<!--',start)){const end=html.indexOf('-->',start+4);if(end<0)throw new Error('Unclosed comment');cursor=end+3;continue;}
  let end=start+1,quote=null;
  for(;end<html.length;end++){const c=html[end];if(quote){if(c===quote)quote=null;}else if(c==='"'||c==="'")quote=c;else if(c==='>')break;}
  if(end===html.length)throw new Error('Unclosed HTML tag');
  const raw=html.slice(start,end+1),match=/^<\s*(\/?)\s*([a-z][\w:-]*)/i.exec(raw);cursor=end+1;
  if(!match)continue;
  const tag=match[2].toLowerCase();
  if(match[1]){
   const at=stack.findLastIndex(n=>n.tag===tag);if(at<0)throw new Error(`Unbalanced closing tag: ${tag}`);
   const node=stack[at];node.endStart=start;node.end=end+1;stack.length=at;continue;
  }
  const attrs={};
  const content=raw.slice(match[0].length,-1);
  for(const a of content.matchAll(/([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g))attrs[a[1].toLowerCase()]=a[2]??a[3]??a[4]??'';
  const node={tag,attrs,start,openEnd:end+1,endStart:end+1,end:end+1,parent:stack.at(-1)};nodes.push(node);
  if(!voidTags.has(tag)&&!raw.endsWith('/>')){
   if(tag==='script'||tag==='style'){
    const close=new RegExp(`</${tag}\\s*>`,'ig');close.lastIndex=cursor;const found=close.exec(html);if(!found)throw new Error('Unclosed raw text tag');node.endStart=found.index;node.end=close.lastIndex;cursor=node.end;
   }else stack.push(node);
  }
 }
 if(stack.length)throw new Error('Unclosed template element');
 return nodes;
}
export function attrs(raw,values){
 for(const [name,value] of Object.entries(values)){
  const pattern=new RegExp(`\\s${name}(?:\\s*=\\s*(?:"[^"]*"|'[^']*'|[^\\s>]+))?(?=\\s|/?>)`,'i');
  raw=raw.replace(pattern,'');
  if(value!==null)raw=raw.replace(/\s*\/?>$/,ending=>` ${name}="${escape(value)}"${ending}`);
 }
 return raw;
}
export function youtubeThumbnail(video,schemaVersion){
 if(video?.localThumbnail){
  const t=video.localThumbnail,id=video.id;
  if(!/^[A-Za-z0-9_-]{1,80}$/.test(id||'')||! /^[a-f0-9]{64}$/.test(t.sha256||'')||t.url!==`assets/home-city/youtube-thumb-${id}-${t.sha256.slice(0,16)}.webp`||!Number.isInteger(t.width)||!Number.isInteger(t.height)||t.width<1||t.height<1)throw new Error('Invalid local thumbnail identity');
  return t;
 }
 if(schemaVersion===2&&video?.thumbnail)throw new Error('Missing local thumbnail');
 const url=video?.thumbnail?.url;
 if(!url)return null;
 if(!validThumbnail(url,'youtube'))throw new Error('Invalid thumbnail URL');
 return {url,width:video.thumbnail.width||640,height:video.thumbnail.height||360};
}
export function createYoutubeSnapshot(html,data){
 if(data?.ok!==true||!Array.isArray(data.videos))throw new Error('Invalid YouTube snapshot');
 // Validate the whole bootstrap, including items beyond the visible slots.
 for(const video of data.videos)youtubeThumbnail(video,data.schemaVersion);
 const nodes=htmlNodes(html),edits=[];
 const patch=(start,end,value)=>edits.push({start,end,value});
 const root=nodes.find(n=>n.tag==='html');
 if(!root)throw new Error('Missing document root');
 patch(root.start,root.openEnd,attrs(html.slice(root.start,root.openEnd),{'data-youtube-snapshot':sha256(JSON.stringify(data))}));
 const head=nodes.find(n=>n.tag==='head');
 if(!head)throw new Error('Missing document head');
 const bootstrap=JSON.stringify(data).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
 patch(head.endStart,head.endStart,`<script type="application/json" id="home-youtube-snapshot-data">${bootstrap}</script>`);
 for(const node of nodes.filter(n=>'data-latest-video-index' in n.attrs)){
  const index=Number(node.attrs['data-latest-video-index']);
  if(!Number.isInteger(index)||index<0||index>5)throw new Error('Invalid video slot');
  const video=data.videos[index],image=video?youtubeThumbnail(video,data.schemaVersion):null;
  if(node.tag==='img'){
   const active=(node.attrs.class||'').split(/\s/).includes('is-active');
   patch(node.start,node.openEnd,attrs(html.slice(node.start,node.openEnd),{src:active&&image?image.url:null,'data-src':!active&&image?image.url:null,'data-video-id':video?.id||null,width:image?.width||640,height:image?.height||360,decoding:'async'}));
  }else if(node.tag==='a'){
   if(!video&&(data.videos.length||index>0)){patch(node.start,node.end,'');continue;}
   if(video&&!validPublicUrl(video.url,'youtube'))throw new Error('Invalid video link');
   patch(node.start,node.openEnd,attrs(html.slice(node.start,node.openEnd),{href:video?.url||channel,'data-video-id':video?.id||null,'aria-label':`${video?.title||'YouTube'}を開く`}));
   const children=nodes.filter(n=>n.start>node.start&&n.end<node.end);
   const title=children.find(n=>n.tag==='h3');if(title)patch(title.openEnd,title.endStart,escape(video?.title||'YouTubeでみる'));
   const media=children.find(n=>n.tag==='img');
   if(media)patch(media.start,media.openEnd,image?attrs(html.slice(media.start,media.openEnd),{src:image.url,width:image.width,height:image.height,alt:`${video.title}の画像`,loading:'lazy',decoding:'async'}):'<div class="content-card-media content-card-media-placeholder" aria-hidden="true">YOUTUBE</div>');
  }else throw new Error('Unsupported video slot element');
 }
 const stats=data.channel?.statistics||{};
 for(const node of nodes){
  const classes=(node.attrs.class||'').split(/\s/);
  if(classes.includes('youtube-stat-subscribers'))patch(node.openEnd,node.endStart,stats.hiddenSubscriberCount||stats.subscriberCount==null?'公開まち':`約${new Intl.NumberFormat('ja-JP').format(Number(stats.subscriberCount)||0)}人`);
  if(classes.includes('youtube-stat-videos'))patch(node.openEnd,node.endStart,`動画：${new Intl.NumberFormat('ja-JP').format(Number(stats.videoCount)||0)}本`);
 }
 edits.sort((a,b)=>b.start-a.start);let last=html.length;
 for(const e of edits){if(e.end>last)throw new Error('Overlapping snapshot slots');html=html.slice(0,e.start)+e.value+html.slice(e.end);last=e.start;}
 return html;
}
