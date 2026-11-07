(function initializeUxIncomeForecast(root, factory) {
  const parentNeedData = typeof module !== "undefined" && module.exports
    ? require("./parent-need-data.js")
    : root?.KizParentNeedData;
  const api = factory(parentNeedData);
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.KizUxIncomeForecast = api;
})(typeof window !== "undefined" ? window : globalThis, function createUxIncomeForecastApi(parentNeedData) {
  "use strict";

  const BASIS_VALUES = new Set(["unknown", "confirmed-from-current-income", "custom"]);
  const DIRECT_TYPE_MAP = Object.freeze({
    employment: "employment",
    "unemployment-1": "unemployment-1",
    "adult-maintenance": "adult-maintenance",
    "sick-pay": "sick-pay",
  });
  const CHILD_DIRECT_TYPE_MAP = Object.freeze({
    maintenance: "maintenance",
    "advance-maintenance": "advance-maintenance",
  });

  function isPresentNumber(value) {
    return value !== "" && value != null && Number.isFinite(Number(value)) && Number(value) >= 0;
  }

  function sickPaySeries(source, field) {
    if (source?.[field] && typeof source[field] === "object") return source[field];
    if (field === "netAmount" && ["net", "notice"].includes(source?.amountType)) return source;
    return null;
  }

  function monthlySickPayAmount(source, field) {
    const series = sickPaySeries(source, field);
    if (!series || !isPresentNumber(series.monthlyAverage)) return null;
    if (source?.period === "calendar-day") return null;
    return Number(series.monthlyAverage);
  }

  function householdAndPerson(state, householdId, personKey) {
    const household = state?.households?.[householdId];
    if (!household) return { household: null, person: null };
    household.wohngeldData ||= parentNeedData.defaultWohngeldData();
    household.wohngeldData.persons ||= { applicant: {}, partner: {}, children: {} };
    if (String(personKey).startsWith("child:")) {
      const childId = String(personKey).slice(6);
      household.wohngeldData.persons.children ||= {};
      household.wohngeldData.persons.children[childId] = parentNeedData.migrateWohngeldPerson(
        household.wohngeldData.persons.children[childId]
      );
      return { household, person: household.wohngeldData.persons.children[childId] };
    }
    household.wohngeldData.persons[personKey] = parentNeedData.migrateWohngeldPerson(
      household.wohngeldData.persons[personKey]
    );
    return { household, person: household.wohngeldData.persons[personKey] };
  }

  function currentAdultSources(state, householdId, personKey) {
    const household = state?.households?.[householdId] || {};
    return personKey === "partner"
      ? (Array.isArray(household.partnerIncomeSources) ? household.partnerIncomeSources : [])
      : (Array.isArray(household.applicantIncomeSources) ? household.applicantIncomeSources : []);
  }

  function analyzeCurrentAdultIncome(state, householdId, personKey) {
    const sources = currentAdultSources(state, householdId, personKey);
    if (!sources.length) return { status: "NO_SOURCES", mapped: [], unsupported: [] };
    const mapped = [];
    const unsupported = [];
    sources.forEach((source) => {
      const targetType = DIRECT_TYPE_MAP[source?.incomeType];
      const sickPay = source?.incomeType === "sick-pay";
      const sourceAmount = sickPay ? monthlySickPayAmount(source, "netAmount") : source?.monthlyAverage;
      const simpleMonthly = source?.entryMethod === "average" && isPresentNumber(sourceAmount);
      const knownAmountType = sickPay
        ? Object.prototype.hasOwnProperty.call(source, "netAmount") || ["net", "notice"].includes(source?.amountType)
        : ["gross", "net", "notice", "other"].includes(source?.amountType);
      const amountTypeFitsTarget = source?.incomeType !== "employment" || source?.amountType === "gross";
      const grossMonthlyAmount = sickPay ? monthlySickPayAmount(source, "grossAmount") : null;
      if (!targetType || !simpleMonthly || !knownAmountType || !amountTypeFitsTarget) {
        unsupported.push({
          id: source?.id || null,
          incomeType: source?.incomeType || "unknown",
          amountType: source?.amountType || "unknown",
          reason: source?.incomeType === "sick-pay"
            ? "SICK_PAY_MONTHLY_NET_AMOUNT_REQUIRED"
            : !targetType
              ? "TYPE_NOT_DIRECTLY_MAPPABLE"
              : !simpleMonthly
                ? "NO_SIMPLE_MONTHLY_AMOUNT"
                : !knownAmountType
                  ? "AMOUNT_TYPE_UNKNOWN"
                  : "NET_EMPLOYMENT_IS_NOT_GROSS",
        });
        return;
      }
      mapped.push({
        sourceId: source.id || null,
        type: targetType,
        expectedMonthlyAmount: String(sickPay ? sourceAmount : source.monthlyAverage),
        amountType: sickPay ? "notice" : source.amountType,
        paymentMonthlyAmount: sickPay ? String(sourceAmount) : null,
        grossMonthlyAmount: sickPay ? monthlySickPayAmount(source, "grossAmount") : null,
        origin: "step-3",
      });
    });
    return { status: unsupported.length ? "NEEDS_CUSTOM_FORECAST" : "MAPPABLE", mapped, unsupported };
  }

  function prepareConfirmedCurrentIncome(state, householdId, personKey, createId = () => "") {
    const analysis = analyzeCurrentAdultIncome(state, householdId, personKey);
    if (analysis.status === "NEEDS_CUSTOM_FORECAST") return { applied: false, analysis };
    const { person } = householdAndPerson(state, householdId, personKey);
    if (!person) return { applied: false, analysis: { ...analysis, status: "PERSON_NOT_FOUND" } };
    const sources = analysis.mapped.map((source) => parentNeedData.migrateWohngeldIncomeSource({
      id: createId(),
      type: source.type,
      expectedMonthlyAmount: source.expectedMonthlyAmount,
      amountType: source.amountType,
      details: source.type === "sick-pay"
        ? {
            transferBasis: "net",
            grossMonthlyAmount: source.grossMonthlyAmount,
            netMonthlyAmount: source.paymentMonthlyAmount,
          }
        : {},
      origin: source.origin,
      originSourceId: source.sourceId || "",
    }));
    person.incomeForecast = {
      ...person.incomeForecast,
      basis: "confirmed-from-current-income",
      incomeStatus: sources.length ? "present" : "none",
      mode: sources.length ? "same-monthly" : "unknown",
      sources,
    };
    return { applied: true, analysis, forecast: person.incomeForecast };
  }

  function analyzeCurrentChildIncome(state, householdId, childId) {
    const child = (Array.isArray(state?.centralChildren) ? state.centralChildren : []).find((entry) => entry?.id === childId);
    if (!child) return { status: "CHILD_NOT_FOUND", mapped: [], unsupported: [] };
    if (child.hasOwnIncome === "no") return { status: "NO_SOURCES", mapped: [], unsupported: [] };
    if (child.hasOwnIncome !== "yes") return { status: "INCOME_STATUS_UNKNOWN", mapped: [], unsupported: [] };
    const sources = Array.isArray(child.incomeSources) ? child.incomeSources : [];
    if (!sources.length) return { status: "NEEDS_CUSTOM_FORECAST", mapped: [], unsupported: [{ reason: "NO_CHILD_SOURCES" }] };
    const mapped = [];
    const unsupported = [];
    sources.forEach((source) => {
      const targetType = CHILD_DIRECT_TYPE_MAP[source?.incomeType];
      const simpleMonthly = source?.entryMethod === "average" && isPresentNumber(source?.monthlyAverage);
      const knownPaymentType = ["net", "notice"].includes(source?.amountType);
      if (!targetType || !simpleMonthly || !knownPaymentType) {
        unsupported.push({
          id: source?.id || null,
          incomeType: source?.incomeType || "unknown",
          amountType: source?.amountType || "unknown",
          reason: !targetType ? "TYPE_NOT_DIRECTLY_MAPPABLE" : !simpleMonthly ? "NO_SIMPLE_MONTHLY_AMOUNT" : "AMOUNT_TYPE_NOT_REUSABLE",
        });
        return;
      }
      mapped.push({
        sourceId: source.id || null,
        type: targetType,
        expectedMonthlyAmount: String(source.monthlyAverage),
        amountType: source.amountType,
        origin: "step-2-child-income",
      });
    });
    return { status: unsupported.length ? "NEEDS_CUSTOM_FORECAST" : "MAPPABLE", mapped, unsupported };
  }

  function prepareConfirmedChildIncome(state, householdId, childId, createId = () => "") {
    const analysis = analyzeCurrentChildIncome(state, householdId, childId);
    if (analysis.status === "NO_SOURCES") return applyConfirmedChildNoIncome(state, householdId, childId);
    if (analysis.status !== "MAPPABLE") return { applied: false, analysis };
    const { person } = householdAndPerson(state, householdId, `child:${childId}`);
    if (!person) return { applied: false, analysis: { ...analysis, status: "PERSON_NOT_FOUND" } };
    const sources = analysis.mapped.map((source) => parentNeedData.migrateWohngeldIncomeSource({
      id: createId(),
      type: source.type,
      expectedMonthlyAmount: source.expectedMonthlyAmount,
      amountType: source.amountType,
      origin: source.origin,
      originSourceId: source.sourceId || "",
    }));
    person.incomeForecast = {
      ...person.incomeForecast,
      basis: "confirmed-from-current-income",
      incomeStatus: "present",
      mode: "same-monthly",
      taxExpected: "no",
      healthCareContributionExpected: "no",
      pensionContributionExpected: "no",
      sources,
    };
    return { applied: true, analysis, forecast: person.incomeForecast };
  }

  function setForecastBasis(state, householdId, personKey, basis) {
    const safeBasis = BASIS_VALUES.has(basis) ? basis : "unknown";
    const { person } = householdAndPerson(state, householdId, personKey);
    if (!person) return null;
    person.incomeForecast.basis = safeBasis;
    if (safeBasis === "unknown") person.incomeForecast.incomeStatus = "unknown";
    return person.incomeForecast;
  }

  function applyConfirmedChildNoIncome(state, householdId, childId) {
    const child = (Array.isArray(state?.centralChildren) ? state.centralChildren : []).find((entry) => entry?.id === childId);
    if (child?.hasOwnIncome !== "no") return { applied: false };
    const { person } = householdAndPerson(state, householdId, `child:${childId}`);
    if (!person) return { applied: false };
    person.incomeForecast = {
      ...person.incomeForecast,
      basis: "confirmed-from-current-income",
      incomeStatus: "none",
      mode: "unknown",
      sources: [],
    };
    return { applied: true, forecast: person.incomeForecast };
  }

  function deriveOtherResidentsStatus(household = {}) {
    if (["yes", "no", "unknown"].includes(household.otherResidentsStatus)) return household.otherResidentsStatus;
    if (household.otherResidents === "" || household.otherResidents == null) return "unknown";
    const count = Number(household.otherResidents);
    if (count === 0) return "no";
    if (Number.isInteger(count) && count > 0) return "yes";
    return "unknown";
  }

  function applyOtherResidentsChoice(household, choice) {
    const safeChoice = ["yes", "no", "unknown"].includes(choice) ? choice : "unknown";
    household.otherResidentsStatus = safeChoice;
    if (safeChoice === "no") household.otherResidents = "0";
    if (safeChoice === "unknown") household.otherResidents = "";
    if (safeChoice === "yes" && Number(household.otherResidents) === 0) household.otherResidents = "";
    return household;
  }

  return {
    BASIS_VALUES,
    DIRECT_TYPE_MAP,
    CHILD_DIRECT_TYPE_MAP,
    analyzeCurrentAdultIncome,
    prepareConfirmedCurrentIncome,
    analyzeCurrentChildIncome,
    prepareConfirmedChildIncome,
    setForecastBasis,
    applyConfirmedChildNoIncome,
    deriveOtherResidentsStatus,
    applyOtherResidentsChoice,
  };
});
