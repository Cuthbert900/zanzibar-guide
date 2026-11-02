import fs from "node:fs";
import { MongoClient, type Collection, type Db, type Document } from "mongodb";
import { dataFile } from "./paths";

type StateDocument<T> = Document & { _id: string; value: T };

const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/zanzibar_guide";
const databaseName = process.env.MONGODB_DATABASE || "zanzibar_guide";
let client: MongoClient | undefined;
let database: Db | undefined;
const writes = new Map<string, Promise<void>>();

export async function connectDatabase(): Promise<void> {
  if (database) return;
  client = new MongoClient(uri);
  await client.connect();
  database = client.db(databaseName);
  await database.command({ ping: 1 });
  console.info(`[mongodb] connected to ${databaseName}`);
}

export async function closeDatabase(): Promise<void> {
  await client?.close();
  client = undefined;
  database = undefined;
}

function stateCollection<T>(): Collection<StateDocument<T>> {
  if (!database) throw new Error("MongoDB has not been initialized");
  return database.collection<StateDocument<T>>("app_state");
}

export async function readState<T>(name: string, fallback: T): Promise<T> {
  const collection = stateCollection<T>();
  const existing = await collection.findOne({ _id: name });
  if (existing) return existing.value;

  const legacyPath = dataFile(`${name}.json`);
  const initial = fs.existsSync(legacyPath)
    ? (JSON.parse(fs.readFileSync(legacyPath, "utf8")) as T)
    : structuredClone(fallback);
  await collection.updateOne({ _id: name }, { $setOnInsert: { value: initial } }, { upsert: true });
  const stored = await collection.findOne({ _id: name });
  return stored?.value ?? initial;
}

export function writeState<T>(name: string, value: T): Promise<void> {
  const previous = writes.get(name) ?? Promise.resolve();
  const next = previous
    .catch(() => undefined)
    .then(async () => {
      const collection = stateCollection<T>();
      await collection.updateOne({ _id: name }, { $set: { value: structuredClone(value) } }, { upsert: true });
    });
  writes.set(name, next);
  return next.finally(() => {
    if (writes.get(name) === next) writes.delete(name);
  });
}