# TargetLock IQ — Usability test runbook (20-minute first-user review)

**Goal:** Watch one real user work the app with **no coaching**, and capture honest reactions to workflow and wording.  
**Version under test:** v1.2 (Simple = “What do I do next?”, Advanced = “Why?”)  
**Format:** 1 facilitator + 1 reviewer, live app, ~20 minutes.  
**Companion:** structured form in [field-feedback-form.md](./field-feedback-form.md). This runbook is the **facilitator script**; the form is the **leave-behind**.

> The aim is to listen, not to demo. If you find yourself explaining the screen, stop — that hesitation is the finding.

---

## 1. Reviewer profile (pick one per session)

| Role | What they judge best |
|------|----------------------|
| **Driller / offsider** | Is the next action clear and trustworthy on the rig floor? Is the wording how drillers talk? |
| **Geologist** | Does “why” hold up? Are QA flags and steering feasibility credible? |
| **Drilling supervisor** | Does it support the decision + handover? Is escalation wording defensible? |

Record: name (or anonymous), role, years in diamond drilling, sites worked.

**Run separate sessions per role** where possible — they react to different things. One session = one reviewer.

---

## 2. Setup checklist (do before the reviewer arrives)

- [ ] `npm run dev` in `packages/starterkit`; open **http://localhost:3000/targetlock**
- [ ] **Load sample** (DDH-0247) so drift and a recommendation are already on screen
- [ ] Confirm **Simple mode** is selected (start here)
- [ ] Browser zoom 100%; full screen; close unrelated tabs
- [ ] **Guide tour OFF** — this is the user’s read, not a guided walkthrough
- [ ] Have [field-feedback-form.md](./field-feedback-form.md) open or printed
- [ ] Recording: screen + audio if the reviewer consents (optional)
- [ ] Neutral framing line ready (below)
- [ ] Timer ready

**Opening framing (say once, then stop talking):**

> “This is an early tool for deciding what to drill next after a survey. I’m testing the tool, not you. Please think out loud. There are no wrong answers, and I won’t explain the screen — if something is unclear, that’s useful for me to see.”

---

## 3. Task prompts (the 7 questions)

Ask one at a time. **Stay quiet** after each — let silence do the work. Note exact words and where their eyes/cursor go.

| # | Phase | Prompt | What to watch |
|---|-------|--------|---------------|
| 1 | Simple | “This is Simple mode. **Without me explaining anything, what is the app telling you to do?**” | Do they find the Action plan first? Read current action + next interval aim unprompted? |
| 2 | Simple | “**Would you trust this enough to start a conversation with the geo or supervisor?** Why / why not?” | Trust signals; what they’d want before acting; any “I’d ring them anyway”. |
| 3 | Simple | “What do the numbers up top (latest survey, dip/azi, plan offset, projected miss) tell you?” | Are KPIs read correctly without help? Any confusion vs the Action plan? |
| 4 | Advanced | “Now switch to **Advanced**. **Where would you go to understand *why* it gave that recommendation?**” | Do they reach for the tabs? Which tab first? Do they find Steering feasibility? |
| 5 | Advanced | “Open whatever looks most useful. Does the detail back up the Simple-mode answer?” | Steering verdicts, Show details, QA/QC, assumptions — what they trust vs skip. |
| 6 | Both | “**Which words feel wrong, or not how drillers/geos actually talk?**” | Lift/Drop, Swing left/right, Correct now, Steering review, Wedge/branch, “point of no return”. |
| 7 | Both | “**What is missing before this could actually be useful on shift?**” | The real gap list — integration, units, sign-off, offline, etc. |

Optional probes (only if natural): “What would you do next on the rig after reading this?” · “Anything here you’d ignore?”

---

## 4. Wording feedback (capture verbatim)

For each term, note: ✅ natural · ⚠️ unclear · ✏️ they’d say it differently (record their phrase).

