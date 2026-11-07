"use strict";

const assert = require("node:assert/strict");
const calculator = require("../calculator.js");

const tests = [];
const test = (name, run) => tests.push({ name, run });
const detail = (overrides = {}) => ({ realizableStatus: "yes", incomeDoubleCountStatus: "no", ...overrides });
const asset = (id, value, ownerRole) => ({ id, type: "cash", value: String(value), ownerRole, protectedStatus: "no", details: detail() });
const assetPersons = (app = [], children = {}, partner = []) => ({ applicant: { assets: app }, partner: { assets: partner }, children: Object.fromEntries(Object.entries(children).map(([id, assets]) => [id, { assets }])) });
function child(id = "c1", income = 0, recipient = "applicant-a") {
  return {
    id, name: id, age: "5", careSituation: "dauerhaft-a", maritalPartnershipStatus: "no", affectedHouseholds: ["A"], hasExternalHousehold: false,
    stayDays: "", childBenefitAt: "A", childBenefitPerson: recipient, externalChildBenefitPerson: "", halfForwarded: false,
    hasOwnIncome: income ? "yes" : "no", incomeSources: income ? [{ id: `income-${id}`, incomeType: "maintenance", subtype: "", customLabel: "", amountType: "net", entryMethod: "average", monthlyAverage: String(income), monthlyValues: ["", "", "", "", "", ""] }] : [],
    eligiblePrivateInsuranceStatus: "no", u25RuleStageStatus: "unknown", decentralHotWaterStatus: { A: "no", B: "no" }, additionalNeedStatus: "no", additionalNeedMonthlyAmount: "",
  };
}
function household(overrides = {}) {
  const result = {
    label: "Haushalt A", adults: "single", person1: "A", partner: "", applicantIncomeSources: [], partnerIncomeSources: [], applicantExpenses: [], partnerExpenses: [], otherResidents: "0",
    housingBenefitStatus: "none", housingBenefit: "", assetsStatus: "no", assetPersons: assetPersons(), additionalNeedOverride: "", hotWaterType: "central", decentralHotWaterAdults: { applicant: "no", partner: "no" }, specialSituations: [],
    housingType: "rent", housingCosts: { rent: { coldRent: "300", coldUtilities: "0", heating: "0", costMonth: "2026-07", sublettingStatus: "no", sublettingAmount: "", parkingAmount: "", parkingInseparableStatus: "unknown" }, owner: {} }, ...overrides,
  };
  if (!Object.hasOwn(overrides, "applicantIncomeStatus")) result.applicantIncomeStatus = result.applicantIncomeSources.length ? "present" : "none";
  if (!Object.hasOwn(overrides, "partnerIncomeStatus")) result.partnerIncomeStatus = result.partnerIncomeSources.length ? "present" : "none";
  return result;
}
function state(children = [child()], householdOverrides = {}, date = { applicationMonth: 7, applicationYear: 2026 }) {
  return { dataVersion: 11, ...date, mode: "single", centralChildren: children, households: { A: household(householdOverrides), B: household() } };
}

test("1. Kindesvermögen 0 lässt D2 in allen Monaten unverändert", () => { const r = calculator.calculateChildAssetReduction(117, 0); assert.equal(r.month1KiZ, 117); assert.equal(r.months2To6KiZ, 117); assert.equal(r.rejectedDueToAssets, false); });
test("2. amtliche 100-Euro-Konstellation ergibt Monat 1 genau 17", () => assert.equal(calculator.calculateChildAssetReduction(117, 100).month1KiZ, 17));
test("3. amtliche 100-Euro-Konstellation lässt Monate 2 bis 6 bei 117", () => assert.equal(calculator.calculateChildAssetReduction(117, 100).months2To6KiZ, 117));
test("4. amtliche 1500-Euro-Konstellation schließt das Kind aus", () => assert.equal(calculator.calculateChildAssetReduction(117, 1500).rejectedDueToAssets, true));
test("5. abgelehntes Kind trägt in Monat 1 null bei", () => assert.equal(calculator.calculateChildAssetReduction(117, 1500).month1KiZ, 0));
test("6. abgelehntes Kind erzeugt keinen automatischen Null-BWZ für Monate 2 bis 6", () => assert.equal(calculator.calculateChildAssetReduction(117, 1500).months2To6KiZ, null));
test("7. exakte Kindesvermögensgleichheit bleibt offen", () => assert.ok(calculator.calculateChildAssetReduction(117, 117).openChecks.includes("ASSET_EXACT_EQUALITY_OPEN")));
test("8. negativer Kindeswert wird nicht berechnet", () => assert.ok(calculator.calculateChildAssetReduction(117, -1).openChecks.includes("CHILD_ASSET_REDUCTION_INPUT_REQUIRED")));

