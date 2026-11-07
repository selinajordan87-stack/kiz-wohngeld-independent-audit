"use strict";

const assert = require("node:assert/strict");
const calculator = require("../calculator.js");
const validation = require("../validation.js");

const tests = [];
const test = (name, run) => tests.push({ name, run });
const valid = { isValid: true, errors: [], warnings: [], infos: [] };

function adultIncome(amount = 600, overrides = {}) {
  return { id: overrides.id || "adult-income", personRole: overrides.personRole || "applicant", incomeType: "employment", employmentType: "social-insurance", amountType: "gross", entryMethod: "average", monthlyAverage: String(amount), monthlyValues: Array(6).fill(""), u25SpecialAllowanceStatus: "unknown", parentalAllowanceType: "unknown", confirmedExemptionMonthly: "", deductions: {}, ...overrides };
}

function child(id = "c1", householdId = "A", overrides = {}) {
  return { id, name: id, age: "5", careSituation: `dauerhaft-${householdId.toLowerCase()}`, maritalPartnershipStatus: "no", affectedHouseholds: [householdId], hasExternalHousehold: false, stayDays: "", childBenefitAt: householdId, childBenefitPerson: `applicant-${householdId.toLowerCase()}`, externalChildBenefitPerson: "", halfForwarded: false, hasOwnIncome: "no", incomeSources: [], eligiblePrivateInsuranceStatus: "no", u25RuleStageStatus: "unknown", decentralHotWaterStatus: { A: "no", B: "no" }, additionalNeedStatus: "no", additionalNeedMonthlyAmount: "", ...overrides };
}

function childIncomeSource(id, amount) {
  return { id: `income-${id}`, incomeType: "maintenance", subtype: "", customLabel: "", amountType: "net", entryMethod: "average", monthlyAverage: String(amount), monthlyValues: Array(6).fill("") };
}

function wgForecast(monthlyIncome) {
  if (monthlyIncome === null) return { incomeStatus: "unknown", mode: "unknown", taxExpected: "unknown", healthCareContributionExpected: "unknown", pensionContributionExpected: "unknown", sources: [] };
  if (monthlyIncome === 0) return { incomeStatus: "none", mode: "annual", taxExpected: "no", healthCareContributionExpected: "no", pensionContributionExpected: "no", sources: [] };
  return { incomeStatus: "present", mode: "annual", taxExpected: "no", healthCareContributionExpected: "no", pensionContributionExpected: "no", sources: [{ id: "wg-income", type: "sick-pay", expectedAnnualAmount: String(monthlyIncome * 12), expectedMonthlyAmount: "", monthlyValues: Array(12).fill(""), details: {} }] };
}

function wgPerson(monthlyIncome = 1000, exclusion = "not-excluded") {
  return { wohngeldExclusionStatus: exclusion, wohngeldExclusionReason: exclusion === "excluded" ? "transfer-benefit" : "", careDaysInReferenceMonth: "", incomeForecast: wgForecast(monthlyIncome), disabilityAllowanceStatus: "not-applicable", nsPersecutionStatus: "no", wohngeldGrundrentenTimesStatus: "no" };
}

function wgData(childIds = ["c1"], overrides = {}) {
  const monthlyIncome = Object.hasOwn(overrides, "monthlyIncome") ? overrides.monthlyIncome : 1000;
  return {
    calculationMode: "not-requested", section20Status: "not-excluded", significantAssetsStatus: "not-excluded", mietstufe: "IV", nonHouseholdAdjustmentStatus: "none", complexUseStatus: "no", singleParentAllowanceStatus: "no",
    persons: { applicant: wgPerson(monthlyIncome), partner: wgPerson(0), children: Object.fromEntries(childIds.map((id) => [id, wgPerson(0)])) },
    ownerCosts: { livingAreaSqm: "", annualInterest: "", annualPrincipalRepayment: "", annualLoanAncillaryCosts: "", annualGuaranteeCosts: "", annualLeaseholdPayment: "", annualTotalLoanPayments: "", annualPropertyTax: "", annualThirdPartyAdministrationCosts: "" },
    maintenanceDeductions: [], ...overrides,
  };
}

