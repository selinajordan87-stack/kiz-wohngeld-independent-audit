const assert = require("node:assert/strict");
const {
  RULE_IDS,
  prepareSixMonthValues,
  normalizeChildIncomeSource,
  evaluateChildIncomeSource,
  evaluateChildIncome,
  evaluateAdultIncomeForHousehold,
} = require("../calculator.js");
const { validateCalculatorState } = require("../validation.js");

function source(overrides = {}) {
  return {
    id: "child-income-1",
    incomeType: "maintenance",
    subtype: "",
    customLabel: "",
    amountType: "net",
    entryMethod: "average",
    monthlyAverage: "100",
    monthlyValues: ["", "", "", "", "", ""],
    ...overrides,
  };
}

function child(overrides = {}) {
  return {
    id: "child-1",
    name: "Kind A1",
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
    incomeSources: [source()],
    ...overrides,
  };
}

function household(overrides = {}) {
  const result = {
    label: "Haushalt A",
    adults: "single",
    person1: "Person A",
    partner: "",
    applicantIncomeSources: [],
    partnerIncomeSources: [],
    applicantExpenses: [],
    partnerExpenses: [],
    otherResidents: "0",
    housingBenefit: "0",
    housingBenefitStatus: "none",
    additionalNeedOverride: "",
    housingType: "rent",
    housingCosts: { rent: { coldRent: "0", coldUtilities: "0", heating: "0" }, owner: {} },
    hotWaterType: "central",
    hotWaterNote: "",
    assetsStatus: "no",
    specialSituations: [],
    ...overrides,
  };
  if (!Object.hasOwn(overrides, "applicantIncomeStatus")) result.applicantIncomeStatus = result.applicantIncomeSources.length ? "present" : "none";
  if (!Object.hasOwn(overrides, "partnerIncomeStatus")) result.partnerIncomeStatus = result.partnerIncomeSources.length ? "present" : "none";
  return result;
}

function state(inputChild = child(), overrides = {}) {
  return {
    dataVersion: 6,
    applicationMonth: 7,
    applicationYear: 2026,
    mode: "single",
    scenarioHalfForwarding: false,
    centralChildren: [inputChild],
    households: { A: household(), B: household({ label: "Haushalt B" }) },
    ...overrides,
  };
}

function hasOpen(result, code) {
  return result.openChecks.includes(code);
}

function hasValidationCode(result, code, severity) {
  return result[severity].some((item) => item.code === code);
}

const tests = [];
function test(name, run) {
  tests.push({ name, run });
}

test("1. laufender Unterhalt bleibt ausschließlich dem Kind zugeordnet", () => {
  const result = evaluateChildIncome(child());
  assert.equal(result.childId, "child-1");
  assert.equal(result.sources[0].incomeType, "maintenance");
});

test("2. Unterhalt wird nicht als Elterneinkommen verwendet", () => {
  const input = state(child({ incomeSources: [source({ monthlyAverage: "5000" })] }));
  assert.equal(evaluateAdultIncomeForHousehold(input, "A").personResults.applicant.rawSixMonthTotal, 0);
});

test("3. sechs Unterhaltsmonate werden mit Divisor sechs gemittelt", () => {
  const input = source({ entryMethod: "monthly", monthlyValues: ["0", "100", "200", "300", "400", "500"] });
  assert.equal(evaluateChildIncomeSource(input, child()).monthlyAverage, 250);
});

test("4. Unterhaltsvorschuss bleibt kindgebunden", () => {
  const result = evaluateChildIncomeSource(source({ incomeType: "advance-maintenance", amountType: "notice" }), child());
  assert.equal(result.childId, "child-1");
  assert.equal(result.incomeType, "advance-maintenance");
});

test("5. Unterhalt und Unterhaltsvorschuss bleiben getrennte Quellen", () => {
  const result = evaluateChildIncome(child({ incomeSources: [source(), source({ id: "child-income-2", incomeType: "advance-maintenance", amountType: "notice" })] }));
  assert.deepEqual(result.sources.map((item) => item.incomeType), ["maintenance", "advance-maintenance"]);
});

