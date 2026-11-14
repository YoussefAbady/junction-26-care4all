/* care4all entry point. Import order matters: state and content first, then core, art, views, and the shell last. */
import "./styles/fonts.css";
import "./styles/app.css";
import "./styles/account.css";
import "./styles/content.css";
import "./styles/chat.css";

import "./content/data.js";
import "./content/research.js";
import "./content/merge.js";
import "./content/facts.js";

import "./state/index.js";
import "./core.js";

import "./art/part1.js";
import "./art/part2.js";
import "./art/part3.js";
import "./art/part4-journeys.js";
import "./art/part4-demos.js";
import "./art/part5-guides.js";

import "./coach.js";
import "./views/screens.js";
import "./views/scans.js";
import "./views/screens2.js";
import "./sessions.js";

// Modules that replace views defined above. A later assignment to A.views[name] wins.
import "./views/account.js";
import "./views/ask.js";

import "./ui.js";
