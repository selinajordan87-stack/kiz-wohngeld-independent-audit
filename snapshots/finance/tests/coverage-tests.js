"use strict";

const assert = require("node:assert/strict");
const calculator = require("../calculator.js");
const validation = require("../validation.js");
const parentNeedData = require("../parent-need-data.js");

const tests = [];
const test = (name, run) => tests.push({ name, run });
const avg = (monthlyAverage, extra = {}) => ({ enabled: true, entryMethod: "average", monthlyAverage: String(monthlyAverage), monthlyValues: ["", "", "", "", "", ""], ...extra });
function adultIncome(amount = 600, overrides = {}) {
  return {
    id: overrides.id || "adult-income", personRole: "applicant", incomeType: "employment", amountType: "gross", entryMethod: "average",
    monthlyAverage: String(amount), monthlyValues: ["", "", "", "", "", ""], u25SpecialAllowanceStatus: "unknown", parentalAllowanceType: "unknown",
    confirmedExemptionMonthly: "", deductions: {}, ...overrides,
  };
}
function child(id = "c1", income = 0, overrides = {}) {
  return {
    id, name: id, age: "5", careSituation: "dauerhaft-a", maritalPartnershipStatus: "no", affectedHouseholds: ["A"], hasExternalHousehold: false,
    stayDays: "", childBenefitAt: "A", childBenefitPerson: "applicant-a", externalChildBenefitPerson: "", halfForwarded: false,
    hasOwnIncome: income ? "yes" : "no", incomeSources: income ? [{ id: `income-${id}`, incomeType: "maintenance", subtype: "", customLabel: "", amountType: "net", entryMethod: "average", monthlyAverage: String(income), monthlyValues: ["", "", "", "", "", ""] }] : [],
    eligiblePrivateInsuranceStatus: "no", u25RuleStageStatus: "unknown", decentralHotWaterStatus: { A: "no", B: "no" }, additionalNeedStatus: "no", additionalNeedMonthlyAmount: "", ...overrides,
  };
}
function asset(id, value, ownerRole = "applicant") {
  return { id, type: "cash", value: String(value), ownerRole, protectedStatus: "no", details: { realizableStatus: "yes", incomeDoubleCountStatus: "no" } };
}
function assetPersons(applicant = [], children = {}, partner = []) {
  return { applicant: { assets: applicant }, partner: { assets: partner }, children: Object.fromEntries(Object.entries(children).map(([id, assets]) => [id, { assets }])) };
}
function household(overrides = {}) {
  const result = {
    label: "Haushalt A", adults: "single", person1: "A", partner: "", applicantIncomeSources: [], partnerIncomeSources: [], applicantExpenses: [], partnerExpenses: [], otherResidents: "0",
    housingBenefitStatus: "none", housingBenefit: "", assetsStatus: "no", assetPersons: assetPersons(), coverageAssetStatus: "confirmed-none", extendedAccessSgbBenefitStatus: "none",
    additionalNeedOverride: "", hotWaterType: "central", decentralHotWaterAdults: { applicant: "no", partner: "no" }, specialSituations: [],
    housingType: "rent", housingCosts: { rent: { coldRent: "300", coldUtilities: "0", heating: "0", costMonth: "2026-07", sublettingStatus: "no", sublettingAmount: "", parkingAmount: "", parkingInseparableStatus: "unknown" }, owner: {} },
    ...overrides,
  };
  if (!Object.hasOwn(overrides, "applicantIncomeStatus")) result.applicantIncomeStatus = result.applicantIncomeSources.length ? "present" : "none";
  if (!Object.hasOwn(overrides, "partnerIncomeStatus")) result.partnerIncomeStatus = result.partnerIncomeSources.length ? "present" : "none";
  return result;
}
function state(children = [child()], overrides = {}) {
  return { dataVersion: 12, applicationMonth: 7, applicationYear: 2026, mode: "single", centralChildren: children, households: { A: household(overrides), B: household() } };
}
function compareState() {
  const childA = child("a");
  const childB = child("b", 0, { careSituation: "dauerhaft-b", affectedHouseholds: ["B"], childBenefitAt: "B", childBenefitPerson: "applicant-b" });
  return { dataVersion: 12, applicationMonth: 7, applicationYear: 2026, mode: "compare", centralChildren: [childA, childB], households: { A: household({ label: "Haushalt A" }), B: household({ label: "Haushalt B" }) } };
}
function membership(overrides = {}) {
  return { status: "SUPPORTED", childId: "c1", isSgbIIBgMember: true, childNeed: { childTotalNeed: 657 }, bgIncome: { countableChildIncomeAverage: 100, childBenefitForSgbIIMembership: 259 }, ...overrides };
}
const coverage = (children, overrides) => calculator.evaluateCoverage(state(children, overrides), "A");
const codes = (s) => { const result = validation.validateCalculatorState(s); return [...result.errors, ...result.warnings, ...result.infos].map((message) => message.code); };

test("1. Coverage-Einkommensregel-ID ist stabil", () => assert.equal(calculator.RULE_IDS.coverageIncome, "KIZ-COVERAGE-INCOME-001"));
test("2. Coverage-Kindergeldregel-ID ist stabil", () => assert.equal(calculator.RULE_IDS.coverageChildBenefit, "KIZ-COVERAGE-CHILD-BENEFIT-001"));
test("3. Coverage-Regel-ID ist stabil", () => assert.equal(calculator.RULE_IDS.coverage, "KIZ-COVERAGE-001"));
test("4. Regel-ID des erweiterten Zugangs ist stabil", () => assert.equal(calculator.RULE_IDS.extendedAccess, "KIZ-EXTENDED-ACCESS-001"));

