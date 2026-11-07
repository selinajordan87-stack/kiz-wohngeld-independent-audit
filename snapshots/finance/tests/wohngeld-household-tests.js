const assert = require("assert");
const wg = require("../wohngeld.js");
const parentNeedData = require("../parent-need-data.js");
const validation = require("../validation.js");

const tests = [];
const test = (name, run) => tests.push({ name, run });

function forecastNone() {
  return { incomeStatus: "none", mode: "unknown", taxExpected: "unknown", healthCareContributionExpected: "unknown", pensionContributionExpected: "unknown", sources: [] };
}

function person(overrides = {}) {
  return {
    wohngeldExclusionStatus: "not-excluded",
    wohngeldExclusionReason: "",
    careDaysInReferenceMonth: "",
    incomeForecast: forecastNone(),
    disabilityAllowanceStatus: "not-applicable",
    nsPersecutionStatus: "no",
    wohngeldGrundrentenTimesStatus: "no",
    ...overrides,
  };
}

function household(letter = "A", overrides = {}) {
  return {
    adults: "single",
    person1: "Antrag",
    partner: "Partner",
    housingType: "rent",
    otherResidents: "0",
    housingCosts: { rent: { coldRent: "700", coldUtilities: "150", heating: "200", parkingAmount: "50", sublettingStatus: "no" }, owner: {} },
    wohngeldData: {
      calculationMode: "foundation",
      mietstufe: "III",
      nonHouseholdAdjustmentStatus: "none",
      complexUseStatus: "no",
      singleParentAllowanceStatus: "no",
      persons: { applicant: person(), partner: person(), children: {} },
      ownerCosts: {},
      maintenanceDeductions: [],
    },
    ...overrides,
  };
}

function child(id, careSituation, age = 10, overrides = {}) {
  return { id, name: id, age: String(age), careSituation, stayDays: "", affectedHouseholds: [], ...overrides };
}

function withChildPerson(h, id, overrides = {}) {
  h.wohngeldData.persons.children[id] = person(overrides);
  return h;
}

test("1. Antragsteller zählt", () => {
  assert.equal(wg.evaluateWohngeldHousehold(household(), [], { householdId: "A" }).totalMembers, 1);
});

test("2. Partner im gemeinsamen Haushalt zählt", () => {
  const h = household("A", { adults: "couple" });
  assert.equal(wg.evaluateWohngeldHousehold(h, [], { householdId: "A" }).totalMembers, 2);
});

test("3. dauerhaft lebendes Kind zählt", () => {
  const h = withChildPerson(household(), "c1");
  assert.equal(wg.evaluateWohngeldHousehold(h, [child("c1", "dauerhaft-a")], { householdId: "A" }).totalMembers, 2);
});

test("4. 50/50-Kind zählt in beiden Haushalten", () => {
  const a = withChildPerson(household("A"), "c1");
  const b = withChildPerson(household("B"), "c1");
  const kids = [child("c1", "wechselmodell-50-50")];
  assert.equal(wg.evaluateWohngeldHousehold(a, kids, { householdId: "A" }).totalMembers, 2);
  assert.equal(wg.evaluateWohngeldHousehold(b, kids, { householdId: "B" }).totalMembers, 2);
});

test("5. Betreuung 1/3 bis 2/3 zählt in beiden Haushalten", () => {
  const a = withChildPerson(household("A"), "c1", { careDaysInReferenceMonth: "10" });
  const b = withChildPerson(household("B"), "c1", { careDaysInReferenceMonth: "20" });
  const kids = [child("c1", "")];
  assert.equal(wg.evaluateWohngeldHousehold(a, kids, { householdId: "A" }).totalMembers, 2);
  assert.equal(wg.evaluateWohngeldHousehold(b, kids, { householdId: "B" }).totalMembers, 2);
});

test("6. ein Kind unter 1/3 zählt beim geringer betreuenden Elternteil nicht automatisch", () => {
  const h = withChildPerson(household(), "c1", { careDaysInReferenceMonth: "9" });
  const result = wg.evaluateWohngeldHousehold(h, [child("c1", "")], { householdId: "A" });
  assert.equal(result.totalMembers, 1);
  assert.ok(result.warnings.some((item) => item.code === "WG_SINGLE_CHILD_BELOW_ONE_THIRD_NOT_MEMBER"));
});

test("7. bei mehreren Kindern unter 1/3 zählt dort nur das jüngste", () => {
  const h = household();
  withChildPerson(h, "older", { careDaysInReferenceMonth: "8" });
  withChildPerson(h, "youngest", { careDaysInReferenceMonth: "9" });
  const result = wg.evaluateWohngeldHousehold(h, [child("older", "", 12), child("youngest", "", 8)], { householdId: "A" });
  assert.equal(result.totalMembers, 2);
  assert.equal(result.members.find((item) => item.role === "child").personId, "youngest");
  assert.equal(result.members.find((item) => item.role === "child").specialMembershipBasis, "SECTION_5_4_YOUNGEST_BELOW_ONE_THIRD");
});

