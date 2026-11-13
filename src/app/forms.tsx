"use client";

import { useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, Box, Check, ClipboardList, FileText, FlaskConical, Info, Plus, Printer } from "lucide-react";
import { activeQuestions, type Answers } from "@/lib/questionnaire";
import { kitStates, followStates, type State, type Change, type Symptom } from "@/lib/model";
import { fixtures, type Fixture } from "@/lib/documents";
import { briefExtracts, briefFacts } from "@/lib/brief";
import { screeningSource } from "@/lib/sources";

type Save = (change: Change) => Promise<boolean>;
type Props = { state: State; save: Save; busy: boolean; dirty: (value: boolean) => void };
const emptySymptom: Omit<Symptom, "id"> = { name: "", presence: "Present", onset: "", duration: "", change: "Not reported", notes: "" };
function Title({ title, sub }: { title: string; sub: string }) {
  return <div className="view-title"><h1>{title}</h1><p>{sub}</p></div>;
}
function Fields({ label, options, value, onChange }: { label: string; options: readonly string[]; value: string; onChange: (value: string) => void }) {
  return <label>{label}<select value={value} onChange={event => onChange(event.target.value)}>{options.map(option => <option key={option}>{option}</option>)}</select></label>;
}

export function Profile({ state, save, busy, dirty, done, reset }: Props & { done: () => void; reset: () => void }) {
  const [answers, setAnswers] = useState<Answers>(state.answers);
  const [step, setStep] = useState(state.complete ? activeQuestions(state.answers).length : state.step);
  const questions = activeQuestions(answers);
  const question = questions[step];
  async function persist(next: number, complete = false, leave = false) {
    if (await save({ kind: "onboarding", answers, step: next, complete })) {
      setStep(next);
      if (leave) done();
    }
  }
  return <><Title title="Your care profile" sub="Use fictional answers. You can review or change them before finishing."/>
    <section className="panel form-panel"><div className="progress-text">{question ? "Question " + (step + 1) + " of " + questions.length : "Review your answers"}</div><progress aria-label="Profile progress" value={Math.min(step, questions.length)} max={questions.length}/>
    {question ? <fieldset><legend>{question.label}</legend><div className="choices">{question.options.map(option => <label className="choice" key={option}><input type="radio" name={question.id} checked={answers[question.id] === option} onChange={() => { setAnswers({ ...answers, [question.id]: option }); dirty(true); }}/>{option}</label>)}</div></fieldset>
      : <dl className="review-list">{questions.map((q, index) => <div key={q.id}><dt>{q.label}</dt><dd>{answers[q.id] || "Not reported"}</dd><button className="link" disabled={busy} onClick={() => setStep(index)} aria-label={"Edit " + q.label}>Edit</button></div>)}</dl>}
    <div className="actions"><button className="secondary" disabled={!step || busy} onClick={() => setStep(step - 1)}><ArrowLeft size={16}/> Back</button>
      {question ? <button className="primary" disabled={busy || !answers[question.id]} onClick={() => persist(step + 1)}>Continue <ArrowRight size={16}/></button> : <button className="primary" disabled={busy || questions.some(q => !answers[q.id])} onClick={() => persist(step, true, true)}>Finish profile <Check size={16}/></button>}
      {!state.complete && <button className="link" disabled={busy} onClick={() => persist(step, false, true)}>Save and exit</button>}</div></section>
    <button className="link reset" onClick={reset}>Reset demo data</button></>;
}