test("5. Kindergeldzuordnung liefert die eigene Regel-ID", () => assert.equal(calculator.evaluateCoverageChildBenefit(membership()).ruleId, calculator.RULE_IDS.coverageChildBenefit));
test("6. eigener SGB-II-Bedarf wird übernommen", () => assert.equal(calculator.evaluateCoverageChildBenefit(membership()).totalChildNeed, 657));
test("7. volles eigenes Kindeseinkommen wird übernommen", () => assert.equal(calculator.evaluateCoverageChildBenefit(membership()).countableChildIncomeAverage, 100));
test("8. Restbedarf nach eigenem Einkommen beträgt 557", () => assert.equal(calculator.evaluateCoverageChildBenefit(membership()).remainingNeedAfterOwnSgbIIIncome, 557));
test("9. Kindergeld deckt bei hohem Restbedarf vollständig das Kind", () => assert.equal(calculator.evaluateCoverageChildBenefit(membership()).childBenefitForChildCoverageNeed, 259));
test("10. bei hohem Restbedarf entsteht kein Kindergeldüberschuss", () => assert.equal(calculator.evaluateCoverageChildBenefit(membership()).coverageChildBenefitSurplus, 0));
test("11. Teilrestbedarf nimmt nur den benötigten Kindergeldanteil", () => assert.equal(calculator.evaluateCoverageChildBenefit(membership({ bgIncome: { countableChildIncomeAverage: 600, childBenefitForSgbIIMembership: 259 } })).childBenefitForChildCoverageNeed, 57));
test("12. Teilrestbedarf erzeugt den korrespondierenden Kindergeldüberschuss", () => assert.equal(calculator.evaluateCoverageChildBenefit(membership({ bgIncome: { countableChildIncomeAverage: 600, childBenefitForSgbIIMembership: 259 } })).coverageChildBenefitSurplus, 202));
test("13. vollständig eigenbedarfsdeckendes Einkommen lässt das ganze Kindergeld übrig", () => assert.equal(calculator.evaluateCoverageChildBenefit(membership({ bgIncome: { countableChildIncomeAverage: 700, childBenefitForSgbIIMembership: 259 } })).coverageChildBenefitSurplus, 259));
test("14. exakte Bedarfsdeckung durch eigenes Einkommen lässt das ganze Kindergeld übrig", () => assert.equal(calculator.evaluateCoverageChildBenefit(membership({ bgIncome: { countableChildIncomeAverage: 657, childBenefitForSgbIIMembership: 259 } })).coverageChildBenefitSurplus, 259));
test("15. Kindergeldanteil und Überschuss ergeben immer den Haushaltsanteil", () => { const r = calculator.evaluateCoverageChildBenefit(membership({ bgIncome: { countableChildIncomeAverage: 600, childBenefitForSgbIIMembership: 129.5 } })); assert.equal(r.childBenefitForChildCoverageNeed + r.coverageChildBenefitSurplus, 129.5); });
test("16. explizites Kindergeld null ist unterstützt", () => assert.equal(calculator.evaluateCoverageChildBenefit(membership({ bgIncome: { countableChildIncomeAverage: 100, childBenefitForSgbIIMembership: 0 } })).status, "SUPPORTED"));
test("17. Nicht-BG-Kennzeichen bleibt im Ergebnis erhalten", () => assert.equal(calculator.evaluateCoverageChildBenefit(membership({ isSgbIIBgMember: false })).isSgbIIBgMember, false));
test("18. fehlender Bedarf bleibt offen", () => assert.ok(calculator.evaluateCoverageChildBenefit(membership({ childNeed: {} })).openChecks.includes("COVERAGE_CHILD_BENEFIT_INPUT_REQUIRED")));
test("19. fehlendes eigenes Einkommen bleibt offen", () => assert.ok(calculator.evaluateCoverageChildBenefit(membership({ bgIncome: { childBenefitForSgbIIMembership: 259 } })).openChecks.includes("COVERAGE_CHILD_BENEFIT_INPUT_REQUIRED")));
test("20. negativer Kindergeldwert bleibt offen", () => assert.equal(calculator.evaluateCoverageChildBenefit(membership({ bgIncome: { countableChildIncomeAverage: 0, childBenefitForSgbIIMembership: -1 } })).status, "UNRESOLVED"));

