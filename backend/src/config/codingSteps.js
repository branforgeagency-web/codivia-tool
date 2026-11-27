// Outpatient / professional coding steps (E/M → CPT → HCPCS → ICD-10-CM → Modifiers & Dx link):
// how each step is completed before the next one opens in the workspace. Sent with the chart
// (getMyChart → chart.codingSteps). done: 'codes' = at least one code; 'codesOrNone' = codes, or the
// student confirms the visit has none (draft.noneSteps); 'last' = the final step. Submitting is never
// blocked by these (see the "Submit is always enabled" rule).
const CODING_STEP_RULES = Object.freeze({
  steps: {
    em: { done: 'codesOrNone', none: 'No E/M service at this visit' },
    cpt: { done: 'codesOrNone', none: 'No other CPT procedures or services at this visit' },
    hcpcs: { done: 'codesOrNone', none: 'No HCPCS Level II codes at this visit' },
    dx: { done: 'codes', need: 'Add at least one ICD-10-CM diagnosis to continue.' },
    mods: { done: 'last' },
  },
  labels: {
    locked: 'Finish step {n} ({label}) first.',
    needCodes: 'Add a code, or tick “{none}”, to continue.',
    next: 'Continue to {label}',
    finish: 'Go to Wrap-Up',
    noneChosen: 'None at this visit',
  },
});

const CODING_STEP_KEYS = Object.freeze(Object.keys(CODING_STEP_RULES.steps));

module.exports = { CODING_STEP_RULES, CODING_STEP_KEYS };
