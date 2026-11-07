(function (root, factory) {
  const node = typeof module !== "undefined" && module.exports;
  const api = factory(node ? {
    calculator: require("./calculator.js"), validation: require("./validation.js"),
    wohngeld: require("./wohngeld.js"), comparison: require("./scenario-comparison.js"),
    payroll: require("./finance-payroll.js"),
  } : { calculator: root.KizCalculator, validation: root.KizValidation,
    wohngeld: root.WohngeldCalculator, comparison: root.KizScenarioComparison, payroll: root.FinancePayroll });
  if (node) module.exports = api;
  if (root) root.FinanceScenarios = api;
})(typeof window !== "undefined" ? window : globalThis, function (deps) {
  "use strict";
  const RULE_IDS = ["FIN-TIME-001", "FIN-PROCEDURE-001", "FIN-FLOW-001", "FIN-RELIABILITY-001"];
  const clone = (v) => JSON.parse(JSON.stringify(v));
  const finite = (v) => typeof v === "number" && Number.isFinite(v);
  const money = (v) => Math.round((v + Number.EPSILON) * 100) / 100;
  const sum = (values) => values.length && values.every(finite) ? money(values.reduce((a, b) => a + b, 0)) : null;
  const unique = (v) => [...new Set(v.filter(Boolean))];
  const amount = (v) => v === "" || v === undefined || v === null ? null : Number.isFinite(Number(v)) ? Number(v) : null;

  function monthKey(value) {
    if (!/^\d{4}-(0[1-9]|1[0-2])(?:-(0[1-9]|[12]\d|3[01]))?$/.test(String(value))) throw new Error(`Ungültiges Datum: ${value}`);
    const key = String(value).slice(0, 7);
    if (String(value).length === 10 && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) !== value) throw new Error("Ungültiger Kalendertag.");
    return key;
  }
  function shift(key, n) {
    monthKey(key);
    const d = new Date(Date.UTC(Number(key.slice(0, 4)), Number(key.slice(5, 7)) - 1 + n, 1));
    return d.toISOString().slice(0, 7);
  }
  function months(key, count) { return Array.from({ length: count }, (_, i) => shift(key, i)); }
  function ageAt(birthDate, month) {
    monthKey(birthDate); monthKey(month);
    const d = `${month}-01`;
    return Number(d.slice(0, 4)) - Number(birthDate.slice(0, 4)) - (d.slice(5) < birthDate.slice(5) ? 1 : 0);
  }
  function merge(target, patch) {
    Object.entries(patch || {}).forEach(([key, value]) => {
      if (["__proto__", "constructor", "prototype"].includes(key)) throw new Error("Ungültiger Eingabeschlüssel.");
      if (value && typeof value === "object" && !Array.isArray(value)) target[key] = merge(target[key] && typeof target[key] === "object" ? target[key] : {}, value);
      else target[key] = clone(value);
    });
    return target;
  }

  function aggregateReceipts(ledger = []) {
    const totals = {};
    ledger.forEach((entry) => {
      const key = monthKey(entry.paidAt);
      const n = amount(entry.amount);
      if (n === null || n < 0) throw new Error("Ein Zahlungseingang benötigt einen nicht negativen Betrag.");
      totals[key] = money((totals[key] || 0) + n);
    });
    return totals;
  }
  function algEntitlement(month, monthly, startDate, endDate) {
    const key = monthKey(month);
    if (!startDate) return null;
    monthKey(startDate);
    if (endDate) monthKey(endDate);
    const first = `${key}-01`;
    const last = new Date(Date.UTC(Number(key.slice(0, 4)), Number(key.slice(5, 7)), 0)).toISOString().slice(0, 10);
    if (startDate > last || (endDate && endDate < first)) return 0;
    const start = startDate > first ? startDate : first;
    const end = endDate && endDate < last ? endDate : last;
    const days = start === first && end === last ? 30 : Math.round((Date.parse(end) - Date.parse(start)) / 86400000) + 1;
    return money(monthly / 30 * days);
  }

  function createPlan(config, requestedStart) {
    monthKey(requestedStart);
    const existing = config.existingApplication;
    let start = requestedStart;
    const checks = [];
    const protectedExisting = existing && ["pending", "approved"].includes(existing.status);
    const keeping = protectedExisting && requestedStart === existing.start;
    if (protectedExisting && !keeping && config.alternativeStartLegallyCleared !== true) checks.push("EXISTING_APPLICATION_NOT_REPLACED");
    const horizon = shift(config.comparisonStart, config.comparisonMonths || 12);
    const changes = (config.householdEvents || []).filter((e) => e.changesComposition === true).map((e) => monthKey(e.date));
    if (config.partner?.moveInDate) changes.push(monthKey(config.partner.moveInDate));
    const periods = [];
    while (start < horizon && periods.length < 40) {
      let end = shift(start, 5);
      // Die Änderung im Startmonat ist für einen neuen Antrag bereits erfasst.
      const change = changes.filter((k) => k > start && k <= end).sort()[0];
      if (change) end = change;
      periods.push({ start, end, assessmentMonths: deps.calculator.createAssessmentPeriod(Number(start.slice(5)), Number(start.slice(0, 4))).months.map((m) => m.key), reason: change ? "BG_CHANGE_END_OF_MONTH" : "SIX_MONTHS" });
      start = shift(end, 1);
    }
    return { periods, legalStatus: checks.length ? "REQUIRES_CLARIFICATION" : "SUPPORTED_PROCEDURAL_PATH", openChecks: checks, keepingExisting: Boolean(keeping) };
  }

  function optionsFor(config, month) { return { ...(config.partner?.payroll || {}), ...(config.partner?.payrollByYear?.[month.slice(0, 4)] || {}) }; }
  function partnerPay(config, scenario, month) {
    if (scenario.job === "L0" || month < monthKey(scenario.workStart)) return deps.payroll.calculate("L0", month);
    const result = deps.payroll.calculate(scenario.job, month, optionsFor(config, month));
    if (String(scenario.workStart).length === 10 && !scenario.workStart.endsWith("-01") && month === monthKey(scenario.workStart)) {
      result.openChecks.push("PARTIAL_WORK_MONTH_PAYROLL_REQUIRED"); result.net = null; result.status = "UNRESOLVED";
    }
    return result;
  }

  function incomeAt(config, scenario, role, month) {
    const entry = config.incomeMonths?.[role]?.[month];
    const sources = clone(entry?.sources || []);
    const checks = [];
    if (entry?.complete !== true) checks.push(`OTHER_INCOME_COMPLETENESS_REQUIRED:${role}:${month}`);
    (config.incomeLedger || []).filter((r) => r.role === role && monthKey(r.paidAt) === month).forEach((r) => {
      if (r.classification === "excluded-confirmed") return;
      if (r.classification !== "regular-confirmed") checks.push(`PAYMENT_LEGAL_CLASSIFICATION_REQUIRED:${r.id || r.paidAt}`);
      sources.push({ id: r.sourceId || `${role}-${r.incomeType}`, incomeType: r.incomeType, amountType: "net", amount: Number(r.amount), deductions: r.deductions || {} });
    });
    if (role === "applicant" && month >= monthKey(config.alg?.startDate || "9999-01-01")) {
      const explicit = config.alg?.cashByMonth?.[month];
      let received = amount(explicit);
      if (received === null && ["same-month", "next-month"].includes(config.alg?.paymentMode)) {
        const serviceMonth = config.alg.paymentMode === "next-month" ? shift(month, -1) : month;
        received = algEntitlement(serviceMonth, scenario.alg, config.alg.startDate, config.alg.endDate);
      }
      if (received === null) checks.push(`ALG_PAYMENT_MONTH_REQUIRED:${month}`);
      sources.push({ id: "scenario-alg", incomeType: "unemployment-1", amountType: "net", amount: received, deductions: {} });
      if (config.alg?.cashClassificationByMonth?.[month] === "unresolved-arrears") checks.push(`ALG_ARREARS_CLASSIFICATION_REQUIRED:${month}`);
    }
    if (role === "partner" && scenario.job !== "L0") {
      const lag = config.partner?.payLagMonths;
      if (![0, 1].includes(lag) && month >= monthKey(scenario.workStart)) checks.push(`WAGE_PAYMENT_MONTH_REQUIRED:${month}`);
      const serviceMonth = shift(month, -([0, 1].includes(lag) ? lag : 0));
      const pay = partnerPay(config, scenario, serviceMonth);
      if (serviceMonth >= monthKey(scenario.workStart)) {
        checks.push(...pay.openChecks);
        sources.push({ id: "scenario-wage", incomeType: scenario.job === "L1" ? "minijob" : "employment", amountType: "gross", employmentType: scenario.job === "L1" ? "minijob" : "social-insurance", amount: [0, 1].includes(lag) ? pay.gross : null, deductions: pay.deductions });
      }
    }
    return { sources, openChecks: unique(checks) };
  }

  function productionSources(monthResults, role) {
    const ids = unique(monthResults.flatMap((r) => r.sources.map((s) => s.id)));
    return ids.map((id) => {
      const example = monthResults.flatMap((r) => r.sources).find((s) => s.id === id);
      if (monthResults.flatMap((r) => r.sources).some((s) => s.id === id && (s.incomeType !== example.incomeType || s.amountType !== example.amountType))) throw new Error("Eine Quell-ID darf nicht verschiedene Einkommensarten oder Betragstypen verbinden.");
      const values = monthResults.map((r) => sum(r.sources.filter((s) => s.id === id).map((s) => amount(s.amount))) ?? (r.sources.some((s) => s.id === id) ? null : 0));
      const fields = unique(monthResults.flatMap((r) => r.sources.filter((s) => s.id === id).flatMap((s) => Object.keys(s.deductions || {}))));
      const deductions = {};
      fields.forEach((field) => {
        const v = monthResults.map((r) => {
          const src = r.sources.filter((s) => s.id === id);
          return src.length ? sum(src.map((s) => amount(s.deductions?.[field]))) : 0;
        });
        deductions[field] = { enabled: true, entryMethod: "monthly", monthlyValues: v.map((n) => n === null ? "" : String(n)), monthlyAverage: "", mandatoryStatus: "yes" };
      });
      return { ...example, id, personRole: role, entryMethod: "monthly", monthlyAverage: "", monthlyValues: values.map((v) => v === null ? "" : String(v)), deductions, u25SpecialAllowanceStatus: example.u25SpecialAllowanceStatus || "not-applicable", parentalAllowanceType: "unknown", confirmedExemptionMonthly: "" };
    });
  }

  function snapshot(config, month) {
    const state = clone(config.baseState);
    if (!state?.households) throw new Error("Ein Produktions-State ist erforderlich.");
    const id = config.householdId || "A";
    (config.householdEvents || []).filter((e) => monthKey(e.date) <= month).sort((a, b) => a.date.localeCompare(b.date)).forEach((e) => merge(state, e.patch));
    state.applicationYear = Number(month.slice(0, 4)); state.applicationMonth = Number(month.slice(5));
    const h = state.households[id];
    const costs = (config.housingCostPeriods || []).find((p) => p.start <= month && p.end >= month);
    if (costs) {
      h.housingType = costs.housingType || "rent";
      h.housingCosts ||= {};
      h.housingCosts.rent = { ...(h.housingCosts.rent || {}), ...clone(costs.rent || {}), costMonth: month };
    }
    if (config.partner?.moveInDate) {
      h.adults = month >= monthKey(config.partner.moveInDate) ? "couple" : "single";
      if (h.adults === "couple") h.partner ||= "Partnerperson";
      else { h.partnerIncomeSources = []; h.partnerExpenses = []; }
      if (!config.partner.moveInDate.endsWith("-01") && month === monthKey(config.partner.moveInDate)) state.__partialHouseholdMonth = true;
    }
    (state.centralChildren || []).forEach((c) => {
      if (config.birthDates?.[c.id]) c.age = String(ageAt(config.birthDates[c.id], month));
    });
    return state;
  }

  function buildKizState(config, scenario, start) {
    const state = snapshot(config, start);
    const h = state.households[config.householdId || "A"];
    const period = deps.calculator.createAssessmentPeriod(state.applicationMonth, state.applicationYear);
    const checks = [];
    for (const role of ["applicant", ...(h.adults === "couple" ? ["partner"] : [])]) {
      const rows = period.months.map((m) => incomeAt(config, scenario, role, m.key));
      checks.push(...rows.flatMap((r) => r.openChecks));
      h[`${role}IncomeSources`] = productionSources(rows, role);
      h[`${role}IncomeStatus`] = h[`${role}IncomeSources`].length ? "present" : "none";
    }
    for (const child of state.centralChildren || []) {
      const timeline = config.childIncomeMonths?.[child.id];
      if (!timeline) continue;
      const rows = period.months.map((m) => ({ sources: clone(timeline[m.key]?.sources || []), openChecks: timeline[m.key]?.complete === true ? [] : [`CHILD_INCOME_COMPLETENESS_REQUIRED:${child.id}:${m.key}`] }));
      checks.push(...rows.flatMap((r) => r.openChecks));
      child.incomeSources = productionSources(rows, "child");
      child.hasOwnIncome = child.incomeSources.length ? "yes" : "no";
    }
    if (state.__partialHouseholdMonth) checks.push("PARTIAL_HOUSEHOLD_MONTH_REVIEW_REQUIRED");
    return { state, openChecks: unique(checks) };
  }

  function buildWohngeldState(config, scenario, start) {
    const state = snapshot(config, start);
    const h = state.households[config.householdId || "A"];
    const checks = [];
    const forecastMonths = months(start, 12);
    h.wohngeldData ||= {};
    h.wohngeldData.calculationMode = "automatic";
    h.wohngeldData.persons ||= {};
    for (const role of ["applicant", ...(h.adults === "couple" ? ["partner"] : [])]) {
      const person = h.wohngeldData.persons[role] ||= {};
      const supplied = config.wohngeldForecast?.[role];
      if (supplied) { person.incomeForecast = clone(supplied); continue; }
      const old = person.incomeForecast || {};
      const contribution = config.wohngeldContributionStatus?.[role] || {};
      if (config.forecastOtherIncomeComplete?.[role] !== true) checks.push(`WG_OTHER_INCOME_COMPLETENESS_REQUIRED:${role}`);
      const values = role === "applicant"
        ? forecastMonths.map((m) => algEntitlement(m, scenario.alg, config.alg?.startDate, config.alg?.endDate))
        : forecastMonths.map((m) => partnerPay(config, scenario, m).gross);
      if (role === "applicant" && !config.alg?.endDate) checks.push("ALG_ENTITLEMENT_DURATION_REQUIRED");
      const type = role === "applicant" ? "unemployment-1" : scenario.job === "L1" ? "minijob" : "employment";
      person.incomeForecast = { ...old, taxExpected: contribution.taxExpected || "unknown", healthCareContributionExpected: contribution.healthCareContributionExpected || "unknown", pensionContributionExpected: contribution.pensionContributionExpected || "unknown", basis: "custom", mode: "custom-monthly", incomeStatus: values.every((n) => n === 0) ? "none" : "present", sources: values.every((n) => n === 0) ? [] : [{ id: `finance-wg-${role}`, type, amountType: role === "applicant" ? "net" : "gross", monthlyValues: values.map((v) => v === null ? "" : String(v)), expectedMonthlyAmount: "", expectedAnnualAmount: "", confirmedAnnualWorkExpenses: config.partner?.confirmedAnnualWorkExpenses === undefined ? "" : String(config.partner.confirmedAnnualWorkExpenses), details: {} }] };
      // Die §16-Antworten bleiben ausdrückliche Eingaben, auch bei ALG I.
    }
    if (config.partner?.moveInDate && monthKey(config.partner.moveInDate) > start && monthKey(config.partner.moveInDate) < shift(start, 12)) checks.push("WG_FUTURE_HOUSEHOLD_CHANGE_DECISION_REQUIRED");
    return { state, openChecks: unique(checks) };
  }

  function evaluateWg(config, scenario, start) {
    const built = buildWohngeldState(config, scenario, start);
    const id = config.householdId || "A";
    const result = deps.wohngeld.evaluateWohngeld(built.state.households[id], built.state.centralChildren, { householdId: id, applicationMonth: Number(start.slice(5)), applicationYear: Number(start.slice(0, 4)) });
    const h = built.state.households[id];
    const checks = [...built.openChecks, ...(result.amount.openChecks || [])];
    if (h.wohngeldData.section20Status !== "not-excluded") checks.push("WG_SECTION_20_NOT_CLEARED");
    if (h.wohngeldData.significantAssetsStatus !== "not-excluded") checks.push("WG_SIGNIFICANT_ASSETS_NOT_CLEARED");
    return { amount: checks.length ? null : result.amount.payableWohngeldAmount, formulaAmount: result.amount.payableWohngeldAmount, result, openChecks: unique(checks) };
  }

  function cashFromIncome(rows) {
    return sum(rows.sources.map((s) => {
      const n = amount(s.amount);
      if (n === null) return null;
      if (s.amountType !== "gross") return n;
      const deduction = sum(Object.values(s.deductions || {}).map(amount));
      return deduction === null ? null : money(n - deduction);
    })) ?? (rows.sources.length ? null : 0);
  }
  function forwarding(config, month) {
    const e = config.kindergeldTransfers?.[month];
    if (!e || e.confirmed !== true) return { net: null, openChecks: ["KINDERGELD_TRANSFERS_REQUIRED"] };
    const incoming = amount(e.incoming), outgoing = amount(e.outgoing);
    const checks = incoming === null || outgoing === null || incoming < 0 || outgoing < 0 ? ["KINDERGELD_TRANSFER_AMOUNTS_REQUIRED"] : [];
    // Der bestehende Kern kann nur keine oder bestätigte hälftige Weiterleitung.
    if (e.benefitAllocationConfirmed !== true) checks.push("KINDERGELD_BENEFIT_ALLOCATION_REQUIRED");
    return { net: checks.length ? null : money(incoming - outgoing), openChecks: checks };
  }

  function periodAmount(period, key) {
    if (!period || period.openChecks.length || Number(key.slice(0, 4)) > 2026) return null;
    const payment = period.result?.paymentPeriods?.find((p) => p.key === key || (p.year === Number(key.slice(0, 4)) && p.month === Number(key.slice(5))));
    if (finite(payment?.roundedPayableAmount)) return payment.roundedPayableAmount;
    return period.result?.status === "CALCULATED_NOT_ENTITLED" ? 0 : null;
  }

  function simulate(config, scenario) {
    const start = monthKey(config.comparisonStart);
    const keys = months(start, config.comparisonMonths || 12);
    const plan = createPlan(config, scenario.applicationStart);
    const wgStart = config.wohngeldStart || start;
    const wg = evaluateWg(config, scenario, wgStart);
    const periods = plan.periods.map((period) => {
      const built = buildKizState(config, scenario, period.start);
      const id = config.householdId || "A";
      const h = built.state.households[id];
      const wgForGate = period.start === wgStart ? wg : evaluateWg(config, scenario, period.start);
      // Nur unabhängiges Wohngeld für Coverage verwenden, niemals alten Bescheid importieren.
      h.housingBenefitStatus = finite(wgForGate.amount) ? "estimated" : "not-received";
      h.housingBenefit = finite(wgForGate.amount) ? String(wgForGate.amount) : "";
      const checked = deps.validation.validateCalculatorState(built.state);
      const result = deps.calculator.calculateKinderzuschlag(built.state, checked).households?.[id];
      const checks = unique([...built.openChecks, ...(result?.blockingOpenChecks || []), ...checked.errors.map((e) => e.code)]);
      return { ...period, result, minimumIncome: deps.calculator.evaluateMinimumIncome(built.state, id), openChecks: checks };
    });
    const monthly = keys.map((month) => {
      const p = periods.find((e) => e.start <= month && e.end >= month);
      const yearSupported = Number(month.slice(0, 4)) <= 2026;
      const checks = [...plan.openChecks];
      if (!yearSupported) checks.push("BENEFIT_RULE_YEAR_UNVERIFIED");
      if (config.baseFactsConfirmed !== true) checks.push("BASE_STATE_FACTS_NOT_CONFIRMED");
      const transfer = forwarding(config, month); checks.push(...transfer.openChecks);
      let kiz = yearSupported ? periodAmount(p, month) : null;
      if (!p) kiz = 0; // explizit kein Antrag in diesem kontrafaktischen Pfad
      if (p) checks.push(...p.openChecks);
      let wgAmount = month >= wgStart && month < shift(wgStart, 12) && yearSupported ? wg.amount : null;
      checks.push(...wg.openChecks);
      const decision = (config.wohngeldDecisions || []).find((d) => d.start <= month && d.end >= month);
      if (decision) wgAmount = amount(decision.amount);
      const changedWgFacts = (config.householdEvents || []).some((e) => monthKey(e.date) > wgStart && monthKey(e.date) <= month);
      if (changedWgFacts && !decision) { wgAmount = null; checks.push("WG_CHANGED_FACTS_DECISION_REQUIRED"); }
      const state = snapshot(config, month), id = config.householdId || "A";
      const pay = partnerPay(config, scenario, month);
      const alg = algEntitlement(month, scenario.alg, config.alg?.startDate, config.alg?.endDate);
      if (!config.alg?.endDate) checks.push("ALG_ENTITLEMENT_DURATION_REQUIRED");
      const childBenefitRate = amount(config.kindergeldRates?.[month.slice(0, 4)]);
      const n = (state.centralChildren || []).filter((c) => c.childBenefitAt === id).length;
      const kindergeld = childBenefitRate === null ? null : money(n * childBenefitRate);
      const uvg = amount(config.uvgByMonth?.[month]);
      if (uvg === null) checks.push("UVG_STATUS_REQUIRED");
      if (uvg > 0 && (state.centralChildren || []).every((c) => ["wechselmodell-50-50", "wechselmodell-a-external", "wechselmodell-b-external"].includes(c.careSituation))) checks.push("UVG_INCOMPATIBLE_WITH_PARITY_CARE");
      if (uvg > 0) checks.push("UVG_CHILD_INCOME_AND_FORECAST_RECONCILIATION_REQUIRED");
      const other = amount(config.otherCashByMonth?.[month]);
      if (other === null) checks.push("OTHER_CASH_COMPLETENESS_REQUIRED");
      const couple = state.households[id].adults === "couple";
      const ownInsurance = couple && ["L0", "L1"].includes(scenario.job) ? amount(config.partner?.ownInsuranceCostByMonth?.[month]) : 0;
      if (ownInsurance === null) checks.push("PARTNER_HEALTH_COVERAGE_AND_OWN_COST_REQUIRED");
      const rawTotal = sum([alg, couple ? pay.net : 0, wgAmount, kiz, kindergeld, uvg, transfer.net, other]);
      const rawResources = rawTotal === null || ownInsurance === null ? null : money(rawTotal - ownInsurance);
      const resources = checks.length ? null : rawResources;
      const actual = config.cashReceipts?.[month];
      // Tatsächliche vollständige Cash-Zahlungen werden NICHT mit Anspruchswerten vermischt.
      const cashValues = Object.values(actual?.components || {}).map(amount);
      const scheduledCash = actual?.complete === true && cashValues.length ? sum(cashValues) : null;
      const cash = actual?.kind === "actual" ? scheduledCash : null;
      const simulatedCash = actual?.kind === "simulated" ? scheduledCash : null;
      const result = { month, alg, partnerGross: pay.gross, partnerNet: couple ? pay.net : 0, partnerDeductions: pay.deductions, partnerOwnInsurance: ownInsurance, wohngeld: wgAmount, kiz: finite(kiz) ? kiz : null, kindergeld, kindergeldTransfer: transfer.net, uvg, otherCash: other, entitlementResources: resources, actualCash: cash, simulatedCash, paymentComponents: clone(actual?.components || {}), afterWarmRent: resources === null ? null : (amount(config.warmRentByMonth?.[month]) === null ? null : money(resources - Number(config.warmRentByMonth[month]))), openChecks: unique([...checks, ...(couple ? pay.openChecks : [])]), periodStart: p?.start || null, minimumIncome: p?.minimumIncome || null };
      result.status = result.openChecks.length || resources === null ? "UNRESOLVED" : "CALCULATED_SCENARIO";
      return result;
    });
    const total = sum(monthly.map((m) => m.entitlementResources));
    const cashTotal = sum(monthly.map((m) => m.actualCash));
    const reliable = monthly.every((m) => m.status === "CALCULATED_SCENARIO") && !plan.openChecks.length && total !== null;
    return { ...scenario, ruleIds: RULE_IDS, legalStatus: plan.legalStatus, periods, monthly, wohngeldForecast: wg,
      comparisonSixMonthTotal: sum(monthly.slice(0, 6).map((m) => m.entitlementResources)),
      applicationSixMonthKiz: sum(months(scenario.applicationStart, 6).map((key) => {
        const p = periods.find((e) => e.start <= key && e.end >= key);
        return periodAmount(p, key);
      })), comparisonTotal: total, twelveMonthTotal: monthly.length === 12 ? total : null, cashTotal, reliable, highestMonthlyTotal: monthly.every((m) => finite(m.entitlementResources)) ? Math.max(...monthly.map((m) => m.entitlementResources)) : null,
      status: reliable ? "CALCULATED_SCENARIO" : "UNRESOLVED", openChecks: unique(monthly.flatMap((m) => m.openChecks)) };
  }

  function runMatrix(config) {
    if (!config?.baseState) throw new Error("Produktionsdaten fehlen.");
    const results = [];
    const applications = config.applicationMonths || [];
    const jobs = config.jobs || deps.payroll.JOBS;
    const starts = config.partner?.workStartDates || [config.comparisonStart];
    for (const applicationStart of applications) for (const alg of config.algAmounts || []) for (const job of jobs) for (const workStart of starts) {
      if (!finite(alg) || alg < 0) throw new Error("ALG-Szenarien müssen nicht negative Netto-Zahlen sein.");
      results.push(simulate(config, { applicationStart, alg, job, workStart }));
    }
    return { ruleIds: RULE_IDS, comparisonStart: config.comparisonStart, comparisonEnd: shift(config.comparisonStart, (config.comparisonMonths || 12) - 1), scenarios: results, rankings: rank(results), incompleteCount: results.filter((r) => !r.reliable).length };
  }
  function rank(results) {
    const valid = results.filter((s) => s.reliable && finite(s.twelveMonthTotal));
    const ordered = [...valid].sort((a, b) => b.twelveMonthTotal - a.twelveMonthTotal);
    const cash = [...valid].filter((s) => finite(s.cashTotal)).sort((a, b) => b.cashTotal - a.cashTotal);
    const highest = [...valid].sort((a, b) => b.highestMonthlyTotal - a.highestMonthlyTotal);
    const liquidity = [...valid].filter((s) => s.monthly.every((m) => finite(m.actualCash))).sort((a, b) => Math.min(...b.monthly.map((m) => m.actualCash)) - Math.min(...a.monthly.map((m) => m.actualCash)));
    return { ordered, bestTwelveMonths: ordered[0] || null, bestCash: cash[0] || null, highestMonth: highest[0] || null, lowestGapRisk: liquidity[0] || null, message: ordered.length ? "Rangfolge unter den angegebenen Szenariobedingungen." : "Keine belastbare Rangfolge: Eingaben, Rechtsstand oder Verfahrenslage offen." };
  }
  function csvCell(v) {
    let s = v === null || v === undefined ? "" : String(v);
    if (/^[\s]*[=+\-@]/.test(s)) s = `'${s}`;
    return `"${s.replace(/"/g, '""')}"`;
  }
  function toCsv(matrix, detail = false) {
    const head = detail ? ["KiZ-Antrag", "ALG-Szenario", "Job", "Arbeitsbeginn", "Monat", "ALG-Anspruch", "Brutto", "Netto", "Wohngeld", "KiZ", "Kindergeld", "KG-Weiterleitung netto", "UVG", "Sonstiges", "Haushaltsmittel Anspruch", "Tatsächlicher Zufluss", "Status", "Offene Punkte"] : ["KiZ-Antrag", "ALG-Szenario", "Job", "Arbeitsbeginn", "Rechtsstatus", "6 Monate ab Vergleichsstart", "6 Monate KiZ ab Antrag", "12 Monate Anspruch", "12 Monate Cash", "Status", "Offene Punkte"];
    if (detail) head.push("Simulierter Zufluss", "Zahlungsbestandteile");
    const rows = matrix.scenarios.flatMap((s) => detail ? s.monthly.map((m) => [s.applicationStart, s.alg, s.job, s.workStart, m.month, m.alg, m.partnerGross, m.partnerNet, m.wohngeld, m.kiz, m.kindergeld, m.kindergeldTransfer, m.uvg, m.otherCash, m.entitlementResources, m.actualCash, m.status, m.openChecks.join(" | "), m.simulatedCash, JSON.stringify(m.paymentComponents)]) : [[s.applicationStart, s.alg, s.job, s.workStart, s.legalStatus, s.comparisonSixMonthTotal, s.applicationSixMonthKiz, s.twelveMonthTotal, s.cashTotal, s.status, s.openChecks.join(" | ")]]);
    return "\uFEFF" + [head, ...rows].map((r) => r.map(csvCell).join(";")).join("\r\n");
  }
  return { RULE_IDS, monthKey, shift, months, ageAt, aggregateReceipts, algEntitlement, createPlan, incomeAt, productionSources, snapshot, buildKizState, buildWohngeldState, evaluateWg, simulate, runMatrix, rank, toCsv };
});
