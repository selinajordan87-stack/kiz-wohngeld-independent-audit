"use strict";

const assert = require("node:assert/strict");
const calculator = require("../calculator.js");

const tests = [];
const test = (name, run) => tests.push({ name, run });

function childIncomeSource(amount, overrides = {}) {
  return {
    id: overrides.id || `child-income-${amount}`,
    incomeType: "maintenance",
    subtype: "",
    customLabel: "",
    amountType: "net",
    entryMethod: "average",
    monthlyAverage: String(amount),
    monthlyValues: ["", "", "", "", "", ""],
    ...overrides,
  };
}

function child(id = "child-1", overrides = {}) {
  const ownIncome = Object.hasOwn(overrides, "income") ? overrides.income : 0;
  const result = {
    id,
    name: id,
    age: "5",
    careSituation: "dauerhaft-a",
    maritalPartnershipStatus: "no",
    affectedHouseholds: ["A"],
    hasExternalHousehold: false,
    stayDays: "",
    childBenefitAt: "A",
    childBenefitPerson: "applicant-a",
    externalChildBenefitPerson: "",
    halfForwarded: false,
    hasOwnIncome: ownIncome > 0 || ownIncome === null ? "yes" : "no",
    incomeSources: ownIncome > 0 ? [childIncomeSource(ownIncome)] : ownIncome === null ? [childIncomeSource(0, { monthlyAverage: "" })] : [],
    eligiblePrivateInsuranceStatus: "no",
    u25RuleStageStatus: "unknown",
    decentralHotWaterStatus: { A: "no", B: "no" },
    additionalNeedStatus: "no",
    additionalNeedMonthlyAmount: "",
    ...overrides,
  };
  delete result.income;
  return result;
}

function adultIncomeSource(overrides = {}) {
  return {
    id: overrides.id || "adult-income-1",
    personRole: "applicant",
    incomeType: "employment",
    amountType: "gross",
    entryMethod: "average",
    monthlyAverage: "600",
    monthlyValues: ["", "", "", "", "", ""],
    u25SpecialAllowanceStatus: "unknown",
    parentalAllowanceType: "unknown",
    confirmedExemptionMonthly: "",
    deductions: {},
    ...overrides,
  };
}

function household(adults = "single", overrides = {}) {
  const result = {
    label: "Haushalt",
    adults,
    person1: "Elternteil",
    partner: adults === "couple" ? "Partner" : "",
    applicantIncomeSources: [],
    partnerIncomeSources: [],
    applicantExpenses: [],
    partnerExpenses: [],
    otherResidents: "0",
    housingBenefitStatus: "none",
    housingBenefit: "",
    assetsStatus: "no",
    additionalNeedOverride: "",
    hotWaterType: "central",
    decentralHotWaterAdults: { applicant: "no", partner: "no" },
    specialSituations: [],
    housingType: "rent",
    housingCosts: {
      rent: {
        coldRent: "300",
        coldUtilities: "0",
        heating: "0",
        costMonth: "2026-07",
        sublettingStatus: "no",
        sublettingAmount: "",
        parkingAmount: "",
        parkingInseparableStatus: "unknown",
      },
      owner: {},
    },
    ...overrides,
  };
  if (!Object.hasOwn(overrides, "applicantIncomeStatus")) result.applicantIncomeStatus = result.applicantIncomeSources.length ? "present" : "none";
  if (!Object.hasOwn(overrides, "partnerIncomeStatus")) result.partnerIncomeStatus = result.partnerIncomeSources.length ? "present" : "none";
  return result;
}

function state(children = [child()], options = {}) {
  return {
    dataVersion: 10,
    applicationMonth: 7,
    applicationYear: 2026,
    mode: options.mode || "single",
    centralChildren: children,
    households: {
      A: household(options.adults || "single", options.householdA || {}),
      B: household(options.adultsB || "single", options.householdB || {}),
    },
  };
}

const amounts = (need, earned, other, kiz = 1000) => calculator.calculateParentIncomeReductionAmounts(need, earned, other, kiz);
const allocation = (children, kiz, reduction) => calculator.allocateParentIncomeReduction(children, kiz, reduction);

