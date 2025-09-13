/* empty css                                       */
import { e as createComponent, f as createAstro, r as renderTemplate, n as defineScriptVars, h as addAttribute, m as maybeRenderHead, k as renderComponent, l as renderScript } from '../chunks/astro/server_b5n78yJd.mjs';
import 'kleur/colors';
import { $ as $$Layout } from '../chunks/Layout_DGGlkE_n.mjs';
import 'clsx';
import { $ as $$Modal } from '../chunks/Modal_B-G-5YwK.mjs';
export { renderers } from '../renderers.mjs';

var __freeze = Object.freeze;
var __defProp = Object.defineProperty;
var __template = (cooked, raw) => __freeze(__defProp(cooked, "raw", { value: __freeze(raw || cooked.slice()) }));
var _a;
const $$Astro = createAstro();
const $$LanguageSelector = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$LanguageSelector;
  const { id, name, labelText, defaultValue = "English" } = Astro2.props;
  return renderTemplate(_a || (_a = __template(["", "<div", ' class="grow"> <label', ' class="mb-2 block font-mono text-sm uppercase text-foreground/70">', '</label> <div class="relative"> <input type="text"', "", ' required class="w-full rounded-none border border-border bg-background p-4 font-mono text-lg focus:border-primary focus:outline-none focus:ring-0" placeholder="Choose a language..."', ' autocomplete="off"> <div', ' class="absolute z-10 mt-1 hidden max-h-60 w-full overflow-auto rounded-none border border-border bg-background py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm"> <ul', ' class="text-foreground"> <!-- Populated by script --> </ul> </div> </div> </div> <script>(function(){', `
  const componentRoot = document.getElementById(\`language-selector-component-\${uniqueId}\`);
  const input = componentRoot.querySelector(\`#\${uniqueId}\`);
  const dropdown = componentRoot.querySelector(\`#dropdown-\${uniqueId}\`);
  const list = componentRoot.querySelector(\`#list-\${uniqueId}\`);

  const allLanguages = [
    "Afrikaans", "Albanian", "Amharic", "Arabic", "Armenian", "Azerbaijani", "Basque",
    "Belarusian", "Bengali", "Bosnian", "Bulgarian", "Catalan", "Cebuano", "Chichewa",
    "Chinese (Simplified)", "Chinese (Traditional)", "Corsican", "Croatian", "Czech",
    "Danish", "Dutch", "English", "Esperanto", "Estonian", "Filipino", "Finnish",
    "French", "Frisian", "Galician", "Georgian", "German", "Greek", "Gujarati",
    "Haitian Creole", "Hausa", "Hawaiian", "Hebrew", "Hindi", "Hmong", "Hungarian",
    "Icelandic", "Igbo", "Indonesian", "Irish", "Italian", "Japanese", "Javanese",
    "Kannada", "Kazakh", "Khmer", "Kinyarwanda", "Korean", "Kurdish (Kurmanji)",
    "Kyrgyz", "Lao", "Latin", "Latvian", "Lithuanian", "Luxembourgish", "Macedonian",
    "Malagasy", "Malay", "Malayalam", "Maltese", "Maori", "Marathi", "Mongolian",
    "Myanmar (Burmese)", "Nepali", "Norwegian", "Odia (Oriya)", "Pashto", "Persian",
    "Polish", "Portuguese", "Punjabi", "Romanian", "Russian", "Samoan", "Scots Gaelic",
    "Serbian", "Sesotho", "Shona", "Sindhi", "Sinhala", "Slovak", "Slovenian",
    "Somali", "Spanish", "Sundanese", "Swahili", "Swedish", "Tajik", "Tamil", "Tatar",
    "Telugu", "Thai", "Turkish", "Turkmen", "Ukrainian", "Urdu", "Uyghur", "Uzbek",
    "Vietnamese", "Welsh", "Xhosa", "Yiddish", "Yoruba", "Zulu"
  ];

  let highlightedIndex = -1;

  function populateDropdown(filter = '') {
    list.innerHTML = '';
    const filteredLanguages = allLanguages.filter(lang => lang.toLowerCase().includes(filter.toLowerCase()));
    highlightedIndex = -1; // Reset highlight

    if (filteredLanguages.length > 0) {
      filteredLanguages.forEach((lang, index) => {
        const li = document.createElement('li');
        li.textContent = lang;
        li.className = 'cursor-pointer select-none p-4 font-mono text-lg hover:bg-primary hover:text-background';
        li.setAttribute('data-index', index.toString());

        li.addEventListener('mousedown', () => { // Use mousedown to avoid focus conflicts
          input.value = lang;
          dropdown.classList.add('hidden');
        });

        li.addEventListener('mouseenter', () => {
            highlightedIndex = index;
            updateHighlight();
        });

        list.appendChild(li);
      });
    } else {
      const li = document.createElement('li');
      li.textContent = 'No language found';
      li.className = 'p-4 font-mono text-lg text-foreground/50';
      list.appendChild(li);
    }
  }

  function updateHighlight() {
    const items = list.querySelectorAll('li[data-index]');
    items.forEach((item, index) => {
      if (index === highlightedIndex) {
        item.classList.add('bg-primary', 'text-background');
        item.scrollIntoView({ block: 'nearest' });
      } else {
        item.classList.remove('bg-primary', 'text-background');
      }
    });
  }

  if(input && dropdown && list) {
    input.addEventListener('focus', () => {
      populateDropdown(''); // Show all languages on focus
      dropdown.classList.remove('hidden');
    });

    input.addEventListener('input', () => {
      populateDropdown(input.value);
      if (dropdown.classList.contains('hidden')) {
        dropdown.classList.remove('hidden');
      }
    });

    input.addEventListener('blur', () => {
      // Delay hiding to allow click event on list items
      setTimeout(() => {
        dropdown.classList.add('hidden');
      }, 150); // A bit longer to be safe
    });

    input.addEventListener('keydown', (e) => {
      const items = list.querySelectorAll('li[data-index]');
      if (dropdown.classList.contains('hidden')) {
          // If dropdown is closed, let arrow keys open it.
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            dropdown.classList.remove('hidden');
            populateDropdown(input.value);
          }
          return;
      }

      switch(e.key) {
        case 'ArrowDown':
          e.preventDefault();
          highlightedIndex = (highlightedIndex + 1) % items.length;
          updateHighlight();
          break;
        case 'ArrowUp':
          e.preventDefault();
          highlightedIndex = (highlightedIndex - 1 + items.length) % items.length;
          updateHighlight();
          break;
        case 'Enter':
          e.preventDefault();
          if (highlightedIndex > -1) {
            const selectedItem = items[highlightedIndex];
            if (selectedItem) {
                input.value = selectedItem.textContent;
            }
          }
          dropdown.classList.add('hidden');
          break;
        case 'Escape':
          dropdown.classList.add('hidden');
          break;
      }
    });
  }
})();<\/script>`], ["", "<div", ' class="grow"> <label', ' class="mb-2 block font-mono text-sm uppercase text-foreground/70">', '</label> <div class="relative"> <input type="text"', "", ' required class="w-full rounded-none border border-border bg-background p-4 font-mono text-lg focus:border-primary focus:outline-none focus:ring-0" placeholder="Choose a language..."', ' autocomplete="off"> <div', ' class="absolute z-10 mt-1 hidden max-h-60 w-full overflow-auto rounded-none border border-border bg-background py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm"> <ul', ' class="text-foreground"> <!-- Populated by script --> </ul> </div> </div> </div> <script>(function(){', `
  const componentRoot = document.getElementById(\\\`language-selector-component-\\\${uniqueId}\\\`);
  const input = componentRoot.querySelector(\\\`#\\\${uniqueId}\\\`);
  const dropdown = componentRoot.querySelector(\\\`#dropdown-\\\${uniqueId}\\\`);
  const list = componentRoot.querySelector(\\\`#list-\\\${uniqueId}\\\`);

  const allLanguages = [
    "Afrikaans", "Albanian", "Amharic", "Arabic", "Armenian", "Azerbaijani", "Basque",
    "Belarusian", "Bengali", "Bosnian", "Bulgarian", "Catalan", "Cebuano", "Chichewa",
    "Chinese (Simplified)", "Chinese (Traditional)", "Corsican", "Croatian", "Czech",
    "Danish", "Dutch", "English", "Esperanto", "Estonian", "Filipino", "Finnish",
    "French", "Frisian", "Galician", "Georgian", "German", "Greek", "Gujarati",
    "Haitian Creole", "Hausa", "Hawaiian", "Hebrew", "Hindi", "Hmong", "Hungarian",
    "Icelandic", "Igbo", "Indonesian", "Irish", "Italian", "Japanese", "Javanese",
    "Kannada", "Kazakh", "Khmer", "Kinyarwanda", "Korean", "Kurdish (Kurmanji)",
    "Kyrgyz", "Lao", "Latin", "Latvian", "Lithuanian", "Luxembourgish", "Macedonian",
    "Malagasy", "Malay", "Malayalam", "Maltese", "Maori", "Marathi", "Mongolian",
    "Myanmar (Burmese)", "Nepali", "Norwegian", "Odia (Oriya)", "Pashto", "Persian",
    "Polish", "Portuguese", "Punjabi", "Romanian", "Russian", "Samoan", "Scots Gaelic",
    "Serbian", "Sesotho", "Shona", "Sindhi", "Sinhala", "Slovak", "Slovenian",
    "Somali", "Spanish", "Sundanese", "Swahili", "Swedish", "Tajik", "Tamil", "Tatar",
    "Telugu", "Thai", "Turkish", "Turkmen", "Ukrainian", "Urdu", "Uyghur", "Uzbek",
    "Vietnamese", "Welsh", "Xhosa", "Yiddish", "Yoruba", "Zulu"
  ];

  let highlightedIndex = -1;

  function populateDropdown(filter = '') {
    list.innerHTML = '';
    const filteredLanguages = allLanguages.filter(lang => lang.toLowerCase().includes(filter.toLowerCase()));
    highlightedIndex = -1; // Reset highlight

    if (filteredLanguages.length > 0) {
      filteredLanguages.forEach((lang, index) => {
        const li = document.createElement('li');
        li.textContent = lang;
        li.className = 'cursor-pointer select-none p-4 font-mono text-lg hover:bg-primary hover:text-background';
        li.setAttribute('data-index', index.toString());

        li.addEventListener('mousedown', () => { // Use mousedown to avoid focus conflicts
          input.value = lang;
          dropdown.classList.add('hidden');
        });

        li.addEventListener('mouseenter', () => {
            highlightedIndex = index;
            updateHighlight();
        });

        list.appendChild(li);
      });
    } else {
      const li = document.createElement('li');
      li.textContent = 'No language found';
      li.className = 'p-4 font-mono text-lg text-foreground/50';
      list.appendChild(li);
    }
  }

  function updateHighlight() {
    const items = list.querySelectorAll('li[data-index]');
    items.forEach((item, index) => {
      if (index === highlightedIndex) {
        item.classList.add('bg-primary', 'text-background');
        item.scrollIntoView({ block: 'nearest' });
      } else {
        item.classList.remove('bg-primary', 'text-background');
      }
    });
  }

  if(input && dropdown && list) {
    input.addEventListener('focus', () => {
      populateDropdown(''); // Show all languages on focus
      dropdown.classList.remove('hidden');
    });

    input.addEventListener('input', () => {
      populateDropdown(input.value);
      if (dropdown.classList.contains('hidden')) {
        dropdown.classList.remove('hidden');
      }
    });

    input.addEventListener('blur', () => {
      // Delay hiding to allow click event on list items
      setTimeout(() => {
        dropdown.classList.add('hidden');
      }, 150); // A bit longer to be safe
    });

    input.addEventListener('keydown', (e) => {
      const items = list.querySelectorAll('li[data-index]');
      if (dropdown.classList.contains('hidden')) {
          // If dropdown is closed, let arrow keys open it.
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            dropdown.classList.remove('hidden');
            populateDropdown(input.value);
          }
          return;
      }

      switch(e.key) {
        case 'ArrowDown':
          e.preventDefault();
          highlightedIndex = (highlightedIndex + 1) % items.length;
          updateHighlight();
          break;
        case 'ArrowUp':
          e.preventDefault();
          highlightedIndex = (highlightedIndex - 1 + items.length) % items.length;
          updateHighlight();
          break;
        case 'Enter':
          e.preventDefault();
          if (highlightedIndex > -1) {
            const selectedItem = items[highlightedIndex];
            if (selectedItem) {
                input.value = selectedItem.textContent;
            }
          }
          dropdown.classList.add('hidden');
          break;
        case 'Escape':
          dropdown.classList.add('hidden');
          break;
      }
    });
  }
})();<\/script>`])), maybeRenderHead(), addAttribute(`language-selector-component-${id}`, "id"), addAttribute(id, "for"), labelText, addAttribute(id, "id"), addAttribute(name, "name"), addAttribute(defaultValue, "value"), addAttribute(`dropdown-${id}`, "id"), addAttribute(`list-${id}`, "id"), defineScriptVars({ uniqueId: id }));
}, "/home/enio/projetos/post-pulsar/src/components/LanguageSelector.astro", void 0);

