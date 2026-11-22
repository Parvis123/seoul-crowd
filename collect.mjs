#!/usr/bin/env node
// Collects real-time crowd readings for a list of Seoul places.
//
//   node collect.mjs                      uses places.json
//   node collect.mjs --places all.txt     uses another list (JSON, or one name per line)
//
// Each run appends new readings to data/readings-YYYY-MM.csv and rebuilds
// data/weekly.json, which is the only file the website needs to read.
// Needs Node 18 or newer. No dependencies.

import { readFile, writeFile, appendFile, mkdir, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(ROOT, "data");
const BASE = process.env.SEOUL_API_BASE || "http://openapi.seoul.go.kr:8088";
const KEY = process.env.SEOUL_API_KEY;

const CONCURRENCY = 4; // places fetched at the same time
const TIMEOUT_MS = 15000;
const ATTEMPTS = 2;
const COLUMNS = ["collected_at", "ppltn_time", "area_cd", "area_nm", "congest_lvl", "ppltn_min", "ppltn_max"];
const QUOTA_CODE = "ERROR-337"; // daily call limit reached for this key

// ---------- place list ----------

async function loadPlaces(file) {
  const text = await readFile(file, "utf8");
  if (file.endsWith(".txt")) {
    return text.split(/\r?\n/).map((s) => s.trim()).filter((s) => s && !s.startsWith("#")).map((name) => ({ name, label: name }));
  }
  const json = JSON.parse(text);
  const list = Array.isArray(json) ? json : json.places;
  if (!Array.isArray(list) || list.length === 0) throw new Error(`No places found in ${file}`);
  return list.map((p) => (typeof p === "string" ? { name: p, label: p } : { name: p.name, label: p.label || p.name }));
}

// ---------- API ----------

function readResponse(json) {
  const result = json.RESULT || {};
  const code = result["RESULT.CODE"] || result.CODE || json.CODE || "";
  const message = result["RESULT.MESSAGE"] || result.MESSAGE || json.MESSAGE || "";
  let list = json["SeoulRtd.citydata_ppltn"];
  if (list && !Array.isArray(list) && Array.isArray(list.row)) list = list.row;
  return { code, message, item: Array.isArray(list) ? list[0] : undefined };
}

function toRow(item) {
  const row = {
    collected_at: new Date().toISOString(),
    ppltn_time: String(item.PPLTN_TIME || ""),
    area_cd: String(item.AREA_CD || ""),
    area_nm: String(item.AREA_NM || ""),
    congest_lvl: String(item.AREA_CONGEST_LVL || ""),
    ppltn_min: Number(item.AREA_PPLTN_MIN),
    ppltn_max: Number(item.AREA_PPLTN_MAX),
  };
  const valid = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(row.ppltn_time) && row.area_nm && Number.isFinite(row.ppltn_min) && Number.isFinite(row.ppltn_max);
  return valid ? row : null;
}

// The key is part of the URL, so the URL is never printed.
async function fetchPlace(name) {
  const url = `${BASE}/${KEY}/json/citydata_ppltn/1/5/${encodeURIComponent(name)}`;
  let last = { ok: false, code: "NETWORK", message: "no response" };
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
      const body = await res.text();
      let json;
      try {
        json = JSON.parse(body);
      } catch {
        last = { ok: false, code: `HTTP-${res.status}`, message: "response was not JSON" };
        continue;
      }
      const { code, message, item } = readResponse(json);
      if (!item) return { ok: false, code: code || "NO-DATA", message: message || "no place in response" };
      const row = toRow(item);
      if (!row) return { ok: false, code: "SHAPE", message: `unexpected fields: ${Object.keys(item).slice(0, 12).join(", ")}` };
      return { ok: true, row };
    } catch (err) {
      last = { ok: false, code: "NETWORK", message: err.name === "TimeoutError" ? "timed out" : "request failed" };
    }
  }
  return last;
}

async function fetchAll(places) {
  const results = new Array(places.length);
  let next = 0;
  let quotaHit = false;
  async function worker() {
    while (next < places.length && !quotaHit) {
      const i = next++;
      results[i] = await fetchPlace(places[i].name);
      if (results[i].code === QUOTA_CODE) quotaHit = true;
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, places.length) }, worker));
  for (let i = 0; i < places.length; i++) results[i] ||= { ok: false, code: "SKIPPED", message: "daily call limit reached" };
  return { results, quotaHit };
}

// ---------- CSV ----------

