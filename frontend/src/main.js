/* care4all entry point. Import order matters: state first, then core, art, views, and the shell last.
   The educational content is not imported: A.D starts empty and start-up fills it from /api/content (state/content.js). */
import "./styles/fonts.css";
import "./styles/app.css";
import "./styles/account.css";
import "./styles/content.css";
import "./styles/chat.css";
import "./styles/risk.css";
import "./styles/monitor.css";

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

// The AI interview, the risk overview, close monitoring and the doctor PDF. They add A.risk, A.interview, A.monitor* and A.pdf,
// which ui.js and the screens above look up when a screen is drawn, so they load before the shell.
import "./views/risk.js";
import "./views/interview.js";
import "./monitor.js";
import "./pdf.js";
import "./doctor.js";

// The install button and its steps. It sets A.actions.install, which ui.js copies, so it loads before the shell.
import "./install.js";

import "./ui.js";
