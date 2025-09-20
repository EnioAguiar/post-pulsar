/* empty css                                       */
import { e as createComponent, f as createAstro, r as renderTemplate, n as defineScriptVars, h as addAttribute, m as maybeRenderHead, u as unescapeHTML, o as renderSlot, k as renderComponent, l as renderScript } from '../chunks/astro/server_Ci3whAqB.mjs';
import 'kleur/colors';
import { $ as $$Layout } from '../chunks/Layout_FV9-BKeH.mjs';
import 'clsx';
import { $ as $$Modal } from '../chunks/Modal_CNGJZ_0J.mjs';
export { renderers } from '../renderers.mjs';

var __freeze = Object.freeze;
var __defProp = Object.defineProperty;
var __template = (cooked, raw) => __freeze(__defProp(cooked, "raw", { value: __freeze(raw || cooked.slice()) }));
var _a;
const $$Astro$2 = createAstro();
const $$LanguageSelector = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$2, $$props, $$slots);
  Astro2.self = $$LanguageSelector;
  const { id, name, labelText, defaultValue = "English" } = Astro2.props;
  return renderTemplate(_a || (_a = __template(["", "<div", ' class="grow"> <label', ' class="mb-2 block font-mono text-sm uppercase text-foreground/70">', '</label> <div class="relative"> <input type="text"', "", ' required class="w-full rounded-none border border-border bg-background p-4 font-mono text-lg focus:border-primary focus:outline-none focus:ring-0" placeholder="Choose a language..."', ' autocomplete="off"> <div', ' class="absolute z-10 mt-1 hidden max-h-60 w-full overflow-auto rounded-none border border-border bg-background py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm"> <ul', ' class="text-foreground"> <!-- Populated by script --> </ul> </div> </div> </div> <script>(function(){', '\n  const componentRoot = document.getElementById(\n    `language-selector-component-${uniqueId}`,\n  );\n  const input = componentRoot.querySelector(`#${uniqueId}`);\n  const dropdown = componentRoot.querySelector(`#dropdown-${uniqueId}`);\n  const list = componentRoot.querySelector(`#list-${uniqueId}`);\n\n  const allLanguages = [\n    "Afrikaans",\n    "Albanian",\n    "Amharic",\n    "Arabic",\n    "Armenian",\n    "Azerbaijani",\n    "Basque",\n    "Belarusian",\n    "Bengali",\n    "Bosnian",\n    "Bulgarian",\n    "Catalan",\n    "Cebuano",\n    "Chichewa",\n    "Chinese (Simplified)",\n    "Chinese (Traditional)",\n    "Corsican",\n    "Croatian",\n    "Czech",\n    "Danish",\n    "Dutch",\n    "English",\n    "Esperanto",\n    "Estonian",\n    "Filipino",\n    "Finnish",\n    "French",\n    "Frisian",\n    "Galician",\n    "Georgian",\n    "German",\n    "Greek",\n    "Gujarati",\n    "Haitian Creole",\n    "Hausa",\n    "Hawaiian",\n    "Hebrew",\n    "Hindi",\n    "Hmong",\n    "Hungarian",\n    "Icelandic",\n    "Igbo",\n    "Indonesian",\n    "Irish",\n    "Italian",\n    "Japanese",\n    "Javanese",\n    "Kannada",\n    "Kazakh",\n    "Khmer",\n    "Kinyarwanda",\n    "Korean",\n    "Kurdish (Kurmanji)",\n    "Kyrgyz",\n    "Lao",\n    "Latin",\n    "Latvian",\n    "Lithuanian",\n    "Luxembourgish",\n    "Macedonian",\n    "Malagasy",\n    "Malay",\n    "Malayalam",\n    "Maltese",\n    "Maori",\n    "Marathi",\n    "Mongolian",\n    "Myanmar (Burmese)",\n    "Nepali",\n    "Norwegian",\n    "Odia (Oriya)",\n    "Pashto",\n    "Persian",\n    "Polish",\n    "Portuguese",\n    "Punjabi",\n    "Romanian",\n    "Russian",\n    "Samoan",\n    "Scots Gaelic",\n    "Serbian",\n    "Sesotho",\n    "Shona",\n    "Sindhi",\n    "Sinhala",\n    "Slovak",\n    "Slovenian",\n    "Somali",\n    "Spanish",\n    "Sundanese",\n    "Swahili",\n    "Swedish",\n    "Tajik",\n    "Tamil",\n    "Tatar",\n    "Telugu",\n    "Thai",\n    "Turkish",\n    "Turkmen",\n    "Ukrainian",\n    "Urdu",\n    "Uyghur",\n    "Uzbek",\n    "Vietnamese",\n    "Welsh",\n    "Xhosa",\n    "Yiddish",\n    "Yoruba",\n    "Zulu",\n  ];\n\n  let highlightedIndex = -1;\n\n  function populateDropdown(filter = "") {\n    list.innerHTML = "";\n    const filteredLanguages = allLanguages.filter((lang) =>\n      lang.toLowerCase().includes(filter.toLowerCase()),\n    );\n    highlightedIndex = -1; // Reset highlight\n\n    if (filteredLanguages.length > 0) {\n      filteredLanguages.forEach((lang, index) => {\n        const li = document.createElement("li");\n        li.textContent = lang;\n        li.className =\n          "cursor-pointer select-none p-4 font-mono text-lg hover:bg-primary hover:text-background";\n        li.setAttribute("data-index", index.toString());\n\n        li.addEventListener("mousedown", () => {\n          // Use mousedown to avoid focus conflicts\n          input.value = lang;\n          dropdown.classList.add("hidden");\n        });\n\n        li.addEventListener("mouseenter", () => {\n          highlightedIndex = index;\n          updateHighlight();\n        });\n\n        list.appendChild(li);\n      });\n    } else {\n      const li = document.createElement("li");\n      li.textContent = "No language found";\n      li.className = "p-4 font-mono text-lg text-foreground/50";\n      list.appendChild(li);\n    }\n  }\n\n  function updateHighlight() {\n    const items = list.querySelectorAll("li[data-index]");\n    items.forEach((item, index) => {\n      if (index === highlightedIndex) {\n        item.classList.add("bg-primary", "text-background");\n        item.scrollIntoView({ block: "nearest" });\n      } else {\n        item.classList.remove("bg-primary", "text-background");\n      }\n    });\n  }\n\n  if (input && dropdown && list) {\n    input.addEventListener("focus", () => {\n      populateDropdown(""); // Show all languages on focus\n      dropdown.classList.remove("hidden");\n    });\n\n    input.addEventListener("input", () => {\n      populateDropdown(input.value);\n      if (dropdown.classList.contains("hidden")) {\n        dropdown.classList.remove("hidden");\n      }\n    });\n\n    input.addEventListener("blur", () => {\n      // Delay hiding to allow click event on list items\n      setTimeout(() => {\n        dropdown.classList.add("hidden");\n      }, 150); // A bit longer to be safe\n    });\n\n    input.addEventListener("keydown", (e) => {\n      const items = list.querySelectorAll("li[data-index]");\n      if (dropdown.classList.contains("hidden")) {\n        // If dropdown is closed, let arrow keys open it.\n        if (e.key === "ArrowDown" || e.key === "ArrowUp") {\n          dropdown.classList.remove("hidden");\n          populateDropdown(input.value);\n        }\n        return;\n      }\n\n      switch (e.key) {\n        case "ArrowDown":\n          e.preventDefault();\n          highlightedIndex = (highlightedIndex + 1) % items.length;\n          updateHighlight();\n          break;\n        case "ArrowUp":\n          e.preventDefault();\n          highlightedIndex =\n            (highlightedIndex - 1 + items.length) % items.length;\n          updateHighlight();\n          break;\n        case "Enter":\n          e.preventDefault();\n          if (highlightedIndex > -1) {\n            const selectedItem = items[highlightedIndex];\n            if (selectedItem) {\n              input.value = selectedItem.textContent;\n            }\n          }\n          dropdown.classList.add("hidden");\n          break;\n        case "Escape":\n          dropdown.classList.add("hidden");\n          break;\n      }\n    });\n  }\n})();<\/script>'], ["", "<div", ' class="grow"> <label', ' class="mb-2 block font-mono text-sm uppercase text-foreground/70">', '</label> <div class="relative"> <input type="text"', "", ' required class="w-full rounded-none border border-border bg-background p-4 font-mono text-lg focus:border-primary focus:outline-none focus:ring-0" placeholder="Choose a language..."', ' autocomplete="off"> <div', ' class="absolute z-10 mt-1 hidden max-h-60 w-full overflow-auto rounded-none border border-border bg-background py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm"> <ul', ' class="text-foreground"> <!-- Populated by script --> </ul> </div> </div> </div> <script>(function(){', '\n  const componentRoot = document.getElementById(\n    \\`language-selector-component-\\${uniqueId}\\`,\n  );\n  const input = componentRoot.querySelector(\\`#\\${uniqueId}\\`);\n  const dropdown = componentRoot.querySelector(\\`#dropdown-\\${uniqueId}\\`);\n  const list = componentRoot.querySelector(\\`#list-\\${uniqueId}\\`);\n\n  const allLanguages = [\n    "Afrikaans",\n    "Albanian",\n    "Amharic",\n    "Arabic",\n    "Armenian",\n    "Azerbaijani",\n    "Basque",\n    "Belarusian",\n    "Bengali",\n    "Bosnian",\n    "Bulgarian",\n    "Catalan",\n    "Cebuano",\n    "Chichewa",\n    "Chinese (Simplified)",\n    "Chinese (Traditional)",\n    "Corsican",\n    "Croatian",\n    "Czech",\n    "Danish",\n    "Dutch",\n    "English",\n    "Esperanto",\n    "Estonian",\n    "Filipino",\n    "Finnish",\n    "French",\n    "Frisian",\n    "Galician",\n    "Georgian",\n    "German",\n    "Greek",\n    "Gujarati",\n    "Haitian Creole",\n    "Hausa",\n    "Hawaiian",\n    "Hebrew",\n    "Hindi",\n    "Hmong",\n    "Hungarian",\n    "Icelandic",\n    "Igbo",\n    "Indonesian",\n    "Irish",\n    "Italian",\n    "Japanese",\n    "Javanese",\n    "Kannada",\n    "Kazakh",\n    "Khmer",\n    "Kinyarwanda",\n    "Korean",\n    "Kurdish (Kurmanji)",\n    "Kyrgyz",\n    "Lao",\n    "Latin",\n    "Latvian",\n    "Lithuanian",\n    "Luxembourgish",\n    "Macedonian",\n    "Malagasy",\n    "Malay",\n    "Malayalam",\n    "Maltese",\n    "Maori",\n    "Marathi",\n    "Mongolian",\n    "Myanmar (Burmese)",\n    "Nepali",\n    "Norwegian",\n    "Odia (Oriya)",\n    "Pashto",\n    "Persian",\n    "Polish",\n    "Portuguese",\n    "Punjabi",\n    "Romanian",\n    "Russian",\n    "Samoan",\n    "Scots Gaelic",\n    "Serbian",\n    "Sesotho",\n    "Shona",\n    "Sindhi",\n    "Sinhala",\n    "Slovak",\n    "Slovenian",\n    "Somali",\n    "Spanish",\n    "Sundanese",\n    "Swahili",\n    "Swedish",\n    "Tajik",\n    "Tamil",\n    "Tatar",\n    "Telugu",\n    "Thai",\n    "Turkish",\n    "Turkmen",\n    "Ukrainian",\n    "Urdu",\n    "Uyghur",\n    "Uzbek",\n    "Vietnamese",\n    "Welsh",\n    "Xhosa",\n    "Yiddish",\n    "Yoruba",\n    "Zulu",\n  ];\n\n  let highlightedIndex = -1;\n\n  function populateDropdown(filter = "") {\n    list.innerHTML = "";\n    const filteredLanguages = allLanguages.filter((lang) =>\n      lang.toLowerCase().includes(filter.toLowerCase()),\n    );\n    highlightedIndex = -1; // Reset highlight\n\n    if (filteredLanguages.length > 0) {\n      filteredLanguages.forEach((lang, index) => {\n        const li = document.createElement("li");\n        li.textContent = lang;\n        li.className =\n          "cursor-pointer select-none p-4 font-mono text-lg hover:bg-primary hover:text-background";\n        li.setAttribute("data-index", index.toString());\n\n        li.addEventListener("mousedown", () => {\n          // Use mousedown to avoid focus conflicts\n          input.value = lang;\n          dropdown.classList.add("hidden");\n        });\n\n        li.addEventListener("mouseenter", () => {\n          highlightedIndex = index;\n          updateHighlight();\n        });\n\n        list.appendChild(li);\n      });\n    } else {\n      const li = document.createElement("li");\n      li.textContent = "No language found";\n      li.className = "p-4 font-mono text-lg text-foreground/50";\n      list.appendChild(li);\n    }\n  }\n\n  function updateHighlight() {\n    const items = list.querySelectorAll("li[data-index]");\n    items.forEach((item, index) => {\n      if (index === highlightedIndex) {\n        item.classList.add("bg-primary", "text-background");\n        item.scrollIntoView({ block: "nearest" });\n      } else {\n        item.classList.remove("bg-primary", "text-background");\n      }\n    });\n  }\n\n  if (input && dropdown && list) {\n    input.addEventListener("focus", () => {\n      populateDropdown(""); // Show all languages on focus\n      dropdown.classList.remove("hidden");\n    });\n\n    input.addEventListener("input", () => {\n      populateDropdown(input.value);\n      if (dropdown.classList.contains("hidden")) {\n        dropdown.classList.remove("hidden");\n      }\n    });\n\n    input.addEventListener("blur", () => {\n      // Delay hiding to allow click event on list items\n      setTimeout(() => {\n        dropdown.classList.add("hidden");\n      }, 150); // A bit longer to be safe\n    });\n\n    input.addEventListener("keydown", (e) => {\n      const items = list.querySelectorAll("li[data-index]");\n      if (dropdown.classList.contains("hidden")) {\n        // If dropdown is closed, let arrow keys open it.\n        if (e.key === "ArrowDown" || e.key === "ArrowUp") {\n          dropdown.classList.remove("hidden");\n          populateDropdown(input.value);\n        }\n        return;\n      }\n\n      switch (e.key) {\n        case "ArrowDown":\n          e.preventDefault();\n          highlightedIndex = (highlightedIndex + 1) % items.length;\n          updateHighlight();\n          break;\n        case "ArrowUp":\n          e.preventDefault();\n          highlightedIndex =\n            (highlightedIndex - 1 + items.length) % items.length;\n          updateHighlight();\n          break;\n        case "Enter":\n          e.preventDefault();\n          if (highlightedIndex > -1) {\n            const selectedItem = items[highlightedIndex];\n            if (selectedItem) {\n              input.value = selectedItem.textContent;\n            }\n          }\n          dropdown.classList.add("hidden");\n          break;\n        case "Escape":\n          dropdown.classList.add("hidden");\n          break;\n      }\n    });\n  }\n})();<\/script>'])), maybeRenderHead(), addAttribute(`language-selector-component-${id}`, "id"), addAttribute(id, "for"), labelText, addAttribute(id, "id"), addAttribute(name, "name"), addAttribute(defaultValue, "value"), addAttribute(`dropdown-${id}`, "id"), addAttribute(`list-${id}`, "id"), defineScriptVars({ uniqueId: id }));
}, "/home/enio/projetos/post-pulsar/src/components/LanguageSelector.astro", void 0);

