import { describe, expect, it } from 'vitest'

import { Network } from '@/model/network'
import { PlaceDirectory, type RawPlaceFile } from '@/model/place'
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
    { ...row('7호선', '상동', 'Sang-dong', 0, 0), on: new Array(24).fill(0), off: new Array(24).fill(0) },
  ],
  coordinates: {
    홍대입구: [['2호선', 37.5572, 126.9245], ['경의중앙선', 37.558, 126.9254]],
    신촌: [['2호선', 37.5551, 126.9369], ['경의중앙선', 37.5597, 126.9426]],
    서울역: [['1호선', 37.5562, 126.9721]],
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

  it('summarises each line by its own gates', () => {
    const line2 = stations.lineSummaries(null).find((summary) => summary.line.id === '2')!
    expect(line2.stations).toBe(2)
    expect(line2.top.key).toBe('홍대입구')
    expect(line2.on[18]).toBe(9010) // Hongdae's peak hour plus an ordinary hour at Sinchon
  })
})

describe('PlaceDirectory', () => {
  it('drops readings much older than the newest', () => {
    expect(places.places.map((p) => p.name('en'))).not.toContain('Namsan Park')
    expect(places.newestClock).toBe('21:00')
  })

  it('ranks by crowd level first, then people', () => {
    expect(places.ranked.map((p) => p.name('en'))[0]).toBe('Seoul Forest')
    expect(places.mostPeople!.name('ko')).toBe('신촌·이대역')
    expect(places.crowdedCount).toBe(2)
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