test("1. D6-Regel-ID ist stabil", () => assert.equal(calculator.RULE_IDS.parentIncomeReduction, "KIZ-REDUCE-PARENT-001"));
test("2. D6-Minderungssätze sind stabil", () => assert.deepEqual(calculator.PARENT_INCOME_REDUCTION, { ruleId: "KIZ-REDUCE-PARENT-001", earnedIncomeRate: 0.45, otherIncomeRate: 1 }));
test("3. negativer Elternbedarf wird nicht berechnet", () => assert.equal(amounts(-1, 0, 0), null));
test("4. nicht numerisches Einkommen wird nicht berechnet", () => assert.equal(amounts(1000, Number.NaN, 0), null));

test("5. Bedarf 1000 und Erwerb 900 mindern nicht", () => assert.equal(amounts(1000, 900, 0).reductions.parentIncomeReductionBeforeCap, 0));
test("6. Bedarf 1000 und Erwerb 1000 mindern nicht", () => assert.equal(amounts(1000, 1000, 0).reductions.parentIncomeReductionBeforeCap, 0));
test("7. Bedarf 1000 und Erwerb 1200 ergeben 200 Überschuss", () => assert.equal(amounts(1000, 1200, 0).excess.earnedIncomeExcess, 200));
test("8. Bedarf 1000 und Erwerb 1200 ergeben 90 Minderung", () => assert.equal(amounts(1000, 1200, 0).reductions.earnedIncomeReduction, 90));
test("9. Erwerbsüberschuss wird nur mit 45 Prozent angesetzt", () => assert.equal(amounts(1000, 1200, 0).reductions.earnedIncomeReductionRate, 0.45));

test("10. Bedarf 1000 und anderes Einkommen 900 mindern nicht", () => assert.equal(amounts(1000, 0, 900).reductions.parentIncomeReductionBeforeCap, 0));
test("11. Bedarf 1000 und anderes Einkommen 1000 mindern nicht", () => assert.equal(amounts(1000, 0, 1000).reductions.parentIncomeReductionBeforeCap, 0));
test("12. Bedarf 1000 und anderes Einkommen 1100 ergeben 100 Überschuss", () => assert.equal(amounts(1000, 0, 1100).excess.otherIncomeExcess, 100));
test("13. anderes Einkommen mindert zu 100 Prozent", () => assert.equal(amounts(1000, 0, 1100).reductions.otherIncomeReduction, 100));
test("14. Satz für anderes Einkommen ist eins", () => assert.equal(amounts(1000, 0, 1100).reductions.otherIncomeReductionRate, 1));

test("15. Mischfall 900 anderes Einkommen lässt 100 Restbedarf", () => assert.equal(amounts(1000, 300, 900).excess.remainingNeedForEarnedIncome, 100));
test("16. Mischfall 900 plus 300 hat 200 Erwerbsüberschuss", () => assert.equal(amounts(1000, 300, 900).excess.earnedIncomeExcess, 200));
test("17. Mischfall 900 plus 300 mindert um 90", () => assert.equal(amounts(1000, 300, 900).reductions.parentIncomeReductionBeforeCap, 90));
test("18. Mischfall 1100 plus 300 hat 100 sonstigen Überschuss", () => assert.equal(amounts(1000, 300, 1100).excess.otherIncomeExcess, 100));
test("19. Mischfall 1100 plus 300 setzt den ganzen Erwerb als Überschuss an", () => assert.equal(amounts(1000, 300, 1100).excess.earnedIncomeExcess, 300));
test("20. Mischfall 1100 plus 300 mindert insgesamt 235", () => assert.equal(amounts(1000, 300, 1100).reductions.parentIncomeReductionBeforeCap, 235));
test("21. Mischfall 400 plus 500 liegt unter Bedarf", () => assert.equal(amounts(1000, 500, 400).reductions.parentIncomeReductionBeforeCap, 0));
test("22. Mischfall 400 plus 700 mindert den Erwerbsüberschuss um 45", () => assert.equal(amounts(1000, 700, 400).reductions.parentIncomeReductionBeforeCap, 45));

