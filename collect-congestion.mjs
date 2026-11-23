#!/usr/bin/env node
// Fetches how full the trains are on Seoul Metro Lines 1 to 8.
//
//   node collect-congestion.mjs
//
// Seoul Metro publishes this as a spreadsheet, a few times a year, with no API
// and no key: the average crowding of the trains passing each station in each
// half hour, by direction, for weekdays, Saturdays and Sundays. 34% means every
// seat is taken; 100% is the number of people a car is built for.
//
// This script finds the newest file on the dataset's page, downloads it, and
// saves the figures to data/congestion.json for the website.
// Needs Node 18 or newer. No dependencies, so the spreadsheet is unpacked by hand.

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { inflateRawSync } from "node:zlib";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(ROOT, "data", "congestion.json");
const DATASET = "OA-12928";
const PAGE = process.env.CONGESTION_PAGE || `https://data.seoul.go.kr/dataList/${DATASET}/F/1/datasetView.do`;
const DOWNLOAD = process.env.CONGESTION_DOWNLOAD || "https://datafile.seoul.go.kr/bigfile/iot/inf/nio_download.do?&useCache=false";
const TIMEOUT_MS = 60000;
const BROWSER = { "user-agent": "Mozilla/5.0 (compatible; seoul-crowd collector; +https://github.com/Parvis123/seoul-crowd)" };

const note = (kind, text) => console.log(process.env.GITHUB_ACTIONS ? `::${kind} title=Train crowding::${text}` : `${kind}: ${text}`);

// ---------- find and download the newest file ----------

/** The files listed on the dataset's page, newest first. */
function listFiles(html) {
  const files = [];
  const pattern = /title="([^"]*_(\d{8})\.(xlsx|csv))"\s+onclick="javascript:downloadFile\('(\d+)'\)/g;
  for (const [, name, date, type, seq] of html.matchAll(pattern)) files.push({ name, date, type, seq });
  return files.sort((a, b) => b.date.localeCompare(a.date));
}

