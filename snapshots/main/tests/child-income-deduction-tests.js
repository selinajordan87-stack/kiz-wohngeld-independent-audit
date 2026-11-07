const assert = require("node:assert/strict");
const {
  normalizeChildIncomeSource,
  calculateChildIncomeForMonth,
  evaluateChildIncome,
} = require("../calculator.js");
const { validateCalculatorState } = require("../validation.js");

function series(monthlyAverage = "0", overrides = {}) {
  return { entryMethod: "average", monthlyAverage, monthlyValues: ["", "", "", "", "", ""], ...overrides };
}

function source(overrides = {}) {
  return {
    id: "income-1",
    incomeType: "maintenance",
    subtype: "",
    customLabel: "",
    amountType: "net",
    entryMethod: "average",
    monthlyAverage: "300",
    monthlyValues: ["", "", "", "", "", ""],
    directDeductions: { tax: series(), socialInsurance: series() },
    ...overrides,
  };
}

function earned(overrides = {}) {
  return source({ incomeType: "side-job", subtype: "normal", amountType: "gross", monthlyAverage: "200", ...overrides });
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
    eligiblePrivateInsuranceStatus: "no",
    incomeSources: [source()],
    ...overrides,
  };
}

function household(letter = "A") {
  const result = {
    label: `Haushalt ${letter}`,
    adults: "single",
    person1: "Person",
    partner: "",
    applicantIncomeSources: [], partnerIncomeSources: [], applicantExpenses: [], partnerExpenses: [],
    otherResidents: "0", housingBenefit: "0", housingBenefitStatus: "none", additionalNeedOverride: "",
    housingType: "rent", housingCosts: { rent: { coldRent: "0", coldUtilities: "0", heating: "0" }, owner: {} },
    hotWaterType: "central", hotWaterNote: "", assetsStatus: "no", specialSituations: [],
  };
  result.applicantIncomeStatus = result.applicantIncomeSources.length ? "present" : "none";
  result.partnerIncomeStatus = result.partnerIncomeSources.length ? "present" : "none";
  return result;
}

function state(inputChild) {
  return { dataVersion: 7, applicationMonth: 7, applicationYear: 2026, mode: "single", scenarioHalfForwarding: false, centralChildren: [inputChild], households: { A: household("A"), B: household("B") } };
}

function result(inputChild, context = { applicationMonth: 7, applicationYear: 2026 }) {
  return evaluateChildIncome(inputChild, context);
}

function month(inputChild, context) {
  return result(inputChild, context).monthly[0];
}

function hasCode(collection, code) {
  return collection.some((item) => item.code === code);
}

const tests = [];
function test(name, run) { tests.push({ name, run }); }

test("1. sechs bereinigte Monatswerte werden addiert und durch sechs geteilt", () => {
  const r = result(child({ incomeSources: [source({ entryMethod: "monthly", monthlyValues: ["0", "100", "200", "300", "400", "500"] })] }));
  assert.deepEqual(r.monthlyCountableChildIncome, [0, 100, 200, 300, 400, 500]);
  assert.equal(r.countableChildIncomeAverage, 250);
});

test("2. drei Nullmonate und drei 300-Euro-Monate ergeben 150", () => {
  const r = result(child({ incomeSources: [source({ entryMethod: "monthly", monthlyValues: ["0", "0", "0", "300", "300", "300"] })] }));
  assert.equal(r.countableChildIncomeAverage, 150);
});

test("3. Divisor bleibt auch bei einem Zufluss sechs", () => {
  const r = result(child({ incomeSources: [source({ entryMethod: "monthly", monthlyValues: ["600", "0", "0", "0", "0", "0"] })] }));
  assert.equal(r.countableChildIncomeAverage, 100);
});

test("4. explizite Null bleibt ein unterstützter Monatswert", () => {
  assert.equal(result(child({ incomeSources: [source({ monthlyAverage: "0" })] })).status, "SUPPORTED");
});

