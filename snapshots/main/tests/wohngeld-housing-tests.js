const assert = require("assert");
const wg = require("../wohngeld.js");

const tests = [];
const test = (name, run) => tests.push({ name, run });

function person() {
  return {
    wohngeldExclusionStatus: "not-excluded",
    incomeForecast: { incomeStatus: "none", mode: "unknown", taxExpected: "unknown", healthCareContributionExpected: "unknown", pensionContributionExpected: "unknown", sources: [] },
    disabilityAllowanceStatus: "not-applicable",
    nsPersecutionStatus: "no",
    wohngeldGrundrentenTimesStatus: "no",
  };
}

function base(overrides = {}) {
  return {
    adults: "single",
    housingType: "rent",
    otherResidents: "0",
    housingCosts: {
      rent: { coldRent: "700", coldUtilities: "150", heating: "200", warmWater: "30", householdEnergy: "60", parkingAmount: "50", sublettingStatus: "no" },
      owner: { debtInterest: "999", buildingInsurance: "800", heating: "1200", otherCostsAmount: "700" },
    },
    wohngeldData: {
      mietstufe: "III",
      nonHouseholdAdjustmentStatus: "none",
      complexUseStatus: "no",
      singleParentAllowanceStatus: "no",
      persons: { applicant: person(), partner: person(), children: {} },
      ownerCosts: {
        livingAreaSqm: "100",
        annualInterest: "1200",
        annualPrincipalRepayment: "2400",
        annualLoanAncillaryCosts: "100",
        annualGuaranteeCosts: "50",
        annualLeaseholdPayment: "250",
        annualTotalLoanPayments: "",
        annualPropertyTax: "400",
        annualThirdPartyAdministrationCosts: "200",
      },
      maintenanceDeductions: [],
    },
    ...overrides,
  };
}

function members(h) {
  return wg.evaluateWohngeldHousehold(h, [], { householdId: "A" });
}

test("11. 700 Kaltmiete plus 150 kalte Nebenkosten ergeben 850 Roh-WG-Miete", () => {
  const h = base();
  assert.equal(wg.evaluateWohngeldRent(h, members(h)).rawEligibleColdRent, 850);
});

test("12. 200 Heizkosten werden nicht addiert", () => {
  const h = base(); const r = wg.evaluateWohngeldRent(h, members(h));
  assert.equal(r.rawEligibleColdRent, 850); assert.equal(r.excludedHeating, 200);
});

test("13. Warmwasserkosten werden nicht addiert", () => {
  const h = base(); const r = wg.evaluateWohngeldRent(h, members(h));
  assert.equal(r.rawEligibleColdRent, 850); assert.equal(r.excludedWarmWater, 30);
});

test("14. Haushaltsstrom wird nicht addiert", () => {
  const h = base(); const r = wg.evaluateWohngeldRent(h, members(h));
  assert.equal(r.rawEligibleColdRent, 850); assert.equal(r.excludedHouseholdEnergy, 60);
});

test("15. Stellplatz wird nicht addiert", () => {
  const h = base(); const r = wg.evaluateWohngeldRent(h, members(h));
  assert.equal(r.rawEligibleColdRent, 850); assert.equal(r.excludedParking, 50);
});

test("16. D3-Gesamtwohnkosten werden nicht blind übernommen", () => {
  const h = base({ recognizedHousingCosts: 9999, parentNeed: { recognizedHousingCosts: 8888 } });
  assert.equal(wg.evaluateWohngeldRent(h, members(h)).rawEligibleColdRent, 850);
});

test("17. Zinsen zählen zum Kapitaldienst", () => {
  const h = base({ housingType: "owner" });
  assert.equal(wg.evaluateWohngeldOwnerBurden(h, members(h)).annualCapitalService, 4000);
});

test("18. Tilgung zählt zum Kapitaldienst", () => {
  const h = base({ housingType: "owner" });
  h.wohngeldData.ownerCosts.annualPrincipalRepayment = "3000";
  assert.equal(wg.evaluateWohngeldOwnerBurden(h, members(h)).annualCapitalService, 4600);
});