const $$Astro$1 = createAstro();
const $$NetworkSelectorCheckbox = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$1, $$props, $$slots);
  Astro2.self = $$NetworkSelectorCheckbox;
  const { value, label } = Astro2.props;
  return renderTemplate`${maybeRenderHead()}<label class="flex items-center gap-2 rounded-none border border-border bg-background p-4 font-mono text-lg"> <input type="checkbox" name="target-network"${addAttribute(value, "value")} class="network-select-checkbox size-5 rounded-none bg-background accent-primary focus:ring-0 focus:ring-offset-0"> <span>${label}</span> </label>`;
}, "/home/enio/projetos/post-pulsar/src/components/NetworkSelectorCheckbox.astro", void 0);

const $$Astro = createAstro();
const $$AdvancedSettingInput = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$AdvancedSettingInput;
  const {
    id,
    name,
    labelText,
    placeholder,
    max,
    disabled = false,
    helpText = "Note: This is an instruction for the AI. The final text may be slightly longer or shorter."
  } = Astro2.props;
  return renderTemplate`${maybeRenderHead()}<div> <label${addAttribute(id, "for")} class="mb-2 block font-mono text-sm uppercase text-foreground/70">${unescapeHTML(`// Approx. Chars (${labelText})`)}</label> <input type="number"${addAttribute(id, "id")}${addAttribute(name, "name")}${addAttribute([
    "w-full rounded-none border border-border bg-background p-4 font-mono text-lg focus:border-primary focus:outline-none focus:ring-0",
    { "bg-background/50 text-foreground/50": disabled }
  ], "class:list")}${addAttribute(placeholder, "placeholder")}${addAttribute(max, "max")}${addAttribute(disabled, "disabled")}> <p class="mt-1 text-xs text-foreground/50">${unescapeHTML(helpText)}</p> ${Astro2.slots.has("extra") && renderTemplate`<div class="mt-2">${renderSlot($$result, $$slots["extra"])}</div>`} </div>`;
}, "/home/enio/projetos/post-pulsar/src/components/AdvancedSettingInput.astro", void 0);

const $$Index = createComponent(($$result, $$props, $$slots) => {
  const networks = [
    { value: "linkedin", label: "LinkedIn" },
    { value: "twitter", label: "X" },
    { value: "instagram", label: "Instagram" },
    { value: "threads", label: "Threads" },
    { value: "facebook", label: "Facebook" },
    { value: "telegram", label: "Telegram" },
    { value: "discord", label: "Discord" }
  ];
  const advancedSettings = [
    {
      id: "linkedin-char-count",
      name: "linkedin-char-count",
      labelText: "LinkedIn",
      placeholder: "(e.g., 2000)",
      max: "3000"
    },
    {
      id: "twitter-char-count",
      name: "twitter-char-count",
      labelText: "X",
      placeholder: "(e.g., 250)",
      max: "280",
      hasExtra: true
    },
    {
      id: "instagram-char-count",
      name: "instagram-char-count",
      labelText: "Instagram",
      placeholder: "(e.g., 400)",
      max: "2200"
    },
    {
      id: "threads-char-count",
      name: "threads-char-count",
      labelText: "Threads",
      placeholder: "(e.g., 450)",
      max: "500"
    },
    {
      id: "facebook-char-count",
      name: "facebook-char-count",
      labelText: "Facebook",
      placeholder: "Not set",
      max: "63206"
    },
    {
      id: "discord-char-count",
      name: "discord-char-count",
      labelText: "Discord",
      placeholder: "(e.g., 1500)",
      max: "2000"
    },
    {
      id: "telegram-char-count",
      name: "telegram-char-count",
      labelText: "Telegram",
      placeholder: "(e.g., 2000)",
      max: "4096"
    }
  ];
  return renderTemplate`${renderComponent($$result, "Layout", $$Layout, { "title": "Dashboard // PostPulsar" }, { "default": ($$result2) => renderTemplate` ${maybeRenderHead()}<main class="container py-12"> <div class="flex items-start justify-between"> <div> <h1 id="welcome-message" class="text-3xl font-bold uppercase">
// Mission Control
</h1> <p class="mt-2 text-foreground/70">
System ready. Paste the article URL to begin transmission.
</p> </div> <div class="text-right font-mono"> <p class="text-sm uppercase text-foreground/70">Pulse Balance</p> <p id="pulse-count-display" class="text-3xl font-bold">--</p> <!-- DEBUG: Display User Plan --> <p class="mt-2 text-sm uppercase text-foreground/70">Current Plan</p> <p id="plan-display" class="text-lg font-bold">--</p> </div> </div> <div class="mt-8"> <form id="pulsar-form"> <div class="mb-4"> <!-- Input Mode Toggles --> <div class="mb-2 flex gap-2"> <button type="button" id="url-mode-btn" class="input-mode-btn border-b-2 border-primary pb-1 font-mono text-sm uppercase text-primary" data-mode="url">// From URL</button> <button type="button" id="text-mode-btn" class="input-mode-btn border-b-2 border-transparent pb-1 font-mono text-sm uppercase text-foreground/70 transition-colors hover:text-primary" data-mode="text">// From Text</button> </div> <!-- URL Input --> <div id="url-input-container"> <label for="post-url" class="mb-2 block font-mono text-sm uppercase text-foreground/70">// Article URL</label> <input type="url" id="post-url" name="post-url" required class="w-full rounded-none border border-border bg-background p-4 font-mono text-lg focus:border-primary focus:outline-none focus:ring-0" placeholder="https://your-blog.com/your-awesome-article"> </div> <!-- Text Input --> <div id="text-input-container" class="hidden"> <label for="raw-text" class="mb-2 block font-mono text-sm uppercase text-foreground/70">// Article Text</label> <textarea id="raw-text" name="raw-text" rows="10" class="w-full rounded-none border border-border bg-background p-4 font-mono text-lg focus:border-primary focus:outline-none focus:ring-0" placeholder="Paste your full article content here..."></textarea> </div> </div> <!-- Seção de Prompts --> <div class="mb-4"> <label for="prompt-selector" class="mb-2 block font-mono text-sm uppercase text-foreground/70">// Prompt</label> <div class="flex items-center gap-2"> <select id="prompt-selector" name="prompt-selector" class="w-full rounded-none border border-border bg-background p-4 font-mono text-lg focus:border-primary focus:outline-none focus:ring-0"> <!-- Opções de prompt serão populadas via JS --> </select> <button type="button" id="manage-prompts-btn" class="hidden rounded-none border border-foreground/50 p-4 transition-colors hover:bg-foreground/10" aria-label="Manage prompts"> <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-settings-2"><path d="M20 7h-9"></path><path d="M14 17H5"></path><circle cx="17" cy="17" r="3"></circle><circle cx="7" cy="7" r="3"></circle></svg> </button> <button type="button" id="add-prompt-btn" class="hidden rounded-none border border-primary p-4 transition-colors hover:bg-primary/10" aria-label="Create new prompt"> <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-plus"><path d="M5 12h14"></path><path d="M12 5v14"></path></svg> </button> </div> <p class="mt-1 text-xs text-foreground/50">
Select a prompt to guide the AI or create a new one (requires Pro
            plan).
</p> </div> <!-- Seção de Seleção de Redes --> <div class="mb-4"> <label class="mb-2 block font-mono text-sm uppercase text-foreground/70">// Target Networks</label> <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7"> ${networks.map((network) => renderTemplate`${renderComponent($$result2, "NetworkSelectorCheckbox", $$NetworkSelectorCheckbox, { "value": network.value, "label": network.label })}`)} </div> <div class="mt-2 flex items-center gap-2"> <input type="checkbox" id="select-all-networks" class="size-4 rounded-none bg-background accent-primary focus:ring-0 focus:ring-offset-0"> <label for="select-all-networks" class="font-mono text-sm text-foreground/70">Select all</label> </div> <p class="mt-1 text-xs text-foreground/50">
Choose which social networks to generate content for. Each network
            costs 1 pulse.
</p> </div> <!-- Advanced Settings Accordion --> <div class="mt-4"> <button type="button" id="advanced-settings-toggle" class="font-mono text-sm uppercase text-foreground hover:text-primary">
&gt; Advanced Settings
</button> <div id="advanced-settings-panel" class="mt-4 hidden border border-border/50 p-4"> <p class="mb-4 text-xs text-foreground/50">
// Note on truncation: The AI tries to respect the character count, but it's not a hard limit. The system prioritizes keeping hashtags intact, so the final text may sometimes exceed the specified value.
</p> <div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"> ${advancedSettings.map((setting) => renderTemplate`${renderComponent($$result2, "AdvancedSettingInput", $$AdvancedSettingInput, { "id": setting.id, "name": setting.name, "labelText": setting.labelText, "placeholder": setting.placeholder, "max": setting.max, "disabled": setting.disabled, "helpText": setting.helpText }, { "extra": ($$result3) => renderTemplate`${setting.hasExtra && renderTemplate`<div class="flex items-center gap-2"> <input type="checkbox" id="twitter-premium-check" name="twitter-premium-check" class="size-4 rounded-none bg-background accent-primary focus:ring-0 focus:ring-offset-0"> <label for="twitter-premium-check" class="font-mono text-xs text-foreground/70">
I have a Premium account (up to 25000 chars)
</label> </div>`}` })}`)} <div class="flex items-end md:col-span-2 lg:col-span-3"> <button type="button" id="save-prefs-btn" class="w-full border border-primary bg-primary px-8 py-4 font-mono text-lg font-bold uppercase text-background transition-colors hover:bg-primary/80 disabled:cursor-not-allowed disabled:bg-gray-500">Save as Default</button> </div> </div> </div> </div> <div class="mt-4 flex items-end gap-4"> ${renderComponent($$result2, "LanguageSelector", $$LanguageSelector, { "id": "content-language", "name": "content-language", "labelText": "// Content Language", "defaultValue": "English" })} ${renderComponent($$result2, "LanguageSelector", $$LanguageSelector, { "id": "hashtag-language", "name": "hashtag-language", "labelText": "// Hashtag Language", "defaultValue": "English" })} <button type="submit" class="border border-primary bg-primary px-8 py-4 font-mono text-lg font-bold uppercase text-background transition-colors hover:bg-primary/80 disabled:cursor-not-allowed disabled:bg-gray-500">Pulsar &gt;&gt;</button> </div> </form> </div> <!-- Future content area --> <div id="content-output" class="mt-12"></div> </main> ${renderComponent($$result2, "Modal", $$Modal, {})} ` })} ${renderScript($$result, "/home/enio/projetos/post-pulsar/src/pages/app/index.astro?astro&type=script&index=0&lang.ts")}`;
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
