import { spawn } from "node:child_process";
import { constants as fsConstants } from "node:fs";
import { access, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const DRAFTS_DIR = path.join(ROOT, "drafts");
const PROJECTS_DIR = path.join(ROOT, "content", "projects");
const POSTS_DIR = path.join(ROOT, "content", "posts");
const QUEUE_PATH = path.join(ROOT, "sync-queue.txt");
const GITHUB_USER = "fusae";
const TODAY = formatDate(new Date());
const X_SCRIPT = path.join(os.homedir(), ".claude", "skills", "baoyu-danger-x-to-markdown", "scripts", "main.ts");
const URL_SCRIPT = path.join(os.homedir(), ".claude", "skills", "baoyu-url-to-markdown", "scripts", "main.ts");

function formatDate(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function parseArgs(argv) {
  let source = null;
  for (const arg of argv) {
    if (arg.startsWith("--source=")) source = arg.slice("--source=".length);
  }
  if (source && !["github", "queue"].includes(source)) {
    throw new Error(`Unknown source: ${source}`);
  }
  return source ? [source] : ["github", "queue"];
}

async function pathExists(filePath) {
  try {
    await access(filePath, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function listMarkdownFiles(dir) {
  if (!(await pathExists(dir))) return [];
  const entries = await readdir(dir, { withFileTypes: true });
  return entries.filter((entry) => entry.isFile() && entry.name.endsWith(".md")).map((entry) => path.join(dir, entry.name));
}

function parseFrontmatter(markdown) {
  if (!markdown.startsWith("---\n")) return { data: {}, body: markdown, raw: "", lineEnd: "\n" };
  const end = markdown.indexOf("\n---", 4);
  if (end === -1) return { data: {}, body: markdown, raw: "", lineEnd: "\n" };
  const closeEnd = markdown.indexOf("\n", end + 4);
  const raw = markdown.slice(4, end);
  const body = closeEnd === -1 ? "" : markdown.slice(closeEnd + 1);
  return { data: parseYamlSubset(raw), body, raw, lineEnd: markdown.includes("\r\n") ? "\r\n" : "\n" };
}

function parseYamlSubset(raw) {
  const data = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!match) continue;
    const [, key, value = ""] = match;
    data[key] = parseYamlValue(value.trim());
  }
  return data;
}

function parseYamlValue(value) {
  if (value === "") return "";
  if (value === "true") return true;
  if (value === "false") return false;
  if (/^-?\d+$/.test(value)) return Number(value);
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  return value;
}

function serializeYamlValue(value) {
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  const text = String(value ?? "");
  return /^[A-Za-z0-9_./:@-]+$/.test(text) ? text : JSON.stringify(text);
}

function buildFrontmatter(fields) {
  return ["---", ...Object.entries(fields).map(([key, value]) => `${key}: ${serializeYamlValue(value)}`), "---"].join("\n");
}

function setFrontmatterFields(markdown, updates) {
  const parsed = parseFrontmatter(markdown);
  if (!parsed.raw) return markdown;
  const lines = parsed.raw.split(/\r?\n/);
  const pending = new Map(Object.entries(updates));
  const nextLines = lines.map((line) => {
    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!match || !pending.has(match[1])) return line;
    const key = match[1];
    const value = pending.get(key);
    pending.delete(key);
    return `${key}: ${serializeYamlValue(value)}`;
  });
  for (const [key, value] of pending) nextLines.push(`${key}: ${serializeYamlValue(value)}`);
  return `---${parsed.lineEnd}${nextLines.join(parsed.lineEnd)}${parsed.lineEnd}---${parsed.lineEnd}${parsed.body}`;
}

async function readFrontmatters(dirs) {
  const records = [];
  for (const dir of dirs) {
    for (const file of await listMarkdownFiles(dir)) {
      const markdown = await readFile(file, "utf8");
      records.push({ file, markdown, ...parseFrontmatter(markdown) });
    }
  }
  return records;
}

function slugify(input) {
  return String(input)
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "item";
}

async function uniqueDraftPath(baseSlug) {
  await mkdir(DRAFTS_DIR, { recursive: true });
  let candidate = path.join(DRAFTS_DIR, `${TODAY}-${baseSlug}.md`);
  let i = 2;
  while (await pathExists(candidate)) {
    candidate = path.join(DRAFTS_DIR, `${TODAY}-${baseSlug}-${i}.md`);
    i += 1;
  }
  return candidate;
}

async function collectRepoKeys() {
  const records = await readFrontmatters([PROJECTS_DIR, DRAFTS_DIR]);
  const repos = new Set();
  for (const record of records) {
    if (record.data.repo) repos.add(normalizeRepoKey(record.data.repo));
  }
  return { repos, records };
}

function normalizeRepoKey(repo) {
  return String(repo).trim().toLowerCase();
}

async function fetchGithubRepos() {
  const repos = [];
  let page = 1;
  while (true) {
    const url = `https://api.github.com/users/${GITHUB_USER}/repos?type=owner&sort=created&direction=asc&per_page=100&page=${page}`;
    const response = await fetch(url, {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "rabbitrun-sync",
      },
    });
    if (!response.ok) {
      const rateRemaining = response.headers.get("x-ratelimit-remaining");
      const reset = response.headers.get("x-ratelimit-reset");
      const resetText = reset ? ` reset=${new Date(Number(reset) * 1000).toISOString()}` : "";
      throw new Error(`GitHub API ${response.status} ${response.statusText}; remaining=${rateRemaining ?? "unknown"}${resetText}`);
    }
    const batch = await response.json();
    if (!Array.isArray(batch) || batch.length === 0) break;
    repos.push(...batch);
    if (batch.length < 100) break;
    page += 1;
  }
  return repos.filter((repo) => !repo.fork);
}

async function syncGithub() {
  const { repos: seenRepos, records } = await collectRepoKeys();
  const githubRepos = await fetchGithubRepos();
  let created = 0;
  let updated = 0;

  for (const record of records.filter((item) => item.file.startsWith(PROJECTS_DIR) && item.data.repo)) {
    const repo = githubRepos.find((item) => normalizeRepoKey(item.full_name) === normalizeRepoKey(record.data.repo));
    if (!repo) continue;
    const updates = { stars: repo.stargazers_count };
    const githubYear = new Date(repo.created_at).getFullYear();
    if (Number(record.data.year) !== githubYear) updates.year = githubYear;
    const nextRaw = setFrontmatterFields(record.markdown, updates);
    if (nextRaw !== record.markdown) {
      await writeFile(record.file, nextRaw, "utf8");
      updated += 1;
    }
  }

  for (const repo of githubRepos) {
    const key = normalizeRepoKey(repo.full_name);
    if (seenRepos.has(key)) continue;
    const fields = {
      title: repo.name,
      year: new Date(repo.created_at).getFullYear(),
      language: repo.language || "Unknown",
      stars: repo.stargazers_count,
      repo: repo.full_name,
    };
    const body = repo.description ? `${repo.description}\n` : "";
    const file = await uniqueDraftPath(slugify(repo.name));
    await writeFile(file, `${buildFrontmatter(fields)}\n${body}`, "utf8");
    seenRepos.add(key);
    created += 1;
  }

  console.log(`[github] created=${created} updated=${updated} skipped=${githubRepos.length - created}`);
}

function normalizeOriginalUrl(input) {
  try {
    const parsed = new URL(String(input).trim());
    parsed.protocol = "https:";
    parsed.hostname = parsed.hostname.toLowerCase().replace(/^www\./, "");
    if (parsed.hostname === "twitter.com") parsed.hostname = "x.com";
    parsed.search = "";
    parsed.hash = "";
    parsed.pathname = parsed.pathname.replace(/\/+$/, "");
    return parsed.toString();
  } catch {
    return String(input).trim();
  }
}

function sourceForUrl(input) {
  const host = new URL(input).hostname.toLowerCase().replace(/^www\./, "");
  if (host === "x.com" || host === "twitter.com") return "x";
  if (host === "mp.weixin.qq.com") return "wechat";
  if (host === "zhihu.com" || host.endsWith(".zhihu.com")) return "zhihu";
  return null;
}

async function collectOriginalUrls() {
  const records = await readFrontmatters([POSTS_DIR, DRAFTS_DIR]);
  const urls = new Set();
  for (const record of records) {
    if (record.data.original_url) urls.add(normalizeOriginalUrl(record.data.original_url));
  }
  return urls;
}

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: ROOT, stdio: ["ignore", "pipe", "pipe"], ...options });
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr?.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error((stderr || stdout || `${command} exited ${code}`).trim()));
    });
  });
}

