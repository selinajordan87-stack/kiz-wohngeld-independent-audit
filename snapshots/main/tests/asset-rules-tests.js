"use strict";

const assert = require("node:assert/strict");
const calculator = require("../calculator.js");
const parentNeedData = require("../parent-need-data.js");

const tests = [];
const test = (name, run) => tests.push({ name, run });
const details = (overrides = {}) => ({ realizableStatus: "yes", incomeDoubleCountStatus: "no", appropriateVehicleDeclared: "unknown", protectedRetirementConfirmed: "unknown", selfUsedStatus: "unknown", propertyType: "unknown", livingAreaSqm: "", residentCount: "", hardshipProtection: "unknown", ...overrides });
const asset = (value, overrides = {}) => ({ id: overrides.id || `a-${value}`, type: "cash", value: String(value), ownerRole: "applicant", protectedStatus: "no", details: details(), ...overrides });
const persons = (applicantAssets = [], childAssets = [], partnerAssets = []) => ({ applicant: { assets: applicantAssets }, partner: { assets: partnerAssets }, children: { c1: { assets: childAssets } } });
const assessment = (overrides = {}) => calculator.calculateAssetAssessment({ assetsStatus: "yes", assetPersons: persons([asset(1)]), adults: "single", childIds: [], assetAssessmentDate: "2026-07-01", assetRuleVersion: "POST_JULY_2026", ...overrides });

test("1. Vermögens-Regel-ID ist stabil", () => assert.equal(calculator.RULE_IDS.asset, "KIZ-ASSET-001"));
test("2. Kindesvermögens-Regel-ID ist stabil", () => assert.equal(calculator.RULE_IDS.childAssetReduction, "KIZ-REDUCE-CHILD-ASSETS-001"));
test("3. Elternvermögens-Regel-ID ist stabil", () => assert.equal(calculator.RULE_IDS.parentAssetReduction, "KIZ-REDUCE-PARENT-ASSETS-001"));
test("4. Integrations-Regel-ID ist stabil", () => assert.equal(calculator.RULE_IDS.assetIntegration, "KIZ-ASSET-INTEGRATION-001"));
test("5. Antragstellerfreibetrag ist 40000", () => assert.equal(calculator.ASSET_ALLOWANCES.applicant, 40000));
test("6. Freibetrag jedes weiteren Mitglieds ist 15000", () => assert.equal(calculator.ASSET_ALLOWANCES.otherMember, 15000));
test("7. 30.06.2026 nutzt Vor-Juli-Regel", () => assert.equal(calculator.assetDateAndVersion({ applicationMonth: 6, applicationYear: 2026 }).assetRuleVersion, "PRE_JULY_2026"));
test("8. 01.07.2026 nutzt Nach-Juli-Regel", () => assert.equal(calculator.assetDateAndVersion({ applicationMonth: 7, applicationYear: 2026 }).assetRuleVersion, "POST_JULY_2026"));
test("9. Vermögensstichtag ist der erste BWZ-Tag", () => assert.equal(calculator.assetDateAndVersion({ applicationMonth: 8, applicationYear: 2026 }).assetAssessmentDate, "2026-08-01"));
test("10. ungültiger Monat erzeugt keinen Stichtag", () => assert.equal(calculator.assetDateAndVersion({ applicationMonth: 13, applicationYear: 2026 }).assetAssessmentDate, null));

