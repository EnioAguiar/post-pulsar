import{s as u}from"./supabase.Ty5CJG7r.js";import{s as z,h as T,a as Y,u as l}from"./modal.BoKJFjDT.js";const B=document.getElementById("pulse-count-display"),S=document.getElementById("plan-display"),V=document.getElementById("pulsar-form"),p=document.getElementById("content-output"),G=document.getElementById("post-url"),Q=document.getElementById("content-language"),Z=document.getElementById("hashtag-language"),x=V?.querySelector("button[type='submit']"),N=document.getElementById("advanced-settings-toggle"),H=document.getElementById("advanced-settings-panel"),M=document.getElementById("linkedin-char-count"),y=document.getElementById("twitter-char-count"),q=document.getElementById("instagram-char-count"),R=document.getElementById("threads-char-count"),A=document.getElementById("facebook-char-count"),O=document.getElementById("pinterest-char-count"),w=document.getElementById("twitter-premium-check"),c=document.getElementById("save-prefs-btn");let _=0,C={},P=null,U="free";async function ee(){const{data:{session:e},error:t}=await u.auth.getSession();if(t||!e){window.location.href="/login";return}P=e.user.id;const[o,n]=await Promise.all([u.from("profiles").select("monthly_pulses_remaining, plan_type, default_linkedin_chars, default_twitter_chars, default_instagram_chars, default_threads_chars, default_facebook_chars, default_pinterest_chars").eq("id",P).single(),u.from("generated_posts").select("content").eq("user_id",P).order("created_at",{ascending:!1}).limit(1).single()]),{data:r,error:a}=o;if(a||!r){console.error("Error fetching profile:",a),B&&(B.innerText="Error"),S&&(S.innerText="Error");return}_=r.monthly_pulses_remaining,U=(r.plan_type||"free").replace(/'/g,""),F(_),S&&(S.innerText=U.toUpperCase()),r.default_linkedin_chars&&(M.value=String(r.default_linkedin_chars)),r.default_twitter_chars&&(y.value=String(r.default_twitter_chars),r.default_twitter_chars>280&&(w.checked=!0,J())),r.default_instagram_chars&&(q.value=String(r.default_instagram_chars)),r.default_threads_chars&&(R.value=String(r.default_threads_chars)),r.default_facebook_chars&&(A.value=String(r.default_facebook_chars)),r.default_pinterest_chars&&(O.value=String(r.default_pinterest_chars));const{data:s}=n;s&&s.content?X(s.content):W(U)}function W(e){const t=document.querySelectorAll(".image-feature"),o=document.querySelectorAll(".video-feature"),n=e==="basic"||e==="pro",r=e==="pro";t.forEach(a=>a.classList.toggle("hidden",!n)),o.forEach(a=>a.classList.toggle("hidden",!r))}function F(e){B&&(B.innerText=e===-1?"∞":e.toString())}async function te(e){if(e.preventDefault(),C={},!x||!p||!G)return;x.setAttribute("disabled","true"),x.innerHTML="PULSING...";const t=["Transmitting signal...","Analyzing article...","Engaging AI model...","Calibrating social matrix...","Generating content...","Finalizing transmission..."];let o=0;p.innerHTML=`<div class="border border-dashed border-border p-8 text-center"><p class="font-mono text-foreground/70">[PULSING] :: ${t[0]}</p></div>`;const n=p.querySelector("p"),r=setInterval(()=>{o=(o+1)%t.length,n&&(n.textContent=`[PULSING] :: ${t[o]}`)},2500);try{const a={url:G.value,contentLanguage:Q.value,hashtagLanguage:Z.value};M.value&&(a.linkedInCharCount=parseInt(M.value,10)),y.value&&(a.twitterCharCount=parseInt(y.value,10)),q.value&&(a.instagramCharCount=parseInt(q.value,10)),R.value&&(a.threadsCharCount=parseInt(R.value,10)),A.value&&(a.facebookCharCount=parseInt(A.value,10)),O.value&&(a.pinterestCharCount=parseInt(O.value,10));const{data:s,error:d}=await u.functions.invoke("pulsar-v1",{body:a});if(d)throw d;_--,F(_);const{generatedContent:i}=s;X(i)}catch(a){const s=a;p&&(p.innerHTML=`<div class="border border-red-500/50 p-8 text-center"><p class="font-mono font-bold text-red-400">[ERROR]</p><p class="font-mono text-foreground/70 mt-2">${s.message}</p></div>`)}finally{clearInterval(r),x&&(x.removeAttribute("disabled"),x.innerHTML="Pulsar &gt;&gt;")}}async function re(){const{data:e,error:t}=await u.from("social_connections").select("provider_user_id, provider_user_name").eq("provider","facebook");if(t){console.error("Error fetching Facebook pages:",t);return}if(e&&e.length>1){const o=document.querySelector(".facebook-page-selector-container");if(!o)return;const n=e.map(r=>`<option value="${r.provider_user_id}">${r.provider_user_name}</option>`).join("");o.innerHTML=`
        <select id="facebook-page-selector" class="w-full rounded-none border border-border bg-background p-2 font-mono text-sm focus:border-primary focus:outline-none focus:ring-0">
          <option value="" disabled selected>Select a Page...</option>
          ${n}
        </select>
      `}}function X(e){const t=n=>`
        <div class="mb-4 image-feature" data-network="${n}">
          <p class="mb-2 block font-mono text-sm uppercase text-foreground/70">// Upload Image (Optional)</p>
          <label for="image-upload-${n}" class="media-upload-label w-full cursor-pointer border border-border bg-transparent p-3 font-mono text-sm uppercase text-foreground transition-colors hover:bg-border/50 inline-block text-center">
            Choose Image
          </label>
          <input type="file" id="image-upload-${n}" class="media-upload-input hidden" accept="image/jpeg,image/png">
          <p class="mt-2 font-mono text-xs text-foreground/50">Max size: 2MB. Accepted: JPG, PNG.</p>
          <div class="media-preview-container relative mt-2 hidden w-fit">
            <img src="#" alt="Image Preview" class="image-preview hidden max-h-40 border border-border"/>
            <button type="button" class="remove-media-btn absolute top-0 right-0 m-1 rounded-full bg-black/50 p-1 text-white hover:bg-black/80">X</button>
          </div>
        </div>
      `,o=n=>`
        <div class="mb-4 video-feature" data-network="${n}">
          <p class="mb-2 block font-mono text-sm uppercase text-foreground/70">// Upload Video (Optional)</p>
          <label for="video-upload-${n}" class="media-upload-label w-full cursor-pointer border border-border bg-transparent p-3 font-mono text-sm uppercase text-foreground transition-colors hover:bg-border/50 inline-block text-center">
            Choose Video
          </label>
          <input type="file" id="video-upload-${n}" class="media-upload-input hidden" accept="video/mp4,video/quicktime">
          <p class="mt-2 font-mono text-xs text-foreground/50">Max size: 20MB. Accepted: MP4, MOV.</p>
          <div class="media-preview-container relative mt-2 hidden w-fit">
            <video src="#" controls class="video-preview hidden max-h-40 border border-border"></video>
            <button type="button" class="remove-media-btn absolute top-0 right-0 m-1 rounded-full bg-black/50 p-1 text-white hover:bg-black/80">X</button>
          </div>
        </div>
      `;p&&(p.innerHTML=`
          <h2 class="text-2xl font-bold uppercase">// Transmission Received</h2>
          <div class="mt-4 space-y-6">
            ${e.linkedIn?`<div data-network="linkedin">
              <h3 class="font-mono text-lg text-primary">// LinkedIn Post</h3>
              <div class="relative mt-2">
                ${t("linkedin")}
                ${o("linkedin")}
                <textarea id="linkedin-textarea" class="h-48 w-full rounded-none border border-border bg-background p-4 font-mono text-base focus:border-primary focus:outline-none focus:ring-0">${e.linkedIn}</textarea>
                <div class="mt-2 flex gap-2">
                  <button class="publish-btn border border-border px-4 py-2 font-mono text-sm uppercase hover:bg-primary hover:text-background disabled:cursor-not-allowed disabled:bg-gray-500" data-network="linkedin">Post to LinkedIn</button>
                  <button class="copy-btn border border-border px-4 py-2 font-mono text-sm uppercase hover:bg-primary hover:text-background">Copy Text</button>
                </div>
              </div>
            </div>`:""}
            ${e.twitter?`<div data-network="twitter">
              <h3 class="font-mono text-lg text-primary">// X (Twitter) Post</h3>
              <div class="relative mt-2">
                ${t("twitter")}
                ${o("twitter")}
                <textarea id="twitter-textarea" class="h-32 w-full rounded-none border border-border bg-background p-4 font-mono text-base focus:border-primary focus:outline-none focus:ring-0">${e.twitter}</textarea>
                <div class="text-right text-sm font-mono text-foreground/50" id="twitter-counter-container">
                  <span id="twitter-counter">${280-e.twitter.length}</span> characters remaining
                </div>
                <div class="mt-2 flex gap-2">
                  <button class="publish-btn border border-border px-4 py-2 font-mono text-sm uppercase hover:bg-primary hover:text-background disabled:cursor-not-allowed disabled:bg-gray-500" data-network="twitter">Post to X</button>
                  <button class="copy-btn border border-border px-4 py-2 font-mono text-sm uppercase hover:bg-primary hover:text-background">Copy Text</button>
                </div>
                <p class="mt-2 text-xs text-foreground/50">Aviso: A API gratuita do Twitter/X é limitada. Posts duplicados ou que excedam a cota da sua conta de desenvolvedor podem falhar.</p>
              </div>
            </div>`:""}
            ${e.instagram?`<div data-network="instagram">
              <h3 class="font-mono text-lg text-primary">// Instagram Post</h3>
              <div class="relative mt-2">
                ${t("instagram")}
                ${o("instagram")}
                <textarea id="instagram-textarea" class="h-40 w-full rounded-none border border-border bg-background p-4 font-mono text-base focus:border-primary focus:outline-none focus:ring-0">${e.instagram}</textarea>
                <div class="mt-2 flex gap-2">
                  <button class="publish-btn border border-border px-4 py-2 font-mono text-sm uppercase hover:bg-primary hover:text-background disabled:cursor-not-allowed disabled:bg-gray-500" data-network="instagram">Post to Instagram</button>
                  <button class="copy-btn border border-border px-4 py-2 font-mono text-sm uppercase hover:bg-primary hover:text-background">Copy Text</button>
                </div>
              </div>
            </div>`:""}
            ${e.threads?`<div data-network="threads">
              <h3 class="font-mono text-lg text-primary">// Threads Post</h3>
              <div class="relative mt-2">
                ${t("threads")}
                ${o("threads")}
                <textarea id="threads-textarea" class="h-40 w-full rounded-none border border-border bg-background p-4 font-mono text-base focus:border-primary focus:outline-none focus:ring-0">${e.threads}</textarea>
                <div class="text-right text-sm font-mono text-foreground/50" id="threads-counter-container">
                  <span id="threads-counter">${500-e.threads.length}</span> characters remaining
                </div>
                <div class="mt-2 flex gap-2">
                  <button class="publish-btn border border-border px-4 py-2 font-mono text-sm uppercase hover:bg-primary hover:text-background disabled:cursor-not-allowed disabled:bg-gray-500" data-network="threads">Post to Threads</button>
                  <button class="copy-btn border border-border px-4 py-2 font-mono text-sm uppercase hover:bg-primary hover:text-background">Copy Text</button>
                </div>
              </div>
            </div>`:""}
            ${e.facebook?`<div data-network="facebook">
              <h3 class="font-mono text-lg text-primary">// Facebook Post</h3>
              <div class="relative mt-2">
                ${t("facebook")}
                ${o("facebook")}
                <textarea id="facebook-textarea" class="h-48 w-full rounded-none border border-border bg-background p-4 font-mono text-base focus:border-primary focus:outline-none focus:ring-0">${e.facebook}</textarea>
                <div class="mt-2 flex items-center gap-2">
                  <button class="publish-btn border border-border px-4 py-2 font-mono text-sm uppercase hover:bg-primary hover:text-background disabled:cursor-not-allowed disabled:bg-gray-500" data-network="facebook">Post to Facebook</button>
                  <div class="facebook-page-selector-container flex-grow"></div>
                  <button class="copy-btn border border-border px-4 py-2 font-mono text-sm uppercase hover:bg-primary hover:text-background">Copy Text</button>
                </div>
              </div>
            </div>`:""}
          </div>
        `),E("twitter",e.twitter),E("threads",e.threads),re(),W(U)}async function oe(){if(!c)return;const e={linkedin_chars:parseInt(M.value,10)||null,twitter_chars:parseInt(y.value,10)||null,instagram_chars:parseInt(q.value,10)||null,threads_chars:parseInt(R.value,10)||null,facebook_chars:parseInt(A.value,10)||null,pinterest_chars:parseInt(O.value,10)||null};c.setAttribute("disabled","true"),c.innerText="Saving...";try{const{error:t}=await u.rpc("update_char_preferences",e);if(t)throw t;c.innerText="Saved!",setTimeout(()=>{c&&(c.innerText="Save as Default",c.removeAttribute("disabled"))},2e3)}catch(t){alert(`Error saving preferences: ${t.message}`),c&&(c.innerText="Save as Default",c.removeAttribute("disabled"))}}function ae(e){const t=e.target,o=t.closest(".image-feature, .video-feature");if(!o||!t.files||!t.files[0])return;const n=o.dataset.network,r=t.files[0],a=r.type.startsWith("video/"),s=o.querySelector(".media-preview-container"),d=s?.querySelector(".image-preview"),i=s?.querySelector(".video-preview");d&&(d.classList.add("hidden"),d.src.startsWith("blob:")&&URL.revokeObjectURL(d.src)),i&&(i.classList.add("hidden"),i.src.startsWith("blob:")&&URL.revokeObjectURL(i.src));const k=a?["video/mp4","video/quicktime"]:["image/jpeg","image/png"],m=a?20*1024*1024:2*1024*1024;let v=null;if(k.includes(r.type)||(v=a?"Only MP4 or MOV videos are allowed.":"Only JPG or PNG images are allowed."),r.size>m&&(v=a?"Video size cannot exceed 20MB.":"Image size cannot exceed 2MB."),v){alert(`Error: ${v}`),t.value="",n&&(C[n]=null),s&&s.classList.add("hidden");return}n&&(C[n]=r);const b=URL.createObjectURL(r);a?i&&(i.src=b,i.classList.remove("hidden")):d&&(d.src=b,d.classList.remove("hidden")),s&&s.classList.remove("hidden")}function ne(e){const o=e.target.closest(".image-feature, .video-feature");if(!o)return;const n=o.dataset.network,r=o.querySelector(".media-preview-container"),a=r?.querySelector(".image-preview"),s=r?.querySelector(".video-preview"),d=o.querySelector(".media-upload-input");a?.src.startsWith("blob:")&&URL.revokeObjectURL(a.src),s?.src.startsWith("blob:")&&URL.revokeObjectURL(s.src),a&&(a.src="#",a.classList.add("hidden")),s&&(s.src="#",s.classList.add("hidden")),r&&r.classList.add("hidden"),d&&(d.value=""),n&&(C[n]=null)}function E(e,t){if(!w)return;const r={twitter:w.checked?25e3:280,threads:500}[e],a=document.getElementById(`${e}-counter`),s=document.getElementById(`${e}-counter-container`),d=document.getElementById(`${e}-textarea`);if(a&&s&&d){const i=r-(t||d.value).length;a.textContent=i.toString(),s.classList.toggle("text-red-500",i<0)}}function se(e){const t=e.target;t.id==="twitter-textarea"&&E("twitter",t.value),t.id==="threads-textarea"&&E("threads",t.value)}function J(){if(!y||!w)return;const e=w.checked,t=document.getElementById("twitter-counter-container");y.max=e?"25000":"280",y.value=e?"4000":"250",t&&t.classList.toggle("hidden",e),E("twitter",document.getElementById("twitter-textarea")?.value||"")}async function ie(e){const t=e.target;if(t.closest(".remove-media-btn")){ne(e);return}if(t.classList.contains("copy-btn")){const n=t.closest(".relative")?.querySelector("textarea");n&&(navigator.clipboard.writeText(n.value),t.innerText="Copied!",setTimeout(()=>{t.innerText="Copy Text"},2e3))}if(t.classList.contains("publish-btn")){const o=t.dataset.network,r=t.closest(".relative")?.querySelector("textarea")?.value;if(!o||!r){alert("Cannot publish empty content.");return}let a=null;if(o==="facebook"){const i=document.getElementById("facebook-page-selector");if(i&&i.value)a=i.value;else if(i){alert("Please select a Facebook Page to post to.");return}}const s="confirm-publish-btn";z("// Confirm Publication",`<p class="text-foreground/80">Are you sure you want to post this content to ${o}? This will consume 1 Pulse.</p>`,`<button id="cancel-publish-btn" class="border border-border px-4 py-2 font-mono text-sm uppercase hover:bg-gray-800">Cancel</button>
         <button id="${s}" class="border border-primary bg-primary px-4 py-2 font-mono text-sm font-bold uppercase text-background">Confirm & Post</button>`),document.getElementById(s)?.addEventListener("click",async()=>{T(),t.setAttribute("disabled","true");let i=null,k=null;const m=C[o]??null,v=m?.type.startsWith("video/"),b=[];v?b.push("Uploading raw video","Requesting conversion","Processing video",`Publishing to ${o}`):m?b.push("Uploading media",`Publishing to ${o}`):b.push(`Publishing to ${o}`),Y(`// Publishing to ${o}`,b);try{if(m)if(v){l(0,"Uploading raw video...","loading");const f=`raw-videos/${P}/${Date.now()}_${m.name}`,{error:h}=await u.storage.from("post-images").upload(f,m);if(h)throw new Error(`Raw video upload failed: ${h.message}`);l(0,"Raw video uploaded.","success");const{data:L}=u.storage.from("post-images").getPublicUrl(f);l(1,"Requesting conversion...","loading");const{data:{session:j}}=await u.auth.getSession();if(!j)throw new Error("User session not found. Please log in again.");const D=await fetch("https://wvfooigeytvdcfnzzrrg.supabase.co/functions/v1/request-video-conversion",{method:"POST",headers:{Authorization:`Bearer ${j.access_token}`,"Content-Type":"application/json"},body:JSON.stringify({videoUrl:L.publicUrl,outputFileName:`processed_${Date.now()}.mp4`})});if(!D.ok)throw new Error(`Video conversion request failed: ${await D.text()}`);const K=await D.json();l(1,"Conversion requested.","success"),l(2,"Video is processing... (this may take minutes)","loading"),i=K.publicUrl,k="VIDEO",l(2,"Video processed successfully.","success"),l(3,"Publishing...","loading")}else{l(0,"Uploading image...","loading");const f=`public/${P}/${Date.now()}_${m.name}`,{error:h}=await u.storage.from("post-images").upload(f,m);if(h)throw h;const{data:L}=u.storage.from("post-images").getPublicUrl(f);if(!L)throw new Error("Could not get public URL for the media.");i=L.publicUrl,k="IMAGE",l(0,"Image uploaded.","success"),l(1,"Publishing...","loading")}else l(0,"Publishing...","loading");const I={network:o,text:r,pageId:a};i&&(I.mediaUrl=i,I.mediaType=k);const{data:g,error:$}=await u.functions.invoke("publish-to-social",{body:I});if($)throw $;l(b.length-1,"Published successfully!","success"),g&&typeof g.remainingPulses=="number"&&(F(g.remainingPulses),_=g.remainingPulses),setTimeout(()=>{T(),t.innerText="Published!"},1500)}catch(I){const g=I,$=b.length-1;if(l($,`Error: ${g.message}`,"error"),t.innerText="Error!",t.removeAttribute("disabled"),g.message?.includes("SESSION_EXPIRED")){const h=g.message.split(" ").pop()?.replace(".","");z(`// ${h} Session Expired`,`<p class="text-foreground/80">Your session for ${h} has expired. Please go to the <a href="/app/connections" class="underline">connections page</a> to link your account again.</p>`,'<button id="error-ok-btn" class="border border-primary bg-primary px-4 py-2 font-mono text-sm font-bold uppercase">OK</button>')}const f=document.getElementById("error-ok-btn");f&&f.addEventListener("click",T)}});const d=document.getElementById("cancel-publish-btn");d&&d.addEventListener("click",T)}}V&&p&&x&&(V.addEventListener("submit",te),p.addEventListener("click",ie),p.addEventListener("change",e=>{e.target.classList.contains("media-upload-input")&&ae(e)}),p.addEventListener("input",se),w?.addEventListener("change",J),ee(),N&&N.addEventListener("click",()=>{H&&H.classList.toggle("hidden")}),c&&c.addEventListener("click",oe));
