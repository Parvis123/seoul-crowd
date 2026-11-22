import { createContext, useContext } from 'react'

export type Lang = 'en' | 'ko'

const en = {
  title: 'Seoul crowd',
  tagline: "Where it's busy and where it's quiet, right now.",
  language: 'Language',
  update: 'Update readings',
  updated: 'Readings updated',
  updateFailed: "The readings didn't update. Try again in a minute.",
  loadFailedTitle: "The readings didn't load",
  loadFailedBody: 'Check your connection, then reload the page.',
  emptyTitle: 'No readings yet',
  emptyBody: "They appear after the collector's next run, within 20 minutes.",

  themeChoose: 'Choose light or dark mode',
  themeLight: 'Light',
  themeDark: 'Dark',
  themeSystem: 'System',

  crowdedLabel: 'Crowded or slightly crowded',
  crowdedCount: (count: number) => String(count),
  crowdedOf: (total: number) => `of ${total} places`,
  mostPeople: 'Most people right now',
  aboutPeople: (people: string) => `About ${people} people`,
  lastReading: 'Last reading, Seoul time',
  calmest: (name: string) => `Calmest: ${name}`,
  none: 'None yet',

  tabNow: 'Right now',
  tabAll: (count: number) => `All ${count} places`,
  busiest: 'Busiest',
  busiestHint: "By the city's crowd level, then by people",
  quietest: 'Quietest',
  quietestHint: 'Bars compare each place with the busiest one right now',
  barLabel: (percent: number) => `${percent}% of the busiest place right now`,
  range: (min: string, max: string) => `${min} to ${max}`,
  rangePeople: (range: string) => `${range} people`,

  levels: { 붐빔: 'Crowded', '약간 붐빔': 'Slightly crowded', 보통: 'About normal', 여유: 'Relaxed' } as Record<string, string>,
  categories: {
    인구밀집지역: 'Busy districts',
    발달상권: 'Shopping areas',
    공원: 'Parks',
    관광특구: 'Tourist zones',
    '고궁·문화유산': 'Palaces and heritage',
  } as Record<string, string>,

  colPlace: 'Place',
  colKind: 'Kind',
  colLevel: 'Level',
  colPeople: 'People',
  searchPlaceholder: 'Gangnam station',
  searchLabel: 'Search places',
  filterLabel: 'Filter by kind of place',
  filterAll: 'All',
  noMatch: 'No places match. Try a shorter search or a different kind of place.',

  panelNow: (range: string) => `About ${range} people`,
  panelAt: (time: string) => `at ${time} Seoul time`,
  weekTitle: 'The week here',
  weekHint: 'Brighter squares are busier hours. The outlined square is this hour.',
  hoursRecorded: (filled: number) => `${filled} of 168 hours recorded so far`,
  hoursRecordedHint: 'A reading is saved every 20 minutes, so the week fills in over the next seven days.',
  dayTitle: 'A typical day',
  dayHint: 'Average people for each hour of the day, across the days recorded.',
  chartPeople: 'People',
  cellEmpty: (time: string) => `${time}: no reading yet`,
  cellPeople: (time: string, people: string) => `${time}: about ${people} people`,
  days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  daysLong: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],

  tabStations: 'Stations',
  stationsLoadFailedTitle: "The station figures didn't load",
  viewStations: 'Stations',
  viewLines: 'By line',
  viewLabel: 'Show stations or lines',
  stationSearchPlaceholder: 'Hongik Univ.',
  stationSearchLabel: 'Search stations',
  lineFilterLabel: 'Filter by line',
  allLines: 'All lines',
  timeLabel: 'Time of day',
  allDay: 'All day',
  oneHour: 'One hour',
  hourSliderLabel: 'Hour of the day',
  hour: (h: number) => `${String(h).padStart(2, '0')}:00`,
  hourRange: (h: number) => `${String(h).padStart(2, '0')}:00 to ${String((h + 1) % 24).padStart(2, '0')}:00`,
  stationsHintDay: (month: string) => `Card taps at the gates on an average day in ${month}.`,
  stationsHintHour: (month: string, range: string) => `Card taps at the gates from ${range}, on an average day in ${month}.`,
  lineGatesHint: (line: string) => `Counting the ${line} gates only.`,
  shinbundang: 'The Shinbundang line is not in this data.',
  colStation: 'Station',
  colShape: 'Through the day',
  colPeak: 'Busiest hour',
  colOn: 'Boardings',
  colOff: 'Exits',
  colTotal: 'Total',
  showMore: (count: number) => `Show ${count} more`,
  showing: (shown: number, total: number) => `${shown} of ${total} stations`,
  noStations: 'No stations match. Try a shorter search or a different line.',
  stationCount: (count: number) => `${count} stations`,
  crushTitle: 'Hardest time to get on',
  crushBody: (boardings: string) => `About ${boardings} people board across the line in that hour.`,
  crushNote: 'Boardings stand in for how full the trains are, which this data does not measure.',
  crushChartLabel: (line: string) => `Boardings on ${line} for each hour of the day`,
  crushBar: (hour: string, boardings: string) => `${hour}: ${boardings} boardings`,
  byLineTitle: 'Busiest station on each line',
  byLineHint: "Each line counts its own gates, so a station shared by several lines can lead more than one. Choose a line to see all its stations.",
  byLineRow: (line: string, station: string, total: string) => `${line}: ${station}, ${total} boardings and exits`,
  tileTotal: 'Boardings and exits a day',
  tileHour: 'Busiest hour',
  tileDay: 'Busiest day',
  stationNowTitle: 'Around the station right now',
  seePlace: 'See this place',
  placeStationsTitle: 'Station figures',
  inAndOutPerDay: (total: string) => `${total} in and out a day`,
  dayChartTitle: 'A typical day',
  dayChartHint: (month: string) => `Average for each hour in ${month}.`,
  seriesOn: 'Boardings',
  seriesOff: 'Exits',
  weekdaysTitle: 'Days of the week',
  weekdaysHint: (from: string, to: string) => `Average boardings and exits a day, ${from} to ${to}.`,
  weekdayBar: (day: string, total: string) => `${day}: ${total}`,
  linesTitle: 'By line',
  linesHint: 'Taps at each line’s own gates. Changing between lines inside the station is not counted.',
  trendTitle: 'The last 12 months',
  trendHint: 'Average boardings and exits a day in each month.',
  trendSeries: 'A day',
  stationsSource: 'Station figures: Seoul Open Data Plaza, subway boardings and exits by station.',

  footer:
    "People counts are the city's estimates from mobile phone data. Data: Seoul Open Data Plaza, Seoul real-time city data.",
}