test("9. Elternvermögen 0 lässt beide Monatsgruppen unverändert", () => { const r = calculator.applyParentAssets(200, 250, 0); assert.equal(r.month1KiZ, 200); assert.equal(r.months2To6KiZ, 250); });
test("10. kleines Elternvermögen mindert nur Monat 1", () => { const r = calculator.applyParentAssets(200, 250, 50); assert.equal(r.month1KiZ, 150); assert.equal(r.months2To6KiZ, 250); });
test("11. Elternvermögen wird nur einmal angewandt", () => assert.equal(calculator.applyParentAssets(200, 250, 50).appliedParentAssetReduction, 50));
test("12. höheres Elternvermögen lehnt den Antragsmonat ab und bestimmt keine Folgemonate", () => { const r = calculator.applyParentAssets(200, 250, 201); assert.equal(r.rejectedDueToAssets, true); assert.equal(r.month1KiZ, 0); assert.equal(r.months2To6KiZ, null); });
test("13. exakte Elternvermögensgleichheit bleibt offen", () => assert.ok(calculator.applyParentAssets(200, 250, 200).openChecks.includes("ASSET_EXACT_EQUALITY_OPEN")));
test("14. negatives Elternvermögen wird nicht berechnet", () => assert.ok(calculator.applyParentAssets(200, 250, -1).openChecks.includes("PARENT_ASSET_REDUCTION_INPUT_REQUIRED")));

test("15. Pipeline ohne Vermögen ist unterstützt", () => assert.equal(calculator.evaluateAssetIntegration(state(), "A").status, "SUPPORTED"));
test("16. Pipeline verwendet genau fünf Folgemonate", () => assert.equal(calculator.evaluateAssetIntegration(state(), "A").months2To6Count, 5));
test("17. Pipeline gibt den ersten BWZ-Tag als Vermögensstichtag aus", () => assert.equal(calculator.evaluateAssetIntegration(state(), "A").assetAssessmentDate, "2026-07-01"));
test("18. Pipeline unterscheidet Vor-Juli-Rechtsstand", () => assert.equal(calculator.evaluateAssetIntegration(state([child()], {}, { applicationMonth: 6, applicationYear: 2026 }), "A").assetRuleVersion, "PRE_JULY_2026"));
test("19. gleicher Elternüberschuss steht in beiden Monatsgruppen vor Cap", () => { const r = calculator.evaluateAssetIntegration(state(), "A"); assert.equal(r.month1.parentIncomeReductionBeforeCap, r.months2To6.parentIncomeReductionBeforeCap); });
test("20. KiZ-Vermögen trennt Kind und Eltern", () => assert.deepEqual(calculator.evaluateAssetIntegration(state(), "A").countableAssetsForKizReduction, { children: 0, parents: 0, householdTotal: 0 }));
test("21. Wohngeld bleibt ein Folgeschritt", () => assert.ok(calculator.evaluateAssetIntegration(state(), "A").remainingSteps.includes("WOHNGELD_NOT_EVALUATED")));
test("22. Schlussrundung bleibt ein Folgeschritt", () => assert.ok(calculator.evaluateAssetIntegration(state(), "A").remainingSteps.includes("FINAL_ROUNDING_NOT_APPLIED")));