test("5. unvollständiger relevanter Monat verhindert den Enddurchschnitt", () => {
  const r = result(child({ incomeSources: [source({ entryMethod: "monthly", monthlyValues: ["1", "2", "3", "4", "5", ""] })] }));
  assert.equal(r.countableChildIncomeAverage, null);
});

test("6. laufender Unterhalt ohne Abzug bleibt vollständig countable", () => {
  assert.equal(result(child()).countableChildIncomeAverage, 300);
});

test("7. Unterhalt bleibt über childId an genau das Kind gebunden", () => {
  assert.equal(result(child({ id: "child-a1" })).childId, "child-a1");
});

test("8. Unterhaltsquelle bildet nur den tatsächlich eingegebenen Zufluss ab", () => {
  assert.equal(month(child()).rawTotal, 300);
  assert.equal("titledAmount" in month(child()).sources[0], false);
});

test("9. laufender UVG-Zufluss wird berücksichtigt", () => {
  assert.equal(result(child({ incomeSources: [source({ incomeType: "advance-maintenance", amountType: "notice", monthlyAverage: "200" })] })).countableChildIncomeAverage, 200);
});

test("10. Unterhalt und UVG bleiben getrennte Quellen und werden monatlich addiert", () => {
  const r = result(child({ incomeSources: [source({ monthlyAverage: "150" }), source({ id: "income-2", incomeType: "advance-maintenance", amountType: "notice", monthlyAverage: "100" })] }));
  assert.equal(r.monthly[0].sources.length, 2);
  assert.equal(r.monthly[0].countableIncome, 250);
});

test("11. minderjährig ohne eigene Versicherung erhält keinen 30-Euro-Abzug", () => {
  assert.equal(month(child({ eligiblePrivateInsuranceStatus: "no" })).deductions.length, 0);
});

test("12. minderjährig mit eigener Versicherung erhält einmal 30 Euro", () => {
  const m = month(child({ eligiblePrivateInsuranceStatus: "yes" }));
  assert.equal(m.countableIncome, 270);
  assert.equal(m.deductions.filter((item) => item.deductionType === "PRIVATE_INSURANCE_FLAT").length, 1);
});

test("13. zwei nicht erwerbsbezogene Quellen vervielfachen die Versicherungspauschale nicht", () => {
  const m = month(child({ eligiblePrivateInsuranceStatus: "yes", incomeSources: [source(), source({ id: "income-2", incomeType: "advance-maintenance", amountType: "notice", monthlyAverage: "200" })] }));
  assert.equal(m.countableIncome, 470);
  assert.equal(m.deductions.filter((item) => item.deductionType === "PRIVATE_INSURANCE_FLAT").length, 1);
});

test("14. Versicherungspauschale drückt Einkommen nicht unter null", () => {
  assert.equal(month(child({ eligiblePrivateInsuranceStatus: "yes", incomeSources: [source({ monthlyAverage: "20" })] })).countableIncome, 0);
});

test("15. unbekannter Versicherungsstatus blockiert einen relevanten Minderjährigen-Monat", () => {
  assert.equal(result(child({ eligiblePrivateInsuranceStatus: "unknown" })).countableChildIncomeAverage, null);
});

test("16. volljähriges Kind unter 25 erhält die Pauschale nach § 6 Abs. 1 Nr. 1", () => {
  assert.equal(result(child({ age: "18", eligiblePrivateInsuranceStatus: "unknown" })).countableChildIncomeAverage, 270);
});

test("17. ausdrücklich laufende Waisenrente ist berechenbar", () => {
  assert.equal(result(child({ incomeSources: [source({ incomeType: "orphan-pension", subtype: "running", amountType: "notice", monthlyAverage: "250" })] })).countableChildIncomeAverage, 250);
});

test("18. Waisenrentennachzahlung bleibt unresolved", () => {
  assert.equal(result(child({ incomeSources: [source({ incomeType: "orphan-pension", subtype: "backpay", amountType: "notice" })] })).countableChildIncomeAverage, null);
});

test("19. bestätigter Ferienjob bleibt vollständig ausgeschlossen", () => {
  const r = result(child({ incomeSources: [earned({ subtype: "school-holiday-only", monthlyAverage: "900" })] }));
  assert.equal(r.countableChildIncomeAverage, 0);
  assert.equal(r.monthly[0].excludedTotal, 900);
});