export type Strings = typeof en

const ko: Strings = {
  title: '서울 혼잡도',
  tagline: '지금 서울에서 붐비는 곳과 한산한 곳',
  language: '언어',
  update: '데이터 새로고침',
  updated: '데이터를 새로고침했습니다',
  updateFailed: '새로고침하지 못했습니다. 잠시 후 다시 시도해 주세요.',
  loadFailedTitle: '데이터를 불러오지 못했습니다',
  loadFailedBody: '인터넷 연결을 확인한 뒤 페이지를 새로고침해 주세요.',
  emptyTitle: '아직 데이터가 없습니다',
  emptyBody: '20분 이내에 다음 수집이 끝나면 표시됩니다.',

  themeChoose: '화면 모드 선택',
  themeLight: '라이트',
  themeDark: '다크',
  themeSystem: '시스템',

  crowdedLabel: '붐빔 또는 약간 붐빔',
  crowdedCount: (count) => String(count),
  crowdedOf: (total) => `/ ${total}곳`,
  mostPeople: '지금 사람이 가장 많은 곳',
  aboutPeople: (people) => `약 ${people}명`,
  lastReading: '최근 측정 시각 (서울 기준)',
  calmest: (name) => `가장 한산한 곳: ${name}`,
  none: '없음',

  tabNow: '지금',
  tabAll: (count) => `전체 ${count}곳`,
  busiest: '가장 붐비는 곳',
  busiestHint: '서울시 혼잡도 기준, 같은 단계에서는 인구순',
  quietest: '가장 한산한 곳',
  quietestHint: '막대는 지금 가장 붐비는 곳과 비교한 값입니다',
  barLabel: (percent) => `지금 가장 붐비는 곳의 ${percent}%`,
  range: (min, max) => `${min}~${max}명`,
  rangePeople: (range) => range,

  levels: { 붐빔: '붐빔', '약간 붐빔': '약간 붐빔', 보통: '보통', 여유: '여유' },
  categories: {
    인구밀집지역: '인구밀집지역',
    발달상권: '발달상권',
    공원: '공원',
    관광특구: '관광특구',
    '고궁·문화유산': '고궁·문화유산',
  },

  colPlace: '장소',
  colKind: '분류',
  colLevel: '혼잡도',
  colPeople: '인구',
  searchPlaceholder: '강남역',
  searchLabel: '장소 검색',
  filterLabel: '분류별로 보기',
  filterAll: '전체',
  noMatch: '일치하는 장소가 없습니다. 검색어를 줄이거나 다른 분류를 선택해 보세요.',

  panelNow: (range) => `약 ${range}`,
  panelAt: (time) => `${time} 기준 (서울 시각)`,
  weekTitle: '요일·시간대별 인구',
  weekHint: '밝을수록 붐비는 시간대입니다. 테두리가 있는 칸이 현재 시간입니다.',
  hoursRecorded: (filled) => `지금까지 168시간 중 ${filled}시간 기록됨`,
  hoursRecordedHint: '20분마다 기록하므로 앞으로 7일 동안 한 주가 채워집니다.',
  dayTitle: '평균적인 하루',
  dayHint: '기록된 날짜를 기준으로 한 시간대별 평균 인구입니다.',
  chartPeople: '인구',
  cellEmpty: (time) => `${time}: 아직 기록 없음`,
  cellPeople: (time, people) => `${time}: 약 ${people}명`,
  days: ['월', '화', '수', '목', '금', '토', '일'],
  daysLong: ['월요일', '화요일', '수요일', '목요일', '금요일', '토요일', '일요일'],

  tabStations: '지하철역',
  stationsLoadFailedTitle: '역 데이터를 불러오지 못했습니다',
  viewStations: '역별',
  viewLines: '노선별',
  viewLabel: '역별 또는 노선별로 보기',
  stationSearchPlaceholder: '홍대입구',
  stationSearchLabel: '역 검색',
  lineFilterLabel: '노선별로 보기',
  allLines: '전체 노선',
  timeLabel: '시간대',
  allDay: '하루 전체',
  oneHour: '한 시간',
  hourSliderLabel: '시간 선택',
  hour: (h) => `${String(h).padStart(2, '0')}:00`,
  hourRange: (h) => `${String(h).padStart(2, '0')}:00~${String((h + 1) % 24).padStart(2, '0')}:00`,
  stationsHintDay: (month) => `${month} 하루 평균 승하차 인원입니다 (교통카드 기준).`,
  stationsHintHour: (month, range) => `${month} 하루 평균 ${range} 승하차 인원입니다 (교통카드 기준).`,
  lineGatesHint: (line) => `${line} 개찰구만 집계한 값입니다.`,
  shinbundang: '신분당선은 이 데이터에 포함되지 않습니다.',
  colStation: '역',
  colShape: '하루 흐름',
  colPeak: '가장 붐비는 시간',
  colOn: '승차',
  colOff: '하차',
  colTotal: '합계',
  showMore: (count) => `${count}개 더 보기`,
  showing: (shown, total) => `${total}개 역 중 ${shown}개`,
  noStations: '일치하는 역이 없습니다. 검색어를 줄이거나 다른 노선을 선택해 보세요.',
  stationCount: (count) => `${count}개 역`,
  crushTitle: '가장 타기 힘든 시간',
  crushBody: (boardings) => `이 시간대에 노선 전체에서 약 ${boardings}명이 승차합니다.`,
  crushNote: '이 데이터에는 열차 혼잡도가 없어 승차 인원으로 대신 보여줍니다.',
  crushChartLabel: (line) => `${line} 시간대별 승차 인원`,
  crushBar: (hour, boardings) => `${hour}: 승차 ${boardings}명`,
  byLineTitle: '노선별 가장 붐비는 역',
  byLineHint: '노선마다 자기 개찰구만 집계하므로 환승역은 여러 노선에서 1위일 수 있습니다. 노선을 선택하면 해당 노선의 모든 역을 볼 수 있습니다.',
  byLineRow: (line, station, total) => `${line}: ${station}, 승하차 ${total}명`,
  tileTotal: '하루 승하차 인원',
  tileHour: '가장 붐비는 시간',
  tileDay: '가장 붐비는 요일',
  stationNowTitle: '지금 역 주변',
  seePlace: '이 장소 보기',
  placeStationsTitle: '지하철역 승하차',
  inAndOutPerDay: (total) => `하루 ${total}명`,
  dayChartTitle: '평균적인 하루',
  dayChartHint: (month) => `${month} 시간대별 평균입니다.`,
  seriesOn: '승차',
  seriesOff: '하차',
  weekdaysTitle: '요일별',
  weekdaysHint: (from, to) => `${from}~${to} 하루 평균 승하차 인원입니다.`,
  weekdayBar: (day, total) => `${day}: ${total}명`,
  linesTitle: '노선별',
  linesHint: '각 노선 개찰구에서 찍힌 인원입니다. 역 안에서의 환승은 포함되지 않습니다.',
  trendTitle: '최근 12개월',
  trendHint: '월별 하루 평균 승하차 인원입니다.',
  trendSeries: '하루 평균',
  stationsSource: '역 데이터: 서울 열린데이터광장, 서울시 지하철 호선별 역별 승하차 인원.',

  footer: '인구는 서울시가 통신 데이터를 바탕으로 추정한 값입니다. 출처: 서울 열린데이터광장, 서울시 실시간 도시데이터.',
}

