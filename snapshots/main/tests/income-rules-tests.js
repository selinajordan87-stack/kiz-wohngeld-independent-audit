const assert = require("node:assert/strict");
const {
  prepareSixMonthValues,
  evaluateAdultIncomeSource,
  evaluateAdultIncomeForHousehold,
  evaluateChildIncomeSource,
  evaluateChildIncome,
  evaluateDirectDeductions,
  evaluateExpense,
  evaluateDeductionsForPerson,
} = require("../calculator.js");

function source(overrides = {}) {
  return {
    id: "income-1",
    personRole: "applicant",
    incomeType: "employment",
    customLabel: "",
    amountType: "gross",
    entryMethod: "average",
    monthlyAverage: "600",
    monthlyValues: ["", "", "", "", "", ""],
    deductions: {},
    ...overrides,
  };
}

function childSource(overrides = {}) {
  return {
    id: "child-income-1",
    incomeType: "maintenance",
    customLabel: "",
    amountType: "net",
    entryMethod: "average",
    monthlyAverage: "100",
    monthlyValues: ["", "", "", "", "", ""],
    ...overrides,
  };
}

function child(overrides = {}) {
  return { id: "child-1", hasOwnIncome: "yes", incomeSources: [childSource()], ...overrides };
}

function householdState(overrides = {}) {
  const result = {
    centralChildren: [],
    households: {
      A: {
        adults: "single",
        applicantIncomeSources: [],
        partnerIncomeSources: [],
        applicantExpenses: [],
        partnerExpenses: [],
        ...overrides,
      },
    },
  };
  if (!Object.hasOwn(overrides, "applicantIncomeStatus")) result.households.A.applicantIncomeStatus = result.households.A.applicantIncomeSources.length ? "present" : "none";
  if (!Object.hasOwn(overrides, "partnerIncomeStatus")) result.households.A.partnerIncomeStatus = result.households.A.partnerIncomeSources.length ? "present" : "none";
  return result;
}

function hasOpen(result, code) {
  return result.openChecks.includes(code);
}

const tests = [];
function test(name, run) {
  tests.push({ name, run });
}

test("1. sechs Monatswerte werden addiert und durch sechs geteilt", () => {
  const result = prepareSixMonthValues(source({ entryMethod: "monthly", monthlyValues: ["100", "200", "300", "400", "500", "600"] }));
  assert.equal(result.sixMonthTotal, 2100);
  assert.equal(result.monthlyAverage, 350);
});

test("2. explizite 0 ist ein gültiger Monatswert", () => {
  const result = prepareSixMonthValues(source({ entryMethod: "monthly", monthlyValues: ["0", "0", "0", "0", "0", "0"] }));
  assert.equal(result.status, "PREPARED");
  assert.equal(result.monthlyAverage, 0);
});

test("3. leerer Pflichtmonat wird nicht als 0 behandelt", () => {
  const result = prepareSixMonthValues(source({ entryMethod: "monthly", monthlyValues: ["1", "2", "3", "4", "5", ""] }));
  assert.equal(result.status, "MISSING_REQUIRED_DATA");
  assert.equal(result.monthlyAverage, null);
});

test("4. Einkommensaufbereitung verändert Eingaben nicht", () => {
  const input = source({ entryMethod: "monthly", monthlyValues: ["1", "2", "3", "4", "5", "6"] });
  const before = JSON.stringify(input);
  evaluateAdultIncomeSource(input);
  assert.equal(JSON.stringify(input), before);
});

test("5. Beschäftigungsbrutto wird strukturell vorbereitet", () => {
  const result = evaluateAdultIncomeSource(source());
  assert.equal(result.classification, "SUPPORTED_RAW_GROSS");
  assert.equal(result.grossOrEnteredAverage, 600);
  assert.equal(result.countableAfterDeductions, null);
});

test("6. Beschäftigungsnetto bleibt unaufgelöst", () => {
  assert.equal(evaluateAdultIncomeSource(source({ amountType: "net" })).status, "UNRESOLVED");
});

test("7. Krankengeld laut Bescheid wird als laufender Zufluss vorbereitet", () => {
  const result = evaluateAdultIncomeSource(source({ incomeType: "sick-pay", amountType: "notice" }));
  assert.equal(result.classification, "SUPPORTED_RUNNING_PAYMENT");
  assert.equal(result.countableBeforeDeductions, 600);
});

test("8. Arbeitslosengeld I wird getrennt von SGB-II-Leistungen behandelt", () => {
  const result = evaluateAdultIncomeSource(source({ incomeType: "unemployment-1", amountType: "notice" }));
  assert.equal(result.classification, "SUPPORTED_RUNNING_PAYMENT");
  assert.equal(result.reasons.some((reason) => reason.includes("SGB-III")), true);
});

