const assert = require("node:assert/strict");
const {
  RULE_IDS,
  getRelevantHouseholds,
  evaluateChildBenefitAssignment,
  evaluateChildRelevanceForHousehold,
  evaluateChildNeedClassification,
} = require("../calculation-rules.js");

function child(overrides = {}) {
  return {
    id: "central-test",
    name: "Testkind",
    age: "10",
    careSituation: "dauerhaft-a",
    maritalPartnershipStatus: "no",
    affectedHouseholds: ["A"],
    hasExternalHousehold: false,
    stayDays: "",
    childBenefitAt: "A",
    childBenefitPerson: "applicant-a",
    externalChildBenefitPerson: "",
    halfForwarded: false,
    hasOwnIncome: "no",
    incomeSources: [],
    ...overrides,
  };
}

function state(children = [], overrides = {}) {
  return {
    mode: "compare",
    centralChildren: children,
    households: {
      A: { adults: "single" },
      B: { adults: "single" },
    },
    ...overrides,
  };
}

function hasWarning(result, code) {
  return result.warnings.some((item) => item.code === code);
}

const tests = [];
function test(name, run) {
  tests.push({ name, run });
}

test("1. KIZ-HH-001: Einzelmodus umfasst nur A", () => {
  assert.deepEqual(getRelevantHouseholds({ mode: "single" }), ["A"]);
});

test("2. KIZ-HH-001: Vergleichsmodus umfasst A und B", () => {
  assert.deepEqual(getRelevantHouseholds({ mode: "compare" }), ["A", "B"]);
});

test("3. KIZ-HH-001: ungültiger Modus bleibt ohne positive Zuordnung und unverändert", () => {
  const input = { mode: "invalid", households: { B: { label: "B" } } };
  const before = JSON.stringify(input);
  assert.deepEqual(getRelevantHouseholds(input), []);
  assert.equal(JSON.stringify(input), before);
});

test("4. KIZ-KG-001: Kindergeld A ordnet nur A positiv zu", () => {
  const input = child();
  assert.equal(evaluateChildBenefitAssignment(input, "A").isOwnKizPossibleByChildBenefit, true);
  assert.equal(evaluateChildBenefitAssignment(input, "B").isOwnKizPossibleByChildBenefit, false);
});

test("5. KIZ-KG-001: Kindergeld B wird spiegelbildlich zugeordnet", () => {
  const input = child({ childBenefitAt: "B", childBenefitPerson: "applicant-b" });
  assert.equal(evaluateChildBenefitAssignment(input, "A").isOwnKizPossibleByChildBenefit, false);
  assert.equal(evaluateChildBenefitAssignment(input, "B").isOwnKizPossibleByChildBenefit, true);
});

test("6. KIZ-KG-001: externer Bezug ordnet weder A noch B positiv zu", () => {
  const input = child({ childBenefitAt: "external", childBenefitPerson: "external-person" });
  assert.equal(evaluateChildBenefitAssignment(input, "A").isOwnKizPossibleByChildBenefit, false);
  assert.equal(evaluateChildBenefitAssignment(input, "B").isOwnKizPossibleByChildBenefit, false);
});

test("7. KIZ-KG-001: unbekannter Bezug erzeugt Warnung", () => {
  const result = evaluateChildBenefitAssignment(child({ childBenefitAt: "unknown", childBenefitPerson: "" }), "A");
  assert.equal(hasWarning(result, "CHILD_BENEFIT_LOCATION_UNKNOWN"), true);
});

test("8. KIZ-KG-001: nachgewiesene hälftige Weiterleitung ergibt Faktor 0,5", () => {
  assert.equal(evaluateChildBenefitAssignment(child({ careSituation: "wechselmodell-50-50", halfForwarded: true }), "A").childBenefitSgbCheckFactor, 0.5);
});

test("9. KIZ-KG-001: ohne Weiterleitung bleibt Faktor 1", () => {
  assert.equal(evaluateChildBenefitAssignment(child(), "A").childBenefitSgbCheckFactor, 1);
});

test("10. KIZ-WM-001: Kind A1 ist in A eigenes KiZ-Kind und in B nur bedarfsrelevant", () => {
  const childA1 = child({ id: "child-a1", careSituation: "wechselmodell-50-50", affectedHouseholds: ["A", "B"] });
  const inputState = state([childA1]);
  assert.equal(evaluateChildNeedClassification(childA1, "A", inputState).isPotentialOwnKizChild, true);
  assert.equal(evaluateChildNeedClassification(childA1, "B", inputState).isTemporaryBgMember, true);
});

