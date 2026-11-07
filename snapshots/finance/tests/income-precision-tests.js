const assert = require("node:assert/strict");
const {
  createAssessmentPeriod,
  prepareSixMonthValues,
  evaluateMinimumIncome,
  evaluateDirectDeductions,
  evaluateExpense,
  evaluateDeductionsForPerson,
  evaluateAdultIncomeForHousehold,
} = require("../calculator.js");

function series(overrides = {}) {
  return { enabled: true, entryMethod: "average", monthlyAverage: "10", monthlyValues: ["", "", "", "", "", ""], ...overrides };
}

function income(overrides = {}) {
  return {
    id: "income-1", personRole: "applicant", incomeType: "employment", amountType: "gross",
    entryMethod: "average", monthlyAverage: "600", monthlyValues: ["", "", "", "", "", ""], deductions: {}, ...overrides,
  };
}

function expense(overrides = {}) {
  return {
    id: "expense-1", personRole: "applicant", expenseType: "public-transport", description: "", commuteMode: "amount",
    entryMethod: "average", monthlyAverage: "49", monthlyValues: ["", "", "", "", "", ""], distanceKm: "", workDaysPerMonth: "", ...overrides,
  };
}

function household(overrides = {}) {
  const result = { adults: "single", applicantIncomeSources: [], partnerIncomeSources: [], applicantExpenses: [], partnerExpenses: [], ...overrides };
  if (!Object.hasOwn(overrides, "applicantIncomeStatus")) result.applicantIncomeStatus = result.applicantIncomeSources.length ? "present" : "none";
  if (!Object.hasOwn(overrides, "partnerIncomeStatus")) result.partnerIncomeStatus = result.partnerIncomeSources.length ? "present" : "none";
  return result;
}

function state(overrides = {}) {
  return { mode: "single", applicationMonth: 7, applicationYear: 2026, centralChildren: [], households: { A: household(), B: household() }, ...overrides };
}

function minimumWith(source) {
  return evaluateMinimumIncome(state({ households: { A: household({ applicantIncomeSources: [source] }), B: household() } }), "A");
}

function hasOpen(result, code) {
  return result.openChecks.includes(code);
}

const tests = [];
function test(name, run) { tests.push({ name, run }); }

test("1. gleichbleibender direkter Abzug wird sechs Monaten zugeordnet", () => {
  const position = evaluateDirectDeductions({ tax: series({ monthlyAverage: "25" }) }, { sourceId: "income-1" }).positions[0];
  assert.deepEqual(position.monthlyValues, [25, 25, 25, 25, 25, 25]);
  assert.equal(position.sixMonthTotal, 150);
});

test("2. sechs unterschiedliche Abzugsmonate bleiben getrennt", () => {
  const position = evaluateDirectDeductions({ tax: series({ entryMethod: "monthly", monthlyValues: ["1", "2", "3", "4", "5", "6"] }) }).positions[0];
  assert.deepEqual(position.monthlyValues, [1, 2, 3, 4, 5, 6]);
});

test("3. explizite 0 ist in Abzugsmonaten gültig", () => {
  const result = evaluateDirectDeductions({ tax: series({ entryMethod: "monthly", monthlyValues: ["0", "0", "0", "0", "0", "0"] }) });
  assert.equal(result.positions[0].status, "SUPPORTED");
  assert.equal(result.structurallySupportedTotal, 0);
});

test("4. leerer Pflichtmonat ist nicht 0", () => {
  const result = evaluateDirectDeductions({ tax: series({ entryMethod: "monthly", monthlyValues: ["1", "2", "3", "4", "5", ""] }) });
  assert.equal(result.positions[0].status, "MISSING_REQUIRED_DATA");
});

test("5. alte flache Abzugsdaten werden als Durchschnitt verstanden", () => {
  const result = evaluateDirectDeductions({ tax: true, taxAmount: "100" }, { sourceId: "legacy" });
  assert.deepEqual(result.positions[0].monthlyValues, [100, 100, 100, 100, 100, 100]);
});

test("6. alter expliziter Nullbetrag geht nicht verloren", () => {
  assert.equal(evaluateDirectDeductions({ tax: true, taxAmount: "0" }).positions[0].monthlyAverage, 0);
});

test("7. Serienauswertung verändert Eingaben nicht", () => {
  const input = { tax: series({ entryMethod: "monthly", monthlyValues: ["1", "2", "3", "4", "5", "6"] }) };
  const before = JSON.stringify(input); evaluateDirectDeductions(input); assert.equal(JSON.stringify(input), before);
});

test("8. gleichbleibende Ausgabe wird sechs Monaten zugeordnet", () => {
  assert.deepEqual(evaluateExpense(expense()).monthlyValues, [49, 49, 49, 49, 49, 49]);
});

test("9. variable Ausgabemonate bleiben getrennt", () => {
  const result = evaluateExpense(expense({ entryMethod: "monthly", monthlyValues: ["10", "20", "30", "40", "50", "60"] }));
  assert.deepEqual(result.monthlyValues, [10, 20, 30, 40, 50, 60]);
});