function asset(id, value, ownerRole = "applicant") {
  return { id, type: "cash", value: String(value), ownerRole, protectedStatus: "no", details: { realizableStatus: "yes", incomeDoubleCountStatus: "no" } };
}

function assetPersons(applicant = [], children = {}, partner = []) {
  return { applicant: { assets: applicant }, partner: { assets: partner }, children: Object.fromEntries(Object.entries(children).map(([id, values]) => [id, { assets: values }])) };
}

function household(letter = "A", childIds = ["c1"], overrides = {}) {
  const result = {
    label: `Haushalt ${letter}`, adults: "single", person1: letter, partner: "", applicantIncomeSources: [adultIncome(600)], partnerIncomeSources: [], applicantExpenses: [], partnerExpenses: [], otherResidents: "0",
    housingBenefitStatus: "approved", housingBenefit: "500", assetsStatus: "no", assetPersons: assetPersons(), coverageAssetStatus: "confirmed-none", extendedAccessSgbBenefitStatus: "none",
    additionalNeedOverride: "", hotWaterType: "central", decentralHotWaterAdults: { applicant: "no", partner: "no" }, specialSituations: [],
    housingType: "rent", housingCosts: { rent: { coldRent: "300", coldUtilities: "0", heating: "0", costMonth: "2026-07", sublettingStatus: "no", sublettingAmount: "", parkingAmount: "", parkingInseparableStatus: "unknown" }, owner: {} },
    wohngeldData: wgData(childIds), ...overrides,
  };
  if (!Object.hasOwn(overrides, "applicantIncomeStatus")) result.applicantIncomeStatus = result.applicantIncomeSources.length ? "present" : "none";
  if (!Object.hasOwn(overrides, "partnerIncomeStatus")) result.partnerIncomeStatus = result.partnerIncomeSources.length ? "present" : "none";
  return result;
}

function state(overrides = {}) {
  const children = overrides.centralChildren || [child()];
  return { dataVersion: 14, applicationMonth: 7, applicationYear: 2026, mode: "single", centralChildren: children, households: { A: household("A", children.map((item) => item.id), overrides.householdA), B: household("B", ["c2"], overrides.householdB) }, ...overrides, centralChildren: children };
}

function result(input = state(), validationResult = valid, householdId = "A") {
  return calculator.calculateKinderzuschlag(input, validationResult).households[householdId];
}

