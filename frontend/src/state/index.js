/* Puts the state, the services and the API on the registry so every module reaches them as A.S, A.svc and A.api. */
import { A } from "../app.js";
import { api } from "../api/index.js";
import { S, svc, apiTopic, designTopic, persistDisplay } from "./store.js";
import { tr, errorText } from "./text.js";

A.S = S;
A.svc = svc;
A.api = api;
A.tr = tr;
A.errorText = errorText;
A.apiTopic = apiTopic;
A.designTopic = designTopic;
A.persistDisplay = persistDisplay;
/** Shows a failed backend call as a toast. A.toast is provided by the shell. */
A.fail = error => A.toast(errorText(error), 5500);