test("8. Haushalt A und B werden unabhängig bestimmt", () => {
  const a = withChildPerson(household("A"), "c1");
  const b = withChildPerson(household("B"), "c1");
  const kids = [child("c1", "dauerhaft-a")];
  assert.equal(wg.evaluateWohngeldHousehold(a, kids, { householdId: "A" }).totalMembers, 2);
  assert.equal(wg.evaluateWohngeldHousehold(b, kids, { householdId: "B" }).totalMembers, 1);
});

test("9. KiZ-BG-Mitgliedschaft wird nicht als WG-Mitgliedschaft missbraucht", () => {
  const h = withChildPerson(household(), "c1");
  const result = wg.evaluateWohngeldHousehold(h, [child("c1", "dauerhaft-a", 10, { kizBgMembership: false })], { householdId: "A" });
  assert.equal(result.totalMembers, 2);
});

test("10. SGB-II-BG-Mitgliedschaft wird nicht als WG-Mitgliedschaft missbraucht", () => {
  const h = withChildPerson(household(), "c1");
  const result = wg.evaluateWohngeldHousehold(h, [child("c1", "dauerhaft-b", 10, { sgbIIBgMembership: true })], { householdId: "A" });
  assert.equal(result.totalMembers, 1);
});

test("57. Datenversion 16 erhält die defensive D8B1-Migration", () => assert.equal(parentNeedData.DATA_VERSION, 16));

test("58. neue Wohngeldstatuswerte sind unbekannt und neue Beträge leer", () => {
  const migrated = parentNeedData.migrateParentNeedHousehold({});
  assert.equal(migrated.wohngeldData.persons.applicant.wohngeldExclusionStatus, "unknown");
  assert.equal(migrated.wohngeldData.persons.applicant.incomeForecast.incomeStatus, "unknown");
  assert.equal(migrated.wohngeldData.ownerCosts.annualInterest, "");
});

test("59. Migration kopiert D5-Einkommen nicht in den Wohngeld-Forecast", () => {
  const migrated = parentNeedData.migrateParentNeedHousehold({ applicantIncomeSources: [{ monthlyAverage: "2500" }] });
  assert.deepEqual(migrated.wohngeldData.persons.applicant.incomeForecast.sources, []);
});

function validationResult(h) {
  return validation.validateCalculatorState({ dataVersion: 13, applicationMonth: 7, applicationYear: 2026, mode: "single", centralChildren: [], households: { A: h } });
}

test("60. explizite 0 ist bei Wohngeld-Forecastbeträgen gültig", () => {
  const h = household();
  h.wohngeldData.persons.applicant.incomeForecast = { incomeStatus: "present", mode: "annual", taxExpected: "no", healthCareContributionExpected: "no", pensionContributionExpected: "no", sources: [{ id: "wg-1", type: "sick-pay", expectedAnnualAmount: "0", monthlyValues: Array(12).fill("") }] };
  assert.equal(validationResult(h).errors.some((item) => item.code === "WG_ANNUAL_FORECAST_AMOUNT_INVALID"), false);
});

test("61. ungültige Mietstufe wird validiert", () => {
  const h = household(); h.wohngeldData.mietstufe = "VIII";
  assert.ok(validationResult(h).errors.some((item) => item.code === "WG_MIETSTUFE_INVALID"));
});

test("62. negativer bestätigter Selbständigengewinn wird abgelehnt", () => {
  const h = household();
  h.wohngeldData.persons.applicant.incomeForecast = { incomeStatus: "present", mode: "annual", taxExpected: "no", healthCareContributionExpected: "no", pensionContributionExpected: "no", sources: [{ id: "wg-1", type: "self-employed", confirmedExpectedAnnualTaxProfit: "-1", monthlyValues: Array(12).fill("") }] };
  assert.ok(validationResult(h).errors.some((item) => item.code === "WG_SELF_EMPLOYED_PROFIT_INVALID"));
});

test("63. Wohnfläche 0 ist beim Lastenzuschuss nicht gültig", () => {
  const h = household(); h.housingType = "owner"; h.wohngeldData.ownerCosts = { livingAreaSqm: "0", annualInterest: "0", annualPrincipalRepayment: "0", annualLoanAncillaryCosts: "0", annualGuaranteeCosts: "0", annualLeaseholdPayment: "0", annualPropertyTax: "0", annualThirdPartyAdministrationCosts: "0", annualTotalLoanPayments: "" };
  assert.ok(validationResult(h).errors.some((item) => item.code === "WG_OWNER_LIVING_AREA_INVALID"));
});

let failed = 0;
tests.forEach(({ name, run }) => {
  try { run(); console.log(`OK ${name}`); }
  catch (error) { failed += 1; console.error(`FEHLER ${name}`); console.error(error.stack || error); }
});
console.log(`\n${tests.length - failed}/${tests.length} Wohngeld-Haushaltstests erfolgreich.`);
if (failed) process.exitCode = 1;