test("21. Coverage-Summen addieren Einkommen und KiZ", () => assert.equal(calculator.calculateCoverageAmounts(1000, 300, 200, 100).resourcesWithoutWohngeld, 600));
test("22. Lücke vor Wohngeld wird bei null gedeckelt", () => assert.equal(calculator.calculateCoverageAmounts(500, 300, 200, 100).gapBeforeWohngeld, 0));
test("23. positive Lücke vor Wohngeld bleibt erhalten", () => assert.equal(calculator.calculateCoverageAmounts(1000, 300, 200, 100).gapBeforeWohngeld, 400));
test("24. Wohngeld wird erst in der zweiten Ressourcensumme addiert", () => assert.equal(calculator.calculateCoverageAmounts(1000, 300, 200, 100, 50).resourcesWithWohngeld, 650));
test("25. Wohngeld vermindert die Lücke", () => assert.equal(calculator.calculateCoverageAmounts(1000, 300, 200, 100, 50).gapAfterWohngeld, 350));
test("26. überdeckendes Wohngeld erzeugt keine negative Lücke", () => assert.equal(calculator.calculateCoverageAmounts(500, 300, 200, 100, 50).gapAfterWohngeld, 0));
test("27. Überdeckung wird separat ausgewiesen", () => assert.equal(calculator.calculateCoverageAmounts(500, 300, 200, 100, 50).surplusAfterWohngeld, 150));
test("28. exakte Deckung erzeugt weder Lücke noch Überschuss", () => { const r = calculator.calculateCoverageAmounts(600, 300, 200, 100); assert.equal(r.gapAfterWohngeld, 0); assert.equal(r.surplusAfterWohngeld, 0); });
test("29. Centwerte werden nicht auf volle Euro gerundet", () => assert.equal(calculator.calculateCoverageAmounts(1000.55, 300.1, 200.2, 100.3).gapBeforeWohngeld, 399.95));
test("30. explizite Nullwerte sind gültige Coverage-Eingaben", () => assert.deepEqual(calculator.calculateCoverageAmounts(0, 0, 0, 0), { resourcesWithoutWohngeld: 0, gapBeforeWohngeld: 0, resourcesWithWohngeld: 0, gapAfterWohngeld: 0, surplusAfterWohngeld: 0 }));
test("31. negativer Bedarf wird abgelehnt", () => assert.equal(calculator.calculateCoverageAmounts(-1, 0, 0, 0), null));
test("32. negatives Erwachseneneinkommen wird abgelehnt", () => assert.equal(calculator.calculateCoverageAmounts(1, -1, 0, 0), null));
test("33. negatives Kindeseinkommen wird abgelehnt", () => assert.equal(calculator.calculateCoverageAmounts(1, 0, -1, 0), null));
test("34. negativer KiZ wird abgelehnt", () => assert.equal(calculator.calculateCoverageAmounts(1, 0, 0, -1), null));
test("35. negatives Wohngeld wird abgelehnt", () => assert.equal(calculator.calculateCoverageAmounts(1, 0, 0, 0, -1), null));

test("36. D8A bleibt unter Datenversion 16 erhalten", () => assert.equal(parentNeedData.DATA_VERSION, 16));
test("37. Altdaten erhalten Coverage-Vermögensstatus unknown", () => assert.equal(parentNeedData.migrateParentNeedHousehold({}).coverageAssetStatus, "unknown"));
test("38. assetsStatus nein wird nicht als Coverage-Vermögensbestätigung übernommen", () => assert.equal(parentNeedData.migrateParentNeedHousehold({ assetsStatus: "no" }).coverageAssetStatus, "unknown"));
test("39. bestätigter Coverage-Vermögensstatus bleibt erhalten", () => assert.equal(parentNeedData.migrateParentNeedHousehold({ coverageAssetStatus: "confirmed-none" }).coverageAssetStatus, "confirmed-none"));
test("40. vorhandenes Coverage-Vermögen bleibt erhalten", () => assert.equal(parentNeedData.migrateParentNeedHousehold({ coverageAssetStatus: "present" }).coverageAssetStatus, "present"));
test("41. ungültiger Coverage-Vermögensstatus wird defensiv unknown", () => assert.equal(parentNeedData.migrateParentNeedHousehold({ coverageAssetStatus: "invalid" }).coverageAssetStatus, "unknown"));
test("42. alter Leistungsstatus wird defensiv unknown", () => assert.equal(parentNeedData.migrateParentNeedHousehold({}).extendedAccessSgbBenefitStatus, "unknown"));
test("43. bestätigter Nichtbezug bleibt erhalten", () => assert.equal(parentNeedData.migrateParentNeedHousehold({ extendedAccessSgbBenefitStatus: "none" }).extendedAccessSgbBenefitStatus, "none"));
test("44. Bezug oder Antrag bleibt erhalten", () => assert.equal(parentNeedData.migrateParentNeedHousehold({ extendedAccessSgbBenefitStatus: "received-or-applied" }).extendedAccessSgbBenefitStatus, "received-or-applied"));
test("45. Migration verändert ihr Eingabeobjekt nicht", () => { const old = { assetsStatus: "no" }; const before = JSON.stringify(old); parentNeedData.migrateParentNeedHousehold(old); assert.equal(JSON.stringify(old), before); });
test("46. ungültiger Coverage-Vermögensstatus wird validiert", () => { const s = state(); s.households.A.coverageAssetStatus = "invalid"; assert.ok(codes(s).includes("COVERAGE_ASSET_STATUS_INVALID")); });
test("47. ungültiger Leistungsstatus wird validiert", () => { const s = state(); s.households.A.extendedAccessSgbBenefitStatus = "invalid"; assert.ok(codes(s).includes("EXTENDED_ACCESS_SGB_BENEFIT_STATUS_INVALID")); });