test("11. KIZ-WM-001: Kind A2 ist in B eigenes KiZ-Kind und in A nur bedarfsrelevant", () => {
  const childA2 = child({ id: "child-a2", careSituation: "wechselmodell-50-50", affectedHouseholds: ["A", "B"], childBenefitAt: "B", childBenefitPerson: "applicant-b" });
  const inputState = state([childA2]);
  assert.equal(evaluateChildNeedClassification(childA2, "B", inputState).isPotentialOwnKizChild, true);
  assert.equal(evaluateChildNeedClassification(childA2, "A", inputState).isTemporaryBgMember, true);
});

test("12. KIZ-WM-001: 13-bis-17-Tage-Faktoren sind 0,5 / 0,5 / 1", () => {
  const wm = child({ careSituation: "wechselmodell-50-50", affectedHouseholds: ["A", "B"] });
  const result = evaluateChildNeedClassification(wm, "A", state([wm]));
  assert.equal(result.ruleId, RULE_IDS.sharedCare);
  assert.deepEqual([result.regularNeedFactor, result.childAdditionalNeedFactor, result.housingNeedFactor], [0.5, 0.5, 1]);
  assert.equal(result.dayClassification, "DAYS_13_17");
});

test("13. KIZ-WM-001: Nicht-Kindergeldhaushalt erhält Faktoren, aber kein eigenes KiZ", () => {
  const wm = child({ careSituation: "wechselmodell-50-50", affectedHouseholds: ["A", "B"] });
  const result = evaluateChildNeedClassification(wm, "B", state([wm]));
  assert.equal(result.isPotentialOwnKizChild, false);
  assert.equal(result.regularNeedFactor, 0.5);
  assert.equal(result.housingNeedFactor, 1);
});

test("14. KIZ-WM-001: allein mit Wechselmodell-Kind ergibt HALF", () => {
  const wm = child({ careSituation: "wechselmodell-50-50", affectedHouseholds: ["A", "B"] });
  assert.equal(evaluateChildNeedClassification(wm, "A", state([wm])).singleParentAdditionalNeedMode, "HALF");
});

test("15. KIZ-WM-001: dauerhaftes Kind plus Wechselmodell-Kind ergibt AVERAGE_REQUIRED", () => {
  const wm = child({ id: "wm", careSituation: "wechselmodell-50-50", affectedHouseholds: ["A", "B"] });
  const permanent = child({ id: "permanent" });
  assert.equal(evaluateChildNeedClassification(wm, "A", state([wm, permanent])).singleParentAdditionalNeedMode, "AVERAGE_REQUIRED");
});

test("16. KIZ-WM-EXT-001: Kind B2 ist nur in B mit 0,5 / 0,5 / 1 relevant", () => {
  const childB2 = child({ id: "child-b2", careSituation: "wechselmodell-b-external", affectedHouseholds: ["B"], hasExternalHousehold: true, childBenefitAt: "external", childBenefitPerson: "external-person" });
  const inputState = state([childB2]);
  const resultA = evaluateChildNeedClassification(childB2, "A", inputState);
  const resultB = evaluateChildNeedClassification(childB2, "B", inputState);
  assert.equal(resultA.isRelevantForHousehold, false);
  assert.equal(resultB.ruleId, RULE_IDS.externalSharedCare);
  assert.equal(resultB.isPotentialOwnKizChild, false);
  assert.deepEqual([resultB.regularNeedFactor, resultB.childAdditionalNeedFactor, resultB.housingNeedFactor], [0.5, 0.5, 1]);
});

test("17. KIZ-RESIDENCE-001: Kind B1 ist nur in B relevant", () => {
  const childB1 = child({ careSituation: "dauerhaft-b", affectedHouseholds: ["B"], childBenefitAt: "B", childBenefitPerson: "applicant-b" });
  const inputState = state([childB1]);
  assert.equal(evaluateChildNeedClassification(childB1, "A", inputState).isRelevantForHousehold, false);
  assert.equal(evaluateChildNeedClassification(childB1, "B", inputState).isRelevantForHousehold, true);
});

test("18. KIZ-RESIDENCE-001: überwiegend A mit Kindergeld A ergibt volle Faktoren", () => {
  const predominant = child({ careSituation: "ueberwiegend-a" });
  const result = evaluateChildNeedClassification(predominant, "A", state([predominant]));
  assert.deepEqual([result.regularNeedFactor, result.childAdditionalNeedFactor, result.housingNeedFactor], [1, 1, 1]);
  assert.equal(result.dayClassification, "DAYS_18_PLUS");
});

