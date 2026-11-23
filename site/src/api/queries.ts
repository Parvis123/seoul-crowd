import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

import { type RawCrowdingFile, TrainCrowding } from '@/model/crowding'
import { Line } from '@/model/line'
import { Network } from '@/model/network'
import { PlaceDirectory, type RawPlaceFile } from '@/model/place'
import { type RawStationFile, StationDirectory } from '@/model/station'

// The collector saves its files on the main branch, so the site shows live
// data from any branch and from a local dev server.
const DATA = 'https://raw.githubusercontent.com/Parvis123/seoul-crowd/main/data'

async function getJson<T>(file: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(`${DATA}/${file}`, { cache: 'no-store', signal })
  if (!response.ok) throw new Error(`${file} returned ${response.status}`)
  return response.json()
}

const MINUTE = 60_000

// Each file is turned into its model inside the fetch, so the cache holds one built
// directory and every component that asks gets that same one. (A `select` would build
// a separate copy for each component, and two copies of a station are not equal.)

/** The crowd readings. The collector saves new ones every 20 minutes, so this checks every 5. */
export function usePlaces() {
  return useQuery({
    queryKey: ['places'],
    queryFn: async ({ signal }) => PlaceDirectory.fromFile(await getJson<RawPlaceFile>('weekly.json', signal)),
    staleTime: MINUTE,
    refetchInterval: 5 * MINUTE,
  })
}

/** The station figures. They change once a day. */
export function useStations() {
  return useQuery({
    queryKey: ['stations'],
    queryFn: async ({ signal }) => StationDirectory.fromFile(await getJson<RawStationFile>('stations.json', signal)),
    staleTime: 6 * 60 * MINUTE,
  })
}

/**
 * How full the trains are. The file is large and changes a few times a year, so
 * it is fetched only when something on screen needs it, and then kept.
 */
export function useCrowding(): TrainCrowding | null {
  const stations = useStations().data
  const file = useQuery({
    queryKey: ['crowding'],
    queryFn: ({ signal }) => getJson<RawCrowdingFile>('congestion.json', signal),
    staleTime: Infinity,
    gcTime: Infinity,
  }).data
  return useMemo(
    () => (file && stations ? new TrainCrowding(file, (n) => Line.all.find((line) => line.digit === String(n)) ?? null, (line, name) => stations.stationAt(line, name)) : null),
    [file, stations],
  )
}

/** Places and stations joined up. Null until the readings have loaded. */
export function useNetwork(): Network | null {
  const places = usePlaces().data
  const stations = useStations().data
  return useMemo(() => (places ? new Network(places, stations ?? null) : null), [places, stations])
}