test("6. Waisenrente wird strukturell als laufende Rentenquelle erkannt", () => {
  const result = evaluateChildIncomeSource(source({ incomeType: "orphan-pension", amountType: "notice" }), child());
  assert.equal(result.classification, "SUPPORTED_RUNNING_PAYMENT_WITH_OPEN_CHECK");
  assert.equal(result.countableIncomeBeforeLaterReduction, 100);
});

test("7. nicht unterscheidbare Waisenrentennachzahlung bleibt offen", () => {
  const result = evaluateChildIncomeSource(source({ incomeType: "orphan-pension", amountType: "notice" }), child());
  assert.equal(hasOpen(result, "CHILD_PENSION_BACKPAY_STATUS_NOT_CAPTURED"), true);
  assert.equal(result.countableAfterConfirmedDeductions, null);
});

test("8. Ausbildungsvergütung behält ihre Rohwerte", () => {
  const result = evaluateChildIncomeSource(source({ incomeType: "training-wage", amountType: "gross", monthlyAverage: "750" }), child());
  assert.equal(result.rawMonthlyAverage, 750);
  assert.deepEqual(result.monthlyValues, [750, 750, 750, 750, 750, 750]);
});

test("9. Ausbildungsvergütung erhält ohne Freibetragsregeln keinen Endwert", () => {
  const result = evaluateChildIncomeSource(source({ incomeType: "training-wage", amountType: "gross" }), child());
  assert.equal(result.countableAfterConfirmedDeductions, null);
  assert.equal(hasOpen(result, "CHILD_EMPLOYMENT_ALLOWANCE_NOT_CALCULATED"), true);
});

test("10. Ausbildungsvergütung wird nicht automatisch von brutto in netto umgerechnet", () => {
  const gross = evaluateChildIncomeSource(source({ incomeType: "training-wage", amountType: "gross", monthlyAverage: "603" }), child());
  const net = evaluateChildIncomeSource(source({ incomeType: "training-wage", amountType: "net", monthlyAverage: "603" }), child());
  assert.equal(gross.rawMonthlyAverage, 603);
  assert.equal(net.classification, "UNRESOLVED");
});

test("11. normaler Nebenjob wird getrennt klassifiziert", () => {
  const result = evaluateChildIncomeSource(source({ incomeType: "side-job", subtype: "normal", amountType: "gross" }), child());
  assert.equal(result.classification, "NORMAL_SIDE_JOB_RAW_GROSS");
  assert.equal(result.countableAfterConfirmedDeductions, null);
});

test("12. Schülerjob außerhalb der Ferien wird nur mit Unterart eindeutig erkannt", () => {
  const result = evaluateChildIncomeSource(source({ incomeType: "side-job", subtype: "student-regular", amountType: "gross" }), child());
  assert.equal(result.classification, "STUDENT_JOB_RAW_GROSS");
  assert.equal(hasOpen(result, "CHILD_STUDENT_JOB_ALLOWANCE_NOT_CALCULATED"), true);
});

test("13. unbekannter Nebenjob wird nicht als Ferienjob freigestellt", () => {
  const result = evaluateChildIncomeSource(source({ incomeType: "side-job", subtype: "unknown", amountType: "gross" }), child());
  assert.equal(result.classification, "SIDE_JOB_SUBTYPE_UNRESOLVED");
  assert.equal(result.countableAfterConfirmedDeductions, null);
});

test("14. bestätigter Ferienjob wird nur mit vollständiger kombinierter Unterart ausgeschlossen", () => {
  const result = evaluateChildIncomeSource(source({ incomeType: "side-job", subtype: "school-holiday-only", amountType: "gross" }), child({ age: "17" }));
  assert.equal(result.classification, "CONFIRMED_SCHOOL_HOLIDAY_INCOME_EXCLUDED");
  assert.equal(result.countableAfterConfirmedDeductions, 0);
});

test("15. unbekannter Schülerstatus erzeugt einen offenen Prüfpunkt", () => {
  const result = evaluateChildIncomeSource(source({ incomeType: "side-job", subtype: "unknown", amountType: "gross" }), child());
  assert.equal(hasOpen(result, "CHILD_STUDENT_STATUS_NOT_CAPTURED"), true);
});

test("16. unbekannte Tätigkeit in den Schulferien erzeugt einen offenen Prüfpunkt", () => {
  const result = evaluateChildIncomeSource(source({ incomeType: "side-job", subtype: "unknown", amountType: "gross" }), child());
  assert.equal(hasOpen(result, "CHILD_SCHOOL_HOLIDAY_ONLY_STATUS_NOT_CAPTURED"), true);
});

