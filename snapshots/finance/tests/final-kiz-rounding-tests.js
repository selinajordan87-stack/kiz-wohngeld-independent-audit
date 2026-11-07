"use strict";

const assert = require("node:assert/strict");
const calculator = require("../calculator.js");
const fixtures = require("./final-kiz-tests.js");

const tests = [];
const test = (name, run) => tests.push({ name, run });
const final = (state) => calculator.calculateKinderzuschlag(state, fixtures.valid).households.A;

function grossState(gross) {
  const state = fixtures.state();
  state.households.A.applicantIncomeSources = [fixtures.adultIncome(gross)];
  state.households.A.housingBenefit = "1500";
  return state;
}

function parentAssetState(assetValue) {
  const state = fixtures.state();
  state.households.A.assetsStatus = "yes";
  state.households.A.assetPersons = fixtures.assetPersons([fixtures.asset("app", assetValue)], { c1: [] });
  state.households.A.housingBenefit = "1500";
  return state;
}

test("1. final rounding maps 0.00 to 0", () => assert.equal(calculator.roundFinalKizToEuro(0), 0));
test("2. final rounding maps 0.01 to 0", () => assert.equal(calculator.roundFinalKizToEuro(0.01), 0));
test("3. final rounding maps 0.49 to 0", () => assert.equal(calculator.roundFinalKizToEuro(0.49), 0));
test("4. final rounding maps 0.50 to 1", () => assert.equal(calculator.roundFinalKizToEuro(0.5), 1));
test("5. final rounding maps 1.49 to 1", () => assert.equal(calculator.roundFinalKizToEuro(1.49), 1));
test("6. final rounding maps 1.50 to 2", () => assert.equal(calculator.roundFinalKizToEuro(1.5), 2));
test("7. final rounding maps 503.49 to 503", () => assert.equal(calculator.roundFinalKizToEuro(503.49), 503));
test("8. final rounding maps 503.50 to 504", () => assert.equal(calculator.roundFinalKizToEuro(503.5), 504));
test("9. final rounding rejects negative values", () => assert.equal(calculator.roundFinalKizToEuro(-0.01), null));
test("10. final rounding rejects non-finite values", () => assert.equal(calculator.roundFinalKizToEuro(Number.NaN), null));
test("11. child amount is not rounded before household addition", () => { const c = fixtures.child("c1", "A", { hasOwnIncome: "yes", incomeSources: [fixtures.childIncomeSource("c1", 1)] }); const r = final(fixtures.state({ centralChildren: [c] })); assert.equal(r.amounts.afterChildIncome, 296.55); assert.equal(r.childResults[0].kizAfterChildIncome, 296.55); });
test("12. parent-income reduction remains unrounded", () => { const r = final(grossState(1500)); assert.equal(r.amounts.afterParentIncome, 240.606); });
test("13. household amount is rounded only after parent-income reduction", () => { const r = final(grossState(1500)); assert.equal(r.amounts.month1BeforeFinalRounding, 240.606); assert.equal(r.amounts.month1Payable, 241); });
test("14. exact asset-adjusted month-one amount 0.50 rounds to 1", () => { const r = final(parentAssetState(55296.5)); assert.equal(r.amounts.month1BeforeFinalRounding, 0.5); assert.equal(r.amounts.month1Payable, 1); });
test("15. month one 0.49 with positive later months stays unresolved", () => { const r = final(parentAssetState(55296.51)); assert.equal(r.amounts.month1Payable, 0); assert.equal(r.status, "UNRESOLVED"); assert.ok(r.blockingOpenChecks.includes("MONTH1_ZERO_AFTER_ROUNDING_WITH_LATER_ASSET_FREE_MONTHS_OPEN")); });
test("16. uniform final amount about 0.49 is not entitled", () => { const r = final(grossState(2033.591111111111)); assert.ok(Math.abs(r.amounts.month1BeforeFinalRounding - 0.49) < 1e-8); assert.equal(r.amounts.month1Payable, 0); assert.equal(r.decisionReason, "FINAL_AMOUNT_ROUNDS_TO_ZERO"); });
test("17. uniform final amount above 0.50 rounds to 1", () => { const r = final(grossState(2033.568)); assert.ok(r.amounts.month1BeforeFinalRounding >= 0.5); assert.equal(r.amounts.month1Payable, 1); });
test("18. final amount 10.49 rounds to 10", () => { const r = final(grossState(2011.3688888888887)); assert.ok(Math.abs(r.amounts.month1BeforeFinalRounding - 10.49) < 1e-8); assert.equal(r.amounts.month1Payable, 10); });
test("19. final amount above 10.50 rounds to 11", () => { const r = final(grossState(2011.346)); assert.ok(r.amounts.month1BeforeFinalRounding >= 10.5); assert.equal(r.amounts.month1Payable, 11); });
test("20. helper rounds a large value below half down", () => assert.equal(calculator.roundFinalKizToEuro(9999.49), 9999));
test("21. helper rounds a large value at half up", () => assert.equal(calculator.roundFinalKizToEuro(9999.5), 10000));
test("22. six-month sum uses six monthly rounded values", () => { const r = final(grossState(1500)); assert.equal(r.amounts.sixMonthFinalPayableTotal, 6 * 241); assert.notEqual(r.amounts.sixMonthFinalPayableTotal, calculator.roundFinalKizToEuro(6 * 240.606)); });
test("23. positive rounded amount below 5 remains entitlement with lump-sum timing", () => { const r = final(grossState(2025)); assert.equal(r.amounts.month1Payable, 4); assert.equal(r.status, "CALCULATED_ENTITLED"); assert.equal(r.paymentTiming, "SMALL_AMOUNT_LUMP_SUM_AFTER_BWZ"); });
test("24. zero after all reductions is not a positive entitlement", () => { const r = final(grossState(2200)); assert.equal(r.amounts.month1Payable, 0); assert.equal(r.status, "CALCULATED_NOT_ENTITLED"); });
test("25. asset reduction itself stays at cent precision before final rounding", () => { const r = final(parentAssetState(55296.5)); assert.equal(r.childResults[0].childAssetReductionMonth1, 0); assert.equal(r.amounts.month1BeforeFinalRounding, 0.5); });

let failed = 0;
tests.forEach(({ name, run }) => {
  try { run(); console.log(`OK ${name}`); }
  catch (error) { failed += 1; console.error(`FEHLER ${name}`); console.error(error.stack || error); }
});
console.log(`${tests.length - failed}/${tests.length} D9-Schlussrundungstests erfolgreich.`);
if (failed) process.exitCode = 1;

