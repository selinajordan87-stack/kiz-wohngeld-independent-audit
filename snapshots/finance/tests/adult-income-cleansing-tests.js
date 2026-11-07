const assert = require("node:assert/strict");
const calculator = require("../calculator.js");
const validation = require("../validation.js");
const parentNeedData = require("../parent-need-data.js");

const avg = (monthlyAverage, extra = {}) => ({ enabled: true, entryMethod: "average", monthlyAverage: String(monthlyAverage), monthlyValues: ["", "", "", "", "", ""], ...extra });
const income = (overrides = {}) => ({
  id: overrides.id || "income-1",
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
});
const expense = (expenseType, amount, overrides = {}) => ({
  id: overrides.id || `expense-${expenseType}`,
  personRole: "applicant",
  expenseType,
  entryMethod: "average",
  monthlyAverage: String(amount),
  monthlyValues: ["", "", "", "", "", ""],
  ...overrides,
});
const calculate = (sources = [], expenses = [], context = {}) => calculator.calculateAdultIncomeForMonth({ personRole: "applicant", incomeSources: sources, expenses }, 0, context);
const hasOpen = (result, code) => result.openChecks.includes(code);
const validationState = (sources = [], expenses = []) => ({
  dataVersion: 10, applicationMonth: 7, applicationYear: 2026, mode: "single", centralChildren: [],
  households: {
    A: {
      label: "Haushalt A", adults: "single", person1: "Person", partner: "", applicantIncomeSources: sources, partnerIncomeSources: [], applicantExpenses: expenses, partnerExpenses: [],
      housingType: "rent", housingCosts: { rent: { coldRent: "500", coldUtilities: "100", heating: "100", costMonth: "2026-07", sublettingStatus: "no", sublettingAmount: "", parkingAmount: "", parkingInseparableStatus: "no" }, owner: {} },
      housingBenefitStatus: "none", housingBenefit: "", otherResidents: 0, hotWaterType: "central", decentralHotWaterAdults: { applicant: "no", partner: "no" }, specialSituations: [], assetsStatus: "no", additionalNeedOverride: "",
    },
    B: {},
  },
});
const tests = [];
const test = (name, run) => tests.push({ name, run });

