"use strict";

const assert = require("node:assert/strict");
const calculator = require("../calculator.js");
const wohngeld = require("../wohngeld.js");
const parentNeedData = require("../parent-need-data.js");
const validation = require("../validation.js");

const tests = [];
const test = (name, run) => tests.push({ name, run });

function adultIncome(amount = 600) {
  return { id: "adult-income", personRole: "applicant", incomeType: "employment", amountType: "gross", entryMethod: "average", monthlyAverage: String(amount), monthlyValues: Array(6).fill(""), u25SpecialAllowanceStatus: "unknown", parentalAllowanceType: "unknown", confirmedExemptionMonthly: "", deductions: {} };
}

function child(id = "c1", householdId = "A", overrides = {}) {
  return { id, name: id, age: "5", careSituation: `dauerhaft-${householdId.toLowerCase()}`, maritalPartnershipStatus: "no", affectedHouseholds: [householdId], hasExternalHousehold: false, stayDays: "", childBenefitAt: householdId, childBenefitPerson: `applicant-${householdId.toLowerCase()}`, externalChildBenefitPerson: "", halfForwarded: false, hasOwnIncome: "no", incomeSources: [], eligiblePrivateInsuranceStatus: "no", u25RuleStageStatus: "unknown", decentralHotWaterStatus: { A: "no", B: "no" }, additionalNeedStatus: "no", additionalNeedMonthlyAmount: "", ...overrides };
}

function wgForecast(monthlyIncome) {
  if (monthlyIncome === null) return { incomeStatus: "unknown", mode: "unknown", taxExpected: "unknown", healthCareContributionExpected: "unknown", pensionContributionExpected: "unknown", sources: [] };
  if (monthlyIncome === 0) return { incomeStatus: "none", mode: "annual", taxExpected: "no", healthCareContributionExpected: "no", pensionContributionExpected: "no", sources: [] };
  return { incomeStatus: "present", mode: "annual", taxExpected: "no", healthCareContributionExpected: "no", pensionContributionExpected: "no", sources: [{ id: "wg-income", type: "sick-pay", expectedAnnualAmount: String(monthlyIncome * 12), expectedMonthlyAmount: "", monthlyValues: Array(12).fill(""), details: {} }] };
}

function wgPerson(monthlyIncome = 1000, exclusion = "not-excluded") {
  return { wohngeldExclusionStatus: exclusion, wohngeldExclusionReason: exclusion === "excluded" ? "transfer-benefit" : "", careDaysInReferenceMonth: "", incomeForecast: wgForecast(monthlyIncome), disabilityAllowanceStatus: "not-applicable", nsPersecutionStatus: "no", wohngeldGrundrentenTimesStatus: "no" };
}

function wgData(options = {}) {
  const { mode = "automatic", monthlyIncome = 1000, mietstufe = "IV", section20 = "not-excluded", significantAssets = "not-excluded", allExcluded = false, childId = "c1" } = options;
  return {
    calculationMode: mode, section20Status: section20, significantAssetsStatus: significantAssets, mietstufe,
    nonHouseholdAdjustmentStatus: "none", complexUseStatus: "no", singleParentAllowanceStatus: "no",
    persons: { applicant: wgPerson(monthlyIncome, allExcluded ? "excluded" : "not-excluded"), partner: wgPerson(0), children: { [childId]: wgPerson(0, allExcluded ? "excluded" : "not-excluded") } },
    ownerCosts: { livingAreaSqm: "", annualInterest: "", annualPrincipalRepayment: "", annualLoanAncillaryCosts: "", annualGuaranteeCosts: "", annualLeaseholdPayment: "", annualTotalLoanPayments: "", annualPropertyTax: "", annualThirdPartyAdministrationCosts: "" },
    maintenanceDeductions: [],
  };
}

