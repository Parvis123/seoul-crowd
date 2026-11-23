# Seoul crowd: the site

Where Seoul is busy and where it is quiet, right now: 121 places the city measures, and every subway station. The data is collected by the scripts on the `main` branch; this folder is the website that reads it.

## Run it

```
npm install
npm run dev
```

The site reads its data straight from the `main` branch on GitHub, so a local copy shows live numbers.

| Command | What it does |
|---|---|
| `npm run dev` | Starts the site at `localhost:5173/seoul-crowd/` |
| `npm test` | Runs the model's tests |
| `npm run lint` | Checks the code with oxlint |
| `npm run build` | Type-checks and builds into `dist` |

The same three checks run on GitHub on every push to `dev` (`.github/workflows/site.yml`).

## How it is put together

- **`src/model`** holds everything the site knows, as plain classes with no React in them. `Place` and `Station` are the two things on the page. `PlaceDirectory` and `StationDirectory` build them from the collector's files and deal with the quirks in the city's data. `Network` joins the two: which places are named after which stations, what is near a point, and one search across both. `Measure` is a way to rank places (people, visitors, against usual). `route.ts` works out the order of stops along each line so the map can draw them.
- **`src/api/queries.ts`** fetches the two data files with React Query and hands them to the model.
- **`src/components`** is the page. `map/` draws the map with MapLibre on OpenFreeMap tiles.
- **`src/lib`** has the text in both languages (`i18n.ts`), the state kept in the address (`address.ts`) and pins kept in the browser (`pins.ts`).

## Links

What you are looking at is kept in the address, so any view can be sent to someone:

| Address | Opens |
|---|---|
| `?place=POI007` | A place's panel |
| `?station=합정` | A station's panel |
| `?tab=stations&line=6` | The stations on Line 6, busiest first |
| `?tab=stations&view=lines` | The busiest stations on each line |
| `?by=visitors` | The lists ranked by visitors |
| `?lang=ko` | The site in Korean |

## What the numbers leave out

- **Places:** the head count is the city's estimate from mobile phone data and includes residents at home, which is why the site also ranks by visitors and against each place's own usual.
- **Stations:** card taps at the gates. A tap is filed under the line that owns the gate, not the train the person rides, and changing trains inside a station is not counted. So stations are ranked whole, and the per-line split is shown only as "which gates people use".
- **Lines on the map** join the stations in order. They are not the exact track.
