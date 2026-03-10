import{s as a}from"./index-C1KwhtTF.js";async function c(t,r){try{const e=t.name.split(".").pop(),o=`${`${r}/${Date.now()}.${e}`}`,{error:n}=await a.storage.from("status-media").upload(o,t);if(n)throw n;const{data:i}=a.storage.from("status-media").getPublicUrl(o);return{url:i.publicUrl,error:null}}catch(e){return console.error("Error uploading status media:",e),{url:null,error:e.message}}}async function l(t,r,e){console.log("createStatus args:",{userId:t,mediaUrl:r,caption:e});try{const{data:s,error:o}=await a.from("status_updates").insert({user_id:t,media_url:r,caption:e}).select().single();if(o)throw console.error("Supabase CREATE STATUS Error:",JSON.stringify(o,null,2)),o;return{data:s,error:null}}catch(s){return console.error("Error creating status:",s),{data:null,error:s}}}async function d(){try{const{data:t,error:r}=await a.from("status_updates").select(`
                *,
                profiles:user_id (
                    id,
                    full_name,
                    avatar_url
                )
            `).gt("expires_at",new Date().toISOString()).order("created_at",{ascending:!1});if(r)throw r;return{data:t,error:null}}catch(t){return console.error("Error fetching statuses:",t),{data:[],error:t.message}}}async function f(t){try{const{data:r,error:e}=await a.from("status_updates").select("*").eq("user_id",t).gt("expires_at",new Date().toISOString()).order("created_at",{ascending:!0});if(e)throw e;return{data:r,error:null}}catch(r){return console.error("Error fetching user statuses:",r),{data:[],error:r.message}}}async function g(t){try{const{data:r,error:e}=await a.rpc("get_hidden_content_counts",{v_user_id:t});if(e)throw e;return{data:r,error:null}}catch(r){return console.error("Error fetching hidden counts:",r),{data:{hidden_statuses:0,hidden_snapshots:0},error:r.message}}}async function _(t,r){try{const{data:e}=await a.from("statuses").select("user_id").eq("id",t).single();if(e&&e.user_id===r)return;const{error:s}=await a.from("status_views").insert({status_id:t,viewer_id:r}).select().single();s&&s.code!=="23505"&&s.code!=="409"&&console.error("Supabase RECORD VIEW Error:",JSON.stringify(s,null,2))}catch(e){if(e?.message?.includes("409")||e?.code==="409")return;console.error("Error recording status view:",e)}}async function w(t){try{const{data:r,error:e}=await a.from("status_views").select(`
                viewed_at,
                viewer:viewer_id (
                    id,
                    full_name,
                    avatar_url
                )
            `).eq("status_id",t).order("viewed_at",{ascending:!1});if(e)throw e;return{data:r,error:null}}catch(r){return console.error("Error fetching status viewers:",r),{data:[],error:r.message}}}export{f as a,w as b,g as c,l as d,d as g,_ as r,c as u};
