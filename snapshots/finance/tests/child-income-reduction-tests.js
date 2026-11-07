const assert = require("node:assert/strict");
const {
  CHILD_INCOME_REDUCTION,
  evaluateChildIncome,
  evaluateMaximumKizForChild,
  evaluateChildIncomeReduction,
  evaluateChildIncomeReductionsForHousehold,
} = require("../calculator.js");

function series(monthlyAverage = "0") {
  return { entryMethod: "average", monthlyAverage, monthlyValues: ["", "", "", "", "", ""] };
}

function incomeSource(overrides = {}) {
  return {
    id: "income-1",
    incomeType: "maintenance",
    subtype: "",
    customLabel: "",
    amountType: "net",
    entryMethod: "average",
    monthlyAverage: "100",
    monthlyValues: ["", "", "", "", "", ""],
    directDeductions: { tax: series(), socialInsurance: series() },
    ...overrides,
  };
}

function child(overrides = {}) {
  return {
    id: "child-1",
    name: "Testkind",
    age: "16",
    careSituation: "dauerhaft-a",
    maritalPartnershipStatus: "no",
    affectedHouseholds: ["A"],
    hasExternalHousehold: false,
    stayDays: "",
    childBenefitAt: "A",
    childBenefitPerson: "applicant-a",
    externalChildBenefitPerson: "",
    halfForwarded: false,
    hasOwnIncome: "yes",
    eligiblePrivateInsuranceStatus: "no",
    incomeSources: [incomeSource()],
    ...overrides,
  };
}

function household() {
  const result = {
    adults: "single",
    applicantIncomeSources: [],
    partnerIncomeSources: [],
    applicantExpenses: [],
    partnerExpenses: [],
  };
  result.applicantIncomeStatus = result.applicantIncomeSources.length ? "present" : "none";
  result.partnerIncomeStatus = result.partnerIncomeSources.length ? "present" : "none";
  return result;
}

function state(children, overrides = {}) {
  return {
    mode: "single",
    applicationMonth: 7,
    applicationYear: 2026,
    centralChildren: children,
    households: { A: household(), B: household() },
    ...overrides,
  };
}

function maximumResult(overrides = {}) {
  return {
    ruleId: "KIZ-MAX-001",
    childId: "child-1",
    householdId: "A",
    isPotentialOwnKizChild: true,
    maximumKizAmount: 297,
    supportedLegalPeriod: true,
    status: "CALCULATED",
    warnings: [],
    openChecks: [],
    ...overrides,
  };
}

function childIncomeResult(overrides = {}) {
  return {
    ruleId: "KIZ-INCOME-CHILD-001",
    childId: "child-1",
    countableChildIncomeAverage: 100,
    status: "SUPPORTED",
    warnings: [],
    openChecks: [],
    ...overrides,
  };
}

function directReduction(average, overrides = {}) {
  return evaluateChildIncomeReduction(maximumResult(overrides.maximum), childIncomeResult({ countableChildIncomeAverage: average, ...overrides.income }));
}

const tests = [];
function test(name, run) { tests.push({ name, run }); }

test("1. Regel-ID und Minderungsfaktor sind stabil", () => {
  const result = directReduction(100);
  assert.equal(result.ruleId, "KIZ-REDUCE-CHILD-001");
  assert.equal(CHILD_INCOME_REDUCTION.rate, 0.45);
  assert.equal(result.reductionRate, 0.45);
});

test("2. 0 Euro Einkommen lassen 297 Euro unverändert", () => {
  const result = directReduction(0);
  assert.equal(result.childIncomeReduction, 0);
  assert.equal(result.individualKiZAfterChildIncome, 297);
});

test("3. 100 Euro Einkommen mindern um 45 Euro", () => {
  const result = directReduction(100);
  assert.equal(result.childIncomeReduction, 45);
  assert.equal(result.individualKiZAfterChildIncome, 252);
});

test("4. 200 Euro Einkommen mindern um 90 Euro", () => {
  const result = directReduction(200);
  assert.equal(result.childIncomeReduction, 90);
  assert.equal(result.individualKiZAfterChildIncome, 207);
});

