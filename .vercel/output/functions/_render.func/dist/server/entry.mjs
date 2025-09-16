import { renderers } from './renderers.mjs';
import { c as createExports, s as serverEntrypointModule } from './chunks/_@astrojs-ssr-adapter_5Vt6C7JK.mjs';
import { manifest } from './manifest_Dt1o3nxK.mjs';

const serverIslandMap = new Map();;

const _page0 = () => import('./pages/_image.astro.mjs');
const _page1 = () => import('./pages/app/connections.astro.mjs');
const _page2 = () => import('./pages/app/history.astro.mjs');
const _page3 = () => import('./pages/app/settings.astro.mjs');
const _page4 = () => import('./pages/app.astro.mjs');
const _page5 = () => import('./pages/login.astro.mjs');
const _page6 = () => import('./pages/privacy.astro.mjs');
const _page7 = () => import('./pages/signup.astro.mjs');
const _page8 = () => import('./pages/terms.astro.mjs');
const _page9 = () => import('./pages/update-password.astro.mjs');
const _page10 = () => import('./pages/index.astro.mjs');
const pageMap = new Map([
    ["node_modules/astro/dist/assets/endpoint/generic.js", _page0],
    ["src/pages/app/connections.astro", _page1],
    ["src/pages/app/history.astro", _page2],
    ["src/pages/app/settings.astro", _page3],
    ["src/pages/app/index.astro", _page4],
    ["src/pages/login.astro", _page5],
    ["src/pages/privacy.astro", _page6],
    ["src/pages/signup.astro", _page7],
    ["src/pages/terms.astro", _page8],
    ["src/pages/update-password.astro", _page9],
    ["src/pages/index.astro", _page10]
]);

const _manifest = Object.assign(manifest, {
    pageMap,
    serverIslandMap,
    renderers,
    actions: () => import('./_noop-actions.mjs'),
    middleware: () => import('./_noop-middleware.mjs')
});
const _args = {
    "middlewareSecret": "f08bf3fd-7c4c-43ea-990b-2b47324c9d9b",
    "skewProtection": false
};
const _exports = createExports(_manifest, _args);
const __astrojsSsrVirtualEntry = _exports.default;
const _start = 'start';
if (Object.prototype.hasOwnProperty.call(serverEntrypointModule, _start)) ;

export { __astrojsSsrVirtualEntry as default, pageMap };