test("23. unbekannter Vermögensstatus blockiert vermögensabhängige Monatswerte", () => { const r = calculator.evaluateAssetIntegration(state([child()], { assetsStatus: "unknown" }), "A"); assert.equal(r.month1, null); assert.ok(r.openChecks.includes("ASSETS_STATUS_REQUIRED")); });
test("24. Elternvermögen wird nach Elterneinkommen angewandt", () => {
  const people = assetPersons([asset("app", 55100, "applicant")], { c1: [] });
  const r = calculator.evaluateAssetIntegration(state([child()], { assetsStatus: "yes", assetPersons: people }), "A");
  assert.equal(r.assetAssessment.countableAssets.parents, 100); assert.equal(r.month1.appliedParentAssetReduction, 100); assert.equal(r.months2To6.appliedParentAssetReduction, 0);
});
test("25. Kindesvermögen 100 wird in der vollständigen Pipeline nur in Monat 1 abgezogen", () => {
  const people = assetPersons([asset("app", 39000, "applicant")], { c1: [asset("kid", 16100, "child")] });
  const r = calculator.evaluateAssetIntegration(state([child("c1", 400)], { assetsStatus: "yes", assetPersons: people }), "A");
  assert.equal(r.month1.childResults[0].month1KiZ, 17); assert.equal(r.months2To6.childResults[0].months2To6KiZ, 117);
});
test("26. Kindesvermögen 1500 lehnt das einzige Kind in der vollständigen Pipeline ab", () => {
  const people = assetPersons([asset("app", 39000, "applicant")], { c1: [asset("kid", 17500, "child")] });
  const r = calculator.evaluateAssetIntegration(state([child("c1", 400)], { assetsStatus: "yes", assetPersons: people }), "A");
  assert.equal(r.rejectedDueToAssets, true); assert.equal(r.month1.kizAfterAssets, 0); assert.equal(r.months2To6, null);
});
test("27. Ablehnung eines von mehreren Kindern öffnet die D3-Neuberechnung", () => {
  const kids = [child("c1", 400), child("c2", 0)];
  const people = assetPersons([asset("app", 39000, "applicant")], { c1: [asset("kid", 32500, "child")], c2: [] });
  const r = calculator.evaluateAssetIntegration(state(kids, { assetsStatus: "yes", assetPersons: people }), "A");
  assert.ok(r.openChecks.includes("PARENT_NEED_AFTER_CHILD_ASSET_REJECTION_OPEN"));
});
test("28. positive Vermögensminderung bei zwei Empfängern lässt Haushaltssumme numerisch", () => {
  const kids = [child("c1", 0, "applicant-a"), child("c2", 0, "partner-a")];
  const people = assetPersons([asset("app", 85100, "applicant")], { c1: [], c2: [] });
  const r = calculator.evaluateAssetIntegration(state(kids, { adults: "couple", partner: "P", assetsStatus: "yes", assetPersons: people }), "A");
  assert.equal(typeof r.month1.kizAfterAssets, "number"); assert.ok(r.openChecks.includes("ASSET_PATCHWORK_ALLOCATION_OPEN"));
});
test("29. Pipeline verändert Eingaben nicht", () => { const s = state(); const before = JSON.stringify(s); calculator.evaluateAssetIntegration(s, "A"); assert.equal(JSON.stringify(s), before); });
test("30. Pipeline gibt alle vier D7-Regel-IDs aus", () => { const ids = calculator.evaluateAssetIntegration(state(), "A").usedRuleIds; assert.ok([calculator.RULE_IDS.asset, calculator.RULE_IDS.childAssetReduction, calculator.RULE_IDS.parentAssetReduction, calculator.RULE_IDS.assetIntegration].every((id) => ids.includes(id))); });

