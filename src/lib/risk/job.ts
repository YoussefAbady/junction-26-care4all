import type { TextModel } from "../ai";
import { riskTiers, type RiskContent, type RiskType } from "../content/v2-types";
import { tr } from "../survey";
import { numbersOfFacts, validateAudit, validateItem, validateOverall, type CheckedItem, type Verdict } from "./guard";
import type { RiskFacts } from "./facts";
import { auditSchema, auditSystem, auditUser, overallSchema, overallSystem, overallUser, typeSchema, typeSystem, typeUser, type AuditItemView } from "./prompt";
import { citableSources, passagesFor, sourceMap, type Passage, type RetrievalStore } from "./retrieval";
import { maxTier, tierStrength, type Language, type ModelOverall, type RiskItem, type RiskRepo, type RiskResult } from "./types";

// The risk job (docs/design-v2.md section 6.3). It runs in the Node process after the response. One model call per cancer type
// (four at a time), one for the overall level, one audit. Every reply passes the guard. A type that cannot be rated becomes
// `unknown` with a plain reason; when every type fails the job fails with a reason code. Progress is written after each step.
// The retry on 429 and 5xx is the model layer's (src/lib/ai/models.ts); this job adds one redo with the guard's reason when
// a reply is refused. Nothing is logged but `risk step=<type|overall|audit|job> reason=<code>`.

export type JobDeps = {
  store: RetrievalStore;
  model: TextModel;
  repo: Pick<RiskRepo, "progress" | "complete" | "fail">;
  now?: () => Date;
  log?: (line: string) => void;
  /** For tests. The defaults are the contract's: 4 at a time, 15 s per call, 120 s for the job. */
  limits?: { concurrency?: number; callMs?: number; deadlineMs?: number };
};
export type JobInput = { id: string; language: Language; facts: RiskFacts; content: RiskContent; applicable: RiskType[]; skipped: string[] };

type Rated = { ok: true; item: CheckedItem; passages: Passage[] } | { ok: false; reason: string };

/** What a refused reply is told, as a note in the next try. */
const refusal: Record<string, string> = {
  shape: "the reply was not in the required shape",
  length: "a text was too short or too long, or there were too many findings or tips",
  citation: "a citation was not one of the supplied passage ids, was repeated, or an up or down finding cited nothing",
  tier: "the tier was not supported: raised needs an up finding that cites a moderate or stronger statement (or two small ones), high needs one that cites a large or very-large statement",
  format: "a text had a link or markup",
  language: "a text was not in the language asked for",
  unsafe: "a text diagnosed, predicted, reassured, or mentioned a medicine or a treatment",
  number: "a text put a figure on the person's risk or used a number that no cited passage states",
  overall: "the overall tier was lower than the highest tier of a type, or higher without several types sharing the highest tier",
  driver: "a driver named an unknown factor or type, or one whose tier is not raised or high",
};
const noteFor = (reason: string) => "The checks refused your earlier reply because " + (refusal[reason] ?? "it broke a rule") + ". Reply again and keep to the rules.";

async function pool<T, R>(items: readonly T[], size: number, work: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(size, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await work(items[index]);
    }
  }));
  return results;
}

