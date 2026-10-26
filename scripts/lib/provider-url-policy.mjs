import '../../site-url-policy.js';
export const validPublicUrl=(value,provider)=>globalThis.InutaroUrlPolicy.valid(value,provider);
const rules={
 youtubeApi:u=>u.hostname==='www.googleapis.com'&&/^\/youtube\/v3\/(channels|playlistItems|videos)$/.test(u.pathname),
 youtubeImage:u=>u.hostname==='i.ytimg.com'&&/^\/vi(?:_webp)?\/[A-Za-z0-9_-]{1,80}\/[a-z0-9_]+\.(jpg|webp)$/.test(u.pathname),
 noteFeed:u=>u.hostname==='note.com'&&u.pathname==='/erinui/rss',
 noteArticle:u=>validPublicUrl(u.href,'note')&&/^\/erinui\/n\//.test(u.pathname),
 noteImage:u=>(u.hostname==='assets.st-note.com'&&u.pathname.startsWith('/img/'))||(u.hostname==='d2l930y2yx77uc.cloudfront.net'&&u.pathname.startsWith('/production/social_images/')),
 suzuriApi:u=>u.hostname==='suzuri.jp'&&u.pathname==='/api/v1/products',
};
export function validRemoteUrl(value,kind){
 try{const u=new URL(value);return typeof value==='string'&&value.length<=4096&&u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&!!rules[kind]?.(u);}catch{return false;}
}
export function validThumbnail(value,provider){
 if(typeof value!=='string')return false;
 if(provider==='youtube')return validRemoteUrl(value,'youtubeImage');
 if(provider==='suzuri'){try{const u=new URL(value);return u.protocol==='https:'&&u.hostname==='lens.suzuri.jp'&&!u.username&&!u.password&&!u.port&&u.pathname.startsWith('/v3/');}catch{return false;}}
 return false;
}
