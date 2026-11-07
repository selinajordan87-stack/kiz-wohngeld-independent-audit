"use strict";
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
let loadedVersion;

function load(version) {
  if (!["main", "finance"].includes(version)) throw new Error("version muss main oder finance sein");
  if (loadedVersion && loadedVersion !== version) throw new Error("Versionen in getrennten Node-Prozessen laden");
  loadedVersion = version;
  const at = name => require(path.join(root, "snapshots", version, name + ".js"));
  const modules = {
    rules:at("calculation-rules"), parameters:at("wohngeld-data"), parentData:at("parent-need-data"),
    wohngeld:at("wohngeld"), calculator:at("calculator"), validation:at("validation"),
    forecast:at("ux-income-forecast"), comparison:at("scenario-comparison"),
  };
  if (version === "finance") { modules.payroll = at("finance-payroll"); modules.finance = at("finance-scenarios"); }
  return modules;
}

// Dieser Hinweisprüfer verändert keine Eingabe und berechnet keine Leistung.
function lintMetadata(input) {
  const bike = input.payrollEvidence;
  if (!bike) return [];
  const issues = [];
  if (bike.alreadyIncludedInConsolidatedGross && Number(bike.benefitAddedAgain) !== 0) issues.push("DOUBLE_COUNTING_RISK");
  if (bike.salarySacrificeAlreadyInPayroll && Number(bike.sacrificeDeductedAgain) !== 0) issues.push("DOUBLE_DEDUCTION_RISK");
  return issues;
}

function evaluate(input, version = "main") {
  const modules = load(version);
  const provenance = require("../provenance/source-integrity.json").sources.find(x => x.label === version);
  if (input.operation === "payroll") {
    if (!modules.payroll) return {version, provenance, status:"NOT_PRESENT_IN_VERSION"};
    return {version, provenance, status:"OBSERVATION", result:modules.payroll.calculate(input.job,input.month,input.options || {})};
  }
  if (input.operation === "finance") {
    if (!modules.finance) return {version, provenance, status:"NOT_PRESENT_IN_VERSION"};
    return {version, provenance, status:"OBSERVATION", result:modules.finance.runMatrix(input.config)};
  }
  if (input.operation === "forecast") {
    const state = structuredClone(input.state);
    let index=0;
    return {version, provenance, status:"OBSERVATION", result:modules.forecast.prepareConfirmedCurrentIncome(state, input.householdId || "A", input.personKey || "applicant",()=>`audit-forecast-${++index}`), state};
  }
  const state = structuredClone(input.state || input);
  const id = input.householdId || "A";
  const c = modules.calculator;
  const validation = modules.validation.validateCalculatorState(state);
  const household = state.households?.[id];
  if (!household) throw new Error("Angeforderter Haushalt fehlt");
  const year = Number(state.applicationYear);
  const output = {
    version, provenance, caseId:input.caseId || null,
    evidenceKind:input.evidenceKind || "UNSPECIFIED_INPUT",
    note:"Unveränderte Engine-Ausgabe; keine amtliche oder rechtlich bestätigte Sollberechnung.",
    adapterWarnings:[...(year !== 2026 ? ["KIZ_RULES_FIXED_TO_2026_REVIEW_REQUIRED"] : []), ...lintMetadata(input)],
    validation,
    assessmentPeriod:c.createAssessmentPeriod(state.applicationMonth, state.applicationYear),
    kiz:c.calculateKinderzuschlag(state, validation),
    intermediate:{
      minimumIncome:c.evaluateMinimumIncome(state, id),
      adultIncome:c.evaluateAdultIncomeForHousehold(state, id),
      childAssignments:(state.centralChildren || []).map(child=>c.evaluateChildMemberships(state, id, child)),
      maximumKiz:c.evaluateMaximumKizForHousehold(state, id),
      childIncome:c.evaluateChildIncomeReductionsForHousehold(state, id),
      parentNeed:c.evaluateParentNeedForHousehold(state, id),
      parentIncomeReduction:c.evaluateParentIncomeReduction(state, id),
      familyNeed:c.evaluateFamilySgbIINeed(state, id),
      coverage:c.evaluateCoverage(state, id),
    },
    wohngeld:modules.wohngeld.evaluateWohngeld(household,state.centralChildren || [],{householdId:id,applicationYear:year,applicationMonth:state.applicationMonth}),
    parameters:{sourceStand:c.SOURCE_STAND,parentRuleNeeds:c.PARENT_RULE_NEEDS_2026,childRuleNeeds:c.CHILD_RULE_NEEDS_2026,childBenefit:c.CHILD_BENEFIT_2026,parentHousingPercentages:c.PARENT_HOUSING_PERCENTAGES,wohngeld:modules.parameters},
  };
  return output;
}
function argument(flag, fallback) { const i = process.argv.indexOf(flag); return i < 0 ? fallback : process.argv[i+1]; }
if (require.main === module) {
  try {
    const inputFile = argument("--input");
    if (!inputFile) throw new Error("Aufruf: node audit/run-case.js --version main|finance --input cases/DATEI.json [--output outputs/DATEI.json]");
    const output = JSON.stringify(evaluate(JSON.parse(fs.readFileSync(inputFile,"utf8")), argument("--version","main")),null,2) + "\n";
    const target = argument("--output");
    if (target) { fs.mkdirSync(path.dirname(target),{recursive:true}); fs.writeFileSync(target,output); }
    else process.stdout.write(output);
  } catch (error) { console.error(error.stack); process.exitCode = 1; }
}
module.exports = {evaluate, load, lintMetadata};
