import "server-only";
import { database } from "../database";
import type { Prisma } from "../../generated/prisma/client";
import { loadSurvey } from "../survey-store";
import { interruptedAfterMs, type RiskRepo, type RiskRow } from "./types";

// The risk code's only door to PostgreSQL: the interview it reads (written by the interview package), and the assessment row
// it writes. Account data, deleted with the account. Nothing here logs.

const json = (value: unknown) => value as Prisma.InputJsonValue;
const select = {
  id: true, username: true, status: true, language: true, inputHash: true, contentVersion: true, result: true, progress: true, failure: true,
  provider: true, model: true, createdAt: true, updatedAt: true, completedAt: true,
} as const;

export const prismaRiskRepo: RiskRepo = {
  async loadAnswers(username) {
    return (await loadSurvey({ username, language: "en" })).answers;
  },

  async loadTranscript(username) {
    const turns = await database().aiTurn.findMany({
      where: { interview: { username }, answeredAt: { not: null }, answerLabel: { not: null } },
      orderBy: { position: "asc" }, select: { domain: true, title: true, answerLabel: true },
    });
    return turns.map(turn => ({ domain: turn.domain, question: turn.title, answer: turn.answerLabel ?? "" }));
  },

  async interviewComplete(username) {
    const interview = await database().aiInterview.findUnique({ where: { username }, select: { status: true } });
    return interview?.status === "complete";
  },

  async read(username, now) {
    const db = database();
    const row = await db.riskAssessment.findUnique({ where: { username }, select });
    if (row && row.status === "running" && now.getTime() - row.updatedAt.getTime() > interruptedAfterMs) {
      await db.riskAssessment.updateMany({ where: { id: row.id, status: "running" }, data: { status: "failed", failure: "interrupted" } });
      return db.riskAssessment.findUnique({ where: { username }, select });
    }
    return row;
  },

  async start(input, now) {
    const db = database();
    const existing = await prismaRiskRepo.read(input.username, now);
    if (existing?.status === "running") return { row: existing, created: false };
    const { username, ...fields } = input;
    const progress = { done: 0, total: input.total };
    try {
      const row = await db.$transaction(async tx => {
        await tx.riskAssessment.deleteMany({ where: { username } });
        return tx.riskAssessment.create({
          data: {
            username, status: "running", language: fields.language, inputHash: fields.inputHash, contentVersion: fields.contentVersion,
            provider: fields.provider, model: fields.model, progress: json(progress),
          },
          select,
        });
      });
      return { row, created: true };
    } catch (error) {
      // A second request won the race to create the row (username is unique): that one is the running assessment.
      const winner = await db.riskAssessment.findUnique({ where: { username }, select });
      if (winner) return { row: winner, created: false };
      throw error;
    }
  },

  async progress(id, progress) {
    const { count } = await database().riskAssessment.updateMany({ where: { id, status: "running" }, data: { progress: json(progress) } });
    return count > 0;
  },

  async complete(id, result, now) {
    const { count } = await database().riskAssessment.updateMany({
      where: { id, status: "running" }, data: { status: "complete", result: json(result), failure: null, completedAt: now },
    });
    return count > 0;
  },

  async fail(id, reason) {
    const { count } = await database().riskAssessment.updateMany({ where: { id, status: "running" }, data: { status: "failed", failure: reason } });
    return count > 0;
  },
};

export type { RiskRow };
