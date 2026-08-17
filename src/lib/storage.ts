import { promises as fs } from "fs";
import path from "path";
import { ExtractedData, SavedStatement } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");

// On a read-only filesystem (e.g. Vercel, outside /tmp) this throws (EROFS).
// Reads should degrade to "nothing saved" rather than crash the page —
// saveStatement() is never reached there since the API route gates it on
// isSaveAvailable() first, so it's fine for mkdir to fail loudly if it ever
// does get called.
async function ensureDataDir(): Promise<boolean> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    return true;
  } catch {
    return false;
  }
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "unknown";
}

function todayStamp(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export async function saveStatement(
  data: ExtractedData,
  sourceFileName: string
): Promise<SavedStatement> {
  await ensureDataDir();

  const merchantSlug = slugify(data.merchantName || "unknown-merchant");
  const dateStamp = todayStamp();
  let fileName = `${merchantSlug}_${dateStamp}.json`;
  let counter = 1;
  while (
    await fs
      .access(path.join(DATA_DIR, fileName))
      .then(() => true)
      .catch(() => false)
  ) {
    fileName = `${merchantSlug}_${dateStamp}-${counter}.json`;
    counter++;
  }

  const record: SavedStatement = {
    id: fileName.replace(/\.json$/, ""),
    sourceFileName,
    savedAt: new Date().toISOString(),
    data,
  };

  await fs.writeFile(path.join(DATA_DIR, fileName), JSON.stringify(record, null, 2), "utf-8");
  return record;
}

export async function getStatementById(id: string): Promise<SavedStatement | null> {
  if (!/^[a-z0-9_-]+$/i.test(id)) return null;
  if (!(await ensureDataDir())) return null;
  try {
    const raw = await fs.readFile(path.join(DATA_DIR, `${id}.json`), "utf-8");
    return JSON.parse(raw) as SavedStatement;
  } catch {
    return null;
  }
}

export async function listStatements(): Promise<SavedStatement[]> {
  if (!(await ensureDataDir())) return [];
  try {
    const files = await fs.readdir(DATA_DIR);
    const jsonFiles = files.filter((f) => f.endsWith(".json"));

    const records = await Promise.all(
      jsonFiles.map(async (file) => {
        const raw = await fs.readFile(path.join(DATA_DIR, file), "utf-8");
        return JSON.parse(raw) as SavedStatement;
      })
    );

    return records.sort((a, b) => (a.savedAt < b.savedAt ? 1 : -1));
  } catch {
    return [];
  }
}