test("1. standard case reaches final calculator", () => assert.equal(result().status, "CALCULATED_ENTITLED"));
test("2. validation error returns invalid input", () => assert.equal(result(state(), { isValid: false, errors: [{ code: "TEST_ERROR" }], warnings: [], infos: [] }).status, "INVALID_INPUT"));
test("3. final rule id is stable", () => assert.equal(calculator.RULE_IDS.final, "KIZ-FINAL-001"));
test("4. final result exposes rule id", () => assert.equal(result().ruleId, "KIZ-FINAL-001"));
test("5. real validation accepts supported fixture", () => { const s = state(); const checked = validation.validateCalculatorState(s); assert.equal(checked.errors.length, 0); assert.equal(result(s, checked).status, "CALCULATED_ENTITLED"); });
test("6. couple reaches minimum income at exactly 900", () => { const s = state(); Object.assign(s.households.A, { adults: "couple", partner: "P", applicantIncomeSources: [adultIncome(900)] }); assert.equal(result(s).eligibility.minimumIncomeMet, true); });
test("7. couple misses minimum income at 899.99", () => { const s = state(); Object.assign(s.households.A, { adults: "couple", partner: "P", applicantIncomeSources: [adultIncome(899.99)] }); const r = result(s); assert.equal(r.status, "CALCULATED_NOT_ENTITLED"); assert.equal(r.decisionReason, "MINIMUM_INCOME_NOT_MET"); });
test("8. single parent reaches minimum income at exactly 600", () => assert.equal(result().eligibility.minimumIncomeMet, true));
test("9. single parent misses minimum income at 599.99", () => { const s = state(); s.households.A.applicantIncomeSources = [adultIncome(599.99)]; assert.equal(result(s).decisionReason, "MINIMUM_INCOME_NOT_MET"); });
test("10. household without own potential KiZ child is not entitled", () => { const s = state({ centralChildren: [child("c1", "A", { childBenefitAt: "B", childBenefitPerson: "applicant-b" })] }); const r = result(s); assert.equal(r.status, "CALCULATED_NOT_ENTITLED"); assert.equal(r.decisionReason, "NO_POTENTIAL_OWN_KIZ_CHILD"); });
test("11. unknown child-benefit assignment remains unresolved", () => { const s = state({ centralChildren: [child("c1", "A", { childBenefitAt: "unknown", childBenefitPerson: "" })] }); assert.equal(result(s).status, "UNRESOLVED"); });
test("12. minor family-status warnings do not block standard result", () => { const r = result(); assert.equal(r.status, "CALCULATED_ENTITLED"); assert.ok(r.informationalWarnings.some((item) => item.code === "CHILD_OWN_CHILD_STATUS_NOT_CAPTURED")); });
test("13. final result consumes D2 amount unchanged", () => { const s = state(); assert.equal(result(s).amounts.afterChildIncome, calculator.evaluateChildIncomeReductionsForHousehold(s, "A").preliminaryIndividualKiZAfterChildIncomeTotal); });
test("14. final result consumes D6 amount unchanged", () => { const s = state(); assert.equal(result(s).amounts.afterParentIncome, calculator.evaluateParentIncomeReduction(s, "A").kizAfterParentIncomeBeforeAssets); });
test("15. final result consumes D7 month-one amount unchanged", () => { const s = state(); assert.equal(result(s).amounts.month1BeforeFinalRounding, calculator.evaluateAssetIntegration(s, "A").month1.kizAfterAssets); });
test("16. final result consumes D8 coverage decision unchanged", () => { const s = state(); assert.equal(result(s).eligibility.coverageDecision, calculator.evaluateCoverage(s, "A").coverageDecision); });
test("17. automatic Wohngeld is added exactly once", () => { const s = state(); const h = s.households.A; h.applicantIncomeSources = [adultIncome(925)]; h.housingBenefitStatus = "not-received"; h.housingBenefit = ""; h.wohngeldData = wgData(["c1"], { calculationMode: "automatic" }); const coverage = calculator.evaluateCoverage(s, "A"); assert.equal(coverage.coverage.resourcesWithWohngeld - coverage.coverage.resourcesWithoutWohngeld, result(s).housingBenefitUsed.amount); });
test("18. final orchestration leaves D5 unchanged", () => { const s = state(); const before = calculator.evaluateAdultIncomeForHousehold(s, "A"); result(s); assert.deepEqual(calculator.evaluateAdultIncomeForHousehold(s, "A"), before); });
test("19. final orchestration leaves D6 unchanged", () => { const s = state(); const before = calculator.evaluateParentIncomeReduction(s, "A"); result(s); assert.deepEqual(calculator.evaluateParentIncomeReduction(s, "A"), before); });
test("20. final orchestration does not mutate input", () => { const s = state(); const before = JSON.stringify(s); result(s); assert.equal(JSON.stringify(s), before); });
test("21. normal coverage produces normal access", () => assert.equal(result().eligibility.accessType, "NORMAL"));
test("22. extended coverage produces extended access", () => { const s = state(); s.households.A.housingBenefit = "425"; const r = result(s); assert.equal(r.status, "CALCULATED_ENTITLED"); assert.equal(r.eligibility.accessType, "EXTENDED"); });
test("23. failed coverage is a calculated non-entitlement", () => { const s = state(); s.households.A.housingBenefit = "0"; const r = result(s); assert.equal(r.status, "CALCULATED_NOT_ENTITLED"); assert.equal(r.decisionReason, "COVERAGE_NOT_MET"); });
test("24. unknown coverage assets remain unresolved when relevant", () => { const s = state(); s.households.A.housingBenefit = "425"; s.households.A.coverageAssetStatus = "unknown"; assert.equal(result(s).status, "UNRESOLVED"); });
test("25. no countable KiZ assets keeps all monthly amounts equal", () => { const r = result(); assert.equal(r.amounts.month1BeforeFinalRounding, r.amounts.months2To6BeforeFinalRounding); });
test("26. small parent assets reduce month one", () => { const s = state(); Object.assign(s.households.A, { assetsStatus: "yes", assetPersons: assetPersons([asset("app", 55100)], { c1: [] }), housingBenefit: "1500" }); const r = result(s); assert.equal(r.amounts.month1BeforeFinalRounding, 197); });
test("27. small parent assets do not reduce months two to six", () => { const s = state(); Object.assign(s.households.A, { assetsStatus: "yes", assetPersons: assetPersons([asset("app", 55100)], { c1: [] }), housingBenefit: "1500" }); assert.equal(result(s).amounts.months2To6BeforeFinalRounding, 297); });
test("28. full asset rejection creates no artificial payment periods", () => { const s = state(); Object.assign(s.households.A, { assetsStatus: "yes", assetPersons: assetPersons([asset("app", 55298)], { c1: [] }) }); const r = result(s); assert.equal(r.decisionReason, "REJECTED_DUE_TO_ASSETS"); assert.deepEqual(r.paymentPeriods, []); });
test("29. partial child asset rejection remains unresolved", () => { const c1 = child("c1", "A", { hasOwnIncome: "yes", incomeSources: [childIncomeSource("c1", 400)] }); const c2 = child("c2"); const s = state({ centralChildren: [c1, c2] }); Object.assign(s.households.A, { assetsStatus: "yes", assetPersons: assetPersons([asset("app", 39000)], { c1: [asset("kid", 31118, "child")], c2: [] }) }); const r = result(s); assert.equal(r.status, "UNRESOLVED"); assert.ok(r.blockingOpenChecks.includes("PARENT_NEED_AFTER_CHILD_ASSET_REJECTION_OPEN")); });
test("30. patchwork asset allocation remains open", () => { const children = [child("c1", "A", { childBenefitPerson: "applicant-a" }), child("c2", "A", { childBenefitPerson: "partner-a" })]; const s = state({ centralChildren: children }); s.households.A = household("A", ["c1", "c2"], { adults: "couple", partner: "P", applicantIncomeSources: [adultIncome(900)], housingBenefit: "1500", assetsStatus: "yes", assetPersons: assetPersons([asset("app", 85001)], { c1: [], c2: [] }) }); assert.ok(result(s).blockingOpenChecks.includes("ASSET_PATCHWORK_ALLOCATION_OPEN")); });
test("31. entitled standard case has six payment periods", () => assert.equal(result().paymentPeriods.length, 6));
test("32. standard payment periods contain identical rounded amounts", () => assert.equal(new Set(result().paymentPeriods.map((month) => month.roundedPayableAmount)).size, 1));
test("33. six-month total is sum of rounded months", () => { const r = result(); assert.equal(r.amounts.sixMonthFinalPayableTotal, r.paymentPeriods.reduce((sum, month) => sum + month.roundedPayableAmount, 0)); });
test("34. D7 months-two-to-six count remains five", () => { const s = state(); assert.equal(calculator.evaluateAssetIntegration(s, "A").months2To6Count, 5); assert.equal(result(s).paymentPeriods.slice(1).length, 5); });
test("35. one recipient receives the full household amount", () => { const r = result(); assert.equal(r.recipientPayments.recipients.length, 1); assert.equal(r.recipientPayments.recipients[0].month1Payable, r.amounts.month1Payable); });
test("36. two child-benefit recipients use D6 groups", () => { const children = [child("c1", "A", { childBenefitPerson: "applicant-a" }), child("c2", "A", { childBenefitPerson: "partner-a" })]; const s = state({ centralChildren: children }); s.households.A = household("A", ["c1", "c2"], { adults: "couple", partner: "P", applicantIncomeSources: [adultIncome(900)], housingBenefit: "1500" }); assert.equal(result(s).recipientPayments.recipients.length, 2); });
test("37. no child is assigned to two recipients", () => { const children = [child("c1", "A", { childBenefitPerson: "applicant-a" }), child("c2", "A", { childBenefitPerson: "partner-a" })]; const s = state({ centralChildren: children }); s.households.A = household("A", ["c1", "c2"], { adults: "couple", partner: "P", applicantIncomeSources: [adultIncome(900)], housingBenefit: "1500" }); const ids = result(s).recipientPayments.recipients.flatMap((recipient) => recipient.childIds); assert.equal(ids.length, new Set(ids).size); });
test("38. patchwork rounding difference is not reconciled heuristically", () => { const children = [child("c1", "A", { childBenefitPerson: "applicant-a", hasOwnIncome: "yes", incomeSources: [childIncomeSource("c1", 1)] }), child("c2", "A", { childBenefitPerson: "partner-a", hasOwnIncome: "yes", incomeSources: [childIncomeSource("c2", 1)] })]; const s = state({ centralChildren: children }); s.households.A = household("A", ["c1", "c2"], { adults: "couple", partner: "P", applicantIncomeSources: [adultIncome(900)], housingBenefit: "1500" }); const r = result(s); assert.equal(r.status, "UNRESOLVED"); assert.ok(r.blockingOpenChecks.includes("PATCHWORK_PAYOUT_ROUNDING_RECONCILIATION_OPEN")); assert.equal(r.recipientPayments.recipientRoundedTotals.month1, 594); assert.equal(r.recipientPayments.householdRoundedAmounts.month1, 593); });
test("39. calculation trace has at least thirteen steps", () => assert.ok(result().calculationTrace.length >= 13));
test("40. calculation trace contains all mandated stages", () => { const steps = new Set(result().calculationTrace.map((entry) => entry.step)); ["CHILD_ASSIGNMENT", "MINIMUM_INCOME", "MAXIMUM_KIZ", "CHILD_INCOME", "PARENT_NEED", "ADULT_INCOME", "PARENT_INCOME_REDUCTION", "ASSETS", "FAMILY_NEED", "HOUSING_BENEFIT", "COVERAGE", "FINAL_ROUNDING", "PAYOUT"].forEach((step) => assert.ok(steps.has(step))); });
test("41. used rule ids are deduplicated", () => { const ids = result().usedRuleIds; assert.equal(ids.length, new Set(ids).size); });
test("42. source ids are deduplicated", () => { const ids = result().sourceIds; assert.equal(ids.length, new Set(ids).size); });
test("43. trace does not contain a full state copy", () => assert.equal(JSON.stringify(result().calculationTrace).includes("centralChildren"), false));
test("44. unresolved result never exposes a final payable amount", () => { const s = state(); s.households.A.coverageAssetStatus = "unknown"; s.households.A.housingBenefit = "425"; assert.equal(result(s).amounts.finalPayableAmount, null); });
test("45. exact zero is not shown as positive entitlement", () => { const s = state(); s.households.A.applicantIncomeSources = [adultIncome(2200)]; s.households.A.housingBenefit = "1500"; assert.equal(result(s).status, "CALCULATED_NOT_ENTITLED"); });

if (require.main === module) {
  let failed = 0;
  tests.forEach(({ name, run }) => {
    try { run(); console.log(`OK ${name}`); }
    catch (error) { failed += 1; console.error(`FEHLER ${name}`); console.error(error.stack || error); }
  });
  console.log(`${tests.length - failed}/${tests.length} D9-Finaltests erfolgreich.`);
  if (failed) process.exitCode = 1;
}

module.exports = { adultIncome, child, childIncomeSource, wgData, wgPerson, asset, assetPersons, household, state, result, valid };
