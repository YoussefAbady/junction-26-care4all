/**
 * Fills the two declarations in src/sw.js: the cache version and the precache list. The substitution is exact
 * and the build fails if either placeholder is still present afterwards, because a worker that throws when it
 * loads fails to register without any useful message.
 *
 * @param {string} template  the text of src/sw.js
 * @param {{ version: string, urls: string[] }} build
 */
export function renderServiceWorker(template, { version, urls }) {
  const versionDeclaration = 'const VERSION = "__VERSION__";';
  const precacheDeclaration = "const PRECACHE = __PRECACHE__;";
  if (!template.includes(versionDeclaration) || !template.includes(precacheDeclaration)) {
    throw new Error("src/sw.js must declare VERSION and PRECACHE exactly as render-sw.js expects");
  }
  const source = template
    .replace(versionDeclaration, () => `const VERSION = ${JSON.stringify(version)};`)
    .replace(precacheDeclaration, () => `const PRECACHE = ${JSON.stringify(urls, null, 2)};`);
  if (source.includes("__VERSION__") || source.includes("__PRECACHE__")) throw new Error("A service worker placeholder was not replaced");
  return source;
}