test("20. Ausbildungsvergütung wird nicht über eine Ferien-Unterart ausgeschlossen", () => {
  const r = result(child({ incomeSources: [earned({ incomeType: "training-wage", subtype: "school-holiday-only", monthlyAverage: "500" })] }));
  assert.equal(r.countableChildIncomeAverage, null);
});

test("21. unbekannter Nebenjob-Grenzfall bleibt offen", () => {
  assert.equal(result(child({ incomeSources: [earned({ subtype: "unknown" })] })).status, "UNRESOLVED");
});

test("22. Schülerjob unter 25 nutzt 603 Euro im Jahr 2026", () => {
  const m = month(child({ incomeSources: [earned({ subtype: "student-regular", monthlyAverage: "800" })] }));
  const basic = m.deductions.find((item) => item.deductionType === "BASIC_ALLOWANCE_2B");
  assert.equal(basic.statutoryAmount, 603);
  assert.equal(basic.amount, 603);
});

test("23. im Abs.-2b-Fall entfällt die erste 20-Prozent-Stufe", () => {
  const m = month(child({ incomeSources: [earned({ subtype: "student-regular", monthlyAverage: "700" })] }));
  assert.equal(m.deductions.find((item) => item.deductionType === "EARNED_INCOME_ALLOWANCE").calculatedAmount, 54);
});

test("24. besonderer Grundabsetzbetrag mindert keinen Unterhalt", () => {
  const r = result(child({ incomeSources: [earned({ subtype: "student-regular", monthlyAverage: "300" }), source({ id: "income-2", monthlyAverage: "300" })] }));
  assert.equal(r.countableChildIncomeAverage, 300);
});

test("25. countable earned income wird niemals negativ", () => {
  assert.equal(result(child({ incomeSources: [earned({ subtype: "student-regular", monthlyAverage: "100" })] })).countableChildIncomeAverage, 0);
});

test("26. normaler Nebenjob nutzt einmal die allgemeine 100-Euro-Grundlogik", () => {
  assert.equal(result(child({ incomeSources: [earned({ monthlyAverage: "200" })] })).countableChildIncomeAverage, 80);
});

test("27. fehlende tatsächliche Steuer-/SV-Angaben werden nicht geschätzt", () => {
  const input = earned({ directDeductions: { tax: series(""), socialInsurance: series("") } });
  assert.equal(result(child({ incomeSources: [input] })).countableChildIncomeAverage, null);
});

test("28. zwei normale Erwerbsquellen erhalten nur einen Personen-Grundabsetzbetrag", () => {
  const r = result(child({ incomeSources: [earned({ monthlyAverage: "100" }), earned({ id: "income-2", monthlyAverage: "100" })] }));
  assert.equal(r.countableChildIncomeAverage, 80);
  assert.equal(r.monthly[0].deductions.filter((item) => item.deductionType === "BASIC_ALLOWANCE").length, 1);
});

test("29. Ausbildungsvergütung beginnt beim Brutto", () => {
  assert.equal(month(child({ incomeSources: [earned({ incomeType: "training-wage", subtype: "eligible-training", monthlyAverage: "800" })] })).rawTotal, 800);
});

test("30. Steuern und Pflichtbeiträge werden nur in eingegebener Höhe abgezogen", () => {
  const input = earned({ incomeType: "training-wage", subtype: "other-employment", monthlyAverage: "500", directDeductions: { tax: series("50"), socialInsurance: series("100") } });
  const m = month(child({ incomeSources: [input] }));
  assert.equal(m.deductions.find((item) => item.deductionType === "TAX").amount, 50);
  assert.equal(m.deductions.find((item) => item.deductionType === "MANDATORY_SOCIAL_INSURANCE").amount, 100);
  assert.equal(m.countableIncome, 170);
});