| App term | ✅/⚠️/✏️ | Reviewer’s preferred wording |
|----------|---------|------------------------------|
| Current action (Correct now / Watch / Steering review / Wedge or branch review) | | |
| Best method (“… may be sufficient / may still recover”) | | |
| Lift / Drop | | |
| Swing left / Swing right | | |
| Aim dip / aim azimuth | | |
| DLS required vs limit | | |
| Projected miss | | |
| Escalate by … | | |
| Point of no return | | |
| Steering feasibility | | |
| Recovery capability assumptions | | |

**Rule:** if two reviewers independently trip on the same word, it is a **must-fix**, not a preference.

---

## 5. Trust / confidence questions

Ask near the end. Rate **1 = no, 5 = yes**.

| Question | 1–5 | Note |
|----------|-----|------|
| The next action was clear without explanation | | |
| I’d trust it enough to raise it with the geo/supervisor | | |
| The “why” in Advanced matched the Simple answer | | |
| The wording sounded like the rig, not an office | | |
| I would compare it to our desurvey tool before relying on numbers | | |
| I can see where this fits in my shift | | |

**Headline question (write the quote down exactly):**
> “Would you want this on your next hole? Why?”

---

## 6. Scoring table (facilitator fills after session)

| Dimension | 1 | 2 | 3 | 4 | 5 | Comment |
|-----------|---|---|---|---|---|---------|
| Findability — found Action plan unaided | | | | | | |
| Clarity — understood next action | | | | | | |
| Trust — would escalate based on it | | | | | | |
| Why-path — found Advanced reasoning | | | | | | |
| Wording fit — driller/geo language | | | | | | |
| Shift-readiness — usable on shift | | | | | | |

**Time-on-task flags:** note any prompt where the reviewer was stuck >20 s or asked “what does this mean?”.

---

## 7. Note-taking template (copy per session)

```text
TargetLock IQ — Usability session
Date / time:
Facilitator:
Reviewer (role, years, sites):
App version: v1.2
Data: sample DDH-0247

Q1 What is it telling you to do?
  - quote:
  - found Action plan unaided? Y/N
Q2 Trust to escalate?
  - quote:
Q3 KPIs understood?
Q4 Where to find "why"? (which tab first)
Q5 Does detail back it up?
Q6 Wrong words: (verbatim)
Q7 Missing before shift use:

Trust scores (1-5): clear__ trust__ why__ words__ shiftfit__
Headline quote ("want this next hole?"):

Observed friction (stuck points, misreads):

Surprises (used in unexpected way / unexpected praise):
```

---

## 8. Classifying feedback

After the session, sort every comment into exactly one bucket. Be strict — most “great ideas” are Future feature, not Must fix.

### Must fix before showing more people
- Reviewer **misread the next action** or distrusted it for an avoidable reason
- A word is **wrong/misleading** to a domain expert (safety or meaning, not taste)
- They **could not find the “why”** in Advanced
- Anything that would cause a **wrong drilling decision**

### Nice to improve
- Wording they’d phrase differently (preference, not error)
- Layout/scan friction that slowed but didn’t block them
- Extra context they’d like surfaced sooner (tooltip, label)

### Future feature
- Integrations (live HUB-IQ/SURVEY-IQ), offline/sync, formal sign-off
- New calculations or tools (deeper steering models, magnetics)
- Anything needing scope, data, or another team

**Decision rule:** open **v1.3** only from the Must-fix list, plus the highest-leverage Nice-to-improve items. Future-feature ideas go to the roadmap — not the next sprint.

```text
Two reviewers hit it       -> Must fix
One reviewer, wrong action -> Must fix
One reviewer, preference   -> Nice to improve
"Would be cool if…"        -> Future feature
```

---

## 9. After 2–3 sessions

1. Merge notes; tally repeated comments (repetition = priority).
2. Fill the three buckets in a short summary at the top of [field-feedback-form.md](./field-feedback-form.md) responses, or a new `v1.3-feedback-summary.md`.
3. Pull 1–2 honest quotes (with permission) for [pilot-proposal.md](./pilot-proposal.md).
4. Draft v1.3 scope **from Must-fix only**.

---

*Usability findings are reviewer opinions on a prototype. They do not replace the calculation checks in [validation-plan.md](./validation-plan.md) or site sign-off.*
