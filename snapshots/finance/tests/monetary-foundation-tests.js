const assert = require("node:assert/strict");
const {
  RULE_IDS,
  createAssessmentPeriod,
  createCalculationContext,
  evaluateMinimumIncome,
  evaluateMaximumKizForChild,
  evaluateMaximumKizForHousehold,
  calculateMonetaryFoundation,
} = require("../calculator.js");

function income(overrides = {}) {
  return {
    id: "income-1",
    personRole: "applicant",
    incomeType: "employment",
    amountType: "gross",
    entryMethod: "average",
    monthlyAverage: "600",
    monthlyValues: ["", "", "", "", "", ""],
    deductions: {},
    ...overrides,
  };
}

function child(overrides = {}) {
  return {
    id: "child-1",
    name: "Testkind",
    age: "10",
    careSituation: "dauerhaft-a",
    maritalPartnershipStatus: "no",
    affectedHouseholds: ["A"],
    hasExternalHousehold: false,
    stayDays: "",
    childBenefitAt: "A",
    childBenefitPerson: "applicant-a",
    externalChildBenefitPerson: "",
    halfForwarded: false,
    hasOwnIncome: "no",
    incomeSources: [],
    ...overrides,
  };
}

function household(overrides = {}) {
  const result = {
    adults: "single",
    applicantIncomeSources: [],
    partnerIncomeSources: [],
    applicantExpenses: [],
    partnerExpenses: [],
    housingBenefit: "0",
    ...overrides,
  };
  if (!Object.hasOwn(overrides, "applicantIncomeStatus")) result.applicantIncomeStatus = result.applicantIncomeSources.length ? "present" : "none";
  if (!Object.hasOwn(overrides, "partnerIncomeStatus")) result.partnerIncomeStatus = result.partnerIncomeSources.length ? "present" : "none";
  return result;
}

function state(overrides = {}) {
  return {
    mode: "single",
    applicationMonth: 7,
    applicationYear: 2026,
    centralChildren: [],
    households: { A: household(), B: household() },
    ...overrides,
  };
}

const tests = [];
function test(name, run) {
  tests.push({ name, run });
}

test("1. KIZ-GEN-001: Validierungsfehler blockiert den Rechenkern", () => {
  const context = createCalculationContext(state(), { errors: [{ code: "TEST_ERROR" }], warnings: [], infos: [] });
  assert.equal(context.canCalculate, false);
  assert.equal(context.status, "BLOCKED_BY_VALIDATION");
  assert.equal(calculateMonetaryFoundation(state(), { errors: [{ code: "TEST_ERROR" }] }).period, null);
});

test("2. KIZ-GEN-001: Warnung allein blockiert nicht", () => {
  const context = createCalculationContext(state(), { errors: [], warnings: [{ code: "TEST_WARNING" }], infos: [] });
  assert.equal(context.canCalculate, true);
  assert.equal(context.status, "READY_WITH_WARNINGS");
});

test("3. KIZ-GEN-001: Eingaben werden nicht verändert", () => {
  const input = state();
  const validation = { errors: [], warnings: [], infos: [] };
  const beforeState = JSON.stringify(input);
  const beforeValidation = JSON.stringify(validation);
  calculateMonetaryFoundation(input, validation);
  assert.equal(JSON.stringify(input), beforeState);
  assert.equal(JSON.stringify(validation), beforeValidation);
});

test("4. KIZ-PERIOD-001: Juli 2026 ergibt Januar bis Juni 2026", () => {
  const period = createAssessmentPeriod(7, 2026);
  assert.deepEqual(period.months.map((item) => item.key), ["2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06"]);
});

test("5. KIZ-PERIOD-001: Januar 2026 ergibt Juli bis Dezember 2025", () => {
  const period = createAssessmentPeriod(1, 2026);
  assert.deepEqual(period.months.map((item) => item.key), ["2025-07", "2025-08", "2025-09", "2025-10", "2025-11", "2025-12"]);
});

test("6. KIZ-PERIOD-001: Oktober 2026 ergibt April bis September 2026", () => {
  const period = createAssessmentPeriod(10, 2026);
  assert.deepEqual(period.months.map((item) => item.key), ["2026-04", "2026-05", "2026-06", "2026-07", "2026-08", "2026-09"]);
});

test("7. KIZ-PERIOD-001: Zeitraum enthält genau sechs Monate", () => {
  assert.equal(createAssessmentPeriod(7, 2026).months.length, 6);
});

