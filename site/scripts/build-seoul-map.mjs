#!/usr/bin/env node
// Builds src/data/seoul-map.json: Seoul's 25 districts and the line of the Han
// river, for the map on the front page. Run it again only if the source changes:
//
//   node scripts/build-seoul-map.mjs
//
// Source: Statistics Korea (KOSTAT) census boundaries, 2013, as simplified
// TopoJSON in github.com/southkorea/seoul-maps.

import { writeFile } from 'node:fs/promises'

const SOURCE =
  'https://raw.githubusercontent.com/southkorea/seoul-maps/master/kostat/2013/json/seoul_municipalities_topo_simple.json'
const OUT = new URL('../src/data/seoul-map.json', import.meta.url)

// The districts on each bank. Where one from each list meets, the boundary runs down the middle of the river.
const NORTH_BANK = new Set(['마포구', '용산구', '성동구', '광진구'])
const SOUTH_BANK = new Set(['강서구', '양천구', '영등포구', '동작구', '서초구', '강남구', '송파구', '강동구'])

// The river beyond the city limits, by eye, so it does not stop dead at the edge. [lng, lat]
const UPSTREAM = [[127.135, 37.566], [127.158, 37.577], [127.19, 37.578], [127.22, 37.565], [127.25, 37.545]]
const DOWNSTREAM = [[126.826, 37.588], [126.808, 37.597], [126.78, 37.608], [126.72, 37.63]]

const round = (n) => Math.round(n * 1e4) / 1e4

const topo = await (await fetch(SOURCE)).json()
const { scale, translate } = topo.transform

// TopoJSON stores each arc as steps from the point before.
const arcs = topo.arcs.map((arc) => {
  let x = 0
  let y = 0
  return arc.map(([dx, dy]) => {
    x += dx
    y += dy
    return [round(x * scale[0] + translate[0]), round(y * scale[1] + translate[1])]
  })
})
// A negative index means the arc is walked backwards.
const arcPoints = (index) => (index >= 0 ? arcs[index] : [...arcs[~index]].reverse())
const ringPoints = (ring) => ring.flatMap((index, i) => (i === 0 ? arcPoints(index) : arcPoints(index).slice(1)))

const users = new Map() // arc -> the districts on either side
const districts = topo.objects.seoul_municipalities_geo.geometries.map((geometry) => {
  const polygons = geometry.type === 'Polygon' ? [geometry.arcs] : geometry.arcs
  for (const index of polygons.flat(2)) {
    const arc = index >= 0 ? index : ~index
    users.set(arc, [...(users.get(arc) ?? []), geometry.properties.name])
  }
  return {
    name: geometry.properties.name,
    en: geometry.properties.name_eng,
    rings: polygons.flatMap((polygon) => polygon.map(ringPoints)),
  }
})

// Chain the mid-river boundary arcs into one line, west to east.
let pieces = [...users]
  .filter(([, names]) => names.length === 2 && names.some((n) => NORTH_BANK.has(n)) && names.some((n) => SOUTH_BANK.has(n)))
  .map(([arc]) => arcs[arc])
const same = (a, b) => a[0] === b[0] && a[1] === b[1]
const westmost = pieces.flatMap((piece) => [piece[0], piece.at(-1)]).reduce((a, b) => (b[0] < a[0] ? b : a))
let river = [westmost]
while (pieces.length) {
  const end = river.at(-1)
  const next = pieces.find((piece) => same(piece[0], end) || same(piece.at(-1), end))
  if (!next) throw new Error('The river boundary does not form one line')
  pieces = pieces.filter((piece) => piece !== next)
  river.push(...(same(next[0], end) ? next : [...next].reverse()).slice(1))
}
river = [...[...DOWNSTREAM].reverse(), ...river, ...UPSTREAM]

await writeFile(
  OUT,
  JSON.stringify({
    source: 'Statistics Korea (KOSTAT) census boundaries, 2013, via github.com/southkorea/seoul-maps',
    districts,
    river,
  }) + '\n',
)
console.log(`${districts.length} districts, ${districts.reduce((n, d) => n + d.rings.flat().length, 0)} points, river ${river.length} points`)
