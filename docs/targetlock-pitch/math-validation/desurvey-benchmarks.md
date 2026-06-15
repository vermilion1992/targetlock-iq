# Desurvey benchmarks — analytically exact golden cases

Automated in `src/lib/drilling/__tests__/desurvey-benchmark.test.ts`. Every expected value is derived in closed form below; nothing is quoted from external tables, so the benchmark is reproducible by hand.

**Conventions.** Dip is negative-down (dip −90° = straight down); inclination from vertical is `I = 90° + dip`. Positions are hole-local E/N/D with D down-positive. The unit tangent for `(I, A)` is

```
t = [ sin I · sin A,  sin I · cos A,  cos I ]   (E, N, D)
```

## 1. Straight inclined hole

Dip −60°, azimuth 30°, MD 0 → 600 m. The path is a straight line:

- horizontal = 600·cos 60° = 300 m
- E = 300·sin 30° = **150 m**, N = 300·cos 30° ≈ **259.808 m**
- D = 600·sin 60° ≈ **519.615 m**

Asserted to 1e-9 m. Any desurvey method must be exact here (zero dogleg).

## 2. Constant-build circular arc in a vertical plane

Build from vertical (I = 0°) to I = 60° over L = 600 m at a constant 3°/30 m, azimuth fixed at 0°. The path is a circular arc of radius

```
R = L / Δθ = 600 / (60°·π/180) ≈ 572.958 m
```

Exact circle position at inclination I: `N = R(1 − cos I)`, `D = R·sin I`, `E = 0`.

**Why minimum curvature must be exact at any station spacing:** for two stations on a circle separated by arc angle Δθ, the minimum-curvature displacement is `(L/2)·(2/Δθ)·tan(Δθ/2)·(t₁+t₂)` with `L = RΔθ`. Since `|t₁+t₂| = 2·cos(Δθ/2)`, the magnitude is `2R·sin(Δθ/2)` — exactly the chord — and `t₁+t₂` bisects the tangents, which is exactly the chord direction on a circle. The test asserts the end position at both 50 m (5°/station) and 100 m (10°/station) spacing matches the exact circle to 1e-7 m.

## 3. Horizontal constant-rate turn

Horizontal hole (dip 0°) turning azimuth 0° → 90° over L = 300 m. Exact plan-view circle of radius `R = L/Δψ = 300/(π/2) ≈ 190.986 m`:

- E = R(1 − cos ψ) = **R** at ψ = 90°
- N = R·sin ψ = **R** at ψ = 90°, D = 0

Same chord argument as case 2; asserted to 1e-7 m.

## 4. Radius of curvature — exact cases

The classic factored RoC formula

```
ΔD = L(sin I₂ − sin I₁)/ΔI,   HD = L(cos I₁ − cos I₂)/ΔI
ΔN = HD(sin A₂ − sin A₁)/ΔA,  ΔE = HD(cos A₁ − cos A₂)/ΔA
```

is **exact when inclination or azimuth is constant** over the interval (the double integral factors). When both vary it is an approximation — deliberately covered by the convergence test, not claimed exact. Benchmarked:

- Constant-azimuth build arc: I 0° → 60° over 600 m at azimuth 45° — matches the exact vertical-plane circle (case 2 geometry rotated to azimuth 45°) to 1e-9 m.
- Constant-inclination horizontal turn: azimuth 10° → 100° over 300 m at dip 0 — matches the exact plan-view circle to 1e-9 m.

## 5. Method convergence (tolerance scaling)

Smooth build-and-turn path (I: 0° → 50°, A: 30° → 150° over 600 m) sampled at 60 m and at 5 m stations. Asserted:

- at 5 m stations the maximum pairwise bottom-hole disagreement between minimum curvature, balanced tangential, and radius of curvature is **< 0.05 m**;
- the 5 m disagreement is at least **10× smaller** than the 60 m disagreement (inter-method differences shrink at O(spacing²));
- each alternative method individually lands within 0.05 m of the fine-spacing minimum-curvature position.

## Scope

These benchmarks validate the desurvey integrators in `geometry.ts` / `desurvey.ts`. They do not certify survey-tool accuracy, magnetic models, or the simplified uncertainty model (see `survey-uncertainty.md`).