function csvCell(value) {
  const s = String(value);
  return /[",\r\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
}

function parseCsvLine(line) {
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
  return cells;
}

async function readCsv(file) {
  if (!existsSync(file)) return [];
  const lines = (await readFile(file, "utf8")).split(/\r?\n/).filter(Boolean);
  const header = parseCsvLine(lines[0] || "");
  return lines.slice(1).map((line) => {
    const cells = parseCsvLine(line);
    return Object.fromEntries(header.map((h, i) => [h, cells[i] ?? ""]));
  });
}

async function saveRows(rows) {
  await mkdir(DATA_DIR, { recursive: true });
  const byMonth = new Map();
  for (const row of rows) {
    const month = row.ppltn_time.slice(0, 7);
    if (!byMonth.has(month)) byMonth.set(month, []);
    byMonth.get(month).push(row);
  }
  let saved = 0;
  let duplicates = 0;
  for (const [month, monthRows] of byMonth) {
    const file = path.join(DATA_DIR, `readings-${month}.csv`);
    const seen = new Set((await readCsv(file)).map((r) => `${r.area_nm}|${r.ppltn_time}`));
    const fresh = [];
    for (const row of monthRows) {
      const id = `${row.area_nm}|${row.ppltn_time}`;
      if (seen.has(id)) { duplicates++; continue; }
      seen.add(id);
      fresh.push(row);
    }
    if (fresh.length === 0) continue;
    const header = existsSync(file) ? "" : COLUMNS.join(",") + "\n";
    await appendFile(file, header + fresh.map((r) => COLUMNS.map((c) => csvCell(r[c])).join(",")).join("\n") + "\n");
    saved += fresh.length;
  }
  return { saved, duplicates };
}

// ---------- weekly summary for the website ----------

// ppltn_time is Seoul local time, so the weekday and hour are read straight from the text.
function dayAndHour(ppltnTime) {
  const [y, m, d] = ppltnTime.slice(0, 10).split("-").map(Number);
  const weekday = (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7; // Monday = 0
  return { weekday, hour: Number(ppltnTime.slice(11, 13)) };
}

async function buildWeekly(places) {
  const files = existsSync(DATA_DIR) ? (await readdir(DATA_DIR)).filter((f) => /^readings-\d{4}-\d{2}\.csv$/.test(f)).sort() : [];
  const byPlace = new Map();
  for (const file of files) {
    for (const r of await readCsv(path.join(DATA_DIR, file))) {
      const min = Number(r.ppltn_min);
      const max = Number(r.ppltn_max);
      if (!r.area_nm || !Number.isFinite(min) || !Number.isFinite(max)) continue;
      if (!byPlace.has(r.area_nm)) {
        byPlace.set(r.area_nm, {
          code: r.area_cd,
          readings: 0,
          first: r.ppltn_time,
          latest: null,
          sum: Array.from({ length: 7 }, () => new Array(24).fill(0)),
          count: Array.from({ length: 7 }, () => new Array(24).fill(0)),
        });
      }
      const p = byPlace.get(r.area_nm);
      const { weekday, hour } = dayAndHour(r.ppltn_time);
      if (!(hour >= 0 && hour < 24)) continue;
      p.sum[weekday][hour] += (min + max) / 2;
      p.count[weekday][hour] += 1;
      p.readings += 1;
      if (r.ppltn_time < p.first) p.first = r.ppltn_time;
      if (!p.latest || r.ppltn_time >= p.latest.time) p.latest = { time: r.ppltn_time, level: r.congest_lvl, min, max };
    }
  }
  const labels = new Map(places.map((p) => [p.name, p.label]));
  const summary = {
    generated_at: new Date().toISOString(),
    source: "Seoul Open Data Plaza, Seoul real-time city data",
    timezone: "Asia/Seoul",
    days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    places: [...byPlace.entries()].sort((a, b) => a[0].localeCompare(b[0], "ko")).map(([name, p]) => ({
      name,
      label: labels.get(name) || name,
      code: p.code,
      readings: p.readings,
      first_reading: p.first,
      latest: p.latest,
      // grid[weekday][hour] = average people, or null when there is no reading yet
      grid: p.sum.map((row, d) => row.map((total, h) => (p.count[d][h] ? Math.round(total / p.count[d][h]) : null))),
    })),
  };
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(path.join(DATA_DIR, "weekly.json"), JSON.stringify(summary) + "\n");
  return summary.places.length;
}

// ---------- main ----------

async function main() {
  const args = process.argv.slice(2);
  const flag = args.indexOf("--places");
  const placesFile = path.resolve(ROOT, flag >= 0 && args[flag + 1] ? args[flag + 1] : "places.json");

  if (!KEY) {
    console.error("SEOUL_API_KEY is not set. Get a key from data.seoul.go.kr and set it as an environment variable.");
    process.exit(1);
  }

  const places = await loadPlaces(placesFile);
  console.log(`Fetching ${places.length} place${places.length === 1 ? "" : "s"}`);

  const { results, quotaHit } = await fetchAll(places);
  const rows = [];
  let failed = 0;
  results.forEach((r, i) => {
    if (r.ok) rows.push(r.row);
    else { failed++; console.error(`  failed: ${places[i].name} (${r.code}) ${r.message}`); }
  });

  const { saved, duplicates } = await saveRows(rows);
  const summarised = await buildWeekly(places);
  console.log(`Saved ${saved} new reading${saved === 1 ? "" : "s"}, skipped ${duplicates} already stored, ${failed} failed`);
  console.log(`weekly.json now covers ${summarised} place${summarised === 1 ? "" : "s"}`);
  if (quotaHit) console.error("The daily call limit for this key was reached. Collect less often or ask the portal for a higher limit.");
  if (rows.length === 0) process.exit(1);
}

main().catch((err) => {
  console.error(`Collector stopped: ${err.message}`);
  process.exit(1);
});
