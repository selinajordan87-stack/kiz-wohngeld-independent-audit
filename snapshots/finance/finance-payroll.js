(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.FinancePayroll = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";
  const RULE_ID = "FIN-PAYROLL-001";
  const money = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
  const number = (n) => n === "" || n === null || n === undefined ? null : Number.isFinite(Number(n)) ? Number(n) : null;
  const WAGES = Object.freeze({ 2026: { minimum: 13.9, mini: 603 }, 2027: { minimum: 14.6, mini: 633 } });
  const JOBS = Object.freeze(["L0", "L1", "L2", "L3", "L4", "L5"]);

  function grossForMonth(job, month, options = {}) {
    if (!JOBS.includes(job)) throw new Error("Unbekannte Beschäftigungsvariante.");
    const rates = WAGES[Number(String(month).slice(0, 4))];
    if (job === "L0") return 0;
    if (!rates) return null;
    if (job === "L1") return rates.mini;
    const hours = number(options.hours) ?? (["L2", "L3"].includes(job) ? 60 : 80);
    const wage = ["L2", "L4"].includes(job) ? rates.minimum : number(options.hourlyWage) ?? 15;
    if (hours < 0 || wage < rates.minimum) throw new Error("Arbeitszeit oder Stundenlohn unzulässig.");
    return money(hours * wage);
  }

  // Standardfall RLP, unter 23, reguläre Beschäftigung, keine Mehrfachbeschäftigung.
  // Steuerbeträge kommen aus einer Abrechnung / PAP, nicht aus einer Ersatzformel.
  function calculate(job, month, options = {}) {
    const year = Number(String(month).slice(0, 4));
    const gross = grossForMonth(job, month, options);
    const result = { ruleId: RULE_ID, job, month, gross, net: null, deductions: {}, openChecks: [], status: "UNRESOLVED" };
    const done = () => {
      result.openChecks = [...new Set(result.openChecks)];
      if (!result.openChecks.length) {
        result.net = money(gross - Object.values(result.deductions).reduce((a, b) => a + b, 0));
        result.status = "CALCULATED";
      }
      return result;
    };
    if (gross === null) { result.openChecks.push("PAYROLL_YEAR_UNSUPPORTED"); return done(); }
    if (gross === 0) return done();
    if (job === "L1") {
      if (!["exempt", "mandatory"].includes(options.miniPension)) result.openChecks.push("MINIJOB_PENSION_STATUS_REQUIRED");
      else result.deductions.pensionInsurance = options.miniPension === "mandatory" ? money(gross * .036) : 0;
      const tax = number(options.miniTaxPassedOn);
      if (tax === null || tax < 0) result.openChecks.push("MINIJOB_TAX_PASS_ON_REQUIRED");
      else result.deductions.tax = tax;
      if (options.commercialMinijob !== true) result.openChecks.push("COMMERCIAL_MINIJOB_CONFIRMATION_REQUIRED");
      return done();
    }
    if (options.regularEmployment !== true) result.openChecks.push("REGULAR_EMPLOYMENT_STATUS_REQUIRED");
    if (options.under23 !== true) result.openChecks.push("PAYROLL_PV_AGE_SPECIAL_CASE");
    if (year !== 2026) { result.openChecks.push("PAYROLL_CONTRIBUTION_YEAR_UNVERIFIED"); return done(); }
    const g = WAGES[year].mini;
    if (gross <= g || gross > 2000) { result.openChecks.push("PAYROLL_OUTSIDE_SUPPORTED_MIDI_RANGE"); return done(); }
    result.employeeContributionBase = money(2000 / (2000 - g) * (gross - g));
    result.totalContributionBase = money(.6619 * g + (2000 / (2000 - g) - g / (2000 - g) * .6619) * (gross - g));
    const b = result.employeeContributionBase;
    result.deductions.pensionInsurance = money(b * .093);
    result.deductions.unemploymentInsurance = money(b * .013);
    result.deductions.careInsurance = money(b * .018);
    const extra = number(options.additionalHealthRate);
    if (extra === null || extra < 0 || extra > 20) result.openChecks.push("HEALTH_ADDITIONAL_RATE_REQUIRED");
    else result.deductions.healthInsurance = money(b * (.146 + extra / 100) / 2);
    for (const key of ["tax", "solidarity"]) {
      const amount = number(options[key]);
      if (amount === null || amount < 0) result.openChecks.push(`PAYROLL_${key.toUpperCase()}_AMOUNT_REQUIRED`);
      else result.deductions[key] = amount;
    }
    return done();
  }
  return { RULE_ID, JOBS, WAGES, grossForMonth, calculate };
});