export const STRINGS: Record<Lang, Strings> = { en, ko }

export type LanguageValue = { lang: Lang; setLang: (lang: Lang) => void; s: Strings }

export const LanguageContext = createContext<LanguageValue>({ lang: 'en', setLang: () => {}, s: en })

export const useLanguage = () => useContext(LanguageContext)

const formatters: Record<Lang, Intl.NumberFormat> = {
  en: new Intl.NumberFormat('en-GB'),
  ko: new Intl.NumberFormat('ko-KR'),
}

export const formatNumber = (lang: Lang, value: number) => formatters[lang].format(value)

const compact: Record<Lang, Intl.NumberFormat> = {
  en: new Intl.NumberFormat('en-GB', { notation: 'compact', maximumFractionDigits: 1 }),
  ko: new Intl.NumberFormat('ko-KR', { notation: 'compact', maximumFractionDigits: 1 }),
}

/** A short form for chart axes: "12K" or "1.2만". */
export const formatCompact = (lang: Lang, value: number) => compact[lang].format(value)

/** People rounded to the nearest hundred, since the source figures are estimates. */
export const formatPeople = (lang: Lang, value: number) => formatNumber(lang, Math.round(value / 100) * 100)

/** The city's estimated range, for example "12,000 to 14,000". */
export const formatRange = (lang: Lang, range: { min: number; max: number }) =>
  STRINGS[lang].range(formatNumber(lang, range.min), formatNumber(lang, range.max))