test("17. Ferienjob ohne verwertbares Alter unter 25 wird nicht ausgeschlossen", () => {
  const result = evaluateChildIncomeSource(source({ incomeType: "side-job", subtype: "school-holiday-only", amountType: "gross" }), child({ age: "" }));
  assert.equal(result.countableAfterConfirmedDeductions, null);
  assert.equal(hasOpen(result, "CHILD_SCHOOL_HOLIDAY_JOB_AGE_REQUIREMENT_NOT_MET"), true);
});

test("18. BAföG wird anhand der Unterart getrennt erkannt", () => {
  assert.equal(evaluateChildIncomeSource(source({ incomeType: "education-support", subtype: "bafog", amountType: "notice" }), child()).classification, "EDUCATION_SUPPORT_BAFOG_IDENTIFIED");
});

test("19. BAB wird anhand der Unterart getrennt erkannt", () => {
  assert.equal(evaluateChildIncomeSource(source({ incomeType: "education-support", subtype: "bab", amountType: "notice" }), child()).classification, "EDUCATION_SUPPORT_BAB_IDENTIFIED");
});

test("20. Stipendium wird getrennt erkannt und bleibt zweckbezogen offen", () => {
  const result = evaluateChildIncomeSource(source({ incomeType: "education-support", subtype: "scholarship", amountType: "notice" }), child());
  assert.equal(result.classification, "SCHOLARSHIP_IDENTIFIED");
  assert.equal(hasOpen(result, "CHILD_SCHOLARSHIP_PROGRAM_AND_PURPOSE_NOT_CAPTURED"), true);
});

test("21. unbekannte Ausbildungsförderungs-Unterart bleibt unresolved", () => {
  const result = evaluateChildIncomeSource(source({ incomeType: "education-support", subtype: "unknown", amountType: "notice" }), child());
  assert.equal(result.status, "UNRESOLVED");
  assert.equal(result.countableAfterConfirmedDeductions, null);
});

test("22. Freiwilligendienst wird nicht pauschal voll angerechnet", () => {
  const result = evaluateChildIncomeSource(source({ incomeType: "voluntary-service", amountType: "notice" }), child());
  assert.equal(result.classification, "VOLUNTARY_SERVICE_IDENTIFIED");
  assert.equal(result.countableAfterConfirmedDeductions, null);
});

test("23. sonstiger Freitext wird unverändert weitergegeben und nicht interpretiert", () => {
  const result = evaluateChildIncomeSource(source({ incomeType: "other", customLabel: "Einmalige Familienhilfe", amountType: "net" }), child());
  assert.equal(result.customLabel, "Einmalige Familienhilfe");
  assert.equal(result.classification, "UNRESOLVED");
});

test("24. explizite 0 ist gültig", () => {
  assert.equal(prepareSixMonthValues(source({ monthlyAverage: "0" })).status, "PREPARED");
});

test("25. leerer Betrag bleibt unvollständig", () => {
  assert.equal(prepareSixMonthValues(source({ monthlyAverage: "" })).status, "MISSING_REQUIRED_DATA");
});

test("26. negativer Betrag ist ungültig", () => {
  assert.equal(prepareSixMonthValues(source({ monthlyAverage: "-1" })).status, "MISSING_REQUIRED_DATA");
});

test("27. ein einzelner Zufluss wird weiterhin durch sechs geteilt", () => {
  const result = prepareSixMonthValues(source({ entryMethod: "monthly", monthlyValues: ["600", "0", "0", "0", "0", "0"] }));
  assert.equal(result.monthlyAverage, 100);
});

test("28. mehrere Quellen desselben Kindes bleiben getrennt", () => {
  const result = evaluateChildIncome(child({ incomeSources: [source(), source({ id: "child-income-2", incomeType: "advance-maintenance", amountType: "notice" })] }));
  assert.equal(result.sources.length, 2);
  assert.notEqual(result.sources[0].sourceId, result.sources[1].sourceId);
});