async function download(file) {
  const body = new URLSearchParams({ infId: DATASET, seqNo: "", seq: file.seq, infSeq: "1" });
  const res = await fetch(DOWNLOAD, {
    method: "POST",
    body,
    headers: { ...BROWSER, referer: PAGE },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`the download returned ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

// ---------- read a spreadsheet without a library ----------

// An .xlsx file is a zip of XML files. This reads the zip's index at the end of
// the file and unpacks one named entry.
function unzip(buffer) {
  const end = buffer.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (end < 0) throw new Error("the file is not a zip");
  const count = buffer.readUInt16LE(end + 10);
  let at = buffer.readUInt32LE(end + 16);
  const entries = new Map();
  for (let i = 0; i < count; i++) {
    if (buffer.readUInt32LE(at) !== 0x02014b50) throw new Error("the zip index is damaged");
    const method = buffer.readUInt16LE(at + 10);
    const packed = buffer.readUInt32LE(at + 20);
    const nameLength = buffer.readUInt16LE(at + 28);
    const extraLength = buffer.readUInt16LE(at + 30);
    const commentLength = buffer.readUInt16LE(at + 32);
    const local = buffer.readUInt32LE(at + 42);
    entries.set(buffer.toString("utf8", at + 46, at + 46 + nameLength), { method, packed, local });
    at += 46 + nameLength + extraLength + commentLength;
  }
  return {
    names: [...entries.keys()],
    read(name) {
      const entry = entries.get(name);
      if (!entry) return null;
      const start = entry.local + 30 + buffer.readUInt16LE(entry.local + 26) + buffer.readUInt16LE(entry.local + 28);
      const data = buffer.subarray(start, start + entry.packed);
      return (entry.method === 0 ? data : inflateRawSync(data)).toString("utf8");
    },
  };
}

const unescape = (text) =>
  text.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n))).replace(/&amp;/g, "&");

/** The text inside a cell or a shared string: every <t> run joined up. */
const textOf = (xml) => [...xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map((m) => unescape(m[1])).join("");

/** "C" -> 2, "AA" -> 26. */
const columnIndex = (letters) => [...letters].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0) - 1;

/** The first sheet of a workbook as rows of cells: strings, numbers, or undefined for an empty cell. */
function readXlsx(buffer) {
  const zip = unzip(buffer);
  const shared = [...(zip.read("xl/sharedStrings.xml") ?? "").matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => textOf(m[1]));
  const sheetName = zip.names.filter((name) => /^xl\/worksheets\/sheet\d+\.xml$/.test(name)).sort((a, b) => a.length - b.length || a.localeCompare(b))[0];
  const sheet = sheetName && zip.read(sheetName);
  if (!sheet) throw new Error("the workbook has no sheet");
  const rows = [];
  for (const [, rowXml] of sheet.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
    const row = [];
    for (const [, attrs, inner] of rowXml.matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const ref = /\br="([A-Z]+)\d+"/.exec(attrs);
      const type = /\bt="(\w+)"/.exec(attrs)?.[1];
      const raw = /<v>([\s\S]*?)<\/v>/.exec(inner ?? "")?.[1];
      let value;
      if (type === "s") value = shared[Number(raw)];
      else if (type === "inlineStr") value = textOf(inner ?? "");
      else if (type === "str") value = raw === undefined ? undefined : unescape(raw);
      else if (raw !== undefined && raw !== "") value = Number(raw);
      row[ref ? columnIndex(ref[1]) : row.length] = value;
    }
    rows.push(row);
  }
  return rows;
}

/** A .csv file as rows of cells. Older files are in the Korean EUC-KR encoding, newer ones in UTF-8. */
function readCsv(buffer) {
  let text;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  } catch {
    text = new TextDecoder("euc-kr").decode(buffer);
  }
  return text
    .replace(/^﻿/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim())
    .map((line) => {
      const cells = [];
      let cur = "";
      let quoted = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (quoted) {
          if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
          else if (ch === '"') quoted = false;
          else cur += ch;
        } else if (ch === '"') quoted = true;
        else if (ch === ",") { cells.push(cur); cur = ""; }
        else cur += ch;
      }
      cells.push(cur);
      return cells.map((cell) => (cell.trim() !== "" && Number.isFinite(Number(cell)) ? Number(cell) : cell.trim()));
    });
}

// ---------- make sense of the table ----------

/** A column heading that is a time of day, as "HH:MM", or null. Headings come as "5시30분", "05:30", or a spreadsheet time. */
function slotOf(heading) {
  if (typeof heading === "number") {
    if (!(heading >= 0 && heading < 1.5)) return null; // a spreadsheet stores a time as a fraction of a day
    const minutes = Math.round((heading % 1) * 24 * 60);
    return `${String(Math.floor(minutes / 60) % 24).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
  }
  const text = String(heading ?? "").replace(/\s/g, "");
  const parts = /^(\d{1,2})시(\d{1,2})분?$/.exec(text) || /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(text);
  return parts ? `${String(Number(parts[1]) % 24).padStart(2, "0")}:${parts[2].padStart(2, "0")}` : null;
}

const DAYS = [
  [/평일/, "weekday"],
  [/토/, "saturday"],
  [/일|공휴/, "sunday"],
];

function toTable(rows) {
  // The heading row is the first one with a station column and several time columns.
  const headAt = rows.findIndex((row) => row.filter((cell) => slotOf(cell)).length >= 10 && row.some((cell) => /역/.test(String(cell ?? ""))));
  if (headAt < 0) throw new Error(`could not find the heading row. The first row reads: ${JSON.stringify((rows[0] ?? []).slice(0, 10))}`);
  const head = rows[headAt].map((cell) => (typeof cell === "string" ? cell.replace(/\s/g, "") : cell));
  const find = (pattern) => head.findIndex((cell) => typeof cell === "string" && pattern.test(cell));
  const column = { day: find(/요일/), line: find(/호선/), code: find(/역번호/), station: find(/역명|출발역|^역$/), direction: find(/상하|구분$|방향/) };
  if (column.direction === column.day) column.direction = head.findIndex((cell, i) => i !== column.day && typeof cell === "string" && /상하|방향|구분/.test(cell));
  const missing = Object.entries(column).filter(([, at]) => at < 0).map(([name]) => name);
  if (missing.length) throw new Error(`could not find these columns: ${missing.join(", ")}. The headings are: ${JSON.stringify(head.slice(0, 10))}`);
  const slotColumns = head.map((cell, at) => ({ at, slot: slotOf(rows[headAt][at]) })).filter((each) => each.slot);

  const table = [];
  for (const row of rows.slice(headAt + 1)) {
    const day = DAYS.find(([pattern]) => pattern.test(String(row[column.day] ?? "")))?.[1];
    const line = Number(/\d+/.exec(String(row[column.line] ?? ""))?.[0]);
    const station = String(row[column.station] ?? "").trim();
    const direction = String(row[column.direction] ?? "").trim();
    if (!day || !(line >= 1 && line <= 9) || !station || !direction) continue;
    // One decimal place is all the figures are good for. An empty cell means no trains in that half hour.
    const values = slotColumns.map(({ at }) => (typeof row[at] === "number" ? Math.round(row[at] * 10) / 10 : null));
    table.push([day, line, String(row[column.code] ?? "").trim(), station, direction, values]);
  }
  return { slots: slotColumns.map((each) => each.slot), table };
}

// ---------- main ----------

async function main() {
  const page = await fetch(PAGE, { headers: BROWSER, signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!page.ok) throw new Error(`the dataset page returned ${page.status}`);
  const files = listFiles(await page.text());
  if (files.length === 0) throw new Error("no files are listed on the dataset page");
  const file = files[0];
  console.log(`Newest file: ${file.name}`);

  // The file changes a few times a year. If this one is already saved there is nothing to do.
  const saved = await readFile(OUT, "utf8").then(JSON.parse).catch(() => null);
  if (saved?.file === file.name && !process.env.CONGESTION_FORCE) {
    console.log("Already saved. Nothing to do.");
    return;
  }

  const buffer = await download(file);
  console.log(`Downloaded ${buffer.length} bytes`);
  // Go by what the file is, not what it is called: a zip starts with "PK".
  const rows = buffer[0] === 0x50 && buffer[1] === 0x4b ? readXlsx(buffer) : readCsv(buffer);
  const { slots, table } = toTable(rows);
  if (table.length < 100 || slots.length < 20) {
    throw new Error(`the file gave only ${table.length} rows and ${slots.length} time columns. It starts: ${JSON.stringify(buffer.subarray(0, 120).toString("utf8"))}`);
  }

  const summary = {
    generated_at: new Date().toISOString(),
    source: "Seoul Metro, subway congestion by station and half hour, from Seoul Open Data Plaza",
    file: file.name,
    as_of: `${file.date.slice(0, 4)}-${file.date.slice(4, 6)}-${file.date.slice(6)}`,
    // 34 means every seat is taken. 100 is the number of people a car is built to carry.
    unit: "percent of capacity",
    slots, // the start of each half hour, "HH:MM"
    // Each row: day (weekday, saturday or sunday), line number, station number, station name, direction, one figure per slot.
    rows: table,
  };
  await mkdir(path.dirname(OUT), { recursive: true });
  await writeFile(OUT, JSON.stringify(summary) + "\n");

  const lines = [...new Set(table.map((row) => row[1]))].sort((a, b) => a - b);
  const stations = new Set(table.map((row) => `${row[1]}|${row[3]}`)).size;
  const peak = table.reduce((best, row) => {
    const top = Math.max(...row[5].filter((value) => value !== null));
    return top > best.value ? { value: top, row } : best;
  }, { value: 0, row: null });
  note("notice", `${file.name}: ${table.length} rows, ${stations} stations on lines ${lines.join(", ")}, ${slots[0]} to ${slots.at(-1)}. Fullest: ${peak.row?.[3]} ${peak.row?.[4]} (${peak.row?.[0]}) at ${peak.value}%`);
}

main().catch((err) => {
  note("error", err.message);
  process.exit(1);
});
