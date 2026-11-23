import { describe, expect, it } from 'vitest'

import { Network } from '@/model/network'
import { TrainCrowding } from '@/model/crowding'
import type { LatLng } from '@/model/geo'
import { Router, TRANSFER_MINUTES, WAIT_MINUTES } from '@/model/journey'
import { Line } from '@/model/line'
import { Measure } from '@/model/measure'
import { CrowdLevel, PlaceDirectory, type RawPlaceFile } from '@/model/place'
import { type RawStop, buildRoutes } from '@/model/route'
import { Ridership } from '@/model/ridership'
import { type RawStationFile, StationDirectory } from '@/model/station'
import { fold, initials, isInitials } from '@/model/text'

// ---------- small made-up files in the collector's shape ----------

const hours = (at: number, value: number) => Array.from({ length: 24 }, (_, h) => (h === at ? value : 10))

const row = (line: string, station: string, label: string, peak: number, value: number) => ({
  line,
  station,
  label,
  on: hours(peak, value),
  off: hours(peak, value / 2),
  monthly: [1000, null],
  weekdays: [1, 2, 3, 4, 5, 6, 7],
})

const stationFile: RawStationFile = {
  generated_at: '',
  month: '2026-10',
  month_days: 31,
  months: ['2026-09', '2026-10'],
  days: { from: '2026-09-25', to: '2026-11-19', count: 56 },
  stations: [
    row('2호선', '홍대입구', 'Hongik Univ.', 18, 9000),
    row('경의선', '홍대입구', 'Hongik Univ.', 18, 500),
    row('공항철도 1호선', '홍대입구', 'Hongik Univ.', 18, 2000),
    row('1호선', '서울역', 'Seoul Station', 18, 8000),
    row('경부선', '서울역', 'Seoul Station', 21, 900),
    row('2호선', '신촌', 'Sinchon', 17, 4000),
    row('경의선', '신촌', 'Sinchon', 17, 100),
    row('4호선', '총신대입구(이수)', 'Chongshin Univ.', 8, 2000),
    row('7호선', '이수', 'Isu', 18, 1500),
    row('경원선', '왕십리(성동구청)', 'Wangsimni', 18, 700),
    row('4호선', '명동', 'Myeong-dong', 18, 4000),
    // Hapjeong is the bigger station, but most people there walk in through the Line 2 gates.
    row('2호선', '합정', 'Hapjeong', 18, 6000),
    row('6호선', '합정', 'Hapjeong', 18, 2000),
    row('5호선', '공덕', 'Gongdeok', 18, 2500),
    row('6호선', '공덕', 'Gongdeok', 18, 3000),
    // Every tap at Yeonsinnae is filed under Line 3, though Line 6 stops there too.
    row('3호선', '연신내', 'Yeonsinnae', 18, 7000),
    { ...row('7호선', '상동', 'Sang-dong', 0, 0), on: new Array(24).fill(0), off: new Array(24).fill(0) },
  ],
  coordinates: {
    홍대입구: [['2호선', 37.5572, 126.9245], ['경의중앙선', 37.558, 126.9254]],
    신촌: [['2호선', 37.5551, 126.9369], ['경의중앙선', 37.5597, 126.9426]],
    서울역: [['1호선', 37.5562, 126.9721]],
    연신내: [['3호선', 37.6192, 126.921], ['6호선', 37.6186, 126.9206], ['수도권 광역급행철도', 37.6188, 126.9213]],
  },
}

const place = (name: string, label: string, level: string, people: number, time = '2026-11-22 21:00') => ({
  name,
  label,
  code: `POI-${label}`,
  readings: 1,
  first_reading: time,
  latest: { time, level, min: people - 500, max: people + 500 },
  grid: Array.from({ length: 7 }, () => new Array(24).fill(null)),
})

const placeFile: RawPlaceFile = {
  generated_at: '',
  places: [
    place('홍대입구역(2호선)', 'Hongik University station(Line 2)', '약간 붐빔', 18000),
    place('신촌·이대역', 'Sinchon·Ewha Womans University station', '여유', 30000),
    place('서울역', 'Seoul station', '보통', 9000),
    place('서울숲공원', 'Seoul Forest', '붐빔', 3000),
    place('남산공원', 'Namsan Park', '여유', 2000, '2026-11-22 18:00'), // a stale reading
  ],
}