test("10. ÖPNV-Monatsserie bleibt strukturell unterstützt", () => {
  assert.equal(evaluateExpense(expense()).status, "SUPPORTED");
});

test("11. Fahrtkostendetails werden weiterhin nicht in Euro umgerechnet", () => {
  const result = evaluateExpense(expense({ expenseType: "commute", commuteMode: "details", monthlyAverage: "", distanceKm: "20", workDaysPerMonth: "18" }));
  assert.equal(hasOpen(result, "UNRESOLVED_RATE_REQUIRED"), true);
});

test("12. Kinderbetreuung ohne reine Kostentrennung bleibt offen", () => {
  assert.equal(hasOpen(evaluateExpense(expense({ expenseType: "childcare" })), "CHILDCARE_PURE_COSTS_NOT_CAPTURED"), true);
});

test("13. Kfz-Haftpflicht ohne Komponentenabgrenzung bleibt offen", () => {
  assert.equal(hasOpen(evaluateExpense(expense({ expenseType: "car-liability" })), "CAR_LIABILITY_COMPONENTS_NOT_CAPTURED"), true);
});

test("14. geleisteter Unterhalt ohne Rechtsgrundlage bleibt offen", () => {
  assert.equal(hasOpen(evaluateExpense(expense({ expenseType: "paid-maintenance" })), "PAID_MAINTENANCE_LEGAL_BASIS_NOT_CAPTURED"), true);
});

test("15. Beschäftigung und Krankengeld bleiben monatsweise getrennt", () => {
  const employment = income({ entryMethod: "monthly", monthlyValues: ["1000", "1000", "1000", "0", "0", "0"] });
  const sickPay = income({ id: "income-2", incomeType: "sick-pay", amountType: "notice", entryMethod: "monthly", monthlyValues: ["0", "0", "0", "800", "800", "0"] });
  const result = evaluateAdultIncomeForHousehold(state({ households: { A: household({ applicantIncomeSources: [employment, sickPay] }), B: household() } }), "A").personResults.applicant;
  assert.equal(result.months[0].incomeSources[0].rawAmount, 1000);
  assert.equal(result.months[3].incomeSources[1].rawAmount, 800);
});

test("16. Monat 6 mit 0 Einkommen bleibt vorhanden", () => {
  const src = income({ entryMethod: "monthly", monthlyValues: ["1", "2", "3", "4", "5", "0"] });
  const result = evaluateAdultIncomeForHousehold(state({ households: { A: household({ applicantIncomeSources: [src] }), B: household() } }), "A").personResults.applicant;
  assert.equal(result.months.length, 6); assert.equal(result.months[5].rawKnownIncomeTotal, 0);
});

test("17. unterschiedliche Quellen werden nur als bekannte Rohsumme addiert", () => {
  const sources = [income({ monthlyAverage: "600" }), income({ id: "income-2", incomeType: "sick-pay", amountType: "notice", monthlyAverage: "400" })];
  const result = evaluateAdultIncomeForHousehold(state({ households: { A: household({ applicantIncomeSources: sources }), B: household() } }), "A").personResults.applicant;
  assert.equal(result.months[0].rawKnownIncomeTotal, 1000);
});

test("18. offene Abzugsregel verhindert endgültigen bereinigten Wert", () => {
  const src = income({ deductions: { healthInsurance: series({ monthlyAverage: "100" }) } });
  const result = evaluateAdultIncomeForHousehold(state({ households: { A: household({ applicantIncomeSources: [src] }), B: household() } }), "A").personResults.applicant;
  assert.equal(result.months[0].finalCountableIncome, null); assert.equal(result.monthlyAverageAfterFinalCleansing, null);
});

test("19. structurallySupportedTotal ist als nicht endgültig markiert", () => {
  const result = evaluateDirectDeductions({ tax: series({ monthlyAverage: "20" }) });
  assert.equal(result.structurallySupportedTotal, 20); assert.equal(result.finalDeductibleTotal, null); assert.equal(result.supportedTotalIsFinalLegalDeduction, false); assert.equal(result.positions[0].isFinalDeductibleAmount, false);
});

test("20. bestätigte Steuer und Freibeträge ergeben den abschließend bereinigten Monatswert", () => {
  const src = income({ deductions: { tax: series({ monthlyAverage: "20" }) } });
  const result = evaluateAdultIncomeForHousehold(state({ households: { A: household({ applicantIncomeSources: [src] }), B: household() } }), "A").personResults.applicant;
  assert.equal(result.months[0].finalCountableIncome, 372);
});

test("21. doppelte technische Ausgaben-ID erzeugt offenen Prüfpunkt und wird nicht doppelt summiert", () => {
  const duplicate = expense({ id: "same", monthlyAverage: "49" });
  const result = evaluateDeductionsForPerson([], [duplicate, { ...duplicate }], { personRole: "applicant" });
  assert.equal(hasOpen(result, "DUPLICATE_DEDUCTION_POSITION_ID"), true); assert.equal(result.structurallySupportedTotal, 49);
});

