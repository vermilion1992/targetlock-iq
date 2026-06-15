# Geomagnetics (WMM2025) and grid CRS validation

This note documents the two geodesy modules added in the Geodesy + DnD release
(RC5): the in-house World Magnetic Model implementation
(`lib/drilling/geomag.ts`) and the proj4-based grid engine
(`lib/drilling/grid-crs.ts`). Both follow the same validated-math ethos as the
desurvey benchmarks: every number the app computes is tested against published
authoritative values, and the limits of each model are stated explicitly.

## 1. WMM2025 magnetic declination (`geomag.ts`)

### Model

- World Magnetic Model 2025, degree/order 12 spherical-harmonic main-field
  model, produced by NOAA NCEI and the British Geological Survey. Released
  2024-12-17, valid 2025.0–2030.0.
- Coefficients are embedded verbatim from the official `WMM.COF` file (epoch
  2025.0, 90 Gauss coefficient rows with linear secular-variation terms). The
  WMM coefficient data is public domain.
- No npm dependency is used: the popular `geomag` package still ships the
  expired WMM2020 model, so the field evaluation is implemented in-house
  (~150 lines plus the coefficient table).

### Algorithm (per the WMM2025 Technical Report)

1. Geodetic → geocentric conversion on the WGS84 ellipsoid
   (a = 6378.137 km, 1/f = 298.257223563); input height is metres/kilometres
   above the ellipsoid.
2. Gauss coefficients adjusted to the evaluation date:
   g(t) = g₀ + (t − 2025.0)·ġ (same for h).
3. Spherical-harmonic summation with Schmidt semi-normalized associated
   Legendre functions, computed via the Gauss-normalized recursion with
   separate Schmidt factors (the same construction as NOAA's reference
   `GeomagnetismLibrary.c`). Reference sphere radius 6371.2 km.
4. Field vector rotated from the geocentric to the geodetic frame.
5. Declination D = atan2(B_east, B_north); inclination, H and F are also
   reported.

### Validation (`__tests__/geomag.test.ts`)

- **All 100 official NOAA WMM2025 test values** (the published
  `WMM2025_TEST_VALUES.txt` table, epochs 2025.0–2029.5, altitudes 0–98 km,
  latitudes 89°N–87°S) are asserted:
  - declination and inclination to **±0.005°** (the table's printed precision),
  - horizontal and total intensity to **±0.01 nT**.
- Warnings are tested for dates outside the 2025.0–2030.0 validity window and
  for blackout-zone locations (H < 2000 nT, where compass declination is
  meaningless; a softer caution fires below 6000 nT, matching NOAA's
  blackout-zone definitions).

### Limits

- Main field only — no crustal anomalies (use WMMHR or a local survey where
  crustal effects matter, e.g. near magnetic ore bodies: exactly the
  environments exploration drills in. The model gives the regional declination;
  local magnetics can shift it materially. This is stated in the UI's
  provenance line and remains a site-verification item).
- Linear secular variation only; outside 2025–2030 the result is an
  extrapolation and is flagged as such.

## 2. Grid conversions and convergence (`grid-crs.ts`)

### Scope

A deliberately scoped grid registry — the transverse-Mercator grids
exploration teams actually quote:

| Family | Zones | EPSG | Datum/ellipsoid |
| --- | --- | --- | --- |
| MGA2020 | 46–59 | 7846–7859 | GDA2020 / GRS80 |
| MGA94 | 49–56 | 28349–28356 | GDA94 / GRS80 |
| WGS84 UTM N | 1–60 | 32601–32660 | WGS84 |
| WGS84 UTM S | 1–60 | 32701–32760 | WGS84 |

Projection math is proj4js. Lat/longs are treated as being on the grid's own
datum: GDA2020 ≈ GDA94 ≈ WGS84 agree at the metre level or better (plate
motion aside), which is inside collar-pickup accuracy for exploration use.
**No datum-shift / plate-motion transformations are performed**, and unknown
EPSG codes degrade honestly to today's metadata-only behaviour with an
"unrecognized grid" notice.

### Grid convergence

Computed by finite difference: project the point and a second point ~11 m due
true north; the grid bearing of true north is atan2(ΔE, ΔN). The app stores
the negation — the east-positive "added to a grid azimuth to obtain a true
azimuth" convention used by `ReferenceSystemConfig.gridRotationDeg` — so the
auto-filled value is exactly what the dashboard's azimuth conversion consumes.
Note survey-control listings using the GDA technical-manual convention
("added to a true azimuth to obtain a grid bearing") quote the same angle with
the opposite sign; the UI hint states the convention.

The finite-difference approach is projection-agnostic (no Redfearn series
needed) and is itself validated against published control values below.

### Validation (`__tests__/grid-crs.test.ts`)

- **Published control values:**
  - *SSM FREMANTLE 64* (Landgate WA GOLA listing, GDA2020/MGA2020 zone 50):
    lat S 32°02′07.16398″, lon E 115°45′12.74082″ → E 382 306.176,
    N 6 454 969.831, convergence −0°39′40.50″ (GDA convention). Forward
    projection asserted to **±5 mm**; convergence to **±0.001°**.
  - *Flinders Peak* (GDA2020 Technical Manual worked example, zone 55):
    lat S 37°57′03.7203″, lon E 144°25′29.5244″ → E 273 741.297,
    N 5 796 489.777, asserted to **±5 mm**.
- **Round-trips** (lat/long → grid → lat/long → grid) below **1 mm** across
  MGA2020, MGA94 and UTM north/south, including out-of-zone points.
- **Convergence sign/magnitude:** ~0 on a central meridian; matches the
  textbook approximation atan(tan Δλ · sin φ) in the northern hemisphere;
  MGA94 and MGA2020 agree to 1e-9° for the same zone.
- **Zone suggestion:** MGA2020 zones inside an Australian bounding box
  (Kalgoorlie → 51, Sydney → 56, Alice Springs → 53), hemisphere-aware WGS84
  UTM elsewhere (Nevada → 11N, Atacama → 19S).

### Limits

- Not a certified geodesy engine: no NTv2 grid-shift files, no vertical datums
  (AHD vs ellipsoidal heights), no plate-motion epoch propagation, no support
  for local/engineering mine grids (those remain metadata with honest
  notices).
- Collar elevations remain whatever datum the site uses (typically AHD in
  Australia); the lat/long→E/N conversion does not touch elevation.

## 3. Where the values flow

```
collar / origin lat-long
  ├─ geomag.ts (WMM2025) ──► PCS magneticDeclinationDeg ─┐
  └─ grid-crs.ts (proj4) ──► PCS gridConvergenceDeg ─────┤
                       └───► collar E/N (CollarStep)     │
                                                         ▼
                              plannerReferenceSystem bridge (RC "math integrity")
                                                         ▼
                              hole.referenceSystem → dashboard azimuth conversion
```

The auto buttons fill the same PCS fields users could already type by hand;
nothing in the desurvey or clearance math changed in this release.