/** A place's name in the chosen language. The other language is only shown small, in the place panel. */
export function placeNames(place: { name: string; label: string }, lang: Lang) {
  return lang === 'ko'
    ? { primary: place.name, secondary: place.label, secondaryLang: 'en' as const }
    : { primary: place.label, secondary: place.name, secondaryLang: 'ko' as const }
}

const LOCALE: Record<Lang, string> = { en: 'en-GB', ko: 'ko-KR' }

/** "2026-10" as "October 2026" or "2026년 10월". Pass `short` for an axis label such as "Oct". */
export function formatMonth(lang: Lang, month: string, short = false) {
  const [y, m] = month.split('-').map(Number)
  const options: Intl.DateTimeFormatOptions = short ? { month: 'short' } : { month: 'long', year: 'numeric' }
  return new Intl.DateTimeFormat(LOCALE[lang], { ...options, timeZone: 'UTC' }).format(new Date(Date.UTC(y, m - 1, 1)))
}

/** "2026-09-25" as "25 September" or "9월 25일". */
export function formatDay(lang: Lang, day: string) {
  const [y, m, d] = day.split('-').map(Number)
  return new Intl.DateTimeFormat(LOCALE[lang], { day: 'numeric', month: 'long', timeZone: 'UTC' }).format(
    new Date(Date.UTC(y, m - 1, d)),
  )
}

/** A station's name in the chosen language, with the other language for the panel's small line. */
export function stationNames(station: { ko: string; en: string }, lang: Lang) {
  return lang === 'ko'
    ? { primary: station.ko, secondary: station.en, secondaryLang: 'en' as const }
    : { primary: station.en, secondary: station.ko, secondaryLang: 'ko' as const }
}