export function Symptoms({ state, save, busy, dirty }: Props) {
  const [draft, setDraft] = useState<Symptom | Omit<Symptom, "id"> | null>(null);
  function field<K extends keyof typeof emptySymptom>(key: K, value: (typeof emptySymptom)[K]) {
    if (draft) setDraft({ ...draft, [key]: value });
    dirty(true);
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!draft) return;
    const { name, presence, onset, duration, change, notes } = draft;
    if (await save({ kind: "symptom", id: "id" in draft ? draft.id : undefined, value: { name, presence, onset, duration, change, notes } })) setDraft(null);
  }
  return <><Title title="Symptom timeline" sub="Record changes and review what you want to share at an appointment."/>
    <div className="notice"><Info size={17}/> Entries are saved in this fictional demo. No clinician monitors submissions.</div>
    {draft ? <form className="panel form-panel" onSubmit={submit}><h2>{"id" in draft ? "Edit symptom" : "Log a symptom"}</h2><div className="form-grid">
      <label>Symptom<input required maxLength={100} value={draft.name} onChange={e => field("name", e.target.value)}/></label>
      <Fields label="Reported status" options={["Present", "Absent", "Not reported"]} value={draft.presence} onChange={value => field("presence", value as Symptom["presence"])}/>
      <label>Onset date<input type="date" value={draft.onset} onChange={e => field("onset", e.target.value)}/></label>
      <label>Duration<input maxLength={100} placeholder="e.g. Three days" value={draft.duration} onChange={e => field("duration", e.target.value)}/></label>
      <Fields label="Change over time" options={["Not reported", "Unchanged", "Improving", "Worsening", "Unsure"]} value={draft.change} onChange={value => field("change", value as Symptom["change"])}/>
      </div><label>Notes<textarea maxLength={1000} value={draft.notes} onChange={e => field("notes", e.target.value)}/></label>
      <div className="actions"><button className="primary" disabled={busy}>Save symptom</button><button type="button" className="secondary" disabled={busy} onClick={() => { setDraft(null); dirty(false); }}>Cancel</button></div></form>
      : <button className="primary spaced" onClick={() => setDraft(emptySymptom)}><Plus size={18}/> Log a symptom</button>}
    <section className="panel"><h2>Saved entries</h2>{state.symptoms.length ? <ul className="timeline">{state.symptoms.map(item => <li key={item.id}><div><strong>{item.name}</strong><p>{item.presence} · {item.onset || "Onset not reported"} · {item.duration || "Duration not reported"} · {item.change}</p>{item.notes && <p>{item.notes}</p>}</div><button disabled={Boolean(draft)} className="link" onClick={() => setDraft(item)} aria-label={"Edit " + item.name}>Edit</button></li>)}</ul> : <p>No symptoms reported yet.</p>}</section>
  </>;
}

export function Sampling({ state, save, busy, dirty }: Props) {
  const [status, setStatus] = useState(state.kit);
  const [result, setResult] = useState(state.result);
  const stages = [{ icon: Box, label: "Kit and instructions", desc: "The example journey starts when a kit arrives." }, { icon: FlaskConical, label: "Sample collection", desc: "This placeholder represents the collection step." }, { icon: FileText, label: "Laboratory result", desc: "The screening service provides the result." }];
  return <><Title title="Home sampling" sub="Explore a fictional colorectal FIT journey."/>
    <div className="notice"><Info size={17}/> Illustrated placeholders only. For a real kit, follow the instructions supplied with that kit and contact its screening service with questions.</div>
    <div className="quick-grid sampling-grid">{stages.map(({ icon: Icon, label, desc }) => <article className="panel" key={label}><span className="icon-box mint"><Icon size={26}/></span><h2>{label}</h2><p>{desc}</p></article>)}</div>
    <form className="panel form-panel" onSubmit={event => { event.preventDefault(); void save({ kind: "kit", status, result }); }}><h2>Track kit progress</h2><p>Saved stage · {state.kit}</p>
      <Fields label="Kit stage" value={status} options={kitStates} onChange={value => { setStatus(value as State["kit"]); dirty(true); }}/>
      {status === "Result recorded" && <label>Fictional result as written in your letter<input required maxLength={300} value={result} onChange={e => { setResult(e.target.value); dirty(true); }}/></label>}
      {["Unable to complete", "Invalid sample", "Unsure"].includes(status) && <p>Use the contact details in the original kit letter to ask what to do next.</p>}
      <div className="actions"><button className="primary" disabled={busy}>Save kit progress</button></div>
      <p>{screeningSource.passage}</p><a className="link" href={screeningSource.url} target="_blank" rel="noreferrer">{screeningSource.title}</a>
    </form></>;
}