test("9. Elterngeld weist auf fehlende Freibetragsdaten hin", () => {
  const result = evaluateAdultIncomeSource(source({ incomeType: "parental-allowance", amountType: "notice" }));
  assert.equal(hasOpen(result, "PARENTAL_ALLOWANCE_EXEMPTION_DATA_NOT_CAPTURED"), true);
});

test("10. Selbstständigkeit wird ohne Gewinnermittlung nicht berechnet", () => {
  const result = evaluateAdultIncomeSource(source({ incomeType: "self-employed" }));
  assert.equal(hasOpen(result, "SELF_EMPLOYMENT_PROFIT_DATA_NOT_CAPTURED"), true);
  assert.equal(result.countableBeforeDeductions, null);
});

test("11. Vermietung bleibt ohne Nettodaten unaufgelöst", () => {
  assert.equal(hasOpen(evaluateAdultIncomeSource(source({ incomeType: "rental" })), "RENTAL_NET_INCOME_DATA_NOT_CAPTURED"), true);
});

test("12. sonstige staatliche Leistung benötigt konkrete Leistungsart", () => {
  assert.equal(hasOpen(evaluateAdultIncomeSource(source({ incomeType: "state-benefit", amountType: "notice" })), "STATE_BENEFIT_TYPE_NOT_CAPTURED"), true);
});

test("13. Mutterschaftsgeld ist als eigene Kategorie ausgeschlossen", () => {
  const result = evaluateAdultIncomeSource(source({ incomeType: "maternity-benefit", amountType: "notice" }));
  assert.equal(result.classification, "CONFIRMED_NON_INCOME");
  assert.equal(result.status, "EXCLUDED");
  assert.equal(result.countableBeforeDeductions, 0);
});

test("14. SGB-II-Leistung ist als eigene Kategorie ausgeschlossen", () => {
  const result = evaluateAdultIncomeSource(source({ incomeType: "sgb2-benefit", amountType: "notice" }));
  assert.equal(result.classification, "CONFIRMED_NON_INCOME");
  assert.equal(result.status, "EXCLUDED");
  assert.equal(result.countableBeforeDeductions, 0);
});

test("15. Kindesunterhalt bleibt ausschließlich dem Kind zugeordnet", () => {
  const inputChild = child();
  assert.equal(evaluateChildIncome(inputChild).averageBeforeDeductions, 100);
  assert.equal(evaluateAdultIncomeForHousehold(householdState(), "A").personResults.applicant.averageBeforeDeductions, 0);
});

test("16. Unterhaltsvorschuss wird kindbezogen vorbereitet", () => {
  const result = evaluateChildIncomeSource(childSource({ incomeType: "advance-maintenance", amountType: "notice" }), child());
  assert.equal(result.countableIncomeBeforeLaterReduction, 100);
});

test("17. Waisenrente bleibt kindbezogen mit Nachzahlungsprüfung", () => {
  const result = evaluateChildIncomeSource(childSource({ incomeType: "orphan-pension", amountType: "notice" }), child());
  assert.equal(result.countableIncomeBeforeLaterReduction, 100);
  assert.equal(hasOpen(result, "CHILD_PENSION_BACKPAY_STATUS_NOT_CAPTURED"), true);
});

test("18. Kindeseinkommen fließt nicht in Haushaltserwachseneneinkommen", () => {
  const state = householdState();
  state.centralChildren = [child({ incomeSources: [childSource({ monthlyAverage: "5000" })] })];
  assert.equal(evaluateAdultIncomeForHousehold(state, "A").personResults.applicant.rawSixMonthTotal, 0);
});

test("19. kein Kindeseinkommen ergibt leere Quellen und 0", () => {
  const result = evaluateChildIncome(child({ hasOwnIncome: "no", incomeSources: [] }));
  assert.equal(result.averageBeforeDeductions, 0);
  assert.deepEqual(result.sources, []);
});

test("20. mehrere Kindeseinkommensquellen bleiben getrennt", () => {
  const result = evaluateChildIncome(child({ incomeSources: [childSource(), childSource({ id: "child-income-2", incomeType: "advance-maintenance" })] }));
  assert.equal(result.sources.length, 2);
  assert.equal(result.averageBeforeDeductions, 200);
});

test("21. Nebenjob wird nicht automatisch als Ferienjob freigestellt", () => {
  const result = evaluateChildIncomeSource(childSource({ incomeType: "side-job", amountType: "gross" }), child());
  assert.equal(hasOpen(result, "CHILD_SCHOOL_HOLIDAY_JOB_STATUS_NOT_CAPTURED"), true);
  assert.equal(result.countableIncomeBeforeLaterReduction, null);
});

test("22. aktivierter direkter Steuerabzug mit Betrag wird unterstützt", () => {
  const result = evaluateDirectDeductions({ tax: true, taxAmount: "50" }, { sourceId: "income-1" });
  assert.equal(result.positions[0].status, "SUPPORTED");
  assert.equal(result.supportedTotal, 50);
});

