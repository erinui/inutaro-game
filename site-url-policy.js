// Shared by collectors, build and browser. No data from remote responses becomes code.
(function(scope){
 const policy={
  youtube:{host:'www.youtube.com',path:/^\/(?:watch|channel\/[A-Za-z0-9_-]+|@[\w%.-]+)\/?$/},
  note:{host:'note.com',path:/^\/erinui(?:\/n\/n[a-z0-9]+)?\/?$/},
  suzuri:{host:'suzuri.jp',path:/^\/erikanuinui(?:\/[A-Za-z0-9_./-]+)?\/?$/},
  line:{host:'store.line.me',path:/^\/(?:emojishop|stickershop)\/(?:author|product)\/[a-f0-9]+(?:\/[a-z]+)?\/?$/}
 };
 function valid(value,provider){
  try{const u=new URL(value),p=policy[provider];return typeof value==='string'&&value.length<=4096&&u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&!!p&&u.hostname===p.host&&p.path.test(u.pathname)&&(provider!=='youtube'||u.pathname!=='/watch'||/^[A-Za-z0-9_-]{1,80}$/.test(u.searchParams.get('v')||''));}catch{return false;}
 }
 function image(value,provider){
  if(typeof value!=='string'||value.length>4096)return false;
  if(/^assets\/home-city\/(?:note-thumb-[1-6]\.(?:png|jpg|webp)|youtube-thumb-(?:[1-5]\.jpg|[A-Za-z0-9_-]{1,80}-[a-f0-9]{16}\.webp))(?:\?v=[A-Za-z0-9_-]+)?$/.test(value))return true;
  try{const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password||u.port)return false;
   return provider==='youtube'?u.hostname==='i.ytimg.com'&&/^\/vi(?:_webp)?\/[A-Za-z0-9_-]{1,80}\/[a-z0-9_]+\.(jpg|webp)$/.test(u.pathname):provider==='suzuri'?u.hostname==='lens.suzuri.jp'&&u.pathname.startsWith('/v3/'):provider==='line'?u.hostname==='stickershop.line-scdn.net'&&/^\/(?:stickershop|sticonshop)\/v1\/product\/[a-f0-9]+\//.test(u.pathname):false;
  }catch{return false;}
 }
 scope.InutaroUrlPolicy=Object.freeze({valid,image});
})(globalThis);
