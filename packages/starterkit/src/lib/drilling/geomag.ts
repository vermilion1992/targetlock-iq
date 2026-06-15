/**
 * World Magnetic Model 2025 (WMM2025) — magnetic declination.
 *
 * Self-contained implementation of the degree/order-12 spherical-harmonic
 * geomagnetic main-field model published by NOAA NCEI / British Geological
 * Survey (released 2024-12-17, valid 2025.0–2030.0).
 *
 * Algorithm follows the WMM2025 Technical Report (NOAA NCEI):
 *  1. Convert geodetic coordinates (WGS84) to geocentric spherical.
 *  2. Time-adjust Gauss coefficients with the linear secular-variation terms.
 *  3. Sum the spherical-harmonic series with Schmidt semi-normalized
 *     associated Legendre functions (degree/order 12).
 *  4. Rotate the field vector from the geocentric to the geodetic frame.
 *  5. Declination D = atan2(East, North).
 *
 * Validated against NOAA's official WMM2025 test-value table (100 points,
 * 2025.0–2029.5) to 0.01° in `__tests__/geomag.test.ts`. Derivation and
 * provenance notes: docs/targetlock-pitch/math-validation/geomag-and-grids.md
 *
 * Coefficient data: WMM2025 WMM.COF, NOAA NCEI (public domain).
 * https://www.ncei.noaa.gov/products/world-magnetic-model
 */

export const WMM_MODEL_NAME = "WMM-2025";
export const WMM_MODEL_EPOCH = 2025.0;
/** Model validity window (decimal years, inclusive start / exclusive end). */
export const WMM_VALID_FROM = 2025.0;
export const WMM_VALID_TO = 2030.0;

const MAX_DEGREE = 12;

/** WGS84 ellipsoid. */
const WGS84_A_KM = 6378.137;
const WGS84_F = 1 / 298.257223563;
const WGS84_E2 = WGS84_F * (2 - WGS84_F);

/** Geomagnetic reference sphere radius (km). */
const GEOMAG_RE_KM = 6371.2;

/**
 * WMM2025 Gauss coefficients: [n, m, g_nm (nT), h_nm (nT), gdot (nT/yr), hdot (nT/yr)].
 * Verbatim from the official WMM.COF (epoch 2025.0, released 11/13/2024).
 */
