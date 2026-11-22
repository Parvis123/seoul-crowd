# Seoul crowd history: collector

Once an hour this fetches how many people are in a few Seoul places and stores the readings. After a few weeks the readings show when each place is usually busy or quiet, which the city's own live service does not keep.

Data: Seoul Open Data Plaza, Seoul real-time city data (`citydata_ppltn`). Reuse requires naming the source.

## What is here

| File | What it does |
| --- | --- |
| `collect.mjs` | Fetches each place and saves the readings. Needs Node 18 or newer, no dependencies. |
| `places.json` | The places to collect. Names must match the city's official place names exactly. |
| `.github/workflows/collect.yml` | Runs the collector every hour on GitHub and saves the results to the repository. |
| `data/readings-YYYY-MM.csv` | Every reading, one file per month. Created on the first run. |
| `data/weekly.json` | Average people per weekday and hour for each place. This is the only file the website reads. |

## Setup

1. **Get an API key.** Sign up at data.seoul.go.kr and request a general Open API key (인증키 신청). It is free.
2. **Create a GitHub repository** and add these files to it, keeping the `.github/workflows` folder.
3. **Add the key as a secret.** In the repository: Settings, then Secrets and variables, then Actions, then New repository secret. Name it `SEOUL_API_KEY`.
4. **Run it once by hand.** Actions tab, "Collect crowd readings", Run workflow. Check that a `data` folder appears with a CSV and `weekly.json`.

After that it runs by itself every hour. GitHub's schedule can be several minutes late, which does not matter for hourly readings.

To try it on your own computer first:

```
SEOUL_API_KEY=your-key node collect.mjs
```

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