test("23. DA-Beispiel 1 hat 32,32 Erwerbsüberschuss", () => assert.equal(amounts(1017.68, 600, 450).excess.earnedIncomeExcess, 32.32));
test("24. DA-Beispiel 1 hält intern 14,544 Minderung", () => assert.equal(amounts(1017.68, 600, 450).reductions.earnedIncomeReduction, 14.544));
test("25. DA-Beispiel 1 wird nicht vorzeitig auf volle Euro gerundet", () => assert.notEqual(amounts(1017.68, 600, 450).reductions.earnedIncomeReduction, 15));
test("26. DA-Rentenbeispiel hat 38 sonstigen Überschuss", () => assert.equal(amounts(1412, 300, 1450).reductions.otherIncomeReduction, 38));
test("27. DA-Rentenbeispiel hat 135 Erwerbsminderung", () => assert.equal(amounts(1412, 300, 1450).reductions.earnedIncomeReduction, 135));
test("28. DA-Rentenbeispiel mindert insgesamt 173", () => assert.equal(amounts(1412, 300, 1450).reductions.parentIncomeReductionBeforeCap, 173));

test("29. kleinere Minderung wird normal vom KiZ abgezogen", () => assert.equal(amounts(1000, 1200, 0, 200).kizAfterParentIncomeBeforeAssets, 110));
test("30. Minderung exakt gleich KiZ ergibt null", () => assert.equal(amounts(1000, 1200, 0, 90).kizAfterParentIncomeBeforeAssets, 0));
test("31. Minderung oberhalb KiZ wird gedeckelt", () => assert.equal(amounts(1000, 2000, 0, 100).reductions.appliedParentIncomeReduction, 100));
test("32. Ergebnis wird niemals negativ", () => assert.equal(amounts(1000, 2000, 0, 100).kizAfterParentIncomeBeforeAssets, 0));
test("33. nicht angewandter Minderungsrest wird ausgewiesen", () => assert.equal(amounts(1000, 2000, 0, 100).reductions.unappliedExcessReduction, 350));
test("34. keine negative Null entsteht", () => assert.equal(Object.is(amounts(0, 0, 0, 0).kizAfterParentIncomeBeforeAssets, -0), false));
test("35. Dezimalbedarf erzeugt kein IEEE-Artefakt", () => assert.equal(amounts(0.1, 0.3, 0, 1).excess.earnedIncomeExcess, 0.2));

const sameRecipientChildren = [
  { childId: "c1", individualKiZAfterChildIncome: 252, recipientPersonRole: "applicant" },
  { childId: "c2", individualKiZAfterChildIncome: 297, recipientPersonRole: "applicant" },
];
const patchworkChildren = [
  { childId: "c1", individualKiZAfterChildIncome: 252, recipientPersonRole: "applicant" },
  { childId: "c2", individualKiZAfterChildIncome: 297, recipientPersonRole: "partner" },
];