export function Brief({ state, save, busy, dirty, ai, generate }: Props & { ai: { summary: string[]; provider: string } | null; generate: () => void }) {
  const [questions, setQuestions] = useState(state.questions);
  const [reviewed, setReviewed] = useState(state.reviewed);
  const [fixture, setFixture] = useState<Fixture | "">("");
  const facts = briefFacts(state);
  const extracts = briefExtracts(state);
  const canPrint = state.reviewed && reviewed && questions === state.questions;
  return <><div className="no-print"><Title title="GP brief" sub="Review and print a fictional summary to practise preparing for an appointment."/>
    <section className="panel form-panel"><h2>Sample records</h2><p>Choose a synthetic fixture to review its extracted text. Real medical-record uploads are disabled in this demo.</p>
      <label>Sample record<select value={fixture} onChange={e => setFixture(e.target.value as Fixture | "")}><option value="">Choose a sample record</option>{Object.entries(fixtures).map(([key, item]) => <option value={key} key={key}>{item.title}</option>)}</select></label>
      {fixture && <ul>{fixtures[fixture].lines.map(line => <li key={line}>{line}</li>)}</ul>}
      <div className="actions"><button className="secondary" disabled={!fixture || busy} onClick={async () => { if (fixture && await save({ kind: "document", fixture })) setReviewed(false); }}>Add reviewed extract</button>{state.document && <button className="link" disabled={busy} onClick={async () => { if (await save({ kind: "document", fixture: null })) setReviewed(false); }}>Remove extract</button>}</div>
    </section></div>
    <article className="panel brief-print"><div className="section-heading"><span className="icon-box blue"><ClipboardList size={22}/></span><h2>Care4All GP brief</h2></div><p>Fictional information · Patient-prepared demo</p>
      <h3>Patient-reported history and symptom timeline</h3>{facts.length ? <ul>{facts.map((fact, index) => <li key={index}>{fact}</li>)}</ul> : <p>No history or symptoms reported.</p>}
      <h3>Reviewed sample document extracts</h3>{extracts.length ? <ul>{extracts.map(line => <li key={line}>{line}</li>)}</ul> : <p>No sample extract added.</p>}
      <h3>AI summary</h3>{ai ? <><p>{ai.provider} · Patient-reported information arranged for review</p><ul>{ai.summary.map((line, index) => <li key={index}>{line}</li>)}</ul></> : <p>No AI summary generated.</p>}
      <button className="secondary no-print" disabled={busy || !facts.length} onClick={generate}>Generate AI summary</button>
      <h3>Questions for my GP</h3><p className="print-only preserve">{state.questions || "No questions added."}</p>
      <form className="no-print" onSubmit={event => { event.preventDefault(); void save({ kind: "brief", questions, reviewed }); }}>
        <label>Questions<textarea maxLength={1000} value={questions} onChange={e => { setQuestions(e.target.value); setReviewed(false); dirty(true); }}/></label>
        <label className="choice"><input type="checkbox" checked={reviewed} onChange={e => { setReviewed(e.target.checked); dirty(true); }}/> I reviewed the brief and its sources.</label>
        <div className="actions"><button className="primary" disabled={busy}>Save review</button><button type="button" className="secondary" disabled={!canPrint || busy} onClick={() => window.print()}><Printer size={17}/> Print / Save PDF</button></div>
      </form>
    </article></>;
}

export function Follow({ state, save, busy, dirty, help }: Props & { help: () => void }) {
  const [follow, setFollow] = useState(state.follow);
  const care = state.document && fixtures[state.document].diagnosis;
  return <><Title title="Follow-up" sub="Track contacts, appointments, and what your care team advised."/>
    <form className="panel form-panel" onSubmit={event => { event.preventDefault(); void save({ kind: "follow", status: follow }); }}><h2>Appointment progress</h2><p>Saved stage · {state.follow}</p>
      <Fields label="Follow-up stage" options={followStates} value={follow} onChange={value => { setFollow(value as State["follow"]); dirty(true); }}/>
      <div className="actions"><button className="primary" disabled={busy}>Save follow-up</button><button type="button" className="secondary" onClick={help}>I need help</button></div>
    </form>
    <section className="panel"><h2>In-app reminders</h2><p>{state.follow === "Not started" ? "No follow-up reminders yet." : state.follow === "Could not get an appointment" || state.follow === "Need help" ? "Keep a note of your contact attempts and use the original service’s contact details for help." : "Review your saved follow-up stage the next time you open Care4All."}</p></section>
    <section className="panel"><h2>Sample care plan</h2>{care ? <><p>Unlocked by the reviewed fictional clinician note.</p><ul>{fixtures.care.lines.map(line => <li key={line}>{line}</li>)}</ul></> : <p>Add the fictional clinician follow-up note from the GP brief to preview a care plan.</p>}</section></>;
}
