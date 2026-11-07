const assert = require("assert");
const wg = require("../wohngeld.js");

const tests = [];
const test = (name, run) => tests.push({ name, run });

function forecast(sources = [], overrides = {}) {
  return {
    incomeStatus: sources.length ? "present" : "none",
    mode: "annual",
    taxExpected: "no",
    healthCareContributionExpected: "no",
    pensionContributionExpected: "no",
    sources,
    ...overrides,
  };
}

function source(type, annual, overrides = {}) {
  return {
    id: `${type}-1`, type, expectedAnnualAmount: String(annual), expectedMonthlyAmount: "", monthlyValues: Array(12).fill(""),
    confirmedHigherAnnualWorkExpenses: "", confirmedAnnualWorkExpenses: "0",
    confirmedExpectedAnnualTaxProfit: "", confirmedExpectedAnnualPositiveTaxIncome: "",
    confirmedParentalAllowanceExemptionAnnual: "0", actualAnnualTaxAmount: "", details: {}, ...overrides,
  };
}

function person(forecastValue = forecast(), overrides = {}) {
  return {
    wohngeldExclusionStatus: "not-excluded", wohngeldExclusionReason: "", careDaysInReferenceMonth: "",
    incomeForecast: forecastValue, disabilityAllowanceStatus: "not-applicable", nsPersecutionStatus: "no",
    wohngeldGrundrentenTimesStatus: "no", ...overrides,
  };
}

function household(applicant = person(), overrides = {}) {
  return {
    adults: "single", person1: "Antrag", housingType: "rent", otherResidents: "0",
    applicantIncomeSources: [],
    housingCosts: { rent: { coldRent: "700", coldUtilities: "150", heating: "0", parkingAmount: "0", sublettingStatus: "no" }, owner: {} },
    wohngeldData: {
      mietstufe: "III", nonHouseholdAdjustmentStatus: "none", complexUseStatus: "no", singleParentAllowanceStatus: "no",
      persons: { applicant, partner: person(), children: {} }, ownerCosts: {}, maintenanceDeductions: [],
    }, ...overrides,
  };
}

function result(h, children = []) {
  const members = wg.evaluateWohngeldHousehold(h, children, { householdId: "A" });
  return wg.evaluateWohngeldIncome(h, children, members);
}

function applicantResult(h) {
  return result(h).personResults[0];
}

test("26. Wohngeld nutzt erwartetes BWZ-Einkommen statt D5-Sechsmonatsdurchschnitt", () => {
  const h = household(person(forecast([source("sick-pay", 1200)])), { applicantIncomeSources: [{ monthlyAverage: "9999" }] });
  assert.equal(applicantResult(h).expectedAnnualIncomeBeforeWoGG16, 1200);
});

test("27. Arbeitnehmer-Pauschbetrag 1230 EUR gilt im Standardfall", () => {
  const h = household(person(forecast([source("employment", 12000)])));
  assert.equal(applicantResult(h).expectedAnnualIncomeBeforeWoGG16, 10770);
});

test("28. höhere bestätigte Werbungskosten ersetzen den Pauschbetrag", () => {
  const h = household(person(forecast([source("employment", 12000, { confirmedHigherAnnualWorkExpenses: "2000" })])));
  assert.equal(applicantResult(h).expectedAnnualIncomeBeforeWoGG16, 10000);
});

test("29. Minijob wird nicht automatisch als 0 behandelt", () => {
  const h = household(person(forecast([source("minijob", 6000, { confirmedAnnualWorkExpenses: "100" })])));
  assert.equal(applicantResult(h).expectedAnnualIncomeBeforeWoGG16, 5900);
});

test("30. Krankengeld kann Wohngeld-Einkommen sein", () => {
  assert.equal(applicantResult(household(person(forecast([source("sick-pay", 12000)])))).expectedAnnualIncomeBeforeWoGG16, 12000);
});

test("31. ALG I kann Wohngeld-Einkommen sein", () => {
  assert.equal(applicantResult(household(person(forecast([source("unemployment-1", 9000)])))).expectedAnnualIncomeBeforeWoGG16, 9000);
});

test("32. UVG ist als Einkommensart unterstützt", () => {
  assert.equal(applicantResult(household(person(forecast([source("advance-maintenance", 3600)])))).expectedAnnualIncomeBeforeWoGG16, 3600);
});

test("33. Kindergeld wird nicht heuristisch hinzugefügt", () => {
  assert.equal(applicantResult(household(person(forecast([source("kindergeld", 3108)])))).expectedAnnualIncomeBeforeWoGG16, 0);
});

test("34. Kinderzuschlag wird nicht heuristisch hinzugefügt", () => {
  assert.equal(applicantResult(household(person(forecast([source("kiz", 3564)])))).expectedAnnualIncomeBeforeWoGG16, 0);
});

test("35. bestätigter Selbständigengewinn wird verwendet", () => {
  const item = source("self-employed", 100000, { confirmedExpectedAnnualTaxProfit: "24000" });
  assert.equal(applicantResult(household(person(forecast([item])))).expectedAnnualIncomeBeforeWoGG16, 24000);
});