test("5. 300 Euro Einkommen mindern um 135 Euro", () => {
  const result = directReduction(300);
  assert.equal(result.childIncomeReduction, 135);
  assert.equal(result.individualKiZAfterChildIncome, 162);
});

test("6. amtliches Beispiel 280 Euro ergibt 126 und 171 Euro", () => {
  const result = directReduction(280);
  assert.equal(result.childIncomeReduction, 126);
  assert.equal(result.individualKiZAfterChildIncome, 171);
});

test("7. 123,45 Euro werden nicht vorzeitig gerundet", () => {
  const result = directReduction(123.45);
  assert.equal(result.childIncomeReduction, 55.5525);
  assert.equal(result.individualKiZAfterChildIncome, 241.4475);
});

test("8. Minderung exakt in Höhe des Höchstbetrags ergibt 0", () => {
  const result = directReduction(660);
  assert.equal(result.childIncomeReduction, 297);
  assert.equal(result.individualKiZAfterChildIncome, 0);
});

test("9. Minderung oberhalb des Höchstbetrags wird bei 0 gedeckelt", () => {
  const result = directReduction(700);
  assert.equal(result.childIncomeReduction, 315);
  assert.equal(result.individualKiZAfterChildIncome, 0);
});

test("10. ein periodischer D1.5-Durchschnitt erzeugt kein Gleitkommaartefakt", () => {
  const input = child({ incomeSources: [incomeSource({ entryMethod: "monthly", monthlyValues: ["100", "0", "0", "0", "0", "0"] })] });
  const income = evaluateChildIncome(input, { applicationMonth: 7, applicationYear: 2026 });
  const maximum = evaluateMaximumKizForChild(input, "A", 7, 2026);
  const result = evaluateChildIncomeReduction(maximum, income);
  assert.equal(result.childIncomeReduction, 7.5);
  assert.equal(result.individualKiZAfterChildIncome, 289.5);
});

test("11. null aus D1.5 bleibt unresolved und wird nicht zu 0", () => {
  const result = evaluateChildIncomeReduction(maximumResult(), childIncomeResult({ countableChildIncomeAverage: null, status: "UNRESOLVED" }));
  assert.equal(result.status, "UNRESOLVED");
  assert.equal(result.childIncomeReduction, null);
  assert.equal(result.individualKiZAfterChildIncome, null);
});

test("12. INCOMPLETE aus D1.5 blockiert auch bei numerischem Feld", () => {
  const result = evaluateChildIncomeReduction(maximumResult(), childIncomeResult({ status: "INCOMPLETE" }));
  assert.equal(result.status, "UNRESOLVED");
  assert.ok(result.openChecks.includes("CHILD_INCOME_REDUCTION_INCOME_UNRESOLVED"));
});

test("13. offene Prüfpunkte aus D1.5 werden übernommen", () => {
  const result = evaluateChildIncomeReduction(maximumResult(), childIncomeResult({ countableChildIncomeAverage: null, status: "UNRESOLVED", openChecks: ["CHILD_PENSION_BACKPAY_UNRESOLVED"] }));
  assert.ok(result.openChecks.includes("CHILD_PENSION_BACKPAY_UNRESOLVED"));
});

test("14. Warnungen aus D1.5 und KIZ-MAX-001 werden übernommen", () => {
  const result = evaluateChildIncomeReduction(
    maximumResult({ warnings: [{ code: "MAX_WARNING", message: "max" }] }),
    childIncomeResult({ warnings: [{ code: "INCOME_WARNING", message: "income" }] })
  );
  assert.deepEqual(result.warnings.slice(0, 2).map((item) => item.code), ["MAX_WARNING", "INCOME_WARNING"]);
});

test("15. widersprüchliche childId bleibt unresolved", () => {
  const result = evaluateChildIncomeReduction(maximumResult(), childIncomeResult({ childId: "child-2" }));
  assert.equal(result.status, "UNRESOLVED");
  assert.ok(result.openChecks.includes("CHILD_INCOME_REDUCTION_CHILD_ID_MISMATCH"));
});

