import{s,a9 as c}from"./index-BUyIlKBv.js";async function l(t,e){try{let r=t,a=t.name?.split(".")?.pop()||"tmp";t.type?.startsWith("image/")&&(r=await c(t,{maxWidth:1080,targetSizeKB:120}),a=r.type==="image/webp"?"webp":a);const n=`${`${e}/${Date.now()}.${a}`}`,{error:i}=await s.storage.from("status-media").upload(n,r);if(i)throw i;const{data:u}=s.storage.from("status-media").getPublicUrl(n);return{url:u.publicUrl,error:null}}catch(r){return console.error("Error uploading status media:",r),{url:null,error:r.message}}}async function f(t,e,r){console.log("createStatus args:",{userId:t,mediaUrl:e,caption:r});try{const{data:a,error:o}=await s.from("status_updates").insert({user_id:t,media_url:e,caption:r}).select().single();if(o)throw console.error("Supabase CREATE STATUS Error:",JSON.stringify(o,null,2)),o;return{data:a,error:null}}catch(a){return console.error("Error creating status:",a),{data:null,error:a}}}async function g(){try{const{data:t,error:e}=await s.from("status_updates").select(`
                *,
                profiles:user_id (
                    id,
                    full_name,
                    avatar_url,
                    is_shadow_banned,
                    is_banned
                )
            `).gt("expires_at",new Date().toISOString()).order("created_at",{ascending:!1});if(e)throw e;return{data:(t||[]).filter(a=>{const o=a.profiles;return o&&!o.is_shadow_banned&&!o.is_banned}),error:null}}catch(t){return console.error("Error fetching statuses:",t),{data:[],error:t.message}}}async function _(t){try{const{data:e,error:r}=await s.from("status_updates").select("*").eq("user_id",t).gt("expires_at",new Date().toISOString()).order("created_at",{ascending:!0});if(r)throw r;return{data:e,error:null}}catch(e){return console.error("Error fetching user statuses:",e),{data:[],error:e.message}}}async function w(t){try{const{data:e,error:r}=await s.rpc("get_hidden_content_counts",{v_user_id:t});if(r)throw r;return{data:e,error:null}}catch(e){return console.error("Error fetching hidden counts:",e),{data:{hidden_statuses:0,hidden_snapshots:0},error:e.message}}}async function m(t,e){try{const{data:r}=await s.from("statuses").select("user_id").eq("id",t).single();if(r&&r.user_id===e)return;const{error:a}=await s.from("status_views").insert({status_id:t,viewer_id:e}).select().single();a&&a.code!=="23505"&&a.code!=="409"&&console.error("Supabase RECORD VIEW Error:",JSON.stringify(a,null,2))}catch(r){if(r?.message?.includes("409")||r?.code==="409")return;console.error("Error recording status view:",r)}}async function p(t){try{const{data:e,error:r}=await s.from("status_views").select(`
                viewed_at,
                viewer:viewer_id (
                    id,
                    full_name,
                    avatar_url
                )
            `).eq("status_id",t).order("viewed_at",{ascending:!1});if(r)throw r;return{data:e,error:null}}catch(e){return console.error("Error fetching status viewers:",e),{data:[],error:e.message}}}export{_ as a,p as b,w as c,f as d,g,m as r,l as u};