test("1. D5-Regel-IDs sind stabil", () => {
  assert.equal(calculator.RULE_IDS.adultDeduction, "KIZ-ADULT-DEDUCTION-001");
  assert.equal(calculator.RULE_IDS.childBenefitSurplus, "KIZ-CHILD-BENEFIT-SURPLUS-001");
});
test("2. Person ohne Einkommen hat einen unterstützten Nullmonat", () => {
  const result = calculate(); assert.equal(result.status, "SUPPORTED"); assert.equal(result.finalCountableIncome, 0);
});
test("3. Haushalt ohne Einkommen liefert sechs Nullen", () => {
  const result = calculator.evaluateAdultIncomeForHousehold({ applicationMonth: 7, applicationYear: 2026, centralChildren: [], households: { A: { adults: "single", applicantIncomeStatus: "none", applicantIncomeSources: [], applicantExpenses: [] } } }, "A").personResults.applicant;
  assert.deepEqual(result.monthlyCountableIncome, [0, 0, 0, 0, 0, 0]); assert.equal(result.monthlyAverageAfterFinalCleansing, 0);
});
test("4. average repliziert denselben Monatsbetrag", () => {
  const result = calculator.evaluateAdultIncomeForHousehold({ applicationMonth: 7, applicationYear: 2026, centralChildren: [], households: { A: { adults: "single", applicantIncomeSources: [income()], applicantExpenses: [] } } }, "A").personResults.applicant;
  assert.equal(new Set(result.monthlyCountableIncome).size, 1); assert.equal(result.monthlyCountableIncome[0], 392);
});
test("5. sechs Einzelmonate werden einzeln nichtlinear bereinigt", () => {
  const src = income({ entryMethod: "monthly", monthlyAverage: "", monthlyValues: ["0", "100", "520", "600", "1000", "1200"] });
  const state = { applicationMonth: 7, applicationYear: 2026, centralChildren: [], households: { A: { adults: "single", applicantIncomeSources: [src], applicantExpenses: [] } } };
  assert.deepEqual(calculator.evaluateAdultIncomeForHousehold(state, "A").personResults.applicant.monthlyCountableIncome, [0, 0, 336, 392, 672, 852]);
});
test("6. Monatsengine verändert Eingaben nicht", () => {
  const person = { personRole: "applicant", incomeSources: [income()], expenses: [] }; const before = JSON.stringify(person); calculate(person.incomeSources); assert.equal(JSON.stringify(person), before);
});
test("7. zwei Jobs erhalten nur einen Personen-Grundabsetzbetrag", () => {
  assert.equal(calculate([income({ monthlyAverage: "300" }), income({ id: "income-2", monthlyAverage: "300" })]).finalCountableIncome, 392);
});
test("8. Beschäftigungsnetto bleibt offen", () => assert.equal(calculate([income({ amountType: "net" })]).status, "UNRESOLVED"));
test("9. Minijob wird als Erwerbseinkommen bereinigt", () => assert.equal(calculate([income({ incomeType: "minijob", monthlyAverage: "520" })]).finalCountableIncome, 336));
test("10. Ausbildung mit unbekanntem 2b-Status bleibt offen", () => assert(hasOpen(calculate([income({ incomeType: "training" })]), "ADULT_TRAINING_2B_STATUS_REQUIRED")));
test("11. Ausbildung mit verneintem Sonderstatus nutzt die allgemeine Regel", () => assert.equal(calculate([income({ incomeType: "training", u25SpecialAllowanceStatus: "no" })]).finalCountableIncome, 392));
test("12. bestätigte U25-Ausbildung nutzt den 603-Euro-Grundbetrag", () => assert.equal(calculate([income({ incomeType: "training", monthlyAverage: "800", u25SpecialAllowanceStatus: "yes" })]).finalCountableIncome, 113));
test("13. gemischte allgemeine und 2b-Erwerbsregime bleiben offen", () => {
  const result = calculate([income({ monthlyAverage: "300" }), income({ id: "training", incomeType: "training", monthlyAverage: "300", u25SpecialAllowanceStatus: "yes" })]);
  assert(hasOpen(result, "MIXED_EARNED_ALLOWANCE_REGIME_UNRESOLVED"));
});
test("14. explizite Nullsteuer ist gültig", () => assert.equal(calculate([income({ deductions: { tax: avg(0) } })]).status, "SUPPORTED"));
test("15. tatsächliche Steuer wird zusätzlich abgezogen", () => assert.equal(calculate([income({ deductions: { tax: avg(20) } })]).finalCountableIncome, 372));
test("16. aktivierte Steuer ohne Betrag blockiert", () => assert(hasOpen(calculate([income({ deductions: { tax: avg("") } })]), "DEDUCTION_AMOUNT_REQUIRED")));
test("17. bestätigte Krankenversicherung wird als Pflichtbeitrag abgezogen", () => assert.equal(calculate([income({ deductions: { healthInsurance: avg(50, { mandatoryStatus: "yes" }) } })]).finalCountableIncome, 342));
test("18. bestätigte Pflegeversicherung wird als Pflichtbeitrag abgezogen", () => assert.equal(calculate([income({ deductions: { careInsurance: avg(20, { mandatoryStatus: "yes" }) } })]).finalCountableIncome, 372));
test("19. bestätigte Rentenversicherung wird als Pflichtbeitrag abgezogen", () => assert.equal(calculate([income({ deductions: { pensionInsurance: avg(60, { mandatoryStatus: "yes" }) } })]).finalCountableIncome, 332));
test("20. bestätigte Arbeitslosenversicherung wird als Pflichtbeitrag abgezogen", () => assert.equal(calculate([income({ deductions: { unemploymentInsurance: avg(10, { mandatoryStatus: "yes" }) } })]).finalCountableIncome, 382));
test("21. unbekannter Pflichtbeitragsstatus blockiert", () => assert(hasOpen(calculate([income({ deductions: { healthInsurance: avg(50, { mandatoryStatus: "unknown" }) } })]), "SOCIAL_INSURANCE_MANDATORY_STATUS_REQUIRED")));
test("22. ausdrücklich kein Pflichtbeitrag wird nicht als Nr. 2 abgezogen", () => assert.equal(calculate([income({ deductions: { healthInsurance: avg(50, { mandatoryStatus: "no" }) } })]).finalCountableIncome, 392));
test("23. tatsächliche Steuern mehrerer Jobs werden addiert", () => {
  const result = calculate([income({ monthlyAverage: "300", deductions: { tax: avg(10) } }), income({ id: "i2", monthlyAverage: "300", deductions: { tax: avg(20) } })]); assert.equal(result.deductionLedger.taxes, 30); assert.equal(result.finalCountableIncome, 362);
});
test("24. ausschließlich anderes Einkommen erhält einmal 30 Euro", () => assert.equal(calculate([income({ incomeType: "sick-pay", amountType: "notice", monthlyAverage: "150" })]).finalCountableIncome, 120));
test("25. zwei sonstige Quellen vervielfachen die 30-Euro-Pauschale nicht", () => assert.equal(calculate([income({ incomeType: "sick-pay", amountType: "notice", monthlyAverage: "80" }), income({ id: "i2", incomeType: "adult-maintenance", amountType: "notice", monthlyAverage: "70" })]).finalCountableIncome, 120));
test("26. Versicherungspauschale drückt anderes Einkommen nicht unter null", () => assert.equal(calculate([income({ incomeType: "unemployment-1", amountType: "notice", monthlyAverage: "20" })]).finalCountableIncome, 0));
test("27. bei Erwerb wird die 30-Euro-Pauschale nicht zusätzlich angesetzt", () => assert.equal(calculate([income()]).deductionLedger.insuranceFlatAppliedToOther, 0));
test("28. amtliches Übertragungsbeispiel 40 plus 150 und 65 Nr. 3/4 ergibt 25", () => {
  const result = calculate([income({ monthlyAverage: "40" }), income({ id: "other", incomeType: "adult-maintenance", amountType: "notice", monthlyAverage: "150" })], [expense("car-liability", 35, { liabilityOnlyConfirmed: "yes", proofStatus: "complete" })]);
  assert.equal(result.deductionLedger.transferredNr3And4, 25); assert.equal(result.finalCountableIncome, 125);
});
test("29. amtliches Übertragungsbeispiel 150 plus 150 und 105 Nr. 3/4 ergibt 5", () => {
  const result = calculate([income({ monthlyAverage: "150" }), income({ id: "other", incomeType: "adult-maintenance", amountType: "notice", monthlyAverage: "150" })], [expense("car-liability", 75, { liabilityOnlyConfirmed: "yes", proofStatus: "complete" })]);
  assert.equal(result.deductionLedger.transferredNr3And4, 5); assert.equal(result.finalCountableIncome, 185);
});
test("30. ungenutzter 100-Euro-Grundbetrag wird nicht übertragen", () => assert.equal(calculate([income({ monthlyAverage: "40" }), income({ id: "o", incomeType: "sick-pay", amountType: "notice", monthlyAverage: "150" })]).finalCountableIncome, 150));
test("31. Nr.-5-Fahrtkosten werden nicht auf anderes Einkommen übertragen", () => {
  const result = calculate([income({ monthlyAverage: "40" }), income({ id: "o", incomeType: "sick-pay", amountType: "notice", monthlyAverage: "150" })], [expense("commute", 50, { commuteMode: "amount", legalDeductibleAmountConfirmed: "yes" })]); assert.equal(result.deductionLedger.transferredNr3And4, 0); assert.equal(result.finalCountableIncome, 150);
});
test("32. tatsächliche Nr.-3-bis-5-Beträge über 100 ersetzen bei Brutto über 400 den Grundbetrag", () => {
  const result = calculate([income({ monthlyAverage: "500" })], [expense("car-liability", 80, { liabilityOnlyConfirmed: "yes", proofStatus: "complete" })]); assert.equal(result.deductionLedger.useActualInsteadOfBasic, true); assert.equal(result.finalCountableIncome, 310);
});
test("33. tatsächliche Aufwendungen bis 100 ersetzen den Grundbetrag nicht", () => assert.equal(calculate([income({ monthlyAverage: "500" })], [expense("car-liability", 60, { liabilityOnlyConfirmed: "yes", proofStatus: "complete" })]).finalCountableIncome, 320));
test("34. bei exakt 400 Brutto bleibt der 100-Euro-Grundbetrag maßgeblich", () => assert.equal(calculate([income({ monthlyAverage: "400" })], [expense("car-liability", 100, { liabilityOnlyConfirmed: "yes", proofStatus: "complete" })]).finalCountableIncome, 240));
test("35. bei 100 Brutto ist der Erwerbstätigenfreibetrag 0", () => assert.equal(calculate([income({ monthlyAverage: "100" })]).deductionLedger.earnedIncomeAllowance, 0));
test("36. bei 520 Brutto beträgt der Erwerbstätigenfreibetrag 84", () => assert.equal(calculate([income({ monthlyAverage: "520" })]).deductionLedger.earnedIncomeAllowance, 84));
test("37. bei 1000 Brutto beträgt der Erwerbstätigenfreibetrag 228", () => assert.equal(calculate([income({ monthlyAverage: "1000" })]).deductionLedger.earnedIncomeAllowance, 228));
test("38. bei 1200 Brutto beträgt der Erwerbstätigenfreibetrag 248", () => assert.equal(calculate([income({ monthlyAverage: "1200" })]).deductionLedger.earnedIncomeAllowance, 248));
test("39. bestätigtes minderjähriges BG-Kind öffnet die Stufe bis 1500", () => assert.equal(calculate([income({ monthlyAverage: "1500" })], [], { minorChildInSgbIIBg: true }).deductionLedger.earnedIncomeAllowance, 278));
test("40. Brutto über 1200 ohne geklärten Kinderstatus bleibt offen", () => assert(hasOpen(calculate([income({ monthlyAverage: "1300" })]), "MINOR_CHILD_OUTSIDE_BG_STATUS_REQUIRED")));
test("41. Pkw-Details nutzen nur die einfache Entfernung mit 0,20 Euro", () => {
  const result = calculate([income()], [expense("commute", "", { commuteMode: "details", distanceKm: "10", workDaysPerMonth: "20", reasonablePublicTransport: "no" })]); assert.equal(result.personExpensePositions[0].details.calculatedCarCommuteFlat, 40);
});
test("42. zumutbarer günstigerer ÖPNV begrenzt die Pkw-Pauschale", () => {
  const result = calculate([income()], [expense("commute", "", { commuteMode: "details", distanceKm: "20", workDaysPerMonth: "20", reasonablePublicTransport: "yes", monthlyPublicTransportAlternativeCost: "49" })]); assert.equal(result.personExpensePositions[0].consideredAmount, 49);
});
test("43. teurerer ÖPNV lässt die niedrigere Pkw-Pauschale maßgeblich", () => {
  const result = calculate([income()], [expense("commute", "", { commuteMode: "details", distanceKm: "10", workDaysPerMonth: "20", reasonablePublicTransport: "yes", monthlyPublicTransportAlternativeCost: "60" })]); assert.equal(result.personExpensePositions[0].consideredAmount, 40);
});
test("44. unbekannte ÖPNV-Zumutbarkeit blockiert", () => assert(hasOpen(calculate([income()], [expense("commute", "", { commuteMode: "details", distanceKm: "10", workDaysPerMonth: "20", reasonablePublicTransport: "unknown" })]), "REASONABLE_PUBLIC_TRANSPORT_STATUS_REQUIRED")));
test("45. einfache Entfernung wird nicht als Hin- und Rückweg verdoppelt", () => {
  const result = calculate([income()], [expense("commute", "", { commuteMode: "details", distanceKm: "1", workDaysPerMonth: "1", reasonablePublicTransport: "no" })]); assert.equal(result.personExpensePositions[0].consideredAmount, 0.2);
});
test("46. bestätigter direkter Fahrtbetrag ist unterstützt", () => assert.equal(calculate([income()], [expense("commute", 55, { commuteMode: "amount", legalDeductibleAmountConfirmed: "yes" })]).status, "SUPPORTED"));
test("47. unbestätigter direkter Fahrtbetrag bleibt offen", () => assert(hasOpen(calculate([income()], [expense("commute", 55, { commuteMode: "amount", legalDeductibleAmountConfirmed: "unknown" })]), "COMMUTE_LEGAL_AMOUNT_CONFIRMATION_REQUIRED")));
test("48. selbst getragener ÖPNV-Betrag ist unterstützt", () => assert.equal(calculate([income()], [expense("public-transport", 49)]).personExpensePositions[0].consideredAmount, 49));
test("49. Pkw und ÖPNV für einen ungeklärten selben Arbeitsweg blockieren", () => assert(hasOpen(calculate([income()], [expense("commute", 40, { id: "c", commuteMode: "amount", legalDeductibleAmountConfirmed: "yes" }), expense("public-transport", 49, { id: "p" })]), "DUPLICATE_COMMUTE_COST_CLASSIFICATION_REQUIRED")));
test("50. reine vollständig nachgewiesene Kfz-Haftpflicht ist unterstützt", () => assert.equal(calculate([income()], [expense("car-liability", 35, { liabilityOnlyConfirmed: "yes", proofStatus: "complete" })]).personExpensePositions[0].consideredAmount, 35));
test("51. unvollständige Kfz-Haftpflicht bleibt offen", () => assert(hasOpen(calculate([income()], [expense("car-liability", 35, { liabilityOnlyConfirmed: "yes", proofStatus: "incomplete" })]), "CAR_LIABILITY_PROOF_REQUIRED")));
test("52. reine einkommensverbundene Betreuungskosten sind unterstützt", () => assert.equal(calculate([income()], [expense("childcare", 100, { pureCareCostsConfirmed: "yes", incomeConnectionConfirmed: "yes" })]).personExpensePositions[0].consideredAmount, 100));
test("53. gemischte Betreuungskosten bleiben offen", () => assert(hasOpen(calculate([income()], [expense("childcare", 100, { pureCareCostsConfirmed: "no", incomeConnectionConfirmed: "yes" })]), "CHILDCARE_CONFIRMATIONS_REQUIRED")));
test("54. erforderliche Partnerübertragung von Betreuungskosten bleibt offen", () => assert(hasOpen(calculate([income({ monthlyAverage: "50" })], [expense("childcare", 100, { pureCareCostsConfirmed: "yes", incomeConnectionConfirmed: "yes" })]), "CHILDCARE_PARTNER_TRANSFER_REQUIRED")));
test("55. titulierter tatsächlich gezahlter Unterhalt ist unterstützt", () => assert.equal(calculate([income()], [expense("paid-maintenance", 120, { legalObligationConfirmed: "yes", titleOrNotarialMonthlyMaximum: "150" })]).personExpensePositions[0].consideredAmount, 120));
test("56. Unterhaltsabzug ist auf das Titelmaximum begrenzt", () => assert.equal(calculate([income()], [expense("paid-maintenance", 200, { legalObligationConfirmed: "yes", titleOrNotarialMonthlyMaximum: "150" })]).personExpensePositions[0].consideredAmount, 150));
test("57. allgemeiner Unterhaltsabzug bei gemischten Einkommensklassen bleibt offen", () => assert(hasOpen(calculate([income(), income({ id: "o", incomeType: "sick-pay", amountType: "notice", monthlyAverage: "100" })], [expense("paid-maintenance", 50, { legalObligationConfirmed: "yes", titleOrNotarialMonthlyMaximum: "50" })]), "PAID_MAINTENANCE_INCOME_BUCKET_OPEN")));
test("58. weiterhin nicht automatisierte Ausgabe bleibt positionsbezogen offen", () => assert(hasOpen(calculate([income()], [expense("retirement", 50)]), "RETIREMENT_DEDUCTION_CLASSIFICATION_REQUIRED")));
test("59. amtliches Basiselterngeld-Beispiel 300 minus 250 minus 30 ergibt 20", () => assert.equal(calculate([income({ incomeType: "parental-allowance", amountType: "notice", monthlyAverage: "300", parentalAllowanceType: "basis", confirmedExemptionMonthly: "250" })]).finalCountableIncome, 20));
test("60. Basiselterngeld-Freibetrag ist auf 300 Euro begrenzt", () => assert.equal(calculate([income({ incomeType: "parental-allowance", amountType: "notice", monthlyAverage: "500", parentalAllowanceType: "basis", confirmedExemptionMonthly: "400" })]).finalCountableIncome, 170));
test("61. Elterngeld-Plus-Freibetrag ist auf 150 Euro begrenzt", () => assert.equal(calculate([income({ incomeType: "parental-allowance", amountType: "notice", monthlyAverage: "250", parentalAllowanceType: "plus", confirmedExemptionMonthly: "200" })]).finalCountableIncome, 70));
test("62. defensive Einkommensmigration setzt neue Fachstatus auf unknown", () => {
  const old = { id: "old", deductions: { healthInsurance: avg(50) } }; const before = JSON.stringify(old); const migrated = parentNeedData.migrateAdultIncomeD5Data(old); assert.equal(migrated.parentalAllowanceType, "unknown"); assert.equal(migrated.confirmedExemptionMonthly, ""); assert.equal(migrated.deductions.healthInsurance.mandatoryStatus, "unknown"); assert.equal(JSON.stringify(old), before);
});
test("63. defensive Ausgabenmigration setzt neue Fachstatus auf unknown", () => {
  const old = { id: "old", expenseType: "commute", monthlyAverage: "50" }; const migrated = parentNeedData.migrateAdultExpenseD5Data(old); assert.equal(migrated.reasonablePublicTransport, "unknown"); assert.equal(migrated.legalDeductibleAmountConfirmed, "unknown");
});
test("64. Datenversion 16 enthält weiterhin die D5-Migration", () => assert.equal(parentNeedData.DATA_VERSION, 16));
test("65. bestätigter Elterngeldfreibetrag 0 ist gültig", () => assert.equal(calculate([income({ incomeType: "parental-allowance", amountType: "notice", monthlyAverage: "250", parentalAllowanceType: "plus", confirmedExemptionMonthly: "0" })]).finalCountableIncome, 220));
test("66. leerer Elterngeldfreibetrag bleibt unresolved", () => assert(hasOpen(calculate([income({ incomeType: "parental-allowance", amountType: "notice", parentalAllowanceType: "basis", confirmedExemptionMonthly: "" })]), "PARENTAL_ALLOWANCE_EXEMPTION_AMOUNT_REQUIRED")));
test("67. unbekannte Elterngeldart bleibt unresolved", () => assert(hasOpen(calculate([income({ incomeType: "parental-allowance", amountType: "notice", parentalAllowanceType: "unknown", confirmedExemptionMonthly: "0" })]), "PARENTAL_ALLOWANCE_TYPE_REQUIRED")));
test("68. Antragsteller und Partner werden vor der Haushaltssumme getrennt bereinigt", () => {
  const state = { applicationMonth: 7, applicationYear: 2026, centralChildren: [], households: { A: { adults: "couple", applicantIncomeSources: [income({ monthlyAverage: "600" })], applicantExpenses: [], partnerIncomeSources: [income({ id: "partner", personRole: "partner", monthlyAverage: "600" })], partnerExpenses: [] } } };
  const result = calculator.evaluateAdultIncomeForHousehold(state, "A"); assert.equal(result.personResults.applicant.monthlyAverageAfterFinalCleansing, 392); assert.equal(result.personResults.partner.monthlyAverageAfterFinalCleansing, 392); assert.equal(result.regularIncome.averageTotal, 784);
});
test("69. ein unresolved Monat verhindert den endgültigen Personenmittelwert", () => {
  const src = income({ entryMethod: "monthly", monthlyAverage: "", monthlyValues: ["600", "600", "600", "600", "600", ""] }); const state = { applicationMonth: 7, applicationYear: 2026, centralChildren: [], households: { A: { adults: "single", applicantIncomeSources: [src], applicantExpenses: [] } } }; assert.equal(calculator.evaluateAdultIncomeForHousehold(state, "A").personResults.applicant.monthlyAverageAfterFinalCleansing, null);
});
test("70. Job und Minijob verwenden ein gemeinsames Erwerbsbrutto", () => assert.equal(calculate([income({ monthlyAverage: "300" }), income({ id: "mini", incomeType: "minijob", monthlyAverage: "300" })]).grossEarnedIncome, 600));
test("71. Abzüge erzeugen kein negatives Endergebnis", () => assert.equal(calculate([income({ monthlyAverage: "50", deductions: { tax: avg(100) } })]).finalCountableIncome, 0));
test("72. 860 Euro Krankengeld werden als anderes Einkommen klassifiziert", () => { const result = calculate([income({ incomeType: "sick-pay", amountType: "notice", monthlyAverage: "860" })]); assert.equal(result.sourcePositions[0].incomeClass, "OTHER"); assert.equal(result.finalCountableIncome, 830); });
test("73. ALG I erhält keinen Erwerbstätigenfreibetrag", () => { const result = calculate([income({ incomeType: "unemployment-1", amountType: "notice", monthlyAverage: "860" })]); assert.equal(result.deductionLedger.earnedIncomeAllowance, 0); assert.equal(result.finalCountableIncome, 830); });
test("74. Erwachsenenunterhalt bleibt anderes Einkommen", () => assert.equal(calculate([income({ incomeType: "adult-maintenance", amountType: "notice", monthlyAverage: "200" })]).sourcePositions[0].incomeClass, "OTHER"));
test("75. Mutterschaftsgeld bleibt bestätigtes Nicht-Einkommen", () => { const result = calculate([income({ incomeType: "maternity-benefit", amountType: "notice" })]); assert.equal(result.sourcePositions[0].incomeClass, "NON_INCOME"); assert.equal(result.finalCountableIncome, 0); });
test("76. SGB-II-Leistung bleibt bestätigtes Nicht-Einkommen", () => { const result = calculate([income({ incomeType: "sgb2-benefit", amountType: "notice" })]); assert.equal(result.sourcePositions[0].incomeClass, "NON_INCOME"); assert.equal(result.finalCountableIncome, 0); });
test("77. Selbstständigkeit ist fachlich Erwerb, bleibt ohne Gewinnermittlung unresolved", () => { const result = calculate([income({ incomeType: "self-employed" })]); assert.equal(result.sourcePositions[0].incomeClass, "EARNED"); assert.equal(result.status, "UNRESOLVED"); });
test("78. Rente ist fachlich anderes Einkommen, bleibt ohne Details unresolved", () => { const result = calculate([income({ incomeType: "pension", amountType: "notice" })]); assert.equal(result.sourcePositions[0].incomeClass, "OTHER"); assert.equal(result.status, "UNRESOLVED"); });
test("79. Vermietung bleibt ohne Nettologik unresolved", () => assert.equal(calculate([income({ incomeType: "rental", amountType: "net" })]).status, "UNRESOLVED"));
test("80. Freitext sonstiges Einkommen wird nicht interpretiert", () => assert(hasOpen(calculate([income({ incomeType: "other", amountType: "net", customLabel: "frei" })]), "OTHER_INCOME_CLASSIFICATION_REQUIRED")));
test("V1. Validierung lehnt ungültigen Pflichtbeitragsstatus ab", () => {
  const result = validation.validateCalculatorState(validationState([income({ deductions: { healthInsurance: avg(50, { mandatoryStatus: "maybe" }) } })])); assert(result.errors.some((item) => item.code === "SOCIAL_INSURANCE_MANDATORY_STATUS_INVALID"));
});
test("V2. Validierung lehnt negativen Elterngeldfreibetrag ab", () => {
  const result = validation.validateCalculatorState(validationState([income({ incomeType: "parental-allowance", amountType: "notice", parentalAllowanceType: "basis", confirmedExemptionMonthly: "-1" })])); assert(result.errors.some((item) => item.code === "PARENTAL_ALLOWANCE_EXEMPTION_AMOUNT_INVALID"));
});
test("V3. Validierung akzeptiert expliziten Elterngeldfreibetrag 0", () => {
  const result = validation.validateCalculatorState(validationState([income({ incomeType: "parental-allowance", amountType: "notice", parentalAllowanceType: "basis", confirmedExemptionMonthly: "0" })])); assert.equal(result.errors.some((item) => item.code === "PARENTAL_ALLOWANCE_EXEMPTION_AMOUNT_INVALID"), false);
});
test("V4. Validierung lehnt ungültigen ÖPNV-Status ab", () => {
  const result = validation.validateCalculatorState(validationState([], [expense("commute", "", { commuteMode: "details", distanceKm: "10", workDaysPerMonth: "20", reasonablePublicTransport: "maybe" })])); assert(result.errors.some((item) => item.code === "EXPENSE_PUBLIC_TRANSPORT_STATUS_INVALID"));
});
test("V5. Validierung lehnt negativen ÖPNV-Vergleichsbetrag ab", () => {
  const result = validation.validateCalculatorState(validationState([], [expense("commute", "", { commuteMode: "details", distanceKm: "10", workDaysPerMonth: "20", reasonablePublicTransport: "yes", monthlyPublicTransportAlternativeCost: "-1" })])); assert(result.errors.some((item) => item.code === "EXPENSE_AMOUNT_INVALID"));
});
test("V6. Validierung lehnt ungültigen Kfz-Nachweisstatus ab", () => {
  const result = validation.validateCalculatorState(validationState([], [expense("car-liability", 35, { liabilityOnlyConfirmed: "yes", proofStatus: "maybe" })])); assert(result.errors.some((item) => item.code === "EXPENSE_PROOF_STATUS_INVALID"));
});

let passed = 0;
tests.forEach(({ name, run }) => {
  try { run(); passed += 1; console.log(`OK ${name}`); }
  catch (error) { console.error(`FEHLER ${name}`); throw error; }
});
console.log(`${passed}/${tests.length} Tests für KIZ-INCOME-ADULT-001 und KIZ-ADULT-DEDUCTION-001 (Phase D5) erfolgreich.`);
