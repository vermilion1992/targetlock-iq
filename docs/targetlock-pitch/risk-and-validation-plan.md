# TargetLock IQ — Risk and validation plan

Identifies risks for v1 pilot and commercial rollout, with mitigations and validation activities. Tone: practical compliance with exploration drilling reality—not marketing claims.

---

## 1. Risk register

| ID | Risk | Likelihood | Impact | Mitigation |
|----|------|------------|--------|------------|
| R1 | Recommendation treated as authoritative without sign-off | Medium | High | Disclaimer in app + exports; pilot SOP requires geologist/supervisor approval |
| R2 | Desurvey differs from site certified software | Medium | High | Validation study vs reference tool; document method (minimum curvature) |
| R3 | Wrong target or CRS interpretation | Medium | High | Pilot checklist for target definition; collar-relative offsets explicit in training |
| R4 | CSV import errors (units, azimuth convention) | Medium | Medium | Templates, import QA, alias headers documented |
| R5 | Over-reliance on projected miss (model uncertainty) | Medium | Medium | QA flags; no magnetic/interference model in v1—state limitation |
| R6 | Data loss (browser-only persistence) | Low | Medium | Export handover each shift; v2 cloud/offline sync |
| R7 | Pilot fails user acceptance | Medium | Medium | Co-design with driller champion; Simple mode first |
| R8 | Integration delay blocks commercial sale | Medium | Medium | CSV path sufficient for pilot; v2 API scoped |
| R9 | Liability from missed target despite app use | Low | High | Licence language; decision support only |
| R10 | Competitor “good enough” spreadsheet | High | Low | Emphasize speed, history, PDF, ecosystem |

---

## 2. Technical validation

### 2.1 Desurvey and geometry (priority: high)

| Test | Method | Pass criteria |
|------|--------|---------------|
| Minimum curvature vs reference | Compare 3+ industry test vectors and one real hole (anonymized) against Deswik/Compass/other site standard | MD, E/N/D within agreed tolerance (e.g. 0.1 m / station) |
| Dogleg and DLS | Known two-station cases | Match published DLS |
| Interpolation at MD | Plan path at mid-interval | Smooth, no jumps |
| Automated regression | `npm run test` in CI | 100% pass before release |

**Owner:** Development + independent reviewer (internal or client geology).  
**Artifact:** Validation memo stored with pilot pack.

### 2.2 Recommendation logic (priority: high)

| Test | Method | Pass criteria |
|------|--------|---------------|
| Aim respects max DLS | Synthetic high-dogleg case | Aim turn ≤ configured limit |
| Miss vector direction | Known geometry setup | Vector points toward target offset |
| Status classification | Sample drift dataset | Matches expert review (watch/correction/risk) |

### 2.3 Report integrity (priority: medium)

| Test | Method | Pass criteria |
|------|--------|---------------|
| TXT vs PDF content | Same hole, same timestamp | Key fields identical |
| History in PDF | After 2 surveys | Recent events listed |
| Filename / hole ID | Special characters in name | Safe download name |

---

## 3. Operational validation (pilot)

| Activity | When | Success |
|----------|------|---------|
| Driller shadowing (2 surveys) | Week 2 | Driller can enter survey and read aim without trainer |
| Geologist review session | Week 4 | Geologist trusts QA flags; requests ≤3 critical changes |
| Supervisor handover trial | Week 4 | PDF accepted as shift record |
| Timed survey-to-decision | Each survey | Baseline vs pilot comparison |
| Rejection logging | Ongoing | When recommendation rejected, reason captured (spreadsheet) |

---

## 4. Commercial and legal validation

| Item | Action |
|------|--------|
| Licence disclaimer | Align app, PDF, and contract |
| Data privacy | Confirm surveys are client data; no vendor retention in v1 without consent |
| Export control / IT | Hosted build security review before enterprise |
| Insurance | Confirm professional indemnity covers software advice (internal counsel) |

---

## 5. IMDEX ecosystem validation

| Integration | v1 | Validation |
|-------------|-----|------------|
| HUB-IQ / SURVEY-IQ | CSV manual | Column mapping doc + 2 real exports |
| Directional services | Narrative | Field service lead sign-off on pitch |
| Reflex / geology | Export only | Sample handover accepted by geology lead |

**Goal:** One **reference customer** quote citing “fits our IMDEX workflow.”

---

## 6. Validation phases

```text
Phase 0 (complete)     Unit tests + internal demo walkthrough
Phase 1 (pilot week 1)  Target lock + CSV SOP + training
Phase 2 (pilot week 2–4) Live surveys + timed decisions + exports
Phase 3 (pilot week 5–6) Independent desurvey check + close-out report
Phase 4 (pre-commercial) HUB-IQ import POC + approval workflow design
```

---

## 7. Stop / go criteria

### Continue pilot

- No unresolved **Category A** calculation discrepancy  
- ≥ 75% surveys processed in app on trial hole  
- No safety incident attributed to app misuse  

### Proceed to v2 commercial

- Pilot metrics meet or exceed [pilot-proposal.md](./pilot-proposal.md) targets  
- Paying customer or committed LOI  
- Validation memo signed by technical authority  
- Integration path funded  

### Pause or pivot

- Repeated expert rejection of desurvey/results  
- Client IT blocks browser storage / export  
- No willingness to assign geologist review time  

---

## 8. Open assumptions (document and test)

1. Dip negative-down, azimuth clockwise from north (exploration convention).  
2. Target as collar-relative E/N/D offset.  
3. Max DLS limit entered correctly reflects site steering policy.  
4. Projected miss uses straight-hole continuation—conservative for decision support, not intercept guarantee.  

---

## 9. Review schedule

| Review | Frequency | Participants |
|--------|-----------|--------------|
| Calculation change | Per release | Dev + geology advisor |
| Pilot sync | Weekly | Site champion + product |
| Risk register | Monthly | Product, legal, field services |

---

*This plan does not replace site-specific safety procedures, JORC/NI 43-101 compliance, or certified survey obligations.*
