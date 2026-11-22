#!/usr/bin/env node
// Collects subway ridership for every station from the Seoul Open Data Plaza.
//
//   node collect-stations.mjs
//
// Each run asks the city for three things and rewrites data/stations.json,
// which is the only station file the website reads:
//   - boardings and exits for each hour, as monthly totals, for the last 12 months
//   - boardings and exits for each day, for the last 8 weeks
//   - the English name of every station
//   - where every station is
// The city keeps this history itself, so nothing else is stored here and a
// failed run loses nothing: the next run asks again.
// Needs Node 18 or newer. No dependencies.

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(ROOT, "data", "stations.json");
const BASE = process.env.SEOUL_API_BASE || "http://openapi.seoul.go.kr:8088";
const KEY = process.env.SEOUL_API_KEY;

const CONCURRENCY = 4; // requests at the same time
const TIMEOUT_MS = 20000;
const ATTEMPTS = 3;
const PAGE = 1000; // the most rows the API returns for one request
const MONTHS = 12;
const DAYS = 56; // 8 weeks, so each weekday is averaged over 8 days
const MIN_STATIONS = 300; // fewer than this means the response is not what we expect

const OK = "INFO-000";
const NO_DATA = "INFO-200";

// ---------- dates, all in Seoul time ----------

// A Date whose UTC fields read as the Seoul calendar.
const seoulNow = () => new Date(Date.now() + 9 * 3600 * 1000);
const pad = (n) => String(n).padStart(2, "0");

