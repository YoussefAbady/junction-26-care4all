"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Activity, ArrowDownToLine, ArrowRight, BookOpen, CalendarDays, Check, ChevronRight, ClipboardList, FileText, FlaskConical, Heart, House, Info, LifeBuoy, Plus, ShieldCheck, UserRound, X } from "lucide-react";
import { Profile, Symptoms, Sampling, Brief, Follow } from "./forms";
import { profiles, type State, type Change } from "@/lib/model";
import { nextAction, pathwayVersion } from "@/lib/pathways";


import { screeningSource } from "@/lib/sources";

const mainNav = [
  { name: "Overview", icon: House }, { name: "Symptoms", icon: Activity },
  { name: "Home sampling", icon: FlaskConical }, { name: "GP brief", icon: FileText },
  { name: "Follow-up", icon: CalendarDays },
] as const;
type Status = { message: string; error: boolean };
const card = "panel";
const demoAction = nextAction({}, false);

function Brand() {
  return <div className="brand"><span className="brand-mark"><Heart size={19} fill="currentColor"/><Plus className="brand-cross" size={10} strokeWidth={3}/></span><div><strong>Care4All</strong><small>By Tech4Good</small></div></div>;
}
function Title({ children, sub }: { children: ReactNode; sub?: string }) {
  return <div className="view-title"><h1>{children}</h1>{sub && <p>{sub}</p>}</div>;
}
function SourceLink() {
  return <a className="link" href={screeningSource.url} target="_blank" rel="noreferrer">{screeningSource.title} <ArrowRight size={14}/></a>;
}