test("16. nicht unterstützter Höchstbetrag erzeugt keinen Zwischenwert", () => {
  const result = evaluateChildIncomeReduction(maximumResult({ maximumKizAmount: null, supportedLegalPeriod: false }), childIncomeResult());
  assert.equal(result.status, "UNRESOLVED");
  assert.equal(result.individualKiZAfterChildIncome, null);
});

test("17. ein nicht mögliches eigenes KiZ-Kind erhält keinen individuellen KiZ", () => {
  const result = evaluateChildIncomeReduction(maximumResult({ isPotentialOwnKizChild: false, maximumKizAmount: 0 }), childIncomeResult({ countableChildIncomeAverage: 900 }));
  assert.equal(result.status, "NOT_POTENTIAL_OWN_KIZ_CHILD");
  assert.equal(result.childIncomeReduction, null);
  assert.equal(result.individualKiZAfterChildIncome, null);
});

test("18. B-only-Kind erzeugt in Haushalt A keinen Zwischenbetrag", () => {
  const bChild = child({ id: "b-child", careSituation: "dauerhaft-b", affectedHouseholds: ["B"], childBenefitAt: "B", childBenefitPerson: "applicant-b" });
  const result = evaluateChildIncomeReductionsForHousehold(state([bChild]), "A").childResults[0];
  assert.equal(result.status, "NOT_POTENTIAL_OWN_KIZ_CHILD");
  assert.equal(result.individualKiZAfterChildIncome, null);
});

test("19. externer Kindergeldbezug erzeugt weder in A noch B einen Zwischenbetrag", () => {
  const external = child({ id: "external", careSituation: "wechselmodell-50-50", affectedHouseholds: ["A", "B"], childBenefitAt: "external", childBenefitPerson: "external-person" });
  const input = state([external], { mode: "compare" });
  assert.equal(evaluateChildIncomeReductionsForHousehold(input, "A").childResults[0].individualKiZAfterChildIncome, null);
  assert.equal(evaluateChildIncomeReductionsForHousehold(input, "B").childResults[0].individualKiZAfterChildIncome, null);
});

test("20. zwei Kinder behalten unterschiedliche Einkommen und Ergebnisse", () => {
  const first = child({ id: "first", incomeSources: [incomeSource({ id: "first-income", monthlyAverage: "100" })] });
  const second = child({ id: "second", incomeSources: [incomeSource({ id: "second-income", monthlyAverage: "300" })] });
  const results = evaluateChildIncomeReductionsForHousehold(state([first, second]), "A").childResults;
  assert.deepEqual(results.map((item) => item.childId), ["first", "second"]);
  assert.deepEqual(results.map((item) => item.childIncomeReduction), [45, 135]);
  assert.deepEqual(results.map((item) => item.individualKiZAfterChildIncome), [252, 162]);
});

test("21. übersteigende Minderung eines Kindes wird nicht auf ein Geschwister übertragen", () => {
  const high = child({ id: "high", incomeSources: [incomeSource({ id: "high-income", monthlyAverage: "700" })] });
  const zero = child({ id: "zero", hasOwnIncome: "no", incomeSources: [] });
  const result = evaluateChildIncomeReductionsForHousehold(state([high, zero]), "A");
  assert.deepEqual(result.childResults.map((item) => item.individualKiZAfterChildIncome), [0, 297]);
  assert.equal(result.preliminaryIndividualKiZAfterChildIncomeTotal, 297);
});

test("22. ausdrücklich kein Einkommen nutzt den unterstützten D1.5-Nullwert", () => {
  const noIncome = child({ hasOwnIncome: "no", incomeSources: [] });
  const result = evaluateChildIncomeReductionsForHousehold(state([noIncome]), "A").childResults[0];
  assert.equal(result.status, "SUPPORTED");
  assert.equal(result.countableChildIncomeAverage, 0);
  assert.equal(result.individualKiZAfterChildIncome, 297);
});

