import type { StyleSpecification } from 'maplibre-gl'

import type { Lang } from '@/lib/i18n'

// The background map: streets, water and place names from OpenFreeMap, which
// serves OpenStreetMap data with no key. Its grey styles are recoloured here so
// the map sits in this site's palette instead of looking pasted in.

export type Theme = 'light' | 'dark'

export const BASEMAP_URL: Record<Theme, string> = {
  dark: 'https://tiles.openfreemap.org/styles/dark',
  light: 'https://tiles.openfreemap.org/styles/positron',
}

// ---------- colour ----------

type Hsla = { h: number; s: number; l: number; a: number }

const NAMED: Record<string, [number, number, number]> = { black: [0, 0, 0], white: [255, 255, 255] }

function fromRgb(r: number, g: number, b: number, a: number): Hsla {
  const [rn, gn, bn] = [r / 255, g / 255, b / 255]
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const l = (max + min) / 2
  const d = max - min
  if (d === 0) return { h: 0, s: 0, l, a }
  const s = d / (1 - Math.abs(2 * l - 1))
  const h = max === rn ? ((gn - bn) / d) % 6 : max === gn ? (bn - rn) / d + 2 : (rn - gn) / d + 4
  return { h: (h * 60 + 360) % 360, s, l, a }
}

/** Reads the colour formats the styles use: hex, rgb(), rgba(), hsl(), hsla(). Null for anything else. */
export function parseColor(input: string): Hsla | null {
  const text = input.trim().toLowerCase()
  if (NAMED[text]) return fromRgb(...NAMED[text], 1)

  const hex = /^#([0-9a-f]{3,8})$/.exec(text)?.[1]
  if (hex && [3, 4, 6, 8].includes(hex.length)) {
    const wide = hex.length <= 4 ? [...hex].map((c) => c + c).join('') : hex
    const [r, g, b, a] = [0, 2, 4, 6].map((i) => (i < wide.length ? parseInt(wide.slice(i, i + 2), 16) : 255))
    return fromRgb(r, g, b, a / 255)
  }

  const call = /^(rgb|hsl)a?\(([^)]*)\)$/.exec(text)
  if (!call) return null
  const parts = call[2].split(/[\s,/]+/).filter(Boolean)
  const numbers = parts.map((part) => parseFloat(part))
  if (numbers.length < 3 || numbers.some(Number.isNaN)) return null
  const alpha = numbers[3] === undefined ? 1 : parts[3].endsWith('%') ? numbers[3] / 100 : numbers[3]
  if (call[1] === 'rgb') return fromRgb(numbers[0], numbers[1], numbers[2], alpha)
  return { h: numbers[0], s: numbers[1] / 100, l: numbers[2] / 100, a: alpha }
}

const clamp = (value: number) => Math.min(1, Math.max(0, value))
const css = ({ h, s, l, a }: Hsla) => `hsla(${Math.round(h)}, ${Math.round(s * 100)}%, ${(l * 100).toFixed(1)}%, ${Number(a.toFixed(2))})`

/** One of the style's colours, moved into this site's palette. Lightness is kept so the map's own contrast survives. */
function recolour(color: Hsla, theme: Theme, layer: string, property: string): Hsla {
  const text = property === 'text-color'
  if (theme === 'dark') {
    // Night: navy land, a bluer river, and labels lifted so they read on it.
    if (layer === 'water') return { h: 216, s: 0.58, l: 0.14, a: color.a }
    if (text) return { h: 222, s: 0.2, l: clamp(0.3 + color.l * 0.8), a: color.a }
    // Anything brighter than the land (streets, rail, building edges) is lifted further, or the streets vanish.
    return { h: 225, s: 0.4, l: clamp(0.03 + color.l * 1.1 + Math.max(0, color.l - 0.06) * 0.9), a: color.a }
  }
  if (layer === 'water') return { h: 212, s: 0.5, l: 0.84, a: color.a }
  return { h: 225, s: text ? 0.15 : 0.2, l: color.l, a: color.a }
}

// ---------- the style ----------

type Json = string | number | boolean | null | Json[] | { [key: string]: Json }

/** Replaces every colour inside a paint value, which may be a plain string or a nested expression. */
function mapColors(value: Json, change: (color: Hsla) => Hsla): Json {
  if (typeof value === 'string') {
    const color = parseColor(value)
    return color ? css(change(color)) : value
  }
  if (Array.isArray(value)) return value.map((item) => mapColors(item, change))
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, mapColors(item, change)]))
  }
  return value
}

// The styles write both scripts on every label ("Hongdae 홍대"). One language at a time reads better.
const LABEL: Record<Lang, Json> = {
  en: ['coalesce', ['get', 'name:latin'], ['get', 'name_en'], ['get', 'name']],
  ko: ['coalesce', ['get', 'name:nonlatin'], ['get', 'name']],
}

// Road numbers, one-way arrows and airport icons are for drivers; here they only crowd the marks.
const CLUTTER = /shield|oneway|highway_name_motorway|airport/

/** OpenFreeMap's style, recoloured for the theme, with labels in one language and the driving clutter removed. */
export function styleFor(source: StyleSpecification, theme: Theme, lang: Lang): StyleSpecification {
  const layers = source.layers.filter((layer) => !CLUTTER.test(layer.id)).map((layer) => {
    const next = { ...layer } as Record<string, unknown>
    if ('paint' in layer && layer.paint) {
      next.paint = Object.fromEntries(
        Object.entries(layer.paint).map(([property, value]) => [
          property,
          property.endsWith('-color')
            ? mapColors(value as Json, (color) => recolour(color, theme, layer.id, property))
            : value,
        ]),
      )
    }
    if (layer.type === 'symbol' && JSON.stringify(layer.layout?.['text-field'] ?? '').includes('name:latin')) {
      next.layout = { ...layer.layout, 'text-field': LABEL[lang] }
    }
    return next
  })
  return { ...source, layers } as StyleSpecification
}
