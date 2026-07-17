import { spawn } from "node:child_process";
import { constants as fsConstants } from "node:fs";
import { access, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

const ROOT = process.cwd();
const DRAFTS_DIR = path.join(ROOT, "drafts");
const PROJECTS_DIR = path.join(ROOT, "content", "projects");
const POSTS_DIR = path.join(ROOT, "content", "posts");
const POST_IMAGES_DIR = path.join(POSTS_DIR, "images");
const QUEUE_PATH = path.join(ROOT, "sync-queue.txt");
const GITHUB_USER = "fusae";
const TODAY = formatDate(new Date());
const X_SCRIPT = path.join(os.homedir(), ".claude", "skills", "baoyu-danger-x-to-markdown", "scripts", "main.ts");
const URL_SCRIPT = path.join(os.homedir(), ".claude", "skills", "baoyu-url-to-markdown", "scripts", "main.ts");
const URL_SCRIPT_DIR = path.dirname(URL_SCRIPT);

function formatDate(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function parseArgs(argv) {
  let source = null;
  const wechatPosts = [];
  for (const arg of argv) {
    if (arg.startsWith("--source=")) source = arg.slice("--source=".length);
    if (arg.startsWith("--wechat-post=")) {
      const value = arg.slice("--wechat-post=".length);
      const separator = value.indexOf("=");
      if (separator === -1) throw new Error("--wechat-post expects file=url");
      wechatPosts.push({ file: value.slice(0, separator), url: value.slice(separator + 1) });
    }
  }
  if (source && !["github", "queue"].includes(source)) {
    throw new Error(`Unknown source: ${source}`);
  }
  return { sources: source ? [source] : ["github", "queue"], wechatPosts };
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
    const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
    parsed.hostname = host === "twitter.com" ? "x.com" : host;
    parsed.hash = "";
    parsed.pathname = parsed.pathname.replace(/\/+$/, "");
    if (parsed.hostname === "mp.weixin.qq.com") {
      const kept = new URLSearchParams();
      for (const key of ["__biz", "idx", "mid", "sn"]) {
        const value = parsed.searchParams.get(key);
        if (value !== null) kept.set(key, value);
      }
      parsed.search = kept.toString();
    } else {
      parsed.search = "";
    }
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

const WECHAT_JUNK_LINES = new Set([
  "Original",
  "AI帮我想个名",
  "在小说阅读器读本章",
  "去阅读",
  "在小说阅读器中沉浸阅读",
]);

function isWechatItalicMetadata(line) {
  const trimmed = line.trim();
  if (!/^\*[^*]+\*$/.test(trimmed)) return false;
  const inner = trimmed.slice(1, -1).trim();
  return /(\d{4}年\d{1,2}月\d{1,2}日|\d{1,2}:\d{2}|广东|北京|上海|天津|重庆|香港|澳门|台湾|浙江|江苏|福建|山东|河南|湖北|湖南|江西|安徽|四川|贵州|云南|陕西|甘肃|青海|海南|辽宁|吉林|黑龙江|河北|山西|内蒙古|广西|西藏|宁夏|新疆)/.test(inner);
}

function isWechatShortAuthorLike(line) {
  const trimmed = line.trim();
  return trimmed.length > 0 && trimmed.length < 10 && !/[，。！？；：,.!?;:、（）()《》「」『」"'“”‘’\-—#*_`\[\]]/.test(trimmed);
}

function isWechatJunkLine(line) {
  const trimmed = line.trim();
  return (
    trimmed === "" ||
    trimmed.startsWith("#") ||
    trimmed.startsWith("*#") ||
    WECHAT_JUNK_LINES.has(trimmed) ||
    isWechatItalicMetadata(line) ||
    isWechatShortAuthorLike(line)
  );
}

function collapseBlankLines(text) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const out = [];
  let lastBlank = false;
  for (const line of lines) {
    const blank = line.trim() === "";
    if (blank) {
      if (!lastBlank) out.push("");
    } else {
      out.push(line);
    }
    lastBlank = blank;
  }
  return out.join("\n").replace(/\n*$/, "\n");
}

function cleanWechatBody(body) {
  const lines = body.replace(/\r\n/g, "\n").split("\n");
  const tailStart = lines.findIndex((line) => line.includes("预览时标签不可点"));
  const trimmedTail = tailStart === -1 ? lines : lines.slice(0, tailStart);
  const start = trimmedTail.findIndex((line) => line.trim().length > 30 && !isWechatJunkLine(line));
  return collapseBlankLines((start === -1 ? trimmedTail : trimmedTail.slice(start)).join("\n"));
}

function decodeHtmlEntities(text) {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function extractWechatImageUrls(html) {
  const contentMatch = html.match(/<div[^>]+id=["']js_content["'][\s\S]*?<\/div>\s*<script/i);
  const content = contentMatch ? contentMatch[0] : html;
  const urls = [];
  const seen = new Set();
  for (const match of content.matchAll(/<img\b[^>]*>/gi)) {
    const tag = match[0];
    const source = tag.match(/\s(?:src|data-src)=["']([^"']+)["']/i);
    const dataSource = tag.match(/\sdata-src=["']([^"']+)["']/i);
    const rawUrl = dataSource?.[1] || source?.[1];
    if (!rawUrl) continue;
    const url = decodeHtmlEntities(rawUrl);
    if (!/\/\/mmbiz\.qpic\.cn\//i.test(url) || seen.has(url)) continue;
    seen.add(url);
    urls.push(url);
  }
  return urls;
}

function hasWechatErrorPageHtml(html) {
  return WECHAT_ERROR_MARKERS.some((marker) => html.includes(marker)) || html.includes("secitptpage/verify");
}

function extensionFromContentType(contentType) {
  const normalized = String(contentType || "").split(";")[0].trim().toLowerCase();
  return {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/webp": "webp",
    "image/svg+xml": "svg",
  }[normalized] || "jpg";
}

async function downloadWechatImages(originalUrl, slug) {
  let imageUrls = [];
  const response = await fetch(originalUrl, {
    headers: {
      Referer: "https://mp.weixin.qq.com/",
      "User-Agent": "Mozilla/5.0 rabbitrun-sync",
    },
  });
  if (!response.ok) {
    console.warn(`[wechat] image scan failed ${originalUrl}: ${response.status} ${response.statusText}`);
  } else {
    const html = await response.text();
    if (!hasWechatErrorPageHtml(html)) imageUrls = extractWechatImageUrls(html);
  }
  if (imageUrls.length === 0) imageUrls = await extractWechatImageUrlsWithChrome(originalUrl);
  if (imageUrls.length === 0) throw new Error("wechat image scan found 0 images");

  const dir = path.join(POST_IMAGES_DIR, slug);
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });

  const images = [];
  let index = 1;
  for (const imageUrl of imageUrls) {
    try {
      const imageResponse = await fetch(imageUrl, {
        headers: {
          Referer: originalUrl,
          "User-Agent": "Mozilla/5.0 rabbitrun-sync",
        },
      });
      if (!imageResponse.ok) throw new Error(`${imageResponse.status} ${imageResponse.statusText}`);
      const ext = extensionFromContentType(imageResponse.headers.get("content-type"));
      const name = `${String(index).padStart(2, "0")}.${ext}`;
      await writeFile(path.join(dir, name), Buffer.from(await imageResponse.arrayBuffer()));
      images.push({ source: imageUrl, markdown: `![](/images/${slug}/${name})` });
      index += 1;
    } catch (error) {
      console.warn(`[wechat] image download skipped ${imageUrl}: ${error instanceof Error ? error.message : String(error)}`);
      images.push({ source: imageUrl, markdown: "[图片加载失败]" });
    }
  }
  return images;
}

async function extractWechatImageUrlsWithChrome(originalUrl) {
  const tmpDir = await mkdtemp(path.join(ROOT, ".rabbitrun-sync-"));
  const scriptPath = path.join(tmpDir, "wechat-image-scan.ts");
  const cdpPath = pathToFileURL(path.join(URL_SCRIPT_DIR, "cdp.ts")).href;
  const script = `
import { CdpConnection, getFreePort, launchChrome, waitForChromeDebugPort, waitForNetworkIdle, waitForPageLoad, autoScroll, evaluateScript, killChrome } from ${JSON.stringify(cdpPath)};

const url = process.argv[2];
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const port = await getFreePort();
const chrome = await launchChrome(url, port, false);
let cdp = null;
try {
  const wsUrl = await waitForChromeDebugPort(port, 30_000);
  cdp = await CdpConnection.connect(wsUrl, 10_000);
  const targets = await cdp.send("Target.getTargets");
  const pageTarget = targets.targetInfos.find((target) => target.type === "page" && target.url.startsWith("http"));
  if (!pageTarget) throw new Error("No page target found");
  const attached = await cdp.send("Target.attachToTarget", { targetId: pageTarget.targetId, flatten: true });
  const sessionId = attached.sessionId;
  await cdp.send("Network.enable", {}, { sessionId });
  await cdp.send("Page.enable", {}, { sessionId });
  await Promise.race([waitForPageLoad(cdp, sessionId, 15_000), sleep(8_000)]);
  await waitForNetworkIdle(cdp, sessionId, 2_000);
  await sleep(1_500);
  await autoScroll(cdp, sessionId, 8, 600);
  await sleep(1_000);
  const result = await evaluateScript(cdp, sessionId, String.raw\`
(() => {
  const text = document.body?.innerText || "";
  const html = document.documentElement?.innerHTML || "";
  const urls = Array.from(document.querySelectorAll("#js_content img, img"))
    .map((img) => img.getAttribute("data-src") || img.getAttribute("data-original") || img.currentSrc || img.getAttribute("src"))
    .filter(Boolean)
    .map((url) => {
      try { return new URL(url, document.baseURI).href; } catch { return url; }
    })
    .filter((url) => /\\/\\/mmbiz\\.qpic\\.cn\\//i.test(url));
  return {
    hasVerifyPage: html.includes("secitptpage/verify"),
    errorMarkers: ["环境异常", "Refreshing too often", "请在微信客户端打开", "参数错误", "该内容已被发布者删除"].filter((marker) => text.includes(marker)),
    urls: Array.from(new Set(urls)),
  };
})()
  \`, 30_000);
  console.log(JSON.stringify(result));
} finally {
  if (cdp) {
    try { await cdp.send("Browser.close", {}, { timeoutMs: 5_000 }); } catch {}
    cdp.close();
  }
  killChrome(chrome);
}
`;
  try {
    await writeFile(scriptPath, script, "utf8");
    const { stdout } = await runCommand("npx", ["-y", "bun", scriptPath, originalUrl]);
    const result = JSON.parse(stdout.trim().split(/\r?\n/).at(-1));
    const reasons = Array.isArray(result.errorMarkers) ? result.errorMarkers : [];
    if (reasons.length > 0 || result.hasVerifyPage) {
      throw new Error(`wechat image scan error page (${reasons.join("; ") || "verify page"})`);
    }
    return Array.isArray(result.urls) ? result.urls : [];
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
}

function applyWechatImages(markdownBody, images) {
  if (images.length === 0) return markdownBody;
  let index = 0;
  const replaced = markdownBody.replace(/!\[[^\]]*]\((https?:\/\/mmbiz\.qpic\.cn\/[^)]+)\)/gi, () => {
    const image = images[index++];
    return image?.markdown || "[图片加载失败]";
  });
  if (index > 0) return replaced;
  return `${replaced.trim()}\n\n${images.map((image) => image.markdown).join("\n\n")}\n`;
}

async function buildPostMarkdown(converted, source, originalUrl, slug) {
  let body = bodyFromMarkdown(converted);
  if (source === "wechat") {
    body = cleanWechatBody(body);
    const images = await downloadWechatImages(originalUrl, slug);
    body = applyWechatImages(body, images);
    return { body, imageCount: images.filter((image) => image.markdown.startsWith("![](")).length };
  }
  return { body, imageCount: 0 };
}

const WECHAT_ERROR_MARKERS = [
  "环境异常",
  "Refreshing too often",
  "请在微信客户端打开",
  "参数错误",
  "该内容已被发布者删除",
];

export function getWechatErrorPageReasons(markdown, frontmatter = parseFrontmatter(markdown).data) {
  const reasons = [];
  const title = String(frontmatter.title ?? "");
  if (title.includes("Weixin Official Accounts Platform")) {
    reasons.push("title=Weixin Official Accounts Platform");
  }

  const body = parseFrontmatter(markdown).body;
  const substantiveLength = body
    .replace(/^#{1,6}\s.*$/gm, "")
    .replace(/\*/g, "")
    .replace(/\s/g, "").length;
  if (substantiveLength < 40) {
    reasons.push(`body substantive chars < 40 (${substantiveLength})`);
  }

  for (const marker of WECHAT_ERROR_MARKERS) {
    if (body.includes(marker)) reasons.push(`contains ${marker}`);
  }

  return reasons;
}

export function isWechatErrorPage(markdown, frontmatter = parseFrontmatter(markdown).data) {
  return getWechatErrorPageReasons(markdown, frontmatter).length > 0;
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
      const parsed = parseFrontmatter(converted);
      if (source === "wechat") {
        const errorReasons = getWechatErrorPageReasons(converted, parsed.data);
        if (errorReasons.length > 0) {
          console.log(`[queue] failed ${normalized}: wechat error page (${errorReasons.join("; ")})`);
          keep.push(line);
          failed += 1;
          continue;
        }
      }
      const title = titleFromMarkdown(converted, normalized);
      const fields = {
        title,
        date: TODAY,
        source,
        original_url: normalized,
        locale: "zh",
      };
      const file = await uniqueDraftPath(slugify(title));
      const slug = path.basename(file, ".md");
      const { body, imageCount } = await buildPostMarkdown(converted, source, normalized, slug);
      await writeFile(file, `${buildFrontmatter(fields)}\n${body}\n`, "utf8");
      seenUrls.add(normalized);
      created += 1;
      if (source === "wechat") console.log(`[wechat] images=${imageCount} slug=${slug}`);
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

async function refreshWechatPost(file, originalUrl) {
  const target = path.resolve(ROOT, file);
  if (!target.startsWith(POSTS_DIR + path.sep)) throw new Error(`Refusing to write outside posts: ${file}`);
  const normalized = normalizeOriginalUrl(originalUrl);
  const converted = await convertQueuedUrl(normalized, "wechat");
  const parsed = parseFrontmatter(converted);
  const errorReasons = getWechatErrorPageReasons(converted, parsed.data);
  if (errorReasons.length > 0) throw new Error(`wechat error page (${errorReasons.join("; ")})`);
  const title = titleFromMarkdown(converted, normalized);
  const slug = path.basename(target, ".md");
  const { body, imageCount } = await buildPostMarkdown(converted, "wechat", normalized, slug);
  const fields = {
    title,
    date: TODAY,
    source: "wechat",
    original_url: normalized,
    locale: "zh",
  };
  await writeFile(target, `${buildFrontmatter(fields)}\n${body}\n`, "utf8");
  console.log(`[wechat-post] ${path.basename(target)} images=${imageCount}`);
}

async function main() {
  const { sources, wechatPosts } = parseArgs(process.argv.slice(2));
  for (const post of wechatPosts) {
    await refreshWechatPost(post.file, post.url);
  }
  if (wechatPosts.length > 0) return;
  for (const source of sources) {
    try {
      if (source === "github") await syncGithub();
      if (source === "queue") await syncQueue();
    } catch (error) {
      console.error(`[${source}] ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