const stations = StationDirectory.fromFile(stationFile)
const places = PlaceDirectory.fromFile(placeFile)
const network = new Network(places, stations)

// ---------- tests ----------

describe('text', () => {
  it('folds names so spelling differences do not matter', () => {
    expect(fold('Myeong-dong')).toBe(fold('myeongdong'))
    expect(fold('Seoul National University station')).toBe(fold('Seoul Nat`l Univ.'))
    expect(fold('강남역')).toBe('강남')
  })

  it('reads Korean first consonants', () => {
    expect(initials('홍대입구')).toBe('ㅎㄷㅇㄱ')
    expect(isInitials('ㅎㄷ')).toBe(true)
    expect(isInitials('홍대')).toBe(false)
  })
})

describe('Ridership', () => {
  const ridership = new Ridership(hours(18, 100), hours(8, 300), [5, 9, 1, 1, 1, 1, 1], [null, 40])

  it('answers for one hour or the whole day', () => {
    expect(ridership.boardings(18)).toBe(100)
    expect(ridership.total(8)).toBe(310)
    expect(ridership.total()).toBe(100 + 23 * 10 + 300 + 23 * 10)
  })

  it('finds the busiest hour, boarding hour and weekday', () => {
    expect(ridership.busiestHour).toBe(8)
    expect(ridership.busiestBoardingHour).toBe(18)
    expect(ridership.busiestWeekday).toBe(1)
  })

  it('adds up, keeping a month empty only when every part is', () => {
    const both = Ridership.combine([ridership, new Ridership(hours(18, 1), hours(18, 1), null, [null, 2])])
    expect(both.boardings(18)).toBe(101)
    expect(both.monthly).toEqual([null, 42])
    expect(both.weekdays).toEqual([5, 9, 1, 1, 1, 1, 1])
  })
})

describe('StationDirectory', () => {
  it('makes one station of several lines and adds their gates together', () => {
    const hongdae = stations.get('홍대입구')!
    expect(hongdae.lines.map((line) => line.id)).toEqual(['2', 'gj', 'arex'])
    expect(hongdae.ridership.boardings(18)).toBe(11500)
    expect(hongdae.mainLine.id).toBe('2')
  })

  it('files railway names under the line passengers know', () => {
    expect(stations.get('서울역')!.lines.map((line) => line.id)).toEqual(['1'])
    // Wangsimni is on the Gyeongwon railway but served by Gyeongui-Jungang trains.
    expect(stations.get('왕십리')!.lines.map((line) => line.id)).toEqual(['gj'])
  })

  it('keeps two stations with one name apart, and joins one station with two names', () => {
    expect(stations.get('신촌')!.lines.map((line) => line.id)).toEqual(['2'])
    expect(stations.get('신촌@gj')!.name('en')).toBe('Sinchon (Gyeongui-Jungang)')
    expect(stations.get('총신대입구')!.lines.map((line) => line.id)).toEqual(['4', '7'])
    expect(stations.get('이수')).toBeUndefined()
  })

  it('leaves out rows with no riders', () => {
    expect(stations.get('상동')).toBeUndefined()
  })

  it('places a station from the entries for its own lines', () => {
    expect(stations.get('신촌')!.location).toEqual({ lat: 37.5551, lng: 126.9369 })
    expect(stations.get('신촌@gj')!.location).toEqual({ lat: 37.5597, lng: 126.9426 })
    expect(stations.get('명동')!.location).toBeNull()
  })

  it('counts a line\'s boardings at its own gates', () => {
    const line2 = stations.lineSummaries(null).find((summary) => summary.line.id === '2')!
    expect(line2.stations).toBe(3)
    expect(line2.top.key).toBe('홍대입구')
    expect(line2.on[18]).toBe(15010) // the peak hour at Hongdae and Hapjeong, plus an ordinary hour at Sinchon
  })

  it('ranks the stations on a line by the whole station, not by whose gates people used', () => {
    const hapjeong = stations.get('합정')!
    const gongdeok = stations.get('공덕')!
    const line6 = stations.lineSummaries(null).find((summary) => summary.line.id === '6')!
    // Line 6's own gates are busier at Gongdeok, yet Hapjeong is the busier station.
    expect(gongdeok.gatesOn(line6.line)!.total()).toBeGreaterThan(hapjeong.gatesOn(line6.line)!.total())
    expect(line6.top.key).toBe('합정')
    expect(line6.topCount).toBe(hapjeong.ridership.total())
    expect(line6.next.map((station) => station.key)).toEqual(['연신내', '공덕'])
  })

  it('knows a line stops at a station even when it has no gates of its own there', () => {
    const yeonsinnae = stations.get('연신내')!
    const line6 = stations.lineSummaries(null).find((summary) => summary.line.id === '6')!
    expect(yeonsinnae.lines.map((line) => line.id)).toEqual(['3', '6'])
    expect(yeonsinnae.gatesOn(line6.line)).toBeNull()
    expect(yeonsinnae.mainLine.id).toBe('3')
    expect(stations.on(line6.line).map((station) => station.key)).toContain('연신내')
    expect(line6.stations).toBe(3)
  })
})