test("31. förderfähige Ausbildungsvergütung nutzt Sondergrundbetrag und Erwerbsfreibetrag", () => {
  assert.equal(result(child({ incomeSources: [earned({ incomeType: "training-wage", subtype: "eligible-training", monthlyAverage: "800" })] })).countableChildIncomeAverage, 113);
});

test("32. 2025er Bemessungsmonate verwenden den belegten 556-Euro-Wert", () => {
  const r = result(child({ incomeSources: [earned({ subtype: "student-regular", monthlyAverage: "600" })] }), { applicationMonth: 1, applicationYear: 2026 });
  assert.equal(r.monthly[0].deductions.find((item) => item.deductionType === "BASIC_ALLOWANCE_2B").statutoryAmount, 556);
  assert.equal(r.countableChildIncomeAverage, 20);
});

test("33. Erwerbsbrutto über 1200 bleibt ohne 1500-Euro-Voraussetzung offen", () => {
  assert.equal(result(child({ incomeSources: [earned({ monthlyAverage: "1300" })] })).countableChildIncomeAverage, null);
});

test("34. BAföG, BAB und Ausbildungsgeld bleiben getrennte Unterarten", () => {
  const values = ["bafog", "bab", "training-allowance"].map((subtype, index) => result(child({ incomeSources: [source({ id: `e-${index}`, incomeType: "education-support", subtype, amountType: "notice" })] })).sources[0].subtype);
  assert.deepEqual(values, ["bafog", "bab", "training-allowance"]);
});

test("35. Förderbestandteile bleiben unresolved", () => {
  assert.equal(result(child({ incomeSources: [source({ incomeType: "education-support", subtype: "bafog", amountType: "notice" })] })).countableChildIncomeAverage, null);
});

test("36. Förder-Grundabzug wird nach Erwerbsverbrauch nicht doppelt angewandt", () => {
  const m = month(child({ incomeSources: [earned({ incomeType: "training-wage", subtype: "eligible-training", monthlyAverage: "500" }), source({ id: "income-2", incomeType: "education-support", subtype: "bab", amountType: "notice", monthlyAverage: "200" })] }));
  assert.equal(m.deductions.find((item) => item.deductionType === "EDUCATION_SUPPORT_BASIC_ALLOWANCE").status, "NOT_APPLIED_ALREADY_USED_ON_EARNED_INCOME");
});

test("37. reines Freiwilligendienst-Taschengeld nutzt § 11b Abs. 2b", () => {
  const r = result(child({ incomeSources: [earned({ incomeType: "voluntary-service", subtype: "pocket-money-only", monthlyAverage: "500" })] }));
  assert.equal(r.countableChildIncomeAverage, 0);
});

test("38. Freiwilligendienst mit weiteren Bestandteilen bleibt unresolved", () => {
  assert.equal(result(child({ incomeSources: [earned({ incomeType: "voluntary-service", subtype: "includes-other-benefits" })] })).status, "UNRESOLVED");
});

test("39. 300 Unterhalt plus 200 Nebenjob werden erst monatlich zusammengeführt", () => {
  const r = result(child({ incomeSources: [source(), earned({ id: "income-2" })] }));
  assert.equal(r.countableChildIncomeAverage, 380);
});

test("40. 200 UVG plus 500 Ausbildungsvergütung bleiben getrennt und ergeben 200", () => {
  const r = result(child({ incomeSources: [source({ incomeType: "advance-maintenance", amountType: "notice", monthlyAverage: "200" }), earned({ id: "income-2", incomeType: "training-wage", subtype: "eligible-training", monthlyAverage: "500" })] }));
  assert.equal(r.countableChildIncomeAverage, 200);
});

test("41. 250 Waisenrente plus 150 Schülerjob ergeben 250", () => {
  const r = result(child({ incomeSources: [source({ incomeType: "orphan-pension", subtype: "running", amountType: "notice", monthlyAverage: "250" }), earned({ id: "income-2", subtype: "student-regular", monthlyAverage: "150" })] }));
  assert.equal(r.countableChildIncomeAverage, 250);
});