test("19. KIZ-RESIDENCE-001: überwiegend A mit Kindergeld B bleibt offen", () => {
  const predominant = child({ careSituation: "ueberwiegend-a", childBenefitAt: "B", childBenefitPerson: "applicant-b" });
  const result = evaluateChildNeedClassification(predominant, "A", state([predominant]));
  assert.equal(result.regularNeedFactor, null);
  assert.equal(hasWarning(result, "PREDOMINANT_RESIDENCE_CHILD_BENEFIT_MISMATCH"), true);
  assert.ok(result.openChecks.includes("PREDOMINANT_RESIDENCE_CHILD_BENEFIT_MISMATCH"));
});

[1, 8, 12].forEach((days, index) => {
  test(`${20 + index}. KIZ-CONTACT-001: ${days} Aufenthaltstag(e) ergibt ${days}/30`, () => {
    const contact = child({ careSituation: "umgang-a", stayDays: String(days), childBenefitAt: "B", childBenefitPerson: "applicant-b" });
    const result = evaluateChildNeedClassification(contact, "A", state([contact]));
    assert.equal(result.regularNeedFactor, days / 30);
    assert.equal(result.childAdditionalNeedFactor, days / 30);
  });
});

test("23. KIZ-CONTACT-001: Unterkunft bleibt vollständig", () => {
  const contact = child({ careSituation: "umgang-a", stayDays: "8", childBenefitAt: "B", childBenefitPerson: "applicant-b" });
  assert.equal(evaluateChildNeedClassification(contact, "A", state([contact])).housingNeedFactor, 1);
});

test("24. KIZ-CONTACT-001: Umgangskind allein ergibt keinen Alleinerziehenden-Mehrbedarf", () => {
  const contact = child({ careSituation: "umgang-a", stayDays: "8", childBenefitAt: "B", childBenefitPerson: "applicant-b" });
  assert.equal(evaluateChildNeedClassification(contact, "A", state([contact])).singleParentAdditionalNeedMode, "NONE");
});

test("25. Familienstand no erzeugt keinen entsprechenden Ausschluss", () => {
  const result = evaluateChildRelevanceForHousehold(child(), "A");
  assert.equal(result.exclusionReasons.includes("CHILD_MARRIED_OR_PARTNERED"), false);
});

test("26. Familienstand yes verhindert mögliches eigenes KiZ-Kind", () => {
  const result = evaluateChildRelevanceForHousehold(child({ maritalPartnershipStatus: "yes" }), "A");
  assert.equal(result.isPotentialOwnKizChildForThisHousehold, false);
  assert.ok(result.exclusionReasons.includes("CHILD_MARRIED_OR_PARTNERED"));
});

test("27. Familienstand unknown erzeugt Warnung und offenen Prüfpunkt", () => {
  const result = evaluateChildRelevanceForHousehold(child({ maritalPartnershipStatus: "unknown" }), "A");
  assert.equal(hasWarning(result, "CHILD_MARITAL_PARTNERSHIP_STATUS_UNKNOWN"), true);
  assert.ok(result.openChecks.includes("CHILD_MARITAL_PARTNERSHIP_STATUS_REVIEW_REQUIRED"));
});

test("28. altes Kind ohne Familienstand wird defensiv wie unknown behandelt", () => {
  const legacy = child();
  delete legacy.maritalPartnershipStatus;
  const result = evaluateChildRelevanceForHousehold(legacy, "A");
  assert.equal(hasWarning(result, "CHILD_MARITAL_PARTNERSHIP_STATUS_UNKNOWN"), true);
  assert.equal(result.isPotentialOwnKizChildForThisHousehold, false);
});

test("29. Fachfunktionen verändern Kind und State nicht", () => {
  const inputChild = child({ careSituation: "wechselmodell-50-50", affectedHouseholds: ["A", "B"] });
  const inputState = state([inputChild]);
  const beforeChild = JSON.stringify(inputChild);
  const beforeState = JSON.stringify(inputState);
  evaluateChildBenefitAssignment(inputChild, "A", inputState);
  evaluateChildNeedClassification(inputChild, "A", inputState);
  getRelevantHouseholds(inputState);
  assert.equal(JSON.stringify(inputChild), beforeChild);
  assert.equal(JSON.stringify(inputState), beforeState);
});

let passed = 0;
tests.forEach(({ name, run }) => {
  try {
    run();
    passed += 1;
    console.log(`OK ${name}`);
  } catch (error) {
    console.error(`FEHLER ${name}`);
    throw error;
  }
});

console.log(`${passed}/${tests.length} Tests für strukturelle Haushalts-, Kindergeld- und Bedarfsregeln erfolgreich.`);

