"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, Check, Clock, Lock, Save, ShieldCheck, Sparkles } from "lucide-react";
import {
  after, alerts, before, canDecline, canSkip, canUnsure, chapters, check, firstOpen, flow, helpOf, isComplete, minutesLeft, modules, registry, titleOf, fill,
  type Alert, type Answer, type Answers, type ModuleId, type Problem, type Progress, type Question,
} from "@/lib/intake";
import { tr } from "@/lib/survey";
import { AlertScreen } from "./alert-screen";
import { Icon } from "./icons";
import { QuestionInput } from "./inputs";
import { usePrefs } from "./prefs";
import { Review } from "./review";
import type { SaveState } from "./session";

type View =
  | { kind: "welcome" }
  | { kind: "chapter"; module: ModuleId; next: string }
  | { kind: "question"; id: string }
  | { kind: "alert"; alert: Alert; next: string }
  | { kind: "review" };

type Update = (patch: Partial<Omit<Progress, "v" | "revision" | "upgraded">>, options?: { confirm?: boolean }) => Promise<boolean>;
type Props = { progress: Progress; update: Update; saveState: SaveState; onExit: () => void };

const messages: Record<Problem, [string, string]> = {
  required: ["Please choose or fill in an answer to continue.", "Valitse tai täytä vastaus jatkaaksesi."],
  invalid: ["That doesn't look right. Please check it.", "Tämä ei näytä oikealta. Tarkista vastaus."],
  range: ["That is outside the possible range. Please check it.", "Arvo on mahdollisen vaihteluvälin ulkopuolella. Tarkista se."],
  adult: ["This questionnaire is for adults aged 18 and over.", "Tämä kysely on tarkoitettu 18 vuotta täyttäneille."],
  date: ["Please enter a real date.", "Anna todellinen päivämäärä."],
  long: ["That is a little too long. Please shorten it.", "Vastaus on hieman liian pitkä. Lyhennä sitä."],
  many: ["Please choose fewer options.", "Valitse vähemmän vaihtoehtoja."],
};

function startingView(progress: Progress): View {
  const answers = progress.answers;
  if (!Object.keys(answers).length && !progress.cursor) return { kind: "welcome" };
  if (progress.cursor === "review") return { kind: "review" };
  if (progress.cursor && flow(answers).some(question => question.id === progress.cursor)) return { kind: "question", id: progress.cursor };
  const open = firstOpen(answers);
  return open ? { kind: "question", id: open } : { kind: "review" };
}
const moduleIndex = (id: ModuleId) => modules.findIndex(module => module.id === id);

/** Turns what is on screen into the answer to store. An untouched optional text box counts as a skip. */
function resolve(question: Question, value: Answer | undefined): Answer | undefined {
  if (value === undefined) return undefined;
  if (typeof value === "string" && question.type === "text") return value.trim() ? value.trim() : question.optional ? { $: "skipped" } : undefined;
  return value;
}