test("11. Vermögensstatus Nein ist unterstützt", () => assert.equal(assessment({ assetsStatus: "no" }).status, "SUPPORTED"));
test("12. Vermögensstatus Nein liefert Nullvermögen", () => assert.equal(assessment({ assetsStatus: "no" }).countableAssets.householdTotal, 0));
test("13. Vermögensstatus Unbekannt bleibt offen", () => assert.deepEqual(assessment({ assetsStatus: "unknown" }).openChecks, ["ASSETS_STATUS_REQUIRED"]));
test("14. Vermögen Ja ohne Position bleibt offen", () => assert.deepEqual(assessment({ assetPersons: parentNeedData.defaultAssetPersons() }).openChecks, ["ASSET_DETAILS_REQUIRED"]));
test("15. explizite Null ist ein gültiger Wert", () => assert.equal(assessment({ assetPersons: persons([asset(0)]) }).status, "SUPPORTED"));
test("16. leerer Wert ist nicht Null", () => assert.ok(calculator.classifyAssetPosition(asset(0, { value: "" }), "POST_JULY_2026").openChecks.includes("ASSET_VALUE_REQUIRED")));
test("17. negativer Wert bleibt offen", () => assert.ok(calculator.classifyAssetPosition(asset(-1), "POST_JULY_2026").openChecks.includes("ASSET_VALUE_REQUIRED")));
test("18. unbekannte Vermögensart bleibt offen", () => assert.ok(calculator.classifyAssetPosition(asset(1, { type: "fantasy" }), "POST_JULY_2026").openChecks.includes("ASSET_TYPE_INVALID")));
test("19. ungültige Eigentümerrolle bleibt offen", () => assert.ok(calculator.classifyAssetPosition(asset(1, { ownerRole: "external" }), "POST_JULY_2026").openChecks.includes("ASSET_OWNER_INVALID")));
test("20. bereits als Einkommen möglicher Doppelansatz bleibt offen", () => assert.ok(calculator.classifyAssetPosition(asset(1, { details: details({ incomeDoubleCountStatus: "yes" }) }), "POST_JULY_2026").openChecks.includes("ASSET_INCOME_DOUBLE_COUNT_CHECK")));
test("21. unbekannte Einkommensabgrenzung bleibt offen", () => assert.ok(calculator.classifyAssetPosition(asset(1, { details: details({ incomeDoubleCountStatus: "unknown" }) }), "POST_JULY_2026").openChecks.includes("ASSET_INCOME_DOUBLE_COUNT_CHECK")));
test("22. bestätigter Schutz zählt Position nicht", () => assert.equal(calculator.classifyAssetPosition(asset(500, { protectedStatus: "yes" }), "POST_JULY_2026").countableBeforeAllowance, 0));
test("23. unbekannter Schutz bleibt offen", () => assert.ok(calculator.classifyAssetPosition(asset(500, { protectedStatus: "unknown" }), "POST_JULY_2026").openChecks.includes("ASSET_PROTECTION_STATUS_REQUIRED")));
test("24. Bargeld mit bestätigter Verwertbarkeit wird gezählt", () => assert.equal(calculator.classifyAssetPosition(asset(500), "POST_JULY_2026").countableBeforeAllowance, 500));
test("25. unklare Verwertbarkeit bleibt offen", () => assert.ok(calculator.classifyAssetPosition(asset(500, { details: details({ realizableStatus: "unknown" }) }), "POST_JULY_2026").openChecks.includes("ASSET_REALIZABILITY_REQUIRED")));
test("26. sonstige Immobilie verlangt Verwertbarkeit", () => assert.ok(calculator.classifyAssetPosition(asset(500, { type: "other-real-estate", details: details({ realizableStatus: "no" }) }), "POST_JULY_2026").openChecks.includes("REAL_ESTATE_REALIZABILITY_REQUIRED")));

test("27. angemessen erklärtes Fahrzeug ist geschützt", () => assert.equal(calculator.classifyAssetPosition(asset(10000, { type: "vehicle", details: details({ appropriateVehicleDeclared: "yes" }) }), "POST_JULY_2026").protectedValue, 10000));
test("28. Fahrzeug ohne bestätigte Angemessenheit wird nicht blind gezählt", () => assert.ok(calculator.classifyAssetPosition(asset(10000, { type: "vehicle", details: details({ appropriateVehicleDeclared: "no" }) }), "POST_JULY_2026").openChecks.includes("VEHICLE_ASSET_CLASSIFICATION_OPEN")));
test("29. bestätigte geschützte Altersvorsorge ist geschützt", () => assert.equal(calculator.classifyAssetPosition(asset(20000, { type: "protected-retirement", details: details({ protectedRetirementConfirmed: "yes" }) }), "POST_JULY_2026").countableBeforeAllowance, 0));
test("30. unvollständige Selbständigenvorsorge bleibt offen", () => assert.ok(calculator.classifyAssetPosition(asset(20000, { type: "self-employed-retirement", details: details({ protectedRetirementConfirmed: "unknown" }) }), "POST_JULY_2026").openChecks.includes("SELF_EMPLOYED_RETIREMENT_ASSET_OPEN")));

