import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

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

// Defined once so React Query can tell the function has not changed and reuse its result.
const toPlaces = (file: RawPlaceFile) => PlaceDirectory.fromFile(file)
const toStations = (file: RawStationFile) => StationDirectory.fromFile(file)

/** The crowd readings. The collector saves new ones every 20 minutes, so this checks every 5. */
export function usePlaces() {
  return useQuery({
    queryKey: ['places'],
    queryFn: ({ signal }) => getJson<RawPlaceFile>('weekly.json', signal),
    select: toPlaces,
    staleTime: MINUTE,
    refetchInterval: 5 * MINUTE,
  })
}

/** The station figures. They change once a day. */
export function useStations() {
  return useQuery({
    queryKey: ['stations'],
    queryFn: ({ signal }) => getJson<RawStationFile>('stations.json', signal),
    select: toStations,
    staleTime: 6 * 60 * MINUTE,
  })
}

/** Places and stations joined up. Null until the readings have loaded. */
export function useNetwork(): Network | null {
  const places = usePlaces().data
  const stations = useStations().data
  return useMemo(() => (places ? new Network(places, stations ?? null) : null), [places, stations])
}
