/*
 * The application registry.
 *
 * care4all is organised the way the design is: modules attach views, actions and form handlers to one shared
 * object, and the shell looks them up by name. Keeping that shape means a revised design can be compared with
 * these modules function by function. Everything personal goes through src/state and src/api, never through
 * browser storage.
 *
 *   A.views[name](arg)   returns the screen { title, html, ... } for a route
 *   A.actions[name](el)  handles data-action="name" clicks
 *   A.forms[name](form)  handles data-form="name" submits
 *   A.changes / A.inputs handle change and input events inside a data-form
 *
 *   A.D                  the public educational content. It starts empty: start-up fills it in place from
 *                        GET /api/content (src/state/content.js), before the first screen is drawn. A module may keep
 *                        `var D = A.D`, but must read D.TOPICS and the rest only when it runs, never when it loads.
 *   A.contentVersion     the version of that content, once it has loaded
 */
export const A = { D: {}, contentVersion: null };
