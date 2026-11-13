import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { stateSchema, type State } from "./model";
import { database } from "./database";

export const sessionSeconds = 7 * 24 * 60 * 60;
const hash = (token: string) => createHash("sha256").update(token).digest("hex");
const local = () => process.env.DEMO_STORE === "file";
const root = () => resolve(process.env.DEMO_DATA_DIR || ".care4all-data");
const file = (id: string) => resolve(root(), id + ".json");
const queues = new Map<string, Promise<unknown>>();

function serial<T>(id: string, run: () => Promise<T>): Promise<T> {
  const pending = (queues.get(id) ?? Promise.resolve()).catch(() => {}).then(run);
  queues.set(id, pending);
  const release = () => { if (queues.get(id) === pending) queues.delete(id); };
  void pending.then(release, release);
  return pending;
}

async function readLocal(id: string): Promise<{ state: unknown; expiresAt: string } | null> {
  try { return JSON.parse(await readFile(file(id), "utf8")); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}
async function writeLocal(id: string, state: State, expiresAt: string) {
  const tmp = file(id) + ".tmp";
  await writeFile(tmp, JSON.stringify({ state, expiresAt }), { mode: 0o600 });
  await rename(tmp, file(id));
}

export async function createSession(state: State) {
  const token = randomBytes(32).toString("hex");
  const id = hash(token);
  const expiresAt = new Date(Date.now() + sessionSeconds * 1000);
  if (local()) {
    await mkdir(root(), { recursive: true, mode: 0o700 });
    await writeLocal(id, state, expiresAt.toISOString());
  } else {
    await database().demoSession.deleteMany({ where: { expiresAt: { lte: new Date() } } });
    await database().demoSession.create({ data: { id, state, expiresAt } });
  }
  return token;
}
export async function getSession(token?: string) {
  if (!token) return null;
  const id = hash(token);
  const record = local() ? await readLocal(id) : await database().demoSession.findUnique({ where: { id } });
  return record && new Date(record.expiresAt).getTime() > Date.now() ? stateSchema.parse(record.state) : null;
}
export async function saveSession(token: string, state: State) {
  const id = hash(token);
  const revision = state.revision - 1;
  if (local()) return serial(id, async () => {
    const record = await readLocal(id);
    if (!record || new Date(record.expiresAt).getTime() <= Date.now() || stateSchema.parse(record.state).revision !== revision) return false;
    await writeLocal(id, state, record.expiresAt);
    return true;
  });
  const result = await database().demoSession.updateMany({
    where: { id, revision, expiresAt: { gt: new Date() } }, data: { revision: state.revision, state },
  });
  return result.count === 1;
}
export async function deleteSession(token: string) {
  const id = hash(token);
  if (local()) return serial(id, async () => {
    try { await unlink(file(id)); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
  });
  await database().demoSession.deleteMany({ where: { id } });
}
export async function checkStore() {
  if (local()) await mkdir(root(), { recursive: true, mode: 0o700 });
  else await database().demoSession.findFirst({ select: { id: true } });
}