export function CareApp() {
  const [state, setState] = useState<State | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState("Overview");
  const [dialog, setDialog] = useState<"profiles" | "reset" | "install" | null>(null);
  const [pendingTab, setPendingTab] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState<Status | null>(null);
  const [ai, setAi] = useState<{ summary: string[]; provider: string } | null>(null);

  useEffect(() => {
    let mounted = true;
    fetch("/api/demo", { cache: "no-store" }).then(async response => {
      if (!response.ok) throw new Error("unavailable");
      const data = await response.json();
      if (mounted) { setState(data.state); setLoaded(true); }
    }).catch(() => { if (mounted) setStatus({ error: true, message: "Care4All is unavailable. Reconnect and reload to try again." }); });
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") void navigator.serviceWorker.register("/sw.js").catch(() => {});
    return () => { mounted = false; };
  }, []);
  useEffect(() => {
    if (!dirty) return;
    const prevent = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", prevent);
    return () => window.removeEventListener("beforeunload", prevent);
  }, [dirty]);

  async function send(method: string, body?: unknown) {
    setBusy(true);
    setStatus(null);
    try {
      const response = await fetch("/api/demo", { method, cache: "no-store", headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
      const data = await response.json();
      if (!response.ok) { setStatus({ error: true, message: data.message ?? "The request failed. Try again." }); return null; }
      if ("state" in data) { setState(data.state); if (!(body && typeof body === "object" && "change" in body && (body.change as Change).kind === "brief")) setAi(null); setDirty(false); }
      return data;
    } catch {
      setStatus({ error: true, message: navigator.onLine ? "The request failed. Try again." : "You’re offline. Your changes weren’t saved. Reconnect and try again." });
      return null;
    } finally { setBusy(false); }
  }
  async function save(change: Change) {
    if (!state || busy) return false;
    const data = await send("POST", { revision: state.revision, change });
    if (data) setStatus({ error: false, message: "Saved to your demo session." });
    return Boolean(data);
  }
  async function requestAI(purpose: "brief" | "explanation") {
    setAi(null);
    const data = await send("POST", { ai: purpose });
    if (data) setAi(data);
  }
  function switchTab(next: string) {
    setTab(next); setAi(null); setStatus(null); setDirty(false); window.scrollTo(0, 0);
  }
  function navigate(next: string) {
    if (next === tab || busy) return;
    if (dirty) setPendingTab(next);
    else switchTab(next);
  }
  function open(next: string) { if (!state && next !== "Help") setDialog("profiles"); else navigate(next); }

  return <div className="shell">
    <a className="skip" href="#main">Skip to content</a>
    <aside className="sidebar">
      <Brand/>
      <div className="side-main"><span className="nav-label">CARE WORKSPACE</span><nav aria-label="Care workspace">
        {mainNav.map(({ name, icon: Icon }) => <button key={name} aria-current={tab === name ? "page" : undefined} onClick={() => name === "Overview" ? navigate(name) : open(name)}><Icon size={19}/><span>{name}</span>{tab === name && <span className="nav-dot"/>}</button>)}
      </nav><span className="nav-label second">PREFERENCES</span><nav aria-label="Preferences">
        <button aria-current={tab === "Profile" ? "page" : undefined} onClick={() => open("Profile")}><UserRound size={19}/> Care profile</button>
        <button aria-current={tab === "Help" ? "page" : undefined} onClick={() => navigate("Help")}><LifeBuoy size={19}/> Help & resources</button>
      </nav></div>
      <div className="side-footer"><div className="private"><ShieldCheck size={18}/><div><strong>Private demo session</strong><small>Fictional data only</small></div></div><button className="link" onClick={() => setDialog("install")}><ArrowDownToLine size={17}/> Install app</button></div>
    </aside>
    <div className="workspace">
      <header className="topbar"><div className="mobile-brand"><Brand/></div><div className="breadcrumb"><Heart size={15}/> Care workspace <ChevronRight size={14}/> <strong>{tab}</strong></div><div className="top-actions"><span className="demo-badge"><span/> Demo mode</span><button className="avatar" aria-label={state ? "Care profile" : "Choose a demo profile"} onClick={() => open("Profile")}>{state ? profiles[state.profile].name[0] : <UserRound size={18}/>}</button></div></header>
      <main id="main" className="main">
        {status && <div className={status.error ? "status error" : "status"} role={status.error ? "alert" : "status"}>{status.message}{!loaded && <button className="link" onClick={() => location.reload()}>Reload</button>}</div>}
        {!loaded && !status && <div className="status" role="status">Loading your demo session…</div>}
        {(tab === "Overview" || (!state && tab !== "Help")) && <Dashboard state={state} open={open} begin={() => setDialog("profiles")} ready={loaded} busy={busy} ai={ai} explain={() => requestAI("explanation")}/>}
        {tab === "Help" && <><Title sub="Find support and learn how this demo works.">Help & resources</Title><section className={card}><h2>Screening in Finland</h2><p>{screeningSource.passage}</p><SourceLink/></section><section className={card}><h2>Getting help with your care</h2><p>For questions about a real screening invitation, use the contact details in your letter. This fictional demo has no clinical monitoring.</p><button className="secondary" onClick={() => setDialog("install")}>Installation and offline use</button></section></>}
        {state && tab === "Profile" && <Profile key={state.profile} state={state} save={save} busy={busy} dirty={setDirty} done={() => setTab("Overview")} reset={() => setDialog("reset")}/>}
        {state && tab === "Symptoms" && <Symptoms state={state} save={save} busy={busy} dirty={setDirty}/>}
        {state && tab === "Home sampling" && <Sampling state={state} save={save} busy={busy} dirty={setDirty}/>}
        {state && tab === "GP brief" && <Brief state={state} save={save} busy={busy} dirty={setDirty} ai={ai} generate={() => requestAI("brief")}/>}
        {state && tab === "Follow-up" && <Follow state={state} save={save} busy={busy} help={() => navigate("Help")} dirty={setDirty}/>}
        <footer className="footer"><span>Care4All · By Tech4Good</span><span>Demonstration only · Use fictional information</span></footer>
      </main>
    </div>
    <nav className="bottom-nav" aria-label="Mobile care workspace">{mainNav.map(({ name, icon: Icon }) => <button key={name} aria-current={tab === name ? "page" : undefined} onClick={() => name === "Overview" ? navigate(name) : open(name)}><Icon size={20}/><span>{name === "Home sampling" ? "Sampling" : name}</span></button>)}</nav>
    {(dialog || pendingTab) && <Modal close={() => { setDialog(null); setPendingTab(null); }}>
      {pendingTab && <><h2>Leave without saving?</h2><p>Your unsaved changes will be lost.</p><div className="actions"><button className="secondary" onClick={() => setPendingTab(null)}>Keep editing</button><button className="primary" onClick={() => { switchTab(pendingTab); setPendingTab(null); }}>Leave page</button></div></>}
      {dialog === "profiles" && <><h2>Choose a demo profile</h2><p>Each profile contains fictional information.</p>{status?.error && <p role="alert">{status.message}</p>}<div className="profile-list">{Object.entries(profiles).map(([id, person]) => <button disabled={busy || !loaded} key={id} onClick={async () => { if (await send("POST", { profile: id })) { setDialog(null); switchTab(id === "aino" ? "Profile" : "Overview"); } }}><span className="avatar">{person.name[0]}</span><span><strong>{person.name}</strong><small>{person.detail}</small></span><ChevronRight size={18}/></button>)}</div></>}
      {dialog === "reset" && <><h2>Reset demo data?</h2><p>This deletes the saved profile, symptoms, and progress for this demo session.</p>{status?.error && <p role="alert">{status.message}</p>}<div className="actions"><button className="secondary" onClick={() => setDialog(null)}>Cancel</button><button className="primary" disabled={busy} onClick={async () => { if (await send("DELETE")) { setDialog(null); switchTab("Overview"); } }}>Delete demo data</button></div></>}
      {dialog === "install" && <><h2>Install Care4All</h2><p>On iPhone or iPad, open Safari’s Share menu and choose Add to Home Screen. On Android or desktop, look for Install in your browser menu or address bar when available.</p><p>Patient workflows require an internet connection. Save your work and close all Care4All tabs to allow a waiting app update to activate.</p></>}
    </Modal>}
  </div>;
}
function Modal({ children, close }: { children: ReactNode; close: () => void }) {
  return <dialog ref={element => { if (element && !element.open) element.showModal(); }} className="modal" onCancel={close}><button className="modal-close" aria-label="Close dialog" onClick={close}><X size={20}/></button>{children}</dialog>;
}

function Dashboard({ state, open, begin, ready, busy, ai, explain }: { state: State | null; open: (tab: string) => void; begin: () => void; ready: boolean; busy: boolean; ai: { summary: string[]; provider: string } | null; explain: () => void }) {
  const action = state ? nextAction(state.answers, state.complete) : demoAction;
  const resources = [
    { title: "Understanding home sampling", text: "Explore what the FIT journey looks like, from kit to result.", tab: "Home sampling", icon: FlaskConical, color: "mint" },
    { title: "Preparing for your GP visit", text: "Bring your history, symptoms, and questions together.", tab: "GP brief", icon: FileText, color: "blue" },
    { title: "Screening in Finland", text: "Find official information about colorectal screening.", tab: "Help", icon: BookOpen, color: "sand" },
  ];
  return <>
    <section className="hero">
      <div className="hero-art" aria-hidden="true"/>
      <div className="hero-content"><span className="hero-label"><Heart size={14}/> YOUR CARE COMPANION</span><h1>{state ? "Welcome, " + profiles[state.profile].name + "." : "Welcome to Care4All."}</h1><p>A little clarity for what comes next. Find your next step, keep track of changes, and feel more prepared for conversations about your care.</p><button className="primary" disabled={!ready} onClick={() => state ? open(action.tab) : begin()}>{state ? "Continue your journey" : "Start demo journey"} <ArrowRight size={17}/></button></div>
    </section>
    <div className="dashboard-grid">
      <section className="panel next-card">
        <div className="section-heading"><span className="icon-box mint"><ClipboardList size={22}/></span><h2>Your next action</h2></div>
        <h3>{action.title}</h3><p>{action.why}</p>
        <div className="actions"><button className="primary" disabled={!ready} onClick={() => open(action.tab)}>{state?.complete ? "Open next step" : "Set up care profile"} <ArrowRight size={16}/></button>{state?.complete && <button className="link" disabled={busy} onClick={explain}>Explain this action</button>}</div>
        {ai && <div className="notice"><Info size={16}/><div><strong>{ai.provider} explanation</strong>{ai.summary.map(line => <p key={line}>{line}</p>)}</div></div>}
        {state?.complete && <div className="action-note"><Info size={15}/><span>{action.uncertainty} Pathway v{pathwayVersion}. {action.source && <SourceLink/>}</span></div>}
      </section>
      <section className="panel journey-card"><div className="section-heading"><span className="icon-box blue"><Activity size={22}/></span><h2>Your care journey</h2></div>
        <ol className="journey">{["Care profile", "Next steps", "Follow-through"].map((stage, index) => {
          const current = !state?.complete ? 0 : state.follow === "Not started" ? 1 : 2;
          return <li key={stage} className={index === current ? "current" : index < current ? "finished" : ""}><span>{index < current ? <Check size={14}/> : index + 1}</span><div><strong>{stage}</strong><small>{index < current ? "Complete" : index === current ? "Current stage" : "Upcoming"}</small></div></li>;
        })}</ol>
      </section>
    </div>
    <div className="section-title"><h2>Quick actions</h2></div>
    <div className="quick-grid">
      <button className="tile" onClick={() => open("Symptoms")}><span className="icon-box mint"><Activity size={20}/></span><span><strong>Log a symptom</strong><small>Keep a record of changes</small></span><ChevronRight size={18}/></button>
      <button className="tile" onClick={() => open("GP brief")}><span className="icon-box blue"><FileText size={20}/></span><span><strong>Prepare a GP brief</strong><small>Get ready for a conversation</small></span><ChevronRight size={18}/></button>
      <button className="tile" onClick={() => open("Follow-up")}><span className="icon-box sand"><CalendarDays size={20}/></span><span><strong>Track follow-up</strong><small>See where things stand</small></span><ChevronRight size={18}/></button>
    </div>
    <div className="dashboard-grid lower">
      <section className="panel"><div className="section-heading"><h2>Pending tasks</h2></div><button className="link" onClick={() => open(action.tab)}>{state?.complete ? action.title : "Set up your care profile"} <ArrowRight size={15}/></button>{state && state.follow !== "Not started" && <p>Follow-up reminder · {state.follow}</p>}</section>
      <section className="panel"><div className="section-heading"><h2>Recent symptoms</h2></div>{state?.symptoms.length ? <ul className="plain">{state.symptoms.slice(0, 3).map(s => <li key={s.id}>{s.name} · {s.presence}</li>)}</ul> : <p>No symptoms logged yet.</p>}</section>
    </div>
    <div className="section-title"><h2>Learn at your pace</h2></div>
    <div className="quick-grid">{resources.map(({ title, text, tab, icon: Icon, color }) => <button key={tab} className="tile resource" onClick={() => open(tab)}><span className={"icon-box " + color}><Icon size={20}/></span><span className="resource-copy"><strong>{title}</strong><small>{text}</small></span><ArrowRight size={16}/></button>)}</div>
  </>;

}
