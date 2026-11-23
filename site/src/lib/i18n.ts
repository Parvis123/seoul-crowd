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

  asOf: (time: string) => `${time} in Seoul`,
  headlineCrowded: (count: number) =>
    count === 1 ? '1 place in Seoul is crowded right now.' : `${count} places in Seoul are crowded right now.`,
  headlineNearly: (count: number) =>
    count === 1
      ? 'Nowhere in Seoul is crowded, but 1 place is slightly crowded.'
      : `Nowhere in Seoul is crowded, but ${count} places are slightly crowded.`,
  headlineNone: 'Nowhere in Seoul is crowded right now.',
  ledeNames: (level: string, names: string[], more: number) =>
    `${level}: ${names.join(', ')}${more ? ` and ${more} more` : ''}.`,
  statusTop: (place: string, people: string) => `Most people: ${place}, about ${people}.`,
  levelStripLabel: (parts: string[]) => `Places by crowd level: ${parts.join(', ')}`,
  levelCount: (count: number, level: string) => `${count} ${level.toLowerCase()}`,

  searchOpen: 'Search places and stations',
  searchHint: 'English or Korean. Nicknames such as Hongdae work, and so do first consonants such as ㅎㄷ.',
  searchEmpty: 'Nothing matches. Try a shorter name.',
  searchPlaces: 'Places',
  searchStations: 'Stations',
  searchBusiest: 'Most people right now',

  mapLabel: 'Map of Seoul showing how busy places and stations are',
  layersLabel: 'Show on the map',
  layerPlaces: 'Places',
  layerStations: 'Stations',
  zoomIn: 'Zoom in',
  zoomOut: 'Zoom out',
  zoomReset: 'Show all of Seoul',
  legendPlaces: 'Rings are places. Colour is the crowd level shown above, size is people.',
  legendStations: 'Dots are stations. Colour is the line, size is riders a day. Lines join the stations in order and are not the exact track.',
  placesOnMap: (shown: number, total: number) => `${shown} of ${total} places are on the map so far.`,
  mapHintTouch: 'Use two fingers to move the map',
  mapZoomHintCtrl: 'Use Ctrl + scroll to zoom the map',
  mapZoomHintCmd: 'Use ⌘ + scroll to zoom the map',
  mapUnavailable: 'This browser cannot draw the map. The lists below still work.',
  mapStreetsFailed: 'The street map did not load, so only the marks are shown.',
  mapSource: 'Map: OpenFreeMap, © OpenMapTiles, data from OpenStreetMap.',

  none: 'None yet',

  tabNow: 'Right now',
  tabAll: (count: number) => `All ${count} places`,
  fullest: 'Fullest for their size',
  fullestHint:
    'The city sets each level from a place’s own usual numbers and its size, so a small market can rank above a big district that holds far more people.',
  fullestMore: (count: number) => `And ${count} more.`,
  mostPeople: 'Most people',
  mostPeopleHint: 'Everyone the city estimates is in the area, including residents at home.',
  fewestPeople: 'Fewest people',
  fewestPeopleHint: 'The emptiest places right now.',
  barLabel: (percent: number) => `${percent}% of the place with the most people`,
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
  filterLabel: 'Filter by kind of place',
  filterAll: 'All',

  panelNow: (range: string) => `About ${range} people`,
  panelAt: (time: string) => `at ${time} Seoul time`,
  weekTitle: 'The week here',
  weekHint: 'Brighter squares are busier hours. Point at one, or tap it, to read it. The outlined square is this hour.',
  hoursRecorded: (filled: number) => `${filled} of 168 hours recorded so far`,
  hoursRecordedHint: 'A reading is saved every 20 minutes, so the week fills in over the next seven days.',
  dayTitle: 'A typical day',
  dayHint: 'Average people for each hour of the day, across the days recorded.',
  chartPeople: 'People',
  cellEmpty: (time: string) => `${time}: no reading yet`,
  noReading: 'No reading yet',
  aboutPeople: (people: string) => `About ${people} people`,
  cellPeople: (time: string, people: string) => `${time}: about ${people} people`,
  days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  daysLong: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],

  tabStations: 'Stations',
  stationsLoadFailedTitle: "The station figures didn't load",
  viewStations: 'Stations',
  viewLines: 'By line',
  viewLabel: 'Show stations or lines',
  lineFilterLabel: 'Filter by line',
  allLines: 'All lines',
  timeLabel: 'Time of day',
  allDay: 'All day',
  oneHour: 'One hour',
  hourSliderLabel: 'Hour of the day',
  hour: (h: number) => `${String(h).padStart(2, '0')}:00`,
  hourRange: (h: number) => `${String(h).padStart(2, '0')}:00 to ${String((h + 1) % 24).padStart(2, '0')}:00`,
  stationsHintDay: (month: string) => `People entering and leaving through the gates on an average day in ${month}.`,
  stationsHintHour: (month: string, range: string) =>
    `People entering and leaving through the gates from ${range}, on an average day in ${month}.`,
  transfersHint: 'Changing trains inside a station is not counted.',
  wholeStationHint: 'Each station is counted whole, across all its lines.',
  shinbundang: 'The Shinbundang line is not in this data.',
  colStation: 'Station',
  colShape: 'Through the day',
  colPeak: 'Busiest hour',
  colOn: 'Boardings',
  colOff: 'Exits',
  colTotal: 'Total',
  showMore: (count: number) => `Show ${count} more`,
  showing: (shown: number, total: number) => `${shown} of ${total} stations`,
  stationCount: (count: number) => `${count} stations`,
  crushTitle: 'Hardest time to get on',
  crushBody: (boardings: string) => `About ${boardings} people enter through the line’s gates in that hour.`,
  crushNote: 'Boardings stand in for how full the trains are, which this data does not measure.',
  crushChartLabel: (line: string) => `Boardings on ${line} for each hour of the day`,
  crushBar: (hour: string, boardings: string) => `${hour}: ${boardings} boardings`,
  byLineTitle: 'Busiest station on each line',
  byLineHint: 'Each station is counted whole, so one shared by several lines can lead more than one. Choose a line to see all its stations.',
  byLineRow: (line: string, station: string, total: string) => `${line}: ${station}, ${total} boardings and exits`,
  byLineThen: (stations: string[]) => `then ${stations.join(', ')}`,
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
  linesTitle: 'Which gates people use',
  linesHint:
    'Each tap is filed under the line that owns the gate, not the train the person rides. Changing lines inside the station is not counted.',
  noOwnGates: 'No gates of its own here',
  trendTitle: 'The last 12 months',
  trendHint: 'Average boardings and exits a day in each month.',
  trendSeries: 'A day',
  stationsSource: 'Station figures: Seoul Open Data Plaza, subway boardings and exits by station.',

  // ---- ranking by a chosen measure
  measureLabel: 'Rank by',
  measures: { people: 'People', visitors: 'Visitors', usual: 'Against usual' } as Record<string, string>,
  usualLocked: (have: number, needs: number) =>
    `Comparing with usual switches on after ${needs} earlier days of readings. ${have} so far.`,
  mostVisitors: 'Most visitors',
  mostVisitorsHint:
    'People who are not regulars there. The city counts someone as a regular if they spent four hours or more there on ten days running last month.',
  fewestVisitors: 'Fewest visitors',
  fewestVisitorsHint: 'Mostly the people who live or work there.',
  busierThanUsual: 'Busier than usual',
  busierHint: 'Against the same hour on earlier days of the same kind: weekdays, or the weekend.',
  quieterThanUsual: 'Quieter than usual',
  quieterHint: 'The places furthest below their own usual for this hour.',
  visitorsDetail: (visitors: string, percent: number) => `About ${visitors} visitors, ${percent}% of the people there`,
  usualDetail: (percent: number, now: string, usual: string) =>
    `${Math.abs(percent)}% ${percent >= 0 ? 'above' : 'below'} usual. About ${now} now, usually ${usual}.`,
  visitorsBarLabel: (percent: number) => `${percent}% of the place with the most visitors`,
  usualBarLabel: (percent: number) => `${percent}% of the biggest change in this list`,

  // ---- the place panel
  ledeAhead: (names: string[], more: number) =>
    `The city expects crowds later at ${names.join(', ')}${more ? ` and ${more} more` : ''}.`,
  aheadName: (place: string, time: string) => `${place} (${time})`,
  forecastTitle: 'The next 12 hours',
  forecastHint: 'The city’s own forecast. Height is people, colour is the crowd level it expects.',
  forecastColumn: (hour: string, level: string, range: string) => `${hour}: ${level}, ${range} people`,
  forecastPeak: (hour: string, level: string) => `Expected to peak around ${hour}: ${level.toLowerCase()}.`,
  whoTitle: 'Who is there',
  whoVisitors: (percent: number) => `${percent}% visitors`,
  whoRegulars: (percent: number) => `${percent}% regulars`,
  whoHint: 'Regulars spent four hours or more here on ten days running last month. Everyone else counts as a visitor.',
  ageTitle: 'By age',
  ages: ['0–9', '10s', '20s', '30s', '40s', '50s', '60s', '70+'],
  ageColumn: (band: string, percent: number) => `${band}: ${percent}%`,
  usualNow: (percent: number, days: number) =>
    percent === 0
      ? `About its usual for this hour, going by ${days} earlier days.`
      : `${Math.abs(percent)}% ${percent > 0 ? 'busier' : 'quieter'} than its usual for this hour, going by ${days} earlier days.`,
  bestTime: (quiet: string, busy: string) => `On days like today it is usually quietest around ${quiet} and busiest around ${busy}.`,

  // ---- pins and links
  pin: 'Pin to the top of the page',
  unpin: 'Remove the pin',
  pinnedTitle: 'Pinned',
  pinnedHint: 'Your pins are kept in this browser.',
  copyLink: 'Copy a link to this',
  linkCopied: 'Link copied',
  linkCopyFailed: 'Could not copy the link. Copy it from the address bar instead.',

  // ---- near me
  nearMe: 'Show what is near me',
  nearTitle: 'Near you',
  nearHint: 'The closest places and stations, nearest first.',
  nearClear: 'Clear',
  nearAway: (distance: string) => `${distance} away`,
  metres: (value: number) => `${value} m`,
  kilometres: (value: string) => `${value} km`,
  nearDenied: 'Location is blocked for this site. Allow it in the browser to use this.',
  nearFailed: 'Could not find where you are.',
  nearFar: 'You are outside Seoul, so there is nothing nearby to show.',
  youAreHere: 'You are here',

  // ---- stepping through the forecast, and how fresh the reading is
  loading: 'Loading the latest readings',
  live: 'Live',
  updatedAgo: (minutes: number) => (minutes < 1 ? 'updated just now' : `updated ${minutes} min ago`),
  updatedLongAgo: (hours: number) => `last reading ${hours} h ago`,
  asOfForecast: (time: string) => `The city’s forecast for ${time}`,
  headlineForecast: (count: number, time: string) =>
    count === 0
      ? `Nowhere is expected to be crowded at ${time}.`
      : count === 1
        ? `1 place is expected to be crowded at ${time}.`
        : `${count} places are expected to be crowded at ${time}.`,
  scrubPlay: 'Play the next 12 hours',
  scrubPause: 'Pause',
  scrubLabel: 'Hours ahead',
  scrubNow: 'Now',
  scrubBack: 'Back to now',

  // ---- directions
  routeTitle: 'Getting here',
  routeFromHere: 'From where I am',
  routeFromStation: 'From a station',
  routeSearch: 'Station name',
  routeClear: 'Clear',
  routeTotal: (minutes: number) => `About ${minutes} min`,
  routeChanges: (count: number) => (count === 0 ? 'no changes' : count === 1 ? '1 change' : `${count} changes`),
  routeFrom: (station: string) => `from ${station}`,
  routeWalk: (minutes: number, station: string) => `Walk about ${minutes} min to ${station}`,
  routeRide: (stops: number, minutes: number) => `${stops} ${stops === 1 ? 'stop' : 'stops'}, about ${minutes} min`,
  routeToward: (station: string) => `toward ${station}`,
  routeInner: 'inner loop, clockwise',
  routeOuter: 'outer loop, anticlockwise',
  routeBoard: (station: string) => `Board at ${station}`,
  routeChange: (station: string, minutes: number) => `Change at ${station}, about ${minutes} min`,
  routeArrive: (station: string) => `Get off at ${station}`,
  routeFullNow: (percent: number) => `Trains this way are about ${percent}% full at this hour`,
  routeNone: 'There is no way by subway on the lines this site has.',
  routeSame: 'You are already at this station.',
  routeNoStation: 'This place is not next to a station on this site, so there is no route here. The map links give directions.',
  routeAsk: 'Choose where you are starting from.',
  routeHint: 'Times are estimates from the distance between stations. There is no timetable in this data.',
  routeKakao: 'Directions in Kakao Map',
  routeGoogle: 'Directions in Google Maps',

  // ---- how full the trains are
  trainsTitle: 'How full the trains are',
  trainsTab: 'Trains',
  trainsDays: { weekday: 'Weekdays', saturday: 'Saturday', sunday: 'Sunday' } as Record<string, string>,
  trainsDayLabel: 'Kind of day',
  trainsBar: (time: string, percent: number) => `${time}: ${percent}% full`,
  trainsPeak: (time: string, percent: number) => `Fullest at ${time}, ${percent}%.`,
  trainsHint: (date: string) =>
    `34% means every seat is taken. 100% is what a car is built to carry. Seoul Metro’s averages for each half hour, as of ${date}. Lines 1 to 8 only.`,
  fullestTitle: 'The fullest trains',
  fullestTrainsHint: 'The worst half hour for each station and direction. Choose a line above to see only its trains.',
  fullestRow: (station: string, direction: string, time: string, percent: number) => `${station}, ${direction}: ${percent}% full at ${time}`,
  trainsNone: 'Seoul Metro’s figures cover Lines 1 to 8. This line is not in them.',
  crushRealTitle: 'Fullest trains',
  crushRealBody: (station: string, direction: string, percent: number) => `At ${station}, ${direction}: ${percent}% of what a car is built for.`,

  // ---- how this works
  howTitle: 'How this works',
  how: [
    {
      title: 'Where the crowd numbers come from',
      body: 'Seoul publishes an estimate of how many people are in 121 busy places, worked out from mobile phone data, with a crowd level and a 12-hour forecast for each. A small script asks for all 121 every 20 minutes.',
    },
    {
      title: 'No server',
      body: 'The script runs on a schedule on GitHub and saves each reading to a CSV file in the repository. This page reads one summary file straight from there, so there is no database and nothing to keep running.',
    },
    {
      title: 'Where the station numbers come from',
      body: 'Transit card taps at the gates: a year of monthly totals by hour, and eight weeks of daily totals. They count people entering and leaving, so changing trains inside a station is not in them. How full the trains are comes from Seoul Metro’s own half-hourly figures, for Lines 1 to 8.',
    },
    {
      title: 'What “usual” means',
      body: 'A place is compared with the same hour on earlier days of the same kind, weekdays or the weekend. Collection started on 22 November 2026, so these comparisons sharpen as the weeks add up.',
    },
  ],
  howCode: 'See the code on GitHub',

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

  asOf: (time) => `서울 ${time} 기준`,
  headlineCrowded: (count) => `지금 서울 ${count}곳이 붐빕니다.`,
  headlineNearly: (count) => `붐비는 곳은 없지만 ${count}곳이 약간 붐빕니다.`,
  headlineNone: '지금 서울에 붐비는 곳은 없습니다.',
  ledeNames: (level, names, more) => `${level}: ${names.join(', ')}${more ? ` 외 ${more}곳` : ''}.`,
  statusTop: (place, people) => `지금 사람이 가장 많은 곳은 ${place} (약 ${people}명)입니다.`,
  levelStripLabel: (parts) => `혼잡도별 장소 수: ${parts.join(', ')}`,
  levelCount: (count, level) => `${level} ${count}곳`,

  searchOpen: '장소와 지하철역 검색',
  searchHint: '한글이나 영어로 검색하세요. 홍대 같은 줄임말과 ㅎㄷ 같은 초성도 됩니다.',
  searchEmpty: '일치하는 결과가 없습니다. 더 짧게 입력해 보세요.',
  searchPlaces: '장소',
  searchStations: '지하철역',
  searchBusiest: '지금 사람이 가장 많은 곳',

  mapLabel: '장소와 지하철역의 혼잡도를 보여주는 서울 지도',
  layersLabel: '지도에 표시',
  layerPlaces: '장소',
  layerStations: '지하철역',
  zoomIn: '확대',
  zoomOut: '축소',
  zoomReset: '서울 전체 보기',
  legendPlaces: '원은 장소입니다. 색은 위에 표시된 혼잡도, 크기는 인구입니다.',
  legendStations: '점은 지하철역입니다. 색은 노선, 크기는 하루 승하차 인원입니다. 선은 역을 순서대로 이은 것으로 실제 선로와 다릅니다.',
  placesOnMap: (shown, total) => `현재 ${total}곳 중 ${shown}곳이 지도에 표시됩니다.`,
  mapHintTouch: '두 손가락으로 지도를 움직이세요',
  mapZoomHintCtrl: 'Ctrl 키를 누른 채 스크롤하면 지도가 확대·축소됩니다',
  mapZoomHintCmd: '⌘ 키를 누른 채 스크롤하면 지도가 확대·축소됩니다',
  mapUnavailable: '이 브라우저에서는 지도를 표시할 수 없습니다. 아래 목록은 그대로 사용할 수 있습니다.',
  mapStreetsFailed: '배경 지도를 불러오지 못해 표시만 보여줍니다.',
  mapSource: '지도: OpenFreeMap, © OpenMapTiles, 데이터 출처 OpenStreetMap.',

  none: '없음',

  tabNow: '지금',
  tabAll: (count) => `전체 ${count}곳`,
  fullest: '면적 대비 가장 붐비는 곳',
  fullestHint:
    '서울시는 장소별 평소 인구와 면적을 기준으로 혼잡도를 정합니다. 그래서 작은 시장이 사람이 훨씬 많은 큰 지역보다 위에 올 수 있습니다.',
  fullestMore: (count) => `외 ${count}곳이 더 있습니다.`,
  mostPeople: '사람이 가장 많은 곳',
  mostPeopleHint: '서울시가 추정한 지역 내 전체 인구입니다. 집에 있는 주민도 포함됩니다.',
  fewestPeople: '사람이 가장 적은 곳',
  fewestPeopleHint: '지금 가장 한산한 곳입니다.',
  barLabel: (percent) => `사람이 가장 많은 곳의 ${percent}%`,
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
  filterLabel: '분류별로 보기',
  filterAll: '전체',

  panelNow: (range) => `약 ${range}`,
  panelAt: (time) => `${time} 기준 (서울 시각)`,
  weekTitle: '요일·시간대별 인구',
  weekHint: '밝을수록 붐비는 시간대입니다. 칸을 가리키거나 누르면 값을 볼 수 있습니다. 테두리가 있는 칸이 현재 시간입니다.',
  hoursRecorded: (filled) => `지금까지 168시간 중 ${filled}시간 기록됨`,
  hoursRecordedHint: '20분마다 기록하므로 앞으로 7일 동안 한 주가 채워집니다.',
  dayTitle: '평균적인 하루',
  dayHint: '기록된 날짜를 기준으로 한 시간대별 평균 인구입니다.',
  chartPeople: '인구',
  cellEmpty: (time) => `${time}: 아직 기록 없음`,
  noReading: '아직 기록 없음',
  aboutPeople: (people) => `약 ${people}명`,
  cellPeople: (time, people) => `${time}: 약 ${people}명`,
  days: ['월', '화', '수', '목', '금', '토', '일'],
  daysLong: ['월요일', '화요일', '수요일', '목요일', '금요일', '토요일', '일요일'],

  tabStations: '지하철역',
  stationsLoadFailedTitle: '역 데이터를 불러오지 못했습니다',
  viewStations: '역별',
  viewLines: '노선별',
  viewLabel: '역별 또는 노선별로 보기',
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
  transfersHint: '역 안에서의 환승은 포함되지 않습니다.',
  wholeStationHint: '환승역은 모든 노선을 합쳐 역 전체로 집계합니다.',
  shinbundang: '신분당선은 이 데이터에 포함되지 않습니다.',
  colStation: '역',
  colShape: '하루 흐름',
  colPeak: '가장 붐비는 시간',
  colOn: '승차',
  colOff: '하차',
  colTotal: '합계',
  showMore: (count) => `${count}개 더 보기`,
  showing: (shown, total) => `${total}개 역 중 ${shown}개`,
  stationCount: (count) => `${count}개 역`,
  crushTitle: '가장 타기 힘든 시간',
  crushBody: (boardings) => `이 시간대에 이 노선 개찰구로 약 ${boardings}명이 들어옵니다.`,
  crushNote: '이 데이터에는 열차 혼잡도가 없어 승차 인원으로 대신 보여줍니다.',
  crushChartLabel: (line) => `${line} 시간대별 승차 인원`,
  crushBar: (hour, boardings) => `${hour}: 승차 ${boardings}명`,
  byLineTitle: '노선별 가장 붐비는 역',
  byLineHint: '환승역은 역 전체로 집계하므로 여러 노선에서 1위일 수 있습니다. 노선을 선택하면 해당 노선의 모든 역을 볼 수 있습니다.',
  byLineRow: (line, station, total) => `${line}: ${station}, 승하차 ${total}명`,
  byLineThen: (stations) => `다음은 ${stations.join(', ')}`,
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
  linesTitle: '이용한 개찰구',
  linesHint: '교통카드를 찍은 개찰구의 노선으로 집계되며, 실제로 탄 열차와 다를 수 있습니다. 역 안에서의 환승은 포함되지 않습니다.',
  noOwnGates: '전용 개찰구 없음',
  trendTitle: '최근 12개월',
  trendHint: '월별 하루 평균 승하차 인원입니다.',
  trendSeries: '하루 평균',
  stationsSource: '역 데이터: 서울 열린데이터광장, 서울시 지하철 호선별 역별 승하차 인원.',

  // ---- ranking by a chosen measure
  measureLabel: '정렬 기준',
  measures: { people: '인구', visitors: '방문객', usual: '평소 대비' },
  usualLocked: (have, needs) => `평소 대비 비교는 이전 ${needs}일치 기록이 쌓이면 켜집니다. 현재 ${have}일.`,
  mostVisitors: '방문객이 가장 많은 곳',
  mostVisitorsHint: '그 지역의 상주 인구가 아닌 사람들입니다. 서울시는 지난달 하루 4시간 이상, 10일 이상 연속으로 머문 사람을 상주 인구로 봅니다.',
  fewestVisitors: '방문객이 가장 적은 곳',
  fewestVisitorsHint: '대부분 그곳에 살거나 일하는 사람들입니다.',
  busierThanUsual: '평소보다 붐비는 곳',
  busierHint: '같은 종류의 이전 날(평일 또는 주말) 같은 시간대와 비교합니다.',
  quieterThanUsual: '평소보다 한산한 곳',
  quieterHint: '이 시간대 평소보다 가장 한산한 곳입니다.',
  visitorsDetail: (visitors, percent) => `방문객 약 ${visitors}명 (전체의 ${percent}%)`,
  usualDetail: (percent, now, usual) => `평소보다 ${Math.abs(percent)}% ${percent >= 0 ? '많음' : '적음'}. 지금 약 ${now}명, 평소 ${usual}명.`,
  visitorsBarLabel: (percent) => `방문객이 가장 많은 곳의 ${percent}%`,
  usualBarLabel: (percent) => `이 목록에서 가장 큰 변화의 ${percent}%`,

  // ---- the place panel
  ledeAhead: (names, more) => `서울시 예측으로는 ${names.join(', ')}${more ? ` 외 ${more}곳` : ''}이 곧 붐빌 것으로 보입니다.`,
  aheadName: (place, time) => `${place} (${time})`,
  forecastTitle: '앞으로 12시간',
  forecastHint: '서울시의 예측입니다. 높이는 인구, 색은 예상 혼잡도입니다.',
  forecastColumn: (hour, level, range) => `${hour}: ${level}, ${range}`,
  forecastPeak: (hour, level) => `${hour}경 가장 붐빌 것으로 예상됩니다 (${level}).`,
  whoTitle: '지금 있는 사람들',
  whoVisitors: (percent) => `방문객 ${percent}%`,
  whoRegulars: (percent) => `상주 인구 ${percent}%`,
  whoHint: '상주 인구는 지난달 하루 4시간 이상, 10일 이상 연속으로 이곳에 머문 사람입니다. 나머지는 방문객으로 봅니다.',
  ageTitle: '연령대별',
  ages: ['0~9세', '10대', '20대', '30대', '40대', '50대', '60대', '70대+'],
  ageColumn: (band, percent) => `${band}: ${percent}%`,
  usualNow: (percent, days) =>
    percent === 0
      ? `이 시간대 평소와 비슷합니다 (이전 ${days}일 기준).`
      : `이 시간대 평소보다 ${Math.abs(percent)}% ${percent > 0 ? '붐빕니다' : '한산합니다'} (이전 ${days}일 기준).`,
  bestTime: (quiet, busy) => `오늘 같은 날에는 보통 ${quiet}경이 가장 한산하고 ${busy}경이 가장 붐빕니다.`,

  // ---- pins and links
  pin: '페이지 맨 위에 고정',
  unpin: '고정 해제',
  pinnedTitle: '고정한 곳',
  pinnedHint: '고정 목록은 이 브라우저에 저장됩니다.',
  copyLink: '이 화면의 링크 복사',
  linkCopied: '링크를 복사했습니다',
  linkCopyFailed: '링크를 복사하지 못했습니다. 주소창에서 직접 복사해 주세요.',

  // ---- near me
  nearMe: '내 주변 보기',
  nearTitle: '내 주변',
  nearHint: '가까운 장소와 지하철역을 가까운 순으로 보여 줍니다.',
  nearClear: '지우기',
  nearAway: (distance) => `${distance} 거리`,
  metres: (value) => `${value}m`,
  kilometres: (value) => `${value}km`,
  nearDenied: '이 사이트의 위치 접근이 차단되어 있습니다. 브라우저에서 허용해 주세요.',
  nearFailed: '현재 위치를 찾지 못했습니다.',
  nearFar: '서울 밖에 계셔서 주변에 표시할 곳이 없습니다.',
  youAreHere: '현재 위치',

  // ---- stepping through the forecast, and how fresh the reading is
  loading: '최신 정보를 불러오는 중',
  live: '실시간',
  updatedAgo: (minutes) => (minutes < 1 ? '방금 업데이트' : `${minutes}분 전 업데이트`),
  updatedLongAgo: (hours) => `마지막 기록 ${hours}시간 전`,
  asOfForecast: (time) => `${time} 서울시 예측`,
  headlineForecast: (count, time) =>
    count === 0 ? `${time}에는 붐비는 곳이 없을 것으로 보입니다.` : `${time}에는 ${count}곳이 붐빌 것으로 보입니다.`,
  scrubPlay: '앞으로 12시간 재생',
  scrubPause: '일시정지',
  scrubLabel: '몇 시간 뒤',
  scrubNow: '지금',
  scrubBack: '지금으로 돌아가기',

  // ---- directions
  routeTitle: '여기로 가는 길',
  routeFromHere: '현재 위치에서',
  routeFromStation: '역에서 출발',
  routeSearch: '역 이름',
  routeClear: '지우기',
  routeTotal: (minutes) => `약 ${minutes}분`,
  routeChanges: (count) => (count === 0 ? '환승 없음' : `환승 ${count}회`),
  routeFrom: (station) => `${station} 출발`,
  routeWalk: (minutes, station) => `${station}까지 걸어서 약 ${minutes}분`,
  routeRide: (stops, minutes) => `${stops}개 역, 약 ${minutes}분`,
  routeToward: (station) => `${station} 방면`,
  routeInner: '내선순환',
  routeOuter: '외선순환',
  routeBoard: (station) => `${station}에서 승차`,
  routeChange: (station, minutes) => `${station}에서 환승, 약 ${minutes}분`,
  routeArrive: (station) => `${station}에서 하차`,
  routeFullNow: (percent) => `이 시간대 이 방향 열차 혼잡도는 약 ${percent}%입니다`,
  routeNone: '이 사이트에 있는 노선으로는 갈 수 있는 길이 없습니다.',
  routeSame: '이미 이 역에 있습니다.',
  routeNoStation: '이 장소는 이 사이트의 지하철역과 연결되어 있지 않아 경로를 보여 줄 수 없습니다. 지도 링크에서 길찾기를 할 수 있습니다.',
  routeAsk: '출발지를 선택해 주세요.',
  routeHint: '소요 시간은 역 사이 거리로 추정한 값입니다. 이 데이터에는 시간표가 없습니다.',
  routeKakao: '카카오맵에서 길찾기',
  routeGoogle: 'Google 지도에서 길찾기',

  // ---- how full the trains are
  trainsTitle: '열차 혼잡도',
  trainsTab: '열차',
  trainsDays: { weekday: '평일', saturday: '토요일', sunday: '일요일' },
  trainsDayLabel: '요일 구분',
  trainsBar: (time, percent) => `${time}: 혼잡도 ${percent}%`,
  trainsPeak: (time, percent) => `${time}에 가장 붐빕니다 (${percent}%).`,
  trainsHint: (date) => `34%는 좌석이 모두 찬 상태, 100%는 정원입니다. 서울교통공사의 30분 단위 평균값이며 ${date} 기준입니다. 1~8호선만 제공됩니다.`,
  fullestTitle: '가장 붐비는 열차',
  fullestTrainsHint: '역과 방향별로 가장 붐비는 30분입니다. 위에서 노선을 선택하면 해당 노선만 볼 수 있습니다.',
  fullestRow: (station, direction, time, percent) => `${station} ${direction}: ${time}에 혼잡도 ${percent}%`,
  trainsNone: '서울교통공사 자료는 1~8호선만 포함합니다. 이 노선은 자료에 없습니다.',
  crushRealTitle: '가장 붐비는 열차',
  crushRealBody: (station, direction, percent) => `${station} ${direction}: 정원의 ${percent}%.`,

  // ---- how this works
  howTitle: '이 사이트는 이렇게 만들어집니다',
  how: [
    {
      title: '혼잡도 숫자의 출처',
      body: '서울시는 주요 121곳에 지금 몇 명이 있는지를 통신 데이터로 추정해 혼잡도 단계, 12시간 예측과 함께 공개합니다. 작은 스크립트가 20분마다 121곳 전부를 조회합니다.',
    },
    {
      title: '서버가 없습니다',
      body: '스크립트는 GitHub에서 정해진 시간에 실행되어 기록을 저장소의 CSV 파일에 쌓습니다. 이 페이지는 거기서 요약 파일 하나를 바로 읽습니다. 데이터베이스도, 계속 켜 둘 서버도 없습니다.',
    },
    {
      title: '지하철역 숫자의 출처',
      body: '개찰구에서 찍힌 교통카드 기록입니다. 1년치 월별 시간대 합계와 8주치 일별 합계를 씁니다. 타고 내린 사람만 집계하므로 역 안에서의 환승은 포함되지 않습니다. 열차 혼잡도는 서울교통공사의 30분 단위 자료(1~8호선)를 사용합니다.',
    },
    {
      title: '‘평소’의 뜻',
      body: '같은 종류의 이전 날(평일 또는 주말) 같은 시간대와 비교합니다. 수집은 2026년 11월 22일에 시작했기 때문에 기록이 쌓일수록 비교가 정확해집니다.',
    },
  ],
  howCode: 'GitHub에서 코드 보기',

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

