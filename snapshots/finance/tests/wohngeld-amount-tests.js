const assert = require("assert");
const data = require("../wohngeld-data.js");
const wg = require("../wohngeld.js");

const tests = [];
const test = (name, run) => tests.push({ name, run });

function forecastNone() {
  return {
    incomeStatus: "none",
    mode: "annual",
    taxExpected: "no",
    healthCareContributionExpected: "no",
    pensionContributionExpected: "no",
    sources: [],
  };
}

function forecastIncome(monthlyIncome) {
  return {
    incomeStatus: "present",
    mode: "annual",
    taxExpected: "no",
    healthCareContributionExpected: "no",
    pensionContributionExpected: "no",
    sources: [{
      id: "wg-income-1",
      type: "sick-pay",
      expectedAnnualAmount: String(monthlyIncome * 12),
      expectedMonthlyAmount: "",
      monthlyValues: Array(12).fill(""),
      details: {},
    }],
  };
}

function person(overrides = {}) {
  return {
    wohngeldExclusionStatus: "not-excluded",
    wohngeldExclusionReason: "",
    careDaysInReferenceMonth: "",
    incomeForecast: forecastNone(),
    disabilityAllowanceStatus: "not-applicable",
    nsPersecutionStatus: "no",
    wohngeldGrundrentenTimesStatus: "no",
    ...overrides,
  };
}

function fixture(options = {}) {
  const {
    memberCount = 1,
    excludedCount = 0,
    rawHousing = 470,
    monthlyIncome = 1350,
    mietstufe = "IV",
    housingType = "rent",
    actualHeating = 0,
    unknownIncome = false,
  } = options;
  const applicantExcluded = excludedCount === memberCount;
  const applicant = person({
    wohngeldExclusionStatus: applicantExcluded ? "excluded" : "not-excluded",
    wohngeldExclusionReason: applicantExcluded ? "transfer-benefit" : "",
    incomeForecast: unknownIncome ? { ...forecastNone(), incomeStatus: "unknown" } : forecastIncome(monthlyIncome),
  });
  const children = [];
  const childPersons = {};
  const excludedChildren = Math.max(0, excludedCount - (applicantExcluded ? 1 : 0));
  for (let index = 1; index < memberCount; index += 1) {
    const id = `c${index}`;
    const isExcluded = index > memberCount - 1 - excludedChildren;
    children.push({ id, name: `Kind ${index}`, age: "10", careSituation: "dauerhaft-a", stayDays: "", affectedHouseholds: [] });
    childPersons[id] = person({
      wohngeldExclusionStatus: isExcluded ? "excluded" : "not-excluded",
      wohngeldExclusionReason: isExcluded ? "transfer-benefit" : "",
    });
  }
  const ownerInterest = rawHousing * 12 - 36;
  const household = {
    adults: "single",
    person1: "Antrag",
    housingType,
    otherResidents: "0",
    housingCosts: {
      rent: {
        coldRent: rawHousing === null ? "" : String(rawHousing),
        coldUtilities: "0",
        heating: String(actualHeating),
        warmWater: "0",
        householdEnergy: "0",
        parkingAmount: "0",
        sublettingStatus: "no",
      },
      owner: { heating: String(actualHeating) },
    },
    wohngeldData: {
      mietstufe,
      nonHouseholdAdjustmentStatus: "none",
      complexUseStatus: "no",
      singleParentAllowanceStatus: "no",
      persons: { applicant, partner: person(), children: childPersons },
      ownerCosts: {
        livingAreaSqm: "1",
        annualInterest: String(ownerInterest),
        annualPrincipalRepayment: "0",
        annualLoanAncillaryCosts: "0",
        annualGuaranteeCosts: "0",
        annualLeaseholdPayment: "0",
        annualTotalLoanPayments: "",
        annualPropertyTax: "0",
        annualThirdPartyAdministrationCosts: "0",
      },
      maintenanceDeductions: [],
    },
  };
  return { household, children, context: { householdId: "A", applicationYear: 2026 } };
}

function calculate(options = {}) {
  const input = fixture(options);
  return wg.evaluateWohngeldAmount(input.household, input.children, input.context);
}