const $$Index = createComponent(async ($$result, $$props, $$slots) => {
  return renderTemplate`${renderComponent($$result, "Layout", $$Layout, { "title": "Dashboard // PostPulsar" }, { "default": async ($$result2) => renderTemplate` ${maybeRenderHead()}<main class="container py-12"> <div class="flex items-start justify-between"> <div> <h1 id="welcome-message" class="text-3xl font-bold uppercase">
// Mission Control
</h1> <p class="mt-2 text-foreground/70">
System ready. Paste the article URL to begin transmission.
</p> </div> <div class="text-right font-mono"> <p class="text-sm uppercase text-foreground/70">Pulse Balance</p> <p id="pulse-count-display" class="text-3xl font-bold">--</p> <!-- DEBUG: Display User Plan --> <p class="mt-2 text-sm uppercase text-foreground/70">Current Plan</p> <p id="plan-display" class="text-lg font-bold">--</p> </div> </div> <div class="mt-8"> <form id="pulsar-form"> <div class="mb-4"> <label for="post-url" class="mb-2 block font-mono text-sm uppercase text-foreground/70">// Article URL</label> <input type="url" id="post-url" name="post-url" required class="w-full rounded-none border border-border bg-background p-4 font-mono text-lg focus:border-primary focus:outline-none focus:ring-0" placeholder="https://your-blog.com/your-awesome-article"> </div> <!-- Seção de Prompts --> <div class="mb-4"> <label for="prompt-selector" class="mb-2 block font-mono text-sm uppercase text-foreground/70">// Prompt</label> <div class="flex items-center gap-2"> <select id="prompt-selector" name="prompt-selector" class="w-full rounded-none border border-border bg-background p-4 font-mono text-lg focus:border-primary focus:outline-none focus:ring-0"> <!-- Opções de prompt serão populadas via JS --> </select> <button type="button" id="manage-prompts-btn" class="hidden rounded-none border border-foreground/50 p-4 transition-colors hover:bg-foreground/10" aria-label="Manage prompts"> <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-settings-2"><path d="M20 7h-9"></path><path d="M14 17H5"></path><circle cx="17" cy="17" r="3"></circle><circle cx="7" cy="7" r="3"></circle></svg> </button> <button type="button" id="add-prompt-btn" class="hidden rounded-none border border-primary p-4 transition-colors hover:bg-primary/10" aria-label="Create new prompt"> <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-plus"><path d="M5 12h14"></path><path d="M12 5v14"></path></svg> </button> </div> <p class="mt-1 text-xs text-foreground/50">Select a prompt to guide the AI or create a new one (requires Pro plan).</p> </div> <!-- Advanced Settings Accordion --> <div class="mt-4"> <button type="button" id="advanced-settings-toggle" class="font-mono text-sm uppercase text-foreground hover:text-primary">
&gt; Advanced Settings
</button> <div id="advanced-settings-panel" class="mt-4 hidden border border-border/50 p-4"> <div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"> <div> <label for="linkedin-char-count" class="mb-2 block font-mono text-sm uppercase text-foreground/70">// Approx. Chars (LinkedIn)</label> <input type="number" id="linkedin-char-count" name="linkedin-char-count" class="w-full rounded-none border border-border bg-background p-4 font-mono text-lg focus:border-primary focus:outline-none focus:ring-0" placeholder="(e.g., 800)" max="1300"> <p class="mt-1 text-xs text-foreground/50">Note: This is an instruction for the AI. The final text may be slightly longer or shorter.</p> </div> <div> <label for="twitter-char-count" class="mb-2 block font-mono text-sm uppercase text-foreground/70">// Approx. Chars (X)</label> <input type="number" id="twitter-char-count" name="twitter-char-count" class="w-full rounded-none border border-border bg-background p-4 font-mono text-lg focus:border-primary focus:outline-none focus:ring-0" placeholder="(e.g., 250)" max="280"> <p class="mt-1 text-xs text-foreground/50">Note: This is an instruction for the AI. The final text may be slightly longer or shorter.</p> <div class="mt-2 flex items-center gap-2"> <input type="checkbox" id="twitter-premium-check" name="twitter-premium-check" class="size-4 rounded border-gray-300 bg-background text-primary focus:ring-primary"> <label for="twitter-premium-check" class="font-mono text-xs text-foreground/70">I have a Premium account (up to 25000 chars)</label> </div> </div> <div> <label for="instagram-char-count" class="mb-2 block font-mono text-sm uppercase text-foreground/70">// Approx. Chars (Instagram)</label> <input type="number" id="instagram-char-count" name="instagram-char-count" class="w-full rounded-none border border-border bg-background p-4 font-mono text-lg focus:border-primary focus:outline-none focus:ring-0" placeholder="(e.g., 400)" max="2200"> <p class="mt-1 text-xs text-foreground/50">Note: This is an instruction for the AI. The final text may be slightly longer or shorter.</p> </div> <div> <label for="threads-char-count" class="mb-2 block font-mono text-sm uppercase text-foreground/70">// Approx. Chars (Threads)</label> <input type="number" id="threads-char-count" name="threads-char-count" class="w-full rounded-none border border-border bg-background p-4 font-mono text-lg focus:border-primary focus:outline-none focus:ring-0" placeholder="(e.g., 450)" max="500"> <p class="mt-1 text-xs text-foreground/50">Note: This is an instruction for the AI. The final text may be slightly longer or shorter.</p> </div> <div> <label for="facebook-char-count" class="mb-2 block font-mono text-sm uppercase text-foreground/70">// Approx. Chars (Facebook)</label> <input type="number" id="facebook-char-count" name="facebook-char-count" class="w-full rounded-none border border-border bg-background p-4 font-mono text-lg focus:border-primary focus:outline-none focus:ring-0" placeholder="Not set" max="63206"> <p class="mt-1 text-xs text-foreground/50">Note: This is an instruction for the AI. The final text may be slightly longer or shorter.</p> </div> <div> <label for="pinterest-char-count" class="mb-2 block font-mono text-sm uppercase text-foreground/70">// Approx. Chars (Pinterest) <span class="text-yellow-400/70">[Unavailable]</span></label> <input disabled type="number" id="pinterest-char-count" name="pinterest-char-count" class="w-full rounded-none border border-border bg-background/50 p-4 font-mono text-lg focus:border-primary focus:outline-none focus:ring-0" placeholder="(e.g., 300)" max="500"> <p class="mt-1 text-xs text-foreground/50">Pinterest integration is awaiting API approval. This feature is temporarily disabled.</p> </div> <div class="flex items-end md:col-span-2 lg:col-span-3"> <button type="button" id="save-prefs-btn" class="w-full border border-primary bg-primary px-8 py-4 font-mono text-lg font-bold uppercase text-background transition-colors hover:bg-primary/80 disabled:cursor-not-allowed disabled:bg-gray-500">Save as Default</button> </div> </div> </div> </div> <div class="mt-4 flex items-end gap-4"> ${renderComponent($$result2, "LanguageSelector", $$LanguageSelector, { "id": "content-language", "name": "content-language", "labelText": "// Content Language", "defaultValue": "English" })} ${renderComponent($$result2, "LanguageSelector", $$LanguageSelector, { "id": "hashtag-language", "name": "hashtag-language", "labelText": "// Hashtag Language", "defaultValue": "English" })} <button type="submit" class="border border-primary bg-primary px-8 py-4 font-mono text-lg font-bold uppercase text-background transition-colors hover:bg-primary/80 disabled:cursor-not-allowed disabled:bg-gray-500">Pulsar &gt;&gt;</button> </div> </form> </div> <!-- Future content area --> <div id="content-output" class="mt-12"></div> </main> ${renderComponent($$result2, "Modal", $$Modal, {})} ` })} ${renderScript($$result, "/home/enio/projetos/post-pulsar/src/pages/app/index.astro?astro&type=script&index=0&lang.ts")}`;
}, "/home/enio/projetos/post-pulsar/src/pages/app/index.astro", void 0);

const $$file = "/home/enio/projetos/post-pulsar/src/pages/app/index.astro";
const $$url = "/app";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Index,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