async function convertQueuedUrl(url, source) {
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), "rabbitrun-sync-"));
  const output = path.join(tmpDir, "out.md");
  const script = source === "x" ? X_SCRIPT : URL_SCRIPT;
  try {
    await runCommand("npx", ["-y", "bun", script, url, "-o", output, ...(source === "x" ? ["--json"] : [])]);
    const markdown = await readFile(output, "utf8");
    return markdown;
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
}

function titleFromMarkdown(markdown, fallback) {
  const parsed = parseFrontmatter(markdown);
  if (parsed.data.title) return String(parsed.data.title).trim();
  const heading = parsed.body.match(/^#\s+(.+)$/m);
  if (heading?.[1]) return heading[1].trim();
  return fallback;
}

function bodyFromMarkdown(markdown) {
  return parseFrontmatter(markdown).body.trim();
}

async function syncQueue() {
  if (!(await pathExists(QUEUE_PATH))) {
    console.log("[queue] sync-queue.txt not found");
    return;
  }
  const raw = await readFile(QUEUE_PATH, "utf8");
  const lines = raw.split(/\r?\n/);
  const seenUrls = await collectOriginalUrls();
  const keep = [];
  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      keep.push(line);
      continue;
    }
    let normalized;
    let source;
    try {
      normalized = normalizeOriginalUrl(trimmed);
      source = sourceForUrl(normalized);
      if (!source) throw new Error("unsupported domain");
    } catch (error) {
      console.error(`[queue] failed ${trimmed}: ${error instanceof Error ? error.message : String(error)}`);
      keep.push(line);
      failed += 1;
      continue;
    }
    if (seenUrls.has(normalized)) {
      console.log(`[queue] skipped duplicate ${normalized}`);
      skipped += 1;
      continue;
    }
    try {
      const converted = await convertQueuedUrl(normalized, source);
      const title = titleFromMarkdown(converted, normalized);
      const body = bodyFromMarkdown(converted);
      const fields = {
        title,
        date: TODAY,
        source,
        original_url: normalized,
        locale: "zh",
      };
      const file = await uniqueDraftPath(slugify(title));
      await writeFile(file, `${buildFrontmatter(fields)}\n${body}\n`, "utf8");
      seenUrls.add(normalized);
      created += 1;
    } catch (error) {
      console.error(`[queue] failed ${normalized}: ${error instanceof Error ? error.message : String(error)}`);
      keep.push(line);
      failed += 1;
    }
  }

  while (keep.length > 0 && keep.at(-1) === "") keep.pop();
  await writeFile(QUEUE_PATH, `${keep.join("\n")}${keep.length ? "\n" : ""}`, "utf8");
  console.log(`[queue] created=${created} skipped=${skipped} failed=${failed}`);
}

async function main() {
  const sources = parseArgs(process.argv.slice(2));
  for (const source of sources) {
    try {
      if (source === "github") await syncGithub();
      if (source === "queue") await syncQueue();
    } catch (error) {
      console.error(`[${source}] ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

await main();
