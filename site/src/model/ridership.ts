/** The hours trains run, in the order of a service day: 05:00 through to 01:00. */
export const SERVICE_HOURS = [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 0, 1] as const

const sum = (list: readonly number[]) => list.reduce((total, value) => total + value, 0)

/**
 * How many people board and leave at a station, or through one line's gates
 * at a station. Every method takes an hour of the day, or nothing for the whole day.
 */
export class Ridership {
  /** Boardings on an average day, for each clock hour 0 to 23. */
  readonly on: readonly number[]
  /** Exits, the same way. */
  readonly off: readonly number[]
  /** Average boardings + exits for each weekday, Monday first. Null when there are no daily figures. */
  readonly weekdays: readonly number[] | null
  /** Boardings + exits for each recorded month, oldest first. Null where the station has no figure. */
  readonly monthly: readonly (number | null)[]

  constructor(
    on: readonly number[],
    off: readonly number[],
    weekdays: readonly number[] | null,
    monthly: readonly (number | null)[],
  ) {
    this.on = on
    this.off = off
    this.weekdays = weekdays
    this.monthly = monthly
  }

  /** Several sets of figures added together, such as each line's gates at one station. */
  static combine(parts: readonly Ridership[]): Ridership {
    const hours = Array.from({ length: 24 }, (_, h) => h)
    const withDays = parts.filter((part) => part.weekdays)
    const months = Math.max(0, ...parts.map((part) => part.monthly.length))
    return new Ridership(
      hours.map((h) => sum(parts.map((part) => part.on[h]))),
      hours.map((h) => sum(parts.map((part) => part.off[h]))),
      withDays.length ? Array.from({ length: 7 }, (_, d) => sum(withDays.map((part) => part.weekdays![d]))) : null,
      Array.from({ length: months }, (_, m) => {
        const values = parts.map((part) => part.monthly[m]).filter((value): value is number => value != null)
        return values.length ? sum(values) : null
      }),
    )
  }

  boardings(hour: number | null = null): number {
    return hour === null ? sum(this.on) : this.on[hour]
  }

  exits(hour: number | null = null): number {
    return hour === null ? sum(this.off) : this.off[hour]
  }

  /** Boardings and exits together. */
  total(hour: number | null = null): number {
    return this.boardings(hour) + this.exits(hour)
  }

  /** The clock hour with the most boardings and exits. */
  get busiestHour(): number {
    return SERVICE_HOURS.reduce<number>((best, h) => (this.total(h) > this.total(best) ? h : best), SERVICE_HOURS[0])
  }

  /** The clock hour with the most boardings, which is when it is hardest to get on. */
  get busiestBoardingHour(): number {
    return SERVICE_HOURS.reduce<number>((best, h) => (this.on[h] > this.on[best] ? h : best), SERVICE_HOURS[0])
  }

  /** Monday = 0. Null when there are no daily figures. */
  get busiestWeekday(): number | null {
    return this.weekdays ? this.weekdays.indexOf(Math.max(...this.weekdays)) : null
  }

  /** One entry for each hour trains run, first train to last. */
  get throughTheDay(): { hour: number; boardings: number; exits: number; total: number }[] {
    return SERVICE_HOURS.map((hour) => ({ hour, boardings: this.on[hour], exits: this.off[hour], total: this.total(hour) }))
  }
}
