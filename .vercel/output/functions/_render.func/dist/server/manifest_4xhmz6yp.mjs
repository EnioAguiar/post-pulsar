import 'kleur/colors';
import { q as decodeKey } from './chunks/astro/server_b5n78yJd.mjs';
import 'clsx';
import 'cookie';
import { N as NOOP_MIDDLEWARE_FN } from './chunks/astro-designed-error-pages_gzA-_Syy.mjs';
import 'es-module-lexer';

function sanitizeParams(params) {
  return Object.fromEntries(
    Object.entries(params).map(([key, value]) => {
      if (typeof value === "string") {
        return [key, value.normalize().replace(/#/g, "%23").replace(/\?/g, "%3F")];
      }
      return [key, value];
    })
  );
}
function getParameter(part, params) {
  if (part.spread) {
    return params[part.content.slice(3)] || "";
  }
  if (part.dynamic) {
    if (!params[part.content]) {
      throw new TypeError(`Missing parameter: ${part.content}`);
    }
    return params[part.content];
  }
  return part.content.normalize().replace(/\?/g, "%3F").replace(/#/g, "%23").replace(/%5B/g, "[").replace(/%5D/g, "]");
}
function getSegment(segment, params) {
  const segmentPath = segment.map((part) => getParameter(part, params)).join("");
  return segmentPath ? "/" + segmentPath : "";
}
function getRouteGenerator(segments, addTrailingSlash) {
  return (params) => {
    const sanitizedParams = sanitizeParams(params);
    let trailing = "";
    if (addTrailingSlash === "always" && segments.length) {
      trailing = "/";
    }
    const path = segments.map((segment) => getSegment(segment, sanitizedParams)).join("") + trailing;
    return path || "/";
  };
}

function deserializeRouteData(rawRouteData) {
  return {
    route: rawRouteData.route,
    type: rawRouteData.type,
    pattern: new RegExp(rawRouteData.pattern),
    params: rawRouteData.params,
    component: rawRouteData.component,
    generate: getRouteGenerator(rawRouteData.segments, rawRouteData._meta.trailingSlash),
    pathname: rawRouteData.pathname || void 0,
    segments: rawRouteData.segments,
    prerender: rawRouteData.prerender,
    redirect: rawRouteData.redirect,
    redirectRoute: rawRouteData.redirectRoute ? deserializeRouteData(rawRouteData.redirectRoute) : void 0,
    fallbackRoutes: rawRouteData.fallbackRoutes.map((fallback) => {
      return deserializeRouteData(fallback);
    }),
    isIndex: rawRouteData.isIndex,
    origin: rawRouteData.origin
  };
}

function deserializeManifest(serializedManifest) {
  const routes = [];
  for (const serializedRoute of serializedManifest.routes) {
    routes.push({
      ...serializedRoute,
      routeData: deserializeRouteData(serializedRoute.routeData)
    });
    const route = serializedRoute;
    route.routeData = deserializeRouteData(serializedRoute.routeData);
  }
  const assets = new Set(serializedManifest.assets);
  const componentMetadata = new Map(serializedManifest.componentMetadata);
  const inlinedScripts = new Map(serializedManifest.inlinedScripts);
  const clientDirectives = new Map(serializedManifest.clientDirectives);
  const serverIslandNameMap = new Map(serializedManifest.serverIslandNameMap);
  const key = decodeKey(serializedManifest.key);
  return {
    // in case user middleware exists, this no-op middleware will be reassigned (see plugin-ssr.ts)
    middleware() {
      return { onRequest: NOOP_MIDDLEWARE_FN };
    },
    ...serializedManifest,
    assets,
    componentMetadata,
    inlinedScripts,
    clientDirectives,
    routes,
    serverIslandNameMap,
    key
  };
}

const manifest = deserializeManifest({"hrefRoot":"file:///home/enio/projetos/post-pulsar/","cacheDir":"file:///home/enio/projetos/post-pulsar/node_modules/.astro/","outDir":"file:///home/enio/projetos/post-pulsar/dist/","srcDir":"file:///home/enio/projetos/post-pulsar/src/","publicDir":"file:///home/enio/projetos/post-pulsar/public/","buildClientDir":"file:///home/enio/projetos/post-pulsar/dist/client/","buildServerDir":"file:///home/enio/projetos/post-pulsar/dist/server/","adapterName":"@astrojs/vercel","routes":[{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"type":"page","component":"_server-islands.astro","params":["name"],"segments":[[{"content":"_server-islands","dynamic":false,"spread":false}],[{"content":"name","dynamic":true,"spread":false}]],"pattern":"^\\/_server-islands\\/([^/]+?)\\/?$","prerender":false,"isIndex":false,"fallbackRoutes":[],"route":"/_server-islands/[name]","origin":"internal","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"type":"endpoint","isIndex":false,"route":"/_image","pattern":"^\\/_image\\/?$","segments":[[{"content":"_image","dynamic":false,"spread":false}]],"params":[],"component":"node_modules/astro/dist/assets/endpoint/generic.js","pathname":"/_image","prerender":false,"fallbackRoutes":[],"origin":"internal","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"/_astro/connections.DZfVfJWR.css"}],"routeData":{"route":"/app/connections","isIndex":false,"type":"page","pattern":"^\\/app\\/connections\\/?$","segments":[[{"content":"app","dynamic":false,"spread":false}],[{"content":"connections","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/app/connections.astro","pathname":"/app/connections","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"/_astro/connections.DZfVfJWR.css"}],"routeData":{"route":"/app/history","isIndex":false,"type":"page","pattern":"^\\/app\\/history\\/?$","segments":[[{"content":"app","dynamic":false,"spread":false}],[{"content":"history","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/app/history.astro","pathname":"/app/history","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"/_astro/connections.DZfVfJWR.css"}],"routeData":{"route":"/app/settings","isIndex":false,"type":"page","pattern":"^\\/app\\/settings\\/?$","segments":[[{"content":"app","dynamic":false,"spread":false}],[{"content":"settings","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/app/settings.astro","pathname":"/app/settings","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"/_astro/connections.DZfVfJWR.css"}],"routeData":{"route":"/app","isIndex":true,"type":"page","pattern":"^\\/app\\/?$","segments":[[{"content":"app","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/app/index.astro","pathname":"/app","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"/_astro/connections.DZfVfJWR.css"}],"routeData":{"route":"/login","isIndex":false,"type":"page","pattern":"^\\/login\\/?$","segments":[[{"content":"login","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/login.astro","pathname":"/login","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"/_astro/connections.DZfVfJWR.css"}],"routeData":{"route":"/privacy","isIndex":false,"type":"page","pattern":"^\\/privacy\\/?$","segments":[[{"content":"privacy","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/privacy.astro","pathname":"/privacy","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"/_astro/connections.DZfVfJWR.css"}],"routeData":{"route":"/signup","isIndex":false,"type":"page","pattern":"^\\/signup\\/?$","segments":[[{"content":"signup","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/signup.astro","pathname":"/signup","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"/_astro/connections.DZfVfJWR.css"}],"routeData":{"route":"/terms","isIndex":false,"type":"page","pattern":"^\\/terms\\/?$","segments":[[{"content":"terms","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/terms.astro","pathname":"/terms","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"/_astro/connections.DZfVfJWR.css"}],"routeData":{"route":"/update-password","isIndex":false,"type":"page","pattern":"^\\/update-password\\/?$","segments":[[{"content":"update-password","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/update-password.astro","pathname":"/update-password","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"/_astro/connections.DZfVfJWR.css"}],"routeData":{"route":"/","isIndex":true,"type":"page","pattern":"^\\/$","segments":[],"params":[],"component":"src/pages/index.astro","pathname":"/","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}}],"base":"/","trailingSlash":"ignore","compressHTML":true,"componentMetadata":[["/home/enio/projetos/post-pulsar/src/pages/app/connections.astro",{"propagation":"none","containsHead":true}],["/home/enio/projetos/post-pulsar/src/pages/app/history.astro",{"propagation":"none","containsHead":true}],["/home/enio/projetos/post-pulsar/src/pages/app/index.astro",{"propagation":"none","containsHead":true}],["/home/enio/projetos/post-pulsar/src/pages/app/settings.astro",{"propagation":"none","containsHead":true}],["/home/enio/projetos/post-pulsar/src/pages/index.astro",{"propagation":"none","containsHead":true}],["/home/enio/projetos/post-pulsar/src/pages/login.astro",{"propagation":"none","containsHead":true}],["/home/enio/projetos/post-pulsar/src/pages/privacy.astro",{"propagation":"none","containsHead":true}],["/home/enio/projetos/post-pulsar/src/pages/signup.astro",{"propagation":"none","containsHead":true}],["/home/enio/projetos/post-pulsar/src/pages/terms.astro",{"propagation":"none","containsHead":true}],["/home/enio/projetos/post-pulsar/src/pages/update-password.astro",{"propagation":"none","containsHead":true}]],"renderers":[],"clientDirectives":[["idle","(()=>{var l=(n,t)=>{let i=async()=>{await(await n())()},e=typeof t.value==\"object\"?t.value:void 0,s={timeout:e==null?void 0:e.timeout};\"requestIdleCallback\"in window?window.requestIdleCallback(i,s):setTimeout(i,s.timeout||200)};(self.Astro||(self.Astro={})).idle=l;window.dispatchEvent(new Event(\"astro:idle\"));})();"],["load","(()=>{var e=async t=>{await(await t())()};(self.Astro||(self.Astro={})).load=e;window.dispatchEvent(new Event(\"astro:load\"));})();"],["media","(()=>{var n=(a,t)=>{let i=async()=>{await(await a())()};if(t.value){let e=matchMedia(t.value);e.matches?i():e.addEventListener(\"change\",i,{once:!0})}};(self.Astro||(self.Astro={})).media=n;window.dispatchEvent(new Event(\"astro:media\"));})();"],["only","(()=>{var e=async t=>{await(await t())()};(self.Astro||(self.Astro={})).only=e;window.dispatchEvent(new Event(\"astro:only\"));})();"],["visible","(()=>{var a=(s,i,o)=>{let r=async()=>{await(await s())()},t=typeof i.value==\"object\"?i.value:void 0,c={rootMargin:t==null?void 0:t.rootMargin},n=new IntersectionObserver(e=>{for(let l of e)if(l.isIntersecting){n.disconnect(),r();break}},c);for(let e of o.children)n.observe(e)};(self.Astro||(self.Astro={})).visible=a;window.dispatchEvent(new Event(\"astro:visible\"));})();"]],"entryModules":{"\u0000noop-middleware":"_noop-middleware.mjs","\u0000noop-actions":"_noop-actions.mjs","\u0000@astro-page:src/pages/app/connections@_@astro":"pages/app/connections.astro.mjs","\u0000@astro-page:src/pages/app/history@_@astro":"pages/app/history.astro.mjs","\u0000@astro-page:src/pages/app/settings@_@astro":"pages/app/settings.astro.mjs","\u0000@astro-page:src/pages/app/index@_@astro":"pages/app.astro.mjs","\u0000@astro-page:src/pages/login@_@astro":"pages/login.astro.mjs","\u0000@astro-page:src/pages/privacy@_@astro":"pages/privacy.astro.mjs","\u0000@astro-page:src/pages/signup@_@astro":"pages/signup.astro.mjs","\u0000@astro-page:src/pages/terms@_@astro":"pages/terms.astro.mjs","\u0000@astro-page:src/pages/update-password@_@astro":"pages/update-password.astro.mjs","\u0000@astro-page:src/pages/index@_@astro":"pages/index.astro.mjs","\u0000@astrojs-ssr-virtual-entry":"entry.mjs","\u0000@astro-renderers":"renderers.mjs","\u0000@astro-page:node_modules/astro/dist/assets/endpoint/generic@_@js":"pages/_image.astro.mjs","\u0000@astrojs-ssr-adapter":"_@astrojs-ssr-adapter.mjs","\u0000@astrojs-manifest":"manifest_4xhmz6yp.mjs","/home/enio/projetos/post-pulsar/node_modules/astro/dist/assets/services/sharp.js":"chunks/sharp_CLtMDRF8.mjs","/home/enio/projetos/post-pulsar/src/pages/app/connections.astro?astro&type=script&index=0&lang.ts":"_astro/connections.astro_astro_type_script_index_0_lang.CLOFglEo.js","/home/enio/projetos/post-pulsar/src/pages/app/settings.astro?astro&type=script&index=0&lang.ts":"_astro/settings.astro_astro_type_script_index_0_lang.deX9vpxA.js","/home/enio/projetos/post-pulsar/src/pages/app/index.astro?astro&type=script&index=0&lang.ts":"_astro/index.astro_astro_type_script_index_0_lang.BAfT7dS9.js","/home/enio/projetos/post-pulsar/src/pages/app/history.astro?astro&type=script&index=0&lang.ts":"_astro/history.astro_astro_type_script_index_0_lang.60rvi_Aq.js","/home/enio/projetos/post-pulsar/src/pages/login.astro?astro&type=script&index=0&lang.ts":"_astro/login.astro_astro_type_script_index_0_lang.CZMMQ2qB.js","/home/enio/projetos/post-pulsar/src/pages/signup.astro?astro&type=script&index=0&lang.ts":"_astro/signup.astro_astro_type_script_index_0_lang.DVFGkLY1.js","/home/enio/projetos/post-pulsar/src/pages/update-password.astro?astro&type=script&index=0&lang.ts":"_astro/update-password.astro_astro_type_script_index_0_lang.DWNTGvSR.js","/home/enio/projetos/post-pulsar/src/layouts/Layout.astro?astro&type=script&index=0&lang.ts":"_astro/Layout.astro_astro_type_script_index_0_lang.DZQkpRhK.js","/home/enio/projetos/post-pulsar/src/components/Modal.astro?astro&type=script&index=0&lang.ts":"_astro/Modal.astro_astro_type_script_index_0_lang.DTD-PdJo.js","astro:scripts/before-hydration.js":""},"inlinedScripts":[],"assets":["/_astro/connections.DZfVfJWR.css","/PostPulsar.png","/PostPulsar.svg","/desenho2.png","/favicon.svg","/_astro/Layout.astro_astro_type_script_index_0_lang.DZQkpRhK.js","/_astro/Modal.astro_astro_type_script_index_0_lang.DTD-PdJo.js","/_astro/connections.astro_astro_type_script_index_0_lang.CLOFglEo.js","/_astro/history.astro_astro_type_script_index_0_lang.60rvi_Aq.js","/_astro/index.astro_astro_type_script_index_0_lang.BAfT7dS9.js","/_astro/login.astro_astro_type_script_index_0_lang.CZMMQ2qB.js","/_astro/modal.nV_2emiF.js","/_astro/settings.astro_astro_type_script_index_0_lang.deX9vpxA.js","/_astro/signup.astro_astro_type_script_index_0_lang.DVFGkLY1.js","/_astro/supabase.DgUsAF8C.js","/_astro/update-password.astro_astro_type_script_index_0_lang.DWNTGvSR.js"],"buildFormat":"directory","checkOrigin":true,"serverIslandNameMap":[],"key":"BHDxpS09ws87OWgHOjI56Y+gKxZdPeByp8blttbcgDI="});
if (manifest.sessionConfig) manifest.sessionConfig.driverModule = null;

export { manifest };