test("19. WG-Tilgung verändert die getrennten KiZ-D3-Rohdaten nicht", () => {
  const h = base({ housingType: "owner" });
  const before = JSON.stringify(h.housingCosts.owner);
  wg.evaluateWohngeldOwnerBurden(h, members(h));
  assert.equal(JSON.stringify(h.housingCosts.owner), before);
  assert.equal(Object.hasOwn(h.housingCosts.owner, "annualPrincipalRepayment"), false);
});

test("20. 100 Quadratmeter ergeben 3600 EUR Bewirtschaftungspauschale", () => {
  const h = base({ housingType: "owner" });
  h.wohngeldData.ownerCosts.annualPropertyTax = "0";
  h.wohngeldData.ownerCosts.annualThirdPartyAdministrationCosts = "0";
  assert.equal(wg.evaluateWohngeldOwnerBurden(h, members(h)).annualManagementBurden, 3600);
});

test("21. Grundsteuer kommt zusätzlich hinzu", () => {
  const h = base({ housingType: "owner" });
  assert.equal(wg.evaluateWohngeldOwnerBurden(h, members(h)).annualManagementBurden, 4200);
});

test("22. echte Drittverwaltung kommt zusätzlich hinzu", () => {
  const h = base({ housingType: "owner" });
  h.wohngeldData.ownerCosts.annualPropertyTax = "0";
  assert.equal(wg.evaluateWohngeldOwnerBurden(h, members(h)).annualManagementBurden, 3800);
});

test("23. Gebäudeversicherung wird nicht doppelt addiert", () => {
  const h = base({ housingType: "owner" });
  const r = wg.evaluateWohngeldOwnerBurden(h, members(h));
  assert.equal(r.annualManagementBurden, 4200); assert.equal(r.excludedActualBuildingInsurance, 800);
});

test("24. tatsächliche Heizkosten werden nicht als Bewirtschaftung addiert", () => {
  const h = base({ housingType: "owner" });
  const r = wg.evaluateWohngeldOwnerBurden(h, members(h));
  assert.equal(r.annualManagementBurden, 4200); assert.equal(r.excludedActualHeating, 1200);
});

test("25. Jahresbelastung geteilt durch 12 ergibt Roh-Monatsbelastung", () => {
  const h = base({ housingType: "owner" });
  const r = wg.evaluateWohngeldOwnerBurden(h, members(h));
  assert.equal(r.annualOwnerBurden, 8200); assert.equal(r.monthlyOwnerBurdenRaw, 683.3333333333);
});

test("51. Foundation enthält die Haushaltszahl", () => {
  assert.equal(wg.evaluateWohngeldFoundation(base(), [], { householdId: "A" }).preparedForWohngeldFormula.householdMemberCount, 1);
});

test("52. Foundation enthält Roh-Miete oder Belastung", () => {
  assert.equal(wg.evaluateWohngeldFoundation(base(), [], { householdId: "A" }).preparedForWohngeldFormula.rawMonthlyRentOrBurden, 850);
});

test("53. Foundation enthält Y", () => {
  assert.equal(wg.evaluateWohngeldFoundation(base(), [], { householdId: "A" }).preparedForWohngeldFormula.monthlyTotalIncomeY, 0);
});

test("54. Foundation enthält die Mietstufe", () => {
  assert.equal(wg.evaluateWohngeldFoundation(base(), [], { householdId: "A" }).preparedForWohngeldFormula.mietstufe, "III");
});

test("55. Foundation enthält noch keinen finalen Wohngeldbetrag", () => {
  const r = wg.evaluateWohngeldFoundation(base(), [], { householdId: "A" });
  assert.equal(r.finalWohngeldAmount, null); assert.ok(r.remainingSteps.includes("SECTION_19_FORMULA_NOT_APPLIED"));
});

test("56. Foundation mutiert Eingabeobjekte nicht", () => {
  const h = base(); const before = JSON.stringify(h);
  wg.evaluateWohngeldFoundation(h, [], { householdId: "A" });
  assert.equal(JSON.stringify(h), before);
});

let failed = 0;
tests.forEach(({ name, run }) => {
  try { run(); console.log(`OK ${name}`); }
  catch (error) { failed += 1; console.error(`FEHLER ${name}`); console.error(error.stack || error); }
});
console.log(`\n${tests.length - failed}/${tests.length} Wohngeld-Wohnkostentests erfolgreich.`);
if (failed) process.exitCode = 1;