/** The months before this one, newest first, as "YYYYMM". */
function monthsBefore(now, count) {
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1 - i, 1));
    return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}`;
  });
}

/** The days before today, newest first, as "YYYYMMDD", starting `skip` days back. */
function daysBefore(now, count, skip) {
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - skip - i));
    return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;
  });
}

const daysInMonth = (yyyymm) => new Date(Date.UTC(Number(yyyymm.slice(0, 4)), Number(yyyymm.slice(4, 6)), 0)).getUTCDate();

// Monday = 0, to match weekly.json.
function weekday(yyyymmdd) {
  const d = new Date(Date.UTC(Number(yyyymmdd.slice(0, 4)), Number(yyyymmdd.slice(4, 6)) - 1, Number(yyyymmdd.slice(6, 8))));
  return (d.getUTCDay() + 6) % 7;
}

const dashed = (s) => (s.length === 6 ? `${s.slice(0, 4)}-${s.slice(4)}` : `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6)}`);

// ---------- API ----------

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// The key is part of the URL, so the URL is never printed.
async function fetchPage(service, start, end, tail) {
  const url = `${BASE}/${KEY}/json/${service}/${start}/${end}/${tail}`;
  let last = { ok: false, code: "NETWORK", message: "no response" };
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    if (attempt > 1) await sleep(800 * attempt);
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
      const text = await res.text();
      let json;
      try {
        json = JSON.parse(text);
      } catch {
        last = { ok: false, code: `HTTP-${res.status}`, message: "response was not JSON" };
        continue;
      }
      const body = json[service] || json;
      const result = body.RESULT || json.RESULT || {};
      const code = result.CODE || result["RESULT.CODE"] || "";
      const message = result.MESSAGE || result["RESULT.MESSAGE"] || "";
      if (code === NO_DATA) return { ok: true, rows: [], total: 0 };
      if (code === OK && Array.isArray(body.row)) {
        return { ok: true, rows: body.row, total: Number(body.list_total_count) || body.row.length };
      }
      last = { ok: false, code: code || "SHAPE", message: message || `unexpected fields: ${Object.keys(body).slice(0, 8).join(", ")}` };
      // A wrong key or a malformed request will not get better on a second try.
      if (/^(INFO-100|ERROR-3)/.test(code)) return last;
    } catch (err) {
      last = { ok: false, code: "NETWORK", message: err.name === "TimeoutError" ? "timed out" : "request failed" };
    }
  }
  return last;
}

/** Every row for one request, following pages when there are more than 1,000. */
async function fetchRows(service, tail = "") {
  const rows = [];
  for (let start = 1; ; start += PAGE) {
    const page = await fetchPage(service, start, start + PAGE - 1, tail);
    if (!page.ok) return page;
    rows.push(...page.rows);
    if (page.rows.length === 0 || rows.length >= page.total) return { ok: true, rows };
  }
}

async function pool(items, task) {
  const results = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await task(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, items.length) }, worker));
  return results;
}

// ---------- reading rows ----------

// "잠실(송파구청)" and "잠실" are the same station; the part in brackets is a second name
// that the city sometimes changes, so stations are matched without it.
const baseName = (name) => name.replace(/\s*\(.*?\)\s*/g, "").trim();
const keyOf = (line, station) => `${line}|${baseName(station)}`;

/** One row of CardSubwayTime: a station on a line, with a month's total for each hour. */
function readHourly(row) {
  const line = String(row.SBWY_ROUT_LN_NM ?? "").trim();
  const station = String(row.STTN ?? "").trim();
  const on = [];
  const off = [];
  for (let h = 0; h < 24; h++) {
    on.push(Number(row[`HR_${h}_GET_ON_NOPE`]));
    off.push(Number(row[`HR_${h}_GET_OFF_NOPE`]));
  }
  const valid = line && station && [...on, ...off].every(Number.isFinite);
  return valid ? { line, station, on, off } : null;
}

/** One row of CardSubwayStatsNew: a station on a line, with one day's totals. */
function readDaily(row) {
  const line = String(row.SBWY_ROUT_LN_NM ?? "").trim();
  const station = String(row.SBWY_STNS_NM ?? "").trim();
  const on = Number(row.GTON_TNOPE);
  const off = Number(row.GTOFF_TNOPE);
  return line && station && Number.isFinite(on) && Number.isFinite(off) ? { line, station, total: on + off } : null;
}

const sum = (list) => list.reduce((total, value) => total + value, 0);

// "4.19민주묘지" and "4·19민주묘지" are the same name with different punctuation.
const plain = (name) => name.replace(/[\s.·ㆍ]/g, "");

/** Finds a station's English name, allowing for the small differences between the two lists. */
function labelFinder(nameRows) {
  const names = new Map();
  for (const row of nameRows) {
    const korean = String(row.STATION_NM ?? "").trim();
    const english = String(row.STATION_NM_ENG ?? "").trim();
    if (!korean || !english) continue;
    for (const name of [korean, baseName(korean)].map(plain)) if (!names.has(name)) names.set(name, english);
  }
  return (station) => {
    const base = baseName(station);
    for (const name of [station, base, base.replace(/역$/, ""), `${base}역`].map(plain)) {
      if (names.has(name)) return names.get(name);
    }
    return null;
  };
}

async function previousFile() {
  if (!existsSync(OUT)) return null;
  try {
    return JSON.parse(await readFile(OUT, "utf8"));
  } catch {
    return null;
  }
}

/**
 * Where each station is, by name: { "서울역": [["1호선", 37.55623, 126.97214], ...] }.
 * A station has one entry for each line, a short walk apart. Two different
 * stations can share a name, which is why the line is kept.
 */
function readCoordinates(rows) {
  const coordinates = {};
  for (const row of rows) {
    const name = baseName(String(row.BLDN_NM ?? "").trim());
    const route = String(row.ROUTE ?? "").trim();
    const lat = Number(row.LAT);
    const lng = Number(row.LOT);
    // A few rows have no position yet and say 0.
    if (!name || !(lat > 30 && lat < 40 && lng > 120 && lng < 135)) continue;
    (coordinates[name] ||= []).push([route, Math.round(lat * 1e5) / 1e5, Math.round(lng * 1e5) / 1e5]);
  }
  return coordinates;
}

// ---------- main ----------

function fail(message) {
  console.error(`Station collector stopped: ${message}`);
  if (process.env.GITHUB_ACTIONS) console.log(`::error title=Station collector::${message}`);
  process.exit(1);
}

async function main() {
  if (!KEY) fail("SEOUL_API_KEY is not set. Get a key from data.seoul.go.kr and set it as an environment variable.");

  const now = seoulNow();
  // One spare month and a few spare days, because the newest ones are loaded late.
  const monthList = monthsBefore(now, MONTHS + 1);
  const dayList = daysBefore(now, DAYS + 4, 2);
  console.log(`Asking for ${monthList.length} months, ${dayList.length} days and the station names`);

  const monthResults = await pool(monthList, (month) => fetchRows("CardSubwayTime", month));
  const dayResults = await pool(dayList, (day) => fetchRows("CardSubwayStatsNew", day));
  const nameResult = await fetchRows("SearchSTNBySubwayLineInfo");
  const placeResult = await fetchRows("subwayStationMaster");

  // ----- months -----
  const months = []; // newest first
  monthResults.forEach((result, i) => {
    if (!result.ok) return console.error(`  failed: month ${monthList[i]} (${result.code}) ${result.message}`);
    const rows = result.rows.map(readHourly).filter(Boolean);
    if (result.rows.length > 0 && rows.length === 0) {
      return console.error(`  failed: month ${monthList[i]} (SHAPE) unexpected fields: ${Object.keys(result.rows[0]).slice(0, 6).join(", ")}`);
    }
    if (rows.length > 0) months.push({ month: monthList[i], rows });
  });
  if (months.length === 0) {
    const first = monthResults.find((r) => !r.ok);
    fail(first ? `no monthly data (${first.code}) ${first.message}` : "the city returned no monthly data");
  }
  months.splice(MONTHS);
  const latest = months[0];
  if (latest.rows.length < MIN_STATIONS) fail(`only ${latest.rows.length} stations in ${latest.month}, expected about 600`);
  const monthOrder = months.map((m) => m.month).reverse(); // oldest first, for charts

  // ----- days -----
  const days = []; // newest first
  dayResults.forEach((result, i) => {
    if (!result.ok) return console.error(`  failed: day ${dayList[i]} (${result.code}) ${result.message}`);
    const rows = result.rows.map(readDaily).filter(Boolean);
    if (rows.length > 0) days.push({ day: dayList[i], rows });
  });
  days.splice(DAYS);

  // ----- names -----
  let findLabel;
  if (nameResult.ok && nameResult.rows.length > 0) {
    findLabel = labelFinder(nameResult.rows);
  } else {
    console.error(`  failed: station names (${nameResult.code || "NO-DATA"}) ${nameResult.message || ""}. Keeping the names saved last time.`);
    const old = new Map(((await previousFile())?.stations ?? []).filter((s) => s.label).map((s) => [s.station, s.label]));
    findLabel = (station) => old.get(station) ?? null;
  }

  // ----- positions -----
  let coordinates;
  if (placeResult.ok && placeResult.rows.length > 0) {
    coordinates = readCoordinates(placeResult.rows);
  } else {
    console.error(`  failed: station positions (${placeResult.code || "NO-DATA"}) ${placeResult.message || ""}. Keeping the positions saved last time.`);
    coordinates = (await previousFile())?.coordinates ?? {};
  }

  // ----- put it together -----
  const monthlyTotals = new Map(); // key -> Map(month -> boardings + exits)
  for (const { month, rows } of months) {
    for (const row of rows) {
      const key = keyOf(row.line, row.station);
      if (!monthlyTotals.has(key)) monthlyTotals.set(key, new Map());
      monthlyTotals.get(key).set(month, sum(row.on) + sum(row.off));
    }
  }

  const weekdayTotals = new Map(); // key -> { total[7], count[7] }
  for (const { day, rows } of days) {
    const w = weekday(day);
    for (const row of rows) {
      const key = keyOf(row.line, row.station);
      if (!weekdayTotals.has(key)) weekdayTotals.set(key, { total: new Array(7).fill(0), count: new Array(7).fill(0) });
      const entry = weekdayTotals.get(key);
      entry.total[w] += row.total;
      entry.count[w] += 1;
    }
  }

  const monthDays = daysInMonth(latest.month);
  const stations = latest.rows
    .map((row) => {
      const key = keyOf(row.line, row.station);
      const byWeekday = weekdayTotals.get(key);
      return {
        line: row.line,
        station: row.station,
        label: findLabel(row.station),
        // average for one day of the latest month, for each clock hour from 00 to 23
        on: row.on.map((total) => Math.round(total / monthDays)),
        off: row.off.map((total) => Math.round(total / monthDays)),
        // boardings + exits for each month in `months`, or null when the station has no row
        monthly: monthOrder.map((month) => monthlyTotals.get(key)?.get(month) ?? null),
        // average boardings + exits for each weekday, Monday first
        weekdays: byWeekday ? byWeekday.total.map((total, w) => (byWeekday.count[w] ? Math.round(total / byWeekday.count[w]) : null)) : null,
      };
    })
    .sort((a, b) => a.line.localeCompare(b.line, "ko", { numeric: true }) || a.station.localeCompare(b.station, "ko"));

  const summary = {
    generated_at: new Date().toISOString(),
    source: "Seoul Open Data Plaza: subway boardings and exits by station and hour, and by station and day",
    timezone: "Asia/Seoul",
    month: dashed(latest.month),
    month_days: monthDays,
    months: monthOrder.map(dashed),
    days: days.length ? { from: dashed(days.at(-1).day), to: dashed(days[0].day), count: days.length } : null,
    stations,
    coordinates,
  };
  await mkdir(path.dirname(OUT), { recursive: true });
  await writeFile(OUT, JSON.stringify(summary) + "\n");

  // ----- report -----
  const lines = new Map();
  for (const s of stations) lines.set(s.line, (lines.get(s.line) || 0) + 1);
  const named = stations.filter((s) => s.label).length;
  const withWeekdays = stations.filter((s) => s.weekdays).length;
  const hasPosition = (s) => [s.station, baseName(s.station), baseName(s.station).replace(/역$/, ""), `${baseName(s.station)}역`].some((name) => coordinates[name]);
  const unplaced = [...new Set(stations.filter((s) => !hasPosition(s)).map((s) => s.station))];
  const report =
    `${stations.length} station rows on ${lines.size} lines for ${summary.month}; ` +
    `${months.length} months; ${days.length} days${summary.days ? ` (${summary.days.from} to ${summary.days.to})` : ""}; ` +
    `${named} with an English name; ${withWeekdays} with weekday figures; ${stations.length - stations.filter((s) => !hasPosition(s)).length} with a position`;
  console.log(report);
  console.log(`Lines: ${[...lines].map(([line, count]) => `${line} ${count}`).join(", ")}`);
  const unnamed = stations.filter((s) => !s.label).map((s) => s.station);
  if (unnamed.length) {
    const unique = [...new Set(unnamed)];
    console.log(`No English name found for ${unique.length}: ${unique.slice(0, 40).join(", ")}${unique.length > 40 ? ", and more" : ""}`);
  }
  if (unplaced.length) console.log(`No position found for ${unplaced.length}: ${unplaced.slice(0, 40).join(", ")}${unplaced.length > 40 ? ", and more" : ""}`);
  if (process.env.GITHUB_ACTIONS) console.log(`::notice title=Station ridership::${report}`);
  if (days.length < DAYS / 2) console.error(`Only ${days.length} of ${DAYS} days came back, so the weekday figures are thin.`);
}

main().catch((err) => fail(err.message));
