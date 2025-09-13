/* empty css                                       */
import { e as createComponent, m as maybeRenderHead, u as unescapeHTML, r as renderTemplate, k as renderComponent } from '../chunks/astro/server_b5n78yJd.mjs';
import 'kleur/colors';
import { $ as $$Layout } from '../chunks/Layout_DGGlkE_n.mjs';
import 'clsx';
export { renderers } from '../renderers.mjs';

const html = () => "<h1 id=\"privacy-policy\">Privacy Policy</h1>\n<p>This is the privacy policy for PostPulsar. This is a placeholder page.</p>\n<p>We are committed to protecting your privacy. This policy outlines how we handle your personal information to protect your privacy.</p>\n<h2 id=\"information-we-collect\">Information We Collect</h2>\n<p>When you connect your social media accounts, we securely store authentication tokens that allow us to post on your behalf. We do not store your passwords.</p>\n<h2 id=\"how-we-use-your-information\">How We Use Your Information</h2>\n<p>We use the stored tokens exclusively to publish content to your connected accounts as requested by you through our service.</p>\n<h2 id=\"data-security\">Data Security</h2>\n<p>All sensitive information, such as API tokens, is stored encrypted in our database.</p>\n<h2 id=\"contact-us\">Contact Us</h2>\n<p>If you have any questions about this privacy policy, you can contact us.</p>";

				const frontmatter = {};
				const file = "/home/enio/projetos/post-pulsar/PRIVACY-POLICY.md";
				const url = undefined;

				const Content = createComponent((result, _props, slots) => {
					const { layout, ...content } = frontmatter;
					content.file = file;
					content.url = url;

					return renderTemplate`${maybeRenderHead()}${unescapeHTML(html())}`;
				});

const $$Privacy = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`${renderComponent($$result, "Layout", $$Layout, { "title": "Privacy Policy // PostPulsar" }, { "default": ($$result2) => renderTemplate` ${maybeRenderHead()}<main class="container py-12"> <div class="prose prose-invert prose-headings:border-b prose-headings:border-border prose-headings:pb-4 prose-a:text-primary hover:prose-a:text-primary/80 mx-auto max-w-4xl"> ${renderComponent($$result2, "PrivacyContent", Content, {})} </div> </main> ` })}`;
}, "/home/enio/projetos/post-pulsar/src/pages/privacy.astro", void 0);

const $$file = "/home/enio/projetos/post-pulsar/src/pages/privacy.astro";
const $$url = "/privacy";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
	__proto__: null,
	default: $$Privacy,
	file: $$file,
	url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