test("36. gleiche Kindergeldperson benötigt keinen Split", () => assert.equal(allocation(sameRecipientChildren, 549, 45).required, false));
test("37. gleiche Kindergeldperson erhält Anteil eins", () => assert.equal(allocation(sameRecipientChildren, 549, 45).recipients[0].recipientShare, 1));
test("38. zwei Kindergeldpersonen aktivieren Patchwork", () => assert.equal(allocation(patchworkChildren, 549, 45).required, true));
test("39. Patchwork-Ausgangssummen bleiben 252 und 297", () => assert.deepEqual(allocation(patchworkChildren, 549, 45).recipients.map((x) => x.recipientPreParentKiZ), [252, 297]));
test("40. Patchwork-Anteile verwenden die exakten Verhältnisse", () => {
  const shares = allocation(patchworkChildren, 549, 45).recipients.map((x) => x.recipientShare);
  assert(Math.abs(shares[0] - 252 / 549) < 1e-13);
  assert(Math.abs(shares[1] - 297 / 549) < 1e-13);
});
test("41. Patchwork-Minderungsanteile ergeben wieder exakt 45", () => assert.equal(allocation(patchworkChildren, 549, 45).recipients.reduce((sum, x) => sum + x.recipientParentReductionShare, 0), 45));
test("42. Patchwork-Ergebnisse ergeben wieder den Haushaltswert 504", () => assert.equal(allocation(patchworkChildren, 549, 45).recipients.reduce((sum, x) => sum + x.recipientKiZAfterParentIncome, 0), 504));
test("43. Patchwork-Prozentsatz wird nicht auf zwei Stellen gerundet", () => assert.notEqual(allocation(patchworkChildren, 549, 45).recipients[0].recipientShare, 0.459));
test("44. unbekannte Kindergeldperson bei möglichem Split bleibt offen", () => assert.equal(allocation([{ ...patchworkChildren[0], recipientPersonRole: null }, patchworkChildren[1]], 549, 45).status, "UNRESOLVED"));
test("45. Haushaltssumme bleibt trotz offener Allocation separat berechenbar", () => assert.equal(amounts(1000, 1100, 0, 549).kizAfterParentIncomeBeforeAssets, 504));
test("46. Null-KiZ-Kind verursacht keine Division", () => assert.equal(allocation([...patchworkChildren, { childId: "c3", individualKiZAfterChildIncome: 0, recipientPersonRole: null }], 549, 45).status, "SUPPORTED"));
test("47. ein einziges positives Kind mit unbekannter Person benötigt keinen Split", () => assert.equal(allocation([{ childId: "c", individualKiZAfterChildIncome: 100, recipientPersonRole: null }], 100, 20).status, "NOT_APPLICABLE"));
test("48. Patchwork-Helfer verändert Kinder nicht", () => { const before = JSON.stringify(patchworkChildren); allocation(patchworkChildren, 549, 45); assert.equal(JSON.stringify(patchworkChildren), before); });