test("42. sonstiges Einkommen bleibt ohne Klassifikation unresolved", () => {
  assert.equal(result(child({ incomeSources: [source({ incomeType: "other", customLabel: "Einmalzahlung" })] })).countableChildIncomeAverage, null);
});

test("43. Eingabeobjekte werden von der Monatsengine nicht mutiert", () => {
  const input = child({ incomeSources: [earned()] });
  const before = JSON.stringify(input);
  calculateChildIncomeForMonth(input, 0, {});
  assert.equal(JSON.stringify(input), before);
});

test("44. alte Quellen erhalten unbekannte neue Merkmale und behalten explizite Null", () => {
  const legacy = source({ incomeType: "training-wage", monthlyAverage: "0" });
  delete legacy.subtype;
  delete legacy.directDeductions;
  const normalized = normalizeChildIncomeSource(legacy);
  assert.equal(normalized.subtype, "unknown");
  assert.equal(normalized.monthlyAverage, "0");
  assert.equal(normalized.directDeductions.tax.monthlyAverage, "");
});

test("45. Validierung akzeptiert explizite Nullabzüge und beanstandet fehlende", () => {
  const valid = validateCalculatorState(state(child({ incomeSources: [earned()] })));
  assert.equal(hasCode(valid.errors, "CHILD_EMPLOYMENT_TAX_AMOUNT_INVALID"), false);
  const invalidSource = earned({ directDeductions: { tax: series(""), socialInsurance: series("0") } });
  const invalid = validateCalculatorState(state(child({ incomeSources: [invalidSource] })));
  assert.equal(hasCode(invalid.errors, "CHILD_EMPLOYMENT_TAX_AMOUNT_MISSING"), true);
});

test("46. kein Einkommen liefert sechs Nullen und einen unterstützten Durchschnitt", () => {
  const r = result(child({ hasOwnIncome: "no", incomeSources: [] }));
  assert.deepEqual(r.monthlyCountableChildIncome, [0, 0, 0, 0, 0, 0]);
  assert.equal(r.countableSixMonthTotal, 0);
  assert.equal(r.countableChildIncomeAverage, 0);
  assert.equal(r.status, "SUPPORTED");
});

test("47. negative Steuer- oder SV-Beträge werden validiert", () => {
  const input = earned({ directDeductions: { tax: series("-1"), socialInsurance: series("0") } });
  const validation = validateCalculatorState(state(child({ incomeSources: [input] })));
  assert.equal(hasCode(validation.errors, "CHILD_EMPLOYMENT_TAX_AMOUNT_INVALID"), true);
});

test("48. monatliche direkte Abzüge benötigen sechs Werte und akzeptieren sechs Nullen", () => {
  const complete = earned({ directDeductions: { tax: series("", { entryMethod: "monthly", monthlyValues: ["0", "0", "0", "0", "0", "0"] }), socialInsurance: series("0") } });
  assert.equal(hasCode(validateCalculatorState(state(child({ incomeSources: [complete] }))).errors, "CHILD_EMPLOYMENT_TAX_MONTH_MISSING"), false);
  complete.directDeductions.tax.monthlyValues[5] = "";
  assert.equal(hasCode(validateCalculatorState(state(child({ incomeSources: [complete] }))).errors, "CHILD_EMPLOYMENT_TAX_MONTH_MISSING"), true);
});

test("49. ungültige neue Unterart erzeugt einen Validierungsfehler", () => {
  const input = earned({ incomeType: "training-wage", subtype: "not-a-training-type" });
  assert.equal(hasCode(validateCalculatorState(state(child({ incomeSources: [input] }))).errors, "CHILD_TRAINING_WAGE_SUBTYPE_INVALID"), true);
});

test("50. ungültiger Versicherungsstatus erzeugt einen Validierungsfehler", () => {
  const validation = validateCalculatorState(state(child({ eligiblePrivateInsuranceStatus: "invalid" })));
  assert.equal(hasCode(validation.errors, "CHILD_INSURANCE_STATUS_INVALID"), true);
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
console.log(`${passed}/${tests.length} Tests für KIZ-INCOME-CHILD-001 (Phase D1.5) erfolgreich.`);