test("29. Einkommen verschiedener Kinder wird nicht zusammengeworfen", () => {
  const childA1 = evaluateChildIncome(child({ id: "child-a1", incomeSources: [source({ monthlyAverage: "100" })] }));
  const childA2 = evaluateChildIncome(child({ id: "child-a2", incomeSources: [source({ id: "child-a2-income", monthlyAverage: "900" })] }));
  assert.equal(childA1.rawMonthlyAverage, 100);
  assert.equal(childA2.rawMonthlyAverage, 900);
});

test("30. Kindeseinkommensauswertung verändert Eingabeobjekte nicht", () => {
  const input = child({ incomeSources: [source({ incomeType: "side-job", subtype: "unknown", amountType: "gross" })] });
  const before = JSON.stringify(input);
  evaluateChildIncome(input, { applicationMonth: 7, applicationYear: 2026 });
  assert.equal(JSON.stringify(input), before);
});

test("31. alte Nebenjobquelle ohne Unterart migriert defensiv zu unknown", () => {
  const legacy = source({ incomeType: "side-job", amountType: "gross" });
  delete legacy.subtype;
  assert.equal(normalizeChildIncomeSource(legacy).subtype, "unknown");
  assert.equal(legacy.subtype, undefined);
});

test("32. alte Ausbildungsförderung ohne Unterart migriert defensiv zu unknown", () => {
  const legacy = source({ incomeType: "education-support", amountType: "notice" });
  delete legacy.subtype;
  assert.equal(normalizeChildIncomeSource(legacy).subtype, "unknown");
});

test("33. Kindresultat enthält sechs getrennte Monatspositionen", () => {
  const result = evaluateChildIncome(child(), { applicationMonth: 7, applicationYear: 2026 });
  assert.equal(result.monthly.length, 6);
  assert.equal(result.monthly[0].sources[0].sourceId, "child-income-1");
});

test("34. Rohwert wird nicht als endgültig bereinigter Wert ausgegeben", () => {
  const result = evaluateChildIncome(child());
  assert.equal(result.rawMonthlyAverage, 100);
  assert.equal(result.countableAfterConfirmedDeductions, null);
});

test("35. ausdrücklich kein Kindeseinkommen ergibt sicher 0", () => {
  const result = evaluateChildIncome(child({ hasOwnIncome: "no", incomeSources: [] }));
  assert.equal(result.countableAfterConfirmedDeductions, 0);
});

test("36. ungültige Nebenjob-Unterart erzeugt Validierungsfehler", () => {
  const inputChild = child({ incomeSources: [source({ incomeType: "side-job", subtype: "invalid", amountType: "gross" })] });
  assert.equal(hasValidationCode(validateCalculatorState(state(inputChild)), "CHILD_SIDE_JOB_SUBTYPE_INVALID", "errors"), true);
});

test("37. explizite 0 bleibt auch in der Validierung gültig", () => {
  const inputChild = child({ incomeSources: [source({ monthlyAverage: "0" })] });
  assert.equal(hasValidationCode(validateCalculatorState(state(inputChild)), "CHILD_INCOME_AMOUNT_INVALID", "errors"), false);
});

test("38. monatliche Eingabe benötigt sechs Werte", () => {
  const inputChild = child({ incomeSources: [source({ entryMethod: "monthly", monthlyValues: ["1", "2", "3", "4", "5", ""] })] });
  assert.equal(hasValidationCode(validateCalculatorState(state(inputChild)), "CHILD_INCOME_MONTH_MISSING", "errors"), true);
});

test("39. eine Ausbildungsvergütung wird trotz Ferien-Unterart nicht freigestellt", () => {
  const result = evaluateChildIncomeSource(source({ incomeType: "training-wage", subtype: "school-holiday-only", amountType: "gross" }), child());
  assert.equal(result.classification, "SUPPORTED_RAW_GROSS");
  assert.equal(result.countableAfterConfirmedDeductions, null);
});

test("40. D1 verwendet nur KIZ-INCOME-CHILD-001 und keine Minderungsregel", () => {
  const result = evaluateChildIncome(child());
  assert.equal(result.ruleId, RULE_IDS.childIncome);
  assert.equal(Object.values(RULE_IDS).includes("KIZ-REDUCE-CHILD-001"), false);
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

console.log(`${passed}/${tests.length} Tests für KIZ-INCOME-CHILD-001 (Phase D1) erfolgreich.`);