test("48. allgemeiner Grundabsetzbetrag zählt für erweiterten Zugang", () => assert.equal(calculator.calculateAdultIncomeForMonth({ personRole: "applicant", incomeSources: [adultIncome(600)], expenses: [] }, 0).earnedActivityDeductionsForExtendedAccess, 208));
test("49. Erwerbstätigenfreibetrag ist Teil des erweiterten Abzugs", () => assert.equal(calculator.calculateAdultIncomeForMonth({ personRole: "applicant", incomeSources: [adultIncome(600)], expenses: [] }, 0).deductionLedger.earnedIncomeAllowance, 108));
test("50. Steuer zählt nicht in den erweiterten Abzug", () => { const r = calculator.calculateAdultIncomeForMonth({ personRole: "applicant", incomeSources: [adultIncome(600, { deductions: { tax: avg(50) } })], expenses: [] }, 0); assert.equal(r.earnedActivityDeductionsForExtendedAccess, 208); });
test("51. Pflicht-SV zählt nicht in den erweiterten Abzug", () => { const r = calculator.calculateAdultIncomeForMonth({ personRole: "applicant", incomeSources: [adultIncome(600, { deductions: { healthInsurance: avg(50, { mandatoryStatus: "yes" }) } })], expenses: [] }, 0); assert.equal(r.earnedActivityDeductionsForExtendedAccess, 208); });
test("52. allgemeiner sonstiger Abzug zählt nicht in den erweiterten Abzug", () => { const expense = { id: "u", personRole: "applicant", expenseType: "paid-maintenance", entryMethod: "average", monthlyAverage: "50", monthlyValues: ["", "", "", "", "", ""], legalObligationConfirmed: "yes", titleOrNotarialMonthlyMaximum: "50" }; const r = calculator.calculateAdultIncomeForMonth({ personRole: "applicant", incomeSources: [adultIncome(600)], expenses: [expense] }, 0); assert.equal(r.earnedActivityDeductionsForExtendedAccess, 208); });
test("53. null Erwerbsbrutto erzeugt null erweiterten Abzug", () => assert.equal(calculator.calculateAdultIncomeForMonth({ personRole: "applicant", incomeSources: [], expenses: [] }, 0).earnedActivityDeductionsForExtendedAccess, 0));
test("54. 100 Euro Erwerbsbrutto erfüllen exakt den Grundabzug 100", () => assert.equal(calculator.calculateAdultIncomeForMonth({ personRole: "applicant", incomeSources: [adultIncome(100)], expenses: [] }, 0).earnedActivityDeductionsForExtendedAccess, 100));
test("55. 99,99 Euro Erwerbsbrutto bleiben unter der 100-Euro-Grenze", () => assert.equal(calculator.calculateAdultIncomeForMonth({ personRole: "applicant", incomeSources: [adultIncome(99.99)], expenses: [] }, 0).earnedActivityDeductionsForExtendedAccess, 99.99));
test("56. 520 Euro Erwerbsbrutto ergeben 184 Euro erweiterten Abzug", () => assert.equal(calculator.calculateAdultIncomeForMonth({ personRole: "applicant", incomeSources: [adultIncome(520)], expenses: [] }, 0).earnedActivityDeductionsForExtendedAccess, 184));
test("57. 1000 Euro Erwerbsbrutto ergeben 328 Euro erweiterten Abzug", () => assert.equal(calculator.calculateAdultIncomeForMonth({ personRole: "applicant", incomeSources: [adultIncome(1000)], expenses: [] }, 0).earnedActivityDeductionsForExtendedAccess, 328));
test("58. sechs gleiche Monate behalten ihren erweiterten Durchschnitt", () => { const r = calculator.evaluateAdultIncomeForHousehold(state([child()], { applicantIncomeSources: [adultIncome(600)] }), "A"); assert.equal(r.personResults.applicant.extendedAccessEarnedDeductions.monthlyAverage, 208); });
test("59. sechs Monatswerte des erweiterten Abzugs werden protokolliert", () => { const r = calculator.evaluateAdultIncomeForHousehold(state([child()], { applicantIncomeSources: [adultIncome(600)] }), "A"); assert.equal(r.personResults.applicant.extendedAccessEarnedDeductions.monthlyValues.length, 6); });
test("60. 2b-Sonderregime bleibt für erweiterten Zugang offen", () => { const source = adultIncome(800, { incomeType: "training", u25SpecialAllowanceStatus: "yes" }); const r = calculator.evaluateAdultIncomeForHousehold(state([child()], { applicantIncomeSources: [source] }), "A"); assert.ok(r.personResults.applicant.extendedAccessEarnedDeductions.openChecks.includes("EXTENDED_ACCESS_SPECIAL_ALLOWANCE_OPEN")); });