test("23. aktivierter direkter Abzug ohne Betrag bleibt unvollständig", () => {
  assert.equal(evaluateDirectDeductions({ tax: true, taxAmount: "" }).positions[0].status, "MISSING_REQUIRED_DATA");
});

test("24. nicht aktivierter Abzug erzeugt keinen Betrag", () => {
  const result = evaluateDirectDeductions({ tax: false, taxAmount: "500" });
  assert.deepEqual(result.positions, []);
  assert.equal(result.supportedTotal, 0);
});

test("25. Kfz-Haftpflicht bleibt wegen ungetrennter Bestandteile offen", () => {
  const result = evaluateExpense({ id: "expense-1", expenseType: "car-liability", amount: "30" });
  assert.equal(result.status, "UNRESOLVED");
  assert.equal(hasOpen(result, "CAR_LIABILITY_COMPONENTS_NOT_CAPTURED"), true);
});

test("26. Kinderbetreuungskosten bleiben ohne reine Kostenaufteilung offen", () => {
  assert.equal(hasOpen(evaluateExpense({ id: "expense-1", expenseType: "childcare", amount: "100" }), "CHILDCARE_PURE_COSTS_NOT_CAPTURED"), true);
});

test("27. Fahrtkostendetails werden ohne Satz nicht in Euro umgerechnet", () => {
  const result = evaluateExpense({ id: "expense-1", expenseType: "commute", amount: "", commuteMode: "details", distanceKm: "20", workDaysPerMonth: "18" });
  assert.equal(hasOpen(result, "UNRESOLVED_RATE_REQUIRED"), true);
  assert.equal(result.consideredAmount, null);
});

test("28. geleisteter Unterhalt wird ohne rechtliche Grundlage nicht abgezogen", () => {
  assert.equal(hasOpen(evaluateExpense({ id: "expense-1", expenseType: "paid-maintenance", amount: "200" }), "PAID_MAINTENANCE_LEGAL_BASIS_NOT_CAPTURED"), true);
});

test("29. gesetzlich oder privat unklare Krankenversicherung bleibt offen", () => {
  const result = evaluateDirectDeductions({ healthInsurance: true, healthInsuranceAmount: "100" });
  assert.equal(hasOpen(result, "INSURANCE_SYSTEM_AND_PERIOD_NOT_CAPTURED"), true);
});

test("30. tatsächlicher ÖPNV-Betrag wird strukturell unterstützt", () => {
  const result = evaluateExpense({ id: "expense-1", expenseType: "public-transport", amount: "49" });
  assert.equal(result.status, "SUPPORTED");
  assert.equal(result.consideredAmount, 49);
});

test("31. Personenabzüge bleiben positionsweise nachvollziehbar", () => {
  const result = evaluateDeductionsForPerson([source({ deductions: { tax: true, taxAmount: "20" } })], [{ id: "expense-1", expenseType: "public-transport", amount: "49" }], { personRole: "applicant" });
  assert.equal(result.positions.length, 2);
  assert.equal(result.supportedTotal, 69);
});

test("32. Paarquellen werden getrennt nach Person ausgewertet", () => {
  const state = householdState({ adults: "couple", applicantIncomeSources: [source()], partnerIncomeSources: [source({ id: "income-2", personRole: "partner", incomeType: "sick-pay", amountType: "notice" })] });
  const result = evaluateAdultIncomeForHousehold(state, "A");
  assert.equal(result.personResults.applicant.sources.length, 1);
  assert.equal(result.personResults.partner.sources.length, 1);
});

test("33. unbekannter Erwachseneneinkommensstatus bleibt ungelöst", () => {
  const state = householdState({ applicantIncomeStatus: "unknown", applicantIncomeSources: [] });
  const result = evaluateAdultIncomeForHousehold(state, "A");
  assert.equal(result.personResults.applicant.status, "UNRESOLVED");
  assert.equal(result.personResults.applicant.monthlyAverageAfterFinalCleansing, null);
  assert.equal(result.openChecks.includes("ADULT_INCOME_STATUS_REQUIRED"), true);
});

test("34. ausdrücklich kein Einkommen liefert bestätigte null", () => {
  const state = { ...householdState({ applicantIncomeStatus: "none", applicantIncomeSources: [] }), applicationMonth: 7, applicationYear: 2026 };
  const result = evaluateAdultIncomeForHousehold(state, "A");
  assert.equal(result.personResults.applicant.status, "SUPPORTED");
  assert.equal(result.personResults.applicant.monthlyAverageAfterFinalCleansing, 0);
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

console.log(`${passed}/${tests.length} Tests für Einkommens- und Abzugsregeln erfolgreich.`);
