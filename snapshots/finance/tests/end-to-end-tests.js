"use strict";

const assert = require("node:assert/strict");
const calculator = require("../calculator.js");
const fixtures = require("./final-kiz-tests.js");

const tests = [];
const test = (name, run) => tests.push({ name, run });
const calculate = (state) => calculator.calculateKinderzuschlag(state, fixtures.valid);
const householdResult = (state, id = "A") => calculate(state).households[id];

function autoWgState(adultAmount = 925, overrides = {}) {
  const state = fixtures.state();
  const household = state.households.A;
  household.applicantIncomeSources = [fixtures.adultIncome(adultAmount)];
  household.housingBenefitStatus = "not-received";
  household.housingBenefit = "";
  household.wohngeldData = fixtures.wgData(["c1"], { calculationMode: "automatic", ...overrides });
  return state;
}

function ownerAutoWgState() {
  const state = autoWgState(1025, {
    ownerCosts: { livingAreaSqm: "1", annualInterest: "3564", annualPrincipalRepayment: "0", annualLoanAncillaryCosts: "0", annualGuaranteeCosts: "0", annualLeaseholdPayment: "0", annualTotalLoanPayments: "", annualPropertyTax: "0", annualThirdPartyAdministrationCosts: "0" },
  });
  const household = state.households.A;
  household.housingType = "owner";
  household.housingCosts.owner = { costPeriodStatus: "previous-calendar-year", costYear: "2025", debtInterest: "300", debtInterestFrequency: "monthly", propertyTax: "600", propertyTaxFrequency: "yearly", buildingInsurance: "300", buildingInsuranceFrequency: "yearly", heating: "100", heatingFrequency: "monthly", otherCostsDescription: "", otherCostsAmount: "", otherCostsFrequency: "yearly", recentMonthlyValues: Array(12).fill("") };
  return state;
}

function datedState(month) {
  const state = fixtures.state();
  state.applicationMonth = month;
  state.households.A.housingCosts.rent.costMonth = `2026-${String(month).padStart(2, "0")}`;
  return state;
}

