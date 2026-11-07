(function initializeCalculator(root, factory) {
  const calculationRules =
    typeof module !== "undefined" && module.exports
      ? require("./calculation-rules.js")
      : root?.KizCalculationRules;
  const wohngeldCalculator =
    typeof module !== "undefined" && module.exports
      ? require("./wohngeld.js")
      : root?.WohngeldCalculator;
  const api = factory(calculationRules, wohngeldCalculator);
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.KizCalculator = api;
  }
})(typeof window !== "undefined" ? window : globalThis, function createCalculatorApi(calculationRules, wohngeldCalculator) {
  "use strict";

  const RULE_IDS = Object.freeze({
    general: "KIZ-GEN-001",
    period: "KIZ-PERIOD-001",
    minimumIncome: "KIZ-MIN-INCOME-001",
    maximumKiz: "KIZ-MAX-001",
    adultIncome: "KIZ-INCOME-ADULT-001",
    sickPayInput: "KIZ-SICK-PAY-INPUT-001",
    adultDeduction: "KIZ-ADULT-DEDUCTION-001",
    childBenefitSurplus: "KIZ-CHILD-BENEFIT-SURPLUS-001",
    childIncome: "KIZ-INCOME-CHILD-001",
    deduction: "KIZ-DEDUCTION-001",
    parentNeed: "KIZ-PARENT-NEED-001",
    parentAdditionalNeed: "KIZ-PARENT-ADDITIONAL-NEED-001",
    housingRecognition: "KIZ-HOUSING-RECOGNITION-001",
    parentHousingShare: "KIZ-PARENT-HOUSING-SHARE-001",
    childSgbIINeed: "KIZ-CHILD-SGBII-NEED-001",
    childBgIncome: "KIZ-CHILD-BG-INCOME-001",
    childSgbIIMembership: "KIZ-SGBII-BG-MEMBERSHIP-001",
    familySgbIINeed: "KIZ-FAMILY-SGBII-NEED-001",
    parentIncomeReduction: "KIZ-REDUCE-PARENT-001",
    asset: "KIZ-ASSET-001",
    childAssetReduction: "KIZ-REDUCE-CHILD-ASSETS-001",
    parentAssetReduction: "KIZ-REDUCE-PARENT-ASSETS-001",
    assetIntegration: "KIZ-ASSET-INTEGRATION-001",
    coverageIncome: "KIZ-COVERAGE-INCOME-001",
    coverageChildBenefit: "KIZ-COVERAGE-CHILD-BENEFIT-001",
    coverage: "KIZ-COVERAGE-001",
    extendedAccess: "KIZ-EXTENDED-ACCESS-001",
    final: "KIZ-FINAL-001",
  });
  const SOURCE_STAND = Object.freeze({
    legalPeriod: "2026",
    daKiz: "20.02.2026",
    calculationSpec: "15.08.2026",
    sourceIds: Object.freeze(["SRC-DA-KIZ-2026-02-20", "SRC-BKGG-6A", "SRC-BKGG-11", "SRC-SGBII-7", "SRC-SGBII-11", "SRC-SGBII-11-11B", "SRC-SGBII-11A", "SRC-SGBII-12-PRE-2026-07", "SRC-SGBII-12-POST-2026-07", "SRC-SGBII-20", "SRC-SGBII-21", "SRC-SGBII-22", "SRC-SGBII-23", "SRC-SGBII-26", "SRC-RBSFV-2026", "SRC-BUERGERGELDV-1", "SRC-FW-SGBII-11-11B-2024-10-24", "SRC-BEEG-10", "SRC-SGBV-47-1", "SRC-PRODUCT-SPEC-2026"]),
  });
  const PARENT_RULE_NEEDS_2026 = Object.freeze({ single: Object.freeze([563]), couple: Object.freeze([506, 506]) });
  const CHILD_RULE_NEEDS_2026 = Object.freeze({
    age0To5: Object.freeze({ amount: 357, hotWaterRate: 0.008 }),
    age6To13: Object.freeze({ amount: 390, hotWaterRate: 0.012 }),
    age14To17: Object.freeze({ amount: 471, hotWaterRate: 0.014 }),
    age18To24U25: Object.freeze({ amount: 451, hotWaterRate: 0.023 }),
  });
  const CHILD_BENEFIT_2026 = 259;
  const PARENT_HOUSING_PERCENTAGES = Object.freeze({
    single: Object.freeze([77, 63, 53, 46, 40, 36, 33, 30, 27, 25]),
    couple: Object.freeze([83, 71, 62, 55, 50, 45, 41, 38, 35, 33]),
  });
  const MONTH_NAMES = Object.freeze([
    "Januar",
    "Februar",
    "März",
    "April",
    "Mai",
    "Juni",
    "Juli",
    "August",
    "September",
    "Oktober",
    "November",
    "Dezember",
  ]);
  const EMPLOYMENT_GROSS_TYPES = new Set(["employment", "minijob", "training"]);
  const PARENTAL_ALLOWANCE_AMOUNT_TYPES = new Set(["gross", "net", "notice"]);
  const CHILD_SIDE_JOB_SUBTYPES = new Set(["normal", "student-regular", "school-holiday-only", "unknown"]);
  const CHILD_EDUCATION_SUPPORT_SUBTYPES = new Set(["bafog", "bab", "scholarship", "training-allowance", "other", "unknown"]);
  const CHILD_ORPHAN_PENSION_SUBTYPES = new Set(["running", "backpay", "unknown"]);
  const CHILD_TRAINING_WAGE_SUBTYPES = new Set(["eligible-training", "other-employment", "unknown"]);
  const CHILD_VOLUNTARY_SERVICE_SUBTYPES = new Set(["pocket-money-only", "includes-other-benefits", "unknown"]);
  const CHILD_MONTH_RULE_IDS = Object.freeze({
    monthly: "KIZ-CHILD-MONTH-001",
    binding: "KIZ-CHILD-BINDING-001",
    nonEarned: "KIZ-CHILD-NON-EARNED-001",
    insurance: "KIZ-CHILD-INSURANCE-001",
    exclusion: "KIZ-CHILD-EXCLUSION-001",
    earned: "KIZ-CHILD-EARNED-001",
    basic: "KIZ-CHILD-BASIC-001",
    basic2b: "KIZ-CHILD-BASIC-2B-001",
    earnedTier: "KIZ-CHILD-EARNED-TIER-001",
    education: "KIZ-CHILD-EDUCATION-001",
    deductionOnce: "KIZ-CHILD-DEDUCTION-ONCE-001",
  });
  const CHILD_INCOME_REDUCTION = Object.freeze({
    ruleId: "KIZ-REDUCE-CHILD-001",
    rate: 0.45,
  });
  const PARENT_INCOME_REDUCTION = Object.freeze({
    ruleId: "KIZ-REDUCE-PARENT-001",
    earnedIncomeRate: 0.45,
    otherIncomeRate: 1,
  });
  const ASSET_TYPES = new Set(["cash", "bank-account", "savings", "securities", "building-savings", "insurance-surrender-value", "vehicle", "self-used-property", "other-real-estate", "protected-retirement", "self-employed-retirement", "valuables", "other"]);
  const ASSET_ALLOWANCES = Object.freeze({ applicant: 40000, otherMember: 15000 });

  function warning(code, message, field = null) {
    return { code, message, field };
  }

  function asArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function isBlank(value) {
    return value === "" || value === null || value === undefined;
  }

  function parseNonNegativeAmount(value) {
    if (isBlank(value)) return null;
    const amount = Number(String(value).replace(",", "."));
    return Number.isFinite(amount) && amount >= 0 ? amount : null;
  }

  function normalizeChildIncomeSource(source = {}) {
    const normalizeSeries = (series) => ({
      entryMethod: ["average", "monthly"].includes(series?.entryMethod) ? series.entryMethod : "average",
      monthlyAverage: series?.monthlyAverage ?? "",
      monthlyValues: Array.isArray(series?.monthlyValues)
        ? [...series.monthlyValues, "", "", "", "", "", ""].slice(0, 6)
        : ["", "", "", "", "", ""],
    });
    const normalized = {
      ...source,
      monthlyValues: Array.isArray(source?.monthlyValues)
        ? [...source.monthlyValues, "", "", "", "", "", ""].slice(0, 6)
        : ["", "", "", "", "", ""],
      directDeductions: {
        tax: normalizeSeries(source?.directDeductions?.tax),
        socialInsurance: normalizeSeries(source?.directDeductions?.socialInsurance),
      },
    };
    if (source?.incomeType === "side-job") {
      normalized.subtype = CHILD_SIDE_JOB_SUBTYPES.has(source.subtype) ? source.subtype : "unknown";
    } else if (source?.incomeType === "education-support") {
      normalized.subtype = CHILD_EDUCATION_SUPPORT_SUBTYPES.has(source.subtype) ? source.subtype : "unknown";
    } else if (source?.incomeType === "orphan-pension") {
      normalized.subtype = CHILD_ORPHAN_PENSION_SUBTYPES.has(source.subtype) ? source.subtype : "unknown";
    } else if (source?.incomeType === "training-wage") {
      normalized.subtype = CHILD_TRAINING_WAGE_SUBTYPES.has(source.subtype) ? source.subtype : "unknown";
    } else if (source?.incomeType === "voluntary-service") {
      normalized.subtype = CHILD_VOLUNTARY_SERVICE_SUBTYPES.has(source.subtype) ? source.subtype : "unknown";
    } else {
      normalized.subtype = "";
    }
    return normalized;
  }

  function createAssessmentPeriod(applicationMonth, applicationYear) {
    const month = Number(applicationMonth);
    const year = Number(applicationYear);
    const validMonth = Number.isInteger(month) && month >= 1 && month <= 12;
    const validYear = Number.isInteger(year) && year >= 1;
    if (!validMonth || !validYear) {
      return {
        ruleId: RULE_IDS.period,
        status: "INVALID_APPLICATION_PERIOD",
        applicationMonth,
        applicationYear,
        months: [],
        warnings: [warning("INVALID_APPLICATION_PERIOD", "Antragsmonat und Antragsjahr ergeben keinen gültigen Bemessungszeitraum.", !validMonth ? "applicationMonth" : "applicationYear")],
        openChecks: ["APPLICATION_PERIOD_REVIEW_REQUIRED"],
      };
    }

    const months = [];
    for (let offset = 6; offset >= 1; offset -= 1) {
      const date = new Date(Date.UTC(year, month - 1 - offset, 1));
      const periodMonth = date.getUTCMonth() + 1;
      const periodYear = date.getUTCFullYear();
      months.push({
        month: periodMonth,
        year: periodYear,
        key: `${periodYear}-${String(periodMonth).padStart(2, "0")}`,
        label: `${MONTH_NAMES[periodMonth - 1]} ${periodYear}`,
        position: months.length,
      });
    }

    const benefitMonths = [];
    for (let offset = 0; offset < 6; offset += 1) {
      const date = new Date(Date.UTC(year, month - 1 + offset, 1));
      const benefitMonth = date.getUTCMonth() + 1;
      const benefitYear = date.getUTCFullYear();
      benefitMonths.push({
        index: offset + 1,
        month: benefitMonth,
        year: benefitYear,
        key: `${benefitYear}-${String(benefitMonth).padStart(2, "0")}`,
        label: `${MONTH_NAMES[benefitMonth - 1]} ${benefitYear}`,
      });
    }

    return {
      ruleId: RULE_IDS.period,
      status: "CALCULATED",
      applicationMonth: month,
      applicationYear: year,
      months,
      incomeAssessmentMonths: months,
      benefitMonths,
      warnings: [],
      openChecks: [],
    };
  }

  function createCalculationContext(state, validationResult = {}) {
    const errors = asArray(validationResult.errors);
    const warnings = asArray(validationResult.warnings);
    const infos = asArray(validationResult.infos);
    const blocked = errors.length > 0;
    return {
      ruleId: RULE_IDS.general,
      applicationMonth: state?.applicationMonth ?? null,
      applicationYear: state?.applicationYear ?? null,
      usedRuleIds: [RULE_IDS.general],
      sourceStand: SOURCE_STAND,
      status: blocked ? "BLOCKED_BY_VALIDATION" : warnings.length ? "READY_WITH_WARNINGS" : "READY",
      canCalculate: !blocked,
      validationErrors: errors,
      warnings,
      infos,
      openChecks: [],
      unsupportedCases: [],
    };
  }

  function prepareSixMonthValues(source) {
    const effectiveSource = source?.incomeType === "sick-pay" && Object.prototype.hasOwnProperty.call(source, "netAmount")
      ? source.netAmount
      : source;
    const incomplete = (code, message, field) => ({
      status: code,
      monthlyValues: null,
      sixMonthTotal: null,
      monthlyAverage: null,
      warnings: [warning(code, message, field)],
      openChecks: [code],
    });
    const monthlyFactor = source?.incomeType === "sick-pay" && source?.period === "calendar-day" ? 30 : 1;
    const applyMonthlyFactor = (amount) => monthlyFactor === 1 ? amount : Math.round(amount * monthlyFactor * 100) / 100;
    if (effectiveSource?.entryMethod === "average") {
      const amount = parseNonNegativeAmount(effectiveSource.monthlyAverage);
      if (amount === null) return incomplete("MISSING_REQUIRED_DATA", "Der monatliche Durchschnitt fehlt oder ist ungültig.", "monthlyAverage");
      const monthlyAmount = applyMonthlyFactor(amount);
      const monthlyValues = [monthlyAmount, monthlyAmount, monthlyAmount, monthlyAmount, monthlyAmount, monthlyAmount];
      return { status: "PREPARED", monthlyValues, sixMonthTotal: monthlyAmount * 6, monthlyAverage: monthlyAmount, warnings: [], openChecks: [] };
    }
    if (effectiveSource?.entryMethod === "monthly") {
      const rawValues = asArray(effectiveSource.monthlyValues);
      if (rawValues.length < 6 || rawValues.slice(0, 6).some(isBlank)) {
        return incomplete("MISSING_REQUIRED_DATA", "Für den festen Bemessungszeitraum werden sechs vollständige Monatswerte benötigt.", "monthlyValues");
      }
      const monthlyValues = rawValues.slice(0, 6).map(parseNonNegativeAmount).map((value) => value === null ? null : applyMonthlyFactor(value));
      if (monthlyValues.some((value) => value === null)) {
        return incomplete("INVALID_MONTHLY_AMOUNT", "Monatswerte müssen nicht negative Zahlen sein.", "monthlyValues");
      }
      const sixMonthTotal = monthlyValues.reduce((sum, amount) => sum + amount, 0);
      return { status: "PREPARED", monthlyValues, sixMonthTotal, monthlyAverage: sixMonthTotal / 6, warnings: [], openChecks: [] };
    }
    return incomplete("INCOME_ENTRY_METHOD_UNRESOLVED", "Die Eingabemethode wird nicht unterstützt.", "entryMethod");
  }

  function readSixMonthAmounts(source) {
    const prepared = prepareSixMonthValues(source);
    return prepared.status === "PREPARED"
      ? { status: "CALCULATED", values: prepared.monthlyValues }
      : { status: prepared.status === "INCOME_ENTRY_METHOD_UNRESOLVED" ? prepared.status : "MISSING_REQUIRED_AMOUNT", values: null };
  }

  function classifyMinimumIncomeSource(source, personRole) {
    const base = {
      sourceId: typeof source?.id === "string" ? source.id : "",
      personRole,
      incomeType: source?.incomeType || "",
      amountType: source?.amountType || "",
      ruleId: RULE_IDS.minimumIncome,
      sourceIds: ["SRC-DA-KIZ-2026-02-20", "SRC-BKGG-6A"],
    };

    if (["maternity-benefit", "sgb2-benefit"].includes(source?.incomeType)) {
      return {
        ...base,
        status: "EXCLUDED",
        classification: "CONFIRMED_NON_INCOME",
        reason: source.incomeType === "maternity-benefit"
          ? "Mutterschaftsgeld nach § 19 MuSchG wird nicht als Einkommen berücksichtigt."
          : "Leistungen nach dem SGB II werden bei der Mindesteinkommensgrenze nicht als Einkommen berücksichtigt.",
      };
    }

    if (EMPLOYMENT_GROSS_TYPES.has(source?.incomeType) && source?.amountType !== "gross") {
      return { ...base, status: "UNSUPPORTED_AMOUNT_TYPE", reason: "Für diese Einkommensart ist ein geeigneter Bruttobetrag erforderlich." };
    }
    if (source?.incomeType === "parental-allowance" && !PARENTAL_ALLOWANCE_AMOUNT_TYPES.has(source?.amountType)) {
      return { ...base, status: "UNSUPPORTED_AMOUNT_TYPE", reason: "Der eingegebene Betragstyp des Elterngeldes wird nicht unterstützt." };
    }
    const runningPaymentTypes = new Set(["sick-pay", "unemployment-1", "adult-maintenance"]);
    const sickPayHasSeparateNet = source?.incomeType === "sick-pay" && Object.prototype.hasOwnProperty.call(source, "netAmount");
    if (runningPaymentTypes.has(source?.incomeType) && !sickPayHasSeparateNet && !["net", "notice"].includes(source?.amountType)) {
      return { ...base, status: "UNSUPPORTED_AMOUNT_TYPE", reason: "Für diese laufende Leistung wird der Auszahlungs- oder Bescheidbetrag benötigt." };
    }
    const unresolvedByType = {
      pension: ["PENSION_MINIMUM_INCOME_BASIS_NOT_CAPTURED", "Rentenart, Brutto-/Nettobasis, Nachzahlung und Erstattungsfall sind nicht eindeutig erfasst."],
      "self-employed": ["SELF_EMPLOYMENT_AMOUNT_BASIS_NOT_CAPTURED", "Der Betrag ist nicht eindeutig als Betriebseinnahme vor Ausgaben und gesetzlichen Abzügen gekennzeichnet."],
      "education-support": ["EDUCATION_SUPPORT_TYPE_NOT_CAPTURED", "BAföG, BAB, Stipendium, Ausbildungsgeld und AFBG-Unterhalt sind nicht unterscheidbar."],
      rental: ["RENTAL_MINIMUM_INCOME_BASIS_NOT_CAPTURED", "Einnahmen, unmittelbar zugehörige Kosten und Vermietungsart sind nicht ausreichend unterschieden."],
      "voluntary-service": ["VOLUNTARY_SERVICE_MINIMUM_INCOME_BASIS_NOT_CAPTURED", "Die konkrete Leistung und geeignete Bemessungsgröße sind nicht ausreichend erfasst."],
      "state-benefit": ["STATE_BENEFIT_TYPE_NOT_CAPTURED", "Die konkrete staatliche Leistung ist nicht benannt."],
      other: ["OTHER_INCOME_CLASSIFICATION_REQUIRED", "Freitext wird nicht als Rechtskategorie interpretiert."],
    };
    if (unresolvedByType[source?.incomeType]) {
      const [status, reason] = unresolvedByType[source.incomeType];
      return { ...base, status, reason };
    }
    if (!EMPLOYMENT_GROSS_TYPES.has(source?.incomeType) && source?.incomeType !== "parental-allowance" && !runningPaymentTypes.has(source?.incomeType)) {
      return { ...base, status: "INCOME_CLASSIFICATION_UNRESOLVED", reason: "Diese Einkommensart ist für die Mindesteinkommensprüfung noch nicht bestätigt klassifiziert." };
    }

    const amounts = readSixMonthAmounts(source);
    if (amounts.status !== "CALCULATED") {
      const status = EMPLOYMENT_GROSS_TYPES.has(source.incomeType) ? "MISSING_REQUIRED_GROSS_AMOUNT" : amounts.status;
      return { ...base, status, reason: "Die Einkommensquelle enthält keinen vollständig verwertbaren Sechsmonatsbetrag." };
    }

    const sixMonthTotal = amounts.values.reduce((sum, amount) => sum + amount, 0);
    return {
      ...base,
      status: "INCLUDED",
      classification: "INCLUDED",
      sixMonthValues: amounts.values,
      sixMonthTotal,
      averageAmount: sixMonthTotal / 6,
      deductionsIgnoredForMinimumIncome: true,
    };
  }

  function evaluateMinimumIncome(state, householdId) {
    const household = state?.households?.[householdId];
    const householdType = household?.adults;
    const threshold = householdType === "single" ? 600 : householdType === "couple" ? 900 : null;
    const warnings = [];
    const openChecks = [];
    if (!household || threshold === null) {
      return {
        ruleId: RULE_IDS.minimumIncome,
        householdId,
        householdType: householdType || null,
        threshold,
        averageRelevantIncome: null,
        differenceToThreshold: null,
        isThresholdMet: null,
        status: "UNSUPPORTED_HOUSEHOLD_TYPE",
        includedIncomeSources: [],
        excludedIncomeSources: [],
        unresolvedIncomeSources: [],
        warnings: [warning("UNSUPPORTED_HOUSEHOLD_TYPE", "Die Haushaltsform kann für die Mindesteinkommensgrenze nicht ausgewertet werden.", "adults")],
        openChecks: ["HOUSEHOLD_TYPE_REVIEW_REQUIRED"],
      };
    }

    const sources = asArray(household.applicantIncomeSources).map((source) => ({ source, personRole: "applicant" }));
    if (householdType === "couple") {
      sources.push(...asArray(household.partnerIncomeSources).map((source) => ({ source, personRole: "partner" })));
    }
    const statusIssues = ["applicant", ...(householdType === "couple" ? ["partner"] : [])].flatMap((personRole) => {
      const list = asArray(personRole === "partner" ? household.partnerIncomeSources : household.applicantIncomeSources);
      const declared = personRole === "partner" ? household.partnerIncomeStatus : household.applicantIncomeStatus;
      const status = ["unknown", "present", "none"].includes(declared) ? declared : list.length > 0 ? "present" : "unknown";
      const code = status === "none" && list.length > 0
        ? "ADULT_INCOME_STATUS_SOURCE_CONTRADICTION"
        : status !== "none" && list.length === 0
          ? "ADULT_INCOME_STATUS_REQUIRED"
          : null;
      return code ? [{ personRole, code }] : [];
    });
    if (statusIssues.length) {
      statusIssues.forEach(({ personRole, code }) => {
        openChecks.push(`${code}:${personRole}`);
        warnings.push(warning(code, "Der Einkommensstatus der erwachsenen Person ist noch nicht eindeutig beantwortet.", "incomeStatus"));
      });
      return {
        ruleId: RULE_IDS.minimumIncome,
        householdId,
        householdType,
        threshold,
        averageRelevantIncome: null,
        differenceToThreshold: null,
        isThresholdMet: null,
        status: "UNRESOLVED",
        includedIncomeSources: [],
        excludedIncomeSources: [],
        unresolvedIncomeSources: statusIssues.map(({ personRole, code }) => ({ personRole, sourceId: null, status: code, reason: "Einkommensstatus erforderlich." })),
        warnings,
        openChecks,
      };
    }
    const classified = sources.map(({ source, personRole }) => classifyMinimumIncomeSource(source, personRole));
    const includedIncomeSources = classified.filter((source) => source.status === "INCLUDED");
    const excludedIncomeSources = classified.filter((source) => source.status === "EXCLUDED");
    const unresolvedIncomeSources = classified.filter((source) => !["INCLUDED", "EXCLUDED"].includes(source.status));

    if (unresolvedIncomeSources.length) {
      unresolvedIncomeSources.forEach((source) => {
        openChecks.push(`${source.status}:${source.sourceId || source.personRole}`);
        warnings.push(warning(source.status, source.reason, "incomeSources"));
      });
      return {
        ruleId: RULE_IDS.minimumIncome,
        householdId,
        householdType,
        threshold,
        averageRelevantIncome: null,
        differenceToThreshold: null,
        isThresholdMet: null,
        status: "UNRESOLVED",
        includedIncomeSources,
        excludedIncomeSources,
        unresolvedIncomeSources,
        warnings,
        openChecks,
      };
    }

    const sixMonthTotal = includedIncomeSources.reduce((sum, source) => sum + source.sixMonthTotal, 0);
    const averageRelevantIncome = sixMonthTotal / 6;
    return {
      ruleId: RULE_IDS.minimumIncome,
      householdId,
      householdType,
      threshold,
      averageRelevantIncome,
      differenceToThreshold: averageRelevantIncome - threshold,
      isThresholdMet: averageRelevantIncome >= threshold,
      status: "CALCULATED",
      includedIncomeSources,
      excludedIncomeSources,
      unresolvedIncomeSources: [],
      warnings,
      openChecks,
    };
  }

  const DIRECT_DEDUCTION_FIELDS = Object.freeze([
    ["tax", "taxAmount", "DIRECT_TAX"],
    ["healthInsurance", "healthInsuranceAmount", "HEALTH_INSURANCE"],
    ["careInsurance", "careInsuranceAmount", "CARE_INSURANCE"],
    ["pensionInsurance", "pensionInsuranceAmount", "PENSION_INSURANCE"],
    ["unemploymentInsurance", "unemploymentInsuranceAmount", "UNEMPLOYMENT_INSURANCE"],
    ["otherRegular", "otherAmount", "OTHER_REGULAR_DEDUCTION"],
  ]);

  function deductionPosition({ positionId, deductionType, enteredAmount, prepared = null, status, reason, openCheck = null, details = {} }) {
    const monthlyValues = prepared?.monthlyValues || (enteredAmount !== null ? [enteredAmount, enteredAmount, enteredAmount, enteredAmount, enteredAmount, enteredAmount] : null);
    const monthlyAverage = prepared?.monthlyAverage ?? enteredAmount;
    const sixMonthTotal = prepared?.sixMonthTotal ?? (enteredAmount !== null ? enteredAmount * 6 : null);
    return {
      ruleId: RULE_IDS.deduction,
      positionId,
      deductionType,
      enteredAmount: monthlyAverage,
      monthlyValues,
      monthlyAverage,
      sixMonthTotal,
      consideredAmount: status === "SUPPORTED" ? monthlyAverage : null,
      structurallySupportedMonthlyValues: status === "SUPPORTED" ? monthlyValues : null,
      isFinalDeductibleAmount: false,
      classification: status === "SUPPORTED" ? "STRUCTURALLY_SUPPORTED" : status,
      status,
      reason,
      sourceIds: ["SRC-DA-KIZ-2026-02-20", "SRC-SGBII-11-11B"],
      details,
      warnings: openCheck ? [warning(openCheck, reason, deductionType)] : [],
      openChecks: openCheck ? [openCheck] : [],
    };
  }

  function evaluateDirectDeductions(deductions, context = {}) {
    const safeDeductions = deductions && typeof deductions === "object" ? deductions : {};
    const positions = [];
    DIRECT_DEDUCTION_FIELDS.forEach(([flag, amountField, classification]) => {
      const current = safeDeductions[flag];
      const enabled = typeof current === "object" ? current.enabled === true : current === true;
      if (!enabled) return;
      const series = typeof current === "object"
        ? current
        : { entryMethod: "average", monthlyAverage: safeDeductions[amountField], monthlyValues: [] };
      const prepared = prepareSixMonthValues(series);
      const amount = prepared.monthlyAverage;
      const positionId = `${context.sourceId || "source"}:${flag}`;
      if (context.incomeType === "sick-pay" && ["healthInsurance", "careInsurance", "pensionInsurance", "unemploymentInsurance"].includes(flag) && (context.sickPayHasSeparateNet === true || (context.sickPayHasSeparateNet === undefined && ["net", "notice"].includes(context.amountType)))) {
        positions.push(deductionPosition({ positionId, deductionType: flag, enteredAmount: amount, prepared, status: "EXCLUDED", reason: "Der bereits nach Sozialversicherungsabzügen ausgewiesene Krankengeld-Netto-/Zahlbetrag wird nicht nochmals um SV-Beiträge gemindert.", details: { classification: "ALREADY_INCLUDED_IN_NET_PAYMENT" } }));
        return;
      }
      if (prepared.status !== "PREPARED") {
        positions.push(deductionPosition({ positionId, deductionType: flag, enteredAmount: null, status: "MISSING_REQUIRED_DATA", reason: "Der Abzug ist aktiviert, aber ein gültiger tatsächlicher Betrag fehlt.", openCheck: "DEDUCTION_AMOUNT_REQUIRED" }));
      } else if (flag === "tax") {
        positions.push(deductionPosition({ positionId, deductionType: flag, enteredAmount: amount, prepared, status: "SUPPORTED", reason: `${classification} wird ausschließlich mit den tatsächlich eingegebenen Monatsbeträgen strukturell vorbereitet.` }));
      } else if (["healthInsurance", "careInsurance", "pensionInsurance", "unemploymentInsurance"].includes(flag)) {
        if (series?.mandatoryStatus === "yes") {
          positions.push(deductionPosition({ positionId, deductionType: flag, enteredAmount: amount, prepared, status: "SUPPORTED", reason: `${classification} wird als ausdrücklich bestätigter tatsächlicher Pflichtbeitrag vorbereitet.`, details: { mandatoryStatus: "yes" } }));
        } else if (series?.mandatoryStatus === "no") {
          positions.push(deductionPosition({ positionId, deductionType: flag, enteredAmount: amount, prepared, status: "EXCLUDED", reason: "Der Betrag ist ausdrücklich nicht als Pflichtbeitrag bestätigt und wird nicht unter § 11b Absatz 1 Nummer 2 abgezogen.", details: { mandatoryStatus: "no" } }));
        } else {
          const unresolvedPosition = deductionPosition({ positionId, deductionType: flag, enteredAmount: amount, prepared, status: "UNRESOLVED", reason: "Pflichtbeitrag und private oder freiwillige Versicherung sind nicht eindeutig unterschieden.", openCheck: "SOCIAL_INSURANCE_MANDATORY_STATUS_REQUIRED", details: { mandatoryStatus: series?.mandatoryStatus || "unknown" } });
          if (["healthInsurance", "careInsurance"].includes(flag)) unresolvedPosition.openChecks.push("INSURANCE_SYSTEM_AND_PERIOD_NOT_CAPTURED");
          positions.push(unresolvedPosition);
        }
      } else {
        positions.push(deductionPosition({ positionId, deductionType: flag, enteredAmount: amount, prepared, status: "UNRESOLVED", reason: "Für den sonstigen regelmäßigen Abzug fehlt eine bestätigte Einzelregel.", openCheck: "OTHER_REGULAR_DEDUCTION_CLASSIFICATION_REQUIRED" }));
      }
    });
    const supportedPositions = positions.filter(
      (item, index, all) => item.status === "SUPPORTED" && all.findIndex((candidate) => candidate.positionId === item.positionId) === index
    );
    const structurallySupportedTotal = supportedPositions.reduce((sum, item) => sum + item.consideredAmount, 0);
    return {
      ruleId: RULE_IDS.deduction,
      positions,
      structurallySupportedTotal,
      structurallySupportedSixMonthTotal: supportedPositions.reduce((sum, item) => sum + item.sixMonthTotal, 0),
      supportedTotal: structurallySupportedTotal,
      finalDeductibleTotal: null,
      supportedTotalIsFinalLegalDeduction: false,
      status: positions.some((item) => item.status !== "SUPPORTED") ? "PARTIAL" : "PREPARED",
      warnings: positions.flatMap((item) => item.warnings),
      openChecks: [...new Set(positions.flatMap((item) => item.openChecks))],
    };
  }

  function evaluateExpense(expense, context = {}) {
    const type = expense?.expenseType || "";
    const series = expense?.entryMethod
      ? expense
      : { entryMethod: "average", monthlyAverage: expense?.amount, monthlyValues: [] };
    const prepared = prepareSixMonthValues(series);
    const amount = prepared.monthlyAverage;
    const positionId = typeof expense?.id === "string" ? expense.id : `${context.personRole || "person"}:expense`;
    if (type === "commute" && expense?.commuteMode !== "amount") {
      return deductionPosition({
        positionId,
        deductionType: type,
        enteredAmount: amount,
        status: "UNRESOLVED",
        reason: "Aus Entfernung und Arbeitstagen wird ohne bestätigten Satz kein Eurobetrag berechnet.",
        openCheck: "UNRESOLVED_RATE_REQUIRED",
        details: { commuteMode: expense?.commuteMode || "", distanceKm: expense?.distanceKm ?? "", workDaysPerMonth: expense?.workDaysPerMonth ?? "" },
      });
    }
    if (prepared.status !== "PREPARED") {
      return deductionPosition({ positionId, deductionType: type, enteredAmount: null, status: "MISSING_REQUIRED_DATA", reason: "Für die Ausgabe fehlt ein gültiger tatsächlicher Monatsbetrag.", openCheck: "EXPENSE_AMOUNT_REQUIRED" });
    }
    if (type === "commute" || type === "public-transport") {
      return deductionPosition({ positionId, deductionType: type, enteredAmount: amount, prepared, status: "SUPPORTED", reason: "Die ausdrücklich eingegebenen tatsächlichen Monatsbeträge werden als notwendige Ausgabe strukturell vorbereitet." });
    }
    const unresolved = {
      "car-liability": ["Kfz-Haftpflicht, Schutzbrief und sonstige Bestandteile sind im Betrag nicht getrennt.", "CAR_LIABILITY_COMPONENTS_NOT_CAPTURED"],
      childcare: ["Reine Betreuungskosten sind nicht von Essen und sonstigen Kosten getrennt; auch das spätere Wahlrecht ist nicht erfasst.", "CHILDCARE_PURE_COSTS_NOT_CAPTURED"],
      "paid-maintenance": ["Titel oder notarielle Unterhaltsverpflichtung werden nicht erfasst.", "PAID_MAINTENANCE_LEGAL_BASIS_NOT_CAPTURED"],
      retirement: ["Art und Förderfähigkeit der Altersvorsorge sind nicht erfasst.", "RETIREMENT_DEDUCTION_CLASSIFICATION_REQUIRED"],
      union: ["Die konkrete Abzugsregel ist in dieser Phase nicht implementiert.", "UNION_DEDUCTION_RULE_REQUIRED"],
      "work-expenses": ["Die konkrete notwendige Ausgabe ist nicht ausreichend klassifiziert.", "WORK_EXPENSE_CLASSIFICATION_REQUIRED"],
      "double-household": ["Voraussetzungen der doppelten Haushaltsführung sind nicht erfasst.", "DOUBLE_HOUSEHOLD_REQUIREMENTS_NOT_CAPTURED"],
      "meal-extra": ["Voraussetzungen und Berechnung des Verpflegungsmehraufwands sind nicht erfasst.", "MEAL_EXTRA_REQUIREMENTS_NOT_CAPTURED"],
      other: ["Freitext wird nicht automatisch als Abzug interpretiert.", "OTHER_EXPENSE_CLASSIFICATION_REQUIRED"],
    };
    const [reason, openCheck] = unresolved[type] || ["Die Ausgabenart wird nicht unterstützt.", "EXPENSE_TYPE_UNSUPPORTED"];
    return deductionPosition({ positionId, deductionType: type, enteredAmount: amount, prepared, status: "UNRESOLVED", reason, openCheck, details: { description: expense?.description || "" } });
  }

  function evaluateDeductionsForPerson(incomeSources, expenses, context = {}) {
    const directResults = asArray(incomeSources).map((source) => evaluateDirectDeductions(source?.deductions, { ...context, sourceId: source?.id || "", incomeType: source?.incomeType, amountType: source?.amountType, sickPayHasSeparateNet: source?.incomeType === "sick-pay" && Object.prototype.hasOwnProperty.call(source, "netAmount") }));
    const positions = [
      ...directResults.flatMap((result) => result.positions),
      ...asArray(expenses).map((expense) => evaluateExpense(expense, context)),
    ];
    const duplicateIds = positions.map((item) => item.positionId).filter((id, index, all) => id && all.indexOf(id) !== index);
    if (duplicateIds.length) {
      positions.push(deductionPosition({
        positionId: `duplicate:${duplicateIds[0]}`,
        deductionType: "duplicate-technical-position",
        enteredAmount: null,
        status: "UNRESOLVED",
        reason: "Dieselbe technische Abzugsposition ist mehrfach vorhanden und wird nicht stillschweigend doppelt berücksichtigt.",
        openCheck: "DUPLICATE_DEDUCTION_POSITION_ID",
        details: { duplicateIds: [...new Set(duplicateIds)] },
      }));
    }
    const supportedPositions = positions.filter(
      (item, index, all) => item.status === "SUPPORTED" && all.findIndex((candidate) => candidate.positionId === item.positionId) === index
    );
    const structurallySupportedTotal = supportedPositions.reduce((sum, item) => sum + item.consideredAmount, 0);
    return {
      ruleId: RULE_IDS.deduction,
      personRole: context.personRole || null,
      positions,
      structurallySupportedTotal,
      structurallySupportedSixMonthTotal: supportedPositions.reduce((sum, item) => sum + item.sixMonthTotal, 0),
      supportedTotal: structurallySupportedTotal,
      finalDeductibleTotal: null,
      supportedTotalIsFinalLegalDeduction: false,
      status: positions.some((item) => item.status !== "SUPPORTED") ? "PARTIAL" : "PREPARED",
      warnings: positions.flatMap((item) => item.warnings),
      openChecks: [...new Set(positions.flatMap((item) => item.openChecks))],
    };
  }

  function incomeSourceBase(ruleId, source, personRole, prepared) {
    const sickPay = source?.incomeType === "sick-pay";
    return {
      ruleId,
      sourceId: typeof source?.id === "string" ? source.id : "",
      personRole,
      incomeType: source?.incomeType || "",
      customLabel: source?.customLabel || "",
      amountType: source?.amountType || "",
      rawMonthlyValues: prepared.monthlyValues,
      sixMonthTotal: prepared.sixMonthTotal,
      grossOrEnteredAverage: prepared.monthlyAverage,
      countableBeforeDeductions: null,
      deductionResult: null,
      countableAfterDeductions: null,
      usedRuleIds: [ruleId, ...(sickPay ? [RULE_IDS.sickPayInput] : [])],
      sourceIds: ["SRC-DA-KIZ-2026-02-20", "SRC-SGBII-11-11B", "SRC-SGBII-11A", ...(sickPay ? ["SRC-SGBV-47-1"] : [])],
      reasons: [],
      warnings: [...prepared.warnings],
      openChecks: [...prepared.openChecks],
    };
  }

  function evaluateAdultIncomeSource(source, context = {}) {
    const prepared = prepareSixMonthValues(source);
    const result = incomeSourceBase(RULE_IDS.adultIncome, source, context.personRole || source?.personRole || "applicant", prepared);
    result.deductionResult = evaluateDirectDeductions(source?.deductions, { sourceId: result.sourceId, personRole: result.personRole, incomeType: source?.incomeType, amountType: source?.amountType, sickPayHasSeparateNet: source?.incomeType === "sick-pay" && Object.prototype.hasOwnProperty.call(source, "netAmount") });
    if (prepared.status !== "PREPARED") {
      return { ...result, classification: "INCOMPLETE", status: "INCOMPLETE" };
    }
    const type = source?.incomeType;
    const amountType = source?.amountType;
    if (["maternity-benefit", "sgb2-benefit"].includes(type)) {
      result.countableBeforeDeductions = 0;
      result.reasons.push(type === "maternity-benefit"
        ? "Mutterschaftsgeld nach § 19 MuSchG ist bestätigtes Nicht-Einkommen."
        : "Leistungen nach dem SGB II werden nicht als Einkommen berücksichtigt; ihre Wirkung auf andere KiZ-Prüfschritte bleibt gesondert offen.");
      return { ...result, incomeClass: "NON_INCOME", classification: "CONFIRMED_NON_INCOME", status: "EXCLUDED" };
    }
    if (["employment", "minijob", "training"].includes(type)) {
      if (amountType !== "gross") {
        result.warnings.push(warning("UNSUPPORTED_AMOUNT_TYPE", "Für diese Einkommensart wird ein geeigneter Bruttobetrag benötigt.", "amountType"));
        result.openChecks.push("GROSS_AMOUNT_REQUIRED");
        return { ...result, classification: "UNRESOLVED", status: "UNRESOLVED" };
      }
      if (type === "training" && !["yes", "no"].includes(source?.u25SpecialAllowanceStatus)) {
        result.warnings.push(warning("ADULT_TRAINING_2B_STATUS_REQUIRED", "Die Anwendung des besonderen U25-Grundabsetzbetrags ist nicht geklärt.", "u25SpecialAllowanceStatus"));
        result.openChecks.push("ADULT_TRAINING_2B_STATUS_REQUIRED");
        return { ...result, incomeClass: "EARNED", classification: "EARNED", status: "UNRESOLVED" };
      }
      result.reasons.push("Der Bruttobetrag ist roh vorbereitet; eine automatische Brutto-Netto- oder Freibetragsberechnung findet nicht statt.");
      return { ...result, incomeClass: "EARNED", classification: "SUPPORTED_RAW_GROSS", status: "PARTIAL" };
    }
    if (["sick-pay", "unemployment-1", "adult-maintenance"].includes(type)) {
      if (!["net", "notice"].includes(amountType) && !(type === "sick-pay" && Object.prototype.hasOwnProperty.call(source, "netAmount"))) {
        result.warnings.push(warning("UNSUPPORTED_AMOUNT_TYPE", "Für diese laufende Geldleistung wird der Auszahlungs- oder Bescheidbetrag benötigt.", "amountType"));
        result.openChecks.push("PAYMENT_OR_NOTICE_AMOUNT_REQUIRED");
        return { ...result, classification: "UNRESOLVED", status: "UNRESOLVED" };
      }
      result.countableBeforeDeductions = prepared.monthlyAverage;
      result.reasons.push(type === "unemployment-1" ? "Arbeitslosengeld I wird als SGB-III-Leistung getrennt von SGB-II-Leistungen vorbereitet." : "Der laufende monatliche Zufluss wird vor möglichen Abzügen vorbereitet.");
      return { ...result, incomeClass: "OTHER", classification: "SUPPORTED_RUNNING_PAYMENT", status: "PARTIAL" };
    }
    if (type === "parental-allowance") {
      const confirmedExemption = parseNonNegativeAmount(source?.confirmedExemptionMonthly);
      if (!["basis", "plus"].includes(source?.parentalAllowanceType) || confirmedExemption === null) {
        const code = !["basis", "plus"].includes(source?.parentalAllowanceType) ? "PARENTAL_ALLOWANCE_TYPE_REQUIRED" : "PARENTAL_ALLOWANCE_EXEMPTION_AMOUNT_REQUIRED";
        result.warnings.push(warning(code, "Elterngeldart und besonderer Freibetrag müssen ausdrücklich geklärt sein.", "parentalAllowanceType"));
        result.openChecks.push(code);
        result.openChecks.push("PARENTAL_ALLOWANCE_EXEMPTION_DATA_NOT_CAPTURED");
        return { ...result, incomeClass: "OTHER", classification: "OTHER", status: "UNRESOLVED" };
      }
      const cap = source.parentalAllowanceType === "basis" ? 300 : 150;
      const exemption = Math.min(prepared.monthlyAverage, confirmedExemption, cap);
      result.countableBeforeDeductions = stabilizeArithmeticPrecision(Math.max(0, prepared.monthlyAverage - exemption));
      result.parentalAllowanceExemption = exemption;
      return { ...result, incomeClass: "OTHER", classification: "SUPPORTED_PARENTAL_ALLOWANCE", status: "PARTIAL" };
    }
    const openByType = {
      pension: ["PENSION_TYPE_AND_BACKPAY_STATUS_NOT_CAPTURED", "Rentenart, Nachzahlung und Erstattungswirkung sind nicht unterscheidbar."],
      "self-employed": ["SELF_EMPLOYMENT_PROFIT_DATA_NOT_CAPTURED", "Umsatz, Betriebsausgaben und maßgeblicher Gewinn werden nicht ausreichend erfasst."],
      rental: ["RENTAL_NET_INCOME_DATA_NOT_CAPTURED", "Kosten und Art der Vermietung beziehungsweise Untervermietung sind nicht erfasst."],
      "education-support": ["EDUCATION_SUPPORT_COMPONENTS_NOT_CAPTURED", "Leistungsart und zweckbestimmte Bestandteile sind nicht unterscheidbar."],
      "voluntary-service": ["VOLUNTARY_SERVICE_CLASSIFICATION_DATA_NOT_CAPTURED", "Alter und konkrete Leistungsbestandteile sind nicht ausreichend erfasst."],
      "state-benefit": ["STATE_BENEFIT_TYPE_NOT_CAPTURED", "Die konkrete staatliche Leistung ist nicht benannt."],
      other: ["OTHER_INCOME_CLASSIFICATION_REQUIRED", "Freitext wird ohne bestätigte Einzelregel nicht interpretiert."],
    };
    const [openCheck, reason] = openByType[type] || ["ADULT_INCOME_TYPE_UNSUPPORTED", "Die Einkommensart wird nicht unterstützt."];
    result.warnings.push(warning(openCheck, reason, "incomeType"));
    result.openChecks.push(openCheck);
    result.reasons.push(reason);
    return { ...result, classification: type === "parental-allowance" || type === "pension" ? "OPEN_CHECK" : "UNRESOLVED", status: "UNRESOLVED" };
  }

  function adultSeriesAmount(series, monthIndex) {
    const prepared = prepareSixMonthValues(series);
    return prepared.status === "PREPARED" ? prepared.monthlyValues[monthIndex] : null;
  }

  function adultSourceForMonth(source, monthIndex) {
    const amount = adultSeriesAmount(source, monthIndex);
    const result = {
      sourceId: typeof source?.id === "string" ? source.id : "",
      incomeType: source?.incomeType || "",
      amountType: source?.amountType || "",
      rawAmount: amount,
      countableBeforePersonDeductions: null,
      excludedAmount: 0,
      incomeClass: "UNRESOLVED",
      classification: "UNRESOLVED",
      status: "UNRESOLVED",
      warnings: [],
      openChecks: [],
    };
    const addOpen = (code, message, field = "incomeType") => {
      result.openChecks.push(code);
      result.warnings.push(warning(code, message, field));
    };
    if (amount === null) {
      addOpen("ADULT_INCOME_MONTH_VALUE_REQUIRED", "Für diesen Bemessungsmonat fehlt ein gültiger nicht negativer Betrag.", "monthlyValues");
      return result;
    }
    const type = source?.incomeType;
    if (["maternity-benefit", "sgb2-benefit"].includes(type)) {
      return { ...result, countableBeforePersonDeductions: 0, excludedAmount: amount, incomeClass: "NON_INCOME", classification: "CONFIRMED_NON_INCOME", status: "SUPPORTED" };
    }
    if (EMPLOYMENT_GROSS_TYPES.has(type)) {
      if (source?.amountType !== "gross") {
        addOpen("GROSS_AMOUNT_REQUIRED", "Erwerbseinkommen muss als tatsächliches Brutto erfasst sein.", "amountType");
        return result;
      }
      if (type === "training" && !["yes", "no"].includes(source?.u25SpecialAllowanceStatus)) {
        addOpen("ADULT_TRAINING_2B_STATUS_REQUIRED", "Für die Ausbildung muss die Anwendung des besonderen U25-Grundabsetzbetrags bestätigt oder verneint werden.", "u25SpecialAllowanceStatus");
        return { ...result, incomeClass: "EARNED", classification: "EARNED" };
      }
      return { ...result, countableBeforePersonDeductions: amount, incomeClass: "EARNED", classification: "EARNED", status: "SUPPORTED" };
    }
    if (["sick-pay", "unemployment-1", "adult-maintenance"].includes(type)) {
      if (!["net", "notice"].includes(source?.amountType) && !(type === "sick-pay" && Object.prototype.hasOwnProperty.call(source, "netAmount"))) {
        addOpen("PAYMENT_OR_NOTICE_AMOUNT_REQUIRED", "Für diese Leistung wird der tatsächliche Auszahlungs- oder Bescheidbetrag benötigt.", "amountType");
        return { ...result, incomeClass: "OTHER", classification: "OTHER" };
      }
      return { ...result, countableBeforePersonDeductions: amount, incomeClass: "OTHER", classification: "OTHER", status: "SUPPORTED" };
    }
    if (type === "parental-allowance") {
      if (!PARENTAL_ALLOWANCE_AMOUNT_TYPES.has(source?.amountType)) {
        addOpen("PARENTAL_ALLOWANCE_AMOUNT_TYPE_REQUIRED", "Für Elterngeld wird ein tatsächlicher Brutto-, Netto- oder Bescheidbetrag benötigt.", "amountType");
        return { ...result, incomeClass: "OTHER", classification: "OTHER" };
      }
      if (!["basis", "plus"].includes(source?.parentalAllowanceType)) {
        addOpen("PARENTAL_ALLOWANCE_TYPE_REQUIRED", "Basiselterngeld und Elterngeld Plus müssen unterschieden werden.", "parentalAllowanceType");
        return { ...result, incomeClass: "OTHER", classification: "OTHER" };
      }
      const confirmedExemption = parseNonNegativeAmount(source?.confirmedExemptionMonthly);
      if (confirmedExemption === null) {
        addOpen("PARENTAL_ALLOWANCE_EXEMPTION_AMOUNT_REQUIRED", "Der monatliche Elterngeldfreibetrag laut Bescheid oder Elterngeldstelle fehlt.", "confirmedExemptionMonthly");
        return { ...result, incomeClass: "OTHER", classification: "OTHER" };
      }
      const cap = source.parentalAllowanceType === "basis" ? 300 : 150;
      const exemption = Math.min(amount, confirmedExemption, cap);
      return {
        ...result,
        countableBeforePersonDeductions: stabilizeArithmeticPrecision(Math.max(0, amount - exemption)),
        excludedAmount: exemption,
        parentalAllowanceExemption: exemption,
        incomeClass: "OTHER",
        classification: "OTHER",
        status: "SUPPORTED",
      };
    }
    const openByType = {
      pension: "PENSION_TYPE_AND_BACKPAY_STATUS_NOT_CAPTURED",
      "self-employed": "SELF_EMPLOYMENT_PROFIT_DATA_NOT_CAPTURED",
      rental: "RENTAL_NET_INCOME_DATA_NOT_CAPTURED",
      "education-support": "EDUCATION_SUPPORT_COMPONENTS_NOT_CAPTURED",
      "voluntary-service": "VOLUNTARY_SERVICE_CLASSIFICATION_DATA_NOT_CAPTURED",
      "state-benefit": "STATE_BENEFIT_TYPE_NOT_CAPTURED",
      other: "OTHER_INCOME_CLASSIFICATION_REQUIRED",
    };
    if (type === "self-employed") result.incomeClass = "EARNED";
    else if (["pension", "rental", "education-support", "voluntary-service", "state-benefit"].includes(type)) result.incomeClass = "OTHER";
    addOpen(openByType[type] || "ADULT_INCOME_TYPE_UNSUPPORTED", "Für diese Einkommensart ist die abschließende Bereinigung noch nicht sicher automatisierbar.");
    return result;
  }

  function adultDirectDeductionsForMonth(sources, monthIndex) {
    const positions = [];
    const warnings = [];
    const openChecks = [];
    let taxes = 0;
    let mandatorySocialInsurance = 0;
    const addOpen = (code, message, field) => {
      openChecks.push(code);
      warnings.push(warning(code, message, field));
    };
    asArray(sources).forEach((source) => {
      DIRECT_DEDUCTION_FIELDS.forEach(([field]) => {
        const entry = source?.deductions?.[field];
        if (!(typeof entry === "object" ? entry.enabled === true : entry === true)) return;
        const amount = adultSeriesAmount(typeof entry === "object" ? entry : {}, monthIndex);
        const position = { ruleId: RULE_IDS.adultDeduction, positionId: `${source?.id || "source"}:${field}`, sourceId: source?.id || "", deductionType: field, monthIndex, enteredAmount: amount, consideredAmount: null, bucket: null, status: "UNRESOLVED" };
        if (source?.incomeType === "sick-pay" && ["healthInsurance", "careInsurance", "pensionInsurance", "unemploymentInsurance"].includes(field) && (Object.prototype.hasOwnProperty.call(source, "netAmount") || ["net", "notice"].includes(source?.amountType))) {
          Object.assign(position, { consideredAmount: 0, bucket: "ALREADY_INCLUDED_IN_NET_PAYMENT", status: "EXCLUDED" });
          positions.push(position);
          return;
        }
        if (amount === null) {
          addOpen("DEDUCTION_AMOUNT_REQUIRED", "Der aktivierte direkte Abzug benötigt für jeden Monat einen tatsächlichen Betrag; 0 ist zulässig.", field);
        } else if (field === "tax") {
          taxes += amount;
          Object.assign(position, { consideredAmount: amount, bucket: "TAX", status: "SUPPORTED" });
        } else if (["healthInsurance", "careInsurance", "pensionInsurance", "unemploymentInsurance"].includes(field)) {
          if (entry?.mandatoryStatus === "yes") {
            mandatorySocialInsurance += amount;
            Object.assign(position, { consideredAmount: amount, bucket: "MANDATORY_SOCIAL_INSURANCE", status: "SUPPORTED" });
          } else if (entry?.mandatoryStatus === "no") {
            Object.assign(position, { consideredAmount: 0, bucket: "NOT_MANDATORY", status: "EXCLUDED" });
          } else {
            addOpen("SOCIAL_INSURANCE_MANDATORY_STATUS_REQUIRED", "Der Beitrag kann nur bei bestätigter Pflichtversicherung als Pflichtbeitrag abgezogen werden.", field);
          }
        } else {
          addOpen("OTHER_REGULAR_DEDUCTION_CLASSIFICATION_REQUIRED", "Der sonstige regelmäßige Abzug benötigt eine bestätigte Einzelregel.", field);
        }
        positions.push(position);
      });
    });
    return { positions, taxes: stabilizeArithmeticPrecision(taxes), mandatorySocialInsurance: stabilizeArithmeticPrecision(mandatorySocialInsurance), warnings, openChecks };
  }

  function adultExpensesForMonth(expenses, monthIndex, incomeContext) {
    const positions = [];
    const warnings = [];
    const openChecks = [];
    let nr3And4 = 30;
    let nr5 = 0;
    let generalNr7 = 0;
    const addOpen = (code, message, field = "expenseType") => {
      openChecks.push(code);
      warnings.push(warning(code, message, field));
    };
    const commuteEntries = asArray(expenses).filter((expense) => ["commute", "public-transport"].includes(expense?.expenseType));
    if (commuteEntries.length > 1) addOpen("DUPLICATE_COMMUTE_COST_CLASSIFICATION_REQUIRED", "Mehrere Arbeitswegskosten können ohne Bestätigung unterschiedlicher Fahrten nicht doppelt berücksichtigt werden.");
    const seenIds = new Set();
    asArray(expenses).forEach((expense) => {
      const id = typeof expense?.id === "string" ? expense.id : "";
      const position = { ruleId: RULE_IDS.adultDeduction, positionId: id, deductionType: expense?.expenseType || "", monthIndex, enteredAmount: null, consideredAmount: null, bucket: null, status: "UNRESOLVED", details: {} };
      if (!id || seenIds.has(id)) {
        addOpen("DUPLICATE_DEDUCTION_POSITION_ID", "Jede Abzugsposition benötigt eine eindeutige technische ID.", "id");
        positions.push(position);
        return;
      }
      seenIds.add(id);
      const type = expense?.expenseType;
      let amount = null;
      if (type === "commute" && expense?.commuteMode === "details") {
        const distance = parseNonNegativeAmount(expense?.distanceKm);
        const days = parseNonNegativeAmount(expense?.workDaysPerMonth);
        if (distance === null || days === null) {
          addOpen("COMMUTE_DETAILS_REQUIRED", "Entfernung und Arbeitstage müssen vollständig erfasst sein.", "distanceKm");
        } else {
          const calculatedCarCommuteFlat = stabilizeArithmeticPrecision(distance * days * 0.2);
          position.details.calculatedCarCommuteFlat = calculatedCarCommuteFlat;
          if (expense?.reasonablePublicTransport === "no") amount = calculatedCarCommuteFlat;
          else if (expense?.reasonablePublicTransport === "yes") {
            const alternative = parseNonNegativeAmount(expense?.monthlyPublicTransportAlternativeCost);
            if (alternative === null) addOpen("PUBLIC_TRANSPORT_ALTERNATIVE_COST_REQUIRED", "Bei zumutbarem ÖPNV werden dessen monatliche Kosten benötigt.", "monthlyPublicTransportAlternativeCost");
            else amount = Math.min(calculatedCarCommuteFlat, alternative);
          } else addOpen("REASONABLE_PUBLIC_TRANSPORT_STATUS_REQUIRED", "Die Zumutbarkeit eines öffentlichen Verkehrsmittels muss bestätigt oder verneint werden.", "reasonablePublicTransport");
        }
      } else {
        amount = adultSeriesAmount(expense, monthIndex);
        if (amount === null) addOpen("EXPENSE_AMOUNT_REQUIRED", "Für die Ausgabe fehlt ein gültiger Monatsbetrag.", "monthlyAverage");
      }
      position.enteredAmount = amount;
      if (amount === null) {
        positions.push(position);
        return;
      }
      if (type === "commute") {
        if (expense?.commuteMode === "amount" && expense?.legalDeductibleAmountConfirmed !== "yes") {
          addOpen("COMMUTE_LEGAL_AMOUNT_CONFIRMATION_REQUIRED", "Der direkt eingegebene Fahrtkostenbetrag muss als rechtlich abzugsfähiger Betrag bestätigt sein.", "legalDeductibleAmountConfirmed");
        } else if (commuteEntries.length === 1) {
          nr5 += amount;
          Object.assign(position, { consideredAmount: amount, bucket: "NR5", status: "SUPPORTED" });
        }
      } else if (type === "public-transport") {
        if (commuteEntries.length === 1) {
          nr5 += amount;
          Object.assign(position, { consideredAmount: amount, bucket: "NR5", status: "SUPPORTED" });
        }
      } else if (type === "car-liability") {
        if (expense?.liabilityOnlyConfirmed === "yes" && expense?.proofStatus === "complete") {
          nr3And4 += amount;
          Object.assign(position, { consideredAmount: amount, bucket: "NR3", status: "SUPPORTED" });
        } else addOpen("CAR_LIABILITY_PROOF_REQUIRED", "Nur reine Kfz-Haftpflicht mit vollständigem Nachweis ist als tatsächlicher Betrag unterstützt.", "proofStatus");
      } else if (type === "childcare") {
        if (expense?.pureCareCostsConfirmed === "yes" && expense?.incomeConnectionConfirmed === "yes") {
          if (amount > incomeContext.grossEarnedIncome + incomeContext.otherIncome) {
            addOpen("CHILDCARE_PARTNER_TRANSFER_REQUIRED", "Die Betreuungskosten übersteigen das Einkommen dieser Person; eine mögliche Partnerübertragung bleibt offen.");
          } else {
            nr5 += amount;
            Object.assign(position, { consideredAmount: amount, bucket: "NR5", status: "SUPPORTED" });
            warnings.push(warning("CHILDCARE_WAIVER_CHECK_LATER", "Ein späteres Wahlrecht zum Verzicht auf den Abzug wird erst in einer Folgephase geprüft.", "expenseType"));
          }
        } else addOpen("CHILDCARE_CONFIRMATIONS_REQUIRED", "Reine Betreuungskosten und Einkommenszusammenhang müssen beide bestätigt sein.", "pureCareCostsConfirmed");
      } else if (type === "paid-maintenance") {
        const maximum = parseNonNegativeAmount(expense?.titleOrNotarialMonthlyMaximum);
        if (expense?.legalObligationConfirmed !== "yes" || maximum === null) {
          addOpen("PAID_MAINTENANCE_LEGAL_BASIS_REQUIRED", "Gesetzliche Verpflichtung und tituliertes/notarielles Monatsmaximum werden benötigt.", "legalObligationConfirmed");
        } else if (incomeContext.grossEarnedIncome > 0 && incomeContext.otherIncome > 0) {
          addOpen("PAID_MAINTENANCE_INCOME_BUCKET_OPEN", "Bei Erwerbs- und anderem Einkommen ist die D6-Zuordnung des Unterhaltsabzugs noch offen.");
        } else {
          generalNr7 += Math.min(amount, maximum);
          Object.assign(position, { consideredAmount: Math.min(amount, maximum), bucket: "NR7", status: "SUPPORTED", details: { legalMaximumAmount: maximum } });
        }
      } else {
        const codeByType = {
          retirement: "RETIREMENT_DEDUCTION_CLASSIFICATION_REQUIRED",
          union: "UNION_DEDUCTION_RULE_REQUIRED",
          "work-expenses": "WORK_EXPENSE_CLASSIFICATION_REQUIRED",
          "double-household": "DOUBLE_HOUSEHOLD_REQUIREMENTS_NOT_CAPTURED",
          "meal-extra": "MEAL_EXTRA_REQUIREMENTS_NOT_CAPTURED",
          other: "OTHER_EXPENSE_CLASSIFICATION_REQUIRED",
        };
        addOpen(codeByType[type] || "EXPENSE_TYPE_UNSUPPORTED", "Diese Ausgabenart benötigt weiterhin eine bestätigte Einzelregel.");
      }
      positions.push(position);
    });
    return { positions, nr3And4: stabilizeArithmeticPrecision(nr3And4), insuranceFlat: 30, nr5: stabilizeArithmeticPrecision(nr5), generalNr7: stabilizeArithmeticPrecision(generalNr7), warnings, openChecks };
  }

  function calculateAdultIncomeForMonth(person, monthIndex, context = {}) {
    const sources = asArray(person?.incomeSources || person?.sources);
    const expenses = asArray(person?.expenses);
    const sourcePositions = sources.map((source) => adultSourceForMonth(source, monthIndex));
    const grossEarnedIncome = stabilizeArithmeticPrecision(sourcePositions.filter((item) => item.incomeClass === "EARNED" && item.status === "SUPPORTED").reduce((sum, item) => sum + item.countableBeforePersonDeductions, 0));
    const otherIncome = stabilizeArithmeticPrecision(sourcePositions.filter((item) => item.incomeClass === "OTHER" && item.status === "SUPPORTED").reduce((sum, item) => sum + item.countableBeforePersonDeductions, 0));
    const excludedIncome = stabilizeArithmeticPrecision(sourcePositions.filter((item) => item.status === "SUPPORTED").reduce((sum, item) => sum + (item.excludedAmount || 0), 0));
    const direct = adultDirectDeductionsForMonth(sources, monthIndex);
    const expenseResult = adultExpensesForMonth(expenses, monthIndex, { grossEarnedIncome, otherIncome });
    const warnings = [...sourcePositions.flatMap((item) => item.warnings), ...direct.warnings, ...expenseResult.warnings];
    const openChecks = [...new Set([...sourcePositions.flatMap((item) => item.openChecks), ...direct.openChecks, ...expenseResult.openChecks])];
    const specialTrainingSources = sourcePositions.filter((item) => item.incomeClass === "EARNED" && sources.find((source) => source?.id === item.sourceId)?.incomeType === "training" && sources.find((source) => source?.id === item.sourceId)?.u25SpecialAllowanceStatus === "yes");
    const standardEarnedSources = sourcePositions.filter((item) => item.incomeClass === "EARNED" && !specialTrainingSources.includes(item));
    if (specialTrainingSources.length && standardEarnedSources.length) openChecks.push("MIXED_EARNED_ALLOWANCE_REGIME_UNRESOLVED");
    let upperTierLimit = 1200;
    if (grossEarnedIncome > 1200) {
      if (context.minorChildInSgbIIBg === true) upperTierLimit = 1500;
      else if (context.minorChildInSgbIIBg !== false) openChecks.push("MINOR_CHILD_OUTSIDE_BG_STATUS_REQUIRED");
    }
    const unresolved = openChecks.length > 0;
    const taxAndSocial = stabilizeArithmeticPrecision(direct.taxes + direct.mandatorySocialInsurance);
    const earnedAfterTaxSocial = Math.max(0, grossEarnedIncome - taxAndSocial);
    const basicAllowanceLimit = specialTrainingSources.length && !standardEarnedSources.length ? 603 : 100;
    const actualNr3To5 = stabilizeArithmeticPrecision(expenseResult.nr3And4 + expenseResult.nr5);
    const useActualInsteadOfBasic = grossEarnedIncome > 400 && actualNr3To5 > basicAllowanceLimit;
    let basicAllowance = 0;
    let actualNr3And4AppliedToEarned = 0;
    let nr5AppliedToEarned = 0;
    if (grossEarnedIncome > 0) {
      if (useActualInsteadOfBasic) {
        actualNr3And4AppliedToEarned = Math.min(expenseResult.nr3And4, earnedAfterTaxSocial);
        nr5AppliedToEarned = Math.min(expenseResult.nr5, Math.max(0, earnedAfterTaxSocial - actualNr3And4AppliedToEarned));
      } else basicAllowance = Math.min(basicAllowanceLimit, earnedAfterTaxSocial);
    }
    const earnedTierAllowanceRaw = calculateEarnedTierAllowance(Math.min(grossEarnedIncome, upperTierLimit), specialTrainingSources.length ? "special-2b" : "general", upperTierLimit);
    const earnedBeforeTier = Math.max(0, earnedAfterTaxSocial - basicAllowance - actualNr3And4AppliedToEarned - nr5AppliedToEarned);
    const earnedIncomeAllowance = Math.min(earnedTierAllowanceRaw, earnedBeforeTier);
    let earnedAfterFinalCleansing = Math.max(0, earnedBeforeTier - earnedIncomeAllowance);
    let transferredNr3And4 = 0;
    let insuranceFlatAppliedToOther = 0;
    if (grossEarnedIncome > 0) {
      const nr3And4CoveredOnEarned = useActualInsteadOfBasic ? actualNr3And4AppliedToEarned : Math.min(expenseResult.nr3And4, basicAllowance);
      transferredNr3And4 = Math.min(otherIncome, Math.max(0, expenseResult.nr3And4 - nr3And4CoveredOnEarned));
    } else {
      insuranceFlatAppliedToOther = Math.min(otherIncome, expenseResult.nr3And4);
    }
    let otherAfterFinalCleansing = Math.max(0, otherIncome - transferredNr3And4 - insuranceFlatAppliedToOther);
    if (!unresolved && expenseResult.generalNr7 > 0) {
      if (grossEarnedIncome > 0) earnedAfterFinalCleansing = Math.max(0, earnedAfterFinalCleansing - expenseResult.generalNr7);
      else otherAfterFinalCleansing = Math.max(0, otherAfterFinalCleansing - expenseResult.generalNr7);
    }
    const finalCountableIncome = unresolved ? null : stabilizeArithmeticPrecision(earnedAfterFinalCleansing + otherAfterFinalCleansing);
    return {
      ruleId: RULE_IDS.adultIncome,
      deductionRuleId: RULE_IDS.adultDeduction,
      personRole: person?.personRole || context.personRole || null,
      monthIndex,
      sourcePositions,
      incomeSources: sourcePositions,
      grossEarnedIncome,
      otherIncomeBeforeDeductions: otherIncome,
      excludedIncome,
      directDeductionPositions: direct.positions,
      personExpensePositions: expenseResult.positions,
      deductionLedger: {
        taxes: direct.taxes,
        mandatorySocialInsurance: direct.mandatorySocialInsurance,
        basicAllowance,
        basicAllowanceLimit,
        actualNr3And4: expenseResult.nr3And4,
        actualNr5: expenseResult.nr5,
        useActualInsteadOfBasic,
        transferredNr3And4: stabilizeArithmeticPrecision(transferredNr3And4),
        insuranceFlat: expenseResult.insuranceFlat,
        insuranceFlatAppliedToOther: stabilizeArithmeticPrecision(insuranceFlatAppliedToOther),
        earnedIncomeAllowance: stabilizeArithmeticPrecision(earnedIncomeAllowance),
        generalNr7: expenseResult.generalNr7,
      },
      earnedActivityDeductionsForExtendedAccess: specialTrainingSources.length ? null : stabilizeArithmeticPrecision(basicAllowance + actualNr3And4AppliedToEarned + nr5AppliedToEarned + earnedIncomeAllowance),
      extendedAccessDeductionStatus: specialTrainingSources.length ? "UNRESOLVED_SPECIAL_ALLOWANCE" : "SUPPORTED",
      structurallySupportedDeductionTotal: stabilizeArithmeticPrecision(taxAndSocial + basicAllowance + actualNr3And4AppliedToEarned + nr5AppliedToEarned + transferredNr3And4 + insuranceFlatAppliedToOther + earnedIncomeAllowance + expenseResult.generalNr7),
      earnedIncomeAfterFinalCleansing: unresolved ? null : stabilizeArithmeticPrecision(earnedAfterFinalCleansing),
      otherIncomeAfterFinalCleansing: unresolved ? null : stabilizeArithmeticPrecision(otherAfterFinalCleansing),
      finalCountableIncome,
      status: unresolved ? "UNRESOLVED" : "SUPPORTED",
      warnings,
      openChecks: [...new Set(openChecks)],
      sourceIds: ["SRC-SGBII-11-11B", "SRC-FW-SGBII-11-11B-2024-10-24", "SRC-BUERGERGELDV-1", "SRC-DA-KIZ-2026-02-20", "SRC-BEEG-10"],
    };
  }

  function minorChildMembershipForAdultAllowance(state, householdId) {
    const minors = asArray(state?.centralChildren).filter((child) => Number.isInteger(Number(child?.age)) && Number(child.age) < 18);
    if (!minors.length) return null;
    const memberships = minors.map((child) => evaluateChildMemberships(state, householdId, child));
    if (memberships.some((item) => item.isSgbIIBgMember === true)) return true;
    if (memberships.every((item) => item.status === "SUPPORTED")) return false;
    return null;
  }

  function evaluateAdultIncomeForHousehold(state, householdId) {
    const household = state?.households?.[householdId];
    if (!household) return { ruleId: RULE_IDS.adultIncome, householdId, status: "UNSUPPORTED_HOUSEHOLD", personResults: {}, warnings: [], openChecks: ["HOUSEHOLD_REQUIRED"] };
    const period = createAssessmentPeriod(state?.applicationMonth, state?.applicationYear);
    const periodMonths = period.status === "CALCULATED" ? period.months : Array.from({ length: 6 }, (_, index) => ({ position: index, month: null, year: null, key: null, label: `Monat ${index + 1}` }));
    const minorChildInSgbIIBg = minorChildMembershipForAdultAllowance(state, householdId);
    const person = (personRole, sources, expenses, declaredStatus) => {
      const safeSources = asArray(sources);
      const incomeStatus = ["unknown", "present", "none"].includes(declaredStatus)
        ? declaredStatus
        : safeSources.length > 0 ? "present" : "unknown";
      const statusOpen = incomeStatus === "none" && safeSources.length > 0
        ? "ADULT_INCOME_STATUS_SOURCE_CONTRADICTION"
        : incomeStatus === "present" && safeSources.length === 0
          ? "ADULT_INCOME_SOURCE_MISSING"
          : incomeStatus === "unknown"
            ? "ADULT_INCOME_STATUS_REQUIRED"
            : null;
      const safeExpenses = asArray(expenses);
      const sourceResults = safeSources.map((source) => evaluateAdultIncomeSource(source, { householdId, personRole }));
      const deductions = evaluateDeductionsForPerson(safeSources, safeExpenses, { householdId, personRole });
      const months = periodMonths.map((periodMonth, index) => ({
        ...calculateAdultIncomeForMonth({ personRole, incomeSources: safeSources, expenses: safeExpenses }, index, { householdId, personRole, minorChildInSgbIIBg }),
        index,
        year: periodMonth.year,
        month: periodMonth.month,
        key: periodMonth.key,
        label: periodMonth.label,
        rawKnownIncomeTotal: safeSources.reduce((sum, source) => sum + (adultSeriesAmount(source, index) || 0), 0),
      }));
      const supported = !statusOpen && period.status === "CALCULATED" && months.every((month) => month.status === "SUPPORTED");
      const rawSixMonthTotal = statusOpen
        ? null
        : safeSources.every((source) => prepareSixMonthValues(source).status === "PREPARED")
          ? safeSources.reduce((sum, source) => sum + prepareSixMonthValues(source).sixMonthTotal, 0)
          : null;
      const earnedTotal = supported ? stabilizeArithmeticPrecision(months.reduce((sum, month) => sum + month.earnedIncomeAfterFinalCleansing, 0)) : null;
      const otherTotal = supported ? stabilizeArithmeticPrecision(months.reduce((sum, month) => sum + month.otherIncomeAfterFinalCleansing, 0)) : null;
      const total = supported ? stabilizeArithmeticPrecision(earnedTotal + otherTotal) : null;
      const extendedAccessSupported = supported && months.every((month) => month.extendedAccessDeductionStatus === "SUPPORTED");
      const extendedAccessMonthlyValues = extendedAccessSupported ? months.map((month) => month.earnedActivityDeductionsForExtendedAccess) : null;
      return {
        personRole,
        incomeStatus,
        sources: sourceResults,
        rawSixMonthTotal,
        averageBeforeDeductions: rawSixMonthTotal === null ? null : stabilizeArithmeticPrecision(rawSixMonthTotal / 6),
        deductions,
        averageAfterSupportedDeductions: supported ? stabilizeArithmeticPrecision(total / 6) : null,
        months,
        monthlyCountableIncome: supported ? months.map((month) => month.finalCountableIncome) : null,
        sixMonthTotalBeforeFinalCleansing: rawSixMonthTotal,
        sixMonthTotalAfterFinalCleansing: total,
        averageEarnedIncomeAfterFinalCleansing: supported ? stabilizeArithmeticPrecision(earnedTotal / 6) : null,
        averageOtherIncomeAfterFinalCleansing: supported ? stabilizeArithmeticPrecision(otherTotal / 6) : null,
        monthlyAverageAfterFinalCleansing: supported ? stabilizeArithmeticPrecision(total / 6) : null,
        extendedAccessEarnedDeductions: {
          status: extendedAccessSupported ? "SUPPORTED" : "UNRESOLVED",
          monthlyValues: extendedAccessMonthlyValues,
          sixMonthTotal: extendedAccessSupported ? stabilizeArithmeticPrecision(extendedAccessMonthlyValues.reduce((sum, value) => sum + value, 0)) : null,
          monthlyAverage: extendedAccessSupported ? stabilizeArithmeticPrecision(extendedAccessMonthlyValues.reduce((sum, value) => sum + value, 0) / 6) : null,
          openChecks: supported && !extendedAccessSupported ? ["EXTENDED_ACCESS_SPECIAL_ALLOWANCE_OPEN"] : [],
        },
        status: supported ? "SUPPORTED" : "UNRESOLVED",
        warnings: [ ...(statusOpen ? [warning(statusOpen, "Der Einkommensstatus dieser erwachsenen Person ist noch nicht eindeutig beantwortet.", "incomeStatus")] : []), ...months.flatMap((month) => month.warnings)],
        openChecks: [...new Set([ ...(statusOpen ? [statusOpen] : []), ...period.openChecks, ...months.flatMap((month) => month.openChecks)])],
      };
    };
    const applicant = person("applicant", household.applicantIncomeSources, household.applicantExpenses, household.applicantIncomeStatus);
    const partner = household.adults === "couple" ? person("partner", household.partnerIncomeSources, household.partnerExpenses, household.partnerIncomeStatus) : null;
    const people = [applicant, ...(partner ? [partner] : [])];
    const hasSickPay = [...asArray(household.applicantIncomeSources), ...asArray(household.partnerIncomeSources)]
      .some((source) => source?.incomeType === "sick-pay");
    const regularSupported = people.every((item) => item.status === "SUPPORTED");
    const averageEarned = regularSupported ? stabilizeArithmeticPrecision(people.reduce((sum, item) => sum + item.averageEarnedIncomeAfterFinalCleansing, 0)) : null;
    const averageOther = regularSupported ? stabilizeArithmeticPrecision(people.reduce((sum, item) => sum + item.averageOtherIncomeAfterFinalCleansing, 0)) : null;
    const surplus = evaluateChildBenefitSurplusForHousehold(state, householdId);
    const supported = regularSupported && surplus.status === "SUPPORTED";
    const childBenefitSurplusTotal = surplus.childBenefitSurplusTotal;
    applicant.childBenefitSurplusOtherIncomeMonthly = surplus.byPerson.applicant;
    if (partner) partner.childBenefitSurplusOtherIncomeMonthly = surplus.byPerson.partner;
    const preparedOther = supported ? stabilizeArithmeticPrecision(averageOther + childBenefitSurplusTotal) : null;
    return {
      ruleId: RULE_IDS.adultIncome,
      householdId,
      personResults: { applicant, partner },
      regularIncome: { averageEarned, averageOther, averageTotal: regularSupported ? stabilizeArithmeticPrecision(averageEarned + averageOther) : null },
      specialOtherIncome: { childBenefitSurplusTotal, items: surplus.items },
      preparedForParentReduction: { earnedIncome: supported ? averageEarned : null, otherIncome: preparedOther, totalIncome: supported ? stabilizeArithmeticPrecision(averageEarned + preparedOther) : null },
      status: supported ? "SUPPORTED" : "UNRESOLVED",
      warnings: [...people.flatMap((item) => item.warnings), ...surplus.warnings],
      openChecks: [...new Set([...people.flatMap((item) => item.openChecks), ...surplus.openChecks])],
      usedRuleIds: [RULE_IDS.adultIncome, RULE_IDS.adultDeduction, RULE_IDS.childBenefitSurplus, ...(hasSickPay ? [RULE_IDS.sickPayInput] : [])],
      disclaimer: "Bereinigter Erwachsenen-Einkommenszwischenwert; keine Elternminderung oder KiZ-Endentscheidung.",
    };
  }

  function recipientRoleForChildBenefit(personId, householdId) {
    const normalized = typeof personId === "string" ? personId.toLowerCase() : "";
    const suffix = String(householdId || "").toLowerCase();
    if (normalized === "applicant" || normalized === `applicant-${suffix}`) return "applicant";
    if (normalized === "partner" || normalized === `partner-${suffix}`) return "partner";
    return null;
  }

  function evaluateChildBenefitSurplus(input = {}) {
    const statutoryChildBenefitAmount = Number.isFinite(input.childBenefitAmount) ? input.childBenefitAmount : CHILD_BENEFIT_2026;
    const forwardedChildBenefitAmount = input.halfForwarded === true
      ? stabilizeArithmeticPrecision(statutoryChildBenefitAmount / 2)
      : 0;
    const childBenefitAmount = stabilizeArithmeticPrecision(statutoryChildBenefitAmount - forwardedChildBenefitAmount);
    const warnings = [];
    const openChecks = [];
    const base = {
      ruleId: RULE_IDS.childBenefitSurplus,
      childId: input.childId || "",
      householdId: input.householdId || null,
      statutoryChildBenefitAmount,
      forwardedChildBenefitAmount,
      childBenefitAmount,
      totalChildNeed: Number.isFinite(input.totalChildNeed) ? input.totalChildNeed : null,
      childIncomeReduction: Number.isFinite(input.childIncomeReduction) ? input.childIncomeReduction : null,
      remainingChildNeedAfterIncome: null,
      childBenefitForChildNeed: null,
      childBenefitSurplus: null,
      childBenefitSurplusOtherIncomeMonthly: null,
      recipientPersonRole: null,
      amountForParentReduction: null,
      assetImpactStatus: "NOT_EVALUATED",
      warnings,
      openChecks,
      sourceIds: ["SRC-DA-KIZ-2026-02-20", "SRC-SGBII-11", "SRC-BKGG-6A"],
    };
    const addOpen = (code, message, field = null) => {
      openChecks.push(code);
      warnings.push(warning(code, message, field));
    };
    const knownBenefitLocation = ["A", "B", "external"].includes(input.childBenefitAt);
    if (knownBenefitLocation && input.childBenefitAt !== input.householdId) {
      return { ...base, childBenefitSurplusOtherIncomeMonthly: 0, amountForParentReduction: 0, status: "NOT_APPLICABLE_IN_HOUSEHOLD" };
    }
    if (!["A", "B"].includes(input.childBenefitAt) || input.childBenefitAt !== input.householdId) {
      addOpen("CHILD_BENEFIT_LOCATION_REQUIRED_FOR_SURPLUS", "Der Kindergeldhaushalt ist für den Überschuss nicht eindeutig.", "childBenefitAt");
      return { ...base, status: "UNRESOLVED" };
    }
    warnings.push(warning("CHILD_ASSETS_NOT_EVALUATED", "Kindesvermögen wird in Phase D5 nicht geprüft und kann die abschließende Überschussbewertung beeinflussen.", "assets"));
    if (!Number.isFinite(input.totalChildNeed) || input.totalChildNeed < 0 || !Number.isFinite(input.childIncomeReduction) || input.childIncomeReduction < 0) {
      addOpen("CHILD_BENEFIT_SURPLUS_INPUT_REQUIRED", "Unterstützter Kinderbedarf und D2-Kindeseinkommensminderung werden benötigt.");
      return { ...base, status: "UNRESOLVED" };
    }
    if (!Number.isFinite(childBenefitAmount) || childBenefitAmount < 0) {
      addOpen("CHILD_BENEFIT_AMOUNT_INVALID", "Der Kindergeldbetrag ist ungültig.", "childBenefitAmount");
      return { ...base, status: "UNRESOLVED" };
    }
    const remainingChildNeedAfterIncome = stabilizeArithmeticPrecision(Math.max(0, input.totalChildNeed - input.childIncomeReduction));
    const childBenefitForChildNeed = stabilizeArithmeticPrecision(Math.min(childBenefitAmount, remainingChildNeedAfterIncome));
    const childBenefitSurplus = stabilizeArithmeticPrecision(Math.max(0, childBenefitAmount - remainingChildNeedAfterIncome));
    const calculated = { ...base, remainingChildNeedAfterIncome, childBenefitForChildNeed, childBenefitSurplus, childBenefitSurplusOtherIncomeMonthly: childBenefitSurplus };
    if (childBenefitSurplus === 0) return { ...calculated, amountForParentReduction: 0, status: "SUPPORTED" };
    const recipientPersonRole = recipientRoleForChildBenefit(input.childBenefitPerson, input.householdId);
    if (!recipientPersonRole || (recipientPersonRole === "partner" && input.householdType !== "couple")) {
      addOpen("CHILD_BENEFIT_RECIPIENT_REQUIRED_FOR_SURPLUS", "Die kindergeldberechtigte Person muss eindeutig zu diesem Haushalt gehören.", "childBenefitPerson");
    }
    if (openChecks.length) return { ...calculated, recipientPersonRole, status: "UNRESOLVED" };
    if (input.hasOtherRemainingKizChild !== true) {
      return { ...calculated, recipientPersonRole, amountForParentReduction: 0, status: "NO_REMAINING_KIZ_CHILD" };
    }
    return { ...calculated, recipientPersonRole, amountForParentReduction: childBenefitSurplus, status: "SUPPORTED" };
  }

  function evaluateChildBenefitSurplusForHousehold(state, householdId) {
    const household = state?.households?.[householdId];
    if (!household) return { ruleId: RULE_IDS.childBenefitSurplus, householdId, status: "UNRESOLVED", childBenefitSurplusTotal: null, byPerson: { applicant: null, partner: null }, items: [], warnings: [], openChecks: ["HOUSEHOLD_REQUIRED"] };
    const relevantChildren = asArray(state?.centralChildren).filter((child) => calculationRules?.evaluateChildRelevanceForHousehold?.(child, householdId)?.isRelevantForHousehold === true);
    if (!relevantChildren.length) return { ruleId: RULE_IDS.childBenefitSurplus, householdId, status: "SUPPORTED", childBenefitSurplusTotal: 0, byPerson: { applicant: 0, partner: 0 }, items: [], warnings: [], openChecks: [] };
    const housingHead = familyHousingHeadShare(state, householdId);
    const memberships = relevantChildren.map((child) => evaluateChildMemberships(state, householdId, child, housingHead));
    const items = relevantChildren.map((child, index) => {
      const membership = memberships[index];
      return evaluateChildBenefitSurplus({
        childId: child?.id || "",
        householdId,
        householdType: household.adults,
        totalChildNeed: membership?.childNeed?.totalChildNeed,
        childIncomeReduction: membership?.bgIncome?.childIncomeReductionForKiZ,
        childBenefitAt: child?.childBenefitAt,
        childBenefitPerson: child?.childBenefitPerson,
        halfForwarded: child?.halfForwarded === true && Boolean(child?.careSituation?.startsWith("wechselmodell")),
        hasOtherRemainingKizChild: memberships.some((other, otherIndex) => otherIndex !== index && other.isKizBgMember === true),
      });
    });
    const unresolved = items.some((item) => item.status === "UNRESOLVED");
    const byPerson = {
      applicant: unresolved ? null : stabilizeArithmeticPrecision(items.filter((item) => item.recipientPersonRole === "applicant").reduce((sum, item) => sum + (item.amountForParentReduction || 0), 0)),
      partner: unresolved ? null : stabilizeArithmeticPrecision(items.filter((item) => item.recipientPersonRole === "partner").reduce((sum, item) => sum + (item.amountForParentReduction || 0), 0)),
    };
    return {
      ruleId: RULE_IDS.childBenefitSurplus,
      householdId,
      status: unresolved ? "UNRESOLVED" : "SUPPORTED",
      childBenefitSurplusTotal: unresolved ? null : stabilizeArithmeticPrecision(byPerson.applicant + byPerson.partner),
      byPerson,
      items,
      warnings: items.flatMap((item) => item.warnings),
      openChecks: [...new Set(items.flatMap((item) => item.openChecks))],
      usedRuleIds: [RULE_IDS.childBenefitSurplus, RULE_IDS.childSgbIIMembership, CHILD_INCOME_REDUCTION.ruleId, RULE_IDS.childSgbIINeed],
      disclaimer: "Kindergeldüberschuss ist nur für eine spätere Elternminderung vorbereitet; keine Minderung oder Endentscheidung.",
    };
  }

  function evaluateChildIncomeSource(source, child, context = {}) {
    const normalizedSource = normalizeChildIncomeSource(source);
    const prepared = prepareSixMonthValues(normalizedSource);
    const result = {
      ...incomeSourceBase(RULE_IDS.childIncome, normalizedSource, null, prepared),
      childId: typeof child?.id === "string" ? child.id : "",
      subtype: normalizedSource.subtype,
      monthlyValues: prepared.monthlyValues,
      monthlyAverage: prepared.monthlyAverage,
      rawMonthlyAverage: prepared.monthlyAverage,
      countableIncomeBeforeLaterReduction: null,
      countableAfterConfirmedDeductions: null,
      incomeRelevance: "UNRESOLVED",
      requiresDeductions: null,
      deductionAssessment: {
        status: "UNRESOLVED",
        confirmed: [],
        open: [],
        notApplicable: [],
      },
    };
    delete result.personRole;
    if (prepared.status !== "PREPARED") return { ...result, classification: "INCOMPLETE", status: "INCOMPLETE" };
    const type = normalizedSource.incomeType;
    const addOpen = (code, message, field = "incomeType", isDeductionOpen = false) => {
      result.openChecks.push(code);
      if (isDeductionOpen) result.deductionAssessment.open.push(code);
      result.warnings.push(warning(code, message, field));
    };
    const markEmploymentDeductionsOpen = () => {
      result.requiresDeductions = true;
      result.deductionAssessment.status = "OPEN";
      addOpen("CHILD_EMPLOYMENT_DEDUCTION_DATA_NOT_CAPTURED", "Kindbezogene tatsächliche Abzüge werden in der Kinderquelle noch nicht vollständig erfasst.", "incomeType", true);
      addOpen("CHILD_EMPLOYMENT_ALLOWANCE_NOT_CALCULATED", "Die anwendbaren Grund- und Erwerbstätigenabsetzbeträge werden in Phase D1 noch nicht berechnet.", "incomeType", true);
    };
    const markInsuranceCheckOpen = () => {
      result.requiresDeductions = true;
      result.deductionAssessment.status = "OPEN";
      addOpen("CHILD_INSURANCE_DEDUCTION_STATUS_NOT_CAPTURED", "Eine mögliche Versicherungspauschale kann ohne Angaben zu Alter und entsprechender Versicherung nicht abschließend geprüft werden.", "incomeType", true);
    };

    if (["maintenance", "advance-maintenance"].includes(type)) {
      if (!["net", "notice"].includes(normalizedSource.amountType)) {
        addOpen("CHILD_PAYMENT_OR_NOTICE_AMOUNT_REQUIRED", "Für den laufenden kindbezogenen Zufluss wird der Auszahlungs- oder Bescheidbetrag benötigt.", "amountType");
        return { ...result, classification: "UNRESOLVED", status: "UNRESOLVED" };
      }
      result.incomeRelevance = "COUNTABLE_INCOME";
      result.countableIncomeBeforeLaterReduction = prepared.monthlyAverage;
      result.reasons.push("Der laufende Zufluss wird ausschließlich diesem Kind zugeordnet; keine 45-Prozent-Minderung wird berechnet.");
      markInsuranceCheckOpen();
      return { ...result, classification: "SUPPORTED_CHILD_RUNNING_PAYMENT", status: "PARTIAL" };
    }
    if (type === "orphan-pension") {
      if (!["net", "notice"].includes(normalizedSource.amountType)) {
        addOpen("CHILD_PAYMENT_OR_NOTICE_AMOUNT_REQUIRED", "Für die Waisenrente wird der Auszahlungs- oder Bescheidbetrag benötigt.", "amountType");
        return { ...result, classification: "UNRESOLVED", status: "UNRESOLVED" };
      }
      result.incomeRelevance = "COUNTABLE_INCOME";
      result.countableIncomeBeforeLaterReduction = prepared.monthlyAverage;
      markInsuranceCheckOpen();
      if (normalizedSource.subtype === "running") {
        result.reasons.push("Der Bezug ist ausdrücklich als laufende Waisenrente gekennzeichnet; die Personen-Monatsengine prüft nur noch den möglichen Versicherungsabzug.");
        return { ...result, classification: "SUPPORTED_RUNNING_ORPHAN_PENSION", status: "PARTIAL" };
      }
      addOpen(normalizedSource.subtype === "backpay" ? "CHILD_PENSION_BACKPAY_UNRESOLVED" : "CHILD_PENSION_BACKPAY_STATUS_NOT_CAPTURED", "Laufender Bezug und Nachzahlung werden nicht gleichbehandelt; eine Nachzahlung wird nicht automatisch verteilt.");
      return { ...result, classification: "SUPPORTED_RUNNING_PAYMENT_WITH_OPEN_CHECK", status: "PARTIAL" };
    }
    if (type === "training-wage") {
      if (normalizedSource.amountType !== "gross") {
        addOpen("CHILD_GROSS_AMOUNT_REQUIRED", "Für Erwerbseinkommen des Kindes wird ein Bruttobetrag benötigt.", "amountType");
        return { ...result, classification: "UNRESOLVED", status: "UNRESOLVED" };
      }
      result.incomeRelevance = "COUNTABLE_INCOME";
      markEmploymentDeductionsOpen();
      result.reasons.push("Der Bruttobetrag bleibt unverändert; es findet keine automatische Brutto-Netto-Umrechnung statt.");
      return { ...result, classification: "SUPPORTED_RAW_GROSS", status: "UNRESOLVED" };
    }
    if (type === "side-job") {
      if (normalizedSource.amountType !== "gross") {
        addOpen("CHILD_GROSS_AMOUNT_REQUIRED", "Für Erwerbseinkommen des Kindes wird ein Bruttobetrag benötigt.", "amountType");
        return { ...result, classification: "UNRESOLVED", status: "UNRESOLVED" };
      }
      const childAge = child?.age === "" || child?.age === null || child?.age === undefined ? null : Number(child.age);
      if (normalizedSource.subtype === "school-holiday-only") {
        if (Number.isInteger(childAge) && childAge >= 0 && childAge < 25) {
          result.incomeRelevance = "CONFIRMED_NON_INCOME";
          result.requiresDeductions = false;
          result.countableIncomeBeforeLaterReduction = 0;
          result.countableAfterConfirmedDeductions = 0;
          result.deductionAssessment.status = "NOT_APPLICABLE";
          result.deductionAssessment.notApplicable.push("SCHOOL_HOLIDAY_INCOME_EXCLUDED_BY_SGBII_11A_7");
          result.reasons.push("Die ausdrücklich bestätigte Tätigkeit einer unter 25-jährigen Schülerin oder eines Schülers in den Schulferien bleibt nach § 11a Absatz 7 SGB II unberücksichtigt.");
          return { ...result, classification: "CONFIRMED_SCHOOL_HOLIDAY_INCOME_EXCLUDED", status: "PREPARED" };
        }
        result.incomeRelevance = "COUNTABLE_INCOME";
        markEmploymentDeductionsOpen();
        addOpen("CHILD_SCHOOL_HOLIDAY_JOB_AGE_REQUIREMENT_NOT_MET", "Die Ferienjob-Ausnahme kann ohne ein verwertbares Alter unter 25 Jahren nicht angewendet werden.", "age");
        return { ...result, classification: "UNRESOLVED", status: "UNRESOLVED" };
      }
      result.incomeRelevance = "COUNTABLE_INCOME";
      markEmploymentDeductionsOpen();
      if (normalizedSource.subtype === "student-regular") {
        addOpen("CHILD_STUDENT_JOB_ALLOWANCE_NOT_CALCULATED", "Die besonderen Absetzbeträge für einen Schülerjob außerhalb der Schulferien werden noch nicht berechnet.", "subtype", true);
        return { ...result, classification: "STUDENT_JOB_RAW_GROSS", status: "UNRESOLVED" };
      }
      if (normalizedSource.subtype === "unknown") {
        addOpen("CHILD_SCHOOL_HOLIDAY_JOB_STATUS_NOT_CAPTURED", "Die Nebenjob-Situation ist unbekannt; eine Ferienjob-Ausnahme wird nicht unterstellt.", "subtype");
        addOpen("CHILD_STUDENT_STATUS_NOT_CAPTURED", "Es ist nicht bestätigt, ob das Kind Schülerin oder Schüler einer allgemein- oder berufsbildenden Schule ist.", "subtype");
        addOpen("CHILD_SCHOOL_HOLIDAY_ONLY_STATUS_NOT_CAPTURED", "Es ist nicht bestätigt, ob die Tätigkeit in den Schulferien ausgeübt wurde.", "subtype");
        return { ...result, classification: "SIDE_JOB_SUBTYPE_UNRESOLVED", status: "UNRESOLVED" };
      }
      return { ...result, classification: "NORMAL_SIDE_JOB_RAW_GROSS", status: "UNRESOLVED" };
    }
    if (type === "education-support") {
      result.requiresDeductions = true;
      result.deductionAssessment.status = "OPEN";
      const subtype = normalizedSource.subtype;
      if (subtype === "unknown") {
        addOpen("CHILD_EDUCATION_SUPPORT_COMPONENTS_NOT_CAPTURED", "Die Art der Ausbildungsförderung ist unbekannt.", "subtype");
        return { ...result, classification: "UNRESOLVED", status: "UNRESOLVED" };
      }
      if (subtype === "other") {
        addOpen("CHILD_EDUCATION_SUPPORT_OTHER_CLASSIFICATION_REQUIRED", "Die sonstige Ausbildungsförderung benötigt eine bestätigte Einzelregel.", "subtype");
        return { ...result, classification: "UNRESOLVED", status: "UNRESOLVED" };
      }
      if (subtype === "scholarship") {
        addOpen("CHILD_SCHOLARSHIP_PROGRAM_AND_PURPOSE_NOT_CAPTURED", "Stipendienprogramm und zweckbestimmte Bestandteile sind nicht ausreichend erfasst.", "subtype");
        return { ...result, incomeRelevance: "UNRESOLVED", classification: "SCHOLARSHIP_IDENTIFIED", status: "UNRESOLVED" };
      }
      result.incomeRelevance = "COUNTABLE_INCOME";
      addOpen("CHILD_EDUCATION_SUPPORT_DEDUCTION_DATA_NOT_CAPTURED", "Grundabsetzbetrag, ausbildungsbedingte Kosten und die Wechselwirkung mit Erwerbseinkommen sind noch nicht vollständig bestimmbar.", "subtype", true);
      return { ...result, classification: `EDUCATION_SUPPORT_${subtype.toUpperCase().replaceAll("-", "_")}_IDENTIFIED`, status: "UNRESOLVED" };
    }
    if (type === "voluntary-service") {
      result.incomeRelevance = "COUNTABLE_INCOME";
      result.requiresDeductions = true;
      result.deductionAssessment.status = "OPEN";
      addOpen("CHILD_VOLUNTARY_SERVICE_DATA_NOT_CAPTURED", "Taschengeld, weitere Leistungsbestandteile, Alter und anwendbare Absetzbeträge sind nicht vollständig bestimmbar.", "incomeType", true);
      return { ...result, classification: "VOLUNTARY_SERVICE_IDENTIFIED", status: "UNRESOLVED" };
    }
    if (type === "other") {
      result.reasons.push("Die eigene Bezeichnung wird nur transparent weitergegeben und nicht als Rechtskategorie interpretiert.");
      addOpen("CHILD_OTHER_INCOME_CLASSIFICATION_REQUIRED", "Freitext wird nicht automatisch als Kindeseinkommen interpretiert.");
      return { ...result, classification: "UNRESOLVED", status: "UNRESOLVED" };
    }
    addOpen("CHILD_INCOME_TYPE_UNSUPPORTED", "Die Kindeseinkommensart wird nicht unterstützt.");
    return { ...result, classification: "UNRESOLVED", status: "UNRESOLVED" };
  }

  function normalizedChildAge(child) {
    if (isBlank(child?.age)) return null;
    const age = Number(child.age);
    return Number.isInteger(age) && age >= 0 ? age : null;
  }

  function childSpecialBasicAllowance(periodYear) {
    if (periodYear === 2025) return 556;
    if (periodYear === 2026 || periodYear === null || periodYear === undefined) return 603;
    return null;
  }

  function calculateEarnedTierAllowance(gross, regime, upperLimit = 1200) {
    const tierOne = regime === "special-2b" ? 0 : Math.max(0, Math.min(gross, 520) - 100) * 0.2;
    const tierTwo = Math.max(0, Math.min(gross, 1000) - 520) * 0.3;
    const tierThree = Math.max(0, Math.min(gross, upperLimit) - 1000) * 0.1;
    return tierOne + tierTwo + tierThree;
  }

  function earnedRegimeForSource(source, age) {
    if (!Number.isInteger(age) || age < 15) return { regime: null, openCheck: "CHILD_EARNED_INCOME_ERWERBSFAEHIGKEIT_UNRESOLVED" };
    if (source.incomeType === "side-job") {
      if (source.subtype === "normal") return { regime: "general" };
      if (source.subtype === "student-regular") {
        return age < 25 ? { regime: "special-2b" } : { regime: null, openCheck: "CHILD_STUDENT_JOB_AGE_REQUIREMENT_NOT_MET" };
      }
      return { regime: null, openCheck: "CHILD_SIDE_JOB_SUBTYPE_UNRESOLVED" };
    }
    if (source.incomeType === "training-wage") {
      if (source.subtype === "eligible-training") {
        return age < 25 ? { regime: "special-2b" } : { regime: null, openCheck: "CHILD_TRAINING_2B_AGE_REQUIREMENT_NOT_MET" };
      }
      if (source.subtype === "other-employment") return { regime: "general" };
      return { regime: null, openCheck: "CHILD_TRAINING_ELIGIBILITY_UNRESOLVED" };
    }
    if (source.incomeType === "voluntary-service") {
      if (source.subtype === "pocket-money-only") {
        return age < 25 ? { regime: "special-2b" } : { regime: null, openCheck: "CHILD_VOLUNTARY_SERVICE_AGE_REQUIREMENT_NOT_MET" };
      }
      return { regime: null, openCheck: "CHILD_VOLUNTARY_SERVICE_COMPONENTS_UNRESOLVED" };
    }
    return { regime: null, openCheck: "CHILD_EARNED_INCOME_CLASSIFICATION_UNRESOLVED" };
  }

  function calculateChildIncomeForMonth(child, monthIndex, context = {}) {
    const periodMonth = context.periodMonth || null;
    const personMonthlyKey = `${child?.id || "unknown-child"}:${periodMonth?.key || `month-${monthIndex + 1}`}`;
    const age = normalizedChildAge(child);
    const positions = [];
    const deductions = [];
    const warnings = [];
    const openChecks = [];
    const addOpen = (code, message, field = "incomeSources") => {
      openChecks.push(code);
      warnings.push(warning(code, message, field));
    };
    let rawTotal = 0;
    let excludedTotal = 0;
    let nonEarnedTotal = 0;
    let incomplete = false;
    const earnedPositions = [];
    const educationPositions = [];

    asArray(child?.incomeSources).forEach((inputSource) => {
      const source = normalizeChildIncomeSource(inputSource);
      const prepared = prepareSixMonthValues(source);
      const rawAmount = prepared.monthlyValues?.[monthIndex] ?? null;
      const position = {
        sourceId: typeof source.id === "string" ? source.id : "",
        incomeType: source.incomeType || "",
        subtype: source.subtype,
        rawAmount,
        excludedAmount: 0,
        countableBeforePersonDeductions: null,
        countableIncome: null,
        classification: "UNRESOLVED",
        status: "UNRESOLVED",
      };
      positions.push(position);
      if (rawAmount === null) {
        incomplete = true;
        position.status = "INCOMPLETE";
        addOpen("CHILD_INCOME_MONTH_REQUIRED", "Ein notwendiger Monatsbetrag fehlt oder ist ungültig.", "monthlyValues");
        return;
      }
      rawTotal += rawAmount;

      if (["maintenance", "advance-maintenance"].includes(source.incomeType)) {
        if (!["net", "notice"].includes(source.amountType)) {
          addOpen("CHILD_PAYMENT_OR_NOTICE_AMOUNT_REQUIRED", "Für Unterhalt oder Unterhaltsvorschuss wird der tatsächliche Auszahlungs- oder Bescheidbetrag benötigt.", "amountType");
          return;
        }
        position.classification = "COUNTABLE_NON_EARNED_RUNNING_PAYMENT";
        position.status = "SUPPORTED";
        position.countableBeforePersonDeductions = rawAmount;
        nonEarnedTotal += rawAmount;
        return;
      }

      if (source.incomeType === "orphan-pension") {
        if (!["net", "notice"].includes(source.amountType)) {
          addOpen("CHILD_PAYMENT_OR_NOTICE_AMOUNT_REQUIRED", "Für die Waisenrente wird der tatsächliche Auszahlungs- oder Bescheidbetrag benötigt.", "amountType");
          return;
        }
        if (source.subtype !== "running") {
          addOpen(source.subtype === "backpay" ? "CHILD_PENSION_BACKPAY_UNRESOLVED" : "CHILD_PENSION_BACKPAY_STATUS_NOT_CAPTURED", "Nur eine ausdrücklich laufende Waisenrente ist automatisierbar; Nachzahlungen werden nicht verteilt.", "subtype");
          return;
        }
        position.classification = "COUNTABLE_RUNNING_ORPHAN_PENSION";
        position.status = "SUPPORTED";
        position.countableBeforePersonDeductions = rawAmount;
        nonEarnedTotal += rawAmount;
        return;
      }

      if (source.incomeType === "side-job" && source.subtype === "school-holiday-only") {
        if (Number.isInteger(age) && age < 25) {
          position.classification = "EXCLUDED_SCHOOL_HOLIDAY_INCOME";
          position.status = "SUPPORTED";
          position.excludedAmount = rawAmount;
          position.countableBeforePersonDeductions = 0;
          position.countableIncome = 0;
          excludedTotal += rawAmount;
        } else {
          addOpen("CHILD_SCHOOL_HOLIDAY_JOB_AGE_REQUIREMENT_NOT_MET", "Die Ferienjob-Ausnahme ist ohne ein verwertbares Alter unter 25 Jahren nicht anwendbar.", "age");
        }
        return;
      }

      if (["training-wage", "side-job", "voluntary-service"].includes(source.incomeType)) {
        if (source.amountType !== "gross") {
          addOpen("CHILD_GROSS_AMOUNT_REQUIRED", "Für die Erwerbseinkommensbereinigung wird der tatsächliche Bruttobetrag benötigt.", "amountType");
          return;
        }
        const regimeResult = earnedRegimeForSource(source, age);
        if (!regimeResult.regime) {
          addOpen(regimeResult.openCheck, "Die Voraussetzungen des anzuwendenden Erwerbs-Grundabsetzbetrags sind nicht vollständig bestätigt.", "subtype");
          return;
        }
        const taxPrepared = prepareSixMonthValues(source.directDeductions.tax);
        const socialPrepared = prepareSixMonthValues(source.directDeductions.socialInsurance);
        const tax = taxPrepared.monthlyValues?.[monthIndex] ?? null;
        const socialInsurance = socialPrepared.monthlyValues?.[monthIndex] ?? null;
        if (tax === null) addOpen("CHILD_EMPLOYMENT_TAX_MISSING", "Tatsächlich entrichtete Steuern fehlen; 0 muss ausdrücklich eingegeben werden, wenn keine Steuer anfiel.", "directDeductions.tax");
        if (socialInsurance === null) addOpen("CHILD_EMPLOYMENT_SOCIAL_INSURANCE_MISSING", "Pflichtbeiträge zur Sozialversicherung fehlen; 0 muss ausdrücklich eingegeben werden, wenn keine Beiträge anfielen.", "directDeductions.socialInsurance");
        position.classification = regimeResult.regime === "special-2b" ? "EARNED_SPECIAL_2B" : "EARNED_GENERAL";
        position.regime = regimeResult.regime;
        position.status = tax === null || socialInsurance === null ? "UNRESOLVED" : "SUPPORTED";
        position.countableBeforePersonDeductions = rawAmount;
        earnedPositions.push({ position, source, gross: rawAmount, tax, socialInsurance, regime: regimeResult.regime });
        return;
      }

      if (source.incomeType === "education-support") {
        educationPositions.push(position);
        const code = source.subtype === "scholarship"
          ? "CHILD_SCHOLARSHIP_PROGRAM_AND_PURPOSE_NOT_CAPTURED"
          : "CHILD_EDUCATION_SUPPORT_COMPONENTS_NOT_CAPTURED";
        addOpen(code, "Förderbescheid, gesetzlich ausgenommene Bestandteile und gegebenenfalls höhere Ausbildungskosten sind nicht vollständig erfasst.", "subtype");
        position.classification = `EDUCATION_SUPPORT_${String(source.subtype || "unknown").toUpperCase().replaceAll("-", "_")}_UNRESOLVED`;
        return;
      }

      if (source.incomeType === "other") {
        addOpen("CHILD_OTHER_INCOME_CLASSIFICATION_REQUIRED", "Sonstiges Einkommen wird ohne bestätigte Rechtskategorie nicht automatisch angerechnet.", "incomeType");
        return;
      }
      addOpen("CHILD_INCOME_TYPE_UNSUPPORTED", "Die Kindeseinkommensart wird nicht unterstützt.", "incomeType");
    });

    const regimes = [...new Set(earnedPositions.map((item) => item.regime))];
    let earnedCountable = 0;
    let earnedBasicWasUsed = false;
    if (regimes.length > 1) {
      addOpen("CHILD_MIXED_EARNED_REGIMES_UNRESOLVED", "Widersprüchliche allgemeine und besondere Erwerbsregime im selben Personenmonat werden nicht zusammengeführt.", "subtype");
    } else if (earnedPositions.length > 0 && earnedPositions.every((item) => item.tax !== null && item.socialInsurance !== null)) {
      const regime = regimes[0];
      const gross = earnedPositions.reduce((sum, item) => sum + item.gross, 0);
      if (gross > 1200) {
        addOpen("CHILD_EARNED_ALLOWANCE_UPPER_CAP_UNRESOLVED", "Bei Erwerbsbrutto über 1.200 Euro ist die mögliche gesetzliche Obergrenze von 1.500 Euro ohne weitere Familiendaten nicht sicher bestimmbar.", "monthlyValues");
      } else {
        const enteredTax = earnedPositions.reduce((sum, item) => sum + item.tax, 0);
        const enteredSocialInsurance = earnedPositions.reduce((sum, item) => sum + item.socialInsurance, 0);
        let remaining = gross;
        const appliedTax = Math.min(remaining, enteredTax);
        remaining -= appliedTax;
        const appliedSocialInsurance = Math.min(remaining, enteredSocialInsurance);
        remaining -= appliedSocialInsurance;
        const specialBasic = regime === "special-2b" ? childSpecialBasicAllowance(periodMonth?.year ?? context.applicationYear ?? 2026) : 100;
        if (specialBasic === null) {
          addOpen("CHILD_SPECIAL_ALLOWANCE_LEGAL_PERIOD_UNSUPPORTED", "Der besondere Grundabsetzbetrag ist für diesen Kalendermonat nicht im Rechenkern hinterlegt.", "applicationYear");
        } else {
          const basicAmount = Math.min(remaining, specialBasic);
          remaining -= basicAmount;
          const tierAmount = Math.min(remaining, calculateEarnedTierAllowance(gross, regime));
          remaining -= tierAmount;
          earnedCountable = Math.max(0, remaining);
          earnedBasicWasUsed = basicAmount > 0;
          const appliedTo = earnedPositions.map((item) => item.position.sourceId);
          deductions.push(
            { deductionType: "TAX", amount: appliedTax, enteredAmount: enteredTax, appliedTo, legalBasis: "§ 11b Abs. 1 S. 1 Nr. 1 SGB II", ruleId: CHILD_MONTH_RULE_IDS.earned, personMonthlyKey },
            { deductionType: "MANDATORY_SOCIAL_INSURANCE", amount: appliedSocialInsurance, enteredAmount: enteredSocialInsurance, appliedTo, legalBasis: "§ 11b Abs. 1 S. 1 Nr. 2 SGB II", ruleId: CHILD_MONTH_RULE_IDS.earned, personMonthlyKey },
            { deductionType: regime === "special-2b" ? "BASIC_ALLOWANCE_2B" : "BASIC_ALLOWANCE", amount: basicAmount, statutoryAmount: specialBasic, appliedTo, legalBasis: regime === "special-2b" ? "§ 11b Abs. 2b SGB II" : "§ 11b Abs. 2 SGB II", ruleId: regime === "special-2b" ? CHILD_MONTH_RULE_IDS.basic2b : CHILD_MONTH_RULE_IDS.basic, personMonthlyKey },
            { deductionType: "EARNED_INCOME_ALLOWANCE", amount: tierAmount, calculatedAmount: calculateEarnedTierAllowance(gross, regime), appliedTo, legalBasis: "§ 11b Abs. 3 SGB II", ruleId: CHILD_MONTH_RULE_IDS.earnedTier, personMonthlyKey }
          );
          earnedPositions.forEach((item) => {
            item.position.status = "SUPPORTED";
            item.position.countableIncome = null;
          });
        }
      }
    }

    if (educationPositions.length > 0) {
      deductions.push({
        deductionType: "EDUCATION_SUPPORT_BASIC_ALLOWANCE",
        amount: 0,
        appliedTo: educationPositions.map((item) => item.sourceId),
        legalBasis: "§ 11b Abs. 2b S. 4 SGB II",
        ruleId: CHILD_MONTH_RULE_IDS.education,
        personMonthlyKey,
        status: earnedBasicWasUsed ? "NOT_APPLIED_ALREADY_USED_ON_EARNED_INCOME" : "UNRESOLVED_COMPONENTS",
      });
    }

    let insuranceAmount = 0;
    if (nonEarnedTotal > 0 && !earnedBasicWasUsed) {
      if (!Number.isInteger(age)) {
        addOpen("CHILD_INSURANCE_AGE_UNRESOLVED", "Ohne verwertbares Alter ist die Versicherungspauschale nicht bestimmbar.", "age");
      } else if (age < 18) {
        const status = child?.eligiblePrivateInsuranceStatus ?? "unknown";
        if (status === "yes") insuranceAmount = Math.min(30, nonEarnedTotal);
        else if (status === "unknown") addOpen("CHILD_INSURANCE_STATUS_UNRESOLVED", "Bei einem minderjährigen Kind mit Einkommen muss eine eigene angemessene private Versicherung ausdrücklich mit Ja oder Nein angegeben werden.", "eligiblePrivateInsuranceStatus");
      } else {
        insuranceAmount = Math.min(30, nonEarnedTotal);
      }
    }
    if (insuranceAmount > 0) {
      deductions.push({ deductionType: "PRIVATE_INSURANCE_FLAT", amount: insuranceAmount, appliedTo: positions.filter((item) => item.countableBeforePersonDeductions !== null && !item.regime).map((item) => item.sourceId), legalBasis: "§ 6 Abs. 1 Nr. 1 oder 2 GrusiGV", ruleId: CHILD_MONTH_RULE_IDS.insurance, personMonthlyKey });
    }

    const unresolved = openChecks.length > 0 || regimes.length > 1 || earnedPositions.some((item) => item.tax === null || item.socialInsurance === null);
    const knownCountableSubtotal = Math.max(0, nonEarnedTotal - insuranceAmount) + earnedCountable;
    const countableIncome = incomplete || unresolved ? null : knownCountableSubtotal;
    return {
      ruleId: CHILD_MONTH_RULE_IDS.monthly,
      childId: child?.id || "",
      monthIndex,
      index: monthIndex,
      year: periodMonth?.year ?? null,
      month: periodMonth?.month ?? null,
      key: periodMonth?.key ?? null,
      label: periodMonth?.label ?? `Monat ${monthIndex + 1}`,
      personMonthlyKey,
      sources: positions,
      rawTotal: incomplete ? null : rawTotal,
      rawKnownIncomeTotal: incomplete ? null : rawTotal,
      excludedTotal,
      deductions,
      knownCountableSubtotal,
      countableIncome,
      countableAfterConfirmedDeductions: countableIncome,
      status: incomplete ? "INCOMPLETE" : unresolved ? "UNRESOLVED" : "SUPPORTED",
      warnings,
      openChecks: [...new Set(openChecks)],
      appliedRuleIds: [...new Set([CHILD_MONTH_RULE_IDS.monthly, CHILD_MONTH_RULE_IDS.binding, ...deductions.map((item) => item.ruleId)])],
    };
  }

  function evaluateChildIncome(child, context = {}) {
    const sources = asArray(child?.incomeSources).map((source) => evaluateChildIncomeSource(source, child, context));
    const period = createAssessmentPeriod(context.applicationMonth, context.applicationYear);
    const periodMonths = period.status === "CALCULATED"
      ? period.months
      : Array.from({ length: 6 }, (_, index) => ({ position: index, month: null, year: null, key: null, label: `Monat ${index + 1}` }));
    if (child?.hasOwnIncome === "yes" && sources.length === 0) {
      return { ruleId: RULE_IDS.childIncome, childId: child?.id || "", sources: [], monthly: [], monthlyCountableChildIncome: [], rawSixMonthTotal: null, rawMonthlyAverage: null, averageBeforeDeductions: null, averageAfterSupportedDeductions: null, countableSixMonthTotal: null, countableChildIncomeAverage: null, countableAfterConfirmedDeductions: null, status: "INCOMPLETE", warnings: [warning("CHILD_INCOME_SOURCE_REQUIRED", "Eigenes Einkommen ist angegeben, aber keine Quelle erfasst.", "incomeSources")], openChecks: ["CHILD_INCOME_SOURCE_REQUIRED"] };
    }
    if (child?.hasOwnIncome === "no" && sources.length === 0) {
      const monthly = periodMonths.map((periodMonth, index) => ({ ruleId: CHILD_MONTH_RULE_IDS.monthly, childId: child?.id || "", monthIndex: index, index, year: periodMonth.year, month: periodMonth.month, key: periodMonth.key, label: periodMonth.label, personMonthlyKey: `${child?.id || "unknown-child"}:${periodMonth.key || `month-${index + 1}`}`, sources: [], rawTotal: 0, rawKnownIncomeTotal: 0, excludedTotal: 0, deductions: [], knownCountableSubtotal: 0, countableIncome: 0, countableAfterConfirmedDeductions: 0, status: "SUPPORTED", warnings: [], openChecks: [], appliedRuleIds: [CHILD_MONTH_RULE_IDS.monthly, CHILD_MONTH_RULE_IDS.binding] }));
      return { ruleId: RULE_IDS.childIncome, childId: child?.id || "", sources: [], monthly, monthlyCountableChildIncome: [0, 0, 0, 0, 0, 0], rawSixMonthTotal: 0, rawMonthlyAverage: 0, averageBeforeDeductions: 0, averageAfterSupportedDeductions: 0, countableSixMonthTotal: 0, countableChildIncomeAverage: 0, countableAfterConfirmedDeductions: 0, status: "SUPPORTED", warnings: [], openChecks: [], usedRuleIds: [RULE_IDS.childIncome, CHILD_MONTH_RULE_IDS.monthly, CHILD_MONTH_RULE_IDS.binding] };
    }
    const monthly = periodMonths.map((periodMonth, index) => calculateChildIncomeForMonth(child, index, { ...context, periodMonth }));
    const monthlyCountableChildIncome = monthly.map((item) => item.countableIncome);
    const fullyRaw = monthly.every((item) => typeof item.rawTotal === "number");
    const fullyCountable = monthlyCountableChildIncome.every((value) => typeof value === "number");
    const rawSixMonthTotal = fullyRaw ? monthly.reduce((sum, item) => sum + item.rawTotal, 0) : null;
    const countableSixMonthTotal = fullyCountable ? monthlyCountableChildIncome.reduce((sum, value) => sum + value, 0) : null;
    const countableChildIncomeAverage = countableSixMonthTotal === null ? null : countableSixMonthTotal / 6;
    return {
      ruleId: RULE_IDS.childIncome,
      childId: child?.id || "",
      sources,
      monthly,
      monthlyCountableChildIncome,
      rawSixMonthTotal,
      rawMonthlyAverage: rawSixMonthTotal === null ? null : rawSixMonthTotal / 6,
      averageBeforeDeductions: rawSixMonthTotal === null ? null : rawSixMonthTotal / 6,
      averageAfterSupportedDeductions: countableChildIncomeAverage,
      countableSixMonthTotal,
      countableChildIncomeAverage,
      countableAfterConfirmedDeductions: countableChildIncomeAverage,
      status: monthly.every((item) => item.status === "SUPPORTED") ? "SUPPORTED" : monthly.some((item) => item.status === "INCOMPLETE") ? "INCOMPLETE" : "UNRESOLVED",
      warnings: monthly.flatMap((item) => item.warnings),
      openChecks: [...new Set(monthly.flatMap((item) => item.openChecks))],
      usedRuleIds: [...new Set([RULE_IDS.childIncome, ...monthly.flatMap((item) => item.appliedRuleIds)])],
    };
  }

  function legalPeriodStatus(applicationMonth, applicationYear) {
    const period = createAssessmentPeriod(applicationMonth, applicationYear);
    if (period.status !== "CALCULATED") return { supported: false, status: "INVALID_APPLICATION_PERIOD" };
    if (period.applicationYear !== 2026) return { supported: false, status: "UNSUPPORTED_LEGAL_PERIOD" };
    return { supported: true, status: "SUPPORTED" };
  }

  function evaluateMaximumKizForChild(child, householdId, applicationMonth, applicationYear) {
    const legalPeriod = legalPeriodStatus(applicationMonth, applicationYear);
    const relevance = calculationRules?.evaluateChildRelevanceForHousehold
      ? calculationRules.evaluateChildRelevanceForHousehold(child, householdId)
      : null;
    const warnings = relevance ? [...relevance.warnings] : [warning("STRUCTURAL_CHILD_RULE_UNAVAILABLE", "KIZ-CHILD-001 ist nicht verfügbar.")];
    const openChecks = relevance ? [...relevance.openChecks] : ["STRUCTURAL_CHILD_RULE_REQUIRED"];
    const isPotentialOwnKizChild = Boolean(relevance?.isPotentialOwnKizChildForThisHousehold);
    const reasons = relevance ? [...relevance.reasons] : [];

    if (!legalPeriod.supported) {
      warnings.push(warning(legalPeriod.status, "Für diesen Antragszeitraum ist kein maximaler KiZ-Ausgangsbetrag bestätigt.", "applicationYear"));
      openChecks.push("MAXIMUM_KIZ_LEGAL_PERIOD_REVIEW_REQUIRED");
      return {
        ruleId: RULE_IDS.maximumKiz,
        childId: typeof child?.id === "string" ? child.id : "",
        householdId,
        isPotentialOwnKizChild,
        maximumKizAmount: null,
        supportedLegalPeriod: false,
        status: legalPeriod.status,
        reasons,
        warnings,
        openChecks,
      };
    }

    return {
      ruleId: RULE_IDS.maximumKiz,
      childId: typeof child?.id === "string" ? child.id : "",
      householdId,
      isPotentialOwnKizChild,
      maximumKizAmount: isPotentialOwnKizChild ? 297 : 0,
      supportedLegalPeriod: true,
      status: isPotentialOwnKizChild ? (openChecks.length ? "PARTIAL" : "CALCULATED") : "NOT_POTENTIAL_OWN_KIZ_CHILD",
      reasons,
      warnings,
      openChecks,
    };
  }

  function evaluateMaximumKizForHousehold(state, householdId) {
    const childResults = asArray(state?.centralChildren).map((child) =>
      evaluateMaximumKizForChild(child, householdId, state?.applicationMonth, state?.applicationYear)
    );
    const supportedLegalPeriod = legalPeriodStatus(state?.applicationMonth, state?.applicationYear).supported;
    const potentialChildrenCount = childResults.filter((result) => result.isPotentialOwnKizChild).length;
    return {
      ruleId: RULE_IDS.maximumKiz,
      householdId,
      status: supportedLegalPeriod ? (childResults.some((result) => result.status === "PARTIAL") ? "PARTIAL" : "CALCULATED") : childResults[0]?.status || "UNSUPPORTED_LEGAL_PERIOD",
      supportedLegalPeriod,
      potentialChildrenCount,
      theoreticalMaximumKizTotal: supportedLegalPeriod ? childResults.reduce((sum, result) => sum + (result.maximumKizAmount || 0), 0) : null,
      childResults,
      warnings: childResults.flatMap((result) => result.warnings),
      openChecks: [...new Set(childResults.flatMap((result) => result.openChecks))],
      disclaimer: "Theoretischer maximaler Ausgangsbetrag, kein tatsächlicher Kinderzuschlagsanspruch.",
    };
  }

  function stabilizeArithmeticPrecision(value) {
    if (!Number.isFinite(value)) return null;
    // Entfernt nur IEEE-754-Rauschen; dies ist keine rechtliche Cent- oder Euro-Rundung.
    const stabilized = Number(value.toPrecision(14));
    return Object.is(stabilized, -0) ? 0 : stabilized;
  }

  function evaluateChildIncomeReduction(maximumKizResult, childIncomeResult) {
    const maximum = maximumKizResult && typeof maximumKizResult === "object" ? maximumKizResult : {};
    const income = childIncomeResult && typeof childIncomeResult === "object" ? childIncomeResult : {};
    const childId = typeof maximum.childId === "string" ? maximum.childId : "";
    const incomeChildId = typeof income.childId === "string" ? income.childId : "";
    const warnings = [...asArray(maximum.warnings), ...asArray(income.warnings)];
    const openChecks = [...new Set([...asArray(maximum.openChecks), ...asArray(income.openChecks)])];
    const base = {
      ruleId: CHILD_INCOME_REDUCTION.ruleId,
      childId,
      householdId: maximum.householdId ?? null,
      maximumKiZ: Number.isFinite(maximum.maximumKizAmount) ? maximum.maximumKizAmount : null,
      countableChildIncomeAverage: Number.isFinite(income.countableChildIncomeAverage) ? income.countableChildIncomeAverage : null,
      reductionRate: CHILD_INCOME_REDUCTION.rate,
      childIncomeReduction: null,
      individualKiZAfterChildIncome: null,
      warnings,
      openChecks,
      usedRuleIds: [RULE_IDS.maximumKiz, RULE_IDS.childIncome, CHILD_INCOME_REDUCTION.ruleId],
      remainingSteps: [
        "CHILD_ASSETS_NOT_EVALUATED",
        "PARENT_INCOME_REDUCTION_NOT_EVALUATED",
        "COVERAGE_CHECK_NOT_EVALUATED",
        "FINAL_ROUNDING_NOT_APPLIED",
      ],
      disclaimer: "Kindbezogener Zwischenwert nach Kindeseinkommen; kein Anspruchs-, End- oder Auszahlungsbetrag.",
    };

    const addUnresolved = (code, message, field = null) => {
      base.openChecks = [...new Set([...base.openChecks, code])];
      base.warnings = [...base.warnings, warning(code, message, field)];
      return { ...base, status: "UNRESOLVED" };
    };

    if (maximum.isPotentialOwnKizChild === false) {
      return {
        ...base,
        countableChildIncomeAverage: null,
        status: "NOT_POTENTIAL_OWN_KIZ_CHILD",
        usedRuleIds: [RULE_IDS.maximumKiz, CHILD_INCOME_REDUCTION.ruleId],
      };
    }
    if (maximum.isPotentialOwnKizChild !== true) {
      return addUnresolved(
        "CHILD_INCOME_REDUCTION_ELIGIBILITY_UNRESOLVED",
        "Die vorgelagerte kind- und haushaltsbezogene KiZ-Zuordnung ist nicht eindeutig.",
        "isPotentialOwnKizChild"
      );
    }

    if (!childId || !incomeChildId || childId !== incomeChildId) {
      return addUnresolved(
        "CHILD_INCOME_REDUCTION_CHILD_ID_MISMATCH",
        "Maximalbetrag und Kindeseinkommen müssen eindeutig demselben Kind zugeordnet sein.",
        "childId"
      );
    }
    if (maximum.supportedLegalPeriod === false || !Number.isFinite(maximum.maximumKizAmount) || maximum.maximumKizAmount < 0) {
      return addUnresolved(
        "CHILD_INCOME_REDUCTION_MAXIMUM_UNRESOLVED",
        "Für das Kind liegt kein verwendbarer individueller KiZ-Höchstbetrag vor.",
        "maximumKizAmount"
      );
    }
    if (income.status !== "SUPPORTED" || !Number.isFinite(income.countableChildIncomeAverage) || income.countableChildIncomeAverage < 0) {
      return addUnresolved(
        "CHILD_INCOME_REDUCTION_INCOME_UNRESOLVED",
        "Die Minderung bleibt offen, solange KIZ-INCOME-CHILD-001 keinen unterstützten nicht negativen Durchschnitt liefert.",
        "countableChildIncomeAverage"
      );
    }

    const childIncomeReduction = stabilizeArithmeticPrecision(
      income.countableChildIncomeAverage * CHILD_INCOME_REDUCTION.rate
    );
    const individualKiZAfterChildIncome = stabilizeArithmeticPrecision(
      Math.max(0, maximum.maximumKizAmount - childIncomeReduction)
    );
    return {
      ...base,
      maximumKiZ: maximum.maximumKizAmount,
      countableChildIncomeAverage: income.countableChildIncomeAverage,
      childIncomeReduction,
      individualKiZAfterChildIncome,
      status: "SUPPORTED",
    };
  }

  function evaluateChildIncomeReductionsForHousehold(state, householdId) {
    const maximumKiz = evaluateMaximumKizForHousehold(state, householdId);
    const childrenById = new Map(asArray(state?.centralChildren).map((child) => [child?.id, child]));
    const childResults = maximumKiz.childResults.map((maximumResult) => {
      if (!maximumResult.isPotentialOwnKizChild) {
        return evaluateChildIncomeReduction(maximumResult, null);
      }
      const child = childrenById.get(maximumResult.childId);
      const childIncome = child
        ? evaluateChildIncome(child, {
            applicationMonth: state?.applicationMonth,
            applicationYear: state?.applicationYear,
            householdId,
          })
        : null;
      return evaluateChildIncomeReduction(maximumResult, childIncome);
    });
    const potentialChildResults = childResults.filter((result) => result.status !== "NOT_POTENTIAL_OWN_KIZ_CHILD");
    const allSupported = potentialChildResults.every((result) => result.status === "SUPPORTED");
    return {
      ruleId: CHILD_INCOME_REDUCTION.ruleId,
      householdId,
      status: potentialChildResults.length === 0 ? "NO_POTENTIAL_OWN_KIZ_CHILDREN" : allSupported ? "SUPPORTED" : "UNRESOLVED",
      childResults,
      preliminaryIndividualKiZAfterChildIncomeTotal: allSupported
        ? stabilizeArithmeticPrecision(potentialChildResults.reduce((sum, result) => sum + result.individualKiZAfterChildIncome, 0))
        : null,
      warnings: childResults.flatMap((result) => result.warnings),
      openChecks: [...new Set(childResults.flatMap((result) => result.openChecks))],
      usedRuleIds: [RULE_IDS.maximumKiz, RULE_IDS.childIncome, CHILD_INCOME_REDUCTION.ruleId],
      remainingSteps: [
        "CHILD_ASSETS_NOT_EVALUATED",
        "PARENT_INCOME_REDUCTION_NOT_EVALUATED",
        "COVERAGE_CHECK_NOT_EVALUATED",
        "FINAL_ROUNDING_NOT_APPLIED",
      ],
      disclaimer: "Vorläufige Summe der kindbezogenen Zwischenwerte; kein Gesamtkinderzuschlag, Anspruchs- oder Auszahlungsbetrag.",
    };
  }

  function calculateParentIncomeReductionAmounts(parentTotalNeed, earnedIncome, otherIncome, preParentReductionKiZ) {
    const values = [parentTotalNeed, earnedIncome, otherIncome, preParentReductionKiZ];
    if (values.some((value) => !Number.isFinite(value) || value < 0)) return null;
    const otherIncomeExcess = stabilizeArithmeticPrecision(Math.max(0, otherIncome - parentTotalNeed));
    const remainingNeedForEarnedIncome = stabilizeArithmeticPrecision(Math.max(0, parentTotalNeed - otherIncome));
    const earnedIncomeExcess = stabilizeArithmeticPrecision(Math.max(0, earnedIncome - remainingNeedForEarnedIncome));
    const otherIncomeReduction = otherIncomeExcess;
    const earnedIncomeReduction = stabilizeArithmeticPrecision(earnedIncomeExcess * PARENT_INCOME_REDUCTION.earnedIncomeRate);
    const parentIncomeReductionBeforeCap = stabilizeArithmeticPrecision(otherIncomeReduction + earnedIncomeReduction);
    const appliedParentIncomeReduction = stabilizeArithmeticPrecision(Math.min(preParentReductionKiZ, parentIncomeReductionBeforeCap));
    const unappliedExcessReduction = stabilizeArithmeticPrecision(Math.max(0, parentIncomeReductionBeforeCap - preParentReductionKiZ));
    const kizAfterParentIncomeBeforeAssets = stabilizeArithmeticPrecision(Math.max(0, preParentReductionKiZ - appliedParentIncomeReduction));
    return {
      excess: { otherIncomeExcess, remainingNeedForEarnedIncome, earnedIncomeExcess },
      reductions: {
        otherIncomeReductionRate: PARENT_INCOME_REDUCTION.otherIncomeRate,
        otherIncomeReduction,
        earnedIncomeReductionRate: PARENT_INCOME_REDUCTION.earnedIncomeRate,
        earnedIncomeReduction,
        parentIncomeReductionBeforeCap,
        appliedParentIncomeReduction,
        unappliedExcessReduction,
      },
      kizAfterParentIncomeBeforeAssets,
    };
  }

  function allocateParentIncomeReduction(kizBgChildren, preParentReductionKiZ, appliedParentIncomeReduction) {
    const positiveChildren = asArray(kizBgChildren).filter((child) => Number.isFinite(child?.individualKiZAfterChildIncome) && child.individualKiZAfterChildIncome > 0);
    const unknownRecipient = positiveChildren.some((child) => !child.recipientPersonRole);
    if (positiveChildren.length >= 2 && unknownRecipient) {
      return {
        required: null,
        status: "UNRESOLVED",
        recipients: [],
        warnings: [warning("PATCHWORK_CHILD_BENEFIT_RECIPIENT_UNRESOLVED", "Eine mögliche Patchwork-Verteilung kann ohne eindeutige Kindergeldperson nicht vorgenommen werden.", "childBenefitPerson")],
        openChecks: ["PATCHWORK_CHILD_BENEFIT_RECIPIENT_REQUIRED"],
      };
    }
    const groups = new Map();
    positiveChildren.forEach((child) => {
      const role = child.recipientPersonRole;
      if (!groups.has(role)) groups.set(role, { recipientPersonRole: role, childIds: [], recipientPreParentKiZ: 0 });
      const group = groups.get(role);
      group.childIds.push(child.childId);
      group.recipientPreParentKiZ = stabilizeArithmeticPrecision(group.recipientPreParentKiZ + child.individualKiZAfterChildIncome);
    });
    const grouped = [...groups.values()];
    const required = grouped.length >= 2;
    if (!required) {
      const only = grouped[0];
      return {
        required: false,
        status: "NOT_APPLICABLE",
        recipients: only
          ? [{
              ...only,
              recipientShare: 1,
              recipientParentReductionShare: appliedParentIncomeReduction,
              recipientKiZAfterParentIncome: stabilizeArithmeticPrecision(preParentReductionKiZ - appliedParentIncomeReduction),
            }]
          : [],
        warnings: [],
        openChecks: [],
      };
    }
    let allocatedReduction = 0;
    const recipients = grouped.map((group, index) => {
      const recipientShare = stabilizeArithmeticPrecision(group.recipientPreParentKiZ / preParentReductionKiZ);
      const isLast = index === grouped.length - 1;
      const recipientParentReductionShare = isLast
        ? stabilizeArithmeticPrecision(appliedParentIncomeReduction - allocatedReduction)
        : stabilizeArithmeticPrecision(appliedParentIncomeReduction * recipientShare);
      allocatedReduction = stabilizeArithmeticPrecision(allocatedReduction + recipientParentReductionShare);
      return {
        ...group,
        recipientShare,
        recipientParentReductionShare,
        recipientKiZAfterParentIncome: stabilizeArithmeticPrecision(group.recipientPreParentKiZ - recipientParentReductionShare),
      };
    });
    return { required: true, status: "SUPPORTED", recipients, warnings: [], openChecks: [] };
  }

  function parentIncomeReductionBase(householdId) {
    return {
      ruleId: RULE_IDS.parentIncomeReduction,
      householdId,
      children: { kizBgChildren: [], excludedChildren: [], preParentReductionKiZ: null },
      parentNeed: null,
      parentIncome: { earnedIncome: null, otherIncome: null, totalIncome: null },
      excess: { otherIncomeExcess: null, remainingNeedForEarnedIncome: null, earnedIncomeExcess: null },
      reductions: {
        otherIncomeReductionRate: PARENT_INCOME_REDUCTION.otherIncomeRate,
        otherIncomeReduction: null,
        earnedIncomeReductionRate: PARENT_INCOME_REDUCTION.earnedIncomeRate,
        earnedIncomeReduction: null,
        parentIncomeReductionBeforeCap: null,
        appliedParentIncomeReduction: null,
        unappliedExcessReduction: null,
      },
      kizAfterParentIncomeBeforeAssets: null,
      patchworkAllocation: { required: false, status: "NOT_APPLICABLE", recipients: [], warnings: [], openChecks: [] },
      warnings: [],
      openChecks: [],
      remainingSteps: [
        "CHILD_ASSETS_NOT_EVALUATED",
        "PARENT_ASSETS_NOT_EVALUATED",
        "COVERAGE_CHECK_NOT_EVALUATED",
        "WOHNGELD_NOT_EVALUATED",
        "FINAL_ROUNDING_NOT_APPLIED",
      ],
      usedRuleIds: [RULE_IDS.parentIncomeReduction, CHILD_INCOME_REDUCTION.ruleId, RULE_IDS.childBgIncome, RULE_IDS.parentNeed, RULE_IDS.adultIncome, RULE_IDS.childBenefitSurplus],
      sourceIds: ["SRC-BKGG-6A", "SRC-BKGG-11", "SRC-SGBII-11-11B", "SRC-DA-KIZ-2026-02-20"],
      disclaimer: "Haushaltsbezogener KiZ-Zwischenwert nach Elterneinkommen und vor Vermögen, Wohngeld, Bedarfsdeckungsprüfung und Schlussrundung; kein End- oder Auszahlungsbetrag.",
    };
  }

  function evaluateParentIncomeReduction(state, householdId) {
    const base = parentIncomeReductionBase(householdId);
    const household = state?.households?.[householdId];
    if (!household) {
      return { ...base, status: "UNRESOLVED", openChecks: ["HOUSEHOLD_REQUIRED"], warnings: [warning("HOUSEHOLD_REQUIRED", "Der Haushalt wird für die Elternminderung benötigt.")] };
    }
    const d2 = evaluateChildIncomeReductionsForHousehold(state, householdId);
    const childrenById = new Map(asArray(state?.centralChildren).map((child) => [child?.id, child]));
    const potentialD2Results = asArray(d2.childResults).filter((result) => result.status !== "NOT_POTENTIAL_OWN_KIZ_CHILD");
    const housingHead = potentialD2Results.length ? familyHousingHeadShare(state, householdId) : null;
    const kizBgChildren = [];
    const excludedChildren = [];
    const mandatoryWarnings = [...asArray(d2.warnings)];
    const mandatoryOpenChecks = [...asArray(d2.openChecks)];
    let childPrerequisitesUnresolved = false;

    potentialD2Results.forEach((d2Child) => {
      const child = childrenById.get(d2Child.childId);
      const membership = child ? evaluateChildKizBgMembership(state, householdId, child, housingHead) : null;
      mandatoryWarnings.push(...asArray(membership?.warnings));
      mandatoryOpenChecks.push(...asArray(membership?.openChecks));
      if (d2Child.status !== "SUPPORTED" || !Number.isFinite(d2Child.individualKiZAfterChildIncome)) {
        childPrerequisitesUnresolved = true;
        mandatoryOpenChecks.push("PARENT_REDUCTION_CHILD_D2_REQUIRED");
        return;
      }
      if (membership?.status !== "SUPPORTED" || typeof membership?.isKizBgMember !== "boolean") {
        childPrerequisitesUnresolved = true;
        mandatoryOpenChecks.push("PARENT_REDUCTION_CHILD_KIZ_MEMBERSHIP_REQUIRED");
        return;
      }
      const childResult = {
        childId: d2Child.childId,
        individualKiZAfterChildIncome: d2Child.individualKiZAfterChildIncome,
        recipientPersonRole: recipientRoleForChildBenefit(child?.childBenefitPerson, householdId),
      };
      if (membership.isKizBgMember) kizBgChildren.push(childResult);
      else excludedChildren.push({ ...childResult, contributionToPreParentReductionKiZ: 0, exclusionReason: "NOT_KIZ_BG_MEMBER" });
    });

    const preParentReductionKiZ = childPrerequisitesUnresolved
      ? null
      : stabilizeArithmeticPrecision(kizBgChildren.reduce((sum, child) => sum + child.individualKiZAfterChildIncome, 0));
    const childView = { kizBgChildren, excludedChildren, preParentReductionKiZ };
    if (childPrerequisitesUnresolved) {
      return {
        ...base,
        children: childView,
        status: "UNRESOLVED",
        warnings: mandatoryWarnings,
        openChecks: [...new Set(mandatoryOpenChecks)],
      };
    }
    if (kizBgChildren.length === 0) {
      const zeroAmounts = calculateParentIncomeReductionAmounts(0, 0, 0, 0);
      return {
        ...base,
        children: childView,
        parentNeed: 0,
        parentIncome: { earnedIncome: 0, otherIncome: 0, totalIncome: 0 },
        ...zeroAmounts,
        status: "NOT_APPLICABLE",
        warnings: mandatoryWarnings,
        openChecks: [...new Set(mandatoryOpenChecks)],
      };
    }

    const parentNeedResult = evaluateParentNeedForHousehold(state, householdId);
    const adultIncomeResult = evaluateAdultIncomeForHousehold(state, householdId);
    const prepared = adultIncomeResult?.preparedForParentReduction || {};
    const warnings = [...mandatoryWarnings, ...asArray(parentNeedResult?.warnings), ...asArray(adultIncomeResult?.warnings)];
    const openChecks = [...new Set([...mandatoryOpenChecks, ...asArray(parentNeedResult?.openChecks), ...asArray(adultIncomeResult?.openChecks)])];
    const inputsSupported = parentNeedResult?.status === "SUPPORTED"
      && Number.isFinite(parentNeedResult.parentTotalNeed)
      && adultIncomeResult?.status === "SUPPORTED"
      && Number.isFinite(prepared.earnedIncome)
      && Number.isFinite(prepared.otherIncome)
      && Number.isFinite(prepared.totalIncome);
    if (!inputsSupported) {
      if (parentNeedResult?.status !== "SUPPORTED" || !Number.isFinite(parentNeedResult?.parentTotalNeed)) openChecks.push("PARENT_REDUCTION_PARENT_NEED_REQUIRED");
      if (adultIncomeResult?.status !== "SUPPORTED" || !Number.isFinite(prepared.earnedIncome) || !Number.isFinite(prepared.otherIncome) || !Number.isFinite(prepared.totalIncome)) openChecks.push("PARENT_REDUCTION_PREPARED_ADULT_INCOME_REQUIRED");
      return {
        ...base,
        children: childView,
        status: "UNRESOLVED",
        warnings,
        openChecks: [...new Set(openChecks)],
      };
    }
    const amounts = calculateParentIncomeReductionAmounts(parentNeedResult.parentTotalNeed, prepared.earnedIncome, prepared.otherIncome, preParentReductionKiZ);
    const patchworkAllocation = allocateParentIncomeReduction(kizBgChildren, preParentReductionKiZ, amounts.reductions.appliedParentIncomeReduction);
    return {
      ...base,
      children: childView,
      parentNeed: parentNeedResult.parentTotalNeed,
      parentIncome: { earnedIncome: prepared.earnedIncome, otherIncome: prepared.otherIncome, totalIncome: prepared.totalIncome },
      ...amounts,
      patchworkAllocation,
      status: "SUPPORTED",
      warnings: [...warnings, ...patchworkAllocation.warnings],
      openChecks,
    };
  }

  function assetDateAndVersion(state) {
    const month = Number(state?.applicationMonth);
    const year = Number(state?.applicationYear);
    if (!Number.isInteger(month) || month < 1 || month > 12 || !Number.isInteger(year) || year < 1) {
      return { assetAssessmentDate: null, assetRuleVersion: null };
    }
    const assetAssessmentDate = `${year}-${String(month).padStart(2, "0")}-01`;
    return { assetAssessmentDate, assetRuleVersion: assetAssessmentDate < "2026-07-01" ? "PRE_JULY_2026" : "POST_JULY_2026" };
  }

  function classifyAssetPosition(asset, assetRuleVersion) {
    const value = parseNonNegativeAmount(asset?.value);
    const details = asset?.details || {};
    const result = { assetId: asset?.id ?? null, type: asset?.type ?? null, ownerRole: asset?.ownerRole ?? null, grossValue: value, protectedValue: null, countableBeforeAllowance: null, status: "UNRESOLVED", warnings: [], openChecks: [] };
    const unresolved = (code, message) => ({ ...result, warnings: [warning(code, message, "asset")], openChecks: [code] });
    if (!ASSET_TYPES.has(asset?.type)) return unresolved("ASSET_TYPE_INVALID", "Die Vermögensart ist nicht unterstützt.");
    if (!Number.isFinite(value)) return unresolved("ASSET_VALUE_REQUIRED", "Ein bestätigter nicht negativer Markt- oder Geldwert ist erforderlich.");
    if (!["applicant", "partner", "child"].includes(asset?.ownerRole)) return unresolved("ASSET_OWNER_INVALID", "Die Vermögensposition benötigt eine eindeutige Eigentümerrolle.");
    if (details.incomeDoubleCountStatus !== "no") return unresolved("ASSET_INCOME_DOUBLE_COUNT_CHECK", "Die Abgrenzung zwischen Einkommen und Vermögen muss bestätigt werden.");
    if (asset.protectedStatus === "yes") return { ...result, protectedValue: value, countableBeforeAllowance: 0, status: "SUPPORTED" };
    if (asset.protectedStatus !== "no") return unresolved("ASSET_PROTECTION_STATUS_REQUIRED", "Der gesetzliche Schutzstatus muss geklärt werden.");
    const protectedResult = () => ({ ...result, protectedValue: value, countableBeforeAllowance: 0, status: "SUPPORTED" });
    if (asset.type === "vehicle") {
      if (details.appropriateVehicleDeclared === "yes") return protectedResult();
      return unresolved("VEHICLE_ASSET_CLASSIFICATION_OPEN", "Ohne bestätigte Angemessenheit wird das Fahrzeug nicht automatisch gezählt.");
    }
    if (asset.type === "protected-retirement" || asset.type === "self-employed-retirement") {
      if (details.protectedRetirementConfirmed === "yes") return protectedResult();
      if (asset.type === "self-employed-retirement") return unresolved("SELF_EMPLOYED_RETIREMENT_ASSET_OPEN", "Die Altersvorsorge Selbständiger kann ohne vollständige Schutzprüfung nicht bewertet werden.");
    }
    if (asset.type === "self-used-property") {
      if (details.selfUsedStatus !== "yes") return unresolved("PROPERTY_SELF_USE_STATUS_REQUIRED", "Die Selbstnutzung der Immobilie muss bestätigt werden.");
      if (assetRuleVersion === "PRE_JULY_2026") return protectedResult();
      if (!["house", "apartment"].includes(details.propertyType)) return unresolved("PROPERTY_TYPE_REQUIRED", "Für selbst genutztes Wohneigentum ist Haus oder Wohnung anzugeben.");
      const livingArea = parseNonNegativeAmount(details.livingAreaSqm);
      const residents = Number(details.residentCount);
      if (!Number.isFinite(livingArea) || !Number.isInteger(residents) || residents < 1) return unresolved("PROPERTY_SIZE_DATA_REQUIRED", "Wohnfläche und positive ganze Bewohnerzahl sind erforderlich.");
      const baseLimit = details.propertyType === "house" ? 140 : 130;
      const limit = baseLimit + Math.max(0, residents - 4) * 20;
      if (livingArea <= limit || details.hardshipProtection === "yes") return { ...protectedResult(), propertyAreaLimitSqm: limit };
      return { ...unresolved("PROPERTY_ASSET_VALUATION_REQUIRED", "Bei Überschreitung der Wohnflächengrenze wird kein anteiliger Vermögenswert erfunden."), propertyAreaLimitSqm: limit };
    }
    if (details.realizableStatus !== "yes") return unresolved(asset.type === "other-real-estate" ? "REAL_ESTATE_REALIZABILITY_REQUIRED" : "ASSET_REALIZABILITY_REQUIRED", "Die Verwertbarkeit und der realisierbare Wert müssen bestätigt werden.");
    return { ...result, protectedValue: 0, countableBeforeAllowance: value, status: "SUPPORTED" };
  }

  function calculateAssetAssessment({ assetsStatus, assetPersons = {}, adults = "single", childIds = [], assetAssessmentDate = null, assetRuleVersion = null } = {}) {
    const base = {
      ruleId: RULE_IDS.asset,
      assetAssessmentDate,
      assetRuleVersion,
      persons: [],
      allowanceLedger: { totalUnusedBeforeTransfer: null, transfers: [], totalTransferred: null },
      countableAssets: { children: null, parents: null, householdTotal: null },
      status: "UNRESOLVED",
      warnings: [],
      openChecks: [],
      sourceIds: ["SRC-BKGG-6A", "SRC-DA-KIZ-2026-02-20", assetRuleVersion === "PRE_JULY_2026" ? "SRC-SGBII-12-PRE-2026-07" : "SRC-SGBII-12-POST-2026-07"],
    };
    if (!assetAssessmentDate || !assetRuleVersion) return { ...base, openChecks: ["ASSET_ASSESSMENT_DATE_REQUIRED"] };
    if (assetsStatus === "unknown" || !["yes", "no"].includes(assetsStatus)) return { ...base, openChecks: ["ASSETS_STATUS_REQUIRED"] };
    const memberSpecs = [
      { personKey: "applicant", personRole: "applicant", allowance: ASSET_ALLOWANCES.applicant, assets: asArray(assetPersons?.applicant?.assets) },
      ...(adults === "couple" ? [{ personKey: "partner", personRole: "partner", allowance: ASSET_ALLOWANCES.otherMember, assets: asArray(assetPersons?.partner?.assets) }] : []),
      ...childIds.map((childId) => ({ personKey: `child:${childId}`, personRole: "child", childId, allowance: ASSET_ALLOWANCES.otherMember, assets: asArray(assetPersons?.children?.[childId]?.assets) })),
    ];
    if (assetsStatus === "no") {
      const persons = memberSpecs.map((member) => ({ ...member, assets: [], grossAssets: 0, protectedAssets: 0, countableBeforeAllowance: 0, personalAllowance: member.allowance, unusedAllowanceBeforeTransfer: member.allowance, excessBeforeTransfer: 0, receivedAllowanceTransfer: 0, countableAssets: 0, status: "SUPPORTED" }));
      return { ...base, persons, allowanceLedger: { totalUnusedBeforeTransfer: persons.reduce((sum, person) => sum + person.personalAllowance, 0), transfers: [], totalTransferred: 0 }, countableAssets: { children: 0, parents: 0, householdTotal: 0 }, status: "SUPPORTED" };
    }
    const allPersistedAssets = memberSpecs.flatMap((member) => member.assets);
    if (!allPersistedAssets.length) return { ...base, openChecks: ["ASSET_DETAILS_REQUIRED"], warnings: [warning("ASSET_DETAILS_REQUIRED", "Bei vorhandenem Vermögen ist mindestens eine Position erforderlich.")] };
    const warnings = [];
    const openChecks = [];
    const persons = memberSpecs.map((member) => {
      const positions = member.assets.map((asset) => asset?.ownerRole === member.personRole
        ? classifyAssetPosition(asset, assetRuleVersion)
        : { assetId: asset?.id ?? null, type: asset?.type ?? null, ownerRole: asset?.ownerRole ?? null, grossValue: parseNonNegativeAmount(asset?.value), protectedValue: null, countableBeforeAllowance: null, status: "UNRESOLVED", warnings: [warning("ASSET_OWNER_PERSON_MISMATCH", "Eigentümerrolle und Personenliste widersprechen sich.", "asset")], openChecks: ["ASSET_OWNER_PERSON_MISMATCH"] });
      warnings.push(...positions.flatMap((position) => position.warnings));
      openChecks.push(...positions.flatMap((position) => position.openChecks));
      const supported = positions.every((position) => position.status === "SUPPORTED");
      const grossAssets = supported ? stabilizeArithmeticPrecision(positions.reduce((sum, position) => sum + position.grossValue, 0)) : null;
      const protectedAssets = supported ? stabilizeArithmeticPrecision(positions.reduce((sum, position) => sum + position.protectedValue, 0)) : null;
      const countableBeforeAllowance = supported ? stabilizeArithmeticPrecision(positions.reduce((sum, position) => sum + position.countableBeforeAllowance, 0)) : null;
      return {
        personKey: member.personKey, personRole: member.personRole, ...(member.childId ? { childId: member.childId } : {}), assets: positions,
        grossAssets, protectedAssets, countableBeforeAllowance, personalAllowance: member.allowance,
        unusedAllowanceBeforeTransfer: supported ? Math.max(0, member.allowance - countableBeforeAllowance) : null,
        excessBeforeTransfer: supported ? Math.max(0, countableBeforeAllowance - member.allowance) : null,
        receivedAllowanceTransfer: supported ? 0 : null, countableAssets: supported ? Math.max(0, countableBeforeAllowance - member.allowance) : null,
        status: supported ? "SUPPORTED" : "UNRESOLVED",
      };
    });
    if (openChecks.length) return { ...base, persons, warnings, openChecks: [...new Set(openChecks)] };
    let pool = stabilizeArithmeticPrecision(persons.reduce((sum, person) => sum + person.unusedAllowanceBeforeTransfer, 0));
    const excessPersons = persons.filter((person) => person.excessBeforeTransfer > 0);
    const totalExcess = stabilizeArithmeticPrecision(excessPersons.reduce((sum, person) => sum + person.excessBeforeTransfer, 0));
    if (excessPersons.length > 1 && pool < totalExcess) {
      return { ...base, persons, warnings, openChecks: ["ASSET_ALLOWANCE_ALLOCATION_OPEN"], allowanceLedger: { totalUnusedBeforeTransfer: pool, transfers: [], totalTransferred: 0 } };
    }
    const transfers = [];
    excessPersons.forEach((person) => {
      const transfer = Math.min(pool, person.excessBeforeTransfer);
      if (transfer > 0) transfers.push({ toPersonKey: person.personKey, amount: transfer });
      person.receivedAllowanceTransfer = transfer;
      person.countableAssets = stabilizeArithmeticPrecision(person.excessBeforeTransfer - transfer);
      pool = stabilizeArithmeticPrecision(pool - transfer);
    });
    const childTotal = stabilizeArithmeticPrecision(persons.filter((person) => person.personRole === "child").reduce((sum, person) => sum + person.countableAssets, 0));
    const parentTotal = stabilizeArithmeticPrecision(persons.filter((person) => person.personRole !== "child").reduce((sum, person) => sum + person.countableAssets, 0));
    return {
      ...base, persons, warnings, openChecks: [], status: "SUPPORTED",
      allowanceLedger: { totalUnusedBeforeTransfer: stabilizeArithmeticPrecision(persons.reduce((sum, person) => sum + person.unusedAllowanceBeforeTransfer, 0)), transfers, totalTransferred: stabilizeArithmeticPrecision(transfers.reduce((sum, transfer) => sum + transfer.amount, 0)), unusedAfterTransfer: pool },
      countableAssets: { children: childTotal, parents: parentTotal, householdTotal: stabilizeArithmeticPrecision(childTotal + parentTotal) },
    };
  }

  function calculateChildAssetReduction(individualKiZAfterChildIncome, countableChildAssets) {
    const base = { ruleId: RULE_IDS.childAssetReduction, individualKiZAfterChildIncome, countableChildAssets, month1KiZ: null, months2To6KiZ: null, rejectedDueToAssets: false, futurePeriodStatus: "NOT_DETERMINED", reapplicationPossibleFromFollowingMonth: false, status: "UNRESOLVED", openChecks: [] };
    if (!Number.isFinite(individualKiZAfterChildIncome) || individualKiZAfterChildIncome < 0 || !Number.isFinite(countableChildAssets) || countableChildAssets < 0) return { ...base, openChecks: ["CHILD_ASSET_REDUCTION_INPUT_REQUIRED"] };
    if (countableChildAssets === individualKiZAfterChildIncome && countableChildAssets > 0) return { ...base, openChecks: ["ASSET_EXACT_EQUALITY_OPEN"] };
    if (countableChildAssets > individualKiZAfterChildIncome) return { ...base, month1KiZ: 0, rejectedDueToAssets: true, futurePeriodStatus: "NEW_APPLICATION_REQUIRED", reapplicationPossibleFromFollowingMonth: true, status: "SUPPORTED" };
    return { ...base, month1KiZ: stabilizeArithmeticPrecision(individualKiZAfterChildIncome - countableChildAssets), months2To6KiZ: individualKiZAfterChildIncome, futurePeriodStatus: "CURRENT_BENEFIT_PERIOD_CONTINUES", status: "SUPPORTED" };
  }

  function applyParentAssets(month1KiZAfterParentIncome, months2To6KiZAfterParentIncome, countableParentAssets) {
    const base = { ruleId: RULE_IDS.parentAssetReduction, countableParentAssets, month1KiZ: null, months2To6KiZ: null, appliedParentAssetReduction: null, rejectedDueToAssets: false, futurePeriodStatus: "NOT_DETERMINED", reapplicationPossibleFromFollowingMonth: false, status: "UNRESOLVED", openChecks: [] };
    if (![month1KiZAfterParentIncome, months2To6KiZAfterParentIncome, countableParentAssets].every((value) => Number.isFinite(value) && value >= 0)) return { ...base, openChecks: ["PARENT_ASSET_REDUCTION_INPUT_REQUIRED"] };
    if (countableParentAssets === month1KiZAfterParentIncome && countableParentAssets > 0) return { ...base, openChecks: ["ASSET_EXACT_EQUALITY_OPEN"] };
    if (countableParentAssets > month1KiZAfterParentIncome) return { ...base, month1KiZ: 0, appliedParentAssetReduction: month1KiZAfterParentIncome, rejectedDueToAssets: true, futurePeriodStatus: "NEW_APPLICATION_REQUIRED", reapplicationPossibleFromFollowingMonth: true, status: "SUPPORTED" };
    return { ...base, month1KiZ: stabilizeArithmeticPrecision(month1KiZAfterParentIncome - countableParentAssets), months2To6KiZ: months2To6KiZAfterParentIncome, appliedParentAssetReduction: countableParentAssets, futurePeriodStatus: "CURRENT_BENEFIT_PERIOD_CONTINUES", status: "SUPPORTED" };
  }

  function evaluateAssetIntegration(state, householdId) {
    const date = assetDateAndVersion(state);
    const base = {
      ruleId: RULE_IDS.assetIntegration, householdId, ...date, assetAssessment: null,
      month1: null, months2To6: null, months2To6Count: null, rejectedDueToAssets: null,
      futurePeriodStatus: "NOT_DETERMINED", reapplicationPossibleFromFollowingMonth: false,
      countableAssetsForKizReduction: { children: null, parents: null, householdTotal: null },
      coverageAssetAssessment: { status: "NOT_EVALUATED", countableAssets: null, userDeclaredNoSubstantialAssets: null, openChecks: ["SGBII_COVERAGE_ASSET_RULES_NOT_EVALUATED"] },
      status: "UNRESOLVED", warnings: [], openChecks: [],
      remainingSteps: ["COVERAGE_CHECK_NOT_EVALUATED", "WOHNGELD_NOT_EVALUATED", "FINAL_ROUNDING_NOT_APPLIED", "FINAL_ENTITLEMENT_NOT_DETERMINED"],
      usedRuleIds: [RULE_IDS.assetIntegration, RULE_IDS.asset, RULE_IDS.childAssetReduction, RULE_IDS.parentIncomeReduction, RULE_IDS.parentAssetReduction],
    };
    const d6 = evaluateParentIncomeReduction(state, householdId);
    if (!["SUPPORTED", "NOT_APPLICABLE"].includes(d6.status)) return { ...base, warnings: asArray(d6.warnings), openChecks: [...new Set([...asArray(d6.openChecks), "ASSET_PIPELINE_D6_REQUIRED"])] };
    const childIds = d6.children.kizBgChildren.map((child) => child.childId);
    const household = state?.households?.[householdId];
    const coverageAssetAssessment = { ...base.coverageAssetAssessment, userDeclaredNoSubstantialAssets: household?.assetsStatus === "no" };
    const assessment = calculateAssetAssessment({ assetsStatus: household?.assetsStatus, assetPersons: household?.assetPersons, adults: household?.adults, childIds, ...date });
    if (assessment.status !== "SUPPORTED") return { ...base, assetAssessment: assessment, warnings: assessment.warnings, openChecks: assessment.openChecks };
    const countableAssetsForKizReduction = assessment.countableAssets;
    const childAssetsById = new Map(assessment.persons.filter((person) => person.personRole === "child").map((person) => [person.childId, person.countableAssets]));
    const childAssetResults = d6.children.kizBgChildren.map((child) => ({ childId: child.childId, recipientPersonRole: child.recipientPersonRole, ...calculateChildAssetReduction(child.individualKiZAfterChildIncome, childAssetsById.get(child.childId) || 0) }));
    const unresolvedChild = childAssetResults.find((result) => result.status !== "SUPPORTED");
    if (unresolvedChild) return { ...base, assetAssessment: assessment, countableAssetsForKizReduction, coverageAssetAssessment, warnings: assessment.warnings, openChecks: unresolvedChild.openChecks };
    const month1ChildKiZ = stabilizeArithmeticPrecision(childAssetResults.reduce((sum, child) => sum + child.month1KiZ, 0));
    const rejectedChildren = childAssetResults.filter((child) => child.rejectedDueToAssets);
    const allChildrenRejected = childAssetResults.length > 0 && rejectedChildren.length === childAssetResults.length;
    if (rejectedChildren.length && !allChildrenRejected) {
      return { ...base, assetAssessment: assessment, rejectedDueToAssets: true, countableAssetsForKizReduction, coverageAssetAssessment, warnings: assessment.warnings, openChecks: ["PARENT_NEED_AFTER_CHILD_ASSET_REJECTION_OPEN"] };
    }
    const parentNeed = d6.parentNeed || 0;
    const earnedIncome = d6.parentIncome.earnedIncome || 0;
    const otherIncome = d6.parentIncome.otherIncome || 0;
    const month1AfterIncome = calculateParentIncomeReductionAmounts(parentNeed, earnedIncome, otherIncome, month1ChildKiZ);
    const month1 = { childResults: childAssetResults, childKiZBeforeParentIncome: month1ChildKiZ, parentIncomeReductionBeforeCap: month1AfterIncome.reductions.parentIncomeReductionBeforeCap, appliedParentIncomeReduction: month1AfterIncome.reductions.appliedParentIncomeReduction, kizAfterParentIncome: month1AfterIncome.kizAfterParentIncomeBeforeAssets, appliedParentAssetReduction: 0, kizAfterAssets: month1AfterIncome.kizAfterParentIncomeBeforeAssets };
    if (allChildrenRejected) {
      return { ...base, assetAssessment: assessment, month1: { ...month1, kizAfterAssets: 0 }, rejectedDueToAssets: true, futurePeriodStatus: "NEW_APPLICATION_REQUIRED", reapplicationPossibleFromFollowingMonth: true, countableAssetsForKizReduction, coverageAssetAssessment, status: "SUPPORTED", warnings: assessment.warnings };
    }
    const months2To6ChildKiZ = stabilizeArithmeticPrecision(childAssetResults.reduce((sum, child) => sum + child.months2To6KiZ, 0));
    const months2AfterIncome = calculateParentIncomeReductionAmounts(parentNeed, earnedIncome, otherIncome, months2To6ChildKiZ);
    const parentAssetResult = applyParentAssets(month1AfterIncome.kizAfterParentIncomeBeforeAssets, months2AfterIncome.kizAfterParentIncomeBeforeAssets, assessment.countableAssets.parents);
    if (parentAssetResult.status !== "SUPPORTED") return { ...base, assetAssessment: assessment, countableAssetsForKizReduction, coverageAssetAssessment, openChecks: parentAssetResult.openChecks };
    const distinctRecipients = new Set(childAssetResults.filter((child) => child.month1KiZ > 0 || child.months2To6KiZ > 0).map((child) => child.recipientPersonRole).filter(Boolean));
    const assetReductionPositive = assessment.countableAssets.householdTotal > 0;
    const patchworkOpen = assetReductionPositive && distinctRecipients.size > 1;
    return {
      ...base,
      assetAssessment: assessment,
      month1: { ...month1, appliedParentAssetReduction: parentAssetResult.appliedParentAssetReduction, kizAfterAssets: parentAssetResult.month1KiZ },
      months2To6: parentAssetResult.rejectedDueToAssets ? null : { childResults: childAssetResults, childKiZBeforeParentIncome: months2To6ChildKiZ, parentIncomeReductionBeforeCap: months2AfterIncome.reductions.parentIncomeReductionBeforeCap, appliedParentIncomeReduction: months2AfterIncome.reductions.appliedParentIncomeReduction, kizAfterParentIncome: months2AfterIncome.kizAfterParentIncomeBeforeAssets, appliedParentAssetReduction: 0, kizAfterAssets: parentAssetResult.months2To6KiZ },
      months2To6Count: parentAssetResult.rejectedDueToAssets ? null : 5,
      rejectedDueToAssets: parentAssetResult.rejectedDueToAssets,
      futurePeriodStatus: parentAssetResult.futurePeriodStatus,
      reapplicationPossibleFromFollowingMonth: parentAssetResult.reapplicationPossibleFromFollowingMonth,
      countableAssetsForKizReduction,
      coverageAssetAssessment,
      status: patchworkOpen ? "SUPPORTED_WITH_OPEN_CHECKS" : "SUPPORTED",
      warnings: assessment.warnings,
      openChecks: patchworkOpen ? ["ASSET_PATCHWORK_ALLOCATION_OPEN"] : [],
    };
  }

  function evaluateCoverageChildBenefit(membership) {
    const childNeed = membership?.childNeed?.childTotalNeed;
    const ownIncome = membership?.bgIncome?.countableChildIncomeAverage;
    const childBenefit = membership?.bgIncome?.childBenefitForSgbIIMembership;
    const base = { ruleId: RULE_IDS.coverageChildBenefit, childId: membership?.childId || "", isSgbIIBgMember: membership?.isSgbIIBgMember ?? null, totalChildNeed: childNeed ?? null, countableChildIncomeAverage: ownIncome ?? null, childBenefitCountedInThisHousehold: childBenefit ?? null, remainingNeedAfterOwnSgbIIIncome: null, childBenefitForChildCoverageNeed: null, coverageChildBenefitSurplus: null, status: "UNRESOLVED", openChecks: [] };
    if (membership?.status !== "SUPPORTED" || ![childNeed, ownIncome, childBenefit].every((value) => Number.isFinite(value) && value >= 0)) return { ...base, openChecks: ["COVERAGE_CHILD_BENEFIT_INPUT_REQUIRED"] };
    const remainingNeedAfterOwnSgbIIIncome = stabilizeArithmeticPrecision(Math.max(0, childNeed - ownIncome));
    const childBenefitForChildCoverageNeed = stabilizeArithmeticPrecision(Math.min(childBenefit, remainingNeedAfterOwnSgbIIIncome));
    const coverageChildBenefitSurplus = stabilizeArithmeticPrecision(Math.max(0, childBenefit - remainingNeedAfterOwnSgbIIIncome));
    return { ...base, remainingNeedAfterOwnSgbIIIncome, childBenefitForChildCoverageNeed, coverageChildBenefitSurplus, status: "SUPPORTED" };
  }

  function calculateCoverageAmounts(need, adultCoverageIncome, childCoverageIncome, coverageKiZ, housingBenefitAmount = 0) {
    if (![need, adultCoverageIncome, childCoverageIncome, coverageKiZ, housingBenefitAmount].every((value) => Number.isFinite(value) && value >= 0)) return null;
    const resourcesWithoutWohngeld = stabilizeArithmeticPrecision(adultCoverageIncome + childCoverageIncome + coverageKiZ);
    const gapBeforeWohngeld = stabilizeArithmeticPrecision(Math.max(0, need - resourcesWithoutWohngeld));
    const resourcesWithWohngeld = stabilizeArithmeticPrecision(resourcesWithoutWohngeld + housingBenefitAmount);
    return {
      resourcesWithoutWohngeld,
      gapBeforeWohngeld,
      resourcesWithWohngeld,
      gapAfterWohngeld: stabilizeArithmeticPrecision(Math.max(0, need - resourcesWithWohngeld)),
      surplusAfterWohngeld: stabilizeArithmeticPrecision(Math.max(0, resourcesWithWohngeld - need)),
    };
  }

  function evaluateCoverage(state, householdId) {
    const base = {
      ruleId: RULE_IDS.coverage, householdId,
      familyNeed: { familySgbIINeed: null },
      income: { adultRegularIncome: null, coverageChildBenefitSurplusForParents: null, adultCoverageIncome: null, childIncome: null, childBenefitForChildren: null, childCoverageIncome: null, totalIncomeBeforeKiZ: null, childResults: [] },
      kiz: { month1KiZAfterIncomeAndAssets: null },
      assets: { status: "UNRESOLVED", countableCoverageAssets: null },
      housingBenefit: { status: null, basis: null, amount: null, automaticCalculation: { requested: false, foundationStatus: null, amountStatus: null, benefitType: null, calculatedAmount: null, ruleVersion: null, openChecks: [] } },
      coverage: { resourcesWithoutWohngeld: null, gapBeforeWohngeld: null, resourcesWithWohngeld: null, gapAfterWohngeld: null, surplusAfterWohngeld: null },
      normalAccess: { met: null },
      extendedAccess: { needed: null, gapWithin100: null, averageParentEarnedActivityDeductions: null, earnedDeductionConditionMet: null, sgbBenefitConditionMet: null, met: null, decision: null },
      coverageDecision: "UNRESOLVED", reliability: "UNRESOLVED", status: "UNRESOLVED", warnings: [], openChecks: [],
      remainingSteps: ["AUTOMATIC_HOUSING_BENEFIT_NOT_EVALUATED", "SGBII_COVERAGE_ASSET_ENGINE_NOT_EVALUATED", "FINAL_ROUNDING_NOT_APPLIED", "FINAL_ENTITLEMENT_NOT_DETERMINED"],
      usedRuleIds: [RULE_IDS.coverage, RULE_IDS.coverageIncome, RULE_IDS.coverageChildBenefit, RULE_IDS.extendedAccess, RULE_IDS.familySgbIINeed, RULE_IDS.adultIncome, RULE_IDS.assetIntegration],
      sourceIds: ["SRC-BKGG-6A", "SRC-SGBII-7", "SRC-SGBII-11-11B", "SRC-SGBII-26", "SRC-DA-KIZ-2026-02-20"],
    };
    if (!["A", "B"].includes(householdId) || !state?.households?.[householdId]) return { ...base, openChecks: ["COVERAGE_HOUSEHOLD_REQUIRED"] };
    const household = state.households[householdId];
    const coverageKvPvSubsidyIndicated = [
      ...asArray(household.applicantIncomeSources),
      ...(household.adults === "couple" ? asArray(household.partnerIncomeSources) : []),
    ].some((source) => {
      if (source?.incomeType === "sick-pay" && (Object.prototype.hasOwnProperty.call(source, "netAmount") || ["net", "notice"].includes(source?.amountType))) return false;
      return ["healthInsurance", "careInsurance"].some((key) => source?.deductions?.[key]?.enabled === true && source.deductions[key].mandatoryStatus !== "yes");
    });
    const d7 = evaluateAssetIntegration(state, householdId);
    if (asArray(d7.openChecks).includes("PARENT_NEED_AFTER_CHILD_ASSET_REJECTION_OPEN")) return { ...base, openChecks: ["PARENT_NEED_AFTER_CHILD_ASSET_REJECTION_OPEN"] };
    if (d7.rejectedDueToAssets === true && d7.futurePeriodStatus === "NEW_APPLICATION_REQUIRED") return { ...base, status: "NOT_APPLICABLE_DUE_TO_PRIOR_ASSET_REJECTION", coverageDecision: null, openChecks: [], remainingSteps: ["NEW_APPLICATION_REQUIRED"] };
    if (coverageKvPvSubsidyIndicated) return { ...base, openChecks: ["COVERAGE_KV_PV_SUBSIDY_CHECK_REQUIRED"] };
    if (d7.status !== "SUPPORTED" && d7.status !== "SUPPORTED_WITH_OPEN_CHECKS") {
      const d7OpenChecks = asArray(d7.openChecks);
      const coverageInsuranceOpen = d7OpenChecks.includes("INSURANCE_SYSTEM_AND_PERIOD_NOT_CAPTURED") ? ["COVERAGE_KV_PV_SUBSIDY_CHECK_REQUIRED"] : [];
      return { ...base, openChecks: [...new Set([...d7OpenChecks, ...coverageInsuranceOpen, "COVERAGE_D7_MONTH1_REQUIRED"])] };
    }
    if (!Number.isFinite(d7?.month1?.kizAfterAssets)) return { ...base, openChecks: ["COVERAGE_D7_MONTH1_REQUIRED"] };

    const familyNeedResult = evaluateFamilySgbIINeed(state, householdId);
    if (familyNeedResult.status !== "SUPPORTED" || !Number.isFinite(familyNeedResult.familySgbIINeed)) return { ...base, openChecks: [...new Set([...asArray(familyNeedResult.openChecks), "COVERAGE_FAMILY_NEED_REQUIRED"])] };
    const adultIncomeResult = evaluateAdultIncomeForHousehold(state, householdId);
    const regularAdultCoverageIncome = adultIncomeResult?.regularIncome?.averageTotal;
    if (!Number.isFinite(regularAdultCoverageIncome)) {
      const adultOpenChecks = asArray(adultIncomeResult?.openChecks);
      const coverageInsuranceOpen = adultOpenChecks.includes("INSURANCE_SYSTEM_AND_PERIOD_NOT_CAPTURED") ? ["COVERAGE_KV_PV_SUBSIDY_CHECK_REQUIRED"] : [];
      return { ...base, familyNeed: { familySgbIINeed: familyNeedResult.familySgbIINeed }, openChecks: [...new Set([...adultOpenChecks, ...coverageInsuranceOpen, "COVERAGE_REGULAR_ADULT_INCOME_REQUIRED"])] };
    }

    const childResults = asArray(familyNeedResult.childMemberships).map(evaluateCoverageChildBenefit);
    if (childResults.some((result) => result.status !== "SUPPORTED")) return { ...base, familyNeed: { familySgbIINeed: familyNeedResult.familySgbIINeed }, openChecks: [...new Set(childResults.flatMap((result) => result.openChecks))] };
    const memberChildren = childResults.filter((result) => result.isSgbIIBgMember === true);
    const childIncome = stabilizeArithmeticPrecision(memberChildren.reduce((sum, child) => sum + child.countableChildIncomeAverage, 0));
    const childBenefitForChildren = stabilizeArithmeticPrecision(memberChildren.reduce((sum, child) => sum + child.childBenefitForChildCoverageNeed, 0));
    const coverageChildBenefitSurplusForParents = stabilizeArithmeticPrecision(childResults.reduce((sum, child) => sum + child.coverageChildBenefitSurplus, 0));
    const adultCoverageIncome = stabilizeArithmeticPrecision(regularAdultCoverageIncome + coverageChildBenefitSurplusForParents);
    const childCoverageIncome = stabilizeArithmeticPrecision(childIncome + childBenefitForChildren);
    const coverageKiZ = d7.month1.kizAfterAssets;
    const hasKizNonSgbChild = asArray(familyNeedResult.childMemberships).some((membership) => membership.isKizBgMember === true && membership.isSgbIIBgMember === false);
    if (coverageKiZ > 0 && hasKizNonSgbChild) return { ...base, familyNeed: { familySgbIINeed: familyNeedResult.familySgbIINeed }, income: { ...base.income, adultRegularIncome: regularAdultCoverageIncome, coverageChildBenefitSurplusForParents, adultCoverageIncome, childIncome, childBenefitForChildren, childCoverageIncome, totalIncomeBeforeKiZ: stabilizeArithmeticPrecision(adultCoverageIncome + childCoverageIncome), childResults }, kiz: { month1KiZAfterIncomeAndAssets: coverageKiZ }, openChecks: ["COVERAGE_KIZ_CHILD_ALLOCATION_OPEN"] };

    const hbStatus = household.housingBenefitStatus ?? "unknown";
    const calculationMode = household?.wohngeldData?.calculationMode ?? "not-requested";
    const automaticRequested = calculationMode === "automatic";
    let automaticResult = null;
    let automaticCalculation = { requested: automaticRequested, foundationStatus: null, amountStatus: null, benefitType: null, calculatedAmount: null, ruleVersion: null, openChecks: [] };
    let housingBenefitAmount = null;
    let housingBenefitBasis = null;
    let reliability = "SUPPORTED";
    if (hbStatus === "approved" || hbStatus === "estimated") {
      housingBenefitAmount = parseNonNegativeAmount(household.housingBenefit);
      if (!Number.isFinite(housingBenefitAmount)) return { ...base, openChecks: ["HOUSING_BENEFIT_AMOUNT_REQUIRED"] };
      housingBenefitBasis = hbStatus === "approved" ? "APPROVED" : "EXTERNAL_ESTIMATE";
      if (hbStatus === "estimated") reliability = "PROVISIONAL_EXTERNAL_WOHNGELD";
    } else if (hbStatus === "none") {
      housingBenefitAmount = 0; housingBenefitBasis = "CONFIRMED_ZERO";
    }
    const beforeHousing = calculateCoverageAmounts(familyNeedResult.familySgbIINeed, adultCoverageIncome, childCoverageIncome, coverageKiZ, 0);
    const coverageAssetStatus = household.coverageAssetStatus ?? "unknown";
    const coverageContext = {
      familyNeed: { familySgbIINeed: familyNeedResult.familySgbIINeed },
      income: { adultRegularIncome: regularAdultCoverageIncome, coverageChildBenefitSurplusForParents, adultCoverageIncome, childIncome, childBenefitForChildren, childCoverageIncome, totalIncomeBeforeKiZ: stabilizeArithmeticPrecision(adultCoverageIncome + childCoverageIncome), childResults },
      kiz: { month1KiZAfterIncomeAndAssets: coverageKiZ },
    };
    const mayNeedFictive = ["unknown", "not-received"].includes(hbStatus);
    if (mayNeedFictive && beforeHousing.gapBeforeWohngeld === 0) { housingBenefitAmount = 0; housingBenefitBasis = "NOT_NEEDED"; }
    if (mayNeedFictive && beforeHousing.gapBeforeWohngeld > 0 && coverageAssetStatus !== "confirmed-none") return { ...base, ...coverageContext, assets: { status: coverageAssetStatus.toUpperCase(), countableCoverageAssets: null }, coverage: beforeHousing, housingBenefit: { status: hbStatus, basis: null, amount: null, automaticCalculation }, openChecks: ["SGBII_COVERAGE_ASSET_AMOUNT_NOT_EVALUATED"] };
    if (mayNeedFictive && beforeHousing.gapBeforeWohngeld > 0 && automaticRequested) {
      if (!wohngeldCalculator?.evaluateWohngeld) return { ...base, ...coverageContext, coverage: beforeHousing, housingBenefit: { status: hbStatus, basis: null, amount: null, automaticCalculation }, openChecks: ["WG_AUTOMATIC_CALCULATOR_UNAVAILABLE"] };
      automaticResult = wohngeldCalculator.evaluateWohngeld(household, asArray(state.centralChildren), { householdId, applicationMonth: state.applicationMonth, applicationYear: state.applicationYear });
      const foundationOpenChecks = asArray(automaticResult?.foundation?.openChecks);
      const amountOpenChecks = asArray(automaticResult?.amount?.openChecks);
      automaticCalculation = {
        requested: true,
        foundationStatus: automaticResult?.foundation?.status ?? null,
        amountStatus: automaticResult?.amount?.amountStatus ?? null,
        benefitType: automaticResult?.amount?.benefitType ?? null,
        calculatedAmount: automaticResult?.amount?.payableWohngeldAmount ?? null,
        ruleVersion: automaticResult?.amount?.ruleVersion ?? null,
        openChecks: [...new Set([...foundationOpenChecks, ...amountOpenChecks])],
      };
      const remainingStepsAfterAutomaticCalculation = base.remainingSteps.filter((step) => step !== "AUTOMATIC_HOUSING_BENEFIT_NOT_EVALUATED");
      if (automaticResult?.foundation?.status !== "SUPPORTED" || automaticResult?.amount?.status !== "SUPPORTED" || !Number.isFinite(automaticResult?.amount?.payableWohngeldAmount)) {
        const concreteOpenChecks = automaticCalculation.openChecks;
        return { ...base, ...coverageContext, coverage: beforeHousing, housingBenefit: { status: hbStatus, basis: null, amount: null, automaticCalculation }, remainingSteps: remainingStepsAfterAutomaticCalculation, openChecks: concreteOpenChecks.length ? concreteOpenChecks : ["WG_AUTOMATIC_AMOUNT_UNRESOLVED"] };
      }
      const automaticAmount = automaticResult.amount.payableWohngeldAmount;
      reliability = "CALCULATED_FICTIVE_WOHNGELD";
      if (automaticAmount > 0) {
        const section20Status = household?.wohngeldData?.section20Status ?? "unknown";
        const significantAssetsStatus = household?.wohngeldData?.significantAssetsStatus ?? "unknown";
        const eligibilityChecks = [];
        if (!["not-excluded", "excluded", "unknown"].includes(section20Status)) eligibilityChecks.push("WG_SECTION_20_STATUS_INVALID");
        if (!["not-excluded", "excluded", "unknown"].includes(significantAssetsStatus)) eligibilityChecks.push("WG_SIGNIFICANT_ASSETS_STATUS_INVALID");
        if (eligibilityChecks.length) {
          automaticCalculation.openChecks = [...new Set([...automaticCalculation.openChecks, ...eligibilityChecks])];
          return { ...base, ...coverageContext, coverage: beforeHousing, housingBenefit: { status: hbStatus, basis: null, amount: null, automaticCalculation }, remainingSteps: remainingStepsAfterAutomaticCalculation, openChecks: eligibilityChecks };
        }
        if (section20Status === "excluded" || significantAssetsStatus === "excluded") {
          housingBenefitAmount = 0;
          housingBenefitBasis = "AUTOMATIC_FICTIVE";
        } else {
          if (section20Status === "unknown") eligibilityChecks.push("WG_SECTION_20_STATUS_REQUIRED_FOR_FICTIVE_AMOUNT");
          if (significantAssetsStatus === "unknown") eligibilityChecks.push("WG_SIGNIFICANT_ASSETS_STATUS_REQUIRED_FOR_FICTIVE_AMOUNT");
          if (eligibilityChecks.length) {
            automaticCalculation.openChecks = [...new Set([...automaticCalculation.openChecks, ...eligibilityChecks])];
            return { ...base, ...coverageContext, coverage: beforeHousing, housingBenefit: { status: hbStatus, basis: null, amount: null, automaticCalculation }, remainingSteps: remainingStepsAfterAutomaticCalculation, openChecks: eligibilityChecks };
          }
          housingBenefitAmount = automaticAmount;
          housingBenefitBasis = "AUTOMATIC_FICTIVE";
        }
      } else {
        housingBenefitAmount = 0;
        housingBenefitBasis = "AUTOMATIC_FICTIVE";
      }
    }
    if (mayNeedFictive && beforeHousing.gapBeforeWohngeld > 0 && !automaticRequested) return { ...base, ...coverageContext, coverage: beforeHousing, housingBenefit: { status: hbStatus, basis: null, amount: null, automaticCalculation }, openChecks: ["FICTIVE_HOUSING_BENEFIT_REQUIRED"] };
    if (!Number.isFinite(housingBenefitAmount)) return { ...base, openChecks: ["HOUSING_BENEFIT_STATUS_INVALID"] };
    const coverage = calculateCoverageAmounts(familyNeedResult.familySgbIINeed, adultCoverageIncome, childCoverageIncome, coverageKiZ, housingBenefitAmount);
    if (coverage.gapAfterWohngeld > 0 && coverageAssetStatus !== "confirmed-none") return { ...base, ...coverageContext, housingBenefit: { status: hbStatus, basis: housingBenefitBasis, amount: housingBenefitAmount, automaticCalculation }, coverage, assets: { status: coverageAssetStatus.toUpperCase(), countableCoverageAssets: null }, openChecks: ["SGBII_COVERAGE_ASSET_AMOUNT_NOT_EVALUATED"] };

    const common = {
      ...base, familyNeed: { familySgbIINeed: familyNeedResult.familySgbIINeed },
      income: { adultRegularIncome: regularAdultCoverageIncome, coverageChildBenefitSurplusForParents, adultCoverageIncome, childIncome, childBenefitForChildren, childCoverageIncome, totalIncomeBeforeKiZ: stabilizeArithmeticPrecision(adultCoverageIncome + childCoverageIncome), childResults },
      kiz: { month1KiZAfterIncomeAndAssets: coverageKiZ }, assets: { status: coverageAssetStatus === "confirmed-none" ? "CONFIRMED_NONE" : coverageAssetStatus.toUpperCase(), countableCoverageAssets: coverageAssetStatus === "confirmed-none" ? 0 : null },
      housingBenefit: { status: hbStatus, basis: housingBenefitBasis, amount: housingBenefitAmount, automaticCalculation }, coverage, reliability,
      normalAccess: { met: coverage.gapAfterWohngeld === 0 },
      usedRuleIds: automaticResult ? [...new Set([...base.usedRuleIds, automaticResult.amount.ruleId])] : base.usedRuleIds,
      remainingSteps: automaticResult ? base.remainingSteps.filter((step) => step !== "AUTOMATIC_HOUSING_BENEFIT_NOT_EVALUATED") : base.remainingSteps,
    };
    if (coverage.gapAfterWohngeld === 0) return { ...common, normalAccess: { met: true }, extendedAccess: { ...base.extendedAccess, needed: false }, coverageDecision: "NORMAL_ACCESS_COVERAGE_MET", status: "SUPPORTED" };

    const nonBgOwnIncomeExcess = childResults.some((child) => child.isSgbIIBgMember === false && child.countableChildIncomeAverage > child.totalChildNeed);
    if (nonBgOwnIncomeExcess) return { ...common, openChecks: ["HOUSEHOLD_COMMUNITY_SUPPORT_NON_BG_CHILD_OPEN"] };
    const people = [adultIncomeResult.personResults.applicant, adultIncomeResult.personResults.partner].filter(Boolean);
    const extendedOpen = people.flatMap((person) => asArray(person?.extendedAccessEarnedDeductions?.openChecks));
    if (extendedOpen.length) return { ...common, openChecks: [...new Set(extendedOpen)] };
    const averageParentEarnedActivityDeductions = stabilizeArithmeticPrecision(people.reduce((sum, person) => sum + (person.extendedAccessEarnedDeductions?.monthlyAverage || 0), 0));
    const gapWithin100 = coverage.gapAfterWohngeld > 0 && coverage.gapAfterWohngeld <= 100;
    const earnedDeductionConditionMet = averageParentEarnedActivityDeductions >= 100;
    const benefitStatus = household.extendedAccessSgbBenefitStatus ?? "unknown";
    const extended = { needed: true, gapWithin100, averageParentEarnedActivityDeductions, earnedDeductionConditionMet, sgbBenefitConditionMet: benefitStatus === "none" ? true : benefitStatus === "received-or-applied" ? false : null, met: null, decision: null };
    if (!gapWithin100 || !earnedDeductionConditionMet || benefitStatus === "received-or-applied") return { ...common, extendedAccess: { ...extended, met: false, decision: "EXTENDED_ACCESS_NOT_MET" }, coverageDecision: "COVERAGE_NOT_MET", status: "SUPPORTED" };
    if (benefitStatus === "unknown") return { ...common, extendedAccess: extended, openChecks: ["EXTENDED_ACCESS_SGB_BENEFIT_STATUS_REQUIRED"] };
    return { ...common, extendedAccess: { ...extended, met: true, decision: "EXTENDED_ACCESS_COVERAGE_MET" }, coverageDecision: "EXTENDED_ACCESS_COVERAGE_MET", status: "SUPPORTED" };
  }

  function roundCents(value) {
    return Number.isFinite(value) ? Math.round((value + Number.EPSILON) * 100) / 100 : null;
  }

  function parentRuleNeedForHousehold(state, householdId) {
    const household = state?.households?.[householdId];
    const needs = Number(state?.applicationYear) === 2026 ? PARENT_RULE_NEEDS_2026[household?.adults] : null;
    if (!needs) return { status: "UNRESOLVED", positions: [], total: null };
    return {
      status: "SUPPORTED",
      positions: needs.map((amount, index) => ({ personRole: index === 0 ? "applicant" : "partner", amount })),
      total: needs.reduce((sum, value) => sum + value, 0),
    };
  }

  function singleParentPercentForChildren(children) {
    if (!children.length) return 0;
    const underSeven = children.filter((child) => child.age < 7).length;
    const underSixteen = children.filter((child) => child.age < 16).length;
    const flat = Math.min(children.length * 12, 60);
    const privileged = underSeven >= 1 || (underSixteen >= 2 && underSixteen <= 3) ? 36 : 0;
    return Math.max(flat, privileged);
  }

  function classifySingleParentChildren(state, householdId) {
    const all = [];
    const permanent = [];
    const warnings = [];
    const openChecks = [];
    asArray(state?.centralChildren).forEach((child) => {
      const classification = calculationRules?.evaluateChildNeedClassification
        ? calculationRules.evaluateChildNeedClassification(child, householdId, state)
        : null;
      if (!classification?.isRelevantForHousehold) return;
      const age = Number(child?.age);
      if (!Number.isInteger(age) || age < 0) {
        openChecks.push("PARENT_ADDITIONAL_NEED_CHILD_AGE_REQUIRED");
        warnings.push(warning("PARENT_ADDITIONAL_NEED_CHILD_AGE_REQUIRED", "Für den Alleinerziehendenmehrbedarf wird ein gültiges Kindesalter benötigt.", "age"));
        return;
      }
      if (age >= 18) return;
      if (classification.singleParentAdditionalNeedMode === "NONE") return;
      if (classification.singleParentAdditionalNeedMode === "FULL") {
        const entry = { childId: child.id, age, mode: "FULL" };
        all.push(entry);
        permanent.push(entry);
      } else if (classification.singleParentAdditionalNeedMode === "HALF") {
        all.push({ childId: child.id, age, mode: "HALF" });
      } else if (["wechselmodell-50-50", "wechselmodell-a-external", "wechselmodell-b-external"].includes(child?.careSituation)) {
        all.push({ childId: child.id, age, mode: "HALF" });
      } else {
        openChecks.push("SINGLE_PARENT_CHILD_CLASSIFICATION_UNRESOLVED");
      }
    });
    const hasShared = all.some((child) => child.mode === "HALF");
    const allPercent = singleParentPercentForChildren(all);
    const permanentPercent = singleParentPercentForChildren(permanent);
    return {
      status: openChecks.length ? "UNRESOLVED" : "SUPPORTED",
      all,
      permanent,
      percentage: hasShared ? (allPercent + permanentPercent) / 2 : allPercent,
      allPercent,
      permanentPercent,
      warnings,
      openChecks: [...new Set(openChecks)],
    };
  }

  function evaluateParentAdditionalNeeds(state, householdId) {
    const household = state?.households?.[householdId] || {};
    const rule = parentRuleNeedForHousehold(state, householdId);
    const warnings = [];
    const openChecks = [];
    const items = [];
    if (rule.status !== "SUPPORTED") {
      return { ruleId: RULE_IDS.parentAdditionalNeed, householdId, status: "UNRESOLVED", parentAdditionalNeedsTotal: null, items, warnings, openChecks: ["PARENT_RULE_NEED_REQUIRED"] };
    }
    const needsByRole = Object.fromEntries(rule.positions.map((position) => [position.personRole, position.amount]));
    if (household.adults === "single") {
      const childRule = classifySingleParentChildren(state, householdId);
      warnings.push(...childRule.warnings);
      openChecks.push(...childRule.openChecks);
      const override = isBlank(household.additionalNeedOverride) ? 0 : parseNonNegativeAmount(household.additionalNeedOverride);
      if (override === null) openChecks.push("SINGLE_PARENT_NEED_OVERRIDE_INVALID");
      const rawAmount = override > 0 ? roundCents(override) : roundCents(563 * childRule.percentage / 100);
      items.push({ type: "single-parent", personRole: "applicant", percentage: override > 0 ? null : childRule.percentage, rawAmount, capGroup: "PARAGRAPHS_2_TO_5", source: override > 0 ? "MANUAL_OVERRIDE" : "AUTOMATIC" });
    }

    const seenUnique = new Set();
    asArray(household.specialSituations).forEach((situation) => {
      const type = situation?.situationType;
      const role = situation?.personRole;
      const confirmation = situation?.confirmationStatus;
      if (!Object.hasOwn(needsByRole, role)) {
        openChecks.push("ADDITIONAL_NEED_PERSON_ROLE_INVALID");
        return;
      }
      if (!new Set(["yes", "no", "unknown"]).has(confirmation)) {
        openChecks.push("ADDITIONAL_NEED_CONFIRMATION_INVALID");
        return;
      }
      if (confirmation === "unknown") {
        openChecks.push("ADDITIONAL_NEED_CONFIRMATION_REQUIRED");
        return;
      }
      if (confirmation === "no") {
        items.push({ type, personRole: role, percentage: 0, rawAmount: 0, capGroup: null, recognizedAmount: 0 });
        return;
      }
      if (["pregnancy", "disability"].includes(type)) {
        const uniqueKey = `${role}:${type}`;
        if (seenUnique.has(uniqueKey)) {
          openChecks.push("ADDITIONAL_NEED_DUPLICATE_PERSON_TYPE");
          return;
        }
        seenUnique.add(uniqueKey);
        const percentage = type === "pregnancy" ? 17 : 35;
        items.push({ type, personRole: role, percentage, rawAmount: roundCents(needsByRole[role] * percentage / 100), capGroup: "PARAGRAPHS_2_TO_5" });
        return;
      }
      if (type === "nutrition") {
        const amount = parseNonNegativeAmount(situation.monthlyAmount);
        if (amount === null) openChecks.push("NUTRITION_CONFIRMED_AMOUNT_REQUIRED");
        else items.push({ type, personRole: role, percentage: null, rawAmount: roundCents(amount), capGroup: "PARAGRAPHS_2_TO_5" });
        return;
      }
      if (type === "unavoidable") {
        if (situation.recurringStatus === "unknown" || !new Set(["yes", "no"]).has(situation.recurringStatus)) {
          openChecks.push("UNAVOIDABLE_RECURRING_STATUS_REQUIRED");
          return;
        }
        if (situation.recurringStatus === "no") {
          items.push({ type, personRole: role, percentage: null, rawAmount: 0, capGroup: null, recognizedAmount: 0, reason: "ONE_TIME_EXCLUDED" });
          return;
        }
        const amount = parseNonNegativeAmount(situation.monthlyAmount);
        if (amount === null) openChecks.push("UNAVOIDABLE_CONFIRMED_AMOUNT_REQUIRED");
        else items.push({ type, personRole: role, percentage: null, rawAmount: roundCents(amount), capGroup: "OUTSIDE_CAP" });
        return;
      }
      openChecks.push("ADDITIONAL_NEED_TYPE_UNSUPPORTED");
    });

    if (household.hotWaterType === "central") {
      Object.keys(needsByRole).forEach((role) => items.push({ type: "decentral-hot-water", personRole: role, percentage: 0, rawAmount: 0, capGroup: "OUTSIDE_CAP", recognizedAmount: 0 }));
    } else if (household.hotWaterType === "decentral") {
      Object.entries(needsByRole).forEach(([role, need]) => {
        const affected = household?.decentralHotWaterAdults?.[role];
        if (affected === "yes") items.push({ type: "decentral-hot-water", personRole: role, percentage: 2.3, rawAmount: roundCents(need * 0.023), capGroup: "OUTSIDE_CAP" });
        else if (affected === "no") items.push({ type: "decentral-hot-water", personRole: role, percentage: 0, rawAmount: 0, capGroup: "OUTSIDE_CAP", recognizedAmount: 0 });
        else openChecks.push("DECENTRAL_HOT_WATER_PERSON_STATUS_REQUIRED");
      });
    } else {
      openChecks.push("HOT_WATER_TYPE_UNRESOLVED");
    }

    Object.keys(needsByRole).forEach((role) => {
      const capped = items.filter((item) => item.personRole === role && item.capGroup === "PARAGRAPHS_2_TO_5" && Number.isFinite(item.rawAmount));
      let remaining = needsByRole[role];
      capped.forEach((item) => {
        item.recognizedAmount = roundCents(Math.min(item.rawAmount, remaining));
        item.cappedAmount = roundCents(item.rawAmount - item.recognizedAmount);
        remaining = roundCents(remaining - item.recognizedAmount);
      });
      items.filter((item) => item.personRole === role && item.capGroup === "OUTSIDE_CAP" && item.recognizedAmount === undefined).forEach((item) => {
        item.recognizedAmount = item.rawAmount;
        item.cappedAmount = 0;
      });
    });
    const unresolved = openChecks.length > 0 || items.some((item) => !Number.isFinite(item.rawAmount));
    return {
      ruleId: RULE_IDS.parentAdditionalNeed,
      householdId,
      status: unresolved ? "UNRESOLVED" : "SUPPORTED",
      parentAdditionalNeedsTotal: unresolved ? null : roundCents(items.reduce((sum, item) => sum + (item.recognizedAmount || 0), 0)),
      items,
      warnings,
      openChecks: [...new Set(openChecks)],
      usedRuleIds: [RULE_IDS.parentAdditionalNeed],
      sourceIds: ["SRC-SGBII-21", "SRC-RBSFV-2026", "SRC-DA-KIZ-2026-02-20"],
    };
  }

  function annualizeOwnerAmount(value, frequency) {
    const amount = parseNonNegativeAmount(value);
    const factors = { monthly: 12, quarterly: 4, yearly: 1, "one-time": 1 };
    return amount === null || !Object.hasOwn(factors, frequency) ? null : roundCents(amount * factors[frequency]);
  }

  function relevantResidentChildCount(state, householdId) {
    return asArray(state?.centralChildren).filter((child) => {
      const result = calculationRules?.evaluateChildRelevanceForHousehold?.(child, householdId);
      return result?.isRelevantForHousehold === true;
    }).length;
  }

  function evaluateHousingRecognition(state, householdId) {
    const household = state?.households?.[householdId] || {};
    const warnings = [];
    const openChecks = [];
    const positions = [];
    let actualCosts = null;
    let directReduction = 0;
    if (Number(state?.applicationYear) !== 2026) openChecks.push("HOUSING_LEGAL_PERIOD_UNSUPPORTED");
    if (household.housingType === "rent") {
      const rent = household?.housingCosts?.rent || {};
      const expectedMonth = `${state?.applicationYear}-${String(state?.applicationMonth).padStart(2, "0")}`;
      if (rent.costMonth !== expectedMonth) openChecks.push("RENT_FIRST_BENEFIT_MONTH_REQUIRED");
      const entries = [["coldRent", rent.coldRent], ["coldUtilities", rent.coldUtilities], ["heating", rent.heating]];
      entries.forEach(([type, value]) => {
        const amount = parseNonNegativeAmount(value);
        if (amount === null) openChecks.push(`RENT_${type.toUpperCase()}_REQUIRED`);
        else positions.push({ type, amount, recognized: true });
      });
      const parking = isBlank(rent.parkingAmount) ? 0 : parseNonNegativeAmount(rent.parkingAmount);
      if (parking === null) openChecks.push("PARKING_AMOUNT_INVALID");
      else if (parking > 0 && rent.parkingInseparableStatus === "unknown") openChecks.push("PARKING_INSEPARABLE_STATUS_REQUIRED");
      else positions.push({ type: "parking", amount: parking, recognized: rent.parkingInseparableStatus === "yes" });
      if (rent.sublettingStatus === "yes") {
        const amount = parseNonNegativeAmount(rent.sublettingAmount);
        if (amount === null) openChecks.push("SUBLETTING_AMOUNT_REQUIRED");
        else directReduction = amount;
      } else if (rent.sublettingStatus !== "no") openChecks.push("SUBLETTING_STATUS_REQUIRED");
      actualCosts = roundCents(positions.filter((item) => item.recognized).reduce((sum, item) => sum + item.amount, 0));
    } else if (household.housingType === "owner") {
      const owner = household?.housingCosts?.owner || {};
      if (owner.costPeriodStatus === "previous-calendar-year") {
        if (Number(owner.costYear) !== Number(state?.applicationYear) - 1) openChecks.push("OWNER_PREVIOUS_CALENDAR_YEAR_REQUIRED");
        const fields = ["debtInterest", "propertyTax", "buildingInsurance", "heating"];
        if (!isBlank(owner.otherCostsAmount) || !isBlank(owner.otherCostsDescription)) fields.push("otherCosts");
        fields.forEach((type) => {
          const amountField = type === "otherCosts" ? "otherCostsAmount" : type;
          const annual = annualizeOwnerAmount(owner[amountField], owner[`${type}Frequency`]);
          if (annual === null) openChecks.push(`OWNER_${type.toUpperCase()}_PERIOD_VALUE_REQUIRED`);
          else if (type === "otherCosts" && annual > 0 && isBlank(owner.otherCostsDescription)) openChecks.push("OWNER_OTHER_COST_DESCRIPTION_REQUIRED");
          else positions.push({ type, annualAmount: annual, recognized: true });
        });
        const annualTotal = roundCents(positions.reduce((sum, item) => sum + item.annualAmount, 0));
        actualCosts = roundCents(annualTotal / 12);
      } else if (owner.costPeriodStatus === "recent-months") {
        const values = asArray(owner.recentMonthlyValues);
        if (values.length > 12) openChecks.push("OWNER_RECENT_MONTHS_MAXIMUM_EXCEEDED");
        const nonBlank = values.slice(0, 12).filter((value) => !isBlank(value));
        const amounts = nonBlank.map(parseNonNegativeAmount);
        if (!amounts.length || amounts.some((value) => value === null)) openChecks.push("OWNER_RECENT_MONTH_VALUES_REQUIRED");
        else {
          amounts.forEach((amount, index) => positions.push({ type: "recent-month", index, amount, recognized: true }));
          actualCosts = roundCents(amounts.reduce((sum, amount) => sum + amount, 0) / amounts.length);
        }
      } else openChecks.push("OWNER_COST_PERIOD_REQUIRED");
    } else openChecks.push("HOUSING_TYPE_UNSUPPORTED");
    const otherResidents = Number(household.otherResidents);
    if (!Number.isInteger(otherResidents) || otherResidents < 0) openChecks.push("OTHER_RESIDENTS_REQUIRED");
    const adultCount = household.adults === "single" ? 1 : household.adults === "couple" ? 2 : 0;
    if (!adultCount) openChecks.push("HOUSEHOLD_ADULTS_UNSUPPORTED");
    const childResidents = relevantResidentChildCount(state, householdId);
    const bgCorePersons = adultCount + childResidents;
    const allCoreResidents = bgCorePersons + (Number.isInteger(otherResidents) && otherResidents >= 0 ? otherResidents : 0);
    const adjustedActualCosts = actualCosts === null ? null : roundCents(Math.max(0, actualCosts - directReduction));
    const recognizedHousingCosts = adjustedActualCosts === null || openChecks.length
      ? null
      : roundCents(adjustedActualCosts * bgCorePersons / allCoreResidents);
    return {
      ruleId: RULE_IDS.housingRecognition,
      householdId,
      status: openChecks.length ? "UNRESOLVED" : "SUPPORTED",
      positions,
      actualHousingCosts: actualCosts,
      directHousingCostReduction: roundCents(directReduction),
      adjustedActualCosts,
      bgCorePersons,
      otherResidents: Number.isInteger(otherResidents) ? otherResidents : null,
      allCoreResidents,
      recognizedHousingCosts,
      warnings,
      openChecks: [...new Set(openChecks)],
      usedRuleIds: [RULE_IDS.housingRecognition],
      sourceIds: ["SRC-DA-KIZ-2026-02-20"],
    };
  }

  function childRuleNeedForAge(child) {
    const age = Number(child?.age);
    if (!Number.isInteger(age) || age < 0 || age >= 25) return null;
    if (age <= 5) return { age, band: "AGE_0_TO_5", ...CHILD_RULE_NEEDS_2026.age0To5 };
    if (age <= 13) return { age, band: "AGE_6_TO_13", ...CHILD_RULE_NEEDS_2026.age6To13 };
    if (age <= 17) return { age, band: "AGE_14_TO_17", ...CHILD_RULE_NEEDS_2026.age14To17 };
    return { age, band: "AGE_18_TO_24_U25", ...CHILD_RULE_NEEDS_2026.age18To24U25 };
  }

  function familyHousingHeadShare(state, householdId, housingResult = evaluateHousingRecognition(state, householdId)) {
    const openChecks = [...asArray(housingResult?.openChecks)];
    if (housingResult?.status !== "SUPPORTED" || !Number.isFinite(housingResult?.adjustedActualCosts) || !Number.isInteger(housingResult?.allCoreResidents) || housingResult.allCoreResidents < 1) {
      openChecks.push("SGBII_HOUSING_HEAD_SHARE_REQUIRED");
    }
    const unresolved = openChecks.length > 0;
    return {
      ruleId: RULE_IDS.familySgbIINeed,
      householdId,
      status: unresolved ? "UNRESOLVED" : "SUPPORTED",
      adjustedActualCosts: housingResult?.adjustedActualCosts ?? null,
      denominatorHeads: housingResult?.allCoreResidents ?? null,
      housingHeadShare: unresolved ? null : roundCents(housingResult.adjustedActualCosts / housingResult.allCoreResidents),
      warnings: [...asArray(housingResult?.warnings)],
      openChecks: [...new Set(openChecks)],
      sourceIds: ["SRC-SGBII-22", "SRC-DA-KIZ-2026-02-20"],
    };
  }

  function evaluateChildSgbIINeed(state, householdId, child, housingHeadResult = familyHousingHeadShare(state, householdId)) {
    const childId = typeof child?.id === "string" ? child.id : "";
    const classification = calculationRules?.evaluateChildNeedClassification?.(child, householdId, state);
    const warnings = [];
    const openChecks = [];
    const base = {
      ruleId: RULE_IDS.childSgbIINeed,
      childId,
      householdId,
      status: "UNRESOLVED",
      ageBand: null,
      fullMonthlyRuleNeed: null,
      ruleNeedFull: null,
      regularNeedFactor: null,
      ruleNeedFactor: null,
      recognizedRuleNeed: null,
      fullMonthlyAdditionalNeed: null,
      additionalNeedFactor: null,
      recognizedAdditionalNeed: null,
      housingHeadShare: housingHeadResult?.housingHeadShare ?? null,
      recognizedHousingNeed: null,
      childTotalNeed: null,
      totalChildNeed: null,
      additionalNeedPositions: [],
      warnings,
      openChecks,
      usedRuleIds: [RULE_IDS.childSgbIINeed, RULE_IDS.familySgbIINeed],
      sourceIds: ["SRC-SGBII-20", "SRC-SGBII-21", "SRC-SGBII-22", "SRC-SGBII-23", "SRC-RBSFV-2026", "SRC-DA-KIZ-2026-02-20"],
    };
    if (!classification?.isRelevantForHousehold) return { ...base, status: "NOT_APPLICABLE" };
    if (Number(state?.applicationYear) !== 2026) openChecks.push("CHILD_NEED_LEGAL_PERIOD_UNSUPPORTED");
    const ageRule = childRuleNeedForAge(child);
    if (!ageRule) openChecks.push("CHILD_SGBII_RULE_NEED_AGE_UNSUPPORTED");
    const maritalStatus = child?.maritalPartnershipStatus ?? "unknown";
    if (maritalStatus === "yes") return { ...base, status: "NOT_APPLICABLE", openChecks: [] };
    if (maritalStatus !== "no") openChecks.push("CHILD_MARITAL_PARTNERSHIP_STATUS_REQUIRED");
    if (ageRule?.age >= 18) {
      if (child?.u25RuleStageStatus === "no") return { ...base, ageBand: ageRule.band, status: "NOT_APPLICABLE", openChecks: [] };
      if (child?.u25RuleStageStatus !== "yes") openChecks.push("CHILD_U25_RULE_STAGE_CONFIRMATION_REQUIRED");
    }
    if (!Number.isFinite(classification?.regularNeedFactor) || !Number.isFinite(classification?.childAdditionalNeedFactor) || classification?.housingNeedFactor !== 1) {
      openChecks.push("CHILD_NEED_CARE_FACTOR_REQUIRED");
    }
    if (housingHeadResult?.status !== "SUPPORTED" || !Number.isFinite(housingHeadResult?.housingHeadShare)) {
      openChecks.push("CHILD_HOUSING_HEAD_SHARE_REQUIRED");
    }

    let hotWaterAmount = null;
    if (ageRule) {
      const household = state?.households?.[householdId] || {};
      if (household.hotWaterType === "central") {
        hotWaterAmount = 0;
      } else {
        const hotWaterStatus = child?.decentralHotWaterStatus?.[householdId] ?? "unknown";
        if (hotWaterStatus === "yes") hotWaterAmount = roundCents(ageRule.amount * ageRule.hotWaterRate);
        else if (hotWaterStatus === "no") hotWaterAmount = 0;
        else openChecks.push("CHILD_DECENTRAL_HOT_WATER_STATUS_REQUIRED");
      }
    }
    let otherAdditionalAmount = null;
    const additionalStatus = child?.additionalNeedStatus ?? "unknown";
    if (additionalStatus === "no") otherAdditionalAmount = 0;
    else if (additionalStatus === "yes") {
      otherAdditionalAmount = parseNonNegativeAmount(child?.additionalNeedMonthlyAmount);
      if (otherAdditionalAmount === null) openChecks.push("CHILD_ADDITIONAL_NEED_AMOUNT_REQUIRED");
    } else openChecks.push("CHILD_ADDITIONAL_NEED_STATUS_REQUIRED");

    const unresolved = openChecks.length > 0 || !ageRule;
    if (unresolved) return { ...base, ageBand: ageRule?.band ?? null, fullMonthlyRuleNeed: ageRule?.amount ?? null, ruleNeedFull: ageRule?.amount ?? null, regularNeedFactor: classification?.regularNeedFactor ?? null, ruleNeedFactor: classification?.regularNeedFactor ?? null, additionalNeedFactor: classification?.childAdditionalNeedFactor ?? null, warnings, openChecks: [...new Set(openChecks)] };
    const fullAdditional = roundCents(hotWaterAmount + otherAdditionalAmount);
    const recognizedRuleNeed = roundCents(ageRule.amount * classification.regularNeedFactor);
    const recognizedAdditionalNeed = roundCents(fullAdditional * classification.childAdditionalNeedFactor);
    const recognizedHousingNeed = housingHeadResult.housingHeadShare;
    return {
      ...base,
      status: "SUPPORTED",
      ageBand: ageRule.band,
      fullMonthlyRuleNeed: ageRule.amount,
      ruleNeedFull: ageRule.amount,
      regularNeedFactor: classification.regularNeedFactor,
      ruleNeedFactor: classification.regularNeedFactor,
      recognizedRuleNeed,
      fullMonthlyAdditionalNeed: fullAdditional,
      additionalNeedFactor: classification.childAdditionalNeedFactor,
      recognizedAdditionalNeed,
      housingHeadShare: recognizedHousingNeed,
      recognizedHousingNeed,
      childTotalNeed: roundCents(recognizedRuleNeed + recognizedAdditionalNeed + recognizedHousingNeed),
      totalChildNeed: roundCents(recognizedRuleNeed + recognizedAdditionalNeed + recognizedHousingNeed),
      additionalNeeds: { full: fullAdditional, factor: classification.childAdditionalNeedFactor, recognized: recognizedAdditionalNeed },
      additionalNeedPositions: [
        { type: "decentral-hot-water", fullMonthlyAmount: hotWaterAmount, recognizedAmount: roundCents(hotWaterAmount * classification.childAdditionalNeedFactor) },
        { type: "other-confirmed-recurring", fullMonthlyAmount: otherAdditionalAmount, recognizedAmount: roundCents(otherAdditionalAmount * classification.childAdditionalNeedFactor) },
      ],
      openChecks: [],
    };
  }

  function evaluateChildBgIncome(state, householdId, child, childNeed = evaluateChildSgbIINeed(state, householdId, child)) {
    const childId = typeof child?.id === "string" ? child.id : "";
    const maximum = evaluateMaximumKizForChild(child, householdId, state?.applicationMonth, state?.applicationYear);
    const income = evaluateChildIncome(child, { applicationMonth: state?.applicationMonth, applicationYear: state?.applicationYear, householdId });
    const reduction = evaluateChildIncomeReduction(maximum, income);
    const warnings = [...asArray(income?.warnings)];
    const openChecks = [];
    const base = {
      ruleId: RULE_IDS.childBgIncome,
      childId,
      householdId,
      status: "UNRESOLVED",
      countableChildIncomeAverage: Number.isFinite(income?.countableChildIncomeAverage) ? income.countableChildIncomeAverage : null,
      childIncomeReductionForKiZ: Number.isFinite(reduction?.childIncomeReduction) ? reduction.childIncomeReduction : null,
      childBenefitForKiZMembership: null,
      incomeForKiZMembership: null,
      kizMembershipStatus: null,
      isKizBgMember: null,
      childBenefitForSgbIIMembership: null,
      incomeForSgbIIMembership: null,
      sgbIIMembershipStatus: null,
      isSgbIIBgMember: null,
      warnings,
      openChecks,
      usedRuleIds: [RULE_IDS.childBgIncome, RULE_IDS.childSgbIINeed, RULE_IDS.childIncome, CHILD_INCOME_REDUCTION.ruleId],
      sourceIds: ["SRC-BKGG-6A", "SRC-SGBII-7", "SRC-SGBII-11", "SRC-DA-KIZ-2026-02-20"],
    };
    if (childNeed?.status === "NOT_APPLICABLE") return { ...base, status: "NOT_APPLICABLE", kizMembershipStatus: "NOT_APPLICABLE", sgbIIMembershipStatus: "NOT_APPLICABLE", isKizBgMember: false, isSgbIIBgMember: false };
    if (childNeed?.status !== "SUPPORTED" || !Number.isFinite(childNeed.childTotalNeed)) openChecks.push("CHILD_TOTAL_NEED_REQUIRED");
    if (income?.status !== "SUPPORTED" || !Number.isFinite(income?.countableChildIncomeAverage)) openChecks.push("CHILD_COUNTABLE_INCOME_REQUIRED");

    const isPotentialOwnKizChild = maximum?.isPotentialOwnKizChild === true;
    let childBenefitForKiZMembership = null;
    let incomeForKiZMembership = null;
    let isKizBgMember = false;
    if (isPotentialOwnKizChild) {
      childBenefitForKiZMembership = CHILD_BENEFIT_2026;
      if (reduction?.status !== "SUPPORTED" || !Number.isFinite(reduction.childIncomeReduction)) openChecks.push("CHILD_KIZ_INCOME_REDUCTION_REQUIRED");
      else {
        incomeForKiZMembership = roundCents(reduction.childIncomeReduction + childBenefitForKiZMembership);
        if (Number.isFinite(childNeed?.childTotalNeed)) isKizBgMember = incomeForKiZMembership < childNeed.childTotalNeed;
      }
    }

    let childBenefitForSgbIIMembership = null;
    if (child?.childBenefitAt === householdId) childBenefitForSgbIIMembership = child?.halfForwarded === true && Boolean(child?.careSituation?.startsWith("wechselmodell")) ? CHILD_BENEFIT_2026 / 2 : CHILD_BENEFIT_2026;
    else if (["A", "B", "external"].includes(child?.childBenefitAt)) childBenefitForSgbIIMembership = 0;
    else openChecks.push("CHILD_BENEFIT_LOCATION_REQUIRED_FOR_SGBII");
    const incomeForSgbIIMembership = Number.isFinite(income?.countableChildIncomeAverage) && Number.isFinite(childBenefitForSgbIIMembership)
      ? roundCents(income.countableChildIncomeAverage + childBenefitForSgbIIMembership)
      : null;
    const isSgbIIBgMember = Number.isFinite(incomeForSgbIIMembership) && Number.isFinite(childNeed?.childTotalNeed)
      ? incomeForSgbIIMembership < childNeed.childTotalNeed
      : null;
    const unresolved = openChecks.length > 0;
    return {
      ...base,
      status: unresolved ? "UNRESOLVED" : "SUPPORTED",
      childBenefitForKiZMembership,
      incomeForKiZMembership,
      kizMembershipStatus: isPotentialOwnKizChild ? (unresolved ? "UNRESOLVED" : "SUPPORTED") : "NOT_APPLICABLE",
      isKizBgMember: isPotentialOwnKizChild ? (unresolved ? null : isKizBgMember) : false,
      childBenefitForSgbIIMembership,
      incomeForSgbIIMembership,
      sgbIIMembershipStatus: unresolved ? "UNRESOLVED" : "SUPPORTED",
      isSgbIIBgMember: unresolved ? null : isSgbIIBgMember,
      openChecks: [...new Set(openChecks)],
    };
  }

  function evaluateChildMemberships(state, householdId, child, housingHeadResult = familyHousingHeadShare(state, householdId)) {
    const childNeed = evaluateChildSgbIINeed(state, householdId, child, housingHeadResult);
    const bgIncome = evaluateChildBgIncome(state, householdId, child, childNeed);
    return {
      ruleId: RULE_IDS.childSgbIIMembership,
      childId: child?.id || "",
      householdId,
      status: bgIncome.status,
      childNeed,
      bgIncome,
      isKizBgMember: bgIncome.isKizBgMember,
      isSgbIIBgMember: bgIncome.isSgbIIBgMember,
      warnings: [...childNeed.warnings, ...bgIncome.warnings],
      openChecks: [...new Set([...childNeed.openChecks, ...bgIncome.openChecks])],
      usedRuleIds: [RULE_IDS.childSgbIIMembership, RULE_IDS.childBgIncome, RULE_IDS.childSgbIINeed],
    };
  }

  function evaluateParentHousingShare(state, householdId, housingResult = evaluateHousingRecognition(state, householdId)) {
    const household = state?.households?.[householdId] || {};
    const warnings = [...asArray(housingResult?.warnings)];
    const openChecks = [...asArray(housingResult?.openChecks)];
    const maximum = evaluateMaximumKizForHousehold(state, householdId);
    const potentialIds = new Set(maximum.childResults.filter((result) => result.isPotentialOwnKizChild).map((result) => result.childId));
    const housingHeadResult = familyHousingHeadShare(state, householdId, housingResult);
    const memberships = asArray(state?.centralChildren)
      .filter((child) => potentialIds.has(child?.id))
      .map((child) => evaluateChildMemberships(state, householdId, child, housingHeadResult));
    if (memberships.some((result) => result.status !== "SUPPORTED")) openChecks.push("PARENT_HOUSING_CHILD_COUNT_UNRESOLVED");
    const childCount = memberships.filter((result) => result.isKizBgMember === true).length;
    const incomeExcludedChildrenCount = memberships.filter((result) => result.status === "SUPPORTED" && result.isKizBgMember === false).length;
    const table = PARENT_HOUSING_PERCENTAGES[household.adults];
    if (!table) openChecks.push("PARENT_HOUSING_HOUSEHOLD_TYPE_UNSUPPORTED");
    if (childCount === 0 && !openChecks.includes("PARENT_HOUSING_CHILD_COUNT_UNRESOLVED")) {
      return { ruleId: RULE_IDS.parentHousingShare, householdId, status: "NOT_APPLICABLE", ownKizChildrenCount: 0, relevantKiZChildCount: 0, incomeExcludedChildrenCount, percentage: null, recognizedHousingCosts: housingResult?.recognizedHousingCosts ?? null, parentHousingShareForKiZ: null, childMemberships: memberships, warnings, openChecks: [...new Set(openChecks)], usedRuleIds: [RULE_IDS.maximumKiz, RULE_IDS.parentHousingShare] };
    }
    if (childCount > 10) openChecks.push("PARENT_HOUSING_MORE_THAN_TEN_CHILDREN");
    if (housingResult?.status !== "SUPPORTED") openChecks.push("RECOGNIZED_HOUSING_COSTS_REQUIRED");
    const percentage = table && childCount >= 1 && childCount <= 10 ? table[childCount - 1] : null;
    const unresolved = openChecks.length > 0 || percentage === null;
    const kizBgCorePersons = Number.isInteger(housingResult?.bgCorePersons) ? housingResult.bgCorePersons - incomeExcludedChildrenCount : null;
    const recognizedHousingCostsForKiZ = !unresolved && Number.isFinite(housingResult?.adjustedActualCosts) && Number.isInteger(housingResult?.allCoreResidents) && housingResult.allCoreResidents > 0
      ? roundCents(housingResult.adjustedActualCosts * kizBgCorePersons / housingResult.allCoreResidents)
      : null;
    return {
      ruleId: RULE_IDS.parentHousingShare,
      householdId,
      status: unresolved ? "UNRESOLVED" : "SUPPORTED",
      ownKizChildrenCount: childCount,
      relevantKiZChildCount: childCount,
      incomeExcludedChildrenCount,
      percentage,
      recognizedHousingCosts: recognizedHousingCostsForKiZ,
      parentHousingShareForKiZ: unresolved ? null : roundCents(recognizedHousingCostsForKiZ * percentage / 100),
      childMemberships: memberships,
      warnings,
      openChecks: [...new Set(openChecks)],
      usedRuleIds: [RULE_IDS.maximumKiz, RULE_IDS.housingRecognition, RULE_IDS.parentHousingShare],
      sourceIds: ["SRC-DA-KIZ-2026-02-20"],
    };
  }

  function evaluateParentNeedForHousehold(state, householdId) {
    const ruleNeed = parentRuleNeedForHousehold(state, householdId);
    const additional = evaluateParentAdditionalNeeds(state, householdId);
    const housingRecognition = evaluateHousingRecognition(state, householdId);
    const housingShare = evaluateParentHousingShare(state, householdId, housingRecognition);
    const status = housingShare.status === "NOT_APPLICABLE"
      ? "NOT_APPLICABLE"
      : ruleNeed.status === "SUPPORTED" && additional.status === "SUPPORTED" && housingShare.status === "SUPPORTED"
        ? "SUPPORTED"
        : "UNRESOLVED";
    const parentTotalNeed = status === "SUPPORTED"
      ? roundCents(ruleNeed.total + additional.parentAdditionalNeedsTotal + housingShare.parentHousingShareForKiZ)
      : null;
    return {
      ruleId: RULE_IDS.parentNeed,
      householdId,
      status,
      parentRuleNeed: ruleNeed.total,
      parentRuleNeedPositions: ruleNeed.positions,
      parentAdditionalNeeds: additional,
      parentAdditionalNeedsTotal: additional.parentAdditionalNeedsTotal,
      housingRecognition,
      parentHousingShare: housingShare,
      parentHousingShareForKiZ: housingShare.parentHousingShareForKiZ,
      parentTotalNeed,
      formula: status === "SUPPORTED" ? "parentRuleNeed + parentAdditionalNeedsTotal + parentHousingShareForKiZ" : null,
      warnings: [...additional.warnings, ...housingShare.warnings],
      openChecks: [...new Set([...additional.openChecks, ...housingShare.openChecks])],
      usedRuleIds: [RULE_IDS.parentNeed, RULE_IDS.parentAdditionalNeed, RULE_IDS.housingRecognition, RULE_IDS.parentHousingShare],
      sourceIds: ["SRC-SGBII-20", "SRC-SGBII-21", "SRC-RBSFV-2026", "SRC-DA-KIZ-2026-02-20"],
      disclaimer: "Elternbedarf als KiZ-Zwischenwert; kein Familien-SGB-II-Bedarf und kein End- oder Auszahlungsbetrag.",
    };
  }

  function evaluateChildKizBgMembership(state, householdId, child, housingHeadResult) {
    const result = evaluateChildMemberships(state, householdId, child, housingHeadResult);
    return {
      ruleId: RULE_IDS.childBgIncome,
      childId: result.childId,
      householdId,
      status: result.bgIncome.kizMembershipStatus,
      isKizBgMember: result.isKizBgMember,
      totalChildNeed: result.childNeed.totalChildNeed,
      countableChildIncomeAverage: result.bgIncome.countableChildIncomeAverage,
      childIncomeReduction: result.bgIncome.childIncomeReductionForKiZ,
      relevantChildBenefit: result.bgIncome.childBenefitForKiZMembership,
      incomeForKiZMembership: result.bgIncome.incomeForKiZMembership,
      coverageDifference: Number.isFinite(result.bgIncome.incomeForKiZMembership) && Number.isFinite(result.childNeed.totalChildNeed) ? roundCents(result.bgIncome.incomeForKiZMembership - result.childNeed.totalChildNeed) : null,
      warnings: result.warnings,
      openChecks: result.openChecks,
    };
  }

  function evaluateChildSgbIIBgMembership(state, householdId, child, housingHeadResult) {
    const result = evaluateChildMemberships(state, householdId, child, housingHeadResult);
    return {
      ruleId: RULE_IDS.childSgbIIMembership,
      childId: result.childId,
      householdId,
      status: result.bgIncome.sgbIIMembershipStatus,
      isSgbIIBgMember: result.isSgbIIBgMember,
      totalChildNeed: result.childNeed.totalChildNeed,
      countableChildIncomeAverage: result.bgIncome.countableChildIncomeAverage,
      childBenefitCountedInThisHousehold: result.bgIncome.childBenefitForSgbIIMembership,
      sgbIIChildAvailableIncome: result.bgIncome.incomeForSgbIIMembership,
      coverageDifference: Number.isFinite(result.bgIncome.incomeForSgbIIMembership) && Number.isFinite(result.childNeed.totalChildNeed) ? roundCents(result.bgIncome.incomeForSgbIIMembership - result.childNeed.totalChildNeed) : null,
      warnings: result.warnings,
      openChecks: result.openChecks,
    };
  }

  function evaluateFamilySgbIINeed(state, householdId) {
    const ruleNeed = parentRuleNeedForHousehold(state, householdId);
    const adultAdditional = evaluateParentAdditionalNeeds(state, householdId);
    const housingRecognition = evaluateHousingRecognition(state, householdId);
    const housingHead = familyHousingHeadShare(state, householdId, housingRecognition);
    const relevantChildren = asArray(state?.centralChildren).filter((child) => calculationRules?.evaluateChildRelevanceForHousehold?.(child, householdId)?.isRelevantForHousehold === true);
    const childMemberships = relevantChildren.map((child) => evaluateChildMemberships(state, householdId, child, housingHead));
    const sgbIIMemberChildren = childMemberships.filter((result) => result.isSgbIIBgMember === true);
    const adultHeads = state?.households?.[householdId]?.adults === "single" ? 1 : state?.households?.[householdId]?.adults === "couple" ? 2 : 0;
    const openChecks = [
      ...(ruleNeed.status === "SUPPORTED" ? [] : ["FAMILY_ADULT_RULE_NEED_REQUIRED"]),
      ...adultAdditional.openChecks,
      ...housingHead.openChecks,
      ...childMemberships.flatMap((result) => result.openChecks),
    ];
    if (childMemberships.some((result) => result.status === "UNRESOLVED")) openChecks.push("FAMILY_CHILD_MEMBERSHIP_REQUIRED");
    const unresolved = openChecks.length > 0 || adultAdditional.status !== "SUPPORTED" || housingHead.status !== "SUPPORTED";
    const familyHousingHeads = adultHeads + sgbIIMemberChildren.length;
    const familyHousingNeedForSgbII = unresolved ? null : roundCents(housingHead.housingHeadShare * familyHousingHeads);
    const recognizedChildRuleNeeds = unresolved ? null : roundCents(sgbIIMemberChildren.reduce((sum, result) => sum + result.childNeed.recognizedRuleNeed, 0));
    const recognizedChildAdditionalNeeds = unresolved ? null : roundCents(sgbIIMemberChildren.reduce((sum, result) => sum + result.childNeed.recognizedAdditionalNeed, 0));
    const familySgbIINeed = unresolved ? null : roundCents(ruleNeed.total + adultAdditional.parentAdditionalNeedsTotal + recognizedChildRuleNeeds + recognizedChildAdditionalNeeds + familyHousingNeedForSgbII);
    const adultRuleByRole = Object.fromEntries(ruleNeed.positions.map((position) => [position.personRole, position.amount]));
    const adultAdditionalByRole = Object.fromEntries(ruleNeed.positions.map((position) => [
      position.personRole,
      unresolved ? null : roundCents(adultAdditional.items.filter((item) => item.personRole === position.personRole).reduce((sum, item) => sum + (item.recognizedAmount || 0), 0)),
    ]));
    const adultPositions = ruleNeed.positions.map((position) => ({
      personId: `${householdId}-${position.personRole}`,
      role: "parent",
      personRole: position.personRole,
      kizBgMember: true,
      sgbIIBgMember: true,
      ruleNeed: adultRuleByRole[position.personRole],
      additionalNeeds: adultAdditionalByRole[position.personRole],
      additionalNeed: adultAdditionalByRole[position.personRole],
      housingHeadShare: unresolved ? null : housingHead.housingHeadShare,
      totalNeed: unresolved ? null : roundCents(adultRuleByRole[position.personRole] + adultAdditionalByRole[position.personRole] + housingHead.housingHeadShare),
    }));
    const childPositions = childMemberships.map((result) => ({
      personId: result.childId,
      role: "child",
      childId: result.childId,
      kizBgMember: result.isKizBgMember,
      sgbIIBgMember: result.isSgbIIBgMember,
      ruleNeed: result.childNeed.recognizedRuleNeed,
      additionalNeeds: result.childNeed.recognizedAdditionalNeed,
      additionalNeed: result.childNeed.recognizedAdditionalNeed,
      housingHeadShare: result.childNeed.recognizedHousingNeed,
      totalNeed: result.childNeed.totalChildNeed,
      childNeed: result.childNeed,
      includedNeed: result.isSgbIIBgMember === true ? result.childNeed.totalChildNeed : 0,
    }));
    return {
      ruleId: RULE_IDS.familySgbIINeed,
      householdId,
      status: unresolved ? "UNRESOLVED" : "SUPPORTED",
      adultRuleNeed: ruleNeed.total,
      adultAdditionalNeeds: adultAdditional,
      adultAdditionalNeedsTotal: adultAdditional.parentAdditionalNeedsTotal,
      childMemberships,
      sgbIIMemberChildCount: sgbIIMemberChildren.length,
      housingRecognition,
      housingHeadShare: housingHead.housingHeadShare,
      housingDenominatorHeads: housingHead.denominatorHeads,
      familyHousingHeads,
      familyHousingNeedForSgbII,
      recognizedChildRuleNeeds,
      recognizedChildAdditionalNeeds,
      familySgbIINeed,
      adultPositions,
      childPositions,
      persons: [...adultPositions, ...childPositions],
      housing: {
        totalRelevantHousingCosts: housingRecognition.adjustedActualCosts,
        totalHousingHeads: housingHead.denominatorHeads,
        housingHeadShare: housingHead.housingHeadShare,
        sgbIIBgHousingHeads: familyHousingHeads,
        familyHousingNeedForSgbII,
      },
      formula: unresolved ? null : "adultRuleNeed + adultAdditionalNeedsTotal + SGBII-member child rule/additional needs + familyHousingNeedForSgbII",
      warnings: [...adultAdditional.warnings, ...housingHead.warnings, ...childMemberships.flatMap((result) => result.warnings)],
      openChecks: [...new Set(openChecks)],
      usedRuleIds: [RULE_IDS.familySgbIINeed, RULE_IDS.childSgbIIMembership, RULE_IDS.childBgIncome, RULE_IDS.childSgbIINeed, RULE_IDS.parentAdditionalNeed, RULE_IDS.housingRecognition],
      sourceIds: ["SRC-SGBII-7", "SRC-SGBII-20", "SRC-SGBII-21", "SRC-SGBII-22", "SRC-SGBII-23", "SRC-RBSFV-2026", "SRC-DA-KIZ-2026-02-20"],
      disclaimer: "Bedarfsseitiger Familien-SGB-II-Zwischenwert; keine Hilfebedürftigkeits-, Wohngeld- oder endgültige KiZ-Entscheidung.",
    };
  }

  function calculateMonetaryFoundation(state, validationResult = {}) {
    const context = createCalculationContext(state, validationResult);
    if (!context.canCalculate) {
      return { ...context, period: null, households: {} };
    }
    const period = createAssessmentPeriod(state?.applicationMonth, state?.applicationYear);
    const householdIds = calculationRules?.getRelevantHouseholds ? calculationRules.getRelevantHouseholds(state) : [];
    const households = {};
    householdIds.forEach((householdId) => {
      households[householdId] = {
        minimumIncome: evaluateMinimumIncome(state, householdId),
        maximumKiz: evaluateMaximumKizForHousehold(state, householdId),
      };
    });
    const partial =
      period.status !== "CALCULATED" ||
      Object.values(households).some((result) => result.minimumIncome.status !== "CALCULATED" || !result.maximumKiz.supportedLegalPeriod);
    return {
      ...context,
      status: partial ? "PARTIAL" : context.status,
      usedRuleIds: [RULE_IDS.general, RULE_IDS.period, RULE_IDS.minimumIncome, RULE_IDS.maximumKiz],
      period,
      households,
      openChecks: [
        ...context.openChecks,
        ...period.openChecks,
        ...Object.values(households).flatMap((result) => [...result.minimumIncome.openChecks, ...result.maximumKiz.openChecks]),
      ],
      unsupportedCases: Object.values(households).flatMap((result) => result.minimumIncome.unresolvedIncomeSources),
    };
  }

  function roundFinalKizToEuro(value) {
    if (!Number.isFinite(value) || value < 0) return null;
    return Math.floor(stabilizeArithmeticPrecision(value) + 0.5);
  }

  const INFORMATIONAL_FAMILY_STATUS_CODES = new Set([
    "CHILD_OWN_CHILD_STATUS_NOT_CAPTURED",
    "CHILD_OWN_PARTNER_HOUSEHOLD_STATUS_NOT_CAPTURED",
    "CHILD_REMAINING_FAMILY_STATUS_NOT_CAPTURED",
  ]);

  const FINAL_TRACE_STEPS = Object.freeze([
    ["CHILD_ASSIGNMENT", RULE_IDS.maximumKiz],
    ["MINIMUM_INCOME", RULE_IDS.minimumIncome],
    ["MAXIMUM_KIZ", RULE_IDS.maximumKiz],
    ["CHILD_INCOME", CHILD_INCOME_REDUCTION.ruleId],
    ["PARENT_NEED", RULE_IDS.parentNeed],
    ["ADULT_INCOME", RULE_IDS.adultIncome],
    ["PARENT_INCOME_REDUCTION", RULE_IDS.parentIncomeReduction],
    ["ASSETS", RULE_IDS.assetIntegration],
    ["FAMILY_NEED", RULE_IDS.familySgbIINeed],
    ["HOUSING_BENEFIT", RULE_IDS.coverage],
    ["COVERAGE", RULE_IDS.coverage],
    ["FINAL_ROUNDING", RULE_IDS.final],
    ["PAYOUT", RULE_IDS.final],
  ]);

  const uniqueStrings = (values) => [...new Set(asArray(values).filter((value) => typeof value === "string" && value))];

  function uniqueWarnings(values) {
    const seen = new Set();
    return asArray(values).filter((item) => {
      if (!item || typeof item !== "object") return false;
      const key = `${item.code || ""}|${item.message || ""}|${item.field || ""}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function classifyFinalOpenChecks(codes, state, householdId) {
    const relevantChildren = asArray(state?.centralChildren).filter((child) =>
      calculationRules?.evaluateChildRelevanceForHousehold?.(child, householdId)?.isRelevantForHousehold
    );
    const minorStandard = relevantChildren.length > 0
      && relevantChildren.every((child) => Number.isInteger(Number(child?.age)) && Number(child.age) < 18);
    return uniqueStrings(codes).reduce((result, code) => {
      result[minorStandard && INFORMATIONAL_FAMILY_STATUS_CODES.has(code) ? "informational" : "blocking"].push(code);
      return result;
    }, { blocking: [], informational: [] });
  }

  function emptyBenefitMonths(period) {
    return asArray(period?.benefitMonths).map((month) => ({ ...month, amountBeforeFinalRounding: null, roundedPayableAmount: null, amountStatus: "NOT_CALCULATED" }));
  }

  function assessmentPeriodResult(period, benefitMonths = emptyBenefitMonths(period)) {
    return {
      applicationMonth: period?.applicationMonth ?? null,
      applicationYear: period?.applicationYear ?? null,
      incomeAssessmentMonths: asArray(period?.incomeAssessmentMonths || period?.months).map((month) => ({ ...month })),
      benefitMonths: asArray(benefitMonths).map((month) => ({ ...month })),
    };
  }

  function housingBenefitSummary(coverage) {
    const housing = coverage?.housingBenefit || {};
    const known = new Set(["APPROVED", "EXTERNAL_ESTIMATE", "CONFIRMED_ZERO", "AUTOMATIC_FICTIVE", "NOT_NEEDED"]);
    return {
      status: known.has(housing.basis) ? housing.basis : coverage ? "UNRESOLVED" : "NOT_EVALUATED",
      basis: housing.basis ?? null,
      amount: Number.isFinite(housing.amount) ? housing.amount : null,
      reliability: coverage?.reliability ?? null,
      benefitType: housing?.automaticCalculation?.benefitType ?? null,
    };
  }

  function buildFinalTrace(stageMap, rounding = null, payout = null) {
    return FINAL_TRACE_STEPS.map(([step, ruleId]) => {
      const stage = step === "FINAL_ROUNDING" ? rounding : step === "PAYOUT" ? payout : stageMap[step];
      return { step, ruleId: stage?.ruleId || stage?.result?.ruleId || ruleId, status: stage?.status || "SKIPPED", inputs: stage?.inputs || {}, result: stage?.summary ?? stage?.output ?? null };
    });
  }

  function compactChildResults(state, householdId, maximumKiz, d2, d6, d7) {
    const stateChildren = new Map(asArray(state?.centralChildren).map((child) => [child?.id, child]));
    const maximumById = new Map(asArray(maximumKiz?.childResults).map((child) => [child.childId, child]));
    const d6ById = new Map(asArray(d6?.children?.kizBgChildren).map((child) => [child.childId, child]));
    const assetById = new Map([...asArray(d7?.month1?.childResults), ...asArray(d7?.months2To6?.childResults)].map((child) => [child.childId, child]));
    return asArray(d2?.childResults || maximumKiz?.childResults).map((result) => {
      const child = stateChildren.get(result.childId) || {};
      const maximum = maximumById.get(result.childId) || {};
      const d6Child = d6ById.get(result.childId) || {};
      const asset = assetById.get(result.childId) || {};
      const afterIncome = Number.isFinite(result.individualKiZAfterChildIncome) ? result.individualKiZAfterChildIncome : null;
      return {
        childId: result.childId,
        name: child.name || "",
        isPotentialOwnKizChild: maximum.isPotentialOwnKizChild === true,
        maximumKiz: Number.isFinite(result.maximumKiZ) ? result.maximumKiZ : Number.isFinite(maximum.maximumKizAmount) ? maximum.maximumKizAmount : null,
        countableChildIncomeAverage: Number.isFinite(result.countableChildIncomeAverage) ? result.countableChildIncomeAverage : null,
        childIncomeReduction: Number.isFinite(result.childIncomeReduction) ? result.childIncomeReduction : null,
        kizAfterChildIncome: afterIncome,
        childAssetReductionMonth1: afterIncome !== null && Number.isFinite(asset.month1KiZ) ? stabilizeArithmeticPrecision(afterIncome - asset.month1KiZ) : null,
        recipientPersonRole: d6Child.recipientPersonRole || asset.recipientPersonRole || null,
        status: result.status || maximum.status || "UNRESOLVED",
      };
    });
  }

  function buildPaymentMonths(period, month1Amount, laterAmount) {
    return asArray(period?.benefitMonths).map((month, index) => ({
      ...month,
      amountBeforeFinalRounding: index === 0 ? month1Amount : laterAmount,
      roundedPayableAmount: roundFinalKizToEuro(index === 0 ? month1Amount : laterAmount),
      amountStatus: month.year > 2026 ? "PROVISIONAL_CURRENT_LAW_BASELINE" : "FINAL_2026",
    }));
  }

  function buildRecipientPayments(d6, d7, month1Payable, laterPayable) {
    if (asArray(d7?.openChecks).includes("ASSET_PATCHWORK_ALLOCATION_OPEN")) return { status: "UNRESOLVED", recipients: [], openChecks: ["ASSET_PATCHWORK_ALLOCATION_OPEN"] };
    const groups = asArray(d6?.patchworkAllocation?.recipients);
    if (!groups.length || groups.some((group) => !group.recipientPersonRole)) return { status: "UNRESOLVED", recipients: [], openChecks: ["PAYMENT_RECIPIENT_REQUIRED"] };
    const multiple = groups.length > 1;
    if (multiple && Number(d7?.countableAssetsForKizReduction?.householdTotal) > 0) return { status: "UNRESOLVED", recipients: [], openChecks: ["ASSET_PATCHWORK_ALLOCATION_OPEN"] };
    const recipients = groups.map((group) => {
      const month1BeforeFinalRounding = multiple ? group.recipientKiZAfterParentIncome : d7.month1.kizAfterAssets;
      const months2To6BeforeFinalRounding = multiple ? group.recipientKiZAfterParentIncome : d7.months2To6.kizAfterAssets;
      return {
        recipientPersonRole: group.recipientPersonRole,
        childIds: [...asArray(group.childIds)],
        month1BeforeFinalRounding,
        months2To6BeforeFinalRounding,
        month1Payable: roundFinalKizToEuro(month1BeforeFinalRounding),
        months2To6Payable: roundFinalKizToEuro(months2To6BeforeFinalRounding),
      };
    });
    const rounded = { month1: recipients.reduce((sum, item) => sum + item.month1Payable, 0), months2To6: recipients.reduce((sum, item) => sum + item.months2To6Payable, 0) };
    const differs = rounded.month1 !== month1Payable || rounded.months2To6 !== laterPayable;
    return { status: differs ? "UNRESOLVED" : "SUPPORTED", recipients, householdRoundedAmounts: { month1: month1Payable, months2To6: laterPayable }, recipientRoundedTotals: rounded, openChecks: differs ? ["PATCHWORK_PAYOUT_ROUNDING_RECONCILIATION_OPEN"] : [] };
  }

  function calculateKinderzuschlagForHousehold(state, validationResult, householdId, period) {
    const stageMap = {};
    const stages = [];
    const openChecks = [];
    const warnings = [...asArray(validationResult?.warnings), ...asArray(validationResult?.infos)];
    const baseEligibility = { potentialOwnKizChildren: null, minimumIncome: null, minimumIncomeMet: null, assetDecision: null, coverageDecision: null, accessType: null };
    const baseAmounts = { theoreticalMaximum: null, afterChildIncome: null, afterParentIncome: null, month1BeforeFinalRounding: null, months2To6BeforeFinalRounding: null, month1Payable: null, months2To6Payable: null, currentMonthlyPayableAmount: null, finalPayableAmount: null, sixMonthFinalPayableTotal: null, currentLawBaselineSixMonthTotal: null };
    const base = {
      ruleId: RULE_IDS.final, householdId, status: "UNRESOLVED", decisionReason: "OPEN_CHECKS_REMAIN", currentDecision: "UNRESOLVED",
      futurePaymentAmountFinality: "NOT_CALCULATED", futureMaximumKizChangePossible: false,
      eligibility: baseEligibility, amounts: baseAmounts, housingBenefitUsed: housingBenefitSummary(null), assessmentPeriod: assessmentPeriodResult(period), paymentPeriods: [], paymentTiming: null,
      recipientPayments: { status: "NOT_CALCULATED", recipients: [], openChecks: [] }, childResults: [], calculationTrace: [], blockingOpenChecks: [], informationalWarnings: [], usedRuleIds: [RULE_IDS.final], sourceIds: ["SRC-BKGG-6A", "SRC-BKGG-11", "SRC-DA-KIZ-2026-02-20"],
    };
    const finish = (changes = {}, rounding = null, payout = null) => {
      const classified = classifyFinalOpenChecks(openChecks, state, householdId);
      const usedRuleIds = uniqueStrings([RULE_IDS.final, ...stages.flatMap((stage) => [stage?.ruleId, ...asArray(stage?.usedRuleIds)])]);
      const sourceIds = uniqueStrings(["SRC-BKGG-6A", "SRC-BKGG-11", "SRC-DA-KIZ-2026-02-20", ...stages.flatMap((stage) => asArray(stage?.sourceIds))]);
      return {
        ...base, ...changes,
        blockingOpenChecks: uniqueStrings([...(changes.blockingOpenChecks || []), ...classified.blocking]),
        informationalWarnings: uniqueWarnings([...warnings, ...classified.informational.map((code) => warning(code, "Für diesen minderjährigen Standardfall ist der strukturelle Hinweis nicht entscheidungsblockierend.")), ...(changes.informationalWarnings || [])]),
        calculationTrace: buildFinalTrace(stageMap, rounding, payout), usedRuleIds, sourceIds,
      };
    };
    const addStage = (key, result, status, inputs, summary) => { stages.push(result); stageMap[key] = { result, status, inputs, summary }; openChecks.push(...asArray(result?.openChecks)); warnings.push(...asArray(result?.warnings)); };
    const unresolvedNow = () => classifyFinalOpenChecks(openChecks, state, householdId).blocking.length > 0;
    const errors = asArray(validationResult?.errors).filter((item) => !item?.householdId || item.householdId === householdId || item.household === householdId);
    if (errors.length || (validationResult?.isValid === false && !asArray(validationResult?.errors).length)) return finish({ status: "INVALID_INPUT", currentDecision: "INVALID_INPUT", decisionReason: "VALIDATION_ERRORS", blockingOpenChecks: errors.map((item) => item.code || "VALIDATION_ERROR") });
    if (period?.status !== "CALCULATED") { openChecks.push(...asArray(period?.openChecks), "APPLICATION_PERIOD_REVIEW_REQUIRED"); return finish(); }

    const minimumIncome = evaluateMinimumIncome(state, householdId);
    addStage("MINIMUM_INCOME", minimumIncome, minimumIncome.status === "CALCULATED" ? minimumIncome.isThresholdMet ? "PASSED" : "FAILED" : "UNRESOLVED", { householdType: minimumIncome.householdType, threshold: minimumIncome.threshold }, { averageRelevantIncome: minimumIncome.averageRelevantIncome, isThresholdMet: minimumIncome.isThresholdMet });
    let eligibility = { ...baseEligibility, minimumIncome, minimumIncomeMet: minimumIncome.isThresholdMet };
    if (minimumIncome.status !== "CALCULATED") return finish({ eligibility });
    if (!minimumIncome.isThresholdMet) return finish({ status: "CALCULATED_NOT_ENTITLED", currentDecision: "CALCULATED_NOT_ENTITLED", decisionReason: "MINIMUM_INCOME_NOT_MET", eligibility });

    const maximum = evaluateMaximumKizForHousehold(state, householdId);
    stages.push(maximum);
    stageMap.CHILD_ASSIGNMENT = { result: maximum, status: "EVALUATED", inputs: { householdId, centralChildCount: asArray(state?.centralChildren).length }, summary: { potentialOwnKizChildren: maximum.potentialChildrenCount } };
    stageMap.MAXIMUM_KIZ = { result: maximum, status: maximum.supportedLegalPeriod ? "CALCULATED" : "UNRESOLVED", inputs: { applicationYear: state?.applicationYear }, summary: { theoreticalMaximumKizTotal: maximum.theoreticalMaximumKizTotal } };
    asArray(state?.centralChildren).forEach((child) => {
      const relevance = calculationRules?.evaluateChildRelevanceForHousehold?.(child, householdId);
      if (!relevance?.isRelevantForHousehold) return;
      const benefit = calculationRules?.evaluateChildBenefitAssignment?.(child, householdId);
      openChecks.push(...asArray(relevance.openChecks), ...asArray(benefit?.openChecks));
      warnings.push(...asArray(relevance.warnings), ...asArray(benefit?.warnings));
    });
    eligibility = { ...eligibility, potentialOwnKizChildren: maximum.potentialChildrenCount };
    let amounts = { ...baseAmounts, theoreticalMaximum: maximum.theoreticalMaximumKizTotal };
    const hasAge24 = asArray(maximum.childResults).some((item) => item.isPotentialOwnKizChild && Number(asArray(state?.centralChildren).find((child) => child?.id === item.childId)?.age) === 24);
    if (hasAge24) { openChecks.push("CHILD_25TH_BIRTHDAY_DURING_BWZ_REVIEW_REQUIRED"); return finish({ eligibility, amounts, childResults: compactChildResults(state, householdId, maximum) }); }
    if (unresolvedNow()) return finish({ eligibility, amounts, childResults: compactChildResults(state, householdId, maximum) });
    if (maximum.potentialChildrenCount === 0) return finish({ status: "CALCULATED_NOT_ENTITLED", currentDecision: "CALCULATED_NOT_ENTITLED", decisionReason: "NO_POTENTIAL_OWN_KIZ_CHILD", eligibility, amounts, childResults: compactChildResults(state, householdId, maximum) });

    const d2 = evaluateChildIncomeReductionsForHousehold(state, householdId);
    addStage("CHILD_INCOME", d2, d2.status, { potentialOwnKizChildren: maximum.potentialChildrenCount }, { afterChildIncome: d2.preliminaryIndividualKiZAfterChildIncomeTotal });
    amounts = { ...amounts, afterChildIncome: d2.preliminaryIndividualKiZAfterChildIncomeTotal };
    if (d2.status !== "SUPPORTED") openChecks.push("CHILD_INCOME_FINAL_REQUIRED");
    if (d2.status !== "SUPPORTED" || unresolvedNow()) return finish({ eligibility, amounts, childResults: compactChildResults(state, householdId, maximum, d2) });

    const parentNeed = evaluateParentNeedForHousehold(state, householdId);
    const adultIncome = evaluateAdultIncomeForHousehold(state, householdId);
    addStage("PARENT_NEED", parentNeed, parentNeed.status, { householdId }, { parentTotalNeed: parentNeed.parentTotalNeed });
    addStage("ADULT_INCOME", adultIncome, adultIncome.status, { householdId }, { earnedIncome: adultIncome?.preparedForParentReduction?.earnedIncome, otherIncome: adultIncome?.preparedForParentReduction?.otherIncome });
    if (parentNeed.status !== "SUPPORTED") openChecks.push("PARENT_NEED_FINAL_REQUIRED");
    if (adultIncome.status !== "SUPPORTED") openChecks.push("ADULT_INCOME_FINAL_REQUIRED");
    if (parentNeed.status !== "SUPPORTED" || adultIncome.status !== "SUPPORTED" || unresolvedNow()) return finish({ eligibility, amounts, childResults: compactChildResults(state, householdId, maximum, d2) });

    const d6 = evaluateParentIncomeReduction(state, householdId);
    addStage("PARENT_INCOME_REDUCTION", d6, d6.status, { parentNeed: d6.parentNeed, earnedIncome: d6.parentIncome?.earnedIncome, otherIncome: d6.parentIncome?.otherIncome }, { afterParentIncome: d6.kizAfterParentIncomeBeforeAssets });
    amounts = { ...amounts, afterParentIncome: d6.kizAfterParentIncomeBeforeAssets };
    if (d6.status !== "SUPPORTED") openChecks.push("PARENT_INCOME_REDUCTION_FINAL_REQUIRED");
    if (d6.status !== "SUPPORTED" || unresolvedNow()) return finish({ eligibility, amounts, childResults: compactChildResults(state, householdId, maximum, d2, d6) });

    if (d6.kizAfterParentIncomeBeforeAssets === 0) {
      const childResults = compactChildResults(state, householdId, maximum, d2, d6);
      const rounding = {
        ruleId: RULE_IDS.final,
        status: "CALCULATED",
        inputs: { month1BeforeFinalRounding: 0, months2To6BeforeFinalRounding: 0 },
        output: { month1Payable: 0, months2To6Payable: 0 },
      };
      stageMap.ASSETS = {
        ruleId: RULE_IDS.assetIntegration,
        status: "NOT_NEEDED",
        inputs: { reason: "ZERO_AFTER_PARENT_INCOME" },
        summary: { rejectedDueToAssets: false, month1: 0, months2To6: 0 },
      };
      amounts = {
        ...amounts,
        month1BeforeFinalRounding: 0,
        months2To6BeforeFinalRounding: 0,
        month1Payable: 0,
        months2To6Payable: 0,
        currentMonthlyPayableAmount: 0,
        finalPayableAmount: 0,
        sixMonthFinalPayableTotal: 0,
        currentLawBaselineSixMonthTotal: 0,
      };
      eligibility = { ...eligibility, assetDecision: "NOT_NEEDED_AFTER_ZERO" };
      return finish({
        status: "CALCULATED_NOT_ENTITLED",
        currentDecision: "CALCULATED_NOT_ENTITLED",
        decisionReason: "FINAL_AMOUNT_ZERO",
        eligibility,
        amounts,
        childResults,
      }, rounding);
    }

    const d7 = evaluateAssetIntegration(state, householdId);
    addStage("ASSETS", d7, d7.status, { assetAssessmentDate: d7.assetAssessmentDate }, { rejectedDueToAssets: d7.rejectedDueToAssets, month1: d7.month1?.kizAfterAssets, months2To6: d7.months2To6?.kizAfterAssets });
    eligibility = { ...eligibility, assetDecision: d7.rejectedDueToAssets ? "REJECTED" : d7.status };
    amounts = { ...amounts, month1BeforeFinalRounding: d7.month1?.kizAfterAssets ?? null, months2To6BeforeFinalRounding: d7.months2To6?.kizAfterAssets ?? null };
    const childResults = compactChildResults(state, householdId, maximum, d2, d6, d7);
    if (d7.rejectedDueToAssets === true && d7.futurePeriodStatus === "NEW_APPLICATION_REQUIRED" && !asArray(d7.openChecks).includes("PARENT_NEED_AFTER_CHILD_ASSET_REJECTION_OPEN")) return finish({ status: "CALCULATED_NOT_ENTITLED", currentDecision: "CALCULATED_NOT_ENTITLED", decisionReason: "REJECTED_DUE_TO_ASSETS", eligibility, amounts, childResults });
    if (!["SUPPORTED", "SUPPORTED_WITH_OPEN_CHECKS"].includes(d7.status)) openChecks.push("ASSET_INTEGRATION_FINAL_REQUIRED");
    if (!["SUPPORTED", "SUPPORTED_WITH_OPEN_CHECKS"].includes(d7.status) || unresolvedNow()) return finish({ eligibility, amounts, childResults });

    const familyNeed = evaluateFamilySgbIINeed(state, householdId);
    addStage("FAMILY_NEED", familyNeed, familyNeed.status, { householdId }, { familySgbIINeed: familyNeed.familySgbIINeed });
    if (familyNeed.status !== "SUPPORTED") openChecks.push("FAMILY_NEED_FINAL_REQUIRED");
    if (familyNeed.status !== "SUPPORTED" || unresolvedNow()) return finish({ eligibility, amounts, childResults });

    const coverage = evaluateCoverage(state, householdId);
    stages.push(coverage); openChecks.push(...asArray(coverage.openChecks)); warnings.push(...asArray(coverage.warnings));
    const housingBenefitUsed = housingBenefitSummary(coverage);
    stageMap.HOUSING_BENEFIT = { result: coverage, status: coverage.housingBenefit?.basis ? "EVALUATED" : "UNRESOLVED", inputs: { requestedStatus: state?.households?.[householdId]?.housingBenefitStatus ?? null }, summary: housingBenefitUsed };
    stageMap.COVERAGE = { result: coverage, status: coverage.status, inputs: { familyNeed: coverage.familyNeed?.familySgbIINeed }, summary: { decision: coverage.coverageDecision, gapAfterWohngeld: coverage.coverage?.gapAfterWohngeld } };
    const accessType = coverage.coverageDecision === "NORMAL_ACCESS_COVERAGE_MET" ? "NORMAL" : coverage.coverageDecision === "EXTENDED_ACCESS_COVERAGE_MET" ? "EXTENDED" : null;
    eligibility = { ...eligibility, coverageDecision: coverage.coverageDecision, accessType };
    if (coverage.status !== "SUPPORTED") openChecks.push("COVERAGE_FINAL_REQUIRED");
    if (coverage.status !== "SUPPORTED" || unresolvedNow()) return finish({ eligibility, amounts, housingBenefitUsed, childResults });
    if (coverage.coverageDecision === "COVERAGE_NOT_MET") return finish({ status: "CALCULATED_NOT_ENTITLED", currentDecision: "CALCULATED_NOT_ENTITLED", decisionReason: "COVERAGE_NOT_MET", eligibility, amounts, housingBenefitUsed, childResults });
    if (!accessType) { openChecks.push("COVERAGE_DECISION_REQUIRED"); return finish({ eligibility, amounts, housingBenefitUsed, childResults }); }

    const month1Before = d7.month1.kizAfterAssets;
    const laterBefore = d7.months2To6.kizAfterAssets;
    const month1Payable = roundFinalKizToEuro(month1Before);
    const laterPayable = roundFinalKizToEuro(laterBefore);
    const rounding = { ruleId: RULE_IDS.final, status: "CALCULATED", inputs: { month1BeforeFinalRounding: month1Before, months2To6BeforeFinalRounding: laterBefore }, output: { month1Payable, months2To6Payable: laterPayable } };
    amounts = { ...amounts, month1Payable, months2To6Payable: laterPayable };
    if (month1Before > 0 && month1Before < 0.5 && month1Payable === 0 && laterPayable > 0 && laterBefore !== month1Before) { openChecks.push("MONTH1_ZERO_AFTER_ROUNDING_WITH_LATER_ASSET_FREE_MONTHS_OPEN"); return finish({ eligibility, amounts, housingBenefitUsed, childResults }, rounding); }
    if (month1Payable === 0 && laterPayable === 0) {
      const reason = month1Before > 0 || laterBefore > 0 ? "FINAL_AMOUNT_ROUNDS_TO_ZERO" : "FINAL_AMOUNT_ZERO";
      return finish({ status: "CALCULATED_NOT_ENTITLED", currentDecision: "CALCULATED_NOT_ENTITLED", decisionReason: reason, eligibility, amounts: { ...amounts, currentMonthlyPayableAmount: 0, finalPayableAmount: 0, sixMonthFinalPayableTotal: 0, currentLawBaselineSixMonthTotal: 0 }, housingBenefitUsed, childResults }, rounding);
    }

    const paymentPeriods = buildPaymentMonths(period, month1Before, laterBefore);
    const baselineTotal = paymentPeriods.reduce((sum, month) => sum + month.roundedPayableAmount, 0);
    const hasFutureYear = paymentPeriods.some((month) => month.year > 2026);
    if (hasFutureYear) warnings.push(warning("LEGAL_RATE_2027_NOT_YET_FINAL", "Für Leistungsmonate im Jahr 2027 wird nur der aktuelle Rechtsstand als vorläufige Baseline ausgewiesen."));
    const recipientPayments = buildRecipientPayments(d6, d7, month1Payable, laterPayable);
    const payout = { ruleId: RULE_IDS.final, status: recipientPayments.status, inputs: { recipientCount: recipientPayments.recipients.length }, output: { recipientPaymentsStatus: recipientPayments.status } };
    if (recipientPayments.status !== "SUPPORTED") { openChecks.push(...recipientPayments.openChecks); return finish({ eligibility, amounts, housingBenefitUsed, assessmentPeriod: assessmentPeriodResult(period, paymentPeriods), paymentPeriods, recipientPayments, childResults }, rounding, payout); }
    const monthlyPayables = paymentPeriods.map((month) => month.roundedPayableAmount);
    const allSmall = monthlyPayables.every((amount) => amount > 0 && amount < 5);
    const mixedSmall = monthlyPayables.some((amount) => amount > 0 && amount < 5) && !allSmall;
    const paymentTiming = allSmall ? "SMALL_AMOUNT_LUMP_SUM_AFTER_BWZ" : mixedSmall ? "SMALL_AMOUNT_PAYMENT_TIMING_REVIEW" : "REGULAR_MONTHLY";
    if (mixedSmall) warnings.push(warning("SMALL_AMOUNT_PAYMENT_TIMING_REVIEW", "Bei unterschiedlichen Monatsbeträgen ist der genaue Auszahlungszeitpunkt gesondert zu prüfen."));
    payout.output.paymentTiming = paymentTiming;
    return finish({
      status: "CALCULATED_ENTITLED", currentDecision: "CALCULATED_ENTITLED", decisionReason: accessType === "EXTENDED" ? "ENTITLED_EXTENDED_ACCESS" : "ENTITLED_NORMAL_ACCESS",
      futurePaymentAmountFinality: hasFutureYear ? "PARTLY_PROVISIONAL_CURRENT_LAW_BASELINE" : "FINAL_2026", futureMaximumKizChangePossible: hasFutureYear,
      eligibility, amounts: { ...amounts, currentMonthlyPayableAmount: month1Payable, finalPayableAmount: month1Payable, sixMonthFinalPayableTotal: hasFutureYear ? null : baselineTotal, currentLawBaselineSixMonthTotal: baselineTotal },
      housingBenefitUsed, assessmentPeriod: assessmentPeriodResult(period, paymentPeriods), paymentPeriods, paymentTiming, recipientPayments, childResults,
    }, rounding, payout);
  }

  function calculateKinderzuschlag(state, validationResult = {}) {
    const context = createCalculationContext(state, validationResult);
    const period = createAssessmentPeriod(state?.applicationMonth, state?.applicationYear);
    const householdIds = calculationRules?.getRelevantHouseholds ? calculationRules.getRelevantHouseholds(state) : [];
    const households = Object.fromEntries(householdIds.map((householdId) => [householdId, calculateKinderzuschlagForHousehold(state, validationResult, householdId, period)]));
    const statuses = Object.values(households).map((household) => household.status);
    return {
      ruleId: RULE_IDS.final, dataVersion: state?.dataVersion ?? null, legalYear: 2026, mode: state?.mode ?? null,
      status: !context.canCalculate || statuses.includes("INVALID_INPUT") ? "INVALID_INPUT" : statuses.includes("UNRESOLVED") ? "UNRESOLVED" : "CALCULATED",
      assessmentPeriod: assessmentPeriodResult(period), households,
      usedRuleIds: uniqueStrings([RULE_IDS.final, ...Object.values(households).flatMap((household) => household.usedRuleIds)]),
      sourceIds: uniqueStrings(Object.values(households).flatMap((household) => household.sourceIds)),
    };
  }

  return {
    RULE_IDS,
    CHILD_MONTH_RULE_IDS,
    CHILD_INCOME_REDUCTION,
    PARENT_INCOME_REDUCTION,
    ASSET_ALLOWANCES,
    SOURCE_STAND,
    MONTH_NAMES,
    createAssessmentPeriod,
    createCalculationContext,
    prepareSixMonthValues,
    normalizeChildIncomeSource,
    evaluateMinimumIncome,
    evaluateDirectDeductions,
    evaluateExpense,
    evaluateDeductionsForPerson,
    evaluateAdultIncomeSource,
    calculateAdultIncomeForMonth,
    evaluateAdultIncomeForHousehold,
    evaluateChildBenefitSurplus,
    evaluateChildBenefitSurplusForHousehold,
    evaluateChildIncomeSource,
    calculateChildIncomeForMonth,
    evaluateChildIncome,
    evaluateMaximumKizForChild,
    evaluateMaximumKizForHousehold,
    evaluateChildIncomeReduction,
    evaluateChildIncomeReductionsForHousehold,
    calculateParentIncomeReductionAmounts,
    allocateParentIncomeReduction,
    evaluateParentIncomeReduction,
    assetDateAndVersion,
    classifyAssetPosition,
    calculateAssetAssessment,
    calculateChildAssetReduction,
    applyParentAssets,
    evaluateAssetIntegration,
    evaluateCoverageChildBenefit,
    calculateCoverageAmounts,
    evaluateCoverage,
    PARENT_RULE_NEEDS_2026,
    CHILD_RULE_NEEDS_2026,
    CHILD_BENEFIT_2026,
    PARENT_HOUSING_PERCENTAGES,
    singleParentPercentForChildren,
    evaluateParentAdditionalNeeds,
    evaluateHousingRecognition,
    familyHousingHeadShare,
    evaluateChildSgbIINeed,
    calculateChildSgbIINeed: evaluateChildSgbIINeed,
    evaluateChildBgIncome,
    evaluateChildMemberships,
    evaluateChildKizBgMembership,
    evaluateChildSgbIIBgMembership,
    evaluateParentHousingShare,
    evaluateParentNeedForHousehold,
    evaluateFamilySgbIINeed,
    calculateMonetaryFoundation,
    roundFinalKizToEuro,
    calculateKinderzuschlag,
  };
});