test("23. eine ungelöste Kindposition verhindert die vorläufige Haushaltssumme", () => {
  const unresolved = child({ incomeSources: [incomeSource({ incomeType: "other", customLabel: "offen" })] });
  const result = evaluateChildIncomeReductionsForHousehold(state([unresolved]), "A");
  assert.equal(result.status, "UNRESOLVED");
  assert.equal(result.preliminaryIndividualKiZAfterChildIncomeTotal, null);
});

test("24. Haushaltsresultat kennzeichnet fehlende Folgeschritte ausdrücklich", () => {
  const result = evaluateChildIncomeReductionsForHousehold(state([child({ hasOwnIncome: "no", incomeSources: [] })]), "A");
  assert.ok(result.remainingSteps.includes("CHILD_ASSETS_NOT_EVALUATED"));
  assert.ok(result.remainingSteps.includes("PARENT_INCOME_REDUCTION_NOT_EVALUATED"));
  assert.ok(result.remainingSteps.includes("FINAL_ROUNDING_NOT_APPLIED"));
  assert.equal(result.disclaimer.includes("kein Gesamtkinderzuschlag"), true);
});

test("25. vorgelagerte strukturelle offene Prüfungen verhindern die bestätigte Prozentrechnung nicht", () => {
  const result = evaluateChildIncomeReduction(maximumResult({ status: "PARTIAL", openChecks: ["CHILD_OWN_CHILD_STATUS_NOT_CAPTURED"] }), childIncomeResult());
  assert.equal(result.status, "SUPPORTED");
  assert.equal(result.childIncomeReduction, 45);
  assert.ok(result.openChecks.includes("CHILD_OWN_CHILD_STATUS_NOT_CAPTURED"));
});

test("26. D2 verändert weder State noch vorgelagerte Ergebnisobjekte", () => {
  const inputState = state([child()]);
  const maximum = maximumResult();
  const income = childIncomeResult();
  const beforeState = JSON.stringify(inputState);
  const beforeMaximum = JSON.stringify(maximum);
  const beforeIncome = JSON.stringify(income);
  evaluateChildIncomeReductionsForHousehold(inputState, "A");
  evaluateChildIncomeReduction(maximum, income);
  assert.equal(JSON.stringify(inputState), beforeState);
  assert.equal(JSON.stringify(maximum), beforeMaximum);
  assert.equal(JSON.stringify(income), beforeIncome);
});

test("27. KIZ-MAX-001 bleibt unverändert bei 297 Euro", () => {
  const input = child();
  const result = evaluateMaximumKizForChild(input, "A", 7, 2026);
  assert.equal(result.ruleId, "KIZ-MAX-001");
  assert.equal(result.maximumKizAmount, 297);
});

test("28. ohne mögliches eigenes KiZ-Kind ist die Haushaltssumme technisch 0", () => {
  const bChild = child({ careSituation: "dauerhaft-b", affectedHouseholds: ["B"], childBenefitAt: "B", childBenefitPerson: "applicant-b" });
  const result = evaluateChildIncomeReductionsForHousehold(state([bChild]), "A");
  assert.equal(result.status, "NO_POTENTIAL_OWN_KIZ_CHILDREN");
  assert.equal(result.preliminaryIndividualKiZAfterChildIncomeTotal, 0);
});

test("29. fehlende vorgelagerte KiZ-Zuordnung wird nicht als Ausschluss umgedeutet", () => {
  const maximum = maximumResult();
  delete maximum.isPotentialOwnKizChild;
  const result = evaluateChildIncomeReduction(maximum, childIncomeResult());
  assert.equal(result.status, "UNRESOLVED");
  assert.ok(result.openChecks.includes("CHILD_INCOME_REDUCTION_ELIGIBILITY_UNRESOLVED"));
});

let passed = 0;
tests.forEach(({ name, run }) => {
  try {
    run();
    passed += 1;
    console.log(`OK ${name}`);
  } catch (error) {
    console.error(`FEHLER ${name}`);
    throw error;
  }
});

console.log(`${passed}/${tests.length} Tests für KIZ-REDUCE-CHILD-001 (Phase D2) erfolgreich.`);