function findRoundedAmount(target) {
  for (let monthlyIncome = 396; monthlyIncome <= 5000; monthlyIncome += 1) {
    const result = calculate({ rawHousing: 650, monthlyIncome });
    if (result.roundedFormulaAmount === target) return result;
  }
  throw new Error(`Kein Testwert für gerundeten Betrag ${target} gefunden.`);
}

test("1. Höchstbetrag für eine Person in Mietstufe I", () => assert.equal(data.getHousingMaximum(1, "I"), 361));
test("2. Höchstbetrag für eine Person in Mietstufe VII", () => assert.equal(data.getHousingMaximum(1, "VII"), 677));
test("3. Höchstbetrag für zwei Personen in Mietstufe IV", () => assert.equal(data.getHousingMaximum(2, "IV"), 619));
test("4. Höchstbetrag für drei Personen in Mietstufe III", () => assert.equal(data.getHousingMaximum(3, "III"), 657));
test("5. Höchstbetrag für vier Personen in Mietstufe VII", () => assert.equal(data.getHousingMaximum(4, "VII"), 1139));
test("6. Höchstbetrag für fünf Personen in Mietstufe V", () => assert.equal(data.getHousingMaximum(5, "V"), 1080));
test("7. Höchstbetrag ab der sechsten Person wird exakt addiert", () => assert.equal(data.getHousingMaximum(6, "I"), 776));
test("8. Höchstbetrag ab der siebten Person wird exakt addiert", () => assert.equal(data.getHousingMaximum(7, "VII"), 1628));
test("9. Mietstufen werden weder interpoliert noch erraten", () => assert.equal(data.getHousingMaximum(2, "IV.5"), null));

test("10. Klimakomponente für eine Person", () => assert.equal(data.getClimateComponent(1), "19.20"));
test("11. Klimakomponente für fünf Personen", () => assert.equal(data.getClimateComponent(5), "39.20"));
test("12. Klimakomponente ab der sechsten Person", () => assert.equal(data.getClimateComponent(6), "44.00"));
test("13. Heizkostenkomponente für eine Person", () => assert.equal(data.getHeatingRelief(1), "110.40"));
test("14. Heizkostenkomponente für fünf Personen", () => assert.equal(data.getHeatingRelief(5), "225.40"));
test("15. Heizkostenkomponente ab der sechsten Person", () => assert.equal(data.getHeatingRelief(6), "253.00"));
test("16. tatsächliche Heizkosten verändern die pauschale Heizkostenkomponente nicht", () => {
  const withoutHeating = calculate({ actualHeating: 0 });
  const withHeating = calculate({ actualHeating: 999 });
  assert.equal(withoutHeating.housing.consideredHeatingRelief, withHeating.housing.consideredHeatingRelief);
  assert.equal(withoutHeating.payableWohngeldAmount, withHeating.payableWohngeldAmount);
});

test("17. Rohmiete unter der Kappungsgrenze wird vollständig anerkannt", () => {
  const result = calculate({ rawHousing: 470 });
  assert.equal(result.housing.recognizedColdRentOrBurden, 470);
});
test("18. M besteht aus anerkannter Kaltmiete plus Heizkostenkomponente", () => {
  assert.equal(calculate({ rawHousing: 470 }).housing.actualFormulaM, 580.4);
});
test("19. Kaltmiete oberhalb der Grenze wird gekappt", () => {
  assert.equal(calculate({ rawHousing: 650 }).housing.recognizedColdRentOrBurden, 530.2);
});
test("20. Nach Kappung wird die Heizkostenkomponente zu M addiert", () => {
  assert.equal(calculate({ rawHousing: 650 }).housing.actualFormulaM, 640.6);
});
test("21. Die Kappungsreihenfolge gilt auch beim Lastenzuschuss", () => {
  const result = calculate({ housingType: "owner", rawHousing: 650 });
  assert.equal(result.housing.recognizedColdRentOrBurden, 530.2);
  assert.equal(result.housing.actualFormulaM, 640.6);
});