describe('PlaceDirectory', () => {
  it('drops readings much older than the newest', () => {
    expect(places.places.map((p) => p.name('en'))).not.toContain('Namsan Park')
    expect(places.newestClock).toBe('21:00')
  })

  it('ranks by people, and separately by how crowded each place is for its size', () => {
    expect(places.byPeople.map((p) => p.name('en'))).toEqual([
      'Sinchon·Ewha Womans University station',
      'Hongik University station (Line 2)',
      'Seoul station',
      'Seoul Forest',
    ])
    expect(places.mostPeople!.name('ko')).toBe('신촌·이대역')
    // Seoul Forest holds the fewest people but is the most crowded for its size.
    expect(places.aboveRelaxed.map((p) => p.name('en'))).toEqual(['Seoul Forest', 'Hongik University station (Line 2)', 'Seoul station'])
  })

  it('counts the places at each crowd level', () => {
    expect(places.levelCounts().map((entry) => entry.count)).toEqual([1, 1, 1, 1])
    expect(places.at(CrowdLevel.from('붐빔')).map((p) => p.name('en'))).toEqual(['Seoul Forest'])
  })
})

describe('Network', () => {
  const byName = (name: string) => places.places.find((p) => p.name('ko') === name)!

  it('links a place to the stations in its name', () => {
    expect(network.stationsFor(byName('홍대입구역(2호선)')).map((s) => s.key)).toEqual(['홍대입구'])
    expect(network.stationsFor(byName('신촌·이대역')).map((s) => s.key)).toEqual(['신촌'])
    expect(network.stationsFor(byName('서울숲공원'))).toEqual([])
    expect(network.placesFor(stations.get('서울역')!).map((p) => p.name('en'))).toEqual(['Seoul station'])
  })

  it('places a station-named place at its station', () => {
    expect(network.locationOf(byName('서울역'))).toEqual({ lat: 37.5562, lng: 126.9721 })
    expect(network.locationOf(byName('서울숲공원'))).toBeNull()
  })

  it('finds things the way people type them', () => {
    const names = (text: string) => network.search(text).stations.map((s) => s.name('en'))
    expect(names('hongdae')).toEqual(['Hongik Univ.'])
    expect(names('myeongdong')).toEqual(['Myeong-dong'])
    expect(names('ㅎㄷ')).toEqual(['Hongik Univ.'])
    expect(names('isu')).toEqual(['Chongshin Univ. (Isu)'])
    expect(names('zzz')).toEqual([])
  })

  it('puts an exact name before a longer one, and searches places too', () => {
    expect(network.search('sinchon').stations.map((s) => s.key)).toEqual(['신촌', '신촌@gj'])
    expect(network.search('seoul').places.map((p) => p.name('en'))).toEqual(['Seoul station', 'Seoul Forest'])
  })
})

// ---------- measures, the forecast and the usual ----------