const LOCALE: Record<Lang, string> = { en: 'en-GB', ko: 'ko-KR' }

/** "2026-10" as "October 2026" or "2026년 10월". Pass `short` for an axis label such as "Oct". */
export function formatMonth(lang: Lang, month: string, short = false) {
  const [y, m] = month.split('-').map(Number)
  const options: Intl.DateTimeFormatOptions = short ? { month: 'short' } : { month: 'long', year: 'numeric' }
  return new Intl.DateTimeFormat(LOCALE[lang], { ...options, timeZone: 'UTC' }).format(new Date(Date.UTC(y, m - 1, 1)))
}

/** "2026-09-30" as "30 September 2026" or "2026년 9월 30일". */
export function formatDate(lang: Lang, day: string) {
  const [y, m, d] = day.split('-').map(Number)
  return new Intl.DateTimeFormat(LOCALE[lang], { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(y, m - 1, d)))
}

/** "2026-09-25" as "25 September" or "9월 25일". */
export function formatDay(lang: Lang, day: string) {
  const [y, m, d] = day.split('-').map(Number)
  return new Intl.DateTimeFormat(LOCALE[lang], { day: 'numeric', month: 'long', timeZone: 'UTC' }).format(
    new Date(Date.UTC(y, m - 1, d)),
  )
}