test("22. Mischhaushalt bestimmt den vollen Höchstbetrag nach allen Mitgliedern", () => {
  const result = calculate({ memberCount: 4, excludedCount: 1, rawHousing: 400 });
  assert.equal(result.housing.fullHousingMaximum, 858);
  assert.equal(result.housing.consideredHousingMaximum, 643.5);
});
test("23. Klimakomponente wird im Mischhaushalt anteilig berücksichtigt", () => {
  const result = calculate({ memberCount: 4, excludedCount: 1 });
  assert.equal(result.housing.fullClimateComponent, 34.4);
  assert.equal(result.housing.consideredClimateComponent, 25.8);
});
test("24. Heizkostenkomponente wird im Mischhaushalt anteilig berücksichtigt", () => {
  const result = calculate({ memberCount: 4, excludedCount: 1 });
  assert.equal(result.housing.fullHeatingRelief, 197.8);
  assert.equal(result.housing.consideredHeatingRelief, 148.35);
});
test("25. Die anteilige Kaltmietenobergrenze enthält Höchstbetrag und Klimakomponente", () => {
  const result = calculate({ memberCount: 4, excludedCount: 1 });
  assert.equal(result.housing.coldHousingUpperLimit, 669.3);
});
test("26. Formelkoeffizienten richten sich nach den berücksichtigten Mitgliedern", () => {
  const result = calculate({ memberCount: 4, excludedCount: 1 });
  assert.equal(result.formula.coefficientMemberCount, 3);
  assert.equal(result.formula.a, "0.0200000000");
});
test("27. Formel-Mindestwerte richten sich nach den berücksichtigten Mitgliedern", () => {
  const result = calculate({ memberCount: 4, excludedCount: 1 });
  assert.equal(result.formula.minimumM, 79);
  assert.equal(result.formula.minimumY, 906);
});
test("28. Die bereits in D8B1 anteilige Rohmiete wird nicht nochmals quotiert", () => {
  const result = calculate({ memberCount: 4, excludedCount: 1, rawHousing: 800 });
  assert.equal(result.housing.rawMonthlyRentOrBurden, 600);
  assert.equal(result.housing.recognizedColdRentOrBurden, 600);
});

test("29. Koeffizienten für eine Person werden exakt ausgegeben", () => {
  const result = calculate();
  assert.deepEqual([result.formula.a, result.formula.b, result.formula.c], ["0.0400000000", "0.0004797000", "0.0000408000"]);
});
test("30. Koeffizienten für fünf Personen sind vollständig hinterlegt", () => {
  assert.deepEqual(data.getFormulaCoefficients(5), { a: "0", b: "0.0001907", c: "0.0000172" });
});
test("31. Negative Koeffizienten ab sechs Personen bleiben erhalten", () => {
  assert.equal(data.getFormulaCoefficients(6).a, "-0.01");
});
test("32. Koeffizienten für zwölf Personen sind vollständig hinterlegt", () => {
  assert.deepEqual(data.getFormulaCoefficients(12), { a: "-0.12", b: "0.0001107", c: "0.0000221" });
});
test("33. Festkommawerte werden ohne Exponential- oder Binärartefakte protokolliert", () => {
  const result = calculate({ memberCount: 6, monthlyIncome: 1585 });
  Object.values(result.formula).filter((value) => typeof value === "string").forEach((value) => {
    assert.match(value, /^-?\d+\.\d{10}$/);
  });
});

test("34. Y unter dem gesetzlichen Mindestwert wird nur für die Formel angehoben", () => {
  const result = calculate({ monthlyIncome: 300 });
  assert.equal(result.formula.actualY, "300.0000000000");
  assert.equal(result.formula.formulaY, "396.0000000000");
});
test("35. Y am Mindestwert bleibt unverändert", () => {
  assert.equal(calculate({ monthlyIncome: 396 }).formula.formulaY, "396.0000000000");
});
test("36. M unter dem Mindestwert wird nur für die Formel angehoben", () => {
  const result = calculate({ memberCount: 20, excludedCount: 19, rawHousing: 0 });
  assert.ok(Number(result.formula.actualM) < 54);
  assert.equal(result.formula.formulaM, "54.0000000000");
});
test("37. Werte oberhalb der Mindestwerte werden nicht gedeckelt", () => {
  const result = calculate({ rawHousing: 650, monthlyIncome: 1500 });
  assert.equal(result.formula.formulaM, result.formula.actualM);
  assert.equal(result.formula.formulaY, result.formula.actualY);
});
test("38. Tatsächliche und für die Formel verwendete Werte bleiben getrennt nachvollziehbar", () => {
  const result = calculate({ memberCount: 20, excludedCount: 19, rawHousing: 0, monthlyIncome: 0 });
  assert.notEqual(result.formula.actualM, result.formula.formulaM);
  assert.notEqual(result.formula.actualY, result.formula.formulaY);
});

