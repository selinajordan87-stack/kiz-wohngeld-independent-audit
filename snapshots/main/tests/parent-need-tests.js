"use strict";

const assert = require("assert");
const calculator = require("../calculator.js");
const validation = require("../validation.js");
const parentNeedData = require("../parent-need-data.js");

const tests = [];
const test = (name, run) => tests.push({ name, run });
let nextSpecialTestId = 1;

function household(adults = "single", overrides = {}) {
  return {
    adults,
    otherResidents: "0",
    additionalNeedOverride: "",
    hotWaterType: "central",
    decentralHotWaterAdults: { applicant: "no", partner: "no" },
    specialSituations: [],
    housingType: "rent",
    housingCosts: {
      rent: {
        coldRent: "500",
        coldUtilities: "100",
        heating: "100",
        costMonth: "2026-07",
        sublettingStatus: "no",
        sublettingAmount: "",
        parkingAmount: "",
        parkingInseparableStatus: "unknown",
      },
      owner: {
        costPeriodStatus: "previous-calendar-year",
        costYear: "2025",
        debtInterest: "300",
        debtInterestFrequency: "monthly",
        propertyTax: "600",
        propertyTaxFrequency: "yearly",
        buildingInsurance: "300",
        buildingInsuranceFrequency: "yearly",
        heating: "100",
        heatingFrequency: "monthly",
        otherCostsDescription: "",
        otherCostsAmount: "",
        otherCostsFrequency: "yearly",
        recentMonthlyValues: Array(12).fill(""),
      },
    },
    ...overrides,
  };
}

function child(id, age, householdId = "A", overrides = {}) {
  return {
    id,
    name: id,
    age: String(age),
    careSituation: `dauerhaft-${householdId.toLowerCase()}`,
    affectedHouseholds: [householdId],
    hasExternalHousehold: false,
    stayDays: "",
    childBenefitAt: householdId,
    childBenefitPerson: `applicant-${householdId.toLowerCase()}`,
    maritalPartnershipStatus: "no",
    halfForwarded: false,
    u25RuleStageStatus: "unknown",
    decentralHotWaterStatus: { A: "no", B: "no" },
    additionalNeedStatus: "no",
    additionalNeedMonthlyAmount: "",
    hasOwnIncome: "no",
    incomeSources: [],
    ...overrides,
  };
}

function state(adults = "single", children = [child("c1", 8)], householdOverrides = {}) {
  return {
    dataVersion: 9,
    applicationMonth: 7,
    applicationYear: 2026,
    mode: "single",
    centralChildren: children,
    households: { A: household(adults, householdOverrides), B: household() },
  };
}

function special(type, overrides = {}) {
  return {
    id: `s-${type}-${nextSpecialTestId++}`,
    situationType: type,
    personRole: "applicant",
    confirmationStatus: "yes",
    recurringStatus: "unknown",
    monthlyAmount: "",
    description: "",
    ...overrides,
  };
}

test("Regelbedarf alleinstehend 563 EUR", () => assert.strictEqual(calculator.evaluateParentNeedForHousehold(state(), "A").parentRuleNeed, 563));
test("Regelbedarf Paar 1.012 EUR", () => assert.strictEqual(calculator.evaluateParentNeedForHousehold(state("couple"), "A").parentRuleNeed, 1012));
test("Paar enthält zwei Regelbedarfspositionen", () => assert.strictEqual(calculator.evaluateParentNeedForHousehold(state("couple"), "A").parentRuleNeedPositions.length, 2));
test("Regelbedarfsposition Paar beträgt je 506 EUR", () => assert.deepStrictEqual(calculator.evaluateParentNeedForHousehold(state("couple"), "A").parentRuleNeedPositions.map((x) => x.amount), [506, 506]));