const property = (area, residents, overrides = {}) => asset(200000, { type: "self-used-property", details: details({ selfUsedStatus: "yes", propertyType: "house", livingAreaSqm: String(area), residentCount: String(residents), hardshipProtection: "no", ...overrides }) });
test("31. selbst genutztes Eigentum vor Juli ist flächenunabhängig geschützt", () => assert.equal(calculator.classifyAssetPosition(property(300, 2), "PRE_JULY_2026").countableBeforeAllowance, 0));
test("32. Haus bis 140 m² ist ab Juli geschützt", () => assert.equal(calculator.classifyAssetPosition(property(140, 4), "POST_JULY_2026").countableBeforeAllowance, 0));
test("33. Wohnung bis 130 m² ist ab Juli geschützt", () => assert.equal(calculator.classifyAssetPosition(property(130, 4, { propertyType: "apartment" }), "POST_JULY_2026").countableBeforeAllowance, 0));
test("34. fünfte Person erhöht Hausgrenze auf 160 m²", () => assert.equal(calculator.classifyAssetPosition(property(160, 5), "POST_JULY_2026").propertyAreaLimitSqm, 160));
test("35. sechste Person erhöht Wohnungsgrenze auf 170 m²", () => assert.equal(calculator.classifyAssetPosition(property(170, 6, { propertyType: "apartment" }), "POST_JULY_2026").propertyAreaLimitSqm, 170));
test("36. übergroße Immobilie mit Härtefallschutz ist geschützt", () => assert.equal(calculator.classifyAssetPosition(property(200, 4, { hardshipProtection: "yes" }), "POST_JULY_2026").countableBeforeAllowance, 0));
test("37. übergroße Immobilie ohne Härtefallschutz bleibt Bewertungsfall", () => assert.ok(calculator.classifyAssetPosition(property(200, 4), "POST_JULY_2026").openChecks.includes("PROPERTY_ASSET_VALUATION_REQUIRED")));

test("38. amtliches Beispiel 39000/17500 ergibt 1500 Kindesvermögen", () => {
  const result = assessment({ assetPersons: persons([asset(39000)], [asset(17500, { ownerRole: "child" })]), childIds: ["c1"] });
  assert.equal(result.persons.find((person) => person.childId === "c1").countableAssets, 1500);
});
test("39. amtliches Beispiel 39000/16100 ergibt 100 Kindesvermögen", () => {
  const result = assessment({ assetPersons: persons([asset(39000)], [asset(16100, { ownerRole: "child" })]), childIds: ["c1"] });
  assert.equal(result.persons.find((person) => person.childId === "c1").countableAssets, 100);
});
test("40. Freibetragsübertragung wird im Ledger nur einmal gebucht", () => {
  const result = assessment({ assetPersons: persons([asset(39000)], [asset(17500, { ownerRole: "child" })]), childIds: ["c1"] });
  assert.equal(result.allowanceLedger.totalTransferred, 1000); assert.equal(result.allowanceLedger.transfers.length, 1);
});
test("41. Partner erzeugt als tatsächliches BG-Mitglied 15000 Freibetrag", () => {
  const result = assessment({ adults: "couple", assetPersons: persons([asset(0)], [], [asset(0, { ownerRole: "partner" })]) });
  assert.equal(result.persons.find((person) => person.personRole === "partner").personalAllowance, 15000);
});
test("42. externe Bewohner erzeugen keinen Freibetrag", () => assert.equal(assessment().persons.length, 1));
test("43. mehrere Überschusspersonen bei zu kleinem Pool bleiben offen", () => {
  const result = assessment({ adults: "couple", childIds: ["c1"], assetPersons: persons([asset(50000)], [asset(30000, { ownerRole: "child" })], [asset(30000, { ownerRole: "partner" })]) });
  assert.ok(result.openChecks.includes("ASSET_ALLOWANCE_ALLOCATION_OPEN"));
});
test("44. Erwachsenenstatus-Migration hebt die Datenversion auf 16", () => assert.equal(parentNeedData.DATA_VERSION, 16));
test("45. Migration ergänzt leere Personenlisten", () => assert.deepEqual(parentNeedData.migrateParentNeedHousehold({}).assetPersons, parentNeedData.defaultAssetPersons()));
test("46. Migration erhält vorhandene Vermögenswerte", () => assert.equal(parentNeedData.migrateAssetPersons(persons([asset(123)])).applicant.assets[0].value, "123"));
test("47. Migration erhält explizite Null", () => assert.equal(parentNeedData.migrateAssetPersons(persons([asset(0)])).applicant.assets[0].value, "0"));

let failed = 0;
tests.forEach(({ name, run }) => { try { run(); console.log(`OK ${name}`); } catch (error) { failed += 1; console.error(`FEHLER ${name}`); console.error(error.stack || error.message); } });
console.log(`${tests.length - failed}/${tests.length} Tests für KIZ-ASSET-001 (Phase D7) erfolgreich.`);
if (failed) process.exitCode = 1;
