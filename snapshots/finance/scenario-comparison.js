(function initializeScenarioComparison(root, factory) {
  const validation = typeof module !== "undefined" && module.exports ? require("./validation.js") : root?.KizValidation;
  const parentNeedData = typeof module !== "undefined" && module.exports ? require("./parent-need-data.js") : root?.KizParentNeedData;
  const api = factory(root, validation, parentNeedData);
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.KizScenarioComparison = api;
})(typeof window !== "undefined" ? window : globalThis, function createScenarioComparisonApi(root, validation, parentNeedData) {
  "use strict";

  const asArray = (value) => Array.isArray(value) ? value : [];
  const finite = (value) => Number.isFinite(value) ? value : null;
  const deepClone = (value) => {
    if (typeof structuredClone === "function") return structuredClone(value);
    return JSON.parse(JSON.stringify(value));
  };
  const stringAmount = (value) => value === null || value === undefined ? "" : String(value);
  const SUPPORTED_SCENARIO_INCOME_TYPES = new Set(validation?.ADULT_INCOME_TYPES || []);
  const SUPPORTED_WG_INCOME_TYPES = new Set(validation?.WG_INCOME_TYPES || []);
  const AMOUNT_TYPE_LABELS = {
    gross: "Bruttobetrag",
    net: "Nettobetrag / ausgezahlter Betrag",
    notice: "Betrag laut Bescheid",
    other: "anderer Betragstyp",
  };
  const incomeTypeLabel = (type) => root?.KizAdultIncomeTypes?.options?.find(([value]) => value === type)?.[1]
    || validation?.WG_INCOME_TYPE_LABELS?.[type]
    || type;

  function nextScenarioId(state, prefix) {
    const used = new Set();
    const households = state?.households || {};
    Object.values(households).forEach((household) => {
      [household?.applicantIncomeSources, household?.partnerIncomeSources].forEach((sources) => asArray(sources).forEach((source) => used.add(source?.id)));
      Object.values(household?.wohngeldData?.persons || {}).forEach((person) => asArray(person?.incomeForecast?.sources).forEach((source) => used.add(source?.id)));
    });
    for (let index = 1; index < 10000; index += 1) {
      const candidate = `scenario-${prefix}-${index}`;
      if (!used.has(candidate)) return candidate;
    }
    throw new Error("Keine eindeutige Szenario-ID verfügbar.");
  }

  function requireScenarioIncomeType(type) {
    if (!SUPPORTED_SCENARIO_INCOME_TYPES.has(type)) throw new Error(`Einkommensart im Szenariolabor nicht unterstützt: ${type || "leer"}.`);
    return type;
  }

  function setMonthlyAmount(source, amount) {
    const value = stringAmount(amount);
    source.entryMethod = "monthly";
    source.monthlyValues = Array(6).fill(value);
    source.monthlyAverage = "";
    if (source.incomeType === "sick-pay") {
      const field = source.amountType === "gross" ? "grossAmount" : ["net", "notice"].includes(source.amountType) ? "netAmount" : null;
      if (field && source[field] && typeof source[field] === "object") {
        source[field].entryMethod = "monthly";
        source[field].monthlyValues = Array(6).fill(value);
        source[field].monthlyAverage = "";
      }
    }
  }

  function amountFromSource(source) {
    const isBlank = (value) => value === null || value === undefined || String(value).trim() === "";
    const effectiveSource = source?.incomeType === "sick-pay"
      ? source.amountType === "gross" && source.grossAmount ? source.grossAmount
        : ["net", "notice"].includes(source.amountType) && source.netAmount ? source.netAmount
          : source
      : source;
    if (effectiveSource?.entryMethod === "average") return isBlank(effectiveSource.monthlyAverage) ? null : finite(Number(effectiveSource.monthlyAverage));
    const rawValues = asArray(effectiveSource?.monthlyValues).slice(0, 6);
    if (rawValues.length < 6 || rawValues.some(isBlank)) return null;
    const values = rawValues.map((value) => Number(value));
    if (values.some((value) => !Number.isFinite(value))) return null;
    return values.slice(0, 6).reduce((sum, value) => sum + value, 0) / 6;
  }

  function proportionalGrossSuggestion(source, percentage) {
    const currentGross = source?.amountType === "gross" ? amountFromSource(source) : null;
    const percent = finite(Number(percentage));
    if (currentGross === null || percent === null || percent <= 0) return null;
    return {
      currentGross,
      percentage: percent,
      suggestedGross: Math.round(currentGross * percent) / 100,
    };
  }

  function sourceAmountType(source) {
    return source?.amountType || "other";
  }

  function unknownEmploymentDeductions() {
    const deductions = blankDeductions();
    deductions.tax = { enabled: true, entryMethod: "average", monthlyAverage: "", monthlyValues: ["", "", "", "", "", ""] };
    ["healthInsurance", "careInsurance", "pensionInsurance", "unemploymentInsurance"].forEach((field) => {
      deductions[field] = { enabled: true, entryMethod: "average", monthlyAverage: "", monthlyValues: ["", "", "", "", "", ""], mandatoryStatus: "unknown" };
    });
    return deductions;
  }

  function mergeDeductions(details, original, operation, type) {
    if (operation === "change-amount") return deepClone(original?.deductions || blankDeductions());
    const base = type === "employment" ? unknownEmploymentDeductions() : blankDeductions();
    const supplied = details.deductions && typeof details.deductions === "object" ? details.deductions : {};
    Object.keys(base).forEach((field) => {
      if (supplied[field] && typeof supplied[field] === "object") base[field] = { ...base[field], ...deepClone(supplied[field]) };
    });
    return base;
  }

  function cloneState(state) {
    return deepClone(state);
  }

  function blankDeductions() {
    const empty = () => ({ enabled: false, entryMethod: "average", monthlyAverage: "", monthlyValues: ["", "", "", "", "", ""] });
    return {
      tax: empty(),
      healthInsurance: { ...empty(), mandatoryStatus: "unknown" },
      careInsurance: { ...empty(), mandatoryStatus: "unknown" },
      pensionInsurance: { ...empty(), mandatoryStatus: "unknown" },
      unemploymentInsurance: { ...empty(), mandatoryStatus: "unknown" },
      otherRegular: { ...empty(), description: "" },
    };
  }

  function createIncomeSource(household, changes, state, role = "partner") {
    const type = requireScenarioIncomeType(changes.incomeType);
    const amount = stringAmount(changes.amount);
    if (!amount.trim()) throw new Error(`Bitte gib für ${incomeTypeLabel(type)} den monatlichen Betrag an.`);
    const amountType = changes.amountType || (type === "minijob" ? "gross" : "");
    if (!amountType) throw new Error(`Bitte wähle für ${incomeTypeLabel(type)} den Betragstyp aus.`);
    const employmentRelated = new Set(["employment", "minijob", "training"]);
    const employmentType = type === "minijob" ? "minijob" : employmentRelated.has(type) ? changes.employmentType : "not-applicable";
    if (employmentRelated.has(type) && (!employmentType || employmentType === "unknown")) throw new Error(`Bitte wähle für ${incomeTypeLabel(type)} die Beschäftigungsart aus.`);
    if (type === "other" && !String(changes.customLabel || "").trim()) throw new Error("Bitte bezeichne das sonstige Einkommen der Partnerperson.");
    const source = {
      id: nextScenarioId(state || { households: {} }, "income"),
      personRole: role,
      incomeType: type,
      customLabel: stringAmount(changes.customLabel),
      amountType,
      entryMethod: "monthly",
      monthlyAverage: "",
      monthlyValues: [amount, amount, amount, amount, amount, amount],
      employmentType,
      u25SpecialAllowanceStatus: changes.u25SpecialAllowanceStatus || "unknown",
      parentalAllowanceType: changes.parentalAllowanceType || "unknown",
      confirmedExemptionMonthly: stringAmount(changes.confirmedExemptionMonthly),
      deductions: blankDeductions(),
    };
    const pensionStatus = changes.pensionStatus || "unknown";
    const pensionAmount = stringAmount(changes.pensionAmount);
    source.deductions.pensionInsurance = {
      enabled: pensionStatus === "yes",
      entryMethod: "average",
      monthlyAverage: pensionAmount,
      monthlyValues: [pensionAmount, pensionAmount, pensionAmount, pensionAmount, pensionAmount, pensionAmount],
      mandatoryStatus: pensionStatus,
    };
    return source;
  }

  function createWohngeldIncomeSource(changes, state) {
    const amount = stringAmount(changes.amount);
    const confirmed = changes.wgIncomeDetailsConfirmed === true;
    return {
      id: changes.id || nextScenarioId(state || { households: {} }, "wg-income"),
      type: requireScenarioIncomeType(changes.incomeType),
      expectedMonthlyAmount: amount,
      expectedAnnualAmount: "",
      monthlyValues: Array(12).fill(""),
      confirmedHigherAnnualWorkExpenses: "",
      confirmedAnnualWorkExpenses: confirmed ? "0" : "",
      confirmedExpectedAnnualTaxProfit: "",
      confirmedExpectedAnnualPositiveTaxIncome: "",
      confirmedParentalAllowanceExemptionAnnual: "0",
      actualAnnualTaxAmount: "",
      details: {},
      taxExpected: confirmed ? "no" : "unknown",
      healthCareContributionExpected: confirmed ? "no" : "unknown",
    };
  }

  function preparePartnerWohngeldPerson(household, changes, state) {
    const persons = household.wohngeldData ||= {};
    persons.persons ||= { applicant: {}, partner: {}, children: {} };
    const existing = parentNeedData?.migrateWohngeldPerson
      ? parentNeedData.migrateWohngeldPerson(persons.persons.partner)
      : (persons.persons.partner || {});
    const isNewPartner = !household.__scenarioHadPartner;
    const explicit = {
      exclusion: changes.wgPartnerExclusionStatus || "unknown",
      disability: changes.wgPartnerDisabilityAllowanceStatus || "unknown",
      ns: changes.wgPartnerNsPersecutionStatus || "unknown",
      grundrente: changes.wgPartnerGrundrenteTimesStatus || "unknown",
    };
    const existingOrExplicit = (value, fallback) => value && value !== "unknown" ? value : (fallback || "unknown");
    const incomeType = changes.incomeType;
    const incomeIsPresent = incomeType && incomeType !== "none" && incomeType !== "unchanged";
    const wohngeldIncomeIsSupported = incomeIsPresent && SUPPORTED_WG_INCOME_TYPES.has(incomeType);
    const confirmedNoIncome = incomeType === "none";
    persons.persons.partner = {
      ...deepClone(existing),
      wohngeldExclusionStatus: isNewPartner ? explicit.exclusion : existingOrExplicit(changes.wgPartnerExclusionStatus, existing.wohngeldExclusionStatus),
      disabilityAllowanceStatus: isNewPartner ? explicit.disability : existingOrExplicit(changes.wgPartnerDisabilityAllowanceStatus, existing.disabilityAllowanceStatus),
      nsPersecutionStatus: isNewPartner ? explicit.ns : existingOrExplicit(changes.wgPartnerNsPersecutionStatus, existing.nsPersecutionStatus),
      wohngeldGrundrentenTimesStatus: isNewPartner ? explicit.grundrente : existingOrExplicit(changes.wgPartnerGrundrenteTimesStatus, existing.wohngeldGrundrentenTimesStatus),
      incomeForecast: {
        ...(isNewPartner ? {} : deepClone(existing.incomeForecast || {})),
        basis: confirmedNoIncome || (wohngeldIncomeIsSupported && changes.wgIncomeDetailsConfirmed === true) ? "confirmed-from-current-income" : (existing.incomeForecast?.basis || "unknown"),
        incomeStatus: confirmedNoIncome ? "none" : wohngeldIncomeIsSupported ? "present" : "unknown",
        mode: wohngeldIncomeIsSupported ? "same-monthly" : "unknown",
        taxExpected: confirmedNoIncome ? "no" : wohngeldIncomeIsSupported && changes.wgIncomeDetailsConfirmed === true ? "no" : (existing.incomeForecast?.taxExpected || "unknown"),
        healthCareContributionExpected: confirmedNoIncome ? "no" : wohngeldIncomeIsSupported && changes.wgIncomeDetailsConfirmed === true ? "no" : (existing.incomeForecast?.healthCareContributionExpected || "unknown"),
        pensionContributionExpected: confirmedNoIncome ? "no" : wohngeldIncomeIsSupported ? (changes.wgPensionStatus || "unknown") : (existing.incomeForecast?.pensionContributionExpected || "unknown"),
        sources: wohngeldIncomeIsSupported ? [createWohngeldIncomeSource(changes, state)] : (isNewPartner ? [] : deepClone(existing.incomeForecast?.sources || [])),
      },
    };
    household.wohngeldData.singleParentAllowanceStatus = isNewPartner
      ? (changes.wgSingleParentAllowanceStatus || "unknown")
      : existingOrExplicit(changes.wgSingleParentAllowanceStatus, household.wohngeldData.singleParentAllowanceStatus);
  }

  function applyAdultIncomeChange(household, changes) {
    const role = changes.role || "partner";
    const listKey = role === "partner" ? "partnerIncomeSources" : "applicantIncomeSources";
    const list = asArray(household[listKey]);
    if (!list.length) throw new Error(`Keine Einkommensquelle mit der angegebenen Quell-ID für ${role} vorhanden.`);
    const source = changes.sourceId ? list.find((entry) => entry.id === changes.sourceId) : null;
    if (!source) throw new Error("Die Einkommensquelle muss über ihre vorhandene Quell-ID adressiert werden.");
    const amount = stringAmount(changes.amount);
    source.entryMethod = "monthly";
    source.monthlyValues = Array(6).fill(amount);
    source.monthlyAverage = "";
    const explicitWohngeldAmount = changes.wohngeldAmount;
    if (explicitWohngeldAmount !== undefined) {
      const wgPerson = household.wohngeldData?.persons?.[role];
      const wgSources = wgPerson?.incomeForecast?.sources;
      if (!changes.wohngeldSourceId) throw new Error("Ein Wohngeld-Prognosebetrag benötigt ausdrücklich die Wohngeld-Quell-ID.");
      const wgSource = asArray(wgSources).find((entry) => entry.id === changes.wohngeldSourceId);
      if (!wgSource) throw new Error("Die Wohngeld-Prognosequelle muss über ihre vorhandene Quell-ID adressiert werden.");
      wgSource.expectedMonthlyAmount = stringAmount(explicitWohngeldAmount);
    }
  }

  function normalizeIncomeDetails(details, original, role, state, operation) {
    const type = requireScenarioIncomeType(details.incomeType || original?.incomeType);
    const amount = details.amount;
    if (amount === undefined || amount === null || String(amount).trim() === "") throw new Error("Für die Szenario-Einkommensquelle muss ein konkreter Monatsbetrag angegeben werden.");
    const amountType = details.amountType || (operation === "change-amount" ? original?.amountType : null);
    if (!amountType) throw new Error("Für eine neue oder ersetzte Szenario-Einkommensquelle muss der Betragstyp ausdrücklich angegeben werden.");
    const source = original ? deepClone(original) : {
      personRole: role,
      customLabel: "",
      u25SpecialAllowanceStatus: "unknown",
      parentalAllowanceType: "unknown",
      confirmedExemptionMonthly: "",
    };
    source.id = details.id || original?.id || nextScenarioId(state, "income");
    source.personRole = role;
    source.incomeType = type;
    source.amountType = amountType;
    source.employmentType = details.employmentType || (type === "minijob" ? "minijob" : type === "employment" ? "unclear" : "not-applicable");
    source.deductions = mergeDeductions(details, original, operation, type);
    if (operation !== "change-amount" && details.pensionStatus) {
      const pensionAmount = stringAmount(details.pensionAmount);
      source.deductions.pensionInsurance = {
        enabled: details.pensionStatus === "yes",
        entryMethod: "average",
        monthlyAverage: details.pensionStatus === "yes" ? pensionAmount : "",
        monthlyValues: Array(6).fill(details.pensionStatus === "yes" ? pensionAmount : ""),
        mandatoryStatus: details.pensionStatus,
      };
    }
    setMonthlyAmount(source, amount);
    return source;
  }

  function forecastSourceFromDetails(details, original, state) {
    const type = requireScenarioIncomeType(details.incomeType || details.type || original?.type);
    const amount = details.amount ?? details.expectedMonthlyAmount;
    if (amount === undefined || amount === null || String(amount).trim() === "") throw new Error("Für die Wohngeld-Prognosequelle muss ein konkreter Monatsbetrag angegeben werden.");
    const source = original ? deepClone(original) : {
      expectedAnnualAmount: "",
      monthlyValues: Array(12).fill(""),
      confirmedHigherAnnualWorkExpenses: "",
      confirmedExpectedAnnualTaxProfit: "",
      confirmedExpectedAnnualPositiveTaxIncome: "",
      confirmedParentalAllowanceExemptionAnnual: "0",
      actualAnnualTaxAmount: "",
      details: {},
    };
    source.id = details.id || original?.id || nextScenarioId(state, "wg-income");
    source.type = type;
    source.expectedMonthlyAmount = stringAmount(amount);
    source.expectedAnnualAmount = details.expectedAnnualAmount ?? "";
    source.monthlyValues = Array.isArray(details.monthlyValues) ? deepClone(details.monthlyValues) : Array(12).fill("");
    source.confirmedAnnualWorkExpenses = details.confirmedAnnualWorkExpenses === undefined
      ? (type === "minijob" ? "" : (source.confirmedAnnualWorkExpenses || ""))
      : stringAmount(details.confirmedAnnualWorkExpenses);
    source.confirmedHigherAnnualWorkExpenses = details.confirmedHigherAnnualWorkExpenses === undefined ? (source.confirmedHigherAnnualWorkExpenses || "") : stringAmount(details.confirmedHigherAnnualWorkExpenses);
    source.confirmedExpectedAnnualTaxProfit = details.confirmedExpectedAnnualTaxProfit === undefined ? (source.confirmedExpectedAnnualTaxProfit || "") : stringAmount(details.confirmedExpectedAnnualTaxProfit);
    source.confirmedExpectedAnnualPositiveTaxIncome = details.confirmedExpectedAnnualPositiveTaxIncome === undefined ? (source.confirmedExpectedAnnualPositiveTaxIncome || "") : stringAmount(details.confirmedExpectedAnnualPositiveTaxIncome);
    source.taxExpected = details.taxExpected || "unknown";
    source.healthCareContributionExpected = details.healthCareContributionExpected || "unknown";
    return source;
  }

  function applyWohngeldIncomeScenario(household, role, details, state) {
    if (!details || typeof details !== "object") throw new Error("Für eine Jobänderung muss die Wohngeld-Prognose separat angegeben werden.");
    const person = household.wohngeldData?.persons?.[role];
    if (!person) throw new Error(`Wohngeld-Person für ${role} fehlt.`);
    const forecast = person.incomeForecast ||= {};
    const operation = details.operation || details.action || "replace";
    const sources = asArray(forecast.sources);
    let index = -1;
    if (details.sourceId) index = sources.findIndex((source) => source.id === details.sourceId);
    if ((operation === "replace" || operation === "change-amount" || operation === "update") && index < 0) throw new Error("Die Wohngeld-Prognosequelle muss über ihre vorhandene Quell-ID adressiert werden.");
    if (operation === "replace") {
      const replacement = forecastSourceFromDetails(details, sources[index], state);
      sources.splice(index, 1, replacement);
    } else if (operation === "change-amount" || operation === "update") {
      const source = sources[index];
      source.expectedMonthlyAmount = stringAmount(details.amount ?? details.expectedMonthlyAmount);
      if (details.type || details.incomeType) source.type = requireScenarioIncomeType(details.incomeType || details.type);
    } else if (operation === "add") {
      sources.push(forecastSourceFromDetails(details, null, state));
    } else {
      throw new Error(`Unbekannte Wohngeld-Szenarioaktion: ${operation}`);
    }
    forecast.basis = details.basis || "custom";
    forecast.incomeStatus = "present";
    forecast.mode = details.mode || "same-monthly";
    forecast.taxExpected = details.taxExpected || forecast.taxExpected || "unknown";
    forecast.healthCareContributionExpected = details.healthCareContributionExpected || forecast.healthCareContributionExpected || "unknown";
    forecast.pensionContributionExpected = details.pensionContributionExpected || forecast.pensionContributionExpected || "unknown";
    forecast.sources = sources;
  }

  function applyIncomeScenario(household, state, details) {
    if (!details || typeof details !== "object") throw new Error("Szenario-Einkommensdaten fehlen.");
    const role = details.role;
    if (role !== "applicant" && role !== "partner") throw new Error("Die Szenario-Einkommensquelle benötigt die Rolle applicant oder partner.");
    const listKey = role === "partner" ? "partnerIncomeSources" : "applicantIncomeSources";
    const list = asArray(household[listKey]);
    const index = details.sourceId ? list.findIndex((source) => source.id === details.sourceId) : -1;
    const original = index >= 0 ? list[index] : null;
    const explicitOperation = details.operation || details.action;
    const operation = explicitOperation || (details.incomeType && original?.incomeType !== details.incomeType ? "replace" : "change-amount");
    if ((operation === "replace" || operation === "change-amount" || operation === "update") && index < 0) throw new Error("Die Einkommensquelle muss über ihre vorhandene Quell-ID adressiert werden.");
    if (operation === "replace") {
      list.splice(index, 1, normalizeIncomeDetails(details, original, role, state, operation));
    } else if (operation === "change-amount" || operation === "update") {
      const changed = normalizeIncomeDetails({ ...details, incomeType: details.incomeType || original.incomeType, amountType: details.amountType || original.amountType }, original, role, state, "change-amount");
      list[index] = changed;
    } else if (operation === "add") {
      list.push(normalizeIncomeDetails(details, null, role, state, operation));
      if (role === "partner") {
        household.adults = "couple";
        household.partner ||= "Partner/in";
      }
    } else {
      throw new Error(`Unbekannte Einkommens-Szenarioaktion: ${operation}`);
    }
    household[listKey] = list;
    if (details.wohngeld || details.wohngeldForecast) applyWohngeldIncomeScenario(household, role, details.wohngeld || details.wohngeldForecast, state);
    else if (operation === "replace" || operation === "add") throw new Error("Bei einer neuen oder ersetzten Einkommensquelle muss die Wohngeld-Prognose separat und explizit angegeben werden.");
  }

  function careAssignment(careSituation) {
    if (careSituation === "wechselmodell-50-50") return { households: ["A", "B"], external: false };
    if (careSituation === "dauerhaft-a") return { households: ["A"], external: false };
    if (careSituation === "dauerhaft-b") return { households: ["B"], external: false };
    throw new Error(`Betreuungssituation im Szenario nicht unterst\u00fctzt: ${careSituation || "leer"}.`);
  }

  function ensureWohngeldChildPerson(state, childId, householdIds) {
    const households = Object.values(state?.households || {});
    const existing = households.map((household) => household?.wohngeldData?.persons?.children?.[childId]).find(Boolean);
    householdIds.forEach((letter) => {
      const children = state.households?.[letter]?.wohngeldData?.persons?.children;
      if (children && !children[childId] && existing) children[childId] = deepClone(existing);
    });
  }

  function applyChildCareChanges(state, childChanges) {
    asArray(childChanges).forEach((change) => {
      const child = asArray(state.centralChildren).find((entry) => entry.id === change?.childId);
      if (!child) throw new Error(`Unbekanntes Kind im Betreuungsszenario: ${change?.childId || "leer"}.`);
      const assignment = careAssignment(change.careSituation);
      if (child.careSituation !== change.careSituation) child.halfForwarded = false;
      child.careSituation = change.careSituation;
      child.affectedHouseholds = assignment.households;
      child.hasExternalHousehold = assignment.external;
      child.stayDays = "";
      child.decentralHotWaterStatus ||= {};
      assignment.households.forEach((letter) => {
        const hotWaterType = state.households?.[letter]?.hotWaterType;
        if (hotWaterType === "central") child.decentralHotWaterStatus[letter] = "no";
        if (hotWaterType === "decentral") child.decentralHotWaterStatus[letter] = "yes";
      });
      ensureWohngeldChildPerson(state, child.id, assignment.households);
    });
  }

  function applyChildBenefitChanges(state, childChanges) {
    asArray(childChanges).forEach((change) => {
      const child = asArray(state.centralChildren).find((entry) => entry.id === change?.childId);
      if (!child) throw new Error(`Unbekanntes Kind im Kindergeldszenario: ${change?.childId || "leer"}.`);
      const recognized = new Set(["applicant-a", "partner-a", "applicant-b", "partner-b", "external-person"]);
      if (!["A", "B", "external"].includes(change.childBenefitAt) || !recognized.has(change.childBenefitPerson)) {
        throw new Error("Das Kindergeldszenario ben\u00f6tigt einen bereits unterst\u00fctzten Empf\u00e4ngerzustand.");
      }
      child.childBenefitAt = change.childBenefitAt;
      if (child.childBenefitPerson !== change.childBenefitPerson) child.halfForwarded = false;
      child.childBenefitPerson = change.childBenefitPerson;
      child.externalChildBenefitPerson = change.childBenefitAt === "external" ? "Person im anderen Haushalt" : "";
    });
  }

  function applyChanges(baseState, changes = {}) {
    const scenario = cloneState(baseState);
    applyChildCareChanges(scenario, changes.childCareChanges);
    applyChildBenefitChanges(scenario, changes.childBenefitChanges);
    const householdId = changes.householdId || "A";
    const household = scenario.households?.[householdId];
    if (!household) throw new Error(`Unbekannter Haushalt: ${householdId}`);
    const partner = changes.partner;
    household.__scenarioHadPartner = household.adults === "couple";
    if (partner === "add" || partner === "present") {
      household.adults = "couple";
      household.partner = stringAmount(changes.partnerName) || household.partner || "Partner/in";
      if (!household.__scenarioHadPartner || changes.replacePartnerIncome === true) {
        household.partnerIncomeSources = [];
        household.partnerIncomeStatus = changes.incomeType === "none"
          ? "none"
          : changes.incomeType && changes.incomeType !== "unchanged" ? "present" : "unknown";
      }
      if (!household.__scenarioHadPartner || changes.replacePartnerExpenses === true) household.partnerExpenses = [];
      const explicitWgChange = [changes.wgPartnerExclusionStatus, changes.wgPartnerDisabilityAllowanceStatus, changes.wgPartnerNsPersecutionStatus, changes.wgPartnerGrundrenteTimesStatus, changes.wgSingleParentAllowanceStatus]
        .some((value) => value && value !== "unknown");
      if (!household.__scenarioHadPartner || (changes.incomeType && changes.incomeType !== "unchanged") || explicitWgChange) {
        preparePartnerWohngeldPerson(household, changes, scenario);
      }
      if (changes.incomeType && changes.incomeType !== "none" && changes.incomeType !== "unchanged" && (!household.__scenarioHadPartner || changes.replacePartnerIncome === true)) {
        household.partnerIncomeSources.push(createIncomeSource(household, changes, scenario, "partner"));
        household.partnerIncomeStatus = "present";
      }
    } else if (partner === "remove" || partner === "absent") {
      household.adults = "single";
      household.partner = "";
      household.partnerIncomeSources = [];
      household.partnerExpenses = [];
      if (household.wohngeldData) household.wohngeldData.singleParentAllowanceStatus = "unknown";
      if (household.wohngeldData?.persons) delete household.wohngeldData.persons.partner;
    }
    if (changes.adultIncome) {
      const typedIncomeChange = changes.adultIncome.operation || changes.adultIncome.action || changes.adultIncome.incomeType;
      if (typedIncomeChange) applyIncomeScenario(household, scenario, changes.adultIncome);
      else applyAdultIncomeChange(household, changes.adultIncome);
    }
    const incomeScenario = changes.incomeScenario || changes.jobIncome;
    if (incomeScenario) applyIncomeScenario(household, scenario, incomeScenario);
    if (changes.housing) {
      const rent = household.housingCosts ||= {};
      rent.rent ||= {};
      for (const field of ["coldRent", "coldUtilities", "heating"]) {
        if (Object.hasOwn(changes.housing, field) && changes.housing[field] !== "" && changes.housing[field] !== null && changes.housing[field] !== undefined) {
          rent.rent[field] = stringAmount(changes.housing[field]);
        }
      }
    }
    delete household.__scenarioHadPartner;
    return scenario;
  }

  function calculateState(state, deps = {}, householdId = "A") {
    const validation = deps.validation || root?.KizValidation;
    const calculator = deps.calculator || root?.KizCalculator;
    const wohngeld = deps.wohngeld || root?.WohngeldCalculator;
    const viewModel = deps.viewModel || root?.KizResultViewModel;
    if (!validation || !calculator || !viewModel) throw new Error("Produktionsmodule für Szenariovergleich fehlen.");
    const checked = validation.validateCalculatorState(state);
    const calculation = calculator.calculateKinderzuschlag(state, checked);
    const kizResult = calculation.households?.[householdId] || {};
    const household = state.households?.[householdId] || {};
    const wohngeldResult = household.wohngeldData?.calculationMode === "automatic" && wohngeld?.evaluateWohngeld
      ? wohngeld.evaluateWohngeld(household, state.centralChildren, { householdId, applicationMonth: state.applicationMonth, applicationYear: state.applicationYear })
      : null;
    const parentIncomeReductionResult = calculator.evaluateParentIncomeReduction
      ? calculator.evaluateParentIncomeReduction(state, householdId)
      : null;
    const model = viewModel.createResultViewModel({ kizResult, household, wohngeldResult, parentIncomeReductionResult });
    return { state, validation: checked, calculation, kizResult, wohngeldResult, viewModel: model };
  }

  function compareAmount(label, a, b, todayBenefit = {}, scenarioBenefit = {}) {
    const today = finite(a);
    const scenario = finite(b);
    return {
      key: label,
      label,
      today,
      scenario,
      delta: today !== null && scenario !== null ? scenario - today : null,
      comparable: today !== null && scenario !== null,
      todayStatus: todayBenefit.status || null,
      scenarioStatus: scenarioBenefit.status || null,
      todayMessage: todayBenefit.message || null,
      scenarioMessage: scenarioBenefit.message || null,
    };
  }

  function compareIncomeSource(label, todaySource, scenarioSource) {
    const today = amountFromSource(todaySource);
    const scenario = amountFromSource(scenarioSource);
    const todayType = sourceAmountType(todaySource);
    const scenarioType = sourceAmountType(scenarioSource);
    return {
      key: label,
      label,
      today,
      scenario,
      delta: today !== null && scenario !== null ? scenario - today : null,
      comparable: today !== null && scenario !== null,
      todayAmountType: todayType,
      scenarioAmountType: scenarioType,
      todayAmountTypeLabel: AMOUNT_TYPE_LABELS[todayType] || AMOUNT_TYPE_LABELS.other,
      scenarioAmountTypeLabel: AMOUNT_TYPE_LABELS[scenarioType] || AMOUNT_TYPE_LABELS.other,
    };
  }

  function amountForForecast(source) {
    if (!source) return null;
    const isBlank = (value) => value === null || value === undefined || String(value).trim() === "";
    if (source.expectedMonthlyAmount !== undefined) return isBlank(source.expectedMonthlyAmount) ? null : finite(Number(source.expectedMonthlyAmount));
    const rawValues = Array.isArray(source.monthlyValues) ? source.monthlyValues.slice(0, 12) : [];
    if (rawValues.length >= 12 && rawValues.every((value) => !isBlank(value) && Number.isFinite(Number(value)))) {
      return rawValues.reduce((sum, value) => sum + Number(value), 0) / 12;
    }
    return null;
  }

  function compareForecastSource(label, todaySource, scenarioSource) {
    const today = amountForForecast(todaySource);
    const scenario = amountForForecast(scenarioSource);
    return {
      key: label,
      label,
      today,
      scenario,
      delta: today !== null && scenario !== null ? scenario - today : null,
      comparable: today !== null && scenario !== null,
      todayType: todaySource?.type || null,
      scenarioType: scenarioSource?.type || null,
      todayTypeLabel: incomeTypeLabel(todaySource?.type) || "Art offen",
      scenarioTypeLabel: incomeTypeLabel(scenarioSource?.type) || "Art offen",
      amountSemantic: "separater Wohngeld-Prognosebetrag; kein Haushaltsnetto",
    };
  }

  function findRoleSource(state, householdId, role, sourceId) {
    const household = state?.households?.[householdId] || {};
    const key = role === "partner" ? "partnerIncomeSources" : "applicantIncomeSources";
    return asArray(household[key]).find((source) => source.id === sourceId) || null;
  }

  function findAddedSource(todayState, scenarioState, householdId, role, sourceId, forecast = false) {
    const todayHousehold = todayState?.households?.[householdId] || {};
    const scenarioHousehold = scenarioState?.households?.[householdId] || {};
    const todaySources = forecast
      ? asArray(todayHousehold.wohngeldData?.persons?.[role]?.incomeForecast?.sources)
      : asArray(todayHousehold[role === "partner" ? "partnerIncomeSources" : "applicantIncomeSources"]);
    const scenarioSources = forecast
      ? asArray(scenarioHousehold.wohngeldData?.persons?.[role]?.incomeForecast?.sources)
      : asArray(scenarioHousehold[role === "partner" ? "partnerIncomeSources" : "applicantIncomeSources"]);
    if (sourceId) return scenarioSources.find((source) => source.id === sourceId) || null;
    return scenarioSources.find((source) => !todaySources.some((todaySource) => todaySource.id === source.id)) || null;
  }

  function findForecastSource(state, householdId, role, sourceId) {
    const sources = state?.households?.[householdId]?.wohngeldData?.persons?.[role]?.incomeForecast?.sources;
    return asArray(sources).find((source) => source.id === sourceId) || null;
  }

  function createIncomeComparison(todayState, scenarioState, changes = {}) {
    const details = changes.incomeScenario || changes.jobIncome || changes.adultIncome;
    const householdId = changes.householdId || "A";
    const hours = details?.workHours || changes.workHours || changes.hours || null;
    if ((!details || !details.role) && !hours) return null;
    const role = details?.role;
    const rows = [];
    if (details?.role) {
      const todaySource = details.sourceId ? findRoleSource(todayState, householdId, role, details.sourceId) : null;
      const scenarioSource = details.sourceId ? findRoleSource(scenarioState, householdId, role, details.sourceId) : findAddedSource(todayState, scenarioState, householdId, role, null);
      const sourceLabel = `Einkommen für KiZ (${role === "partner" ? "Partner/in" : "Antragsteller/in"})`;
      const row = compareIncomeSource(sourceLabel, todaySource, scenarioSource);
      row.todayIncomeType = todaySource?.incomeType || null;
      row.scenarioIncomeType = scenarioSource?.incomeType || null;
      row.todayIncomeTypeLabel = todaySource ? incomeTypeLabel(todaySource.incomeType) : "nicht vorhanden";
      row.scenarioIncomeTypeLabel = scenarioSource ? incomeTypeLabel(scenarioSource.incomeType) : "nicht vorhanden";
      rows.push(row);
    }
    const forecastDetails = details?.wohngeld || details?.wohngeldForecast;
    if (forecastDetails && role) {
      const todayForecast = findForecastSource(todayState, householdId, role, forecastDetails.sourceId);
      const scenarioForecast = findForecastSource(scenarioState, householdId, role, forecastDetails.sourceId) || (forecastDetails.operation === "add" ? findAddedSource(todayState, scenarioState, householdId, role, null, true) : null);
      rows.push(compareForecastSource("Wohngeld-Prognosebetrag (separat)", todayForecast, scenarioForecast));
    }
    const parseHours = (value) => value === "" || value === null || value === undefined ? null : finite(Number(value));
    const todayHours = parseHours(hours?.today ?? hours?.current);
    const scenarioHours = parseHours(hours?.scenario ?? hours?.future);
    return {
      rows,
      hours: {
        today: todayHours,
        scenario: scenarioHours,
        delta: null,
        label: "Wochenstunden (informativ; nicht in Einkommen oder Leistungen umgerechnet)",
      },
      note: "Einkommensbeträge und Wohngeld-Prognosebetrag werden getrennt ausgewiesen. Dies ist kein Haushaltsnetto; Stunden werden nicht in Einkommen umgerechnet und Einkommen wird nicht zu KiZ oder Wohngeld addiert.",
    };
  }

  function compareResults(today, scenario) {
    const todayBenefits = { kiz: today?.kiz || {}, wohngeld: today?.wohngeld || {} };
    const scenarioBenefits = { kiz: scenario?.kiz || {}, wohngeld: scenario?.wohngeld || {} };
    const rows = [
      compareAmount("kiz", todayBenefits.kiz.amount, scenarioBenefits.kiz.amount, todayBenefits.kiz, scenarioBenefits.kiz),
      compareAmount("wohngeld", todayBenefits.wohngeld.amount, scenarioBenefits.wohngeld.amount, todayBenefits.wohngeld, scenarioBenefits.wohngeld),
      compareAmount("total", today?.totalMonthlyAmount, scenario?.totalMonthlyAmount, { status: today?.totalMonthlyAmount === null ? "UNRESOLVED" : "CALCULATED" }, { status: scenario?.totalMonthlyAmount === null ? "UNRESOLVED" : "CALCULATED" }),
    ];
    return {
      rows,
      total: rows.find((row) => row.key === "total"),
      comparableRows: rows.filter((row) => row.comparable),
      hasComparableTotal: rows.some((row) => row.key === "total" && row.comparable),
      incomeNote: null,
      incomeRows: [],
      incomeComparison: null,
      durationNotice: "Dauerzustand: Dieses private Szenario hat keine Zeitachse, kein Startdatum und keine monatsweise Übergangslogik. Eine künftige Datumsphase muss separat fachlich spezifiziert werden.",
    };
  }

  function describeChanges(baseState, scenarioState, changes = {}) {
    const descriptions = [];
    const householdId = changes.householdId || "A";
    const details = changes.incomeScenario || changes.jobIncome || changes.adultIncome;
    if (details?.role) {
      const household = baseState?.households?.[householdId] || {};
      const person = details.role === "partner" ? household.partner : household.person1;
      if (changes.workPercentage) descriptions.push(`${person || "Erwachsene Person"}: Arbeitszeit auf ${changes.workPercentage} % gesetzt (informative Annahme).`);
      if (details.sourceId) {
        const before = findRoleSource(baseState, householdId, details.role, details.sourceId);
        const after = findRoleSource(scenarioState, householdId, details.role, details.sourceId);
        const beforeAmount = amountFromSource(before);
        const afterAmount = amountFromSource(after);
        if (beforeAmount !== afterAmount) descriptions.push(`${person || "Erwachsene Person"}: ${AMOUNT_TYPE_LABELS[sourceAmountType(after)] || "Einkommen"} von ${beforeAmount ?? "offen"} EUR auf ${afterAmount ?? "offen"} EUR ge\u00e4ndert.`);
      }
    }
    asArray(changes.childCareChanges).forEach((change) => {
      const child = asArray(baseState?.centralChildren).find((entry) => entry.id === change.childId);
      descriptions.push(`${child?.name || "Kind"}: Betreuung ge\u00e4ndert.`);
    });
    asArray(changes.childBenefitChanges).forEach((change) => {
      const child = asArray(baseState?.centralChildren).find((entry) => entry.id === change.childId);
      descriptions.push(`${child?.name || "Kind"}: Kindergeldempf\u00e4nger ge\u00e4ndert.`);
    });
    if (changes.partner && changes.partner !== "unchanged") descriptions.push(`Partner: ${changes.partner === "remove" ? "entfernt" : "hinzugef\u00fcgt"}.`);
    if (changes.housing && Object.values(changes.housing).some((value) => value !== "" && value !== null && value !== undefined)) descriptions.push(`Wohnkosten in Haushalt ${householdId} ge\u00e4ndert.`);
    return descriptions;
  }

  function createComparison({ baseState, changes, dependencies, householdId = "A" } = {}) {
    const baseForToday = cloneState(baseState);
    const scenarioState = applyChanges(baseState, changes);
    const calculationHouseholdId = changes?.householdId || householdId;
    const today = calculateState(baseForToday, dependencies, calculationHouseholdId);
    const scenario = calculateState(scenarioState, dependencies, calculationHouseholdId);
    const comparison = compareResults(today.viewModel, scenario.viewModel);
    comparison.incomeComparison = createIncomeComparison(baseForToday, scenarioState, changes || {});
    comparison.incomeRows = comparison.incomeComparison?.rows || [];
    const incomeAmount = changes?.partner && changes.partner !== "unchanged" && changes.incomeType === "minijob"
      ? Number(changes.amount)
      : null;
    if (finite(incomeAmount) !== null && incomeAmount > 0) {
      comparison.incomeNote = `Im Vergleichsszenario wurde ein Erwerbseinkommen von ${incomeAmount} EUR angegeben. Es wird separat vom KiZ-/Wohngeld-Ergebnis ausgewiesen und ist kein Haushaltsnetto.`;
    }
    if (comparison.incomeComparison) comparison.incomeNote = comparison.incomeComparison.note;
    comparison.changeDescriptions = describeChanges(baseForToday, scenarioState, changes || {});
    return { baseState, scenarioState, today, scenario, comparison, changes: deepClone(changes || {}) };
  }

  return { cloneState, applyChanges, calculateState, compareResults, createComparison, applyIncomeScenario, applyChildCareChanges, applyChildBenefitChanges, proportionalGrossSuggestion, describeChanges, compareIncomeSource, compareForecastSource, SUPPORTED_SCENARIO_INCOME_TYPES: [...SUPPORTED_SCENARIO_INCOME_TYPES] };
});

