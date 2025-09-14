import{s as a}from"./supabase.DgUsAF8C.js";import{s as i,h as d}from"./modal.DklM8qVP.js";const n=document.getElementById("history-container");async function c(){if(!n)return;const{data:{user:o}}=await a.auth.getUser();if(!o){window.location.href="/login";return}const{data:r,error:e}=await a.from("generated_posts").select("id, created_at, source_url, content").eq("user_id",o.id).order("created_at",{ascending:!1});if(e){n.innerHTML=`<p class="text-red-400">Error loading history: ${e.message}</p>`;return}if(r.length===0){n.innerHTML='<div class="border border-dashed border-border p-8 text-center"><p class="font-mono text-foreground/70">No posts found in your history.</p></div>';return}n.innerHTML=r.map(t=>{const s=t.content?.linkedin?.substring(0,150)||"No preview available";return`
          <div class="history-card border border-border/50 p-4" data-post-id="${t.id}">
            <div class="flex items-start justify-between">
              <div>
                <p class="font-mono text-sm text-foreground/50">${new Date(t.created_at).toLocaleString()}</p>
                <a href="${t.source_url}" target="_blank" rel="noopener noreferrer" class="text-lg font-bold hover:text-primary truncate">${t.source_url}</a>
                <p class="mt-2 text-foreground/80 italic">"${s}..."</p>
              </div>
              <button class="delete-post-btn border border-red-500/50 text-red-400 px-4 py-2 font-mono text-sm uppercase hover:bg-red-500/10">Delete</button>
            </div>
          </div>
        `}).join("")}n?.addEventListener("click",async o=>{const r=o.target;if(r.classList.contains("delete-post-btn")){const e=r.closest(".history-card"),t=e?.dataset.postId;if(!t)return;const s=()=>{d(),l(t,e)};i("// Confirm Deletion",'<p class="text-foreground/80">Are you sure you want to permanently delete this post from your history?</p>',`<button id="cancel-delete-btn" class="border border-border px-4 py-2 font-mono text-sm uppercase hover:bg-gray-800">Cancel</button>
                 <button id="confirm-delete-btn" class="border border-red-500 bg-red-500 px-4 py-2 font-mono text-sm font-bold uppercase text-background">Delete</button>`),document.getElementById("confirm-delete-btn")?.addEventListener("click",s),document.getElementById("cancel-delete-btn")?.addEventListener("click",d)}});async function l(o,r){try{const{error:e}=await a.from("generated_posts").delete().eq("id",o);if(e)throw e;r.remove()}catch(e){alert(`Failed to delete post: ${e.message}`)}}c();