// prettier-ignore
const WMM2025_COEFFICIENTS: ReadonlyArray<readonly [number, number, number, number, number, number]> = [
  [1, 0, -29351.8, 0.0, 12.0, 0.0],
  [1, 1, -1410.8, 4545.4, 9.7, -21.5],
  [2, 0, -2556.6, 0.0, -11.6, 0.0],
  [2, 1, 2951.1, -3133.6, -5.2, -27.7],
  [2, 2, 1649.3, -815.1, -8.0, -12.1],
  [3, 0, 1361.0, 0.0, -1.3, 0.0],
  [3, 1, -2404.1, -56.6, -4.2, 4.0],
  [3, 2, 1243.8, 237.5, 0.4, -0.3],
  [3, 3, 453.6, -549.5, -15.6, -4.1],
  [4, 0, 895.0, 0.0, -1.6, 0.0],
  [4, 1, 799.5, 278.6, -2.4, -1.1],
  [4, 2, 55.7, -133.9, -6.0, 4.1],
  [4, 3, -281.1, 212.0, 5.6, 1.6],
  [4, 4, 12.1, -375.6, -7.0, -4.4],
  [5, 0, -233.2, 0.0, 0.6, 0.0],
  [5, 1, 368.9, 45.4, 1.4, -0.5],
  [5, 2, 187.2, 220.2, 0.0, 2.2],
  [5, 3, -138.7, -122.9, 0.6, 0.4],
  [5, 4, -142.0, 43.0, 2.2, 1.7],
  [5, 5, 20.9, 106.1, 0.9, 1.9],
  [6, 0, 64.4, 0.0, -0.2, 0.0],
  [6, 1, 63.8, -18.4, -0.4, 0.3],
  [6, 2, 76.9, 16.8, 0.9, -1.6],
  [6, 3, -115.7, 48.8, 1.2, -0.4],
  [6, 4, -40.9, -59.8, -0.9, 0.9],
  [6, 5, 14.9, 10.9, 0.3, 0.7],
  [6, 6, -60.7, 72.7, 0.9, 0.9],
  [7, 0, 79.5, 0.0, -0.0, 0.0],
  [7, 1, -77.0, -48.9, -0.1, 0.6],
  [7, 2, -8.8, -14.4, -0.1, 0.5],
  [7, 3, 59.3, -1.0, 0.5, -0.8],
  [7, 4, 15.8, 23.4, -0.1, 0.0],
  [7, 5, 2.5, -7.4, -0.8, -1.0],
  [7, 6, -11.1, -25.1, -0.8, 0.6],
  [7, 7, 14.2, -2.3, 0.8, -0.2],
  [8, 0, 23.2, 0.0, -0.1, 0.0],
  [8, 1, 10.8, 7.1, 0.2, -0.2],
  [8, 2, -17.5, -12.6, 0.0, 0.5],
  [8, 3, 2.0, 11.4, 0.5, -0.4],
  [8, 4, -21.7, -9.7, -0.1, 0.4],
  [8, 5, 16.9, 12.7, 0.3, -0.5],
  [8, 6, 15.0, 0.7, 0.2, -0.6],
  [8, 7, -16.8, -5.2, -0.0, 0.3],
  [8, 8, 0.9, 3.9, 0.2, 0.2],
  [9, 0, 4.6, 0.0, -0.0, 0.0],
  [9, 1, 7.8, -24.8, -0.1, -0.3],
  [9, 2, 3.0, 12.2, 0.1, 0.3],
  [9, 3, -0.2, 8.3, 0.3, -0.3],
  [9, 4, -2.5, -3.3, -0.3, 0.3],
  [9, 5, -13.1, -5.2, 0.0, 0.2],
  [9, 6, 2.4, 7.2, 0.3, -0.1],
  [9, 7, 8.6, -0.6, -0.1, -0.2],
  [9, 8, -8.7, 0.8, 0.1, 0.4],
  [9, 9, -12.9, 10.0, -0.1, 0.1],
  [10, 0, -1.3, 0.0, 0.1, 0.0],
  [10, 1, -6.4, 3.3, 0.0, 0.0],
  [10, 2, 0.2, 0.0, 0.1, -0.0],
  [10, 3, 2.0, 2.4, 0.1, -0.2],
  [10, 4, -1.0, 5.3, -0.0, 0.1],
  [10, 5, -0.6, -9.1, -0.3, -0.1],
  [10, 6, -0.9, 0.4, 0.0, 0.1],
  [10, 7, 1.5, -4.2, -0.1, 0.0],
  [10, 8, 0.9, -3.8, -0.1, -0.1],
  [10, 9, -2.7, 0.9, -0.0, 0.2],
  [10, 10, -3.9, -9.1, -0.0, -0.0],
  [11, 0, 2.9, 0.0, 0.0, 0.0],
  [11, 1, -1.5, 0.0, -0.0, -0.0],
  [11, 2, -2.5, 2.9, 0.0, 0.1],
  [11, 3, 2.4, -0.6, 0.0, -0.0],
  [11, 4, -0.6, 0.2, 0.0, 0.1],
  [11, 5, -0.1, 0.5, -0.1, -0.0],
  [11, 6, -0.6, -0.3, 0.0, -0.0],
  [11, 7, -0.1, -1.2, -0.0, 0.1],
  [11, 8, 1.1, -1.7, -0.1, -0.0],
  [11, 9, -1.0, -2.9, -0.1, 0.0],
  [11, 10, -0.2, -1.8, -0.1, 0.0],
  [11, 11, 2.6, -2.3, -0.1, 0.0],
  [12, 0, -2.0, 0.0, 0.0, 0.0],
  [12, 1, -0.2, -1.3, 0.0, -0.0],
  [12, 2, 0.3, 0.7, -0.0, 0.0],
  [12, 3, 1.2, 1.0, -0.0, -0.1],
  [12, 4, -1.3, -1.4, -0.0, 0.1],
  [12, 5, 0.6, -0.0, -0.0, -0.0],
  [12, 6, 0.6, 0.6, 0.1, -0.0],
  [12, 7, 0.5, -0.1, -0.0, -0.0],
  [12, 8, -0.1, 0.8, 0.0, 0.0],
  [12, 9, -0.4, 0.1, 0.0, -0.0],
  [12, 10, -0.2, -1.0, -0.1, -0.0],
  [12, 11, -1.3, 0.1, -0.0, 0.0],
  [12, 12, -0.7, 0.2, -0.1, -0.1],
];

const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

/** Flat index for (n, m) with m <= n. */
function nmIndex(n: number, m: number): number {
  return (n * (n + 1)) / 2 + m;
}

const COEFF_COUNT = nmIndex(MAX_DEGREE, MAX_DEGREE) + 1;