test("1. single-parent rental standard case is fully entitled", () => assert.equal(householdResult(fixtures.state()).status, "CALCULATED_ENTITLED"));
test("2. couple with two children applies parent-income reduction end to end", () => { const children = [fixtures.child("c1"), fixtures.child("c2")]; const state = fixtures.state({ centralChildren: children }); state.households.A = fixtures.household("A", ["c1", "c2"], { adults: "couple", partner: "P", applicantIncomeSources: [fixtures.adultIncome(2200)], housingBenefit: "1500" }); const result = householdResult(state); assert.equal(result.status, "CALCULATED_ENTITLED"); assert.ok(result.amounts.afterParentIncome < result.amounts.afterChildIncome); });
test("3. child income reduces individual KiZ by 45 percent", () => { const child = fixtures.child("c1", "A", { hasOwnIncome: "yes", incomeSources: [fixtures.childIncomeSource("c1", 100)] }); const result = householdResult(fixtures.state({ centralChildren: [child] })); assert.equal(result.childResults[0].childIncomeReduction, 45); assert.equal(result.childResults[0].kizAfterChildIncome, 252); });
test("4. automatic fictive Wohngeld closes a normal-access gap", () => { const result = householdResult(autoWgState(925)); assert.equal(result.status, "CALCULATED_ENTITLED"); assert.equal(result.eligibility.accessType, "NORMAL"); assert.ok(result.housingBenefitUsed.amount > 0); });
test("5. automatic owner benefit closes a supported gap", () => { const result = householdResult(ownerAutoWgState()); assert.equal(result.status, "CALCULATED_ENTITLED"); assert.equal(result.housingBenefitUsed.benefitType, "LASTENZUSCHUSS"); });
test("6. automatic fictive Wohngeld can support extended access", () => { const result = householdResult(autoWgState(800)); assert.equal(result.status, "CALCULATED_ENTITLED"); assert.equal(result.eligibility.accessType, "EXTENDED"); });
test("7. insufficient coverage yields calculated non-entitlement", () => { const state = fixtures.state(); state.households.A.housingBenefit = "0"; assert.equal(householdResult(state).decisionReason, "COVERAGE_NOT_MET"); });
test("8. comparison mode calculates A and B independently", () => { const children = [fixtures.child("c1", "A"), fixtures.child("c2", "B")]; const state = fixtures.state({ mode: "compare", centralChildren: children, households: { A: fixtures.household("A", ["c1"], { housingBenefit: "500" }), B: fixtures.household("B", ["c2"], { applicantIncomeSources: [fixtures.adultIncome(1500)], housingBenefit: "1500" }) } }); const result = calculate(state); assert.equal(result.households.A.householdId, "A"); assert.equal(result.households.B.householdId, "B"); assert.notEqual(result.households.A.amounts.currentMonthlyPayableAmount, result.households.B.amounts.currentMonthlyPayableAmount); });
test("9. shared-care child creates own KiZ only in child-benefit household", () => { const shared = fixtures.child("c1", "A", { careSituation: "wechselmodell-50-50", affectedHouseholds: ["A", "B"], childBenefitAt: "A", childBenefitPerson: "applicant-a" }); const state = fixtures.state({ mode: "compare", centralChildren: [shared], households: { A: fixtures.household("A", ["c1"], { housingBenefit: "1500" }), B: fixtures.household("B", ["c1"], { housingBenefit: "1500" }) } }); const result = calculate(state); assert.equal(result.households.A.eligibility.potentialOwnKizChildren, 1); assert.equal(result.households.B.decisionReason, "NO_POTENTIAL_OWN_KIZ_CHILD"); });
test("10. approved Wohngeld is represented as approved", () => assert.equal(householdResult(fixtures.state()).housingBenefitUsed.status, "APPROVED"));
test("11. external estimate is represented as provisional", () => { const state = fixtures.state(); state.households.A.housingBenefitStatus = "estimated"; const result = householdResult(state); assert.equal(result.housingBenefitUsed.status, "EXTERNAL_ESTIMATE"); assert.equal(result.housingBenefitUsed.reliability, "PROVISIONAL_EXTERNAL_WOHNGELD"); });
test("12. confirmed no Wohngeld is represented as confirmed zero", () => { const state = fixtures.state(); state.households.A.housingBenefitStatus = "none"; state.households.A.housingBenefit = ""; state.households.A.applicantIncomeSources = [fixtures.adultIncome(2000)]; assert.equal(householdResult(state).housingBenefitUsed.status, "CONFIRMED_ZERO"); });
test("13. Wohngeld not needed is represented as zero without approval claim", () => { const state = fixtures.state(); state.households.A.housingBenefitStatus = "unknown"; state.households.A.housingBenefit = ""; state.households.A.coverageAssetStatus = "unknown"; state.households.A.applicantIncomeSources = [fixtures.adultIncome(2000)]; const result = householdResult(state); assert.equal(result.housingBenefitUsed.status, "NOT_NEEDED"); assert.equal(result.housingBenefitUsed.amount, 0); });
test("14. automatic rental benefit exposes Mietzuschuss", () => assert.equal(householdResult(autoWgState()).housingBenefitUsed.benefitType, "MIETZUSCHUSS"));
test("15. automatic owner benefit exposes Lastenzuschuss", () => assert.equal(householdResult(ownerAutoWgState()).housingBenefitUsed.benefitType, "LASTENZUSCHUSS"));
test("16. end-to-end calculation does not mutate state", () => { const state = autoWgState(); const before = JSON.stringify(state); calculate(state); assert.equal(JSON.stringify(state), before); });
test("17. end-to-end calculation does not mutate validation result", () => { const state = fixtures.state(); const validation = structuredClone(fixtures.valid); const before = JSON.stringify(validation); calculator.calculateKinderzuschlag(state, validation); assert.equal(JSON.stringify(validation), before); });
test("18. repeated end-to-end calculations are deterministic", () => { const state = ownerAutoWgState(); assert.deepEqual(calculate(state), calculate(state)); });
test("19. result preserves data version 14", () => assert.equal(calculate(fixtures.state()).dataVersion, 14));
test("20. result identifies legal baseline year 2026", () => assert.equal(calculate(fixtures.state()).legalYear, 2026));
test("21. January application produces January through June 2026", () => assert.deepEqual(householdResult(datedState(1)).paymentPeriods.map((month) => month.month), [1, 2, 3, 4, 5, 6]));
test("22. July application produces July through December 2026", () => assert.deepEqual(householdResult(datedState(7)).paymentPeriods.map((month) => month.month), [7, 8, 9, 10, 11, 12]));
test("23. August application includes January 2027", () => assert.ok(householdResult(datedState(8)).paymentPeriods.some((month) => month.year === 2027 && month.month === 1)));
test("24. 2027 months are marked provisional current-law baseline", () => { const result = householdResult(datedState(8)); assert.equal(result.paymentPeriods.find((month) => month.year === 2027).amountStatus, "PROVISIONAL_CURRENT_LAW_BASELINE"); assert.equal(result.futureMaximumKizChangePossible, true); });
test("25. provisional 2027 period has no final six-month total", () => assert.equal(householdResult(datedState(8)).amounts.sixMonthFinalPayableTotal, null));
test("26. provisional 2027 period retains transparent baseline total", () => assert.equal(householdResult(datedState(8)).amounts.currentLawBaselineSixMonthTotal, 1782));
test("27. age 24 at BWZ start requires birthday review", () => { const child = fixtures.child("c1", "A", { age: "24", u25RuleStageStatus: "yes" }); const result = householdResult(fixtures.state({ centralChildren: [child] })); assert.equal(result.status, "UNRESOLVED"); assert.ok(result.blockingOpenChecks.includes("CHILD_25TH_BIRTHDAY_DURING_BWZ_REVIEW_REQUIRED")); });
test("28. unsupported adult-income basis remains unresolved", () => { const state = fixtures.state(); state.households.A.applicantIncomeSources = [fixtures.adultIncome(600, { amountType: "net" })]; assert.equal(householdResult(state).status, "UNRESOLVED"); });
test("29. missing Mietstufe in needed automatic Wohngeld remains unresolved", () => { const state = autoWgState(); state.households.A.wohngeldData.mietstufe = "unknown"; const result = householdResult(state); assert.equal(result.status, "UNRESOLVED"); assert.ok(result.blockingOpenChecks.includes("WG_MIETSTUFE_REQUIRED_FOR_AMOUNT")); });
test("30. unknown automatic Wohngeld eligibility precheck remains unresolved", () => { const state = autoWgState(); state.households.A.wohngeldData.section20Status = "unknown"; const result = householdResult(state); assert.equal(result.status, "UNRESOLVED"); assert.ok(result.blockingOpenChecks.includes("WG_SECTION_20_STATUS_REQUIRED_FOR_FICTIVE_AMOUNT")); });

let failed = 0;
tests.forEach(({ name, run }) => {
  try { run(); console.log(`OK ${name}`); }
  catch (error) { failed += 1; console.error(`FEHLER ${name}`); console.error(error.stack || error); }
});
console.log(`${tests.length - failed}/${tests.length} D9-End-to-End-Tests erfolgreich.`);
if (failed) process.exitCode = 1;