test("31. Kindesablehnung verlangt für den Folgezeitraum einen neuen Antrag", () => assert.equal(calculator.calculateChildAssetReduction(117, 1500).futurePeriodStatus, "NEW_APPLICATION_REQUIRED"));
test("32. Kindesablehnung kennzeichnet Neuantrag ab Folgemonat als grundsätzlich möglich", () => assert.equal(calculator.calculateChildAssetReduction(117, 1500).reapplicationPossibleFromFollowingMonth, true));
test("33. Elternablehnung verlangt für den Folgezeitraum einen neuen Antrag", () => assert.equal(calculator.applyParentAssets(200, 250, 201).futurePeriodStatus, "NEW_APPLICATION_REQUIRED"));
test("34. Elternablehnung kennzeichnet Neuantrag ab Folgemonat als grundsätzlich möglich", () => assert.equal(calculator.applyParentAssets(200, 250, 201).reapplicationPossibleFromFollowingMonth, true));
test("35. vollständige Pipeline übernimmt die Neuantragssemantik der Kindesablehnung", () => {
  const people = assetPersons([asset("app", 39000, "applicant")], { c1: [asset("kid", 17500, "child")] });
  assert.equal(calculator.evaluateAssetIntegration(state([child("c1", 400)], { assetsStatus: "yes", assetPersons: people }), "A").futurePeriodStatus, "NEW_APPLICATION_REQUIRED");
});
test("36. Kindesablehnung erzeugt auch keine Anzahl fingierter Folgemonate", () => {
  const people = assetPersons([asset("app", 39000, "applicant")], { c1: [asset("kid", 17500, "child")] });
  assert.equal(calculator.evaluateAssetIntegration(state([child("c1", 400)], { assetsStatus: "yes", assetPersons: people }), "A").months2To6Count, null);
});
test("37. zu hohes Elternvermögen ergibt in der Pipeline Monat 1 gleich null", () => {
  const people = assetPersons([asset("app", 55400, "applicant")], { c1: [] });
  assert.equal(calculator.evaluateAssetIntegration(state([child()], { assetsStatus: "yes", assetPersons: people }), "A").month1.kizAfterAssets, 0);
});
test("38. zu hohes Elternvermögen bestimmt in der Pipeline keine Folgemonate", () => {
  const people = assetPersons([asset("app", 55400, "applicant")], { c1: [] });
  const r = calculator.evaluateAssetIntegration(state([child()], { assetsStatus: "yes", assetPersons: people }), "A");
  assert.equal(r.months2To6, null); assert.equal(r.months2To6Count, null); assert.equal(r.futurePeriodStatus, "NEW_APPLICATION_REQUIRED");
});
test("39. KiZ-spezifischer Vermögenswert enthält weiterhin die amtlichen 100 Euro", () => {
  const people = assetPersons([asset("app", 39000, "applicant")], { c1: [asset("kid", 16100, "child")] });
  assert.equal(calculator.evaluateAssetIntegration(state([child("c1", 400)], { assetsStatus: "yes", assetPersons: people }), "A").countableAssetsForKizReduction.children, 100);
});
test("40. Coverage-Vermögensprüfung ist ausdrücklich nicht ausgewertet", () => assert.equal(calculator.evaluateAssetIntegration(state(), "A").coverageAssetAssessment.status, "NOT_EVALUATED"));
test("41. Coverage erhält keinen numerischen Vermögenswert aus der KiZ-Prüfung", () => assert.equal(calculator.evaluateAssetIntegration(state(), "A").coverageAssetAssessment.countableAssets, null));
test("42. altes missverständliches Coverage-Feld existiert nicht mehr", () => assert.equal(Object.hasOwn(calculator.evaluateAssetIntegration(state(), "A"), "countableAssetsForCoverage"), false));
test("43. kein still kopiertes SGB-II-Coverage-Vermögen wird ausgegeben", () => assert.equal(Object.hasOwn(calculator.evaluateAssetIntegration(state(), "A"), "sgbIICountableAssetsForCoverage"), false));
test("44. Vermögensstatus Nein wird nur als Nutzerangabe für die spätere Coverage-Phase dokumentiert", () => assert.equal(calculator.evaluateAssetIntegration(state(), "A").coverageAssetAssessment.userDeclaredNoSubstantialAssets, true));
test("45. D7.1 führt keine altersabhängigen Freibeträge ein", () => assert.deepEqual(calculator.ASSET_ALLOWANCES, { applicant: 40000, otherMember: 15000 }));
test("46. Ablehnungspipeline verändert Eingaben nicht", () => {
  const people = assetPersons([asset("app", 55400, "applicant")], { c1: [] });
  const s = state([child()], { assetsStatus: "yes", assetPersons: people }); const before = JSON.stringify(s);
  calculator.evaluateAssetIntegration(s, "A"); assert.equal(JSON.stringify(s), before);
});

let failed = 0;
tests.forEach(({ name, run }) => { try { run(); console.log(`OK ${name}`); } catch (error) { failed += 1; console.error(`FEHLER ${name}`); console.error(error.stack || error.message); } });
console.log(`${tests.length - failed}/${tests.length} Tests für die D7-Vermögensintegration erfolgreich.`);
if (failed) process.exitCode = 1;