test("45. Referenzfall berechnet z4 und den gerundeten Betrag reproduzierbar", () => {
  const result = calculate({ rawHousing: 470, monthlyIncome: 1350 });
  assert.equal(result.formula.z4, "87.6045413000");
  assert.equal(result.roundedFormulaAmount, 88);
});
test("46. 87,49 Euro werden erst abschließend auf 87 Euro gerundet", () => {
  assert.equal(wg.fixedPoint.roundScaledEuroToWholeEuro(wg.fixedPoint.decimalToScaledInteger("87.49")), 87);
});
test("47. 87,50 Euro werden erst abschließend auf 88 Euro gerundet", () => {
  assert.equal(wg.fixedPoint.roundScaledEuroToWholeEuro(wg.fixedPoint.decimalToScaledInteger("87.50")), 88);
});
test("48. Ein gerundeter Betrag von 9 Euro fällt unter die Bagatellgrenze", () => {
  const result = findRoundedAmount(9);
  assert.equal(result.calculatedMonthlyWohngeld, 9);
  assert.equal(result.payableWohngeldAmount, 0);
  assert.equal(result.amountStatus, "BELOW_10_EURO");
});
test("49. Ein gerundeter Betrag von 10 Euro ist zahlbar", () => {
  const result = findRoundedAmount(10);
  assert.equal(result.payableWohngeldAmount, 10);
  assert.equal(result.amountStatus, "POSITIVE_AMOUNT");
});
test("50. Ein negativer Formelbetrag wird auf null begrenzt", () => {
  const result = calculate({ monthlyIncome: 10000 });
  assert.ok(result.roundedFormulaAmount < 0);
  assert.equal(result.calculatedMonthlyWohngeld, 0);
  assert.equal(result.payableWohngeldAmount, 0);
});
test("51. Bei ausschließlich ausgeschlossenen Mitgliedern wird keine Formel ausgeführt", () => {
  const result = calculate({ memberCount: 2, excludedCount: 2 });
  assert.equal(result.formula, null);
  assert.equal(result.payableWohngeldAmount, 0);
  assert.equal(result.eligibilityReason, "ALL_HOUSEHOLD_MEMBERS_EXCLUDED");
});
test("52. Mit mindestens einem berücksichtigten Mitglied wird die Formel ausgeführt", () => {
  assert.notEqual(calculate({ memberCount: 2, excludedCount: 1 }).formula, null);
});
test("53. Die Prüfung nach § 20 bleibt transparent offen", () => {
  assert.ok(calculate().remainingChecks.includes("WG_SECTION_20_CHECK_NOT_FULLY_EVALUATED"));
});
test("54. Die erhebliche-Vermögen-Prüfung bleibt transparent offen", () => {
  assert.ok(calculate().remainingChecks.includes("WG_SIGNIFICANT_ASSETS_CHECK_NOT_FULLY_EVALUATED"));
});
test("55. Mietende erhalten die Leistungsart Mietzuschuss", () => {
  assert.equal(calculate().benefitType, "MIETZUSCHUSS");
});
test("56. Eigentümer erhalten die Leistungsart Lastenzuschuss", () => {
  assert.equal(calculate({ housingType: "owner" }).benefitType, "LASTENZUSCHUSS");
});
test("57. Gleiche Rohbeträge führen bei Miete und Eigentum zur gleichen Formel", () => {
  const rent = calculate({ rawHousing: 470 });
  const owner = calculate({ rawHousing: 470, housingType: "owner" });
  assert.equal(owner.formula.z4, rent.formula.z4);
  assert.equal(owner.payableWohngeldAmount, rent.payableWohngeldAmount);
});
test("58. KiZ-D3-Wohnkosten werden nicht als Wohngeld-Rohbetrag verwendet", () => {
  const input = fixture({ rawHousing: 470 });
  input.household.recognizedHousingCosts = 9999;
  input.household.parentNeed = { recognizedHousingCosts: 8888 };
  const result = wg.evaluateWohngeldAmount(input.household, input.children, input.context);
  assert.equal(result.housing.rawMonthlyRentOrBurden, 470);
});
test("59. D8B1-Foundation bleibt ohne finalen Wohngeldbetrag", () => {
  const input = fixture();
  const foundation = wg.evaluateWohngeldFoundation(input.household, input.children, input.context);
  assert.equal(foundation.finalWohngeldAmount, null);
  assert.ok(foundation.remainingSteps.includes("WG_AMOUNT_001_NOT_APPLIED"));
});
test("60. Betragsausgabe referenziert Foundation und stabile Regel-ID", () => {
  const result = calculate();
  assert.equal(result.ruleId, "WG-AMOUNT-001");
  assert.equal(result.foundationRuleId, "WG-FOUNDATION-001");
  assert.ok(result.usedRuleIds.includes("WG-AMOUNT-001"));
});
test("61. Eine vorbereitete Foundation wird nicht mutiert", () => {
  const input = fixture();
  const foundation = wg.evaluateWohngeldFoundation(input.household, input.children, input.context);
  const before = JSON.stringify(foundation);
  wg.evaluateWohngeldAmount(input.household, input.children, input.context, foundation);
  assert.equal(JSON.stringify(foundation), before);
});
test("62. Die Betragsberechnung mutiert die Eingabeobjekte nicht", () => {
  const input = fixture();
  const before = JSON.stringify(input);
  wg.evaluateWohngeldAmount(input.household, input.children, input.context);
  assert.equal(JSON.stringify(input), before);
});
test("63. Eine unbekannte Mietstufe blockiert die Betragsberechnung", () => {
  const result = calculate({ mietstufe: "VIII" });
  assert.equal(result.status, "UNRESOLVED");
  assert.ok(result.openChecks.includes("WG_MIETSTUFE_REQUIRED_FOR_AMOUNT"));
});
test("64. Ungeklärtes Einkommen blockiert die Betragsberechnung", () => {
  const result = calculate({ unknownIncome: true });
  assert.equal(result.status, "UNRESOLVED");
  assert.ok(result.openChecks.includes("WG_FOUNDATION_UNRESOLVED"));
});
test("65. Eine leere Kaltmiete blockiert die Betragsberechnung", () => {
  const result = calculate({ rawHousing: null });
  assert.equal(result.status, "UNRESOLVED");
  assert.ok(result.openChecks.includes("WG_FOUNDATION_UNRESOLVED"));
});
test("66. Mehr als zwölf berücksichtigte Personen werden nicht extrapoliert", () => {
  const result = calculate({ memberCount: 13 });
  assert.equal(result.status, "UNRESOLVED");
  assert.ok(result.openChecks.includes("WG_MORE_THAN_12_MEMBERS_NOT_SUPPORTED"));
});
test("67. Das Ruleset wird nicht auf 2027 extrapoliert", () => {
  const input = fixture();
  input.context.applicationYear = 2027;
  const result = wg.evaluateWohngeldAmount(input.household, input.children, input.context);
  assert.equal(result.status, "UNRESOLVED");
  assert.ok(result.openChecks.includes("WG_RULESET_YEAR_UNSUPPORTED"));
});
test("68. Convenience-Auswertung liefert Foundation und Amount gemeinsam", () => {
  const input = fixture();
  const result = wg.evaluateWohngeld(input.household, input.children, input.context);
  assert.equal(result.foundation.ruleId, "WG-FOUNDATION-001");
  assert.equal(result.amount.ruleId, "WG-AMOUNT-001");
  assert.equal(result.amount.foundationRuleId, result.foundation.ruleId);
});

let failed = 0;
tests.forEach(({ name, run }) => {
  try { run(); console.log(`OK ${name}`); }
  catch (error) { failed += 1; console.error(`FEHLER ${name}`); console.error(error.stack || error); }
});
console.log(`\n${tests.length - failed}/${tests.length} Wohngeld-Betragstests erfolgreich.`);
if (failed) process.exitCode = 1;