const singleTable = [77, 63, 53, 46, 40, 36, 33, 30, 27, 25];
const coupleTable = [83, 71, 62, 55, 50, 45, 41, 38, 35, 33];
singleTable.forEach((percentage, index) => test(`Alleinerziehenden-Wohnanteil Tabelle ${index + 1}`, () => {
  const children = Array.from({ length: index + 1 }, (_, i) => child(`s${i}`, 17));
  assert.strictEqual(calculator.evaluateParentHousingShare(state("single", children), "A").percentage, percentage);
}));
coupleTable.forEach((percentage, index) => test(`Paar-Wohnanteil Tabelle ${index + 1}`, () => {
  const children = Array.from({ length: index + 1 }, (_, i) => child(`p${i}`, 17));
  assert.strictEqual(calculator.evaluateParentHousingShare(state("couple", children), "A").percentage, percentage);
}));

test("Amtliches Wohnkostenbeispiel 800 × 71 = 568", () => {
  const s = state("couple", [child("a", 8), child("b", 9)], { housingCosts: { rent: { ...household().housingCosts.rent, coldRent: "600", coldUtilities: "100", heating: "100" }, owner: household().housingCosts.owner } });
  assert.strictEqual(calculator.evaluateParentHousingShare(s, "A").parentHousingShareForKiZ, 568);
});
test("Wechselmodellkind mit Kindergeld hier zählt als ein Kind", () => {
  const c = child("wm", 6, "A", { careSituation: "wechselmodell-50-50", affectedHouseholds: ["A", "B"] });
  assert.strictEqual(calculator.evaluateParentHousingShare(state("single", [c]), "A").ownKizChildrenCount, 1);
});
test("Temporäres Kind mit fremdem Kindergeld zählt nicht für Tabelle", () => {
  const c = child("wm", 6, "A", { careSituation: "wechselmodell-50-50", affectedHouseholds: ["A", "B"], childBenefitAt: "B" });
  assert.strictEqual(calculator.evaluateParentHousingShare(state("single", [c]), "A").status, "NOT_APPLICABLE");
});
test("Kein eigenes KiZ-Kind ist NOT_APPLICABLE", () => assert.strictEqual(calculator.evaluateParentNeedForHousehold(state("single", []), "A").status, "NOT_APPLICABLE"));
test("Mehr als zehn Kinder bleibt offen", () => {
  const children = Array.from({ length: 11 }, (_, i) => child(`c${i}`, 17));
  assert.strictEqual(calculator.evaluateParentHousingShare(state("single", children), "A").status, "UNRESOLVED");
});