describe('ranking by a chosen measure', () => {
  const reading = (level: string, people: number, more: object = {}) => ({ time: '2026-11-23 18:00', level, min: people - 500, max: people + 500, ...more })
  const grid = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => null))
  const place = (code: string, latest: object, usual: { people: number; days: number } | null = null) =>
    ({ name: code, label: code, code, readings: 1, first_reading: '2026-11-22 10:00', latest, usual, grid }) as RawPlaceFile['places'][number]
  const forecast = [
    { time: '2026-11-23 19:00', level: '약간 붐빔', min: 9000, max: 11000 },
    { time: '2026-11-23 20:00', level: '붐빔', min: 14000, max: 16000 },
    { time: '2026-11-23 21:00', level: '붐빔', min: 12000, max: 14000 },
  ]
  const directory = PlaceDirectory.fromFile({
    generated_at: '',
    places: [
      // A big district full of residents, a smaller one full of visitors, and one with no extras at all.
      place('HOME', reading('여유', 60000, { visitors: 10 }), { people: 60000, days: 6 }),
      place('NIGHT', reading('보통', 8000, { visitors: 90, forecast }), { people: 4000, days: 6 }),
      place('NEW', reading('여유', 20000), { people: 100, days: 1 }),
    ],
  })
  const names = (list: { code: string }[]) => list.map((each) => each.code)

  it('ranks the same places differently by people and by visitors', () => {
    expect(names(Measure.people.rank(directory.places))).toEqual(['HOME', 'NEW', 'NIGHT'])
    expect(names(Measure.visitors.rank(directory.places))).toEqual(['NIGHT', 'HOME']) // 7,200 visitors against 6,000
  })

  it('leaves out places that lack the measure, and says when too few have it', () => {
    expect(Measure.visitors.covers(directory.places)).toBe(true) // two of three
    expect(Measure.usual.of(directory.get('NEW')!)).toBeNull() // one earlier day is not a usual
    expect(directory.usualDays).toBe(6)
  })

  it('compares a place with its own usual for the hour', () => {
    expect(directory.get('NIGHT')!.versusUsual).toBe(1) // twice its usual
    expect(directory.get('HOME')!.versusUsual).toBe(0)
    expect(names(Measure.usual.rank(directory.places))).toEqual(['NIGHT', 'HOME'])
  })

  it('reads the forecast: the peak, and the first crowded hour', () => {
    const night = directory.get('NIGHT')!
    expect(night.peakAhead!.hour).toBe(20)
    expect(night.crowdedAhead!.hour).toBe(20)
    expect(directory.crowdedAhead.map(({ place: each }) => each.code)).toEqual(['NIGHT'])
    expect(directory.get('HOME')!.forecast).toEqual([])
  })

  it('steps the whole city forward through the forecast', () => {
    expect(directory.forecastHours).toBe(3)
    expect(directory.clockAt(0)).toBe('18:00')
    expect(directory.clockAt(2)).toBe('20:00')
    // Two hours on, NIGHT is expected to be crowded. The places with no forecast stay as they are.
    expect(directory.levelCounts(0).map((entry) => entry.count)).toEqual([2, 1, 0, 0])
    expect(directory.levelCounts(2).map((entry) => entry.count)).toEqual([2, 0, 0, 1])
    expect(names(directory.at(CrowdLevel.crowded, 2))).toEqual(['NIGHT'])
    expect(directory.get('NIGHT')!.expected(2).people).toBe(15000)
  })

  it('knows the moment of the newest reading', () => {
    expect(directory.readAt!.toISOString()).toBe('2026-11-23T09:00:00.000Z') // 18:00 in Seoul
  })
})

// ---------- drawing the lines ----------