test("8. KIZ-PERIOD-001: Monate sind chronologisch und positioniert", () => {
  const months = createAssessmentPeriod(3, 2026).months;
  assert.deepEqual(months.map((item) => item.position), [0, 1, 2, 3, 4, 5]);
  assert.deepEqual(months.map((item) => item.key), [...months.map((item) => item.key)].sort());
});

test("9. KIZ-PERIOD-001: ungültiger Monat wird nicht korrigiert", () => {
  const period = createAssessmentPeriod(13, 2026);
  assert.equal(period.status, "INVALID_APPLICATION_PERIOD");
  assert.deepEqual(period.months, []);
});

test("10. KIZ-MIN-INCOME-001: allein exakt 600 EUR erreicht die Grenze", () => {
  const input = state({ households: { A: household({ applicantIncomeSources: [income()] }), B: household() } });
  const result = evaluateMinimumIncome(input, "A");
  assert.equal(result.averageRelevantIncome, 600);
  assert.equal(result.isThresholdMet, true);
  assert.equal(result.differenceToThreshold, 0);
});

test("11. KIZ-MIN-INCOME-001: allein 599,99 EUR verfehlt die Grenze", () => {
  const input = state({ households: { A: household({ applicantIncomeSources: [income({ monthlyAverage: "599.99" })] }), B: household() } });
  assert.equal(evaluateMinimumIncome(input, "A").isThresholdMet, false);
});

test("12. KIZ-MIN-INCOME-001: Paar exakt 900 EUR erreicht die Grenze", () => {
  const input = state({ households: { A: household({ adults: "couple", applicantIncomeSources: [income({ monthlyAverage: "450" })], partnerIncomeSources: [income({ id: "income-2", personRole: "partner", monthlyAverage: "450" })] }), B: household() } });
  assert.equal(evaluateMinimumIncome(input, "A").isThresholdMet, true);
});

test("13. KIZ-MIN-INCOME-001: Paar 899,99 EUR verfehlt die Grenze", () => {
  const input = state({ households: { A: household({ adults: "couple", applicantIncomeSources: [income({ monthlyAverage: "500" })], partnerIncomeSources: [income({ id: "income-2", personRole: "partner", monthlyAverage: "399.99" })] }), B: household() } });
  assert.equal(evaluateMinimumIncome(input, "A").isThresholdMet, false);
});

test("14. KIZ-MIN-INCOME-001: Nullmonate bleiben im Divisor sechs", () => {
  const source = income({ entryMethod: "monthly", monthlyValues: ["0", "600", "600", "600", "600", "600"] });
  const input = state({ households: { A: household({ applicantIncomeSources: [source] }), B: household() } });
  assert.equal(evaluateMinimumIncome(input, "A").averageRelevantIncome, 500);
});

test("15. KIZ-MIN-INCOME-001: Abzüge und Ausgaben reduzieren die Prüfung nicht", () => {
  const source = income({ deductions: { tax: true, taxAmount: "500" } });
  const input = state({ households: { A: household({ applicantIncomeSources: [source], applicantExpenses: [{ amount: "500" }] }), B: household() } });
  assert.equal(evaluateMinimumIncome(input, "A").averageRelevantIncome, 600);
});

test("16. KIZ-MIN-INCOME-001: keine Quelle ergibt 0 EUR", () => {
  const result = evaluateMinimumIncome(state(), "A");
  assert.equal(result.status, "CALCULATED");
  assert.equal(result.averageRelevantIncome, 0);
  assert.equal(result.isThresholdMet, false);
});

test("17. KIZ-MIN-INCOME-001: unvollständige Quelle ist nicht 0 EUR", () => {
  const input = state({ households: { A: household({ applicantIncomeSources: [income({ monthlyAverage: "" })] }), B: household() } });
  const result = evaluateMinimumIncome(input, "A");
  assert.equal(result.status, "UNRESOLVED");
  assert.equal(result.averageRelevantIncome, null);
  assert.equal(result.unresolvedIncomeSources[0].status, "MISSING_REQUIRED_GROSS_AMOUNT");
});

test("18. KIZ-MIN-INCOME-001: Beschäftigung mit Nettobetrag bleibt nicht unterstützt", () => {
  const input = state({ households: { A: household({ applicantIncomeSources: [income({ amountType: "net" })] }), B: household() } });
  assert.equal(evaluateMinimumIncome(input, "A").unresolvedIncomeSources[0].status, "UNSUPPORTED_AMOUNT_TYPE");
});

test("19. KIZ-MIN-INCOME-001: Kindeseinkommen wird nicht addiert", () => {
  const input = state({ centralChildren: [child({ hasOwnIncome: "yes", incomeSources: [{ monthlyAverage: "5000" }] })] });
  assert.equal(evaluateMinimumIncome(input, "A").averageRelevantIncome, 0);
});

