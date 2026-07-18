# MASOFISH — Vercel-Ready Web App with Fish ID, Freshness, Weather, Tides and Waves

This folder is ready to deploy as a static site on Vercel. It includes the Stitch-based interface, the local TensorFlow.js / Teachable Machine fish-identification model, and live weather data from Open-Meteo.

## Included pages and files

- `index.html` — dashboard with live Cebu City weather summary
- `fish-identification.html` — image upload and AI identification
- `identification-result.html` — prediction results
- `tides-weather.html` — combined weather, estimated tide-height, tide-event and wave-conditions page
- `announcements.html`
- `recipes.html`
- `weather-api.js` — Open-Meteo atmospheric forecast integration and shared weather utilities
- `marine-api.js` — Open-Meteo Marine API integration for sea-level and wave estimates
- `model/` — `model.json`, `metadata.json`, and `weights.bin`

## Weather API

The application calls this endpoint directly from the browser:

```text
https://api.open-meteo.com/v1/forecast?latitude=10.3167&longitude=123.891&hourly=temperature_2m,wind_speed_10m,wind_direction_10m,pressure_msl,weather_code,precipitation_probability&timezone=auto
```

The coordinates point to Cebu City, Philippines. No weather API key or Vercel environment variable is required.

The app displays:

- Current forecast-hour temperature and weather condition
- Wind speed and direction
- Mean sea-level pressure
- Precipitation probability
- A 24-hour temperature chart
- A seven-day summary calculated from the hourly forecast
- A simple weather caution indicator based on upcoming wind, rain, and thunderstorm data

Forecast responses are stored in the browser for 15 minutes. If the live request temporarily fails, the most recent saved forecast may be shown.

### Marine tide and wave module

The combined Tides & Weather page also calls:

```text
https://marine-api.open-meteo.com/v1/marine?latitude=10.3157&longitude=123.8854&hourly=sea_level_height_msl,wave_height&current=wave_height,sea_level_height_msl&timezone=auto
```

It displays the current estimated sea-level height, current wave height, a rising/falling trend, estimated high and low tide events, and a 24-hour tide curve. High and low tide times are calculated from hourly local maxima and minima. These values are planning estimates relative to global mean sea level and must not be used for navigation.


## Deploy using GitHub

1. Create a new GitHub repository.
2. Upload the contents of this folder to the repository root. Do not upload only the outer ZIP.
3. In Vercel, choose **Add New → Project** and import the repository.
4. Use **Other** as the Framework Preset.
5. Leave the Build Command empty.
6. Leave the Output Directory empty so Vercel serves the project root.
7. Select **Deploy**.

## Deploy using the Vercel CLI

From inside this folder:

```bash
npm install -g vercel
vercel
```

For a production deployment:

```bash
vercel --prod
```

## Important notes

- Fish identification runs in the visitor's browser after the model is downloaded.
- No external fish-identification API key is required.
- No Open-Meteo API key is required for the weather or marine integrations.
- The deployed website needs internet access to retrieve current weather data.
- TensorFlow.js, the Teachable Machine image library, Tailwind CSS, Google Fonts, and Material Symbols are currently loaded from public CDNs.
- The fish model currently recognizes Milkfish, Indian Mackerel, Eel, Tilapia, Scatfish, Mullet, Rabbitfish, and No Fish.
- Update the model by replacing the three files inside `model/` while preserving their filenames.

## Integrated Fish Freshness Module

The freshness checker is located directly on `fish-identification.html` under the `#freshness` section.

The user may upload:
- an eye close-up,
- a gill close-up, or
- both images.

For each valid body-part image, the application calculates a conditional visual freshness score:

- Eye score = `eye-fresh / (eye-fresh + eye-non-fresh)`
- Gill score = `gill-fresh / (gill-fresh + gill-non-fresh)`

When both samples are valid, the **overall visual freshness percentage** is the arithmetic average of the eye and gill scores. When only one valid sample is available, the overall score is based on that sample alone.

The percentage is a model-derived visual score. It is not a literal percentage of freshness, shelf life, or food safety.

## Automatic Fish ID Photo Reuse

The image selected in the Fish Identification panel is automatically linked to the freshness module on the same page. Users do not need to upload the same image again.

The freshness model tests whether the linked image mainly contains eye or gill characteristics. A dedicated eye or gill close-up overrides the linked image for that indicator. Whole-fish photos may be rejected when the eye or gills are too small or unclear.

The visual freshness percentage remains a model-derived score and must not be described as a literal percentage of food freshness or safety.

## One-Click Identify + Freshness

Clicking **Identify Fish + Freshness** now performs both actions in one step:

1. The species-identification model predicts the fish class.
2. The freshness model evaluates the linked Fish ID photo and any dedicated eye/gill close-ups.
3. The result page opens with both the species result and the automatic freshness summary.

The freshness analysis is stored in session storage under `masofishFreshness` so it can be shown on `identification-result.html`.

## Supabase Login and Sign Up

The application now includes a Supabase-ready email/password authentication interface.

Before real authentication will work:

1. Add the Supabase Project URL and Publishable/anon key to `supabase-config.js`.
2. Configure the Vercel site and `auth.html` as allowed Supabase Auth URLs.
3. Disable prototype mode for the final production deployment.
4. Use Supabase Row Level Security for any private database tables.

The browser must only receive the Publishable or anon key. Never use the `service_role` key in this static application.

See `SUPABASE_SETUP.md` for complete instructions.