describe('the order of stops along a line', () => {
  const at = (n: number): LatLng => ({ lat: 37.5 + n / 1000, lng: 127 })
  const where: Record<string, LatLng> = Object.fromEntries('abcdefghij'.split('').map((name, n) => [name, at(n)]))
  const routes = (stops: RawStop[]) => buildRoutes(stops, (_line, name) => where[name] ?? null)
  const order = (path: { name: string }[]) => path.map((stop) => stop.name).join('')

  it('sorts by stop number, whatever order the list is in', () => {
    const [line3] = routes([['03호선', '312', 'c'], ['03호선', '310', 'a'], ['03호선', '311', 'b']])
    expect(line3.line.id).toBe('3')
    expect(line3.paths.map(order)).toEqual(['abc'])
  })

  it('closes Line 2 into a circle and hangs its spurs off the right stop', () => {
    const [line2] = routes([['02호선', '201', 'a'], ['02호선', '202', 'b'], ['02호선', '203', 'c'], ['02호선', '202-1', 'd'], ['02호선', '202-2', 'e']])
    expect(line2.paths.map(order)).toEqual(['abca', 'bde'])
  })

  it('joins a branch numbered with a P to the stop before it', () => {
    const [line5] = routes([['05호선', '547', 'a'], ['05호선', '548', 'b'], ['05호선', '549', 'c'], ['05호선', 'P549', 'd'], ['05호선', 'P550', 'e']])
    expect(line5.paths.map(order)).toEqual(['abc', 'bde'])
  })

  it('passes Eungam twice on the Line 6 loop', () => {
    const [line6] = routes([['06호선', '610', 'a'], ['06호선', '611', 'b'], ['06호선', '615', 'c'], ['06호선', '616', 'd']])
    expect(line6.paths.map(order)).toEqual(['abcad'])
  })

  it('skips lines the site does not show, and stops it cannot place', () => {
    expect(routes([['신분당선', 'D10', 'a'], ['신분당선', 'D11', 'b']])).toEqual([])
    const [line3] = routes([['03호선', '310', 'a'], ['03호선', '311', 'nowhere'], ['03호선', '312', 'c']])
    expect(line3.paths.map(order)).toEqual(['ac'])
  })
})

describe('what is near a point', () => {
  it('lists the closest places and stations, nearest first', () => {
    const near = network.near({ lat: 37.5571, lng: 126.9245 }, 2) // beside Hongik University
    expect(near[0].item.name('en')).toMatch(/Hongik/)
    expect(near.every((each, i) => i === 0 || each.km >= near[i - 1].km)).toBe(true)
  })
})

// ---------- directions ----------

describe('getting from one station to another', () => {
  const at = (n: number): LatLng => ({ lat: 37.5, lng: 127 + n / 100 }) // about 880 m apart
  const stop = (name: string, n: number, oneWay = false) => ({ name, at: at(n), oneWay })
  const lineA = Line.get('3')
  const lineB = Line.get('4')
  // Line A runs a-b-c-d. Line B crosses it at c: x-c-y. A second network is a loop that goes one way only.
  const stationsFile: RawStationFile = {
    generated_at: '',
    month: '2026-10',
    month_days: 31,
    months: ['2026-10'],
    days: null,
    stations: ['a', 'b', 'c', 'd'].map((name) => row('3호선', name, name, 8, 100)).concat(['c', 'x', 'y'].map((name) => row('4호선', name, name, 8, 100))),
  }
  const directory = StationDirectory.fromFile(stationsFile)
  const router = new Router(
    [
      { line: lineA, circle: false, paths: [[stop('a', 0), stop('b', 1), stop('c', 2), stop('d', 3)]] },
      { line: lineB, circle: false, paths: [[stop('x', 12), stop('c', 2), stop('y', -8)]] },
    ],
    (_line, name) => directory.get(name) ?? null,
  )
  const station = (name: string) => directory.get(name)!

  it('rides straight through when one line does it', () => {
    const journey = router.between(station('a'), station('d'))!
    expect(journey.changes).toBe(0)
    expect(journey.rides.map((ride) => [ride.line.id, ride.fromName, ride.toName, ride.stops, ride.forward, ride.toward])).toEqual([['3', 'a', 'd', 3, true, 'd']])
  })

  it('knows which way the train is heading', () => {
    const [ride] = router.between(station('d'), station('b'))!.rides
    expect([ride.forward, ride.toward, ride.stops]).toEqual([false, 'a', 2])
  })

  it('changes lines where they cross, and counts the change in the time', () => {
    const journey = router.between(station('a'), station('x'))!
    expect(journey.legs.map((leg) => (leg.kind === 'ride' ? `${leg.line.id}:${leg.fromName}-${leg.toName}` : `change:${leg.name}`))).toEqual(['3:a-c', 'change:c', '4:c-x'])
    const ridden = journey.rides.reduce((total, ride) => total + ride.minutes, 0)
    expect(journey.minutes).toBe(Math.round(ridden + TRANSFER_MINUTES + WAIT_MINUTES))
  })

  it('adds the walk at either end to the total', () => {
    const journey = router.between(station('a'), station('b'))!
    expect(journey.withWalks(6, 0).minutes).toBe(journey.minutes + 6)
  })

  it('says so when there is no way, and when you are already there', () => {
    const lonely = new Router([{ line: lineA, circle: false, paths: [[stop('a', 0), stop('b', 1)]] }], (_line, name) => directory.get(name) ?? null)
    expect(lonely.between(station('a'), station('x'))).toBeNull()
    expect(router.between(station('a'), station('a'))!.legs).toEqual([])
  })

  it('goes the long way round a loop that runs one way', () => {
    const loop = new Router(
      [{ line: lineA, circle: false, paths: [[stop('a', 0, true), stop('b', 1, true), stop('c', 2, true), stop('a', 0, true), stop('d', 3)]] }],
      (_line, name) => directory.get(name) ?? null,
    )
    // c to b cannot go backwards: it has to pass a.
    expect(loop.between(station('c'), station('b'))!.rides[0].stops).toBe(2)
    expect(loop.between(station('b'), station('c'))!.rides[0].stops).toBe(1)
  })
})

