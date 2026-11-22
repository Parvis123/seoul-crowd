import type { Lang } from '@/lib/i18n'

export const LINE_IDS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'gj', 'sb', 'gc', 'gg', 'arex', 'ui', 'sl', 'sh', 'other'] as const
export type LineId = (typeof LINE_IDS)[number]

const DARK_INK = '#101828'

// The card data and the station list file rail sections under their railway
// names. These are the lines passengers know them by.
const RAILWAY: Record<string, LineId> = {
  '1호선': '1',
  경부선: '1',
  경인선: '1',
  경원선: '1',
  장항선: '1',
  '2호선': '2',
  '3호선': '3',
  일산선: '3',
  '4호선': '4',
  과천선: '4',
  안산선: '4',
  진접선: '4',
  '5호선': '5',
  '6호선': '6',
  '7호선': '7',
  '7호선(인천)': '7',
  '8호선': '8',
  별내선: '8',
  '9호선': '9',
  '9호선2~3단계': '9',
  '9호선(연장)': '9',
  경의선: 'gj',
  경의중앙선: 'gj',
  중앙선: 'gj',
  분당선: 'sb',
  수인선: 'sb',
  경춘선: 'gc',
  경강선: 'gg',
  '공항철도 1호선': 'arex',
  공항철도1호선: 'arex',
  우이신설선: 'ui',
  신림선: 'sl',
  서해선: 'sh',
}

// The Gyeongwon railway is Line 1 north of Hoegi, but these stations on it are
// served by Gyeongui-Jungang trains.
const GYEONGWON_GJ = new Set(['서빙고', '옥수', '왕십리', '응봉', '이촌', '청량리', '한남'])

/** A subway line: its names, and the operator's own colour. */
export class Line {
  readonly id: LineId
  private readonly names: Record<Lang, string>
  /** The operator's colour for the line. */
  readonly color: string
  /** A text colour that reads on top of `color`. */
  readonly ink: string
  /** The number shown in the badge, for Lines 1 to 9. */
  readonly digit: string | null

  private constructor(id: LineId, names: Record<Lang, string>, color: string, ink: string, digit: string | null = null) {
    this.id = id
    this.names = names
    this.color = color
    this.ink = ink
    this.digit = digit
  }

  private static numbered(n: number, color: string, ink = '#fff') {
    return new Line(String(n) as LineId, { ko: `${n}호선`, en: `Line ${n}` }, color, ink, String(n))
  }

  /** Every line, in the order a map legend lists them. */
  static readonly all: readonly Line[] = [
    Line.numbered(1, '#0052A4'),
    Line.numbered(2, '#00A84D'),
    Line.numbered(3, '#EF7C1C'),
    Line.numbered(4, '#00A4E3'),
    Line.numbered(5, '#996CAC'),
    Line.numbered(6, '#CD7C2F'),
    Line.numbered(7, '#747F00'),
    Line.numbered(8, '#E6186C'),
    Line.numbered(9, '#BDB092', DARK_INK),
    new Line('gj', { ko: '경의중앙선', en: 'Gyeongui-Jungang' }, '#77C4A3', DARK_INK),
    new Line('sb', { ko: '수인분당선', en: 'Suin-Bundang' }, '#F5A200', DARK_INK),
    new Line('gc', { ko: '경춘선', en: 'Gyeongchun' }, '#0C8E72', '#fff'),
    new Line('gg', { ko: '경강선', en: 'Gyeonggang' }, '#003DA5', '#fff'),
    new Line('arex', { ko: '공항철도', en: 'AREX' }, '#0090D2', '#fff'),
    new Line('ui', { ko: '우이신설선', en: 'Ui-Sinseol' }, '#B0CE18', DARK_INK),
    new Line('sl', { ko: '신림선', en: 'Sillim' }, '#6789CA', '#fff'),
    new Line('sh', { ko: '서해선', en: 'Seohae' }, '#81A914', '#fff'),
    new Line('other', { ko: '기타', en: 'Other' }, '#8A8F98', '#fff'),
  ]

  private static readonly byId = new Map(Line.all.map((line) => [line.id, line]))

  static get(id: LineId): Line {
    return Line.byId.get(id)!
  }

  /**
   * The line for a railway name in the city's data, such as "경부선" (Line 1).
   * Returns null for lines this site has no figures for, such as Shinbundang.
   */
  static forRailway(railway: string, station: string): Line | null {
    if (railway === '경원선' && GYEONGWON_GJ.has(station)) return Line.get('gj')
    const id = RAILWAY[railway]
    return id ? Line.get(id) : null
  }

  name(lang: Lang): string {
    return this.names[lang]
  }

  get isNumbered(): boolean {
    return this.digit !== null
  }

  /** Where the line sits in `Line.all`, for sorting. */
  get order(): number {
    return LINE_IDS.indexOf(this.id)
  }
}
