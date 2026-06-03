(function () {
  "use strict";

  const DEG = Math.PI / 180;
  const RAD = 180 / Math.PI;
  const EPS = 1e-9;

  const SAMPLE_PLAN = `md,dip,azimuth,tolerance_m,dip_tolerance_deg,azi_tolerance_deg
0,-60.0,125.0,2.0,2.0,3.0
30,-60.4,125.2,2.2,2.0,3.0
60,-60.8,125.5,2.4,2.0,3.0
90,-61.2,125.8,2.6,2.0,3.0
120,-61.6,126.0,2.8,2.0,3.0
150,-62.0,126.1,3.0,2.0,3.0
180,-62.3,126.1,3.2,2.0,3.0
210,-62.6,126.0,3.4,2.0,3.0
240,-62.8,125.8,3.6,2.0,3.0
270,-63.0,125.6,3.8,2.0,3.0
300,-63.2,125.3,4.0,2.0,3.0
330,-63.4,125.0,4.2,2.0,3.0
360,-63.6,124.7,4.4,2.0,3.0
390,-63.8,124.4,4.6,2.0,3.0
420,-64.0,124.1,4.8,2.0,3.0
450,-64.1,123.8,5.0,2.0,3.0
480,-64.2,123.5,5.2,2.0,3.0
510,-64.3,123.2,5.4,2.0,3.0
540,-64.4,122.9,5.6,2.0,3.0
570,-64.5,122.6,5.8,2.0,3.0
600,-64.6,122.3,6.0,2.0,3.0`;

  const SAMPLE_ACTUAL = `md,dip,azimuth
0,-60.0,125.0
30,-59.7,126.1
60,-59.3,127.5
90,-59.0,128.7
120,-58.7,130.0
150,-58.5,131.2
180,-58.4,132.4
210,-58.3,133.4
240,-58.2,134.3
270,-58.2,135.1
300,-58.3,135.8
330,-58.4,136.3
360,-58.6,136.8
390,-58.9,137.2`;

  const state = {
    planRecords: [],
    actualRecords: [],
    planStations: [],
    actualStations: [],
    recommendation: null,
    mode: "simple"
  };

  const el = {
    simpleMode: document.getElementById("simpleMode"),
    advancedMode: document.getElementById("advancedMode"),
    plannedFile: document.getElementById("plannedFile"),
    actualFile: document.getElementById("actualFile"),
    loadSample: document.getElementById("loadSample"),
    exportReport: document.getElementById("exportReport"),
    usePlanTarget: document.getElementById("usePlanTarget"),
    targetMd: document.getElementById("targetMd"),
    targetEast: document.getElementById("targetEast"),
    targetNorth: document.getElementById("targetNorth"),
    targetDown: document.getElementById("targetDown"),
    targetTolerance: document.getElementById("targetTolerance"),
    maxDls: document.getElementById("maxDls"),
    nextInterval: document.getElementById("nextInterval"),
    manualMd: document.getElementById("manualMd"),
    manualDip: document.getElementById("manualDip"),
    manualAzimuth: document.getElementById("manualAzimuth"),
    useAim: document.getElementById("useAim"),
    addSurvey: document.getElementById("addSurvey"),
    undoSurvey: document.getElementById("undoSurvey"),
    manualMessage: document.getElementById("manualMessage"),
    statusBadge: document.getElementById("statusBadge"),
    currentMd: document.getElementById("currentMd"),
    actualDipAzi: document.getElementById("actualDipAzi"),
    planOffset: document.getElementById("planOffset"),
    projectedMiss: document.getElementById("projectedMiss"),
    confidenceTag: document.getElementById("confidenceTag"),
    aimDip: document.getElementById("aimDip"),
    aimAzimuth: document.getElementById("aimAzimuth"),
    dipChange: document.getElementById("dipChange"),
    aziChange: document.getElementById("aziChange"),
    dlsRequired: document.getElementById("dlsRequired"),
    dlsAllowed: document.getElementById("dlsAllowed"),
    actionText: document.getElementById("actionText"),
    targetMeta: document.getElementById("targetMeta"),
    missEast: document.getElementById("missEast"),
    missNorth: document.getElementById("missNorth"),
    missVertical: document.getElementById("missVertical"),
    optionMeta: document.getElementById("optionMeta"),
    optionRows: document.getElementById("optionRows"),
    qaMeta: document.getElementById("qaMeta"),
    qaRows: document.getElementById("qaRows"),
    sampleCount: document.getElementById("sampleCount"),
    lastUpdate: document.getElementById("lastUpdate"),
    surveyRows: document.getElementById("surveyRows"),
    planCanvas: document.getElementById("planCanvas"),
    sectionCanvas: document.getElementById("sectionCanvas"),
    deviationCanvas: document.getElementById("deviationCanvas")
  };

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function normalizeAngle(angle) {
    return ((angle % 360) + 360) % 360;
  }

  function shortestAngle(from, to) {
    return ((to - from + 540) % 360) - 180;
  }

  function toNumber(value, fallback) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function round(value, digits) {
    if (!Number.isFinite(value)) return "--";
    return value.toFixed(digits);
  }

  function signed(value, digits) {
    if (!Number.isFinite(value)) return "--";
    const prefix = value > 0 ? "+" : "";
    return `${prefix}${value.toFixed(digits)}`;
  }

  function absDeg(value, digits) {
    if (!Number.isFinite(value)) return "--";
    return `${Math.abs(value).toFixed(digits)} deg`;
  }

  function dipInstruction(delta) {
    if (!Number.isFinite(delta)) return "--";
    if (Math.abs(delta) < 0.05) return "Hold dip";
    return delta < 0 ? `Steepen ${absDeg(delta, 1)}` : `Flatten ${absDeg(delta, 1)}`;
  }

  function azimuthInstruction(delta) {
    if (!Number.isFinite(delta)) return "--";
    if (Math.abs(delta) < 0.05) return "Hold azimuth";
    return delta < 0 ? `Turn left ${absDeg(delta, 1)}` : `Turn right ${absDeg(delta, 1)}`;
  }

  function sentenceStart(text) {
    if (!text || text === "--") return text;
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  function distance(a, b) {
    return Math.hypot(a.e - b.e, a.n - b.n, a.d - b.d);
  }

  function vectorLength(v) {
    return Math.hypot(v.e, v.n, v.d);
  }

  function normalizeVector(v, fallback) {
    const length = vectorLength(v);
    if (length < EPS) return fallback || { e: 0, n: 0, d: 1 };
    return { e: v.e / length, n: v.n / length, d: v.d / length };
  }

  function add(a, b) {
    return { e: a.e + b.e, n: a.n + b.n, d: a.d + b.d };
  }

  function subtract(a, b) {
    return { e: a.e - b.e, n: a.n - b.n, d: a.d - b.d };
  }

  function scale(v, amount) {
    return { e: v.e * amount, n: v.n * amount, d: v.d * amount };
  }

  function dot(a, b) {
    return a.e * b.e + a.n * b.n + a.d * b.d;
  }

  function vectorFromDipAz(dip, azimuth) {
    const dipRad = dip * DEG;
    const aziRad = azimuth * DEG;
    const horizontal = Math.cos(dipRad);
    return {
      e: horizontal * Math.sin(aziRad),
      n: horizontal * Math.cos(aziRad),
      d: -Math.sin(dipRad)
    };
  }

  function dipAzFromVector(vector) {
    const v = normalizeVector(vector);
    const horizontal = Math.hypot(v.e, v.n);
    return {
      dip: -Math.atan2(v.d, horizontal) * RAD,
      azimuth: normalizeAngle(Math.atan2(v.e, v.n) * RAD)
    };
  }

  function doglegDeg(a, b) {
    const av = normalizeVector(a);
    const bv = normalizeVector(b);
    return Math.acos(clamp(dot(av, bv), -1, 1)) * RAD;
  }

  function slerpDirection(a, b, t) {
    const av = normalizeVector(a);
    const bv = normalizeVector(b);
    const angle = Math.acos(clamp(dot(av, bv), -1, 1));
    if (angle < EPS) return av;
    const sinAngle = Math.sin(angle);
    const left = scale(av, Math.sin((1 - t) * angle) / sinAngle);
    const right = scale(bv, Math.sin(t * angle) / sinAngle);
    return normalizeVector(add(left, right), av);
  }

  function minCurveDisplacement(fromRecord, toRecord, length) {
    const v1 = vectorFromDipAz(fromRecord.dip, fromRecord.azimuth);
    const v2 = vectorFromDipAz(toRecord.dip, toRecord.azimuth);
    const angle = Math.acos(clamp(dot(v1, v2), -1, 1));
    const ratioFactor = angle < EPS ? 1 : (2 / angle) * Math.tan(angle / 2);
    return scale(add(v1, v2), (length / 2) * ratioFactor);
  }

  function splitCsvLine(line) {
    const cells = [];
    let current = "";
    let quoted = false;
    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];
      if (char === '"') {
        if (quoted && line[i + 1] === '"') {
          current += '"';
          i += 1;
        } else {
          quoted = !quoted;
        }
      } else if (char === "," && !quoted) {
        cells.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    cells.push(current.trim());
    return cells;
  }

  function normalizeHeader(header) {
    return header.trim().toLowerCase().replace(/[\s-]+/g, "_");
  }

  function readField(row, names) {
    for (const name of names) {
      const key = normalizeHeader(name);
      if (Object.prototype.hasOwnProperty.call(row, key) && row[key] !== "") return row[key];
    }
    return undefined;
  }

  function parseSurveyCsv(text) {
    const lines = text.replace(/\r/g, "").split("\n").map((line) => line.trim()).filter(Boolean);
    if (lines.length < 2) return [];
    const headers = splitCsvLine(lines[0]).map(normalizeHeader);
    const records = [];

    for (const line of lines.slice(1)) {
      const values = splitCsvLine(line);
      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || "";
      });

      const md = toNumber(readField(row, ["md", "depth", "measured_depth", "measured depth"]), NaN);
      const dip = toNumber(readField(row, ["dip", "inclination", "inc"]), NaN);
      const azimuth = toNumber(readField(row, ["azimuth", "azi", "az"]), NaN);

      if (Number.isFinite(md) && Number.isFinite(dip) && Number.isFinite(azimuth)) {
        records.push({
          md,
          dip,
          azimuth: normalizeAngle(azimuth),
          tolerance: toNumber(readField(row, ["tolerance_m", "tolerance", "target_tolerance"]), NaN),
          dipTolerance: toNumber(readField(row, ["dip_tolerance_deg", "dip_tolerance"]), NaN),
          aziTolerance: toNumber(readField(row, ["azi_tolerance_deg", "azimuth_tolerance_deg", "azi_tolerance"]), NaN)
        });
      }
    }

    return records.sort((a, b) => a.md - b.md);
  }

  function buildStations(records) {
    if (!records.length) return [];
    const stations = [];
    let position = { e: 0, n: 0, d: 0 };

    records.forEach((record, index) => {
      if (index > 0) {
        const previous = records[index - 1];
        const length = record.md - previous.md;
        const displacement = minCurveDisplacement(previous, record, length);
        position = add(position, displacement);
      }

      const previousRecord = records[index - 1];
      const dogleg = previousRecord ? doglegDeg(vectorFromDipAz(previousRecord.dip, previousRecord.azimuth), vectorFromDipAz(record.dip, record.azimuth)) : 0;
      const interval = previousRecord ? record.md - previousRecord.md : 0;

      stations.push({
        ...record,
        e: position.e,
        n: position.n,
        d: position.d,
        dls: interval > EPS ? dogleg / (interval / 30) : 0,
        dogleg
      });
    });

    return stations;
  }

  function interpolateAtMd(stations, md) {
    if (!stations.length) return null;
    if (md <= stations[0].md) return { ...stations[0] };

    for (let i = 1; i < stations.length; i += 1) {
      const a = stations[i - 1];
      const b = stations[i];
      if (md <= b.md) {
        const span = b.md - a.md || 1;
        const t = clamp((md - a.md) / span, 0, 1);
        const av = vectorFromDipAz(a.dip, a.azimuth);
        const bv = vectorFromDipAz(b.dip, b.azimuth);
        const aim = dipAzFromVector(slerpDirection(av, bv, t));
        return {
          md,
          dip: aim.dip,
          azimuth: aim.azimuth,
          e: a.e + (b.e - a.e) * t,
          n: a.n + (b.n - a.n) * t,
          d: a.d + (b.d - a.d) * t,
          dls: a.dls + (b.dls - a.dls) * t
        };
      }
    }

    const last = stations[stations.length - 1];
    const vector = vectorFromDipAz(last.dip, last.azimuth);
    const extra = md - last.md;
    return {
      ...last,
      md,
      e: last.e + vector.e * extra,
      n: last.n + vector.n * extra,
      d: last.d + vector.d * extra
    };
  }

  function getTarget() {
    return {
      md: toNumber(el.targetMd.value, 0),
      e: toNumber(el.targetEast.value, 0),
      n: toNumber(el.targetNorth.value, 0),
      d: toNumber(el.targetDown.value, 0),
      tolerance: Math.max(0.1, toNumber(el.targetTolerance.value, 6)),
      maxDls: Math.max(0.1, toNumber(el.maxDls.value, 3)),
      nextInterval: Math.max(1, toNumber(el.nextInterval.value, 30))
    };
  }

  function setPlanTarget() {
    if (!state.planStations.length) return;
    const requestedMd = toNumber(el.targetMd.value, state.planStations[state.planStations.length - 1].md);
    const target = interpolateAtMd(state.planStations, requestedMd);
    if (!target) return;
    el.targetMd.value = round(target.md, 0);
    el.targetEast.value = round(target.e, 1);
    el.targetNorth.value = round(target.n, 1);
    el.targetDown.value = round(target.d, 1);
    if (Number.isFinite(target.tolerance)) el.targetTolerance.value = round(target.tolerance, 1);
    updateApp();
  }

  function classify(reco) {
    if (reco.remaining <= 0) {
      return { label: "Target depth passed", className: "risk", confidence: "Review" };
    }
    if (reco.miss <= reco.tolerance) {
      return { label: "On track", className: "on-track", confidence: "High" };
    }
    if (reco.miss <= reco.tolerance * 1.5 && reco.dlsRequired <= reco.maxDls) {
      return { label: "Watch", className: "watch", confidence: "High" };
    }
    if (reco.dlsRequired <= reco.maxDls && reco.straightRatio <= 1.08) {
      return { label: "Correction needed", className: "correction", confidence: "Medium" };
    }
    if (reco.dlsRequired <= reco.maxDls * 1.75) {
      return { label: "Steering recommended", className: "steer", confidence: "Medium" };
    }
    return { label: "Target at risk", className: "risk", confidence: "Low" };
  }

  function calculateRecommendation() {
    if (!state.planStations.length || !state.actualStations.length) return null;

    const target = getTarget();
    const current = state.actualStations[state.actualStations.length - 1];
    const currentPlan = interpolateAtMd(state.planStations, current.md);
    const remaining = target.md - current.md;
    const currentPosition = { e: current.e, n: current.n, d: current.d };
    const targetPosition = { e: target.e, n: target.n, d: target.d };
    const currentVector = vectorFromDipAz(current.dip, current.azimuth);
    const deltaToTarget = subtract(targetPosition, currentPosition);
    const straightDistance = vectorLength(deltaToTarget);
    const desiredDirection = normalizeVector(deltaToTarget, currentVector);
    const doglegToTarget = doglegDeg(currentVector, desiredDirection);
    const dlsRequired = remaining > EPS ? doglegToTarget / (remaining / 30) : Infinity;
    const maxTurn = target.maxDls * (target.nextInterval / 30);
    const aimDirection = doglegToTarget > maxTurn ? slerpDirection(currentVector, desiredDirection, maxTurn / doglegToTarget) : desiredDirection;
    const aim = dipAzFromVector(aimDirection);
    const projection = add(currentPosition, scale(currentVector, Math.max(0, remaining)));
    const missVector = subtract(projection, targetPosition);
    const miss = vectorLength(missVector);
    const planOffset = currentPlan ? distance(current, currentPlan) : 0;

    const reco = {
      target,
      current,
      currentPlan,
      remaining,
      aimDip: aim.dip,
      aimAzimuth: aim.azimuth,
      dipChange: aim.dip - current.dip,
      aziChange: shortestAngle(current.azimuth, aim.azimuth),
      dlsRequired,
      maxDls: target.maxDls,
      currentVector,
      desiredDirection,
      doglegToTarget,
      miss,
      missVector,
      tolerance: target.tolerance,
      planOffset,
      straightRatio: remaining > EPS ? straightDistance / remaining : Infinity,
      projection
    };

    return {
      ...reco,
      classification: classify(reco)
    };
  }

  function directionLabel(value, negativeLabel, positiveLabel) {
    if (!Number.isFinite(value)) return "--";
    if (Math.abs(value) < 0.05) return { amount: "0.0 m", direction: "center" };
    return {
      amount: `${Math.abs(value).toFixed(1)} m`,
      direction: value < 0 ? negativeLabel : positiveLabel
    };
  }

  function setDirectionMetric(node, value, negativeLabel, positiveLabel) {
    const formatted = directionLabel(value, negativeLabel, positiveLabel);
    if (formatted === "--") {
      node.textContent = "--";
      return;
    }
    node.textContent = "";
    const amount = document.createTextNode(formatted.amount);
    const direction = document.createElement("small");
    direction.textContent = formatted.direction;
    node.appendChild(amount);
    node.appendChild(direction);
  }

  function actionSentence(reco) {
    const status = reco.classification.label;
    const dipMove = sentenceStart(dipInstruction(reco.dipChange).toLowerCase());
    const aziMove = azimuthInstruction(reco.aziChange).toLowerCase();

    if (status === "On track") {
      return `Continue drilling. Current projection is inside the ${round(reco.tolerance, 1)} m target envelope. Resurvey at the planned interval.`;
    }
    if (status === "Watch") {
      return `Monitor closely. Aim for ${round(reco.aimDip, 1)} deg dip and ${round(reco.aimAzimuth, 1)} deg azimuth over the next ${round(reco.target.nextInterval, 0)} m. Shorten the next survey interval if the drift continues.`;
    }
    if (status === "Correction needed") {
      return `Correct now. ${dipMove} and ${aziMove} from the current direction. The required DLS is inside the configured limit.`;
    }
    if (status === "Steering recommended") {
      return `Escalate for steering review. Natural correction may be marginal; assess directional tooling, a shorter survey interval, or revised target tolerance before drilling another full interval.`;
    }
    if (status === "Target depth passed") {
      return `Target MD has been reached or passed. Review actual intercept, target definition, and end-of-hole decision.`;
    }
    return `Target at risk. The projected correction exceeds the configured dogleg window; review branch, wedge, directional drilling, or revised hole objective.`;
  }

  function buildCorrectionOptions(reco) {
    if (!reco || reco.remaining <= 0) return [];
    const base = [15, 30, 60, reco.remaining].filter((value) => value > EPS);
    const intervals = [];

    base.forEach((interval) => {
      const rounded = Math.round(interval * 10) / 10;
      if (!intervals.some((item) => Math.abs(item - rounded) < 0.1)) intervals.push(rounded);
    });

    return intervals.map((interval) => {
      const maxTurn = reco.maxDls * (interval / 30);
      const turn = Math.min(reco.doglegToTarget, maxTurn);
      const turnRatio = reco.doglegToTarget < EPS ? 1 : turn / reco.doglegToTarget;
      const aimDirection = slerpDirection(reco.currentVector, reco.desiredDirection, turnRatio);
      const aim = dipAzFromVector(aimDirection);
      const fullyAimed = turn + 0.01 >= reco.doglegToTarget;
      const dls = interval > EPS ? turn / (interval / 30) : 0;

      return {
        interval,
        label: Math.abs(interval - reco.remaining) < 0.1 ? `${round(interval, 0)} m to target` : `${round(interval, 0)} m`,
        aimDip: aim.dip,
        aimAzimuth: aim.azimuth,
        turn,
        dls,
        status: fullyAimed ? "Can point at target" : "Partial correction"
      };
    });
  }

  function buildQaFlags(reco) {
    if (!reco) return [];
    const flags = [];
    const latest = state.actualStations[state.actualStations.length - 1];
    const previous = state.actualStations[state.actualStations.length - 2];
    const surveyInterval = previous ? latest.md - previous.md : latest.md;
    const aziWalk = previous ? Math.abs(shortestAngle(previous.azimuth, latest.azimuth)) : 0;
    const dipWalk = previous ? Math.abs(latest.dip - previous.dip) : 0;

    if (surveyInterval > reco.target.nextInterval * 1.25) {
      flags.push({
        level: "watch",
        label: "Interval",
        message: `Last survey interval was ${round(surveyInterval, 1)} m. Consider shortening to ${round(reco.target.nextInterval, 0)} m or less while correcting.`
      });
    } else {
      flags.push({
        level: "ok",
        label: "Interval",
        message: `Last survey interval is ${round(surveyInterval, 1)} m and inside the planned cadence.`
      });
    }

    if (latest.dls > reco.maxDls) {
      flags.push({
        level: "risk",
        label: "DLS",
        message: `Actual DLS is ${round(latest.dls, 2)} deg/30 m, above the ${round(reco.maxDls, 2)} deg/30 m steering limit.`
      });
    } else if (latest.dls > reco.maxDls * 0.75) {
      flags.push({
        level: "watch",
        label: "DLS",
        message: `Actual DLS is ${round(latest.dls, 2)} deg/30 m and approaching the configured limit.`
      });
    } else {
      flags.push({
        level: "ok",
        label: "DLS",
        message: `Actual DLS is ${round(latest.dls, 2)} deg/30 m.`
      });
    }

    if (reco.planOffset > reco.tolerance * 2) {
      flags.push({
        level: "risk",
        label: "Plan",
        message: `Actual hole is ${round(reco.planOffset, 1)} m from plan at MD ${round(latest.md, 0)} m.`
      });
    } else if (reco.planOffset > reco.tolerance) {
      flags.push({
        level: "watch",
        label: "Plan",
        message: `Actual hole is ${round(reco.planOffset, 1)} m from plan and outside target tolerance.`
      });
    } else {
      flags.push({
        level: "ok",
        label: "Plan",
        message: `Actual hole is ${round(reco.planOffset, 1)} m from the planned trajectory.`
      });
    }

    if (reco.dlsRequired > reco.maxDls) {
      flags.push({
        level: "risk",
        label: "Recover",
        message: `Required DLS to point back at target is ${round(reco.dlsRequired, 2)} deg/30 m, above the configured limit.`
      });
    } else {
      flags.push({
        level: "ok",
        label: "Recover",
        message: `Required DLS is ${round(reco.dlsRequired, 2)} deg/30 m and inside the configured limit.`
      });
    }

    if (reco.miss > reco.tolerance * 3) {
      flags.push({
        level: "risk",
        label: "Target",
        message: `No-action projection misses by ${round(reco.miss, 1)} m against a ${round(reco.tolerance, 1)} m envelope.`
      });
    } else if (reco.miss > reco.tolerance) {
      flags.push({
        level: "watch",
        label: "Target",
        message: `No-action projection is outside target by ${round(reco.miss - reco.tolerance, 1)} m.`
      });
    } else {
      flags.push({
        level: "ok",
        label: "Target",
        message: `No-action projection is inside the target envelope.`
      });
    }

    if (aziWalk > 4 || dipWalk > 2) {
      flags.push({
        level: "watch",
        label: "Trend",
        message: `Last interval changed ${round(dipWalk, 1)} deg dip and ${round(aziWalk, 1)} deg azimuth. Watch for continuing drift.`
      });
    }

    return flags;
  }

  function updateDashboard(reco) {
    if (!reco) {
      el.statusBadge.textContent = "No data";
      el.statusBadge.className = "status-badge";
      return;
    }

    el.statusBadge.textContent = reco.classification.label;
    el.statusBadge.className = `status-badge ${reco.classification.className}`;
    el.currentMd.textContent = `${round(reco.current.md, 0)} m`;
    el.actualDipAzi.textContent = `${round(reco.current.dip, 1)} / ${round(reco.current.azimuth, 1)}`;
    el.planOffset.textContent = `${round(reco.planOffset, 1)} m`;
    el.projectedMiss.textContent = `${round(reco.miss, 1)} m`;
    el.confidenceTag.textContent = `${reco.classification.confidence} confidence`;
    el.aimDip.textContent = `${round(reco.aimDip, 1)} deg`;
    el.aimAzimuth.textContent = `${round(reco.aimAzimuth, 1)} deg`;
    el.dipChange.textContent = dipInstruction(reco.dipChange);
    el.aziChange.textContent = azimuthInstruction(reco.aziChange);
    el.dlsRequired.textContent = Number.isFinite(reco.dlsRequired) ? `${round(reco.dlsRequired, 2)} deg/30 m` : "--";
    el.dlsAllowed.textContent = `Limit ${round(reco.maxDls, 2)} deg/30 m`;
    el.actionText.textContent = actionSentence(reco);
    el.targetMeta.textContent = `MD ${round(reco.target.md, 0)} m`;
    setDirectionMetric(el.missEast, reco.missVector.e, "west", "east");
    setDirectionMetric(el.missNorth, reco.missVector.n, "south", "north");
    setDirectionMetric(el.missVertical, reco.missVector.d, "high", "low");
    el.sampleCount.textContent = `${state.actualStations.length} actual surveys`;
    el.lastUpdate.textContent = `Last MD ${round(reco.current.md, 0)} m`;
  }

  function updateCorrectionOptions(reco) {
    el.optionRows.innerHTML = "";
    if (!reco) {
      el.optionMeta.textContent = "--";
      return;
    }

    const options = buildCorrectionOptions(reco);
    el.optionMeta.textContent = `${options.length} options`;

    const fragment = document.createDocumentFragment();
    options.forEach((option) => {
      const row = document.createElement("tr");
      [
        option.label,
        `${round(option.aimDip, 1)} deg`,
        `${round(option.aimAzimuth, 1)} deg`,
        `${round(option.turn, 1)} deg / ${round(option.dls, 2)} DLS`,
        option.status
      ].forEach((value, index) => {
        const cell = document.createElement("td");
        cell.textContent = value;
        if (index === 4) cell.className = option.status === "Can point at target" ? "status-ok" : "status-watch";
        row.appendChild(cell);
      });
      fragment.appendChild(row);
    });
    el.optionRows.appendChild(fragment);
  }

  function updateQaFlags(reco) {
    el.qaRows.innerHTML = "";
    if (!reco) {
      el.qaMeta.textContent = "--";
      return;
    }

    const flags = buildQaFlags(reco);
    const riskCount = flags.filter((flag) => flag.level === "risk").length;
    const watchCount = flags.filter((flag) => flag.level === "watch").length;
    el.qaMeta.textContent = riskCount ? `${riskCount} risk` : watchCount ? `${watchCount} watch` : "Clear";

    const fragment = document.createDocumentFragment();
    flags.forEach((flag) => {
      const item = document.createElement("div");
      item.className = `qa-item qa-${flag.level}`;
      const level = document.createElement("strong");
      level.textContent = flag.label;
      const message = document.createElement("p");
      message.textContent = flag.message;
      item.appendChild(level);
      item.appendChild(message);
      fragment.appendChild(item);
    });
    el.qaRows.appendChild(fragment);
  }

  function updateRows() {
    el.surveyRows.innerHTML = "";
    const fragment = document.createDocumentFragment();
    state.actualStations.forEach((station) => {
      const row = document.createElement("tr");
      [
        round(station.md, 0),
        round(station.dip, 1),
        round(station.azimuth, 1),
        round(station.e, 1),
        round(station.n, 1),
        round(station.d, 1),
        round(station.dls, 2)
      ].forEach((value) => {
        const cell = document.createElement("td");
        cell.textContent = value;
        row.appendChild(cell);
      });
      fragment.appendChild(row);
    });
    el.surveyRows.appendChild(fragment);
  }

  function canvasContext(canvas) {
    const rect = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.floor(rect.width * ratio));
    canvas.height = Math.max(1, Math.floor(rect.height * ratio));
    const ctx = canvas.getContext("2d");
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    return { ctx, width: rect.width, height: rect.height };
  }

  function clearCanvas(ctx, width, height) {
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#fbfdff";
    ctx.fillRect(0, 0, width, height);
  }

  function drawGrid(ctx, width, height, left, top, right, bottom) {
    ctx.strokeStyle = "#e7ecf2";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i += 1) {
      const x = left + ((right - left) * i) / 4;
      const y = top + ((bottom - top) * i) / 4;
      ctx.beginPath();
      ctx.moveTo(x, top);
      ctx.lineTo(x, bottom);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(left, y);
      ctx.lineTo(right, y);
      ctx.stroke();
    }
    ctx.strokeStyle = "#cbd4df";
    ctx.strokeRect(left, top, right - left, bottom - top);
  }

  function drawPath(ctx, points, toXY, color, lineWidth, dash) {
    if (!points.length) return;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.setLineDash(dash || []);
    ctx.beginPath();
    points.forEach((point, index) => {
      const xy = toXY(point);
      if (index === 0) ctx.moveTo(xy.x, xy.y);
      else ctx.lineTo(xy.x, xy.y);
    });
    ctx.stroke();
    ctx.restore();
  }

  function allPointsForPlanView(reco) {
    const points = [...state.planStations, ...state.actualStations];
    if (reco) {
      points.push({ e: reco.target.e, n: reco.target.n });
      points.push({ e: reco.projection.e, n: reco.projection.n });
    }
    return points;
  }

  function bounds(points, xKey, yKey) {
    if (!points.length) return { minX: -10, maxX: 10, minY: -10, maxY: 10 };
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    points.forEach((point) => {
      minX = Math.min(minX, point[xKey]);
      maxX = Math.max(maxX, point[xKey]);
      minY = Math.min(minY, point[yKey]);
      maxY = Math.max(maxY, point[yKey]);
    });
    const padX = Math.max(8, (maxX - minX) * 0.16);
    const padY = Math.max(8, (maxY - minY) * 0.16);
    return { minX: minX - padX, maxX: maxX + padX, minY: minY - padY, maxY: maxY + padY };
  }

  function makeScale(width, height, bound, margin) {
    const left = margin.left;
    const right = width - margin.right;
    const top = margin.top;
    const bottom = height - margin.bottom;
    const scaleX = (right - left) / Math.max(EPS, bound.maxX - bound.minX);
    const scaleY = (bottom - top) / Math.max(EPS, bound.maxY - bound.minY);
    return {
      left,
      right,
      top,
      bottom,
      x: (value) => left + (value - bound.minX) * scaleX,
      y: (value) => bottom - (value - bound.minY) * scaleY
    };
  }

  function drawTarget(ctx, x, y, label) {
    ctx.save();
    ctx.fillStyle = "#b42318";
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#17202a";
    ctx.font = "12px Arial";
    ctx.fillText(label, x + 10, y - 8);
    ctx.restore();
  }

  function drawTargetEnvelope(ctx, x, y, radiusX, radiusY) {
    ctx.save();
    ctx.fillStyle = "rgba(180, 35, 24, 0.08)";
    ctx.strokeStyle = "rgba(180, 35, 24, 0.5)";
    ctx.lineWidth = 2;
    ctx.setLineDash([7, 5]);
    ctx.beginPath();
    ctx.ellipse(x, y, Math.max(7, radiusX), Math.max(7, radiusY), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function drawPlanView(reco) {
    const { ctx, width, height } = canvasContext(el.planCanvas);
    clearCanvas(ctx, width, height);
    const points = allPointsForPlanView(reco);
    const bound = bounds(points, "e", "n");
    const scaleMap = makeScale(width, height, bound, { left: 48, right: 20, top: 18, bottom: 38 });

    drawGrid(ctx, width, height, scaleMap.left, scaleMap.top, scaleMap.right, scaleMap.bottom);
    const toXY = (point) => ({ x: scaleMap.x(point.e), y: scaleMap.y(point.n) });
    drawPath(ctx, state.planStations, toXY, "#1f6feb", 3);
    drawPath(ctx, state.actualStations, toXY, "#b85c00", 3);

    if (reco) {
      drawPath(ctx, [reco.current, reco.projection], toXY, "#5d6a75", 2, [6, 6]);
      drawTargetEnvelope(
        ctx,
        scaleMap.x(reco.target.e),
        scaleMap.y(reco.target.n),
        Math.abs(scaleMap.x(reco.target.e + reco.target.tolerance) - scaleMap.x(reco.target.e)),
        Math.abs(scaleMap.y(reco.target.n + reco.target.tolerance) - scaleMap.y(reco.target.n))
      );
      drawTarget(ctx, scaleMap.x(reco.target.e), scaleMap.y(reco.target.n), "Target");
      drawTarget(ctx, scaleMap.x(reco.current.e), scaleMap.y(reco.current.n), "Current");
    }

    ctx.fillStyle = "#5d6a75";
    ctx.font = "12px Arial";
    ctx.fillText("East offset", scaleMap.left, height - 12);
    ctx.save();
    ctx.translate(14, scaleMap.bottom);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText("North offset", 0, 0);
    ctx.restore();
  }

  function drawSection(reco) {
    const { ctx, width, height } = canvasContext(el.sectionCanvas);
    clearCanvas(ctx, width, height);
    const points = [...state.planStations, ...state.actualStations].map((point) => ({ md: point.md, d: point.d }));
    if (reco) points.push({ md: reco.target.md, d: reco.target.d }, { md: reco.target.md, d: reco.projection.d });
    const bound = bounds(points, "md", "d");
    const scaleMap = makeScale(width, height, bound, { left: 52, right: 20, top: 18, bottom: 38 });

    drawGrid(ctx, width, height, scaleMap.left, scaleMap.top, scaleMap.right, scaleMap.bottom);
    const toXY = (point) => ({ x: scaleMap.x(point.md), y: scaleMap.y(point.d) });
    drawPath(ctx, state.planStations, toXY, "#1f6feb", 3);
    drawPath(ctx, state.actualStations, toXY, "#b85c00", 3);

    if (reco) {
      drawPath(ctx, [reco.current, { md: reco.target.md, d: reco.projection.d }], toXY, "#5d6a75", 2, [6, 6]);
      drawTargetEnvelope(
        ctx,
        scaleMap.x(reco.target.md),
        scaleMap.y(reco.target.d),
        Math.abs(scaleMap.x(reco.target.md + reco.target.tolerance) - scaleMap.x(reco.target.md)),
        Math.abs(scaleMap.y(reco.target.d + reco.target.tolerance) - scaleMap.y(reco.target.d))
      );
      drawTarget(ctx, scaleMap.x(reco.target.md), scaleMap.y(reco.target.d), "Target");
    }

    ctx.fillStyle = "#5d6a75";
    ctx.font = "12px Arial";
    ctx.fillText("Measured depth", scaleMap.left, height - 12);
    ctx.save();
    ctx.translate(14, scaleMap.bottom);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText("Down offset", 0, 0);
    ctx.restore();
  }

  function drawDeviation(reco) {
    const { ctx, width, height } = canvasContext(el.deviationCanvas);
    clearCanvas(ctx, width, height);
    const values = state.actualStations.map((station) => {
      const plan = interpolateAtMd(state.planStations, station.md);
      return {
        md: station.md,
        offset: plan ? distance(station, plan) : 0,
        dls: station.dls
      };
    });
    const points = values.length ? values : [{ md: 0, offset: 0 }];
    const maxOffset = Math.max(5, ...points.map((point) => point.offset), reco ? reco.tolerance : 0);
    const mdMin = Math.min(...points.map((point) => point.md));
    const mdMax = Math.max(...points.map((point) => point.md), reco ? reco.target.md : 0);
    const bound = { minX: mdMin, maxX: mdMax + 1, minY: 0, maxY: maxOffset * 1.2 };
    const scaleMap = makeScale(width, height, bound, { left: 52, right: 20, top: 18, bottom: 38 });

    drawGrid(ctx, width, height, scaleMap.left, scaleMap.top, scaleMap.right, scaleMap.bottom);
    const toXY = (point) => ({ x: scaleMap.x(point.md), y: scaleMap.y(point.offset) });
    drawPath(ctx, points, toXY, "#b85c00", 3);

    if (reco) {
      const yTol = scaleMap.y(reco.tolerance);
      ctx.strokeStyle = "#12723a";
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.moveTo(scaleMap.left, yTol);
      ctx.lineTo(scaleMap.right, yTol);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "#12723a";
      ctx.font = "12px Arial";
      ctx.fillText("Tolerance", scaleMap.left + 8, yTol - 8);
    }

    ctx.fillStyle = "#5d6a75";
    ctx.font = "12px Arial";
    ctx.fillText("Measured depth", scaleMap.left, height - 12);
    ctx.save();
    ctx.translate(14, scaleMap.bottom);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText("Offset from plan", 0, 0);
    ctx.restore();
  }

  function updateVisuals(reco) {
    drawPlanView(reco);
    drawSection(reco);
    drawDeviation(reco);
  }

  function setMode(mode) {
    state.mode = mode === "advanced" ? "advanced" : "simple";
    document.body.dataset.mode = state.mode;
    el.simpleMode.classList.toggle("active", state.mode === "simple");
    el.advancedMode.classList.toggle("active", state.mode === "advanced");
    el.simpleMode.setAttribute("aria-selected", String(state.mode === "simple"));
    el.advancedMode.setAttribute("aria-selected", String(state.mode === "advanced"));
    window.setTimeout(() => updateVisuals(state.recommendation), 0);
  }

  function updateApp() {
    state.planStations = buildStations(state.planRecords);
    state.actualStations = buildStations(state.actualRecords);
    state.recommendation = calculateRecommendation();
    updateDashboard(state.recommendation);
    updateCorrectionOptions(state.recommendation);
    updateQaFlags(state.recommendation);
    updateRows();
    updateVisuals(state.recommendation);
  }

  function setManualMessage(message) {
    el.manualMessage.textContent = message;
  }

  function fillNextSurveyFromAim() {
    const reco = state.recommendation;
    if (!reco) {
      setManualMessage("Load a plan and actual surveys before filling the next aim.");
      return;
    }

    const nextMd = Math.min(reco.target.md, reco.current.md + reco.target.nextInterval);
    el.manualMd.value = round(nextMd, 1);
    el.manualDip.value = round(reco.aimDip, 1);
    el.manualAzimuth.value = round(reco.aimAzimuth, 1);
    setManualMessage(`Filled next aim for MD ${round(nextMd, 1)} m.`);
  }

  function addManualSurvey() {
    const md = toNumber(el.manualMd.value, NaN);
    const dip = toNumber(el.manualDip.value, NaN);
    const azimuth = toNumber(el.manualAzimuth.value, NaN);

    if (!Number.isFinite(md) || !Number.isFinite(dip) || !Number.isFinite(azimuth)) {
      setManualMessage("Enter MD, dip, and azimuth before adding a survey.");
      return;
    }

    const last = state.actualRecords[state.actualRecords.length - 1];
    const existingIndex = state.actualRecords.findIndex((record) => Math.abs(record.md - md) < 0.001);
    if (existingIndex === -1 && last && md <= last.md) {
      setManualMessage(`Next survey MD must be greater than the current ${round(last.md, 1)} m survey.`);
      return;
    }

    const survey = { md, dip, azimuth: normalizeAngle(azimuth) };
    let message;
    if (existingIndex >= 0) {
      state.actualRecords[existingIndex] = survey;
      message = `Replaced survey at MD ${round(md, 1)} m.`;
    } else {
      state.actualRecords.push(survey);
      message = `Added survey at MD ${round(md, 1)} m.`;
    }

    state.actualRecords.sort((a, b) => a.md - b.md);
    updateApp();
    fillNextSurveyFromAim();
    setManualMessage(message);
  }

  function undoLatestSurvey() {
    if (state.actualRecords.length <= 1) {
      setManualMessage("Keep at least the collar survey in the actual path.");
      return;
    }

    const removed = state.actualRecords.pop();
    updateApp();
    fillNextSurveyFromAim();
    setManualMessage(`Removed latest survey at MD ${round(removed.md, 1)} m.`);
  }

  function loadSample() {
    state.planRecords = parseSurveyCsv(SAMPLE_PLAN);
    state.actualRecords = parseSurveyCsv(SAMPLE_ACTUAL);
    state.planStations = buildStations(state.planRecords);
    const finalPlan = state.planStations[state.planStations.length - 1];
    el.targetMd.value = finalPlan ? round(finalPlan.md, 0) : "600";
    setPlanTarget();
    fillNextSurveyFromAim();
    setManualMessage("Sample plan and actual surveys loaded.");
  }

  function readCsvFile(input, callback) {
    const file = input.files && input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      callback(String(reader.result || ""));
      updateApp();
    });
    reader.readAsText(file);
  }

  function exportReport() {
    const reco = state.recommendation;
    if (!reco) return;
    const options = buildCorrectionOptions(reco);
    const qaFlags = buildQaFlags(reco);
    const lines = [
      "TargetLock IQ demo report",
      `Generated: ${new Date().toISOString()}`,
      "",
      `Status: ${reco.classification.label}`,
      `Current MD: ${round(reco.current.md, 1)} m`,
      `Actual dip / azimuth: ${round(reco.current.dip, 2)} / ${round(reco.current.azimuth, 2)} deg`,
      `Target MD: ${round(reco.target.md, 1)} m`,
      `Target XYZ offset: E ${round(reco.target.e, 2)}, N ${round(reco.target.n, 2)}, D ${round(reco.target.d, 2)} m`,
      `Plan offset: ${round(reco.planOffset, 2)} m`,
      `Projected miss if no correction: ${round(reco.miss, 2)} m`,
      `Miss vector: E ${round(reco.missVector.e, 2)}, N ${round(reco.missVector.n, 2)}, D ${round(reco.missVector.d, 2)} m`,
      `Recommended next dip: ${round(reco.aimDip, 2)} deg`,
      `Recommended next azimuth: ${round(reco.aimAzimuth, 2)} deg`,
      `Dip correction: ${dipInstruction(reco.dipChange)} (${signed(reco.dipChange, 2)} deg)`,
      `Azimuth correction: ${azimuthInstruction(reco.aziChange)} (${signed(reco.aziChange, 2)} deg)`,
      `DLS required: ${round(reco.dlsRequired, 2)} deg/30 m`,
      `DLS limit: ${round(reco.maxDls, 2)} deg/30 m`,
      "",
      `Action: ${actionSentence(reco)}`,
      "",
      "Correction options:",
      ...options.map((option) => `- ${option.label}: aim ${round(option.aimDip, 2)} dip / ${round(option.aimAzimuth, 2)} azi, turn ${round(option.turn, 2)} deg, ${option.status}`),
      "",
      "Survey QA/QC:",
      ...qaFlags.map((flag) => `- ${flag.label}: ${flag.message}`),
      "",
      "Note: Demo output only. Not validated for operational drilling decisions."
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `targetlock-iq-report-md-${round(reco.current.md, 0)}.txt`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  el.loadSample.addEventListener("click", loadSample);
  el.exportReport.addEventListener("click", exportReport);
  el.usePlanTarget.addEventListener("click", setPlanTarget);
  el.simpleMode.addEventListener("click", () => setMode("simple"));
  el.advancedMode.addEventListener("click", () => setMode("advanced"));
  el.useAim.addEventListener("click", fillNextSurveyFromAim);
  el.addSurvey.addEventListener("click", addManualSurvey);
  el.undoSurvey.addEventListener("click", undoLatestSurvey);
  el.plannedFile.addEventListener("change", () => {
    readCsvFile(el.plannedFile, (text) => {
      state.planRecords = parseSurveyCsv(text);
      state.planStations = buildStations(state.planRecords);
      setPlanTarget();
    });
  });
  el.actualFile.addEventListener("change", () => {
    readCsvFile(el.actualFile, (text) => {
      state.actualRecords = parseSurveyCsv(text);
    });
  });

  [el.targetMd, el.targetEast, el.targetNorth, el.targetDown, el.targetTolerance, el.maxDls, el.nextInterval].forEach((input) => {
    input.addEventListener("input", updateApp);
  });

  window.addEventListener("resize", () => updateVisuals(state.recommendation));

  setMode("simple");
  loadSample();
})();
