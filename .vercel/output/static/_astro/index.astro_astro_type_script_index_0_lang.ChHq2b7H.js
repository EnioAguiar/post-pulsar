import{s as c}from"./supabase.Ty5CJG7r.js";const B=document.getElementById("pulse-count-display"),U=document.getElementById("plan-display"),A=document.getElementById("pulsar-form"),p=document.getElementById("content-output"),K=document.getElementById("post-url"),J=document.getElementById("content-language"),Y=document.getElementById("hashtag-language"),g=A?.querySelector("button[type='submit']"),Q=document.getElementById("advanced-settings-toggle"),Z=document.getElementById("advanced-settings-panel"),S=document.getElementById("linkedin-char-count"),v=document.getElementById("twitter-char-count"),M=document.getElementById("instagram-char-count"),q=document.getElementById("threads-char-count"),R=document.getElementById("facebook-char-count"),D=document.getElementById("pinterest-char-count"),$=document.getElementById("twitter-premium-check"),b=document.getElementById("save-prefs-btn"),x=document.getElementById("modal-container"),G=document.getElementById("modal-title"),V=document.getElementById("modal-body"),H=document.getElementById("modal-footer"),ee=document.getElementById("modal-close-btn");let C=0,_={},f=null,E="free";function P(e,t,r){!x||!G||!V||!H||(G.innerHTML=e,V.innerHTML=t,H.innerHTML=r,x.classList.remove("hidden"))}function h(){x&&x.classList.add("hidden")}function te(e,t){const s=`<ul class="space-y-2 font-mono">${t.map((n,a)=>`<li id="progress-step-${a}" class="flex items-center gap-2 text-foreground/70"><span class="status-icon">⏳</span><span>${n}</span></li>`).join("")}</ul>`;P(e,s,'<div class="h-2 w-full bg-border rounded-full overflow-hidden"><div class="h-full bg-primary animate-pulse w-full"></div></div>')}function m(e,t,r){const s=document.getElementById(`progress-step-${e}`);if(!s)return;const o=s.querySelector(".status-icon"),n=s.querySelector("span:last-child");!o||!n||(o.textContent=r==="success"?"✅":r==="error"?"❌":"⏳",n.textContent=t,s.className=r==="error"?"flex items-center gap-2 text-red-400":"flex items-center gap-2 text-foreground")}async function oe(){console.log("DEBUG: Starting loadUserData...");const{data:{session:e},error:t}=await c.auth.getSession();if(t||!e){window.location.href="/login";return}f=e.user.id,console.log(`DEBUG: User ID is ${f}`);const[r,s]=await Promise.all([c.from("profiles").select("monthly_pulses_remaining, plan_type, default_linkedin_chars, default_twitter_chars, default_instagram_chars, default_threads_chars, default_facebook_chars, default_pinterest_chars").eq("id",f).single(),c.from("generated_posts").select("content").eq("user_id",f).order("created_at",{ascending:!1}).limit(1).single()]);console.log("DEBUG: Profile response from Supabase:",r);const{data:o,error:n}=r;if(n||!o){console.error("Error fetching profile:",n),B&&(B.innerText="Error"),U&&(U.innerText="Error");return}console.log("DEBUG: Profile data object:",o),C=o.monthly_pulses_remaining,E=(o.plan_type||"free").replace(/'/g,""),console.log(`DEBUG: Final userPlan variable is: ${E}`),F(C),U&&(U.innerText=E.toUpperCase()),o.default_linkedin_chars&&(S.value=o.default_linkedin_chars),o.default_twitter_chars&&(v.value=o.default_twitter_chars,o.default_twitter_chars>280&&($.checked=!0,z())),o.default_instagram_chars&&(M.value=o.default_instagram_chars),o.default_threads_chars&&(q.value=o.default_threads_chars),o.default_facebook_chars&&(R.value=o.default_facebook_chars),o.default_pinterest_chars&&(D.value=o.default_pinterest_chars);const{data:a,error:i}=s;a&&a.content?N(a.content):j(E)}function j(e){console.log(`DEBUG: Updating UI access for plan: ${e}`);const t=document.querySelectorAll(".image-feature"),r=document.querySelectorAll(".video-feature"),s=e==="basic"||e==="pro",o=e==="pro";t.forEach(n=>n.classList.toggle("hidden",!s)),r.forEach(n=>n.classList.toggle("hidden",!o))}function F(e){B&&(B.innerText=e===-1?"∞":e.toString())}async function re(e){if(e.preventDefault(),_={},!g||!p)return;g.setAttribute("disabled","true"),g.innerHTML="PULSING...";const t=["Transmitting signal...","Analyzing article...","Engaging AI model...","Calibrating social matrix...","Generating content...","Finalizing transmission..."];let r=0;p.innerHTML=`<div class="border border-dashed border-border p-8 text-center"><p class="font-mono text-foreground/70">[PULSING] :: ${t[0]}</p></div>`;const s=p.querySelector("p"),o=setInterval(()=>{r=(r+1)%t.length,s&&(s.textContent=`[PULSING] :: ${t[r]}`)},2500);try{const n={url:K.value,contentLanguage:J.value,hashtagLanguage:Y.value};S.value&&(n.linkedInCharCount=parseInt(S.value,10)),v.value&&(n.twitterCharCount=parseInt(v.value,10)),M.value&&(n.instagramCharCount=parseInt(M.value,10)),q.value&&(n.threadsCharCount=parseInt(q.value,10)),R.value&&(n.facebookCharCount=parseInt(R.value,10)),D.value&&(n.pinterestCharCount=parseInt(D.value,10));const{data:a,error:i}=await c.functions.invoke("pulsar-v1",{body:n});if(i)throw i;C--,F(C);const{generatedContent:d}=a;N(d)}catch(n){p.innerHTML=`<div class="border border-red-500/50 p-8 text-center"><p class="font-mono font-bold text-red-400">[ERROR]</p><p class="font-mono text-foreground/70 mt-2">${n.message}</p></div>`}finally{clearInterval(o),g.removeAttribute("disabled"),g.innerHTML="Pulsar &gt;&gt;"}}async function ne(){const{data:e,error:t}=await c.from("social_connections").select("provider_user_id, provider_user_name").eq("provider","facebook");if(t){console.error("Error fetching Facebook pages:",t);return}if(e&&e.length>1){const r=document.querySelector(".facebook-page-selector-container");if(!r)return;const s=e.map(o=>`<option value="${o.provider_user_id}">${o.provider_user_name}</option>`).join("");r.innerHTML=`
        <select id="facebook-page-selector" class="w-full rounded-none border border-border bg-background p-2 font-mono text-sm focus:border-primary focus:outline-none focus:ring-0">
          <option value="" disabled selected>Select a Page...</option>
          ${s}
        </select>
      `}}function N(e){$?.checked;const t=s=>{const o=`image-upload-${s}`;return`
        <div class="mb-4 image-feature" data-network="${s}">
          <p class="mb-2 block font-mono text-sm uppercase text-foreground/70">// Upload Image (Optional)</p>
          <label for="${o}" class="media-upload-label w-full cursor-pointer border border-border bg-transparent p-3 font-mono text-sm uppercase text-foreground transition-colors hover:bg-border/50 inline-block text-center">
            Choose Image
          </label>
          <input type="file" id="${o}" class="media-upload-input hidden" accept="image/jpeg,image/png">
          <p class="mt-2 font-mono text-xs text-foreground/50">Max size: 2MB. Accepted: JPG, PNG.</p>
          <div class="media-preview-container relative mt-2 hidden w-fit">
            <img src="#" alt="Image Preview" class="image-preview hidden max-h-40 border border-border"/>
            <button type="button" class="remove-media-btn absolute top-0 right-0 m-1 rounded-full bg-black/50 p-1 text-white hover:bg-black/80">X</button>
          </div>
        </div>
      `},r=s=>{const o=`video-upload-${s}`;return`
        <div class="mb-4 video-feature" data-network="${s}">
          <p class="mb-2 block font-mono text-sm uppercase text-foreground/70">// Upload Video (Optional)</p>
          <label for="${o}" class="media-upload-label w-full cursor-pointer border border-border bg-transparent p-3 font-mono text-sm uppercase text-foreground transition-colors hover:bg-border/50 inline-block text-center">
            Choose Video
          </label>
          <input type="file" id="${o}" class="media-upload-input hidden" accept="video/mp4,video/quicktime">
          <p class="mt-2 font-mono text-xs text-foreground/50">Max size: 50MB. Accepted: MP4, MOV.</p>
          <div class="media-preview-container relative mt-2 hidden w-fit">
            <video src="#" controls class="video-preview hidden max-h-40 border border-border"></video>
            <button type="button" class="remove-media-btn absolute top-0 right-0 m-1 rounded-full bg-black/50 p-1 text-white hover:bg-black/80">X</button>
          </div>
        </div>
      `};p.innerHTML=`
        <h2 class="text-2xl font-bold uppercase">// Transmission Received</h2>
        <div class="mt-4 space-y-6">
          <!-- LinkedIn Post -->
          ${e.linkedIn?`
          <div data-network="linkedin">
            <h3 class="font-mono text-lg text-primary">// LinkedIn Post</h3>
            <div class="relative mt-2">
              ${t("linkedin")}
              <textarea id="linkedin-textarea" class="h-48 w-full rounded-none border border-border bg-background p-4 font-mono text-base focus:border-primary focus:outline-none focus:ring-0">${e.linkedIn}</textarea>
              <div class="mt-2 flex gap-2">
                <button class="publish-btn border border-border px-4 py-2 font-mono text-sm uppercase hover:bg-primary hover:text-background disabled:cursor-not-allowed disabled:bg-gray-500" data-network="linkedin">Post to LinkedIn</button>
                <button class="copy-btn border border-border px-4 py-2 font-mono text-sm uppercase hover:bg-primary hover:text-background">Copy Text</button>
              </div>
            </div>
          </div>
          `:""}

          <!-- Twitter/X Post -->
          ${e.twitter?`
          <div data-network="twitter">
            <h3 class="font-mono text-lg text-primary">// X (Twitter) Post</h3>
            <div class="relative mt-2">
              ${t("twitter")}
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
          </div>
          `:""}

          <!-- Instagram Post -->
          ${e.instagram?`
          <div data-network="instagram">
            <h3 class="font-mono text-lg text-primary">// Instagram Post</h3>
            <div class="relative mt-2">
              ${t("instagram")}
              ${r("instagram")}
              <textarea id="instagram-textarea" class="h-40 w-full rounded-none border border-border bg-background p-4 font-mono text-base focus:border-primary focus:outline-none focus:ring-0">${e.instagram}</textarea>
              <div class="mt-2 flex gap-2">
                <button class="publish-btn border border-border px-4 py-2 font-mono text-sm uppercase hover:bg-primary hover:text-background disabled:cursor-not-allowed disabled:bg-gray-500" data-network="instagram">Post to Instagram</button>
                <button class="copy-btn border border-border px-4 py-2 font-mono text-sm uppercase hover:bg-primary hover:text-background">Copy Text</button>
              </div>
            </div>
          </div>
          `:""}

          <!-- Threads Post -->
          ${e.threads?`
          <div data-network="threads">
            <h3 class="font-mono text-lg text-primary">// Threads Post</h3>
            <div class="relative mt-2">
              ${t("threads")}
              ${r("threads")}
              <textarea id="threads-textarea" class="h-40 w-full rounded-none border border-border bg-background p-4 font-mono text-base focus:border-primary focus:outline-none focus:ring-0">${e.threads}</textarea>
              <div class="text-right text-sm font-mono text-foreground/50" id="threads-counter-container">
                <span id="threads-counter">${500-e.threads.length}</span> characters remaining
              </div>
              <div class="mt-2 flex gap-2">
                <button class="publish-btn border border-border px-4 py-2 font-mono text-sm uppercase hover:bg-primary hover:text-background disabled:cursor-not-allowed disabled:bg-gray-500" data-network="threads">Post to Threads</button>
                <button class="copy-btn border border-border px-4 py-2 font-mono text-sm uppercase hover:bg-primary hover:text-background">Copy Text</button>
              </div>
            </div>
          </div>
          `:""}

          <!-- Facebook Post -->
          ${e.facebook?`
          <div data-network="facebook">
            <h3 class="font-mono text-lg text-primary">// Facebook Post</h3>
            <div class="relative mt-2">
              ${t("facebook")}
              ${r("facebook")}
              <textarea id="facebook-textarea" class="h-48 w-full rounded-none border border-border bg-background p-4 font-mono text-base focus:border-primary focus:outline-none focus:ring-0">${e.facebook}</textarea>
              <div class="mt-2 flex items-center gap-2">
                <button class="publish-btn border border-border px-4 py-2 font-mono text-sm uppercase hover:bg-primary hover:text-background disabled:cursor-not-allowed disabled:bg-gray-500" data-network="facebook">Post to Facebook</button>
                <div class="facebook-page-selector-container flex-grow"></div>
                <button class="copy-btn border border-border px-4 py-2 font-mono text-sm uppercase hover:bg-primary hover:text-background">Copy Text</button>
              </div>
            </div>
          </div>
          `:""}

        </div>
      `,L("twitter",e.twitter),L("threads",e.threads),ne(),j(E)}async function ae(){const e=parseInt(S.value,10)||null,t=parseInt(v.value,10)||null,r=parseInt(M.value,10)||null,s=parseInt(q.value,10)||null,o=parseInt(R.value,10)||null,n=parseInt(D.value,10)||null;b.setAttribute("disabled","true"),b.innerText="Saving...";try{const{error:a}=await c.rpc("update_char_preferences",{linkedin_chars:e,twitter_chars:t,instagram_chars:r,threads_chars:s,facebook_chars:o,pinterest_chars:n});if(a)throw a;b.innerText="Saved!",setTimeout(()=>{b.innerText="Save as Default",b.removeAttribute("disabled")},2e3)}catch(a){alert(`Error saving preferences: ${a.message}`),b.innerText="Save as Default",b.removeAttribute("disabled")}}function se(e){const t=e.target,r=t.closest(".image-feature, .video-feature");if(!r||!t.files||!t.files[0])return;const s=r.dataset.network,o=t.files[0],n=o.type.startsWith("video/"),a=r.querySelector(".media-preview-container"),i=a.querySelector(".image-preview"),d=a.querySelector(".video-preview");i.classList.add("hidden"),d.classList.add("hidden"),i.src.startsWith("blob:")&&URL.revokeObjectURL(i.src),d.src.startsWith("blob:")&&URL.revokeObjectURL(d.src);const y=n?["video/mp4","video/quicktime"]:["image/jpeg","image/png"],u=n?50*1024*1024:2*1024*1024;let l=null;if(y.includes(o.type)||(l=n?"Only MP4 or MOV videos are allowed.":"Only JPG or PNG images are allowed."),o.size>u&&(l=n?"Video size cannot exceed 50MB.":"Image size cannot exceed 2MB."),l){alert(`Error: ${l}`),t.value="",_[s]=null,a.classList.add("hidden");return}_[s]=o;const w=URL.createObjectURL(o);n?(d.src=w,d.classList.remove("hidden")):(i.src=w,i.classList.remove("hidden")),a.classList.remove("hidden")}function ie(e){const r=e.target.closest(".image-feature, .video-feature");if(!r)return;const s=r.dataset.network,o=r.querySelector(".media-preview-container"),n=o.querySelector(".image-preview"),a=o.querySelector(".video-preview"),i=r.querySelector(".media-upload-input");n&&n.src.startsWith("blob:")&&URL.revokeObjectURL(n.src),a&&a.src.startsWith("blob:")&&URL.revokeObjectURL(a.src),n&&(n.src="#",n.classList.add("hidden")),a&&(a.src="#",a.classList.add("hidden")),o&&o.classList.add("hidden"),i&&(i.value=""),s&&(_[s]=null)}function L(e,t){const o={twitter:$?.checked?25e3:280,threads:500}[e];if(!o)return;const n=document.getElementById(`${e}-counter`),a=document.getElementById(`${e}-counter-container`),i=document.getElementById(`${e}-textarea`);if(n&&a&&i){const d=o-(t||i.value).length;n.textContent=d.toString(),a.classList.toggle("text-red-500",d<0)}}function de(e){const t=e.target;t.id==="twitter-textarea"&&L("twitter",t.value),t.id==="threads-textarea"&&L("threads",t.value)}function z(){const e=$.checked,t=document.getElementById("twitter-counter-container");v.max=e?"25000":"280",v.value=e?"4000":"250",t&&t.classList.toggle("hidden",e),L("twitter",document.getElementById("twitter-textarea")?.value||"")}async function le(e){const t=e.target;if(t.closest(".remove-media-btn")){ie(e);return}if(t.classList.contains("copy-btn")){const r=t.closest(".relative").querySelector("textarea").value;navigator.clipboard.writeText(r),t.innerText="Copied!",setTimeout(()=>{t.innerText="Copy Text"},2e3)}if(t.classList.contains("publish-btn")){const r=t.dataset.network,s=t.closest(".relative").querySelector("textarea").value;if(!s){alert("Cannot publish empty content.");return}let o=null;if(r==="facebook"){const a=document.getElementById("facebook-page-selector");if(a&&a.value)o=a.value;else if(a){alert("Please select a Facebook Page to post to.");return}}const n="confirm-publish-btn";P("// Confirm Publication",`<p class="text-foreground/80">Are you sure you want to post this content to ${r}? This will consume 1 Pulse.</p>`,`<button id="cancel-publish-btn" class="border border-border px-4 py-2 font-mono text-sm uppercase hover:bg-gray-800">Cancel</button>
         <button id="${n}" class="border border-primary bg-primary px-4 py-2 font-mono text-sm font-bold uppercase text-background">Confirm & Post</button>`),document.getElementById(n)?.addEventListener("click",async()=>{h(),t.setAttribute("disabled","true");let a=null,i=null;const d=_[r],y=d?.type.startsWith("video/");try{if(d)if(y){const T=["Uploading raw video","Requesting conversion","Processing video","Publishing to "+r];te("// Processing Video",T),m(0,"Uploading raw video...","loading");const k=`raw-videos/${f}/${Date.now()}_${d.name}`,{error:I}=await c.storage.from("post-images").upload(k,d);if(I)throw new Error(`Raw video upload failed: ${I.message}`);m(0,"Raw video uploaded!","success");const{data:X}=c.storage.from("post-images").getPublicUrl(k);m(1,"Requesting conversion...","loading");const{data:W,error:O}=await c.functions.invoke("request-video-conversion",{body:{videoUrl:X.publicUrl,outputFileName:`processed_${Date.now()}.mp4`}});if(O)throw O;m(1,"Conversion requested!","success"),m(2,"Video is processing... (this may take a few minutes)","loading"),a=W.publicUrl,i="VIDEO",m(2,"Video processed successfully!","success"),m(3,"Publishing to "+r+"...","loading")}else{t.innerText="Uploading Media...";const T=`public/${f}/${Date.now()}_${d.name}`,{error:k}=await c.storage.from("post-images").upload(T,d);if(k)throw k;const{data:I}=c.storage.from("post-images").getPublicUrl(T);if(!I)throw new Error("Could not get public URL for the media.");a=I.publicUrl,i="IMAGE"}t.innerText="Publishing...";const u={network:r,text:s};a&&(u.mediaUrl=a,u.mediaType=i),r==="facebook"&&o&&(u.pageId=o);const{data:l,error:w}=await c.functions.invoke("publish-to-social",{body:u});if(w)throw w;l&&typeof l.remainingPulses=="number"&&(F(l.remainingPulses),C=l.remainingPulses),y&&(m(3,"Published to "+r+"!","success"),setTimeout(h,2e3)),t.innerText="Published!"}catch(u){if(y)P("// Video Publication Failed",`<p class="font-mono text-red-400">${u.message}</p>`,'<button id="error-ok-btn" class="border border-primary bg-primary px-4 py-2 font-mono text-sm font-bold uppercase">OK</button>');else if(t.innerText="Error!",t.removeAttribute("disabled"),u.message.includes("SESSION_EXPIRED")){const l=u.message.split(" ").pop().replace(".","");P(`// ${l} Session Expired`,`<p class="text-foreground/80">Your session for ${l} has expired. Please go to the <a href="/app/connections" class="underline">connections page</a> to link your account again.</p>`,'<button id="error-ok-btn" class="border border-primary bg-primary px-4 py-2 font-mono text-sm font-bold uppercase">OK</button>')}else P("// Publication Failed",`<p class="font-mono text-red-400">${u.message}</p>`,'<button id="error-ok-btn" class="border border-primary bg-primary px-4 py-2 font-mono text-sm font-bold uppercase">OK</button>');document.getElementById("error-ok-btn")?.addEventListener("click",h)}}),document.getElementById("cancel-publish-btn")?.addEventListener("click",h)}}A&&p&&g&&(A.addEventListener("submit",re),p.addEventListener("click",le),p.addEventListener("change",e=>{e.target.classList.contains("media-upload-input")&&se(e)}),p.addEventListener("input",de),$?.addEventListener("change",z),oe(),Q.addEventListener("click",()=>{Z.classList.toggle("hidden")}),b.addEventListener("click",ae));ee?.addEventListener("click",h);x?.addEventListener("click",e=>{e.target===x&&h()});
