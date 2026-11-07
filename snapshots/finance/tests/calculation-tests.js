const assert = require("node:assert/strict");
const {
  RULE_ID,
  evaluateChildRelevanceForHousehold,
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

function hasWarning(result, code) {
  return result.warnings.some((item) => item.code === code);
}

const tests = [];
function test(name, run) {
  tests.push({ name, run });
}

test("1. Kind A1: A ist KiZ-Haushalt, B nur bedarfsrelevant", () => {
  const childA1 = child({
    id: "central-child-a1",
    name: "Kind A1",
    age: "14",
    careSituation: "wechselmodell-50-50",
    affectedHouseholds: ["A", "B"],
    childBenefitAt: "A",
  });
  const resultA = evaluateChildRelevanceForHousehold(childA1, "A");
  const resultB = evaluateChildRelevanceForHousehold(childA1, "B");
  assert.equal(resultA.ruleId, RULE_ID);
  assert.equal(resultA.isRelevantForHousehold, true);
  assert.equal(resultA.isPotentialOwnKizChildForThisHousehold, true);
  assert.equal(resultA.isTemporaryOrNeedRelevantOnly, false);
  assert.equal(resultA.residenceClassification, "SHARED_50_50");
  assert.equal(resultA.dayClassification, "DAYS_13_17");
  assert.equal(resultB.isRelevantForHousehold, true);
  assert.equal(resultB.isPotentialOwnKizChildForThisHousehold, false);
  assert.equal(resultB.isTemporaryOrNeedRelevantOnly, true);
});

test("2. Kind A2: B ist KiZ-Haushalt, A nur bedarfsrelevant", () => {
  const childA2 = child({
    id: "central-child-a2",
    name: "Kind A2",
    age: "11",
    careSituation: "wechselmodell-50-50",
    affectedHouseholds: ["A", "B"],
    childBenefitAt: "B",
    childBenefitPerson: "applicant-b",
  });
  const resultA = evaluateChildRelevanceForHousehold(childA2, "A");
  const resultB = evaluateChildRelevanceForHousehold(childA2, "B");
  assert.equal(resultA.isRelevantForHousehold, true);
  assert.equal(resultA.isPotentialOwnKizChildForThisHousehold, false);
  assert.equal(resultA.isTemporaryOrNeedRelevantOnly, true);
  assert.equal(resultB.isRelevantForHousehold, true);
  assert.equal(resultB.isPotentialOwnKizChildForThisHousehold, true);
});

test("3. Kind A3: Kindergeld B wird spiegelbildlich klassifiziert", () => {
  const childA3 = child({
    id: "central-child-a3",
    name: "Kind A3",
    age: "10",
    careSituation: "wechselmodell-50-50",
    affectedHouseholds: ["A", "B"],
    childBenefitAt: "B",
    childBenefitPerson: "applicant-b",
  });
  assert.equal(evaluateChildRelevanceForHousehold(childA3, "A").isTemporaryOrNeedRelevantOnly, true);
  assert.equal(evaluateChildRelevanceForHousehold(childA3, "B").isPotentialOwnKizChildForThisHousehold, true);
});

test("4. Kind B1: dauerhaft nur in B und dort mögliches eigenes KiZ-Kind", () => {
  const childB1 = child({
    id: "central-child-b1",
    name: "Kind B1",
    age: "10",
    careSituation: "dauerhaft-b",
    affectedHouseholds: ["B"],
    childBenefitAt: "B",
    childBenefitPerson: "applicant-b",
  });
  const resultA = evaluateChildRelevanceForHousehold(childB1, "A");
  const resultB = evaluateChildRelevanceForHousehold(childB1, "B");
  assert.equal(resultA.isRelevantForHousehold, false);
  assert.equal(resultB.isRelevantForHousehold, true);
  assert.equal(resultB.isPotentialOwnKizChildForThisHousehold, true);
  assert.equal(resultB.residenceClassification, "PERMANENT_IN_HOUSEHOLD");
  assert.equal(resultB.dayClassification, "FULL_TIME");
});

test("5. Kind B2: B relevant, A nicht relevant, Kindergeld extern", () => {
  const childB2 = child({
    id: "central-child-b2",
    name: "Kind B2",
    age: "15",
    careSituation: "wechselmodell-b-external",
    affectedHouseholds: ["B"],
    hasExternalHousehold: true,
    childBenefitAt: "external",
    childBenefitPerson: "external-person",
  });
  const resultA = evaluateChildRelevanceForHousehold(childB2, "A");
  const resultB = evaluateChildRelevanceForHousehold(childB2, "B");
  assert.equal(resultA.isRelevantForHousehold, false);
  assert.equal(resultA.isPotentialOwnKizChildForThisHousehold, false);
  assert.equal(resultB.isRelevantForHousehold, true);
  assert.equal(resultB.isPotentialOwnKizChildForThisHousehold, false);
  assert.equal(resultB.isTemporaryOrNeedRelevantOnly, true);
  assert.equal(resultB.residenceClassification, "EXTERNAL_SHARED_50_50");
  assert.ok(resultB.exclusionReasons.includes("CHILD_BENEFIT_IN_EXTERNAL_HOUSEHOLD"));
});

test("6. unbekannter Kindergeldbezug verhindert sichere KiZ-Kind-Zuordnung", () => {
  const unknownBenefit = child({ childBenefitAt: "unknown", childBenefitPerson: "" });
  const result = evaluateChildRelevanceForHousehold(unknownBenefit, "A");
  assert.equal(result.isRelevantForHousehold, true);
  assert.equal(result.isPotentialOwnKizChildForThisHousehold, false);
  assert.equal(result.isTemporaryOrNeedRelevantOnly, false);
  assert.equal(hasWarning(result, "CHILD_BENEFIT_LOCATION_UNKNOWN"), true);
});

test("7. Alter 25 oder älter schließt mögliche eigene KiZ-Kind-Eigenschaft aus", () => {
  const adultChild = child({ age: "25" });
  const result = evaluateChildRelevanceForHousehold(adultChild, "A");
  assert.equal(result.isRelevantForHousehold, true);
  assert.equal(result.isPotentialOwnKizChildForThisHousehold, false);
  assert.ok(result.exclusionReasons.includes("AGE_25_OR_OLDER"));
});

test("8. Umgangsmodell im Nicht-Kindergeldhaushalt ist nur bedarfsrelevant", () => {
  const contactChild = child({
    careSituation: "umgang-a",
    affectedHouseholds: ["A"],
    stayDays: "8",
    childBenefitAt: "B",
    childBenefitPerson: "applicant-b",
  });
  const result = evaluateChildRelevanceForHousehold(contactChild, "A");
  assert.equal(result.isRelevantForHousehold, true);
  assert.equal(result.isPotentialOwnKizChildForThisHousehold, false);
  assert.equal(result.isTemporaryOrNeedRelevantOnly, true);
  assert.equal(result.residenceClassification, "CONTACT_1_12");
  assert.equal(result.dayClassification, "DAYS_1_12");
});

test("9. überwiegender Aufenthalt A ist nicht automatisch B zugeordnet", () => {
  const predominantChild = child({
    careSituation: "ueberwiegend-a",
    affectedHouseholds: ["A"],
  });
  const resultA = evaluateChildRelevanceForHousehold(predominantChild, "A");
  const resultB = evaluateChildRelevanceForHousehold(predominantChild, "B");
  assert.equal(resultA.isRelevantForHousehold, true);
  assert.equal(resultA.residenceClassification, "PREDOMINANT_IN_HOUSEHOLD");
  assert.equal(resultA.dayClassification, "DAYS_18_PLUS");
  assert.equal(resultB.isRelevantForHousehold, false);
});

test("10. Auswertung verändert das Kindobjekt nicht", () => {
  const original = child({
    careSituation: "wechselmodell-50-50",
    affectedHouseholds: ["A", "B"],
    childBenefitAt: "A",
  });
  const before = JSON.stringify(original);
  evaluateChildRelevanceForHousehold(original, "A");
  evaluateChildRelevanceForHousehold(original, "B");
  assert.equal(JSON.stringify(original), before);
});

test("11. verbleibende Familienstatusdaten werden als offene Prüfung markiert", () => {
  const result = evaluateChildRelevanceForHousehold(child(), "A");
  assert.equal(hasWarning(result, "CHILD_REMAINING_FAMILY_STATUS_NOT_CAPTURED"), true);
  assert.equal(result.openChecks.includes("CHILD_MARITAL_PARTNERSHIP_STATUS_REVIEW_REQUIRED"), false);
  assert.ok(result.openChecks.includes("CHILD_OWN_CHILD_STATUS_NOT_CAPTURED"));
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

console.log(`${passed}/${tests.length} Tests für ${RULE_ID} erfolgreich.`);