export function Intake({ progress, update, saveState, onExit }: Props) {
  const { lang, t } = usePrefs();
  const answers = progress.answers;
  const [view, setView] = useState<View>(() => startingView(progress));
  const [seen, setSeen] = useState<ReadonlySet<ModuleId>>(() => {
    const start = startingView(progress);
    const current = start.kind === "question" ? registry.get(start.id)?.module : undefined;
    return new Set(modules.filter(module => current ? moduleIndex(module.id) <= moduleIndex(current) : false).map(module => module.id));
  });
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<{ id: string; value: Answer | undefined } | null>(null);
  const [problem, setProblem] = useState<{ id: string; kind: Problem } | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const first = useRef(true);

  const viewKey = view.kind === "question" ? view.id : view.kind === "chapter" ? "chapter-" + view.module : view.kind === "alert" ? "alert-" + view.alert.key : view.kind;
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    window.scrollTo({ top: 0 });
    heading.current?.focus({ preventScroll: true });
  }, [viewKey]);

  const question = view.kind === "question" ? registry.get(view.id) : undefined;
  const value: Answer | undefined = question ? (draft?.id === question.id ? draft.value : answers[question.id]) : undefined;

  /** Shows a question, or the chapter introduction first when it opens a chapter the person has not met yet. */
  function open(target: string, nextAnswers: Answers, options: { intro?: boolean } = {}) {
    setProblem(null);
    setDraft(null);
    void update({ answers: nextAnswers, cursor: target });
    if (target === "review") return setView({ kind: "review" });
    const next = registry.get(target);
    if (next && options.intro !== false && !seen.has(next.module)) {
      setSeen(new Set([...seen, next.module]));
      return setView({ kind: "chapter", module: next.module, next: target });
    }
    setView({ kind: "question", id: target });
  }

  function commit(answer: Answer) {
    if (!question) return;
    const nextAnswers: Answers = { ...answers, [question.id]: answer };
    const target = editing ? firstOpen(nextAnswers) ?? "review" : after(nextAnswers, question.id);
    const pending = alerts(nextAnswers).find(candidate => !progress.acks.includes(candidate.key));
    if (pending) {
      setProblem(null);
      setDraft(null);
      void update({ answers: nextAnswers, cursor: target, acks: [...progress.acks, pending.key] });
      return setView({ kind: "alert", alert: pending, next: target });
    }
    open(target, nextAnswers, { intro: !editing });
  }
  function submit(event?: FormEvent) {
    event?.preventDefault();
    if (!question) return;
    const answer = resolve(question, value);
    const found = answer === undefined ? "required" : check(question, answer);
    if (found || answer === undefined) return setProblem({ id: question.id, kind: found ?? "required" });
    commit(answer);
  }
  function mark(kind: "unsure" | "declined" | "skipped") { commit({ $: kind }); }
  function back() {
    if (!question) return;
    const answer = resolve(question, value);
    const keep: Answers = answer !== undefined && !check(question, answer) ? { ...answers, [question.id]: answer } : answers;
    const previous = before(keep, question.id);
    if (previous) open(previous, keep, { intro: false });
    else { setProblem(null); setDraft(null); setView({ kind: "welcome" }); }
  }
  async function exit() {
    let keep = answers;
    if (question) {
      const answer = resolve(question, value);
      if (answer !== undefined && !check(question, answer)) keep = { ...answers, [question.id]: answer };
    }
    const saved = await update({ answers: keep, cursor: view.kind === "question" ? view.id : progress.cursor });
    if (saved) onExit();
  }
  function edit(id: string) { setEditing(true); open(id, answers, { intro: false }); }
  async function finish() {
    return update({ answers, cursor: "review", complete: true, confirmed: true }, { confirm: true });
  }

  const chapterList = chapters(answers);
  const currentModule: ModuleId | undefined = question?.module ?? (view.kind === "chapter" ? view.module : view.kind === "review" || view.kind === "alert" ? modules[modules.length - 1].id : undefined);
  const total = chapterList.reduce((sum, chapter) => sum + chapter.total, 0);
  const done = chapterList.reduce((sum, chapter) => sum + chapter.answered, 0);
  const percent = view.kind === "welcome" ? 0 : view.kind === "review" ? 100 : Math.min(99, Math.round((done / Math.max(total, 1)) * 100));
  const minutes = question ? minutesLeft(answers, question.id) : undefined;

  return (
    <div className="intake">
      <div className="intake__top">
        <div className="intake__meta">
          <p className="intake__where" aria-live="polite">
            {currentModule
              ? <><strong>{t("Chapter", "Osio")} {moduleIndex(currentModule) + 1}/{modules.length}</strong> · {tr(lang, modules[moduleIndex(currentModule)].title)}</>
              : <strong>{t("Getting started", "Aloitus")}</strong>}
          </p>
          <div className="intake__tools">
            {minutes !== undefined && <span className="intake__time"><Clock size={15} aria-hidden="true" />{t(`about ${minutes} min left`, `noin ${minutes} min jäljellä`)}</span>}
            <SaveStatus state={saveState} />
            {view.kind !== "welcome" && <button type="button" className="btn btn--ghost btn--sm" onClick={exit}><Save size={16} aria-hidden="true" />{t("Save and exit", "Tallenna ja poistu")}</button>}
          </div>
        </div>
        <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-label={t("Questionnaire progress", "Kyselyn eteneminen")}>
          <span style={{ width: `${percent}%` }} />
        </div>
        <ol className="stepper" aria-label={t("Chapters", "Osiot")}>
          {chapterList.map((chapter, index) => {
            const state = currentModule === undefined ? "todo" : index < moduleIndex(currentModule) ? "done" : index === moduleIndex(currentModule) ? "now" : "todo";
            return (
              <li key={chapter.id} className={`stepper__item stepper__item--${state}`} aria-current={state === "now" ? "step" : undefined}>
                <span className="stepper__dot" aria-hidden="true">{state === "done" ? <Check size={14} /> : index + 1}</span>
                <span className="stepper__name">{tr(lang, chapter.title)}</span>
                <span className="sr-only">{state === "done" ? t("(done)", "(valmis)") : state === "now" ? t("(current)", "(nykyinen)") : ""}</span>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="intake__stage" key={viewKey}>
        {view.kind === "welcome" && (
          <section className="card welcome">
            {progress.upgraded && <p className="notice notice--info"><Sparkles size={18} aria-hidden="true" /><span>{t("We have made the questionnaire much more detailed, so we have started you on a fresh one.", "Olemme tehneet kyselystä paljon yksityiskohtaisemman, joten aloitat uuden kyselyn alusta.")}</span></p>}
            <span className="welcome__badge"><Sparkles size={16} aria-hidden="true" />{t("Your health profile", "Terveysprofiilisi")}</span>
            <h1 ref={heading} tabIndex={-1}>{t("Let's get to know you.", "Tutustutaan sinuun.")}</h1>
            <p className="lead">{t("A conversation, not a form. The questions change as you answer, so you only get the ones that matter for you.", "Keskustelu, ei lomake. Kysymykset muuttuvat vastaustesi mukaan, joten saat vain sinulle tärkeät.")}</p>
            <ul className="promises">
              <li><Clock size={20} aria-hidden="true" /><span><strong>{t("About 10 minutes.", "Noin 10 minuuttia.")}</strong> {t("We always show how much is left.", "Näytämme aina, paljonko on jäljellä.")}</span></li>
              <li><ShieldCheck size={20} aria-hidden="true" /><span><strong>{t("You are in control.", "Sinä päätät.")}</strong> {t("Say “I'm not sure” or skip anything.", "Voit vastata ”En ole varma” tai ohittaa minkä tahansa.")}</span></li>
              <li><Save size={20} aria-hidden="true" /><span><strong>{t("Saved as you go.", "Tallentuu samalla.")}</strong> {t("Stop any time and pick up where you left off.", "Voit lopettaa milloin tahansa ja jatkaa siitä, mihin jäit.")}</span></li>
              <li><Lock size={20} aria-hidden="true" /><span><strong>{t("Private to your account.", "Vain sinun tilisi tietoja.")}</strong> {t("Nothing about your health goes in links or browser storage.", "Terveystietojasi ei tallenneta linkkeihin tai selaimen muistiin.")}</span></li>
            </ul>
            <p className="hint">{t("It helps to have your medicine list and any screening letter nearby, but you do not need them.", "Lääkelista ja mahdollinen seulontakirje ovat avuksi, mutta niitä ei tarvita.")}</p>
            <div className="qactions qactions--single"><button type="button" className="btn btn--primary btn--lg" onClick={() => open(flow(answers)[0].id, answers, { intro: false })}>{t("Let's begin", "Aloitetaan")}<ArrowRight size={20} aria-hidden="true" /></button></div>
          </section>
        )}

        {view.kind === "chapter" && (() => {
          const info = modules[moduleIndex(view.module)];
          return (
            <section className="card chapter">
              <span className="chapter__icon"><Icon name={info.icon} size={34} /></span>
              <p className="chapter__count">{t("Chapter", "Osio")} {moduleIndex(info.id) + 1} / {modules.length} · {t(`about ${info.minutes} min`, `noin ${info.minutes} min`)}</p>
              <h1 ref={heading} tabIndex={-1}>{tr(lang, info.title)}</h1>
              <p className="lead">{fill(tr(lang, info.intro), answers)}</p>
              <div className="qactions qactions--single"><button type="button" className="btn btn--primary btn--lg" onClick={() => setView({ kind: "question", id: view.next })}>{t("Continue", "Jatka")}<ArrowRight size={20} aria-hidden="true" /></button></div>
            </section>
          );
        })()}

        {view.kind === "alert" && <AlertScreen alert={view.alert} headingRef={heading} onContinue={() => open(view.next, answers, { intro: !editing })} />}

        {question && (
          <form className="card qcard" data-question={question.id} onSubmit={submit} noValidate>
            {question.tag && <p className="qtag">{tr(lang, question.tag)}</p>}
            <h1 id="q-title" className="qtitle" ref={heading} tabIndex={-1}>{titleOf(question, answers, lang)}</h1>
            {helpOf(question, answers, lang) && <p id="q-help" className="qhelp">{helpOf(question, answers, lang)}</p>}
            <div className="qbody">
              <QuestionInput
                key={question.id} question={question} value={value} answers={answers} lang={lang} labelledBy="q-title"
                describedBy={[helpOf(question, answers, lang) ? "q-help" : "", problem?.id === question.id ? "q-error" : ""].filter(Boolean).join(" ") || undefined}
                invalid={problem?.id === question.id} onChange={next => { setDraft({ id: question.id, value: next }); if (problem) setProblem(null); }}
              />
            </div>
            {problem?.id === question.id && <p id="q-error" className="error-text" role="alert">{t(...messages[problem.kind])}</p>}
            {(canUnsure(question) || canDecline(question) || canSkip(question)) && (
              <div className="qmarks">
                {canUnsure(question) && <button type="button" className="btn btn--quiet" onClick={() => mark("unsure")}>{t("I'm not sure", "En ole varma")}</button>}
                {canDecline(question) && <button type="button" className="btn btn--quiet" onClick={() => mark("declined")}>{t("Prefer not to say", "En halua vastata")}</button>}
                {canSkip(question) && <button type="button" className="btn btn--quiet" onClick={() => mark("skipped")}>{t("Skip this one", "Ohita tämä")}</button>}
              </div>
            )}
            {question.why && (
              <details className="why">
                <summary>{t("Why we ask", "Miksi kysymme")}</summary>
                <p>{tr(lang, question.why)}</p>
              </details>
            )}
            <div className="qactions">
              <button type="button" className="btn btn--secondary" onClick={back}><ArrowLeft size={20} aria-hidden="true" />{t("Back", "Takaisin")}</button>
              <button type="submit" className="btn btn--primary btn--lg">{t("Continue", "Jatka")}<ArrowRight size={20} aria-hidden="true" /></button>
            </div>
          </form>
        )}

        {view.kind === "review" && <Review answers={answers} lang={lang} headingRef={heading} onEdit={edit} onFinish={finish} saveState={saveState}
          complete={isComplete(answers)} onBack={() => { const last = before(answers, "review"); if (last) { setEditing(false); open(last, answers, { intro: false }); } }} />}
      </div>
    </div>
  );
}

function SaveStatus({ state }: { state: SaveState }) {
  const { t } = usePrefs();
  const text = state === "saving" ? t("Saving…", "Tallennetaan…") : state === "saved" ? t("Saved", "Tallennettu") : state === "conflict" ? t("Changed in another tab", "Muuttunut toisessa välilehdessä") : t("Not saved yet", "Ei vielä tallennettu");
  return <span className={`save save--${state}`} role="status"><span className="save__dot" aria-hidden="true" />{text}</span>;
}
