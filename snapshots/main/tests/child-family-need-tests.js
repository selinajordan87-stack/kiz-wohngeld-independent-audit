"use strict";

const assert = require("node:assert/strict");
const calculator = require("../calculator.js");
const validation = require("../validation.js");
const parentNeedData = require("../parent-need-data.js");

const tests = [];
const test = (name, run) => tests.push({ name, run });

function incomeSource(amount, overrides = {}) {
  return {
    id: `income-${amount}`,
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

function child(age = 5, overrides = {}) {
  const ownIncome = Object.hasOwn(overrides, "income") ? overrides.income : 0;
  const result = {
    id: overrides.id || "child-1",
    name: overrides.name || "Kind",
    age: String(age),
    careSituation: "dauerhaft-a",
    maritalPartnershipStatus: "no",
    affectedHouseholds: ["A"],
    hasExternalHousehold: false,
    stayDays: "",
    childBenefitAt: "A",
    childBenefitPerson: "applicant-a",
    externalChildBenefitPerson: "",
    halfForwarded: false,
    hasOwnIncome: ownIncome > 0 ? "yes" : "no",
    incomeSources: ownIncome > 0 ? [incomeSource(ownIncome)] : [],
    eligiblePrivateInsuranceStatus: "no",
    u25RuleStageStatus: Number(age) >= 18 && Number(age) <= 24 ? "yes" : "unknown",
    decentralHotWaterStatus: { A: "no", B: "no" },
    additionalNeedStatus: "no",
    additionalNeedMonthlyAmount: "",
    ...overrides,
  };
  delete result.income;
  return result;
}

function household(adults = "single", costs = 300, overrides = {}) {
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
    additionalNeedOverride: "",
    hotWaterType: "central",
    decentralHotWaterAdults: { applicant: "no", partner: "no" },
    specialSituations: [],
    housingType: "rent",
    housingCosts: {
      rent: {
        coldRent: String(costs),
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
  const costs = options.costs ?? 300;
  return {
    dataVersion: 9,
    applicationMonth: 7,
    applicationYear: 2026,
    mode: options.mode || "single",
    centralChildren: children,
    households: {
      A: household(options.adults || "single", costs, options.householdA || {}),
      B: household(options.adultsB || "single", options.costsB ?? costs, options.householdB || {}),
    },
  };
}

const need = (s, householdId = "A", inputChild = s.centralChildren[0]) => calculator.evaluateChildSgbIINeed(s, householdId, inputChild);
const memberships = (s, householdId = "A", inputChild = s.centralChildren[0]) => calculator.evaluateChildMemberships(s, householdId, inputChild);

// 1–7 Regelbedarfe
[[5, 357], [6, 390], [13, 390], [14, 471], [17, 471], [18, 451]].forEach(([age, amount], index) => {
  test(`${index + 1}. Regelbedarf Alter ${age}`, () => assert.equal(need(state([child(age)])).ruleNeedFull, amount));
});
test("7. Alter am ersten BWZ-Tag steuert die Stufe", () => assert.equal(need(state([child(13, { dateOfBirth: "2012-01-01" })])).ageBand, "AGE_6_TO_13"));

// 8–14 temporäre BG
test("8. Dauerhafter Aufenthalt ergibt vollen Regelbedarf", () => assert.equal(need(state([child(10)])).recognizedRuleNeed, 390));
test("9. Wechselmodell ergibt halben Regelbedarf", () => {
  const c = child(10, { careSituation: "wechselmodell-50-50", affectedHouseholds: ["A", "B"] });
  assert.equal(need(state([c]), "A", c).recognizedRuleNeed, 195);
});
test("10. Wechselmodell halbiert BdU nicht", () => {
  const c = child(10, { careSituation: "wechselmodell-50-50", affectedHouseholds: ["A", "B"] });
  assert.equal(need(state([c]), "A", c).recognizedHousingNeed, 150);
});
test("11. Acht Umgangstage ergeben 104 EUR", () => {
  const c = child(10, { careSituation: "umgang-a", stayDays: "8", childBenefitAt: "B", childBenefitPerson: "applicant-b" });
  assert.equal(need(state([c]), "A", c).recognizedRuleNeed, 104);
});
test("12. Umgangstage kürzen BdU nicht", () => {
  const c = child(10, { careSituation: "umgang-a", stayDays: "8", childBenefitAt: "B", childBenefitPerson: "applicant-b" });
  assert.equal(need(state([c]), "A", c).recognizedHousingNeed, 150);
});
test("13. Fehlende Umgangstage bleiben unresolved", () => {
  const c = child(10, { careSituation: "umgang-a", stayDays: "", childBenefitAt: "B", childBenefitPerson: "applicant-b" });
  assert.equal(need(state([c]), "A", c).status, "UNRESOLVED");
});
test("14. Kindergeld im Umgangshaushalt wird nicht geraten", () => {
  const c = child(10, { careSituation: "umgang-a", stayDays: "8" });
  assert.equal(need(state([c]), "A", c).status, "UNRESOLVED");
});

// 15–23 Wohnkosten
test("15. SGB-II-Bedarf nutzt Kopfteil statt D3-Quote", () => {
  const s = state();
  assert.equal(calculator.familyHousingHeadShare(s, "A").housingHeadShare, 150);
  assert.equal(calculator.evaluateParentHousingShare(s, "A").parentHousingShareForKiZ, 231);
});
test("16. Paar und zwei Kinder ergeben vier BG-Wohnköpfe", () => {
  const s = state([child(5, { id: "a" }), child(8, { id: "b" })], { adults: "couple", costs: 800 });
  assert.equal(calculator.evaluateFamilySgbIINeed(s, "A").familyHousingHeads, 4);
});
test("17. Mitbewohner erhöht den Nenner", () => assert.equal(calculator.familyHousingHeadShare(state(undefined, { householdA: { otherResidents: "1" } }), "A").denominatorHeads, 3));
test("18. Mitbewohner-Kopf wird nicht zum Familienbedarf addiert", () => assert.equal(calculator.evaluateFamilySgbIINeed(state(undefined, { householdA: { otherResidents: "1" } }), "A").familyHousingNeedForSgbII, 200));
test("19. Wechselmodellkind erhält vollen Wohnkopf", () => {
  const c = child(10, { careSituation: "wechselmodell-50-50", affectedHouseholds: ["A", "B"] });
  assert.equal(need(state([c]), "A", c).recognizedHousingNeed, 150);
});
test("20. Umgangskind erhält vollen Wohnkopf", () => {
  const c = child(10, { careSituation: "umgang-a", stayDays: "8", childBenefitAt: "B", childBenefitPerson: "applicant-b" });
  assert.equal(need(state([c]), "A", c).recognizedHousingNeed, 150);
});
test("21. Bedarfsdeckendes Kind bleibt Nennerkopf, aber kein BG-Kopf", () => {
  const s = state([child(5, { income: 400 })]);
  const result = calculator.evaluateFamilySgbIINeed(s, "A");
  assert.equal(result.housingDenominatorHeads, 2);
  assert.equal(result.familyHousingHeads, 1);
  assert.equal(result.familyHousingNeedForSgbII, 150);
});
test("22. Untervermietung wird vor Kopfteilung abgezogen", () => {
  const s = state(undefined, { householdA: { housingCosts: { rent: { ...household().housingCosts.rent, sublettingStatus: "yes", sublettingAmount: "100" }, owner: {} } } });
  assert.equal(calculator.familyHousingHeadShare(s, "A").housingHeadShare, 100);
});
test("23. D3-Elternwohnanteil bleibt Prozenttabellenwert", () => assert.equal(calculator.evaluateParentHousingShare(state(), "A").parentHousingShareForKiZ, 231));

// 24–29 KiZ-BG und SGB-II-BG
test("24. Amtlicher Fall bleibt KiZ-BG-Mitglied", () => {
  const result = memberships(state([child(5, { income: 400 })]));
  assert.equal(result.childNeed.totalChildNeed, 507);
  assert.equal(result.bgIncome.incomeForKiZMembership, 439);
  assert.equal(result.isKizBgMember, true);
});
test("25. Amtlicher Fall verlässt SGB-II-BG", () => {
  const result = memberships(state([child(5, { income: 400 })]));
  assert.equal(result.bgIncome.incomeForSgbIIMembership, 659);
  assert.equal(result.isSgbIIBgMember, false);
});
test("26. Beide BG-Statuswerte bestehen gleichzeitig", () => assert.deepEqual({ kiz: memberships(state([child(5, { income: 400 })])).isKizBgMember, sgb: memberships(state([child(5, { income: 400 })])).isSgbIIBgMember }, { kiz: true, sgb: false }));
test("27. KiZ-bedarfdeckendes Kind erhöht D3-Kinderzahl nicht", () => assert.equal(calculator.evaluateParentHousingShare(state([child(5, { income: 600 })]), "A").relevantKiZChildCount, 0));
test("28. Nur aus SGB-II-BG ausgeschiedenes Kind bleibt KiZ-BG-Kind", () => assert.equal(calculator.evaluateParentHousingShare(state([child(5, { income: 400 })]), "A").relevantKiZChildCount, 1));
test("29. Geschwistermitgliedschaften bleiben getrennt", () => {
  const rich = child(5, { id: "rich", income: 600 });
  const poor = child(5, { id: "poor" });
  const s = state([rich, poor], { costs: 450 });
  assert.deepEqual([memberships(s, "A", rich).isKizBgMember, memberships(s, "A", poor).isKizBgMember], [false, true]);
});

// 30–35 Kindergeld
test("30. KiZ-Prüfung nutzt 45 Prozent plus Kindergeld", () => {
  const result = calculator.evaluateChildKizBgMembership(state([child(5, { income: 400 })]), "A", child(5, { income: 400 }));
  assert.equal(result.incomeForKiZMembership, 180 + 259);
});
test("31. SGB-II-Prüfung nutzt volles Einkommen plus Kindergeld", () => {
  const c = child(5, { income: 400 });
  assert.equal(calculator.evaluateChildSgbIIBgMembership(state([c]), "A", c).sgbIIChildAvailableIncome, 400 + 259);
});
test("32. Kindergeld bleibt außerhalb des Kindeseinkommensdurchschnitts", () => assert.equal(memberships(state([child(5, { income: 400 })])).bgIncome.countableChildIncomeAverage, 400));
test("33. Bestätigte hälftige Weiterleitung zählt 129,50 EUR", () => {
  const c = child(10, { income: 300, careSituation: "wechselmodell-50-50", affectedHouseholds: ["A", "B"], halfForwarded: true });
  assert.equal(memberships(state([c], { costs: 600 }), "A", c).bgIncome.childBenefitForSgbIIMembership, 129.5);
});
test("34. Ohne Weiterleitungsnachweis wird nicht halbiert", () => {
  const c = child(10, { income: 300, careSituation: "wechselmodell-50-50", affectedHouseholds: ["A", "B"] });
  assert.equal(memberships(state([c], { costs: 600 }), "A", c).bgIncome.childBenefitForSgbIIMembership, 259);
});
test("35. Fremdes Kindergeld erzeugt kein eigenes KiZ-Kind", () => {
  const c = child(10, { careSituation: "wechselmodell-50-50", affectedHouseholds: ["A", "B"], childBenefitAt: "B", childBenefitPerson: "applicant-b" });
  assert.equal(memberships(state([c]), "A", c).isKizBgMember, false);
});

// 36–43 Kindermehrbedarf
[[5, 2.86], [6, 4.68], [14, 6.59], [18, 10.37]].forEach(([age, amount], index) => {
  test(`${36 + index}. Dezentraler Warmwassermehrbedarf Alter ${age}`, () => {
    const c = child(age, { decentralHotWaterStatus: { A: "yes", B: "no" } });
    const result = need(state([c], { householdA: { hotWaterType: "decentral" } }), "A", c);
    assert.equal(result.additionalNeedPositions[0].fullMonthlyAmount, amount);
  });
});
test("40. Zentrales Warmwasser ergibt keinen Zusatz", () => assert.equal(need(state()).additionalNeedPositions[0].fullMonthlyAmount, 0));
test("41. Bestätigter laufender Mehrbedarf wird addiert", () => {
  const c = child(5, { additionalNeedStatus: "yes", additionalNeedMonthlyAmount: "50" });
  assert.equal(need(state([c]), "A", c).recognizedAdditionalNeed, 50);
});
test("42. Verneinter weiterer Mehrbedarf ist null", () => assert.equal(need(state()).recognizedAdditionalNeed, 0));
test("43. Bestätigter Mehrbedarf ohne Betrag bleibt unresolved", () => {
  const c = child(5, { additionalNeedStatus: "yes", additionalNeedMonthlyAmount: "" });
  assert.equal(need(state([c]), "A", c).status, "UNRESOLVED");
});

// 44–55 Familienbedarf
test("44. Familienbedarf enthält Erwachsenen-Regelbedarf", () => assert.equal(calculator.evaluateFamilySgbIINeed(state(), "A").adultRuleNeed, 563));
test("45. Familienbedarf enthält Erwachsenen-Mehrbedarf", () => assert.equal(calculator.evaluateFamilySgbIINeed(state(), "A").adultAdditionalNeedsTotal, 202.68));
test("46. Familienbedarf enthält Kinder-Regelbedarf", () => assert.equal(calculator.evaluateFamilySgbIINeed(state(), "A").recognizedChildRuleNeeds, 357));
test("47. Familienbedarf enthält Kinder-Mehrbedarf", () => {
  const c = child(5, { additionalNeedStatus: "yes", additionalNeedMonthlyAmount: "50" });
  assert.equal(calculator.evaluateFamilySgbIINeed(state([c]), "A").recognizedChildAdditionalNeeds, 50);
});
test("48. Familienbedarf enthält SGB-II-BdU-Kopfanteile", () => assert.equal(calculator.evaluateFamilySgbIINeed(state(), "A").familyHousingNeedForSgbII, 300));
test("49. D3-Elternwohnanteil wird nicht zusätzlich addiert", () => {
  const result = calculator.evaluateFamilySgbIINeed(state(), "A");
  assert.equal(result.familySgbIINeed, 563 + 202.68 + 357 + 300);
});
test("50. Kindergeld wird nicht vom Familienbedarf abgezogen", () => assert.equal(calculator.evaluateFamilySgbIINeed(state(), "A").familySgbIINeed, 1422.68));
test("51. Kindeseinkommen wird nicht als Abzug im Bedarf gebucht", () => {
  const result = calculator.evaluateFamilySgbIINeed(state([child(5, { income: 400 })]), "A");
  assert.equal(result.familySgbIINeed, 915.68);
});
test("52. Elterneinkommen wird nicht vom Bedarf abgezogen", () => {
  const s = state(); s.households.A.applicantIncomeSources = [{ id: "adult", incomeType: "employment", entryMethod: "average", monthlyAverage: "5000", monthlyValues: [] }];
  assert.equal(calculator.evaluateFamilySgbIINeed(s, "A").familySgbIINeed, 1422.68);
});
test("53. KiZ wird nicht vom Bedarf abgezogen", () => {
  const s = state(); s.calculatedKiz = 297;
  assert.equal(calculator.evaluateFamilySgbIINeed(s, "A").familySgbIINeed, 1422.68);
});
test("54. Zwei Haushalte werden unabhängig berechnet", () => {
  const c = child(10, { careSituation: "wechselmodell-50-50", affectedHouseholds: ["A", "B"] });
  const s = state([c], { mode: "compare", costs: 300, costsB: 600 });
  assert.notEqual(calculator.evaluateFamilySgbIINeed(s, "A").housingHeadShare, calculator.evaluateFamilySgbIINeed(s, "B").housingHeadShare);
});
test("55. D4 mutiert das Eingabeobjekt nicht", () => {
  const s = state(); const before = JSON.stringify(s); calculator.evaluateFamilySgbIINeed(s, "A"); assert.equal(JSON.stringify(s), before);
});

// Zusätzliche Vertrags-, Migrations- und Validierungstests
test("56. Vier D4-Regel-IDs sind stabil", () => assert.deepEqual(
  [calculator.RULE_IDS.childSgbIINeed, calculator.RULE_IDS.childBgIncome, calculator.RULE_IDS.childSgbIIMembership, calculator.RULE_IDS.familySgbIINeed],
  ["KIZ-CHILD-SGBII-NEED-001", "KIZ-CHILD-BG-INCOME-001", "KIZ-SGBII-BG-MEMBERSHIP-001", "KIZ-FAMILY-SGBII-NEED-001"]
));
test("57. D4-Kindmigration ergänzt unbekannte Statuswerte", () => assert.deepEqual(parentNeedData.migrateChildFamilyNeedData({ id: "old" }).decentralHotWaterStatus, { A: "unknown", B: "unknown" }));
test("58. D4-Kindmigration erhält explizite Null", () => assert.equal(parentNeedData.migrateChildFamilyNeedData({ additionalNeedStatus: "yes", additionalNeedMonthlyAmount: 0 }).additionalNeedMonthlyAmount, 0));
test("59. D4-Kindmigration mutiert Altdaten nicht", () => { const old = { id: "old", decentralHotWaterStatus: "no" }; const before = JSON.stringify(old); parentNeedData.migrateChildFamilyNeedData(old); assert.equal(JSON.stringify(old), before); });
test("60. Validierung verlangt Betrag bei bestätigtem Mehrbedarf", () => {
  const c = child(5, { additionalNeedStatus: "yes", additionalNeedMonthlyAmount: "" });
  assert.equal(validation.validateCalculatorState(state([c])).errors.some((item) => item.code === "CHILD_ADDITIONAL_NEED_AMOUNT_MISSING"), true);
});

let passed = 0;
tests.forEach(({ name, run }) => {
  try {
    run();
    passed += 1;
  } catch (error) {
    console.error(`✗ ${name}`);
    throw error;
  }
});
console.log(`✓ ${passed}/${tests.length} D4-Kinder- und Familienbedarfstests bestanden.`);