function household(letter = "A", options = {}) {
  const { hbStatus = "not-received", hbAmount = "", coverageAssets = "confirmed-none", adult = 600, rawRent = 300, extendedStatus = "none", wg = {} } = options;
  return {
    label: `Haushalt ${letter}`, adults: "single", person1: letter, partner: "", applicantIncomeSources: adult === null ? [] : [adultIncome(adult)], partnerIncomeSources: [], applicantExpenses: [], partnerExpenses: [], otherResidents: "0",
    housingBenefitStatus: hbStatus, housingBenefit: hbAmount, assetsStatus: "no", assetPersons: { applicant: { assets: [] }, partner: { assets: [] }, children: {} }, coverageAssetStatus: coverageAssets, extendedAccessSgbBenefitStatus: extendedStatus,
    additionalNeedOverride: "", hotWaterType: "central", decentralHotWaterAdults: { applicant: "no", partner: "no" }, specialSituations: [],
    housingType: "rent", housingCosts: { rent: { coldRent: String(rawRent), coldUtilities: "0", heating: "0", costMonth: "2026-07", sublettingStatus: "no", sublettingAmount: "", parkingAmount: "", parkingInseparableStatus: "unknown" }, owner: {} },
    wohngeldData: wgData({ childId: letter === "A" ? "c1" : "c2", ...wg }),
  };
}

function state(options = {}) {
  const kid = child("c1", "A", options.child || {});
  return { dataVersion: 14, applicationMonth: 7, applicationYear: 2026, mode: "single", centralChildren: [kid], households: { A: household("A", options), B: household("B", { hbStatus: "none", wg: { childId: "c2" } }) } };
}

function compareState(a = {}, b = {}) {
  return { dataVersion: 14, applicationMonth: 7, applicationYear: 2026, mode: "compare", centralChildren: [child("c1", "A"), child("c2", "B")], households: { A: household("A", { ...a, wg: { childId: "c1", ...(a.wg || {}) } }), B: household("B", { ...b, wg: { childId: "c2", ...(b.wg || {}) } }) } };
}

const coverage = (options = {}) => calculator.evaluateCoverage(state(options), "A");

test("1. approved bleibt vor automatic vorrangig", () => assert.equal(coverage({ hbStatus: "approved", hbAmount: "50" }).housingBenefit.basis, "APPROVED"));
test("2. automatic überschreibt approved nicht", () => assert.equal(coverage({ hbStatus: "approved", hbAmount: "50", wg: { monthlyIncome: 0 } }).housingBenefit.amount, 50));
test("3. estimated bleibt externer provisional Wert", () => assert.equal(coverage({ hbStatus: "estimated", hbAmount: "50" }).reliability, "PROVISIONAL_EXTERNAL_WOHNGELD"));
test("4. none bleibt bestätigte Null", () => assert.equal(coverage({ hbStatus: "none" }).housingBenefit.basis, "CONFIRMED_ZERO"));
test("5. not-received und automatic starten die fiktive Berechnung", () => assert.equal(coverage().housingBenefit.automaticCalculation.requested, true));
test("6. unknown und automatic starten bei Restlücke die fiktive Berechnung", () => assert.notEqual(coverage({ hbStatus: "unknown" }).housingBenefit.automaticCalculation.amountStatus, null));
test("7. unknown ohne Restlücke benötigt kein Wohngeld", () => assert.equal(coverage({ hbStatus: "unknown", adult: 2000, coverageAssets: "unknown" }).housingBenefit.basis, "NOT_NEEDED"));

test("8. vollständige positive Automatik liefert AUTOMATIC_FICTIVE", () => { const r = coverage(); assert.equal(r.housingBenefit.basis, "AUTOMATIC_FICTIVE"); assert.ok(r.housingBenefit.amount > 0); });
test("9. der automatische Betrag wird exakt einmal addiert", () => { const r = coverage(); assert.equal(r.coverage.resourcesWithWohngeld - r.coverage.resourcesWithoutWohngeld, r.housingBenefit.amount); });
test("10. automatisches Wohngeld verändert D5 und D6 nicht", () => { const s = state(); const d5 = calculator.evaluateAdultIncomeForHousehold(s, "A"); const d6 = calculator.evaluateParentIncomeReduction(s, "A"); calculator.evaluateCoverage(s, "A"); assert.deepEqual(calculator.evaluateAdultIncomeForHousehold(s, "A"), d5); assert.deepEqual(calculator.evaluateParentIncomeReduction(s, "A"), d6); });
test("11. gapAfterWohngeld wird mit dem automatischen Wert neu berechnet", () => { const r = coverage(); assert.equal(r.coverage.gapAfterWohngeld, Math.max(0, r.coverage.gapBeforeWohngeld - r.housingBenefit.amount)); });
test("12. automatisches Wohngeld kann normalen Zugang herstellen", () => { let found = null; for (let adult = 600; adult <= 2000; adult += 10) { const result = coverage({ adult }); if (result.housingBenefit.basis === "AUTOMATIC_FICTIVE" && result.coverageDecision === "NORMAL_ACCESS_COVERAGE_MET") { found = result; break; } } assert.ok(found); });
test("13. bei verbleibender Lücke läuft die bestehende Extended-Access-Prüfung", () => { const r = coverage({ wg: { monthlyIncome: 10000 } }); assert.equal(r.extendedAccess.needed, true); });