/** Coefficients packed into flat arrays for fast lookup. */
const G_BASE = new Float64Array(COEFF_COUNT);
const H_BASE = new Float64Array(COEFF_COUNT);
const G_DOT = new Float64Array(COEFF_COUNT);
const H_DOT = new Float64Array(COEFF_COUNT);
for (const [n, m, g, h, gd, hd] of WMM2025_COEFFICIENTS) {
  const idx = nmIndex(n, m);
  G_BASE[idx] = g;
  H_BASE[idx] = h;
  G_DOT[idx] = gd;
  H_DOT[idx] = hd;
}

/**
 * Schmidt quasi-normalization factors converting the Gauss-normalized
 * Legendre recursion below to Schmidt semi-normalized functions
 * (same construction as NOAA's reference GeomagnetismLibrary.c).
 */
const SCHMIDT_NORM = (() => {
  const s = new Float64Array(COEFF_COUNT);
  s[0] = 1;
  for (let n = 1; n <= MAX_DEGREE; n++) {
    s[nmIndex(n, 0)] = (s[nmIndex(n - 1, 0)] * (2 * n - 1)) / n;
    for (let m = 1; m <= n; m++) {
      s[nmIndex(n, m)] =
        s[nmIndex(n, m - 1)] * Math.sqrt(((n - m + 1) * (m === 1 ? 2 : 1)) / (n + m));
    }
  }
  return s;
})();

export type MagneticDeclinationInput = {
  latitudeDeg: number;
  longitudeDeg: number;
  /** Height above the WGS84 ellipsoid in kilometres (default 0). */
  elevationKm?: number;
  /** Evaluation date: a JS Date or a decimal year (e.g. 2026.5). */
  date: Date | number;
};

export type MagneticDeclinationResult = {
  /** Magnetic declination in degrees, east positive. */
  declinationDeg: number;
  /** Magnetic inclination (dip) in degrees, down positive. */
  inclinationDeg: number;
  /** Horizontal field intensity (nT). */
  horizontalIntensityNt: number;
  /** Total field intensity (nT). */
  totalIntensityNt: number;
  /** Model base epoch (2025.0). */
  modelEpoch: number;
  modelName: string;
  /** Decimal year actually used for the secular-variation adjustment. */
  decimalYear: number;
  warnings: string[];
};

/** Convert a JS Date to a decimal year (UTC, day resolution). */
export function decimalYearFromDate(date: Date): number {
  const year = date.getUTCFullYear();
  const start = Date.UTC(year, 0, 1);
  const end = Date.UTC(year + 1, 0, 1);
  return year + (date.getTime() - start) / (end - start);
}

/**
 * Compute magnetic declination (and supporting field values) from WMM2025.
 *
 * Returns the result with warnings when the date is outside the model's
 * 2025.0–2030.0 validity window or the location is in/near a blackout zone
 * (weak horizontal field — compass declination unreliable).
 */