test("49. kein KiZ-BG-Kind ergibt NOT_APPLICABLE und null", () => {
  const result = calculator.evaluateParentIncomeReduction(state([child("high", { income: 600 })]), "A");
  assert.equal(result.status, "NOT_APPLICABLE");
  assert.equal(result.kizAfterParentIncomeBeforeAssets, 0);
});
test("50. ein KiZ-BG-Kind ohne Elternüberschuss bleibt unverändert", () => {
  const result = calculator.evaluateParentIncomeReduction(state(), "A");
  assert.equal(result.status, "SUPPORTED");
  assert.equal(result.children.preParentReductionKiZ, 297);
  assert.equal(result.kizAfterParentIncomeBeforeAssets, 297);
});
test("51. zwei KiZ-BG-Kinder werden zu 594 summiert", () => {
  const result = calculator.evaluateParentIncomeReduction(state([child("c1"), child("c2")]), "A");
  assert.equal(result.children.preParentReductionKiZ, 594);
});
test("52. D4-ausgeschlossenes Kind trägt null zur Ausgangssumme bei", () => {
  const result = calculator.evaluateParentIncomeReduction(state([child("included"), child("excluded", { income: 600 })]), "A");
  assert.equal(result.children.preParentReductionKiZ, 297);
  assert.deepEqual(result.children.excludedChildren.map((x) => x.childId), ["excluded"]);
  assert.equal(result.children.excludedChildren[0].contributionToPreParentReductionKiZ, 0);
});
test("53. ungelöstes D2 macht D6 unresolved", () => {
  const result = calculator.evaluateParentIncomeReduction(state([child("c", { income: null })]), "A");
  assert.equal(result.status, "UNRESOLVED");
  assert.equal(result.kizAfterParentIncomeBeforeAssets, null);
  assert(result.openChecks.includes("PARENT_REDUCTION_CHILD_D2_REQUIRED"));
});
test("54. ungelöste D4-Mitgliedschaft macht D6 unresolved", () => {
  const s = state(); s.households.A.housingCosts.rent.sublettingStatus = "unknown";
  const result = calculator.evaluateParentIncomeReduction(s, "A");
  assert.equal(result.status, "UNRESOLVED");
  assert(result.openChecks.includes("PARENT_REDUCTION_CHILD_KIZ_MEMBERSHIP_REQUIRED"));
});
test("55. ungelöster Elternbedarf macht D6 unresolved", () => {
  const s = state(); s.households.A.specialSituations = [{ id: "p", situationType: "pregnancy", personRole: "applicant", confirmationStatus: "unknown", recurringStatus: "yes", monthlyAmount: "" }];
  const result = calculator.evaluateParentIncomeReduction(s, "A");
  assert.equal(result.status, "UNRESOLVED");
  assert(result.openChecks.includes("PARENT_REDUCTION_PARENT_NEED_REQUIRED"));
});
test("56. ungelöstes preparedForParentReduction macht D6 unresolved", () => {
  const s = state(); s.households.A.applicantIncomeSources = [adultIncomeSource({ amountType: "net" })];
  const result = calculator.evaluateParentIncomeReduction(s, "A");
  assert.equal(result.status, "UNRESOLVED");
  assert(result.openChecks.includes("PARENT_REDUCTION_PREPARED_ADULT_INCOME_REQUIRED"));
});
test("57. verbleibende Prüfungen enthalten Kindes- und Elternvermögen", () => {
  const steps = calculator.evaluateParentIncomeReduction(state(), "A").remainingSteps;
  assert(steps.includes("CHILD_ASSETS_NOT_EVALUATED"));
  assert(steps.includes("PARENT_ASSETS_NOT_EVALUATED"));
});
test("58. Wohngeld, Coverage und Schlussrundung bleiben offen", () => {
  const steps = calculator.evaluateParentIncomeReduction(state(), "A").remainingSteps;
  assert(steps.includes("WOHNGELD_NOT_EVALUATED"));
  assert(steps.includes("COVERAGE_CHECK_NOT_EVALUATED"));
  assert(steps.includes("FINAL_ROUNDING_NOT_APPLIED"));
});
test("59. D6-Ergebnis heißt nicht finalKiZ", () => assert.equal(Object.hasOwn(calculator.evaluateParentIncomeReduction(state(), "A"), "finalKiZ"), false));
test("60. normaler Mehrkindfall erzeugt keinen individuellen Nach-Eltern-KiZ", () => {
  const result = calculator.evaluateParentIncomeReduction(state([child("c1"), child("c2")]), "A");
  assert.equal(result.children.kizBgChildren.some((x) => Object.hasOwn(x, "individualKiZAfterParentIncome")), false);
});
test("61. Haushalt A und B werden unabhängig berechnet", () => {
  const a = child("a");
  const b = child("b", { careSituation: "dauerhaft-b", affectedHouseholds: ["B"], childBenefitAt: "B", childBenefitPerson: "applicant-b", decentralHotWaterStatus: { A: "no", B: "no" } });
  const s = state([a, b], { mode: "compare" });
  const beforeB = calculator.evaluateParentIncomeReduction(s, "B");
  s.households.A.applicantIncomeSources = [adultIncomeSource({ monthlyAverage: "1200" })];
  const afterB = calculator.evaluateParentIncomeReduction(s, "B");
  assert.deepEqual(afterB, beforeB);
});
test("62. Elternbedarf B verändert Ergebnis A nicht", () => {
  const s = state(); const beforeA = calculator.evaluateParentIncomeReduction(s, "A");
  s.households.B.housingCosts.rent.coldRent = "900";
  assert.deepEqual(calculator.evaluateParentIncomeReduction(s, "A"), beforeA);
});
test("63. getrennte Haushalte werden nicht zu einer KiZ-Summe verbunden", () => {
  const a = child("a");
  const b = child("b", { careSituation: "dauerhaft-b", affectedHouseholds: ["B"], childBenefitAt: "B", childBenefitPerson: "applicant-b" });
  const s = state([a, b], { mode: "compare" });
  assert.equal(calculator.evaluateParentIncomeReduction(s, "A").children.preParentReductionKiZ, 297);
  assert.equal(calculator.evaluateParentIncomeReduction(s, "B").children.preParentReductionKiZ, 297);
});
test("64. D6-Auswertung verändert den State nicht", () => {
  const s = state([child("c1"), child("c2")]); const before = JSON.stringify(s);
  calculator.evaluateParentIncomeReduction(s, "A");
  assert.equal(JSON.stringify(s), before);
});
test("65. D5-bereitgestellter Kindergeldüberschuss wird als sonstiges Einkommen übernommen", () => {
  const s = state([child("included"), child("surplus", { income: 600 })]);
  assert.equal(calculator.evaluateParentIncomeReduction(s, "A").parentIncome.otherIncome, 72);
});
test("66. Kindergeldüberschuss wird genau einmal und nicht erneut addiert", () => {
  const s = state([child("included"), child("surplus", { income: 600 })]);
  const prepared = calculator.evaluateAdultIncomeForHousehold(s, "A").preparedForParentReduction;
  const result = calculator.evaluateParentIncomeReduction(s, "A");
  assert.equal(result.parentIncome.otherIncome, prepared.otherIncome);
  assert.equal(result.parentIncome.totalIncome, prepared.totalIncome);
});
test("67. hälftig weitergeleitetes Kindergeld bleibt in D5 und D6 berechenbar", () => {
  const s = state([child("included"), child("surplus", { income: 600, halfForwarded: true })]);
  const result = calculator.evaluateParentIncomeReduction(s, "A");
  assert.equal(result.status, "SUPPORTED");
  assert.equal(result.openChecks.includes("CHILD_BENEFIT_SURPLUS_WITH_FORWARDING_OPEN"), false);
});
test("68. integrierter Patchworkfall gruppiert nach childBenefitPerson", () => {
  const s = state([child("c1", { childBenefitPerson: "applicant-a" }), child("c2", { childBenefitPerson: "partner-a" })], { adults: "couple" });
  const result = calculator.evaluateParentIncomeReduction(s, "A");
  assert.equal(result.patchworkAllocation.required, true);
  assert.deepEqual(result.patchworkAllocation.recipients.map((x) => x.recipientPersonRole), ["applicant", "partner"]);
});
test("69. unbekannte Kindergeldperson lässt Haushaltsergebnis numerisch und Allocation offen", () => {
  const s = state([child("c1", { childBenefitPerson: "" }), child("c2", { childBenefitPerson: "partner-a" })], { adults: "couple" });
  const result = calculator.evaluateParentIncomeReduction(s, "A");
  assert.equal(result.status, "SUPPORTED");
  assert.equal(typeof result.kizAfterParentIncomeBeforeAssets, "number");
  assert.equal(result.patchworkAllocation.status, "UNRESOLVED");
});
test("70. D6 übernimmt die D5-Einkommensklassen unverändert", () => {
  const s = state(); s.households.A.applicantIncomeSources = [adultIncomeSource()];
  const prepared = calculator.evaluateAdultIncomeForHousehold(s, "A").preparedForParentReduction;
  assert.deepEqual(calculator.evaluateParentIncomeReduction(s, "A").parentIncome, prepared);
});
test("71. D6 übernimmt exakt parentTotalNeed aus D3", () => {
  const s = state();
  assert.equal(calculator.evaluateParentIncomeReduction(s, "A").parentNeed, calculator.evaluateParentNeedForHousehold(s, "A").parentTotalNeed);
});
test("72. Ergebnis verwendet keine Familienbedarfs-Eigenschaft", () => assert.equal(Object.hasOwn(calculator.evaluateParentIncomeReduction(state(), "A"), "familySgbIINeed"), false));

let failed = 0;
tests.forEach(({ name, run }) => {
  try {
    run();
    console.log(`OK ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`FEHLER ${name}`);
    console.error(error.stack || error.message);
  }
});
console.log(`${tests.length - failed}/${tests.length} Tests für KIZ-REDUCE-PARENT-001 (Phase D6) erfolgreich.`);
if (failed) process.exitCode = 1;
