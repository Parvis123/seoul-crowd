import { type LatLng, kilometresBetween } from '@/model/geo'
import { Line, type LineId } from '@/model/line'

/** One stop on a line: the station's name as the station list writes it, and where its platform is. */
export type Stop = { name: string; at: LatLng; /** True for the stops of a loop that trains go round one way only. */ oneWay?: boolean }

/**
 * A line as the order of its stops: one path for the main run and one for each
 * branch. Stops along a path are in rising stop-number order, which on Lines 1
 * to 8 is the "down" direction (and the inner loop on Line 2).
 */
export type Route = { line: Line; paths: Stop[][]; /** True when the first path closes into a circle. */ circle: boolean }

/** One row of the station list: line, stop number, station name. */
export type RawStop = [line: string, code: string, station: string]

// How the station list names the lines this site shows. Lines it does not show are left out.
const LISTED_AS: Record<string, LineId> = {
  '01호선': '1',
  '02호선': '2',
  '03호선': '3',
  '04호선': '4',
  '05호선': '5',
  '06호선': '6',
  '07호선': '7',
  '08호선': '8',
  '09호선': '9',
  경의선: 'gj',
  수인분당선: 'sb',
  경춘선: 'gc',
  경강선: 'gg',
  공항철도: 'arex',
  우이신설경전철: 'ui',
  신림선: 'sl',
  서해선: 'sh',
}

/** A stop number taken apart: "P144-1" is prefix P, number 144, first stop of a spur. */
type NumberedStop = { code: string; prefix: string; number: number; spur: number | null; name: string }

function parse([, code, name]: RawStop): NumberedStop | null {
  const parts = /^([A-Z]*)(\d+)(?:-(\d+))?$/.exec(code)
  if (!parts) return null
  const [, prefix, digits, spur] = parts
  // The airport line fitted new stations in between old numbers: A042 comes after A04.
  const number = prefix === 'A' && digits.length === 3 ? Number(digits.slice(0, 2)) + Number(digits[2]) / 10 : Number(digits)
  return { code, prefix, number, spur: spur ? Number(spur) : null, name }
}

const inOrder = (stops: NumberedStop[]) => [...stops].sort((a, b) => a.number - b.number)

/**
 * The order of stops along a line. The stop numbers give most of it: a run of
 * numbers is a run of track, and "211-1, 211-2" is a spur leaving stop 211.
 * A few lines need telling how their runs join up.
 */
function pathsFor(line: LineId, stops: NumberedStop[]): NumberedStop[][] {
  const trunk = stops.filter((stop) => stop.spur === null)
  const run = (prefix: string, from = -Infinity, to = Infinity) =>
    inOrder(trunk.filter((stop) => stop.prefix === prefix && stop.number >= from && stop.number < to))
  const at = (code: string) => stops.filter((stop) => stop.code === code)
  const paths: NumberedStop[][] = []

  if (line === '2') {
    // A circle: the last stop runs on into the first.
    const circle = run('')
    paths.push([...circle, ...circle.slice(0, 1)])
  } else if (line === '6') {
    // Trains loop one way round the north-west end, 610 to 615, and pass 610 again before 616.
    const all = run('')
    const afterLoop = all.findIndex((stop) => stop.number === 616)
    paths.push(afterLoop > 0 ? [...all.slice(0, afterLoop), all[0], ...all.slice(afterLoop)] : all)
  } else if (line === 'gj') {
    // West of Gongdeok is numbered K312 up, east of Yongsan K110 up, and Hyochang Park (K826) sits between them.
    paths.push([...run('K', 300, 400).reverse(), ...at('K826'), ...run('K', 100, 200)])
    // Some trains leave the line at Gajwa for Seoul Station.
    paths.push([...at('K315'), ...run('P')])
  } else if (line === 'gc') {
    // Trains start from Cheongnyangni (P117) or from Kwangwoon University (P116), and meet at Sangbong (P120).
    paths.push(run('P', 117))
    paths.push([...at('P116'), ...at('P120')])
  } else {
    const prefixes = [...new Set(trunk.map((stop) => stop.prefix))]
    for (const prefix of prefixes) {
      const stretch = run(prefix)
      // Lines 1 and 5 number a branch P142, P143... where it leaves the plain numbers at 141.
      const junction = prefix === 'P' ? trunk.find((stop) => stop.prefix === '' && stop.number === stretch[0].number - 1) : undefined
      paths.push(junction ? [junction, ...stretch] : stretch)
    }
  }

  // Spurs: "234-1, 234-2" leave the line at stop 234.
  const spurs = new Map<string, NumberedStop[]>()
  for (const stop of stops.filter((each) => each.spur !== null)) {
    const base = stop.code.slice(0, stop.code.lastIndexOf('-'))
    spurs.set(base, [...(spurs.get(base) ?? []), stop])
  }
  for (const [base, spur] of spurs) paths.push([...at(base), ...spur.sort((a, b) => (a.spur as number) - (b.spur as number))])

  return paths
}

/** A gap this long between two stops means they were joined by mistake, so the line is cut there. */
const LONGEST_HOP_KM = 30

/**
 * Draws each line through its stations, in the order the station list numbers them.
 * `locate` says where a line's platform at a named station is, or null if unknown.
 */
export function buildRoutes(stops: readonly RawStop[], locate: (line: Line, station: string) => LatLng | null): Route[] {
  const byLine = new Map<LineId, NumberedStop[]>()
  for (const raw of stops) {
    const id = LISTED_AS[raw[0]]
    const stop = id && parse(raw)
    if (id && stop) byLine.set(id, [...(byLine.get(id) ?? []), stop])
  }

  return Line.all.flatMap((line) => {
    const paths: Stop[][] = []
    for (const path of pathsFor(line.id, byLine.get(line.id) ?? [])) {
      let piece: Stop[] = []
      for (const stop of path) {
        const here = locate(line, stop.name)
        if (!here) continue // a stop with no known position is passed straight through
        if (piece.length && kilometresBetween(piece[piece.length - 1].at, here) > LONGEST_HOP_KM) {
          if (piece.length > 1) paths.push(piece)
          piece = []
        }
        // Line 6 trains go one way round the loop at its north-west end: 610 to 615, and 610 again.
        piece.push({ name: stop.name, at: here, oneWay: line.id === '6' && stop.number >= 610 && stop.number <= 615 })
      }
      if (piece.length > 1) paths.push(piece)
    }
    return paths.length ? [{ line, paths, circle: line.id === '2' }] : []
  })
}