test("Ein Kind unter sieben ergibt 36 Prozent", () => assert.strictEqual(calculator.evaluateParentAdditionalNeeds(state("single", [child("c", 6)]), "A").items[0].percentage, 36));
test("Zwei Kinder unter sechzehn ergeben 36 Prozent", () => assert.strictEqual(calculator.evaluateParentAdditionalNeeds(state("single", [child("a", 10), child("b", 15)]), "A").items[0].percentage, 36));
test("Drei Kinder unter sechzehn ergeben 36 Prozent", () => assert.strictEqual(calculator.evaluateParentAdditionalNeeds(state("single", [child("a", 10), child("b", 14), child("c", 15)]), "A").items[0].percentage, 36));
test("Vier Minderjährige ergeben 48 Prozent", () => assert.strictEqual(calculator.evaluateParentAdditionalNeeds(state("single", [1, 2, 3, 4].map((i) => child(`c${i}`, 17))), "A").items[0].percentage, 48));
test("Fünf Minderjährige ergeben 60 Prozent", () => assert.strictEqual(calculator.evaluateParentAdditionalNeeds(state("single", [1, 2, 3, 4, 5].map((i) => child(`c${i}`, 17))), "A").items[0].percentage, 60));
test("Sechs Minderjährige bleiben bei 60 Prozent", () => assert.strictEqual(calculator.evaluateParentAdditionalNeeds(state("single", [1, 2, 3, 4, 5, 6].map((i) => child(`c${i}`, 17))), "A").items[0].percentage, 60));
test("Ein zehnjähriges Kind ergibt 12 Prozent", () => assert.strictEqual(calculator.evaluateParentAdditionalNeeds(state("single", [child("c", 10)]), "A").items[0].percentage, 12));
test("Ein sechsjähriges reines Wechselmodellkind ergibt 18 Prozent", () => {
  const c = child("wm", 6, "A", { careSituation: "wechselmodell-50-50", affectedHouseholds: ["A", "B"] });
  assert.strictEqual(calculator.evaluateParentAdditionalNeeds(state("single", [c]), "A").items[0].percentage, 18);
});
test("Amtliches Mischbeispiel ergibt 42 Prozent", () => {
  const children = [
    child("p1", 15),
    child("p2", 15),
    child("wm1", 15, "A", { careSituation: "wechselmodell-50-50", affectedHouseholds: ["A", "B"] }),
    child("wm2", 15, "A", { careSituation: "wechselmodell-50-50", affectedHouseholds: ["A", "B"] }),
  ];
  assert.strictEqual(calculator.evaluateParentAdditionalNeeds(state("single", children), "A").items[0].percentage, 42);
});
test("Umgangskind 1 bis 12 Tage ergibt keinen Alleinerziehendenmehrbedarf", () => {
  const c = child("u", 6, "A", { careSituation: "umgang-a", stayDays: "8", childBenefitAt: "B" });
  assert.strictEqual(calculator.evaluateParentAdditionalNeeds(state("single", [c]), "A").items[0].percentage, 0);
});
test("Externes Wechselmodell ohne Kindergeld hier halbiert trotzdem", () => {
  const c = child("e", 6, "A", { careSituation: "wechselmodell-a-external", affectedHouseholds: ["A"], hasExternalHousehold: true, childBenefitAt: "external" });
  assert.strictEqual(calculator.evaluateParentAdditionalNeeds(state("single", [c]), "A").items[0].percentage, 18);
});
test("Positiver manueller Alleinerziehendenwert ersetzt Automatik", () => assert.strictEqual(calculator.evaluateParentAdditionalNeeds(state("single", [child("c", 6)], { additionalNeedOverride: "123.45" }), "A").items[0].rawAmount, 123.45));

