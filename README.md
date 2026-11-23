# Seoul crowd history: collector

Every 20 minutes this fetches how many people are in a few Seoul places and stores the readings. After a few weeks the readings show when each place is usually busy or quiet, which the city's own live service does not keep.

Data: Seoul Open Data Plaza, Seoul real-time city data (`citydata_ppltn`). Reuse requires naming the source.

## What is here

| File | What it does |
| --- | --- |
| `collect.mjs` | Fetches each place and saves the readings. Needs Node 18 or newer, no dependencies. |
| `places.json` | The places to collect. Names must match the city's official place names exactly. |
| `.github/workflows/collect.yml` | Runs the collector every 20 minutes on GitHub and saves the results to the repository. |
| `data/readings-YYYY-MM.csv` | Every reading, one file per month. Created on the first run. |
| `data/weekly.json` | For each place: the latest reading with the city's 12-hour forecast and who is there, the usual for this hour, and average people per weekday and hour. The website reads this for places. |
| `collect-stations.mjs` | Fetches subway ridership for every station. Same key, no dependencies. |
| `.github/workflows/stations.yml` | Runs the station collector once a day. |
| `data/stations.json` | Boardings and exits for every station. The website reads this for stations. |

## Setup

1. **Get an API key.** Sign up at data.seoul.go.kr and request a general Open API key (인증키 신청). It is free.
2. **Create a GitHub repository** and add these files to it, keeping the `.github/workflows` folder.
3. **Add the key as a secret.** In the repository: Settings, then Secrets and variables, then Actions, then New repository secret. Name it `SEOUL_API_KEY`.
4. **Run it once by hand.** Actions tab, "Collect crowd readings", Run workflow. Check that a `data` folder appears with a CSV and `weekly.json`.

After that it runs by itself every 20 minutes. GitHub's schedule can be several minutes late.

To try it on your own computer first:

```
SEOUL_API_KEY=your-key node collect.mjs
```

## Stations

`collect-stations.mjs` uses four more datasets from the same portal, with the same key:

| Dataset | What it gives |
| --- | --- |
| `CardSubwayTime` | Boardings and exits for each station and hour, as a total for the month. A month appears a few days after it ends. |
| `CardSubwayStatsNew` | Boardings and exits for each station and day, about three days behind. |
| `SearchSTNBySubwayLineInfo` | The English name of each station. |
| `subwayStationMaster` | Where each station is. |

Each run asks for the last 12 months and the last 8 weeks, about 75 requests, and rewrites `data/stations.json`. The city keeps this history itself, so the collector stores nothing else and a failed run loses nothing.

In `data/stations.json`, each entry is one station on one line:

- `on` and `off`: boardings and exits for an average day of the latest month, one number for each hour from 00 to 23.
- `monthly`: boardings plus exits for each month listed in `months`.
- `weekdays`: average boardings plus exits for each weekday, Monday first.

`coordinates` lists where each station is, by name, with one position for each line that stops there.

`stops` lists every stop as line, stop number and station name. The stop numbers give the order of stations along a line, which the website uses to draw the lines on the map.

These are card taps at the gates, so they show how busy a station is, not how full the trains are. The hourly figures are monthly totals, so they cannot be split by weekday.

## If a place fails

The run prints each failed place with the code the API returned. A wrong or misspelled name shows up here on the first run. The official list of 121 names and codes is the spreadsheet attached to the dataset page on data.seoul.go.kr ("서울시 주요 121장소 목록"). A place code such as `POI033` works in place of a name.

`ERROR-337` means the key's daily call limit was reached.

## Scaling up to all 121 places

1. Copy the 121 official names from that spreadsheet into a text file, one name per line, for example `places-all.txt`.
2. Change the run line in `collect.yml` to `node collect.mjs --places places-all.txt`.

Hourly collection of 121 places is about 2,900 calls a day. Check your key's daily limit on the portal's key page before going more often than hourly.

## Notes

- The API uses plain HTTP and the key is part of the address, so the collector never prints the address. Keep the key in the secret, not in the code.
- Readings are stamped with Seoul local time (`ppltn_time`). The city publishes each reading roughly 15 minutes after the period it covers.
- The same reading is never stored twice, so running the collector more often than the data changes is harmless.