test("20. KIZ-MIN-INCOME-001: Eingabeobjekte bleiben unverändert", () => {
  const input = state({ households: { A: household({ applicantIncomeSources: [income()] }), B: household() } });
  const before = JSON.stringify(input);
  evaluateMinimumIncome(input, "A");
  assert.equal(JSON.stringify(input), before);
});

test("21. KIZ-MAX-001: ein mögliches Kind in A ergibt 297 EUR", () => {
  const result = evaluateMaximumKizForChild(child(), "A", 7, 2026);
  assert.equal(result.maximumKizAmount, 297);
});

test("22. KIZ-MAX-001: zwei mögliche Kinder ergeben theoretisch 594 EUR", () => {
  const input = state({ centralChildren: [child(), child({ id: "child-2" })] });
  assert.equal(evaluateMaximumKizForHousehold(input, "A").theoreticalMaximumKizTotal, 594);
});

test("23. KIZ-MAX-001: B-only-Kind wird A nicht zugerechnet", () => {
  const bOnly = child({ careSituation: "dauerhaft-b", affectedHouseholds: ["B"], childBenefitAt: "B", childBenefitPerson: "applicant-b" });
  assert.equal(evaluateMaximumKizForChild(bOnly, "A", 7, 2026).maximumKizAmount, 0);
});

test("24. KIZ-MAX-001: externer Bezug ergibt weder A noch B einen Betrag", () => {
  const external = child({ careSituation: "wechselmodell-50-50", affectedHouseholds: ["A", "B"], childBenefitAt: "external", childBenefitPerson: "external-person" });
  assert.equal(evaluateMaximumKizForChild(external, "A", 7, 2026).maximumKizAmount, 0);
  assert.equal(evaluateMaximumKizForChild(external, "B", 7, 2026).maximumKizAmount, 0);
});

test("25. KIZ-MAX-001: Kind ab 25 erhält keinen Betrag", () => {
  assert.equal(evaluateMaximumKizForChild(child({ age: "25" }), "A", 7, 2026).maximumKizAmount, 0);
});

test("26. KIZ-MAX-001: verheiratetes oder verpartnertes Kind erhält keinen Betrag", () => {
  assert.equal(evaluateMaximumKizForChild(child({ maritalPartnershipStatus: "yes" }), "A", 7, 2026).maximumKizAmount, 0);
});

test("27. KIZ-MAX-001: nicht unterstütztes Jahr erzeugt keinen Betrag", () => {
  const result = evaluateMaximumKizForChild(child(), "A", 7, 2025);
  assert.equal(result.status, "UNSUPPORTED_LEGAL_PERIOD");
  assert.equal(result.maximumKizAmount, null);
});

test("28. KIZ-MAX-001: Eingaben bleiben unverändert", () => {
  const input = state({ centralChildren: [child()] });
  const before = JSON.stringify(input);
  evaluateMaximumKizForHousehold(input, "A");
  assert.equal(JSON.stringify(input), before);
});

test("29. KIZ-MIN-INCOME-001: Elterngeld laut Bescheid wird vollständig einbezogen", () => {
  const source = income({ incomeType: "parental-allowance", amountType: "notice", monthlyAverage: "600" });
  const input = state({ households: { A: household({ applicantIncomeSources: [source] }), B: household() } });
  assert.equal(evaluateMinimumIncome(input, "A").averageRelevantIncome, 600);
});

test("30. KIZ-MIN-INCOME-001: nicht bestätigte Einkommensart bleibt unaufgelöst", () => {
  const source = income({ incomeType: "pension", amountType: "notice" });
  const input = state({ households: { A: household({ applicantIncomeSources: [source] }), B: household() } });
  assert.equal(evaluateMinimumIncome(input, "A").unresolvedIncomeSources[0].status, "PENSION_MINIMUM_INCOME_BASIS_NOT_CAPTURED");
});

test("31. Grundlagenlauf enthält nur die vier freigegebenen monetären Regel-IDs", () => {
  const result = calculateMonetaryFoundation(state(), { errors: [], warnings: [], infos: [] });
  assert.deepEqual(result.usedRuleIds, [RULE_IDS.general, RULE_IDS.period, RULE_IDS.minimumIncome, RULE_IDS.maximumKiz]);
  assert.equal(result.households.A.maximumKiz.disclaimer.includes("kein tatsächlicher"), true);
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

console.log(`${passed}/${tests.length} Tests für die monetären Grundlagenregeln erfolgreich.`);