test("Bestätigte Schwangerschaft ab Woche 13 ergibt 17 Prozent", () => assert.strictEqual(calculator.evaluateParentAdditionalNeeds(state("single", [child("c", 17)], { specialSituations: [special("pregnancy")] }), "A").items.find((x) => x.type === "pregnancy").rawAmount, 95.71));
test("Nicht bestätigte Schwangerschaft ergibt null Mehrbedarf", () => assert.strictEqual(calculator.evaluateParentAdditionalNeeds(state("single", [child("c", 17)], { specialSituations: [special("pregnancy", { confirmationStatus: "no" })] }), "A").items.find((x) => x.type === "pregnancy").recognizedAmount, 0));
test("Ungeklärte Schwangerschaft blockiert", () => assert.strictEqual(calculator.evaluateParentAdditionalNeeds(state("single", [child("c", 17)], { specialSituations: [special("pregnancy", { confirmationStatus: "unknown" })] }), "A").status, "UNRESOLVED"));
test("Bestätigte qualifizierende Teilhabe ergibt 35 Prozent", () => assert.strictEqual(calculator.evaluateParentAdditionalNeeds(state("single", [child("c", 17)], { specialSituations: [special("disability")] }), "A").items.find((x) => x.type === "disability").rawAmount, 197.05));
test("Behinderung ohne bestätigte Voraussetzung ergibt null", () => assert.strictEqual(calculator.evaluateParentAdditionalNeeds(state("single", [child("c", 17)], { specialSituations: [special("disability", { confirmationStatus: "no" })] }), "A").items.find((x) => x.type === "disability").recognizedAmount, 0));
test("Ernährungsmehrbedarf nutzt bestätigten Betrag", () => assert.strictEqual(calculator.evaluateParentAdditionalNeeds(state("single", [child("c", 17)], { specialSituations: [special("nutrition", { monthlyAmount: "88.80" })] }), "A").items.find((x) => x.type === "nutrition").rawAmount, 88.8));
test("Ernährungsmehrbedarf ohne Betrag bleibt offen", () => assert.strictEqual(calculator.evaluateParentAdditionalNeeds(state("single", [child("c", 17)], { specialSituations: [special("nutrition")] }), "A").status, "UNRESOLVED"));
test("Laufender unabweisbarer Bedarf wird angesetzt", () => assert.strictEqual(calculator.evaluateParentAdditionalNeeds(state("single", [child("c", 17)], { specialSituations: [special("unavoidable", { recurringStatus: "yes", monthlyAmount: "75" })] }), "A").items.find((x) => x.type === "unavoidable").recognizedAmount, 75));
test("Einmaliger besonderer Bedarf wird ausgeschlossen", () => assert.strictEqual(calculator.evaluateParentAdditionalNeeds(state("single", [child("c", 17)], { specialSituations: [special("unavoidable", { recurringStatus: "no", monthlyAmount: "75" })] }), "A").items.find((x) => x.type === "unavoidable").recognizedAmount, 0));
test("Ungeklärter laufender Status bleibt offen", () => assert.strictEqual(calculator.evaluateParentAdditionalNeeds(state("single", [child("c", 17)], { specialSituations: [special("unavoidable", { monthlyAmount: "75" })] }), "A").status, "UNRESOLVED"));
test("Zentrales Warmwasser ergibt null Mehrbedarf", () => assert.strictEqual(calculator.evaluateParentAdditionalNeeds(state(), "A").items.find((x) => x.type === "decentral-hot-water").recognizedAmount, 0));
test("Dezentrales Warmwasser allein ergibt 2,3 Prozent", () => assert.strictEqual(calculator.evaluateParentAdditionalNeeds(state("single", [child("c", 17)], { hotWaterType: "decentral", decentralHotWaterAdults: { applicant: "yes", partner: "no" } }), "A").items.find((x) => x.type === "decentral-hot-water").rawAmount, 12.95));
test("Dezentrales Warmwasser wird im Paar je betroffener Person berechnet", () => assert.strictEqual(calculator.evaluateParentAdditionalNeeds(state("couple", [child("c", 17)], { hotWaterType: "decentral", decentralHotWaterAdults: { applicant: "yes", partner: "no" } }), "A").items.filter((x) => x.type === "decentral-hot-water").reduce((sum, x) => sum + x.recognizedAmount, 0), 11.64));
test("Gemischtes Warmwasser bleibt offen", () => assert.strictEqual(calculator.evaluateParentAdditionalNeeds(state("single", [child("c", 17)], { hotWaterType: "mixed" }), "A").status, "UNRESOLVED"));
test("Absätze 2 bis 5 werden pro Person auf Regelbedarf gedeckelt", () => {
  const situations = [special("pregnancy"), special("disability"), special("nutrition", { monthlyAmount: "500" })];
  const result = calculator.evaluateParentAdditionalNeeds(state("single", [1, 2, 3, 4, 5].map((i) => child(`c${i}`, 17)), { specialSituations: situations }), "A");
  assert.strictEqual(result.parentAdditionalNeedsTotal, 563);
});
test("§21 Absatz 6 bleibt außerhalb des Deckels", () => {
  const situations = [special("nutrition", { monthlyAmount: "563" }), special("unavoidable", { recurringStatus: "yes", monthlyAmount: "100" })];
  assert.strictEqual(calculator.evaluateParentAdditionalNeeds(state("single", [child("c", 17)], { specialSituations: situations }), "A").parentAdditionalNeedsTotal, 663);
});
test("§21 Absatz 7 bleibt außerhalb des Deckels", () => {
  const situations = [special("nutrition", { monthlyAmount: "563" })];
  assert.strictEqual(calculator.evaluateParentAdditionalNeeds(state("single", [child("c", 17)], { specialSituations: situations, hotWaterType: "decentral", decentralHotWaterAdults: { applicant: "yes", partner: "no" } }), "A").parentAdditionalNeedsTotal, 575.95);
});
test("Doppelte Schwangerschaft derselben Person bleibt offen", () => assert.strictEqual(calculator.evaluateParentAdditionalNeeds(state("single", [child("c", 17)], { specialSituations: [special("pregnancy"), special("pregnancy")] }), "A").status, "UNRESOLVED"));

