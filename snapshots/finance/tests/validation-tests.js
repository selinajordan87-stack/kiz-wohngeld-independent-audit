const assert = require("node:assert/strict");
const {
  validateCalculatorState,
  getRelevantHouseholds,
  getChildrenRelevantForHousehold,
} = require("../validation.js");

function household(letter, overrides = {}) {
  return {
    label: `Haushalt ${letter}`,
    adults: "single",
    person1: `Person ${letter}`,
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
    housingCosts: {
      rent: { coldRent: "0", coldUtilities: "0", heating: "0" },
      owner: {
        debtInterest: "0",
        propertyTax: "0",
        buildingInsurance: "0",
        heating: "0",
        otherCostsDescription: "",
        otherCostsAmount: "",
      },
    },
    hotWaterType: "central",
    hotWaterNote: "",
    assetsStatus: "no",
    specialSituations: [],
    ...overrides,
  };
}

function child(overrides = {}) {
  return {
    id: "central-1",
    name: "Kind A1",
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

function adultIncome(overrides = {}) {
  return {
    id: "income-1",
    personRole: "applicant",
    incomeType: "employment",
    customLabel: "",
    amountType: "gross",
    entryMethod: "average",
    monthlyAverage: "1000",
    monthlyValues: ["", "", "", "", "", ""],
    employmentType: "social-insurance",
    deductions: {},
    ...overrides,
  };
}

function childIncome(overrides = {}) {
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

function validState(overrides = {}) {
  return {
    dataVersion: 3,
    applicationMonth: 7,
    applicationYear: 2026,
    mode: "single",
    scenarioHalfForwarding: false,
    centralChildren: [child()],
    households: { A: household("A"), B: household("B") },
    ...overrides,
  };
}

function hasCode(result, code, severity) {
  const list = severity === "error" ? result.errors : severity === "warning" ? result.warnings : result.infos;
  return list.some((message) => message.code === code);
}

const tests = [];
function test(name, run) {
  tests.push({ name, run });
}

test("1. leerer Standardzustand stürzt nicht ab", () => {
  const state = validState({
    centralChildren: [],
    households: {
      A: household("A", {
        person1: "",
        otherResidents: "",
        housingBenefit: "",
        housingBenefitStatus: "unknown",
        housingCosts: { rent: { coldRent: "", coldUtilities: "", heating: "" }, owner: {} },
        hotWaterType: "unknown",
        assetsStatus: "unknown",
      }),
      B: household("B"),
    },
  });
  const result = validateCalculatorState(state);
  assert.ok(result.errors.length > 0);
  assert.ok(result.warnings.length > 0);
});

test("2. unbeantworteter Erwachsenen-Einkommensstatus erzeugt ERROR", () => {
  const result = validateCalculatorState(validState({ households: { A: household("A", { applicantIncomeStatus: "unknown" }), B: household("B", { applicantIncomeStatus: "none" }) } }));
  assert.equal(hasCode(result, "ADULT_INCOME_STATUS_REQUIRED", "error"), true);
  assert.equal(hasCode(result, "ADULT_NO_INCOME_ASSUMED_ZERO", "info"), false);
});

test("3. fehlender Durchschnittsbetrag erzeugt ERROR", () => {
  const state = validState();
  state.households.A.applicantIncomeSources = [adultIncome({ monthlyAverage: "" })];
  assert.equal(hasCode(validateCalculatorState(state), "ADULT_INCOME_AVERAGE_MISSING", "error"), true);
});

test("4. fehlender Einzelmonat erzeugt ERROR", () => {
  const state = validState();
  state.households.A.applicantIncomeSources = [
    adultIncome({ entryMethod: "monthly", monthlyValues: ["1", "2", "3", "4", "5", ""] }),
  ];
  assert.equal(hasCode(validateCalculatorState(state), "ADULT_INCOME_MONTH_MISSING", "error"), true);
});

test("5. Kind ohne Betreuungssituation erzeugt ERROR", () => {
  const state = validState({
    centralChildren: [child({ careSituation: "", affectedHouseholds: [], childBenefitAt: "unknown", childBenefitPerson: "" })],
  });
  assert.equal(hasCode(validateCalculatorState(state), "CHILD_CARE_SITUATION_MISSING", "error"), true);
});

test("6. Umgangsmodell ohne Aufenthaltstage erzeugt ERROR", () => {
  const state = validState({ centralChildren: [child({ careSituation: "umgang-a", stayDays: "" })] });
  assert.equal(hasCode(validateCalculatorState(state), "CHILD_STAY_DAYS_MISSING", "error"), true);
});

test("7. Kindergeldperson aus falschem Haushalt erzeugt ERROR", () => {
  const state = validState({ centralChildren: [child({ childBenefitAt: "A", childBenefitPerson: "applicant-b" })] });
  assert.equal(hasCode(validateCalculatorState(state), "CHILD_BENEFIT_PERSON_HOUSEHOLD_MISMATCH", "error"), true);
});

test("8. Einkommen Nein mit Quelle erzeugt Widerspruchs-ERROR", () => {
  const state = validState({ centralChildren: [child({ hasOwnIncome: "no", incomeSources: [childIncome()] })] });
  assert.equal(hasCode(validateCalculatorState(state), "CHILD_INCOME_CONTRADICTION", "error"), true);
});

test("9. Einkommen Ja ohne Quelle erzeugt ERROR", () => {
  const state = validState({ centralChildren: [child({ hasOwnIncome: "yes", incomeSources: [] })] });
  assert.equal(hasCode(validateCalculatorState(state), "CHILD_INCOME_SOURCE_MISSING", "error"), true);
});

test("10. leere Mietkosten erzeugen ERROR", () => {
  const state = validState();
  state.households.A.housingCosts.rent = { coldRent: "", coldUtilities: "", heating: "" };
  const result = validateCalculatorState(state);
  assert.equal(hasCode(result, "HOUSING_COLD_RENT_MISSING", "error"), true);
  assert.equal(hasCode(result, "HOUSING_COLD_UTILITIES_MISSING", "error"), true);
  assert.equal(hasCode(result, "HOUSING_HEATING_MISSING", "error"), true);
});

test("11. bewilligtes Wohngeld ohne Betrag erzeugt ERROR", () => {
  const state = validState();
  state.households.A.housingBenefitStatus = "approved";
  state.households.A.housingBenefit = "";
  assert.equal(hasCode(validateCalculatorState(state), "HOUSING_BENEFIT_AMOUNT_MISSING", "error"), true);
});

test("12. Vermögen Ja erzeugt WARNING", () => {
  const state = validState();
  state.households.A.assetsStatus = "yes";
  const result = validateCalculatorState(state);
  assert.equal(hasCode(result, "ASSETS_PRESENT_NOT_FULLY_SUPPORTED", "warning"), true);
  assert.equal(result.errors.some((message) => message.code.includes("ASSETS")), false);
});

test("13. Vermögensstatus unbekannt erzeugt WARNING", () => {
  const state = validState();
  state.households.A.assetsStatus = "unknown";
  assert.equal(hasCode(validateCalculatorState(state), "ASSETS_STATUS_UNKNOWN", "warning"), true);
});

test("14. doppelte Einkommensquellen-ID erzeugt ERROR", () => {
  const state = validState();
  state.households.A.applicantIncomeSources = [adultIncome(), adultIncome()];
  const result = validateCalculatorState(state);
  assert.equal(hasCode(result, "ADULT_INCOME_DUPLICATE_ID", "error"), true);
});

test("15. B-only-Kind wird im Einzelmodus nicht A zugerechnet", () => {
  const bOnly = child({
    id: "central-b",
    name: "Kind B1",
    careSituation: "dauerhaft-b",
    affectedHouseholds: ["B"],
    childBenefitAt: "B",
    childBenefitPerson: "applicant-b",
  });
  const state = validState({ centralChildren: [bOnly] });
  assert.deepEqual(getRelevantHouseholds(state), ["A"]);
  assert.deepEqual(getChildrenRelevantForHousehold(state, "A"), []);
  assert.equal(validateCalculatorState(state).errors.some((message) => message.entityId === "central-b"), false);
});

test("16. Kind B2 ist B und nicht A zugeordnet", () => {
  const childB2 = child({
    id: "central-max",
    name: "Kind B2",
    careSituation: "wechselmodell-b-external",
    affectedHouseholds: ["B"],
    hasExternalHousehold: true,
    childBenefitAt: "external",
    childBenefitPerson: "external-person",
  });
  const state = validState({ mode: "compare", centralChildren: [childB2] });
  assert.deepEqual(getChildrenRelevantForHousehold(state, "A"), []);
  assert.deepEqual(getChildrenRelevantForHousehold(state, "B").map((item) => item.id), ["central-max"]);
});

test("17. Warmwasser unbekannt erzeugt WARNING", () => {
  const state = validState();
  state.households.A.hotWaterType = "unknown";
  assert.equal(hasCode(validateCalculatorState(state), "HOT_WATER_TYPE_UNKNOWN", "warning"), true);
});

test("18. manueller Mehrbedarf 0 ist kein positiver Override", () => {
  const state = validState();
  state.households.A.additionalNeedOverride = "0";
  const result = validateCalculatorState(state);
  assert.equal(hasCode(result, "SINGLE_PARENT_NEED_OVERRIDE_INVALID", "error"), false);
  assert.equal(hasCode(result, "UNUSED_SINGLE_PARENT_NEED_OVERRIDE", "warning"), false);
});

test("19. Validierung verändert den State nicht", () => {
  const state = validState();
  state.households.A.applicantIncomeSources = [adultIncome()];
  const before = JSON.stringify(state);
  validateCalculatorState(state);
  assert.equal(JSON.stringify(state), before);
});

test("20. formal vollständiger Datensatz enthält keine ERROR", () => {
  const result = validateCalculatorState(validState({ households: { A: household("A", { applicantIncomeStatus: "none" }), B: household("B", { applicantIncomeStatus: "none" }) } }));
  assert.equal(result.isValid, true);
  assert.equal(result.summary.errorCount, 0);
});

test("21. unbekannter Familienstand des Kindes erzeugt eine Warnung", () => {
  const result = validateCalculatorState(validState({ centralChildren: [child({ maritalPartnershipStatus: "unknown" })] }));
  assert.equal(hasCode(result, "CHILD_MARITAL_PARTNERSHIP_STATUS_UNKNOWN", "warning"), true);
});

test("22. ungültiger Familienstand des Kindes erzeugt einen Fehler", () => {
  const result = validateCalculatorState(validState({ centralChildren: [child({ maritalPartnershipStatus: "invalid" })] }));
  assert.equal(hasCode(result, "CHILD_MARITAL_PARTNERSHIP_STATUS_INVALID", "error"), true);
});

test("23. verheiratet oder verpartnert ist kein Validierungsfehler", () => {
  const result = validateCalculatorState(validState({ centralChildren: [child({ maritalPartnershipStatus: "yes" })] }));
  assert.equal(hasCode(result, "CHILD_MARITAL_PARTNERSHIP_STATUS_INVALID", "error"), false);
});

test("24. monatliche Abzugsserie benötigt sechs Werte", () => {
  const state = validState();
  state.households.A.applicantIncomeSources = [adultIncome({ deductions: { tax: { enabled: true, entryMethod: "monthly", monthlyAverage: "", monthlyValues: ["1", "2", "3", "4", "5", ""] } } })];
  assert.equal(hasCode(validateCalculatorState(state), "INCOME_DEDUCTION_MONTH_MISSING", "error"), true);
});

test("25. sechs explizite Nullwerte einer Abzugsserie sind gültig", () => {
  const state = validState();
  state.households.A.applicantIncomeSources = [adultIncome({ deductions: { tax: { enabled: true, entryMethod: "monthly", monthlyAverage: "", monthlyValues: ["0", "0", "0", "0", "0", "0"] } } })];
  assert.equal(hasCode(validateCalculatorState(state), "INCOME_DEDUCTION_MONTH_MISSING", "error"), false);
});

test("26. monatliche Ausgabenserie benötigt sechs Werte", () => {
  const state = validState();
  state.households.A.applicantExpenses = [{ id: "expense-1", personRole: "applicant", expenseType: "public-transport", entryMethod: "monthly", monthlyAverage: "", monthlyValues: ["1", "2", "3", "4", "5", ""], description: "", commuteMode: "amount", distanceKm: "", workDaysPerMonth: "" }];
  assert.equal(hasCode(validateCalculatorState(state), "EXPENSE_MONTH_MISSING", "error"), true);
});

test("27. alte flache Ausgaben bleiben validierbar", () => {
  const state = validState();
  state.households.A.applicantExpenses = [{ id: "expense-1", personRole: "applicant", expenseType: "public-transport", amount: "49", description: "", commuteMode: "amount", distanceKm: "", workDaysPerMonth: "" }];
  assert.equal(hasCode(validateCalculatorState(state), "EXPENSE_AMOUNT_MISSING", "error"), false);
});

test("explizites kein Einkommen wird als bestätigter Nullstatus akzeptiert", () => {
  const result = validateCalculatorState(validState({ households: { A: household("A", { applicantIncomeStatus: "none" }), B: household("B", { applicantIncomeStatus: "none" }) } }));
  assert.equal(hasCode(result, "ADULT_INCOME_STATUS_REQUIRED", "error"), false);
  assert.equal(hasCode(result, "ADULT_NO_INCOME_ASSUMED_ZERO", "info"), false);
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

console.log(`${passed}/${tests.length} Validierungstests erfolgreich.`);