export async function runRiskJob(deps: JobDeps, input: JobInput): Promise<void> {
  const { language, facts, content, applicable } = input;
  const now = deps.now ?? (() => new Date());
  const log = deps.log ?? ((line: string) => console.info(line));
  const deadline = AbortSignal.timeout(deps.limits?.deadlineMs ?? 120_000);
  const callMs = deps.limits?.callMs ?? 15_000;
  const concurrency = deps.limits?.concurrency ?? 4;
  const total = applicable.length + 2;
  const sources = sourceMap(content);
  const typeOf = new Map(content.types.map(type => [type.id, type]));
  // The person's own numbers (age, years smoked, days a week) may be repeated in a justification; the guard never lets one be a figure of risk.
  const personNumbers = numbersOfFacts(facts);
  let done = 0;
  let cancelled = false;

  const step = async () => {
    done = Math.min(done + 1, total);
    if (!(await deps.repo.progress(input.id, { done, total }, now()))) cancelled = true;
  };
  const fail = async (reason: string) => {
    log("risk step=job reason=" + reason);
    await deps.repo.fail(input.id, reason, now());
  };

  /** One model call with the guard, and one more with the guard's reason when the reply is refused. */
  async function ask<T>(stepName: string, system: string, userFor: (note?: string) => string, schema: object, maxOutputTokens: number, check: (raw: unknown) => Verdict<T>, firstNote?: string): Promise<Verdict<T>> {
    let reason = "model";
    for (let attempt = 0; attempt < 2; attempt++) {
      if (cancelled) return { ok: false, reason: "cancelled" };
      if (deadline.aborted) { reason = "deadline"; break; }
      const raw = await deps.model.generateJson({
        system, user: userFor(attempt === 0 ? firstNote : [firstNote, noteFor(reason)].filter(Boolean).join(" ")), jsonSchema: schema, maxOutputTokens, timeoutMs: callMs, signal: deadline,
      });
      if (raw === null) { reason = deadline.aborted ? "deadline" : "model"; break; }
      const verdict = check(raw);
      if (verdict.ok) { log("risk step=" + stepName + " reason=ok"); return verdict; }
      reason = verdict.reason;
    }
    log("risk step=" + stepName + " reason=" + reason);
    return { ok: false, reason };
  }

  const passageCache = new Map<string, Passage[]>();
  const draft = new Map<string, { item: CheckedItem; passages: Passage[] }>();

  async function rateType(type: RiskType, note?: string): Promise<Rated> {
    let passages = passageCache.get(type.id);
    if (!passages) {
      try {
        passages = await passagesFor(deps.store, content, type, language, facts);
      } catch {
        log("risk step=" + type.id + " reason=retrieval");
        return { ok: false, reason: "retrieval" };
      }
      passageCache.set(type.id, passages);
    }
    if (!passages.length) { log("risk step=" + type.id + " reason=no-passages"); return { ok: false, reason: "no-passages" }; }
    const own = passages;
    const verdict = await ask(
      type.id, typeSystem(content.rubric),
      reviewerNote => typeUser({ language, type: { id: type.id, name: type.name[language] }, facts, passages: own, reviewerNote }),
      typeSchema(own.map(passage => passage.id)), 2048, raw => validateItem(raw, { language, passages: own, personNumbers }), note,
    );
    return verdict.ok ? { ok: true, item: verdict.value, passages: own } : { ok: false, reason: verdict.reason };
  }

  const unknownItem = (type: RiskType): RiskItem => ({
    cancer: type.id, tier: "unknown", limited: true,
    why: tr(language, ["This cancer type could not be assessed this time. You can run the assessment again later.", "Tätä syöpätyyppiä ei voitu arvioida tällä kertaa. Voit tehdä arvion uudelleen myöhemmin."]),
    brief: tr(language, ["Not assessed", "Ei arvioitu"]), findings: [], tips: [], notCovered: type.notCovered[language],
  });

  /** The model's item as the result carries it: citations became source ids, best tier first; notCovered is the database's. */
  function finish(type: RiskType, item: CheckedItem, passages: readonly Passage[]): RiskItem {
    const byId = new Map(passages.map(passage => [passage.id, passage]));
    return {
      cancer: type.id, tier: item.tier, limited: item.limited, why: item.why, brief: item.brief, tips: item.tips,
      findings: item.findings.map(({ citations, ...finding }) => ({ ...finding, sources: citableSources(citations.flatMap(id => byId.get(id)?.sourceIds ?? []), sources) })),
      notCovered: type.notCovered[language],
    };
  }

  const factorKeys = content.factors.map(factor => factor.key);
  async function rateOverall(items: readonly RiskItem[], note?: string): Promise<Verdict<ModelOverall>> {
    const views = items.map(item => ({
      cancer: item.cancer, name: typeOf.get(item.cancer)?.name[language] ?? item.cancer, tier: item.tier, limited: item.limited, why: item.why,
      findings: item.findings.map(({ direction, title }) => ({ direction, title })),
    }));
    return ask(
      "overall", overallSystem(content.rubric),
      reviewerNote => overallUser({ language, items: views, factors: content.factors.map(factor => ({ key: factor.key, name: factor.name[language] })), reviewerNote }),
      overallSchema(items.map(item => item.cancer), factorKeys), 1536,
      raw => validateOverall(raw, { language, items, factorKeys, personNumbers }), note,
    );
  }

  async function audit(items: readonly RiskItem[], overall: ModelOverall) {
    const cited = new Map<string, Passage>();
    const views: AuditItemView[] = items.map(item => {
      const model = draft.get(item.cancer);
      for (const finding of model?.item.findings ?? []) for (const id of finding.citations) {
        const passage = model?.passages.find(candidate => candidate.id === id);
        if (passage) cited.set(id, passage);
      }
      return {
        cancer: item.cancer, tier: item.tier, why: item.why, tips: item.tips,
        findings: (model?.item.findings ?? []).map(({ direction, title, text, citations }) => ({ direction, title, text, citations })),
      };
    });
    const typeIds = items.map(item => item.cancer);
    return ask(
      "audit", auditSystem(content.rubric),
      () => auditUser({ language, facts, items: views, overall: { tier: overall.tier, line: overall.line, basis: overall.basis }, passages: [...cited.values()] }),
      auditSchema(typeIds), 1536, raw => validateAudit(raw, { typeIds }),
    );
  }

  try {
    // 1 and 2: one call per type that applies, four at a time.
    const rated = await pool(applicable, concurrency, async type => {
      const outcome = await rateType(type);
      if (outcome.ok) draft.set(type.id, { item: outcome.item, passages: outcome.passages });
      await step();
      return { type, outcome };
    });
    if (cancelled) return;
    const failed = rated.flatMap(entry => (entry.outcome.ok ? [] : [entry.outcome.reason]));
    if (applicable.length === 0 || failed.length === applicable.length) return await fail(applicable.length === 0 ? "no-types" : failed[0]);
    let items: RiskItem[] = rated.map(({ type, outcome }) => (outcome.ok ? finish(type, outcome.item, outcome.passages) : unknownItem(type)));

    // 3: the overall level, from the finished types.
    let overall = await rateOverall(items);
    await step();
    if (cancelled) return;
    if (!overall.ok) return await fail(overall.reason === "deadline" ? "deadline" : "overall");

    // 4: the audit, and one redo of the types it names.
    let audited = false;
    if (!deadline.aborted) {
      const first = await audit(items, overall.value);
      if (first.ok && first.value.clean) audited = true;
      else if (first.ok) {
        const named = [...new Set(first.value.issues.map(issue => issue.cancer))].filter(id => draft.has(id) && !deadline.aborted);
        if (named.length) {
          const redone = await pool(named, concurrency, async id => {
            const note = "A reviewer says: " + first.value.issues.filter(issue => issue.cancer === id).map(issue => issue.issue).join(" ");
            return { id, outcome: await rateType(typeOf.get(id)!, note) };
          });
          const changed = redone.filter(entry => entry.outcome.ok);
          if (changed.length && !deadline.aborted) {
            const candidate = items.map(item => {
              const hit = changed.find(entry => entry.id === item.cancer);
              return hit && hit.outcome.ok ? finish(typeOf.get(item.cancer)!, hit.outcome.item, hit.outcome.passages) : item;
            });
            const again = await rateOverall(candidate);
            if (again.ok) {
              for (const entry of changed) if (entry.outcome.ok) draft.set(entry.id, { item: entry.outcome.item, passages: entry.outcome.passages });
              items = candidate;
              overall = again;
              const second = deadline.aborted ? null : await audit(items, overall.value);
              audited = Boolean(second?.ok && second.value.clean);
            }
          }
        }
      }
    }
    await step();
    if (cancelled) return;

    const order = new Map(content.order.map((id, index) => [id, index]));
    const rank = (tier: RiskItem["tier"]) => riskTiers.indexOf(tier);
    items.sort((a, b) => rank(a.tier) - rank(b.tier) || (order.get(a.cancer) ?? 99) - (order.get(b.cancer) ?? 99));
    // The overall tier is never below the highest tier of a type (the guard checked it; this keeps it true whatever happens above).
    const tier = tierStrength[overall.value.tier] >= tierStrength[maxTier(items.map(item => item.tier))] ? overall.value.tier : maxTier(items.map(item => item.tier));
    const guidelines = citableSources(items.flatMap(item => item.findings.flatMap(finding => finding.sources)), sources).filter(id => sources.get(id)?.guideline);
    const result: RiskResult = {
      version: 1, generatedAt: now().toISOString(), language, contentVersion: content.version,
      overall: { tier, line: overall.value.line, basis: overall.value.basis, drivers: overall.value.drivers },
      items, skipped: input.skipped, guidelines, audited,
    };
    await deps.repo.complete(input.id, result, now());
    log("risk step=job reason=complete");
  } catch {
    await fail("error").catch(() => undefined);
  }
}
