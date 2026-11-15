import { Prisma, type PrismaClient } from "../../generated/prisma/client";
import type { InterviewRow, InterviewStore, Language, NewTurn, StoredAnswer, TurnRow } from "./types";

// AiInterview and AiTurn on PostgreSQL (docs/design-v2.md section 10, Appendix A.2). Position handling is the database's:
// (interviewId, position) is unique, so two requests that ask the next question at the same time cannot both succeed, and an
// answer is a conditional update of the open turn, so a double submit changes nothing the second time.

const json = (value: unknown) => (value === null ? Prisma.DbNull : (value as Prisma.InputJsonValue));
const language = (value: string): Language => value === "fi" ? "fi" : "en";

type Stored = Awaited<ReturnType<typeof read>>;
const read = (db: Pick<PrismaClient, "aiInterview">, username: string) =>
  db.aiInterview.findUnique({ where: { username }, include: { turns: { orderBy: { position: "asc" } } } });

function rowOf(stored: NonNullable<Stored>): InterviewRow {
  return {
    id: stored.id, username: stored.username, language: language(stored.language), status: stored.status === "complete" ? "complete" : "active",
    startedAt: stored.startedAt, completedAt: stored.completedAt,
    turns: stored.turns.map((turn): TurnRow => ({
      position: turn.position, domain: turn.domain, kind: turn.kind as TurnRow["kind"], title: turn.title, help: turn.help,
      options: turn.options as TurnRow["options"], range: turn.range as TurnRow["range"], source: turn.source === "bank" ? "bank" : "model",
      provider: turn.provider, model: turn.model, answer: turn.answer as StoredAnswer | null, answerLabel: turn.answerLabel,
      askedAt: turn.askedAt, answeredAt: turn.answeredAt,
    })),
  };
}
const duplicate = (error: unknown) => typeof error === "object" && error !== null && "code" in error && error.code === "P2002";

export function prismaInterviewStore(db: () => PrismaClient): InterviewStore {
  return {
    async load(username) {
      const stored = await read(db(), username);
      return stored ? rowOf(stored) : null;
    },
    async create(username, lang) {
      try {
        await db().aiInterview.create({ data: { username, language: lang, status: "active" } });
      } catch (error) {
        if (!duplicate(error)) throw error; // a concurrent start made it first
      }
      return rowOf((await read(db(), username))!);
    },
    async addTurn(interviewId, turn: NewTurn, now) {
      try {
        await db().aiTurn.create({
          data: {
            interviewId, position: turn.position, domain: turn.domain, kind: turn.kind, title: turn.title, help: turn.help,
            options: json(turn.options), range: json(turn.range), source: turn.source, provider: turn.provider, model: turn.model, askedAt: now,
          },
        });
        return true;
      } catch (error) {
        if (duplicate(error)) return false;
        throw error;
      }
    },
    async answerTurn(interviewId, position, answer, label, now) {
      const updated = await db().aiTurn.updateMany({
        where: { interviewId, position, answeredAt: null },
        data: { answer: json(answer), answerLabel: label, answeredAt: now },
      });
      return updated.count === 1;
    },
    async complete(interviewId, now) {
      await db().aiInterview.updateMany({ where: { id: interviewId }, data: { status: "complete", completedAt: now } });
    },
    async undo(interviewId) {
      return db().$transaction(async tx => {
        const last = await tx.aiTurn.findFirst({ where: { interviewId, answeredAt: { not: null } }, orderBy: { position: "desc" }, select: { position: true } });
        if (!last) return false;
        await tx.aiTurn.deleteMany({ where: { interviewId, position: { gt: last.position } } });
        await tx.aiTurn.updateMany({ where: { interviewId, position: last.position }, data: { answer: Prisma.DbNull, answerLabel: null, answeredAt: null } });
        await tx.aiInterview.updateMany({ where: { id: interviewId }, data: { status: "active", completedAt: null } });
        return true;
      });
    },
    async remove(username) {
      await db().aiInterview.deleteMany({ where: { username } });
    },
  };
}

/** The same behaviour in memory, for tests. */
export function memoryInterviewStore(): InterviewStore & { rows: Map<string, InterviewRow> } {
  const rows = new Map<string, InterviewRow>();
  let counter = 0;
  const find = (id: string) => [...rows.values()].find(row => row.id === id);
  const copy = (row: InterviewRow): InterviewRow => structuredClone(row);
  return {
    rows,
    async load(username) { const row = rows.get(username); return row ? copy(row) : null; },
    async create(username, lang) {
      if (!rows.has(username)) rows.set(username, { id: "i" + ++counter, username, language: lang, status: "active", startedAt: new Date(), completedAt: null, turns: [] });
      return copy(rows.get(username)!);
    },
    async addTurn(interviewId, turn, now) {
      const row = find(interviewId);
      if (!row || row.turns.some(item => item.position === turn.position)) return false;
      row.turns.push({ ...turn, answer: null, answerLabel: null, askedAt: now, answeredAt: null });
      row.turns.sort((a, b) => a.position - b.position);
      return true;
    },
    async answerTurn(interviewId, position, answer, label, now) {
      const turn = find(interviewId)?.turns.find(item => item.position === position);
      if (!turn || turn.answeredAt) return false;
      Object.assign(turn, { answer, answerLabel: label, answeredAt: now });
      return true;
    },
    async complete(interviewId, now) { const row = find(interviewId); if (row) Object.assign(row, { status: "complete", completedAt: now }); },
    async undo(interviewId) {
      const row = find(interviewId);
      const last = row?.turns.filter(turn => turn.answeredAt).at(-1);
      if (!row || !last) return false;
      row.turns = row.turns.filter(turn => turn.position <= last.position);
      Object.assign(last, { answer: null, answerLabel: null, answeredAt: null });
      Object.assign(row, { status: "active", completedAt: null });
      return true;
    },
    async remove(username) { rows.delete(username); },
  };
}