test("Mietkosten ergeben Kaltmiete plus Neben- plus Heizkosten", () => assert.strictEqual(calculator.evaluateHousingRecognition(state(), "A").recognizedHousingCosts, 700));
test("Es wird kein Sechsmonatsdurchschnitt für Miete gebildet", () => assert.strictEqual(calculator.evaluateHousingRecognition(state(), "A").actualHousingCosts, 700));
test("Untervermietung mindert Wohnkosten direkt", () => assert.strictEqual(calculator.evaluateHousingRecognition(state("single", [child("c", 8)], { housingCosts: { rent: { ...household().housingCosts.rent, sublettingStatus: "yes", sublettingAmount: "100" }, owner: household().housingCosts.owner } }), "A").recognizedHousingCosts, 600));
test("Untervermietung erscheint als direkte Wohnkostenminderung", () => assert.strictEqual(calculator.evaluateHousingRecognition(state("single", [child("c", 8)], { housingCosts: { rent: { ...household().housingCosts.rent, sublettingStatus: "yes", sublettingAmount: "100" }, owner: household().housingCosts.owner } }), "A").directHousingCostReduction, 100));
test("Untrennbarer Stellplatz wird anerkannt", () => assert.strictEqual(calculator.evaluateHousingRecognition(state("single", [child("c", 8)], { housingCosts: { rent: { ...household().housingCosts.rent, parkingAmount: "50", parkingInseparableStatus: "yes" }, owner: household().housingCosts.owner } }), "A").recognizedHousingCosts, 750));
test("Trennbarer Stellplatz wird nicht anerkannt", () => assert.strictEqual(calculator.evaluateHousingRecognition(state("single", [child("c", 8)], { housingCosts: { rent: { ...household().housingCosts.rent, parkingAmount: "50", parkingInseparableStatus: "no" }, owner: household().housingCosts.owner } }), "A").recognizedHousingCosts, 700));
test("Ungeklärter Stellplatz bleibt offen", () => assert.strictEqual(calculator.evaluateHousingRecognition(state("single", [child("c", 8)], { housingCosts: { rent: { ...household().housingCosts.rent, parkingAmount: "50" }, owner: household().housingCosts.owner } }), "A").status, "UNRESOLVED"));
test("Nicht-BG-Mitbewohner wird per Kopfteil abgezogen", () => assert.strictEqual(calculator.evaluateHousingRecognition(state("single", [child("c", 8)], { otherResidents: "1" }), "A").recognizedHousingCosts, 466.67));
test("Temporäres fremdes Kind wird nicht als Nicht-BG-Mitbewohner abgezogen", () => {
  const c = child("wm", 8, "A", { careSituation: "wechselmodell-50-50", affectedHouseholds: ["A", "B"], childBenefitAt: "B" });
  assert.strictEqual(calculator.evaluateHousingRecognition(state("single", [c]), "A").recognizedHousingCosts, 700);
});
test("Eigentum Vorjahr wird als Jahressumme durch zwölf berechnet", () => {
  const s = state("single", [child("c", 8)], { housingType: "owner" });
  assert.strictEqual(calculator.evaluateHousingRecognition(s, "A").recognizedHousingCosts, 475);
});
test("Eigentum unterstützt Quartalsrhythmus", () => {
  const h = household(); h.housingType = "owner"; h.housingCosts.owner.propertyTax = "150"; h.housingCosts.owner.propertyTaxFrequency = "quarterly";
  assert.strictEqual(calculator.evaluateHousingRecognition(state("single", [child("c", 8)], h), "A").recognizedHousingCosts, 475);
});
test("Tilgung wird nicht importiert oder anerkannt", () => {
  const h = household(); h.housingType = "owner"; h.housingCosts.owner.principal = "9999";
  assert.strictEqual(calculator.evaluateHousingRecognition(state("single", [child("c", 8)], h), "A").recognizedHousingCosts, 475);
});
test("Neu erworbenes Eigentum mittelt verfügbare Monate", () => {
  const h = household(); h.housingType = "owner"; h.housingCosts.owner.costPeriodStatus = "recent-months"; h.housingCosts.owner.recentMonthlyValues = ["600", "800", ...Array(10).fill("")];
  assert.strictEqual(calculator.evaluateHousingRecognition(state("single", [child("c", 8)], h), "A").recognizedHousingCosts, 700);
});
test("Mehr als zwölf Eigentumsmonate bleibt offen", () => {
  const h = household(); h.housingType = "owner"; h.housingCosts.owner.costPeriodStatus = "recent-months"; h.housingCosts.owner.recentMonthlyValues = Array(13).fill("600");
  assert.strictEqual(calculator.evaluateHousingRecognition(state("single", [child("c", 8)], h), "A").status, "UNRESOLVED");
});
test("Falsches Eigentumsbezugsjahr bleibt offen", () => {
  const h = household(); h.housingType = "owner"; h.housingCosts.owner.costYear = "2024";
  assert.strictEqual(calculator.evaluateHousingRecognition(state("single", [child("c", 8)], h), "A").status, "UNRESOLVED");
});
test("Fehlende Mietkosten bleiben offen", () => {
  const h = household(); h.housingCosts.rent.heating = "";
  assert.strictEqual(calculator.evaluateHousingRecognition(state("single", [child("c", 8)], h), "A").status, "UNRESOLVED");
});
test("Zentrales Warmwasser bleibt in erfassten Wohnkosten enthalten", () => assert.strictEqual(calculator.evaluateHousingRecognition(state(), "A").positions.find((x) => x.type === "heating").amount, 100));
test("Nicht modellierte Gutschrift mindert Wohnkosten nicht", () => {
  const h = household(); h.housingCosts.rent.credit = "300";
  assert.strictEqual(calculator.evaluateHousingRecognition(state("single", [child("c", 8)], h), "A").recognizedHousingCosts, 700);
});
test("Falscher Mietmonat bleibt offen", () => {
  const h = household(); h.housingCosts.rent.costMonth = "2026-06";
  assert.strictEqual(calculator.evaluateHousingRecognition(state("single", [child("c", 8)], h), "A").status, "UNRESOLVED");
});