test("61. Standardfall ohne ausreichende Mittel verfehlt Coverage", () => assert.equal(coverage([child()]).coverageDecision, "COVERAGE_NOT_MET"));
test("62. Coverage übernimmt den D4-Familienbedarf unverändert", () => { const s = state(); assert.equal(calculator.evaluateCoverage(s, "A").familyNeed.familySgbIINeed, calculator.evaluateFamilySgbIINeed(s, "A").familySgbIINeed); });
test("63. Coverage übernimmt ausschließlich den D7-KiZ für Monat 1", () => { const s = state(); assert.equal(calculator.evaluateCoverage(s, "A").kiz.month1KiZAfterIncomeAndAssets, calculator.evaluateAssetIntegration(s, "A").month1.kizAfterAssets); });
test("64. Coverage verwendet das volle SGB-II-Kindeseinkommen", () => assert.equal(coverage([child("c1", 100)]).income.childIncome, 100));
test("65. Coverage verwendet reguläres D5-Erwachseneneinkommen", () => { const s = state([child()], { applicantIncomeSources: [adultIncome(600)] }); assert.equal(calculator.evaluateCoverage(s, "A").income.adultRegularIncome, calculator.evaluateAdultIncomeForHousehold(s, "A").regularIncome.averageTotal); });
test("66. normales Coverage kann ohne Wohngeld erfüllt sein", () => { const r = coverage([child()], { applicantIncomeSources: [adultIncome(2000)], housingBenefitStatus: "unknown", coverageAssetStatus: "unknown", extendedAccessSgbBenefitStatus: "unknown" }); assert.equal(r.coverageDecision, "NORMAL_ACCESS_COVERAGE_MET"); assert.equal(r.housingBenefit.basis, "NOT_NEEDED"); });
test("67. unbekanntes Wohngeld blockiert bei verbleibender Lücke", () => assert.ok(coverage([child()], { housingBenefitStatus: "unknown" }).openChecks.includes("FICTIVE_HOUSING_BENEFIT_REQUIRED")));
test("68. extern geschätztes Wohngeld wird als vorläufig gekennzeichnet", () => assert.equal(coverage([child()], { housingBenefitStatus: "estimated", housingBenefit: "50" }).reliability, "PROVISIONAL_EXTERNAL_WOHNGELD"));
test("69. bewilligtes Wohngeld wird als bewilligt protokolliert", () => assert.equal(coverage([child()], { housingBenefitStatus: "approved", housingBenefit: "50" }).housingBenefit.basis, "APPROVED"));
test("70. bestätigtes Nichtbestehen von Wohngeld zählt als null", () => assert.equal(coverage([child()], { housingBenefitStatus: "none" }).housingBenefit.basis, "CONFIRMED_ZERO"));
test("71. unbekanntes Coverage-Vermögen blockiert nur bei verbleibender Lücke", () => assert.ok(coverage([child()], { coverageAssetStatus: "unknown" }).openChecks.includes("SGBII_COVERAGE_ASSET_AMOUNT_NOT_EVALUATED")));
test("72. vorhandenes Coverage-Vermögen wird nicht mit KiZ-Freibeträgen verrechnet", () => assert.ok(coverage([child()], { coverageAssetStatus: "present" }).openChecks.includes("SGBII_COVERAGE_ASSET_AMOUNT_NOT_EVALUATED")));
test("73. erweiterter Zugang wird bei Lücke bis 100 und Abzug ab 100 erfüllt", () => { const r = coverage([child()], { applicantIncomeSources: [adultIncome(600)], housingBenefitStatus: "approved", housingBenefit: "425" }); assert.equal(r.coverageDecision, "EXTENDED_ACCESS_COVERAGE_MET"); assert.equal(r.extendedAccess.met, true); });
test("74. Lücke über 100 verfehlt den erweiterten Zugang", () => { const r = coverage([child()], { applicantIncomeSources: [adultIncome(600)], housingBenefitStatus: "approved", housingBenefit: "0" }); assert.equal(r.coverageDecision, "COVERAGE_NOT_MET"); assert.equal(r.extendedAccess.gapWithin100, false); });
test("75. Erwerbsabzug unter 100 verfehlt den erweiterten Zugang", () => { const r = coverage([child()], { applicantIncomeSources: [adultIncome(99.99)], housingBenefitStatus: "approved", housingBenefit: "817" }); assert.equal(r.coverageDecision, "COVERAGE_NOT_MET"); assert.equal(r.extendedAccess.gapWithin100, true); assert.equal(r.extendedAccess.earnedDeductionConditionMet, false); });
test("76. SGB-II-/SGB-XII-Bezug oder Antrag schließt erweiterten Zugang aus", () => { const r = coverage([child()], { applicantIncomeSources: [adultIncome(600)], housingBenefitStatus: "approved", housingBenefit: "425", extendedAccessSgbBenefitStatus: "received-or-applied" }); assert.equal(r.coverageDecision, "COVERAGE_NOT_MET"); assert.equal(r.extendedAccess.sgbBenefitConditionMet, false); });
test("77. unbekannter Leistungsstatus lässt entscheidungsrelevanten erweiterten Zugang offen", () => assert.ok(coverage([child()], { applicantIncomeSources: [adultIncome(600)], housingBenefitStatus: "approved", housingBenefit: "425", extendedAccessSgbBenefitStatus: "unknown" }).openChecks.includes("EXTENDED_ACCESS_SGB_BENEFIT_STATUS_REQUIRED")));
test("78. 2b-Sonderregime blockiert den erweiterten Zugang transparent", () => assert.ok(coverage([child()], { applicantIncomeSources: [adultIncome(800, { incomeType: "training", u25SpecialAllowanceStatus: "yes" })], housingBenefitStatus: "approved", housingBenefit: "160" }).openChecks.includes("EXTENDED_ACCESS_SPECIAL_ALLOWANCE_OPEN")));
test("79. vollständige vorherige Vermögensablehnung macht Coverage nicht anwendbar", () => { const people = assetPersons([asset("app", 55400)], { c1: [] }); const r = coverage([child()], { assetsStatus: "yes", assetPersons: people }); assert.equal(r.coverageDecision, null); assert.equal(r.status, "NOT_APPLICABLE_DUE_TO_PRIOR_ASSET_REJECTION"); });
test("80. partielle Kindesvermögensablehnung bleibt statt Gesamtablehnung offen", () => { const kids = [child("c1", 400), child("c2", 0)]; const people = assetPersons([asset("app", 39000)], { c1: [asset("kid", 32500, "child")], c2: [] }); const r = coverage(kids, { assetsStatus: "yes", assetPersons: people }); assert.equal(r.coverageDecision, "UNRESOLVED"); assert.ok(r.openChecks.includes("PARENT_NEED_AFTER_CHILD_ASSET_REJECTION_OPEN")); });
test("81. Coverage verändert den Eingabestate nicht", () => { const s = state(); const before = JSON.stringify(s); calculator.evaluateCoverage(s, "A"); assert.equal(JSON.stringify(s), before); });
test("82. Coverage protokolliert alle vier neuen Regel-IDs", () => { const ids = coverage([child()]).usedRuleIds; assert.ok([calculator.RULE_IDS.coverageIncome, calculator.RULE_IDS.coverageChildBenefit, calculator.RULE_IDS.coverage, calculator.RULE_IDS.extendedAccess].every((id) => ids.includes(id))); });
test("83. Coverage bestimmt ausdrücklich keinen Endanspruch", () => assert.ok(coverage([child()]).remainingSteps.includes("FINAL_ENTITLEMENT_NOT_DETERMINED")));
test("84. Coverage wendet keine Schlussrundung an", () => assert.ok(coverage([child()]).remainingSteps.includes("FINAL_ROUNDING_NOT_APPLIED")));
test("85. Restlücke exakt 100 erfüllt die Betragsgrenze", () => { const r = coverage([child()], { applicantIncomeSources: [adultIncome(600)], housingBenefitStatus: "approved", housingBenefit: "374.68" }); assert.equal(r.coverage.gapAfterWohngeld, 100); assert.equal(r.extendedAccess.gapWithin100, true); });
test("86. Restlücke 100,01 überschreitet die Betragsgrenze", () => { const r = coverage([child()], { applicantIncomeSources: [adultIncome(600)], housingBenefitStatus: "approved", housingBenefit: "374.67" }); assert.equal(r.coverage.gapAfterWohngeld, 100.01); assert.equal(r.extendedAccess.gapWithin100, false); });
test("87. Restlücke null benötigt keinen erweiterten Zugang", () => { const r = coverage([child()], { applicantIncomeSources: [adultIncome(600)], housingBenefitStatus: "approved", housingBenefit: "474.68" }); assert.equal(r.coverage.gapAfterWohngeld, 0); assert.equal(r.extendedAccess.needed, false); });
test("88. vollständige Daten mit Restlücke setzen normalen Zugang auf false", () => assert.equal(coverage([child()]).normalAccess.met, false));
test("89. normaler Zugang ignoriert unbekannten Extended-Access-Leistungsstatus", () => assert.equal(coverage([child()], { applicantIncomeSources: [adultIncome(2000)], extendedAccessSgbBenefitStatus: "unknown" }).coverageDecision, "NORMAL_ACCESS_COVERAGE_MET"));
test("90. tatsächliche Nr.-3/4-Aufwendungen ersetzen den Grundbetrag im Extended-Ledger", () => { const expense = { id: "car", personRole: "applicant", expenseType: "car-liability", entryMethod: "average", monthlyAverage: "150", monthlyValues: ["", "", "", "", "", ""], liabilityOnlyConfirmed: "yes", proofStatus: "complete" }; const r = calculator.calculateAdultIncomeForMonth({ personRole: "applicant", incomeSources: [adultIncome(600)], expenses: [expense] }, 0); assert.equal(r.deductionLedger.useActualInsteadOfBasic, true); assert.equal(r.earnedActivityDeductionsForExtendedAccess, 288); });
test("91. Nullmonat bleibt im Divisor des Sechsmonatsmittels", () => { const source = adultIncome(600, { entryMethod: "monthly", monthlyAverage: "", monthlyValues: ["0", "600", "600", "600", "600", "600"] }); const r = calculator.evaluateAdultIncomeForHousehold(state([child()], { applicantIncomeSources: [source] }), "A").personResults.applicant.extendedAccessEarnedDeductions; assert.equal(r.sixMonthTotal, 1040); assert.equal(r.monthlyAverage, 173.33333333333); });
test("92. applicant und partner werden für Extended Access zusammengeführt", () => { const s = state([child()], { adults: "couple", partner: "P", applicantIncomeSources: [adultIncome(600)], partnerIncomeSources: [adultIncome(520, { id: "partner-income", personRole: "partner" })] }); const r = calculator.evaluateCoverage(s, "A"); assert.equal(r.extendedAccess.averageParentEarnedActivityDeductions, 392); });
test("93. Coverage confirmed-none protokolliert numerisches Nullvermögen", () => assert.equal(coverage([child()]).assets.countableCoverageAssets, 0));
test("94. assetsStatus nein allein genügt nicht für Coverage-Nullvermögen", () => { const r = coverage([child()], { assetsStatus: "no", coverageAssetStatus: undefined }); assert.equal(r.assets.countableCoverageAssets, null); assert.ok(r.openChecks.includes("SGBII_COVERAGE_ASSET_AMOUNT_NOT_EVALUATED")); });
test("95. KiZ-Freibetragswerte werden nicht als Coverage-Vermögen kopiert", () => { const r = coverage([child()], { assetsStatus: "yes", assetPersons: assetPersons([asset("app", 40000)]), coverageAssetStatus: "unknown" }); assert.equal(r.assets.countableCoverageAssets, null); });
test("96. kleine Kindesvermögensminderung wird exakt aus D7 Monat 1 übernommen", () => { const people = assetPersons([asset("app", 39000)], { c1: [asset("kid", 16100, "child")] }); const s = state([child("c1", 400)], { assetsStatus: "yes", assetPersons: people }); assert.equal(calculator.evaluateAssetIntegration(s, "A").month1.kizAfterAssets, 17); assert.equal(calculator.evaluateCoverage(s, "A").kiz.month1KiZAfterIncomeAndAssets, 17); });
test("97. Kindesvermögensablehnung des einzigen Kindes beendet Coverage", () => { const people = assetPersons([asset("app", 39000)], { c1: [asset("kid", 17500, "child")] }); const r = coverage([child("c1", 400)], { assetsStatus: "yes", assetPersons: people }); assert.equal(r.status, "NOT_APPLICABLE_DUE_TO_PRIOR_ASSET_REJECTION"); assert.equal(r.coverageDecision, null); });
test("98. Neuantragsstatus wird nach vollständiger Vorablehnung weitergereicht", () => { const r = coverage([child()], { assetsStatus: "yes", assetPersons: assetPersons([asset("app", 55400)], { c1: [] }) }); assert.deepEqual(r.remainingSteps, ["NEW_APPLICATION_REQUIRED"]); });
test("99. Vorablehnung erzeugt weder Wohngeldprüfung noch Folgemonatsanspruch", () => { const r = coverage([child()], { assetsStatus: "yes", assetPersons: assetPersons([asset("app", 55400)], { c1: [] }), housingBenefitStatus: "unknown" }); assert.equal(r.housingBenefit.amount, null); assert.equal(r.kiz.month1KiZAfterIncomeAndAssets, null); });
test("100. KiZ-Kind außerhalb der SGB-II-BG bleibt bei positiver KiZ-Zuordnung offen", () => assert.ok(coverage([child("c1", 400)]).openChecks.includes("COVERAGE_KIZ_CHILD_ALLOCATION_OPEN")));
test("101. überschießendes eigenes Nicht-BG-Kindeseinkommen wird nicht heuristisch übertragen", () => { const r = coverage([child("c1", 1000)]); assert.equal(r.income.childIncome, 0); assert.ok(r.openChecks.includes("HOUSEHOLD_COMMUNITY_SUPPORT_NON_BG_CHILD_OPEN")); });
test("102. Coverage-Kindergeldüberschuss wird separat als Elterneinkommen geführt", () => { const r = coverage([child("c1", 1000)]); assert.equal(r.income.coverageChildBenefitSurplusForParents, 259); assert.equal(r.income.adultCoverageIncome, 259); });
test("103. D5-Kindergeldüberhang wird nicht blind als reguläres Coverage-Einkommen übernommen", () => { const s = state([child("c1", 600)]); const d5 = calculator.evaluateAdultIncomeForHousehold(s, "A"); const r = calculator.evaluateCoverage(s, "A"); assert.equal(r.income.adultRegularIncome, d5.regularIncome.averageTotal); assert.notEqual(r.income.adultCoverageIncome, d5.preparedForParentReduction.totalIncome); });
test("104. möglicher zusätzlicher §26-Zuschuss erzeugt den Coverage-Prüfcode", () => { const source = adultIncome(600, { deductions: { healthInsurance: avg(50, { mandatoryStatus: "unknown" }) } }); const r = coverage([child()], { applicantIncomeSources: [source] }); assert.ok(r.openChecks.includes("COVERAGE_KV_PV_SUBSIDY_CHECK_REQUIRED")); assert.equal(r.status, "UNRESOLVED"); });
test("105. Haushalt A und B erhalten getrennte Coverage-Ergebnisse", () => { const s = compareState(); assert.equal(calculator.evaluateCoverage(s, "A").householdId, "A"); assert.equal(calculator.evaluateCoverage(s, "B").householdId, "B"); });
test("106. Wohngeld in A verändert Coverage-Lücke von B nicht", () => { const s1 = compareState(); const before = calculator.evaluateCoverage(s1, "B").coverage.gapAfterWohngeld; const s2 = compareState(); s2.households.A.housingBenefitStatus = "approved"; s2.households.A.housingBenefit = "500"; assert.equal(calculator.evaluateCoverage(s2, "B").coverage.gapAfterWohngeld, before); });
test("107. Einkommen in B verändert Coverage-Lücke von A nicht", () => { const s1 = compareState(); const before = calculator.evaluateCoverage(s1, "A").coverage.gapAfterWohngeld; const s2 = compareState(); s2.households.B.applicantIncomeSources = [adultIncome(2000)]; assert.equal(calculator.evaluateCoverage(s2, "A").coverage.gapAfterWohngeld, before); });
test("108. Coverage-Entscheidungen beider Haushalte werden nicht zusammengerechnet", () => { const s = compareState(); const result = [calculator.evaluateCoverage(s, "A").coverageDecision, calculator.evaluateCoverage(s, "B").coverageDecision]; assert.equal(result.length, 2); assert.equal(typeof result[0], "string"); assert.equal(typeof result[1], "string"); });
test("109. unbekannter Rechtszeitraum blockiert die Coverage-Pipeline", () => { const s = state(); s.applicationYear = 2025; assert.equal(calculator.evaluateCoverage(s, "A").status, "UNRESOLVED"); });
test("110. unresolved Erwachsenen-Einkommen blockiert Coverage", () => { const r = coverage([child()], { applicantIncomeSources: [adultIncome(600, { amountType: "net" })] }); assert.equal(r.status, "UNRESOLVED"); });
test("111. unresolved relevantes Kindeseinkommen blockiert Coverage", () => { const uncertain = child("c1", 100, { eligiblePrivateInsuranceStatus: "unknown" }); assert.equal(coverage([uncertain]).status, "UNRESOLVED"); });
test("112. ein Leistungsverzicht ist weder Eingabe noch Extended-Voraussetzung", () => { const r = coverage([child()], { applicantIncomeSources: [adultIncome(600)], housingBenefitStatus: "approved", housingBenefit: "425" }); assert.equal(Object.hasOwn(r.extendedAccess, "waiver"), false); assert.equal(r.extendedAccess.met, true); });
test("113. unbekanntes Wohngeld und unbekanntes Coverage-Vermögen blockieren zuerst durch Vermögen", () => { const r = coverage([child()], { housingBenefitStatus: "unknown", coverageAssetStatus: "unknown" }); assert.equal(r.coverageDecision, "UNRESOLVED"); assert.ok(r.openChecks.includes("SGBII_COVERAGE_ASSET_AMOUNT_NOT_EVALUATED")); assert.equal(r.openChecks.includes("FICTIVE_HOUSING_BENEFIT_REQUIRED"), false); assert.ok(Number.isFinite(r.familyNeed.familySgbIINeed)); assert.ok(Number.isFinite(r.coverage.gapBeforeWohngeld)); });
test("114. unbekanntes Wohngeld und vorhandenes Coverage-Vermögen blockieren zuerst durch Vermögen", () => { const r = coverage([child()], { housingBenefitStatus: "unknown", coverageAssetStatus: "present" }); assert.ok(r.openChecks.includes("SGBII_COVERAGE_ASSET_AMOUNT_NOT_EVALUATED")); assert.equal(r.openChecks.includes("FICTIVE_HOUSING_BENEFIT_REQUIRED"), false); assert.equal(r.assets.countableCoverageAssets, null); });
test("115. unbekanntes Wohngeld verlangt bei bestätigtem Nullvermögen weiterhin fiktives Wohngeld", () => { const r = coverage([child()], { housingBenefitStatus: "unknown", coverageAssetStatus: "confirmed-none" }); assert.ok(r.openChecks.includes("FICTIVE_HOUSING_BENEFIT_REQUIRED")); assert.equal(r.openChecks.includes("SGBII_COVERAGE_ASSET_AMOUNT_NOT_EVALUATED"), false); });
test("116. bereits ohne Wohngeld gedeckter Bedarf bleibt mit unbekanntem Vermögen normal gedeckt", () => { const r = coverage([child()], { applicantIncomeSources: [adultIncome(2000)], housingBenefitStatus: "unknown", coverageAssetStatus: "unknown" }); assert.equal(r.coverageDecision, "NORMAL_ACCESS_COVERAGE_MET"); assert.equal(r.housingBenefit.basis, "NOT_NEEDED"); });
test("117. bewilligtes Wohngeld darf eine Lücke trotz unbekanntem Vermögen normal schließen", () => { const r = coverage([child()], { applicantIncomeSources: [adultIncome(600)], housingBenefitStatus: "approved", housingBenefit: "475", coverageAssetStatus: "unknown" }); assert.equal(r.coverageDecision, "NORMAL_ACCESS_COVERAGE_MET"); assert.equal(r.housingBenefit.basis, "APPROVED"); });
test("118. bewilligtes Wohngeld mit Restlücke wird bei unbekanntem Vermögen durch Vermögen blockiert", () => { const r = coverage([child()], { applicantIncomeSources: [adultIncome(600)], housingBenefitStatus: "approved", housingBenefit: "425", coverageAssetStatus: "unknown" }); assert.ok(r.openChecks.includes("SGBII_COVERAGE_ASSET_AMOUNT_NOT_EVALUATED")); assert.equal(r.extendedAccess.needed, null); });
test("119. geschätztes Wohngeld darf eine Lücke trotz unbekanntem Vermögen vorläufig normal schließen", () => { const r = coverage([child()], { applicantIncomeSources: [adultIncome(600)], housingBenefitStatus: "estimated", housingBenefit: "475", coverageAssetStatus: "unknown" }); assert.equal(r.coverageDecision, "NORMAL_ACCESS_COVERAGE_MET"); assert.equal(r.reliability, "PROVISIONAL_EXTERNAL_WOHNGELD"); });
test("120. Extended Access startet nicht vor geklärtem entscheidungserheblichem Coverage-Vermögen", () => { const r = coverage([child()], { applicantIncomeSources: [adultIncome(600)], housingBenefitStatus: "approved", housingBenefit: "425", coverageAssetStatus: "present" }); assert.equal(r.coverageDecision, "UNRESOLVED"); assert.equal(r.extendedAccess.needed, null); assert.ok(r.openChecks.includes("SGBII_COVERAGE_ASSET_AMOUNT_NOT_EVALUATED")); });
test("121. confirmed-none mit bekanntem Wohngeld und Restlücke erreicht weiterhin die Extended-Access-Prüfung", () => { const r = coverage([child()], { applicantIncomeSources: [adultIncome(600)], housingBenefitStatus: "approved", housingBenefit: "425", coverageAssetStatus: "confirmed-none" }); assert.equal(r.extendedAccess.needed, true); assert.equal(r.coverageDecision, "EXTENDED_ACCESS_COVERAGE_MET"); });

let failed = 0;
tests.forEach(({ name, run }) => {
  try { run(); console.log(`OK ${name}`); }
  catch (error) { failed += 1; console.error(`FEHLER ${name}`); console.error(error.stack || error.message); }
});
console.log(`${tests.length - failed}/${tests.length} Tests für D8A-Coverage und erweiterten Zugang erfolgreich.`);
if (failed) process.exitCode = 1;