test("14. positiver Auto-Wert und §20 unknown bleiben unresolved", () => assert.ok(coverage({ wg: { section20: "unknown" } }).openChecks.includes("WG_SECTION_20_STATUS_REQUIRED_FOR_FICTIVE_AMOUNT")));
test("15. §20 excluded setzt fiktives Wohngeld auf null", () => assert.equal(coverage({ wg: { section20: "excluded" } }).housingBenefit.amount, 0));
test("16. positiver Auto-Wert und §21 Nr.3 unknown bleiben unresolved", () => assert.ok(coverage({ wg: { significantAssets: "unknown" } }).openChecks.includes("WG_SIGNIFICANT_ASSETS_STATUS_REQUIRED_FOR_FICTIVE_AMOUNT")));
test("17. §21 Nr.3 excluded setzt fiktives Wohngeld auf null", () => assert.equal(coverage({ wg: { significantAssets: "excluded" } }).housingBenefit.amount, 0));
test("18. beide not-excluded lassen den positiven Wert zu", () => assert.ok(coverage().housingBenefit.amount > 0));

test("19. ZERO_OR_NEGATIVE wird fiktiv als null verwendet", () => { const r = coverage({ wg: { monthlyIncome: 10000, section20: "unknown", significantAssets: "unknown" } }); assert.equal(r.housingBenefit.amount, 0); assert.equal(r.housingBenefit.automaticCalculation.amountStatus, "ZERO_OR_NEGATIVE"); });
test("20. BELOW_10_EURO wird fiktiv als null verwendet", () => { let found = null; for (let income = 1000; income < 5000; income += 1) { const r = coverage({ wg: { monthlyIncome: income, section20: "unknown", significantAssets: "unknown" } }); if (r.housingBenefit.automaticCalculation.amountStatus === "BELOW_10_EURO") { found = r; break; } } assert.ok(found); assert.equal(found.housingBenefit.amount, 0); });
test("21. vollständig ausgeschlossener WG-Haushalt wird fiktiv null", () => assert.equal(coverage({ wg: { allExcluded: true } }).housingBenefit.amount, 0));
test("22. kein negativer Wohngeldwert gelangt in Coverage", () => assert.ok(coverage({ wg: { monthlyIncome: 10000 } }).housingBenefit.amount >= 0));

test("23. unbekannte Mietstufe reicht den konkreten WG-Code weiter", () => assert.ok(coverage({ wg: { mietstufe: "unknown" } }).openChecks.includes("WG_MIETSTUFE_REQUIRED_FOR_AMOUNT")));
test("24. ungeklärtes WG-Einkommen reicht einen konkreten WG-Code weiter", () => assert.ok(coverage({ wg: { monthlyIncome: null } }).openChecks.includes("WG_FOUNDATION_UNRESOLVED")));
test("25. ungeklärtes WG-Betreuungsverhältnis bleibt mit konkretem Code offen", () => { const r = coverage({ child: { careSituation: "umgang-a", stayDays: "" } }); assert.ok(r.openChecks.some((code) => code.includes("CARE") || code.includes("RESIDENCE") || code.includes("FAMILY_NEED")), JSON.stringify(r.openChecks)); });
test("26. ungeklärte Eigentümerdaten blockieren den automatischen Wert konkret", () => { const s = state(); s.households.A.housingType = "owner"; s.households.A.housingCosts.owner = { costPeriodStatus: "previous-calendar-year", costYear: "2025", debtInterest: "300", debtInterestFrequency: "monthly", propertyTax: "600", propertyTaxFrequency: "yearly", buildingInsurance: "300", buildingInsuranceFrequency: "yearly", heating: "100", heatingFrequency: "monthly", otherCostsDescription: "", otherCostsAmount: "", otherCostsFrequency: "yearly", recentMonthlyValues: Array(12).fill("") }; const r = calculator.evaluateCoverage(s, "A"); assert.ok(r.openChecks.some((code) => code.startsWith("WG_OWNER_"))); });
test("27. bei konkreter Auto-Ursache erscheint nicht zusätzlich FICTIVE_HOUSING_BENEFIT_REQUIRED", () => assert.equal(coverage({ wg: { mietstufe: "unknown" } }).openChecks.includes("FICTIVE_HOUSING_BENEFIT_REQUIRED"), false));