test("22. Minijob-Brutto wird bei der Mindesteinkommensgrenze berücksichtigt", () => {
  assert.equal(minimumWith(income({ incomeType: "minijob" })).averageRelevantIncome, 600);
});

test("23. Ausbildungsvergütung-Brutto wird berücksichtigt", () => {
  assert.equal(minimumWith(income({ incomeType: "training" })).averageRelevantIncome, 600);
});

test("24. Krankengeld laut Bescheid wird berücksichtigt", () => {
  assert.equal(minimumWith(income({ incomeType: "sick-pay", amountType: "notice" })).isThresholdMet, true);
});

test("25. Arbeitslosengeld I laut Bescheid wird berücksichtigt", () => {
  assert.equal(minimumWith(income({ incomeType: "unemployment-1", amountType: "notice" })).averageRelevantIncome, 600);
});

test("26. Elterngeld wird vollständig berücksichtigt", () => {
  assert.equal(minimumWith(income({ incomeType: "parental-allowance", amountType: "notice" })).averageRelevantIncome, 600);
});

test("27. Erwachsenenunterhalt wird berücksichtigt", () => {
  assert.equal(minimumWith(income({ incomeType: "adult-maintenance", amountType: "net" })).averageRelevantIncome, 600);
});

test("28. Selbstständigkeit ohne Betriebseinnahmen-Kennzeichnung bleibt offen", () => {
  assert.equal(minimumWith(income({ incomeType: "self-employed" })).unresolvedIncomeSources[0].status, "SELF_EMPLOYMENT_AMOUNT_BASIS_NOT_CAPTURED");
});

test("29. Ausbildungsförderung ohne Leistungsart bleibt offen", () => {
  assert.equal(minimumWith(income({ incomeType: "education-support", amountType: "notice" })).unresolvedIncomeSources[0].status, "EDUCATION_SUPPORT_TYPE_NOT_CAPTURED");
});

test("30. unbestimmte staatliche Leistung bleibt offen", () => {
  assert.equal(minimumWith(income({ incomeType: "state-benefit", amountType: "notice" })).unresolvedIncomeSources[0].status, "STATE_BENEFIT_TYPE_NOT_CAPTURED");
});

test("31. Mutterschaftsgeld wird eindeutig ausgeschlossen", () => {
  const result = minimumWith(income({ incomeType: "maternity-benefit", amountType: "notice" }));
  assert.equal(result.averageRelevantIncome, 0); assert.equal(result.excludedIncomeSources[0].classification, "CONFIRMED_NON_INCOME");
});

test("32. SGB-II-Leistung wird eindeutig ausgeschlossen", () => {
  const result = minimumWith(income({ incomeType: "sgb2-benefit", amountType: "notice" }));
  assert.equal(result.averageRelevantIncome, 0); assert.equal(result.excludedIncomeSources.length, 1);
});

test("33. einmaliger Zufluss bleibt im Sechsmonatsdurchschnitt sichtbar", () => {
  const result = minimumWith(income({ entryMethod: "monthly", monthlyValues: ["600", "0", "0", "0", "0", "0"] }));
  assert.equal(result.averageRelevantIncome, 100);
});

test("34. erweiterte Mindesteinkommensprüfung verändert den State nicht", () => {
  const input = state({ households: { A: household({ applicantIncomeSources: [income({ incomeType: "sick-pay", amountType: "notice" })] }), B: household() } });
  const before = JSON.stringify(input); evaluateMinimumIncome(input, "A"); assert.equal(JSON.stringify(input), before);
});

test("35. Schaltjahr bleibt im festen Monatszeitraum korrekt abgebildet", () => {
  const period = createAssessmentPeriod(3, 2024);
  assert.deepEqual(period.months.map((item) => item.key), ["2023-09", "2023-10", "2023-11", "2023-12", "2024-01", "2024-02"]);
  assert.equal(period.months[5].month, 2);
  assert.equal(period.months[5].year, 2024);
});

test("36. sechs leere Pflichtmonate bleiben unvollständig", () => {
  const result = prepareSixMonthValues(income({ entryMethod: "monthly", monthlyValues: ["", "", "", "", "", ""] }));
  assert.equal(result.status, "MISSING_REQUIRED_DATA");
  assert.equal(result.monthlyAverage, null);
});

test("37. Vermietung ohne eindeutige Betragsbasis bleibt unaufgelöst", () => {
  const result = minimumWith(income({ incomeType: "rental", amountType: "notice" }));
  assert.equal(result.unresolvedIncomeSources[0].status, "RENTAL_MINIMUM_INCOME_BASIS_NOT_CAPTURED");
});

let passed = 0;
tests.forEach(({ name, run }) => { try { run(); passed += 1; console.log(`OK ${name}`); } catch (error) { console.error(`FEHLER ${name}`); throw error; } });
console.log(`${passed}/${tests.length} Präzisionstests erfolgreich.`);
