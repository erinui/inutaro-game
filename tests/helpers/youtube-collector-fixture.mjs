// Imported in a child process; it never makes network requests.
globalThis.fetch=async input=>{
 const url=new URL(input);
 if(url.hostname==='fixture.invalid')return new Response(Buffer.from(process.env.FIXTURE_JPEG_BASE64,'base64'),{headers:{'Content-Type':'image/jpeg'}});
 if(url.pathname.endsWith('/channels'))return Response.json({items:[{id:'channel',snippet:{title:'Fixture channel'},contentDetails:{relatedPlaylists:{uploads:'playlist'}},statistics:{subscriberCount:'100',videoCount:'6'}}]});
 if(url.pathname.endsWith('/playlistItems'))return Response.json({items:Array.from({length:6},(_,i)=>({snippet:{title:`動画${i}`,publishedAt:'2026-10-17T00:00:00Z',thumbnails:{maxres:{url:`https://fixture.invalid/${i}.jpg`,width:1280,height:720}}},contentDetails:{videoId:`video_${i}`}}))});
 throw new Error('Unexpected fixture URL');
};
