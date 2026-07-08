import{s,z as c}from"./index-KurDbhYo.js";async function d(t,r){try{let e=t,a=t.name?.split(".")?.pop()||"tmp";t.type?.startsWith("image/")&&(e=await c(t,{maxWidth:1080,targetSizeKB:120}),a=e.type==="image/webp"?"webp":a);const n=`${`${r}/${Date.now()}.${a}`}`,{error:i}=await s.storage.from("status-media").upload(n,e);if(i)throw i;const{data:u}=s.storage.from("status-media").getPublicUrl(n);return{url:u.publicUrl,error:null}}catch(e){return console.error("Error uploading status media:",e),{url:null,error:e.message}}}async function g(t,r,e){console.log("createStatus args:",{userId:t,mediaUrl:r,caption:e});try{const{data:a,error:o}=await s.from("status_updates").insert({user_id:t,media_url:r,caption:e}).select().single();if(o)throw console.error("Supabase CREATE STATUS Error:",JSON.stringify(o,null,2)),o;return{data:a,error:null}}catch(a){return console.error("Error creating status:",a),{data:null,error:a}}}async function f(){try{const{data:t,error:r}=await s.from("status_updates").select(`
                *,
                profiles:user_id (
                    id,
                    full_name,
                    avatar_url
                )
            `).gt("expires_at",new Date().toISOString()).order("created_at",{ascending:!1});if(r)throw r;return{data:t,error:null}}catch(t){return console.error("Error fetching statuses:",t),{data:[],error:t.message}}}async function _(t){try{const{data:r,error:e}=await s.from("status_updates").select("*").eq("user_id",t).gt("expires_at",new Date().toISOString()).order("created_at",{ascending:!0});if(e)throw e;return{data:r,error:null}}catch(r){return console.error("Error fetching user statuses:",r),{data:[],error:r.message}}}async function m(t){try{const{data:r,error:e}=await s.rpc("get_hidden_content_counts",{v_user_id:t});if(e)throw e;return{data:r,error:null}}catch(r){return console.error("Error fetching hidden counts:",r),{data:{hidden_statuses:0,hidden_snapshots:0},error:r.message}}}async function w(t,r){try{const{data:e}=await s.from("statuses").select("user_id").eq("id",t).single();if(e&&e.user_id===r)return;const{error:a}=await s.from("status_views").insert({status_id:t,viewer_id:r}).select().single();a&&a.code!=="23505"&&a.code!=="409"&&console.error("Supabase RECORD VIEW Error:",JSON.stringify(a,null,2))}catch(e){if(e?.message?.includes("409")||e?.code==="409")return;console.error("Error recording status view:",e)}}async function p(t){try{const{data:r,error:e}=await s.from("status_views").select(`
                viewed_at,
                viewer:viewer_id (
                    id,
                    full_name,
                    avatar_url
                )
            `).eq("status_id",t).order("viewed_at",{ascending:!1});if(e)throw e;return{data:r,error:null}}catch(r){return console.error("Error fetching status viewers:",r),{data:[],error:r.message}}}export{_ as a,p as b,m as c,g as d,f as g,w as r,d as u};