export function computeMagneticDeclination(
  input: MagneticDeclinationInput
): MagneticDeclinationResult {
  const { latitudeDeg, longitudeDeg } = input;
  const elevationKm = input.elevationKm ?? 0;
  if (!Number.isFinite(latitudeDeg) || Math.abs(latitudeDeg) > 90) {
    throw new Error(`Invalid latitude: ${latitudeDeg}`);
  }
  if (!Number.isFinite(longitudeDeg) || Math.abs(longitudeDeg) > 360) {
    throw new Error(`Invalid longitude: ${longitudeDeg}`);
  }

  const decimalYear =
    typeof input.date === "number" ? input.date : decimalYearFromDate(input.date);

  const warnings: string[] = [];
  if (decimalYear < WMM_VALID_FROM || decimalYear >= WMM_VALID_TO) {
    warnings.push(
      `Date ${decimalYear.toFixed(2)} is outside the WMM2025 validity window ` +
        `(${WMM_VALID_FROM}–${WMM_VALID_TO}); declination is an extrapolation.`
    );
  }

  // 1. Geodetic (WGS84) -> geocentric spherical.
  const phi = latitudeDeg * DEG2RAD;
  const lambda = longitudeDeg * DEG2RAD;
  const sinPhi = Math.sin(phi);
  const cosPhi = Math.cos(phi);
  const rc = WGS84_A_KM / Math.sqrt(1 - WGS84_E2 * sinPhi * sinPhi);
  const p = (rc + elevationKm) * cosPhi; // distance from rotation axis
  const zAxis = (rc * (1 - WGS84_E2) + elevationKm) * sinPhi;
  const r = Math.hypot(p, zAxis); // geocentric radius
  const phiPrime = Math.asin(zAxis / r); // geocentric latitude

  // 2. Time-adjusted coefficients.
  const dt = decimalYear - WMM_MODEL_EPOCH;

  // 3. Schmidt semi-normalized Legendre functions and latitude derivatives
  //    at x = sin(geocentric latitude), via the Gauss-normalized recursion.
  const x = Math.sin(phiPrime);
  const z = Math.cos(phiPrime);
  const pLeg = new Float64Array(COEFF_COUNT);
  const dpLeg = new Float64Array(COEFF_COUNT); // d/d(latitude)
  pLeg[0] = 1;
  dpLeg[0] = 0;
  for (let n = 1; n <= MAX_DEGREE; n++) {
    for (let m = 0; m <= n; m++) {
      const idx = nmIndex(n, m);
      if (n === m) {
        const prev = nmIndex(n - 1, m - 1);
        pLeg[idx] = z * pLeg[prev];
        dpLeg[idx] = z * dpLeg[prev] - x * pLeg[prev];
      } else if (n === 1 && m === 0) {
        const prev = nmIndex(0, 0);
        pLeg[idx] = x * pLeg[prev];
        dpLeg[idx] = x * dpLeg[prev] + z * pLeg[prev];
      } else {
        const prev1 = nmIndex(n - 1, m);
        const prev2 = n - 2 >= m ? nmIndex(n - 2, m) : -1;
        const k = ((n - 1) * (n - 1) - m * m) / ((2 * n - 1) * (2 * n - 3));
        pLeg[idx] = x * pLeg[prev1] - (prev2 >= 0 ? k * pLeg[prev2] : 0);
        dpLeg[idx] =
          x * dpLeg[prev1] + z * pLeg[prev1] - (prev2 >= 0 ? k * dpLeg[prev2] : 0);
      }
    }
  }

  // Precompute sin/cos of m*lambda.
  const sinMLambda = new Float64Array(MAX_DEGREE + 1);
  const cosMLambda = new Float64Array(MAX_DEGREE + 1);
  for (let m = 0; m <= MAX_DEGREE; m++) {
    sinMLambda[m] = Math.sin(m * lambda);
    cosMLambda[m] = Math.cos(m * lambda);
  }

  // 4. Spherical-harmonic summation in the geocentric frame.
  const aOverR = GEOMAG_RE_KM / r;
  let bxPrime = 0; // north
  let byPrime = 0; // east
  let bzPrime = 0; // down
  let radialPower = aOverR * aOverR; // (a/r)^(n+2) starting at n=1 -> ^3
  for (let n = 1; n <= MAX_DEGREE; n++) {
    radialPower *= aOverR;
    for (let m = 0; m <= n; m++) {
      const idx = nmIndex(n, m);
      const g = G_BASE[idx] + dt * G_DOT[idx];
      const h = H_BASE[idx] + dt * H_DOT[idx];
      const norm = SCHMIDT_NORM[idx];
      const pBar = pLeg[idx] * norm;
      const dpBar = dpLeg[idx] * norm;
      const gcoshs = g * cosMLambda[m] + h * sinMLambda[m];
      bxPrime -= radialPower * gcoshs * dpBar;
      byPrime += radialPower * m * (g * sinMLambda[m] - h * cosMLambda[m]) * pBar;
      bzPrime -= radialPower * (n + 1) * gcoshs * pBar;
    }
  }
  byPrime /= z; // divide by cos(geocentric latitude)

  // 5. Rotate geocentric -> geodetic frame.
  const psi = phiPrime - phi;
  const cosPsi = Math.cos(psi);
  const sinPsi = Math.sin(psi);
  const bx = bxPrime * cosPsi - bzPrime * sinPsi; // north
  const by = byPrime; // east
  const bz = bxPrime * sinPsi + bzPrime * cosPsi; // down

  const horizontal = Math.hypot(bx, by);
  const total = Math.hypot(horizontal, bz);
  const declinationDeg = Math.atan2(by, bx) * RAD2DEG;
  const inclinationDeg = Math.atan2(bz, horizontal) * RAD2DEG;

  if (horizontal < 2000) {
    warnings.push(
      "Location is in a magnetic blackout zone (horizontal field < 2000 nT); " +
        "compass declination is unreliable here."
    );
  } else if (horizontal < 6000) {
    warnings.push(
      "Weak horizontal magnetic field (< 6000 nT); compass declination accuracy is degraded."
    );
  }

  return {
    declinationDeg,
    inclinationDeg,
    horizontalIntensityNt: horizontal,
    totalIntensityNt: total,
    modelEpoch: WMM_MODEL_EPOCH,
    modelName: WMM_MODEL_NAME,
    decimalYear,
    warnings,
  };
}