test("28. unbekanntes Coverage-Vermögen blockiert vor Auto-WG", () => assert.ok(coverage({ coverageAssets: "unknown" }).openChecks.includes("SGBII_COVERAGE_ASSET_AMOUNT_NOT_EVALUATED")));
test("29. vorhandenes Coverage-Vermögen blockiert vor Auto-WG", () => assert.ok(coverage({ coverageAssets: "present" }).openChecks.includes("SGBII_COVERAGE_ASSET_AMOUNT_NOT_EVALUATED")));
test("30. confirmed-none lässt Auto-WG zu", () => assert.equal(coverage().housingBenefit.basis, "AUTOMATIC_FICTIVE"));
test("31. KiZ-Vermögensfreibeträge werden nicht als Coverage-Vermögen verwendet", () => { const r = coverage({ coverageAssets: "unknown" }); assert.equal(r.assets.countableCoverageAssets, null); });

test("32. not-requested verändert das bisherige D8A-Verhalten nicht", () => assert.ok(coverage({ wg: { mode: "not-requested" } }).openChecks.includes("FICTIVE_HOUSING_BENEFIT_REQUIRED")));
test("33. foundation wird nicht automatisch verwendet", () => assert.ok(coverage({ wg: { mode: "foundation" } }).openChecks.includes("FICTIVE_HOUSING_BENEFIT_REQUIRED")));
test("34. automatic aktiviert die Integration", () => assert.equal(coverage().housingBenefit.basis, "AUTOMATIC_FICTIVE"));
test("35. Migration setzt alte foundation-Werte nicht auf automatic", () => assert.equal(parentNeedData.migrateParentNeedHousehold({ wohngeldData: { calculationMode: "foundation" } }).wohngeldData.calculationMode, "foundation"));

test("36. Auto-WG in A verändert B nicht", () => { const s = compareState({}, { hbStatus: "none" }); const before = calculator.evaluateCoverage(s, "B"); calculator.evaluateCoverage(s, "A"); assert.deepEqual(calculator.evaluateCoverage(s, "B"), before); });
test("37. Mietstufe A verändert B nicht", () => { const one = compareState({ wg: { mietstufe: "I" } }, {}); const two = compareState({ wg: { mietstufe: "VII" } }, {}); assert.equal(calculator.evaluateCoverage(one, "B").housingBenefit.amount, calculator.evaluateCoverage(two, "B").housingBenefit.amount); });
test("38. WG-Einkommen B verändert A nicht", () => { const one = compareState({}, { wg: { monthlyIncome: 500 } }); const two = compareState({}, { wg: { monthlyIncome: 2000 } }); assert.equal(calculator.evaluateCoverage(one, "A").housingBenefit.amount, calculator.evaluateCoverage(two, "A").housingBenefit.amount); });
test("39. Coverage A und B bleiben unabhängig", () => { const s = compareState(); assert.equal(calculator.evaluateCoverage(s, "A").householdId, "A"); assert.equal(calculator.evaluateCoverage(s, "B").householdId, "B"); });

test("40. evaluateWohngeld bleibt ohne KiZ-Aufruf nutzbar", () => { const s = state(); assert.equal(wohngeld.evaluateWohngeld(s.households.A, s.centralChildren, { householdId: "A", applicationYear: 2026 }).amount.status, "SUPPORTED"); });
test("41. WG-AMOUNT-001 bleibt stabil", () => assert.equal(wohngeld.RULE_IDS.amount, "WG-AMOUNT-001"));
test("42. Mietzuschuss bleibt korrekt", () => { const s = state(); assert.equal(wohngeld.evaluateWohngeld(s.households.A, s.centralChildren, { householdId: "A", applicationYear: 2026 }).amount.benefitType, "MIETZUSCHUSS"); });
test("43. Lastenzuschuss bleibt im eigenständigen Kern korrekt", () => { const s = state(); const h = s.households.A; h.housingType = "owner"; h.wohngeldData.ownerCosts = { livingAreaSqm: "1", annualInterest: "3564", annualPrincipalRepayment: "0", annualLoanAncillaryCosts: "0", annualGuaranteeCosts: "0", annualLeaseholdPayment: "0", annualTotalLoanPayments: "", annualPropertyTax: "0", annualThirdPartyAdministrationCosts: "0" }; assert.equal(wohngeld.evaluateWohngeld(h, s.centralChildren, { householdId: "A", applicationYear: 2026 }).amount.benefitType, "LASTENZUSCHUSS"); });
test("44. Fixed-Point-Formel bleibt unverändert", () => assert.equal(wohngeld.fixedPoint.scaledToDecimalString(wohngeld.fixedPoint.scaledMultiply(wohngeld.fixedPoint.decimalToScaledInteger("0.1"), wohngeld.fixedPoint.decimalToScaledInteger("0.2"))), "0.0200000000"));