test("Eltern-Gesamtbedarf folgt exakt der dokumentierten Formel", () => {
  const result = calculator.evaluateParentNeedForHousehold(state(), "A");
  assert.strictEqual(result.parentTotalNeed, result.parentRuleNeed + result.parentAdditionalNeedsTotal + result.parentHousingShareForKiZ);
});
test("Einfacher Eltern-Gesamtbedarf ist numerisch nachvollziehbar", () => assert.strictEqual(calculator.evaluateParentNeedForHousehold(state(), "A").parentTotalNeed, 1169.56));
test("Offener Mehrbedarf propagiert ohne Schätzung", () => assert.strictEqual(calculator.evaluateParentNeedForHousehold(state("single", [child("c", 8)], { hotWaterType: "unknown" }), "A").parentTotalNeed, null));
test("Ergebnis enthält keinen Familien-SGB-II-Bedarf", () => assert.strictEqual(Object.hasOwn(calculator.evaluateParentNeedForHousehold(state(), "A"), "familySgbIINeed"), false));
test("Ergebnis enthält keine Eltern-Einkommensminderung", () => assert.strictEqual(Object.hasOwn(calculator.evaluateParentNeedForHousehold(state(), "A"), "parentIncomeReduction"), false));
test("Nicht unterstütztes Jahr bleibt offen", () => { const s = state(); s.applicationYear = 2025; assert.strictEqual(calculator.evaluateParentNeedForHousehold(s, "A").status, "UNRESOLVED"); });
test("Paar-Gesamtbedarf verwendet Paar-Wohnanteil", () => assert.strictEqual(calculator.evaluateParentNeedForHousehold(state("couple"), "A").parentHousingShareForKiZ, 581));
test("Cent-Rundung des Wohnanteils ist stabil", () => { const h = household(); h.housingCosts.rent.coldRent = "500.01"; assert.strictEqual(calculator.evaluateParentHousingShare(state("single", [child("c", 8)], h), "A").parentHousingShareForKiZ, 539.01); });
test("Elternbedarfsberechnung verändert Eingabestate nicht", () => { const s = state(); const before = JSON.stringify(s); calculator.evaluateParentNeedForHousehold(s, "A"); assert.strictEqual(JSON.stringify(s), before); });
test("Regel-ID des Elternbedarfs ist stabil", () => assert.strictEqual(calculator.evaluateParentNeedForHousehold(state(), "A").ruleId, "KIZ-PARENT-NEED-001"));
test("Vier D3-Regel-IDs werden protokolliert", () => assert.deepStrictEqual(calculator.evaluateParentNeedForHousehold(state(), "A").usedRuleIds, ["KIZ-PARENT-NEED-001", "KIZ-PARENT-ADDITIONAL-NEED-001", "KIZ-HOUSING-RECOGNITION-001", "KIZ-PARENT-HOUSING-SHARE-001"]));
test("D3-Disclaimer grenzt Familienbedarf ab", () => assert.match(calculator.evaluateParentNeedForHousehold(state(), "A").disclaimer, /kein Familien-SGB-II-Bedarf/));
test("Datenversion ist für den Erwachsenen-Einkommensstatus auf 16 erhöht", () => assert.strictEqual(parentNeedData.DATA_VERSION, 16));
test("Alte D2-Haushaltsdaten werden defensiv um D3-Felder ergänzt", () => {
  const old = { housingCosts: { rent: { coldRent: "444" }, owner: { debtInterest: "200" } }, specialSituations: [{ id: "old", situationType: "nutrition", monthlyAmount: "50" }] };
  const migrated = parentNeedData.migrateParentNeedHousehold(old);
  assert.deepStrictEqual({ coldRent: migrated.housingCosts.rent.coldRent, confirmation: migrated.specialSituations[0].confirmationStatus, role: migrated.specialSituations[0].personRole, recentMonths: migrated.housingCosts.owner.recentMonthlyValues.length }, { coldRent: "444", confirmation: "unknown", role: "applicant", recentMonths: 12 });
});
test("D3-Migration verändert Altdaten nicht", () => {
  const old = { housingCosts: { rent: { coldRent: "444" } }, specialSituations: [{ id: "old", situationType: "pregnancy" }] };
  const before = JSON.stringify(old); parentNeedData.migrateParentNeedHousehold(old); assert.strictEqual(JSON.stringify(old), before);
});
test("Validierung lehnt ungültigen Zahlungsrhythmus ab", () => { const s = state(); s.households.A.housingType = "owner"; s.households.A.housingCosts.owner.debtInterestFrequency = "weekly"; const result = validation.validateCalculatorState(s); assert(result.errors.some((x) => x.code === "OWNER_COST_FREQUENCY_INVALID")); });
test("Validierung lehnt ungültige Mehrbedarfs-Person ab", () => { const s = state(); s.households.A.specialSituations = [special("pregnancy", { personRole: "child" })]; const result = validation.validateCalculatorState(s); assert(result.errors.some((x) => x.code === "SPECIAL_SITUATION_PERSON_ROLE_INVALID")); });
test("Validierung verlangt Untervermietungsbetrag", () => { const s = state(); s.households.A.housingCosts.rent.sublettingStatus = "yes"; const result = validation.validateCalculatorState(s); assert(result.errors.some((x) => x.code === "SUBLETTING_AMOUNT_MISSING")); });

test("Leere Althaushalte migrieren den Erwachsenenstatus als unknown", () => {
  const migrated = parentNeedData.migrateParentNeedHousehold({ applicantIncomeSources: [], partnerIncomeSources: [] });
  assert.equal(migrated.applicantIncomeStatus, "unknown");
  assert.equal(migrated.partnerIncomeStatus, "unknown");
});
test("Althaushalte mit Quellen migrieren den Erwachsenenstatus als present", () => {
  const migrated = parentNeedData.migrateParentNeedHousehold({ applicantIncomeSources: [{ id: "old-source" }] });
  assert.equal(migrated.applicantIncomeStatus, "present");
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
console.log(`✓ ${passed}/${tests.length} D3-Elternbedarfstests bestanden.`);