// ---------- how full the trains are ----------

describe('train crowding', () => {
  const slots = ['07:30', '08:00', '08:30']
  const directory = StationDirectory.fromFile({
    generated_at: '',
    month: '2026-10',
    month_days: 31,
    months: ['2026-10'],
    days: null,
    stations: [row('2호선', '사당', 'Sadang', 8, 100), row('4호선', '사당', 'Sadang', 8, 100), row('2호선', '방배', 'Bangbae', 8, 100)],
  })
  const crowding = new TrainCrowding(
    {
      file: 'test.xlsx',
      as_of: '2026-09-30',
      slots,
      rows: [
        ['weekday', 2, '226', '사당', '외선', [90, 144.8, 120]],
        ['weekday', 2, '226', '사당', '내선', [40, 60, 50]],
        ['weekday', 2, '225', '방배', '내선', [30, 50, 146.3]],
        ['sunday', 2, '226', '사당', '외선', [10, 20, 15]],
        ['weekday', 2, '999', '어디에도없는역', '내선', [200, 200, 200]], // a stop the site does not know is left out
      ],
    },
    (n) => Line.all.find((line) => line.digit === String(n)) ?? null,
    (line, name) => directory.stationAt(line, name),
  )
  const line2 = Line.get('2')
  const sadang = directory.get('사당')!

  it('reads a station, direction, day and half hour', () => {
    expect(crowding.at(line2, sadang, 'back', 'weekday', 1)).toBe(144.8) // the outer loop
    expect(crowding.at(line2, sadang, 'on', 'weekday', 1)).toBe(60) // the inner loop
    expect(crowding.at(line2, sadang, 'back', 'sunday', 1)).toBe(20)
    expect(crowding.at(line2, sadang, 'back', 'saturday', 1)).toBeNull()
  })

  it('knows which lines it covers at a station', () => {
    expect(crowding.covers(line2, sadang)).toBe(true)
    expect(crowding.covers(Line.get('4'), sadang)).toBe(false)
  })

  it('ranks the fullest half hours, one for each station and direction', () => {
    expect(crowding.peaks('weekday').map((peak) => [peak.station.key, peak.heading, peak.slot, peak.percent])).toEqual([
      ['방배', 'on', '08:30', 146.3],
      ['사당', 'back', '08:00', 144.8],
      ['사당', 'on', '08:00', 60],
    ])
  })

  it('finds the half hour a moment in Seoul falls in', () => {
    expect(crowding.slotAt(new Date('2026-11-23T23:10:00Z'))).toBe(1) // 08:10 in Seoul
    expect(crowding.slotAt(new Date('2026-11-23T03:00:00Z'))).toBeNull() // noon is outside this short table
    expect(TrainCrowding.today(new Date('2026-11-21T03:00:00Z'))).toBe('saturday')
  })
})