test("36. Umsatz wird nicht als Gewinn behandelt", () => {
  const r = applicantResult(household(person(forecast([source("self-employed", 100000)]))));
  assert.equal(r.expectedAnnualIncomeBeforeWoGG16, null);
  assert.ok(r.openChecks.includes("WG_SELF_EMPLOYED_PROFIT_REQUIRED"));
});

test("37. negative Einkunftsart gleicht positive Einkünfte nicht aus", () => {
  const items = [source("sick-pay", 12000), source("rental", 0, { confirmedExpectedAnnualPositiveTaxIncome: "-5000" })];
  const r = applicantResult(household(person(forecast(items))));
  assert.equal(r.expectedAnnualIncomeBeforeWoGG16, null);
  assert.ok(r.openChecks.includes("WG_POSITIVE_TAX_INCOME_REQUIRED"));
});

function percentageCase(overrides) {
  return applicantResult(household(person(forecast([source("sick-pay", 10000)], overrides))));
}

test("38. keine §16-Kategorie ergibt 0 Prozent", () => assert.equal(percentageCase({}).percentageDeductions.totalRate, 0));
test("39. nur Steuer ergibt 10 Prozent", () => assert.equal(percentageCase({ taxExpected: "yes" }).percentageDeductions.totalRate, 0.1));
test("40. nur KV/PV ergibt 10 Prozent", () => assert.equal(percentageCase({ healthCareContributionExpected: "yes" }).percentageDeductions.totalRate, 0.1));
test("41. nur RV ergibt 10 Prozent", () => assert.equal(percentageCase({ pensionContributionExpected: "yes" }).percentageDeductions.totalRate, 0.1));
test("42. Steuer plus KV/PV ergibt 20 Prozent", () => assert.equal(percentageCase({ taxExpected: "yes", healthCareContributionExpected: "yes" }).percentageDeductions.totalRate, 0.2));
test("43. alle drei Kategorien ergeben 30 Prozent", () => assert.equal(percentageCase({ taxExpected: "yes", healthCareContributionExpected: "yes", pensionContributionExpected: "yes" }).percentageDeductions.totalRate, 0.3));

test("44. tatsächlicher Steuer-Eurobetrag ersetzt die 10-Prozent-Regel nicht", () => {
  const item = source("sick-pay", 10000, { actualAnnualTaxAmount: "777" });
  const r = applicantResult(household(person(forecast([item], { taxExpected: "yes" }))));
  assert.equal(r.annualIncomeAfterWoGG16, 9000);
  assert.ok(r.warnings.some((entry) => entry.code === "WG_ACTUAL_TAX_AMOUNT_NOT_DEDUCTED"));
});

test("45. bestätigter Behindertenfreibetrag beträgt 1800", () => {
  const p = person(forecast(), { disabilityAllowanceStatus: "confirmed-1800" });
  assert.equal(applicantResult(household(p)).annualAllowances, 1800);
});

test("46. bloß unzureichender GdB erzeugt nicht automatisch 1800", () => {
  const p = person(forecast(), { disabilityAllowanceStatus: "insufficient" });
  assert.equal(applicantResult(household(p)).annualAllowances, 0);
});

test("47. Alleinerziehendenfreibetrag beträgt bei bestätigter WG-Konstellation 1320", () => {
  const h = household();
  h.wohngeldData.singleParentAllowanceStatus = "yes";
  h.wohngeldData.persons.children.c1 = person();
  const children = [{ id: "c1", name: "Kind", age: "10", careSituation: "dauerhaft-a" }];
  assert.equal(result(h, children).singleParentAllowance, 1320);
});

test("48. U25-Kinder-Erwerbsfreibetrag ist auf 1200 gedeckelt", () => {
  const h = household();
  h.wohngeldData.persons.children.c1 = person(forecast([source("employment", 5000)]));
  const children = [{ id: "c1", name: "Kind", age: "17", careSituation: "dauerhaft-a" }];
  const childResult = result(h, children).personResults.find((entry) => entry.personId === "c1");
  assert.equal(childResult.annualAllowances, 1200);
});

test("49. Unterhaltsaufwendung an §5-Abs.4-Kind ist auf 3000 gedeckelt", () => {
  const h = household();
  h.wohngeldData.maintenanceDeductions = [{ id: "m1", type: "child-other-parent", annualPaidAmount: "5000", legalObligationStatus: "yes", titleStatus: "no", titleAnnualMaximum: "" }];
  assert.equal(result(h).annualMaintenanceDeductions, 3000);
});

test("50. Unterhaltsaufwendung an frühere Partner ist auf 6000 gedeckelt", () => {
  const h = household();
  h.wohngeldData.maintenanceDeductions = [{ id: "m1", type: "former-partner", annualPaidAmount: "8000", legalObligationStatus: "yes", titleStatus: "no", titleAnnualMaximum: "" }];
  assert.equal(result(h).annualMaintenanceDeductions, 6000);
});

let failed = 0;
tests.forEach(({ name, run }) => {
  try { run(); console.log(`OK ${name}`); }
  catch (error) { failed += 1; console.error(`FEHLER ${name}`); console.error(error.stack || error); }
});
console.log(`\n${tests.length - failed}/${tests.length} Wohngeld-Einkommenstests erfolgreich.`);
if (failed) process.exitCode = 1;