test("45. Datenversion 16 ergänzt beide Precheck-Statusfelder", () => { const migrated = parentNeedData.migrateParentNeedHousehold({}); assert.equal(parentNeedData.DATA_VERSION, 16); assert.equal(migrated.wohngeldData.section20Status, "unknown"); assert.equal(migrated.wohngeldData.significantAssetsStatus, "unknown"); });
test("46. not-received ist ein gültiger Wohngeldstatus", () => { const s = state({ wg: { mode: "not-requested" } }); const messages = validation.validateCalculatorState(s); assert.equal(messages.errors.some((entry) => entry.code === "HOUSING_BENEFIT_STATUS_INVALID"), false); });
test("47. automatic ist ein gültiger Berechnungsmodus", () => { const messages = validation.validateCalculatorState(state()); assert.equal(messages.errors.some((entry) => entry.code === "WG_CALCULATION_MODE_INVALID"), false); });
test("48. ungültige Precheck-Statuswerte werden validiert", () => { const s = state(); s.households.A.wohngeldData.section20Status = "invalid"; s.households.A.wohngeldData.significantAssetsStatus = "invalid"; const codes = validation.validateCalculatorState(s).errors.map((entry) => entry.code); assert.ok(codes.includes("WG_SECTION_20_STATUS_INVALID")); assert.ok(codes.includes("WG_SIGNIFICANT_ASSETS_STATUS_INVALID")); });

test("49. section20 exclusion overrides unknown asset precheck", () => { const r = coverage({ wg: { section20: "excluded", significantAssets: "unknown" } }); assert.equal(r.housingBenefit.amount, 0); assert.equal(r.openChecks.includes("WG_SIGNIFICANT_ASSETS_STATUS_REQUIRED_FOR_FICTIVE_AMOUNT"), false); });
test("50. asset exclusion overrides unknown section20 precheck", () => { const r = coverage({ wg: { section20: "unknown", significantAssets: "excluded" } }); assert.equal(r.housingBenefit.amount, 0); assert.equal(r.openChecks.includes("WG_SECTION_20_STATUS_REQUIRED_FOR_FICTIVE_AMOUNT"), false); });
test("51. concrete automatic WG check suppresses generic unresolved code", () => { const r = coverage({ wg: { mietstufe: "unknown" } }); assert.ok(r.openChecks.includes("WG_MIETSTUFE_REQUIRED_FOR_AMOUNT")); assert.equal(r.openChecks.includes("WG_AUTOMATIC_AMOUNT_UNRESOLVED"), false); });
test("52. attempted automatic WG with amount error is not marked unevaluated", () => { const r = coverage({ wg: { mietstufe: "unknown" } }); assert.equal(r.remainingSteps.includes("AUTOMATIC_HOUSING_BENEFIT_NOT_EVALUATED"), false); });
test("53. attempted automatic WG with eligibility check is not marked unevaluated", () => { const r = coverage({ wg: { section20: "unknown" } }); assert.equal(r.remainingSteps.includes("AUTOMATIC_HOUSING_BENEFIT_NOT_EVALUATED"), false); });

let failed = 0;
tests.forEach(({ name, run }) => {
  try { run(); console.log(`OK ${name}`); }
  catch (error) { failed += 1; console.error(`FEHLER ${name}`); console.error(error.stack || error); }
});
console.log(`${tests.length - failed}/${tests.length} D8B3-Wohngeld-Coverage-Integrationstests erfolgreich.`);
if (failed) process.exitCode = 1;
