(function initializeValidation(root, factory) {
  const uxRelevance = typeof module !== "undefined" && module.exports ? require("./ux-relevance.js") : root?.KizUxRelevance;
  const calculator = typeof module !== "undefined" && module.exports ? require("./calculator.js") : root?.KizCalculator;
  const api = factory(uxRelevance, calculator);
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.KizValidation = api;
  }
})(typeof window !== "undefined" ? window : globalThis, function createValidationApi(uxRelevance, calculator) {
  "use strict";

  const CARE_SITUATIONS = new Set([
    "wechselmodell-50-50",
    "wechselmodell-a-external",
    "wechselmodell-b-external",
    "dauerhaft-a",
    "dauerhaft-b",
    "ueberwiegend-a",
    "ueberwiegend-b",
    "umgang-a",
    "umgang-b",
  ]);
  const MARITAL_PARTNERSHIP_STATUSES = new Set(["no", "yes", "unknown"]);
  const CHILD_INCOME_TYPES = new Set([
    "maintenance",
    "advance-maintenance",
    "orphan-pension",
    "training-wage",
    "side-job",
    "education-support",
    "voluntary-service",
    "other",
  ]);
  const CHILD_SIDE_JOB_SUBTYPES = new Set(["normal", "student-regular", "school-holiday-only", "unknown"]);
  const CHILD_EDUCATION_SUPPORT_SUBTYPES = new Set(["bafog", "bab", "scholarship", "training-allowance", "other", "unknown"]);
  const CHILD_ORPHAN_PENSION_SUBTYPES = new Set(["running", "backpay", "unknown"]);
  const CHILD_TRAINING_WAGE_SUBTYPES = new Set(["eligible-training", "other-employment", "unknown"]);
  const CHILD_VOLUNTARY_SERVICE_SUBTYPES = new Set(["pocket-money-only", "includes-other-benefits", "unknown"]);
  const CHILD_INSURANCE_STATUSES = new Set(["yes", "no", "unknown"]);
  const ADULT_INCOME_TYPES = new Set([
    "employment",
    "minijob",
    "sick-pay",
    "unemployment-1",
    "parental-allowance",
    "pension",
    "self-employed",
    "training",
    "adult-maintenance",
    "rental",
    "education-support",
    "voluntary-service",
    "state-benefit",
    "maternity-benefit",
    "sgb2-benefit",
    "other",
  ]);
  const AMOUNT_TYPES = new Set(["gross", "net", "notice", "other"]);
  const EMPLOYMENT_RELATED_INCOME_TYPES = new Set(uxRelevance?.EMPLOYMENT_RELATED_INCOME_TYPES || ["employment", "minijob", "training"]);
  const ADULT_EMPLOYMENT_TYPES = new Set(uxRelevance?.ADULT_EMPLOYMENT_TYPES || ["social-insurance", "minijob", "not-social-insurance", "not-applicable"]);
  const ADULT_INCOME_STATUSES = new Set(["unknown", "present", "none"]);
  const ENTRY_METHODS = new Set(["average", "monthly"]);
  const EXPENSE_TYPES = new Set([
    "commute",
    "public-transport",
    "car-liability",
    "childcare",
    "paid-maintenance",
    "retirement",
    "union",
    "work-expenses",
    "double-household",
    "meal-extra",
    "other",
  ]);
  const SPECIAL_SITUATION_TYPES = new Set(["pregnancy", "disability", "nutrition", "unavoidable", "other"]);
  const BENEFIT_LOCATIONS = new Set(["A", "B", "external", "unknown"]);
  const HOUSING_BENEFIT_STATUSES = new Set(["unknown", "approved", "estimated", "not-received", "none"]);
  const HOT_WATER_TYPES = new Set(["central", "decentral", "mixed", "unknown"]);
  const ASSETS_STATUSES = new Set(["no", "yes", "unknown"]);
  const COVERAGE_ASSET_STATUSES = new Set(["confirmed-none", "present", "unknown"]);
  const EXTENDED_ACCESS_SGB_BENEFIT_STATUSES = new Set(["none", "received-or-applied", "unknown"]);
  const ASSET_TYPES = new Set(["cash", "bank-account", "savings", "securities", "building-savings", "insurance-surrender-value", "vehicle", "self-used-property", "other-real-estate", "protected-retirement", "self-employed-retirement", "valuables", "other"]);
  const ASSET_OWNER_ROLES = new Set(["applicant", "partner", "child"]);
  const YES_NO_UNKNOWN = new Set(["yes", "no", "unknown"]);
  const OWNER_COST_PERIODS = new Set(["unknown", "previous-calendar-year", "recent-months"]);
  const COST_FREQUENCIES = new Set(["monthly", "quarterly", "yearly", "one-time"]);
  const WG_MIETSTUFEN = new Set(["I", "II", "III", "IV", "V", "VI", "VII", "unknown"]);
  const WG_EXCLUSION_STATUSES = new Set(["not-excluded", "excluded", "unknown"]);
  const WG_FORECAST_MODES = new Set(["same-monthly", "custom-monthly", "annual", "unknown"]);
  const WG_INCOME_STATUSES = new Set(["none", "present", "unknown"]);
  const WG_INCOME_TYPES = new Set(["employment", "minijob", "sick-pay", "unemployment-1", "parental-allowance", "maintenance", "adult-maintenance", "advance-maintenance", "self-employed", "rental", "capital", "other-tax", "kindergeld", "kinderzuschlag", "kiz"]);
  const WG_INCOME_TYPE_LABELS = {
    employment: "Beschäftigung", minijob: "Minijob", "sick-pay": "Krankengeld",
    "unemployment-1": "Arbeitslosengeld I", "parental-allowance": "Elterngeld",
    maintenance: "Kindesunterhalt", "adult-maintenance": "Erwachsenenunterhalt",
    "advance-maintenance": "Unterhaltsvorschuss", "self-employed": "selbstständige Tätigkeit",
    rental: "Vermietung", capital: "Kapitaleinkünfte", "other-tax": "sonstige steuerliche Einkünfte",
  };
  const DEDUCTIONS = [
    ["tax", "taxAmount", "Steuerabzug"],
    ["healthInsurance", "healthInsuranceAmount", "Krankenversicherungsbeitrag"],
    ["careInsurance", "careInsuranceAmount", "Pflegeversicherungsbeitrag"],
    ["pensionInsurance", "pensionInsuranceAmount", "Rentenversicherungsbeitrag"],
    ["unemploymentInsurance", "unemploymentInsuranceAmount", "Arbeitslosenversicherungsbeitrag"],
    ["otherRegular", "otherAmount", "sonstiger direkter Abzug"],
  ];

  function isBlank(value) {
    return value === undefined || value === null || String(value).trim() === "";
  }

  function isNetSickPayForecast(forecast) {
    const sources = Array.isArray(forecast?.sources) ? forecast.sources : [];
    return ["confirmed-from-current-income", "custom"].includes(forecast?.basis)
      && sources.length > 0
      && sources.every((source) => source?.type === "sick-pay"
        && (source?.details?.transferBasis === "net" || ["net", "notice"].includes(source?.amountType)));
  }

  function numberValue(value) {
    if (isBlank(value)) return null;
    const number = Number(String(value).replace(",", "."));
    return Number.isFinite(number) ? number : NaN;
  }

  function isNonNegativeNumber(value) {
    const number = numberValue(value);
    return number !== null && Number.isFinite(number) && number >= 0;
  }

  function asArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function getRelevantHouseholds(state) {
    if (state?.mode === "single") return ["A"];
    if (state?.mode === "compare") return ["A", "B"];
    return [];
  }

  function getChildrenRelevantForHousehold(state, household) {
    if (!new Set(["A", "B"]).has(household)) return [];
    return asArray(state?.centralChildren).filter(
      (child) => Array.isArray(child?.affectedHouseholds) && child.affectedHouseholds.includes(household)
    );
  }

  function expectedCareAssignment(careSituation) {
    if (careSituation === "wechselmodell-50-50") return { households: ["A", "B"], external: false };
    if (["wechselmodell-a-external"].includes(careSituation)) return { households: ["A"], external: true };
    if (["wechselmodell-b-external"].includes(careSituation)) return { households: ["B"], external: true };
    if (["dauerhaft-a", "ueberwiegend-a", "umgang-a"].includes(careSituation)) {
      return { households: ["A"], external: false };
    }
    if (["dauerhaft-b", "ueberwiegend-b", "umgang-b"].includes(careSituation)) {
      return { households: ["B"], external: false };
    }
    return { households: [], external: false };
  }

  function sameStringSet(left, right) {
    const a = [...new Set(asArray(left))].sort();
    const b = [...new Set(asArray(right))].sort();
    return a.length === b.length && a.every((value, index) => value === b[index]);
  }

  function validateCalculatorState(state) {
    const errors = [];
    const warnings = [];
    const infos = [];

    function add(severity, code, message, context = {}) {
      const item = {
        code,
        severity,
        message,
        entityType: context.entityType || "calculator",
        entityId: context.entityId ?? null,
        household: context.household ?? null,
        field: context.field ?? null,
      };
      if (context.details !== undefined) item.details = context.details;
      if (context.technicalSource !== undefined) item.technicalSource = context.technicalSource;
      if (severity === "error") errors.push(item);
      if (severity === "warning") warnings.push(item);
      if (severity === "info") infos.push(item);
    }

    if (!state || typeof state !== "object" || Array.isArray(state)) {
      add("error", "CALCULATOR_STATE_INVALID", "Die Eingabedaten haben kein gültiges Format.");
      return buildResult(errors, warnings, infos);
    }

    validateGeneral(state, add);
    const relevantHouseholds = getRelevantHouseholds(state);
    const households = state.households && typeof state.households === "object" ? state.households : {};
    const children = asArray(state.centralChildren);

    validateDuplicateIds(children, relevantHouseholds, households, add);
    relevantHouseholds.forEach((letter) => validateHousehold(households[letter], letter, children, add, state));

    children
      .filter((child) => isChildRelevantToMode(child, relevantHouseholds))
      .forEach((child, index) => validateChild(child, index, households, add));

    return buildResult(errors, warnings, infos);
  }

  function buildResult(errors, warnings, infos) {
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      infos,
      summary: {
        errorCount: errors.length,
        warningCount: warnings.length,
        infoCount: infos.length,
      },
    };
  }

  function validateGeneral(state, add) {
    const month = Number(state.applicationMonth);
    if (!Number.isInteger(month) || month < 1 || month > 12) {
      add("error", "APPLICATION_MONTH_INVALID", "Der Antragsmonat muss eine ganze Zahl zwischen 1 und 12 sein.", {
        field: "applicationMonth",
      });
    }

    const year = Number(state.applicationYear);
    if (!Number.isInteger(year) || year < 1000 || year > 9999) {
      add("error", "APPLICATION_YEAR_INVALID", "Das Antragsjahr muss eine plausible vierstellige ganze Zahl sein.", {
        field: "applicationYear",
      });
    }

    if (!new Set(["single", "compare"]).has(state.mode)) {
      add("error", "CALCULATION_MODE_INVALID", "Der ausgewählte Rechenmodus ist technisch ungültig.", {
        field: "mode",
      });
    }
  }

  function isChildRelevantToMode(child, relevantHouseholds) {
    const careSituation = child?.careSituation;
    if (CARE_SITUATIONS.has(careSituation)) {
      return expectedCareAssignment(careSituation).households.some((letter) => relevantHouseholds.includes(letter));
    }
    if (isBlank(careSituation)) return true;
    return asArray(child?.affectedHouseholds).some((letter) => relevantHouseholds.includes(letter));
  }

  function childLabel(child, index) {
    return !isBlank(child?.name) ? String(child.name).trim() : `Kind ${index + 1}`;
  }

  function householdLabel(household, letter) {
    return !isBlank(household?.label) ? String(household.label).trim() : `Haushalt ${letter}`;
  }

  function personLabel(household, letter, role) {
    const field = role === "partner" ? "partner" : "person1";
    if (!isBlank(household?.[field])) return String(household[field]).trim();
    return role === "partner" ? `Partner/in in ${householdLabel(household, letter)}` : `antragstellende Person in ${householdLabel(household, letter)}`;
  }

  function validateChild(child, index, households, add) {
    const label = childLabel(child, index);
    const context = { entityType: "child", entityId: child?.id || null };

    if (isBlank(child?.name)) {
      add("warning", "CHILD_NAME_MISSING", `Für ${label} fehlt ein Name oder eine Bezeichnung.`, {
        ...context,
        field: "name",
      });
    }

    if (isBlank(child?.age)) {
      add("error", "CHILD_AGE_MISSING", `Für ${label} fehlt das Alter.`, { ...context, field: "age" });
    } else {
      const age = Number(child.age);
      if (!Number.isInteger(age) || age < 0) {
        add("error", "CHILD_AGE_INVALID", `Für ${label} muss das Alter eine nicht negative ganze Zahl sein.`, {
          ...context,
          field: "age",
        });
      }
    }

    if (isBlank(child?.careSituation)) {
      add("error", "CHILD_CARE_SITUATION_MISSING", `Für ${label} fehlt die Betreuungssituation.`, {
        ...context,
        field: "careSituation",
      });
    } else if (!CARE_SITUATIONS.has(child.careSituation)) {
      add("error", "CHILD_CARE_SITUATION_INVALID", `Für ${label} ist die Betreuungssituation technisch ungültig.`, {
        ...context,
        field: "careSituation",
      });
    } else {
      validateCareAssignment(child, label, context, add);
    }

    const maritalPartnershipStatus = child?.maritalPartnershipStatus ?? "unknown";
    if (!MARITAL_PARTNERSHIP_STATUSES.has(maritalPartnershipStatus)) {
      add("error", "CHILD_MARITAL_PARTNERSHIP_STATUS_INVALID", `Für ${label} ist die Angabe zu Heirat oder Verpartnerung technisch ungültig.`, {
        ...context,
        field: "maritalPartnershipStatus",
      });
    } else if (maritalPartnershipStatus === "unknown") {
      add("warning", "CHILD_MARITAL_PARTNERSHIP_STATUS_UNKNOWN", `Für ${label} ist noch unbekannt, ob es verheiratet oder verpartnert ist.`, {
        ...context,
        field: "maritalPartnershipStatus",
      });
    }

    const needsDays = new Set(["umgang-a", "umgang-b"]).has(child?.careSituation);
    if (needsDays && isBlank(child?.stayDays)) {
      add("error", "CHILD_STAY_DAYS_MISSING", `Für ${label} fehlen die monatlichen Aufenthaltstage.`, {
        ...context,
        field: "stayDays",
      });
    } else if (needsDays) {
      const days = Number(child.stayDays);
      if (!Number.isInteger(days) || days < 1 || days > 12) {
        add("error", "CHILD_STAY_DAYS_INVALID", `Für ${label} müssen die Aufenthaltstage eine ganze Zahl zwischen 1 und 12 sein.`, {
          ...context,
          field: "stayDays",
        });
      }
    } else if (!isBlank(child?.stayDays)) {
      add("warning", "CHILD_UNUSED_STAY_DAYS_PRESENT", `Für ${label} sind Aufenthaltstage gespeichert, obwohl die Betreuungssituation sie nicht verwendet.`, {
        ...context,
        field: "stayDays",
      });
    }

    validateChildBenefit(child, label, households, context, add);
    validateChildFamilyNeed(child, label, households, context, add);
    validateChildIncome(child, label, context, add);
  }

  function validateChildFamilyNeed(child, label, households, context, add) {
    const hasD4Fields = ["u25RuleStageStatus", "decentralHotWaterStatus", "additionalNeedStatus", "additionalNeedMonthlyAmount"].some((field) => Object.hasOwn(child || {}, field));
    if (!hasD4Fields) return;
    const age = Number(child?.age);
    const u25Status = child?.u25RuleStageStatus ?? "unknown";
    if (!YES_NO_UNKNOWN.has(u25Status)) {
      add("error", "CHILD_U25_RULE_STAGE_STATUS_INVALID", `Für ${label} ist die Angabe zur U25-Regelbedarfsstufe technisch ungültig.`, { ...context, field: "u25RuleStageStatus" });
    } else if (Number.isInteger(age) && age >= 18 && age <= 24 && u25Status === "unknown") {
      add("warning", "CHILD_U25_RULE_STAGE_STATUS_UNKNOWN", `Für ${label} muss die einschlägige U25-Regelbedarfsstufe fachlich geklärt werden.`, { ...context, field: "u25RuleStageStatus" });
    }
    const hotWater = child?.decentralHotWaterStatus;
    if (!hotWater || typeof hotWater !== "object" || Array.isArray(hotWater)) {
      add("error", "CHILD_DECENTRAL_HOT_WATER_STATUS_INVALID", `Für ${label} fehlen gültige haushaltsbezogene Warmwasserangaben.`, { ...context, field: "decentralHotWaterStatus" });
    } else {
      asArray(child?.affectedHouseholds).forEach((letter) => {
        if (!YES_NO_UNKNOWN.has(hotWater[letter] ?? "unknown")) {
          add("error", "CHILD_DECENTRAL_HOT_WATER_STATUS_INVALID", `Für ${label} ist die Warmwasserangabe in Haushalt ${letter} technisch ungültig.`, { ...context, household: letter, field: "decentralHotWaterStatus" });
        } else if (households?.[letter]?.hotWaterType === "mixed" && (hotWater[letter] ?? "unknown") === "unknown") {
          add("warning", "CHILD_DECENTRAL_HOT_WATER_STATUS_UNKNOWN", `Für ${label} ist die tatsächliche dezentrale Warmwassererzeugung in Haushalt ${letter} ungeklärt.`, { ...context, household: letter, field: "hotWaterPerson" });
        }
      });
    }
    const additionalStatus = child?.additionalNeedStatus ?? "unknown";
    if (!YES_NO_UNKNOWN.has(additionalStatus)) {
      add("error", "CHILD_ADDITIONAL_NEED_STATUS_INVALID", `Für ${label} ist die Angabe zu weiteren laufenden Mehrbedarfen technisch ungültig.`, { ...context, field: "additionalNeedStatus" });
    } else if (additionalStatus === "unknown") {
      add("warning", "CHILD_ADDITIONAL_NEED_STATUS_UNKNOWN", `Für ${label} sind weitere anerkannte laufende Mehrbedarfe ungeklärt.`, { ...context, field: "additionalNeedStatus" });
    } else if (additionalStatus === "yes" && !isNonNegativeNumber(child?.additionalNeedMonthlyAmount)) {
      add("error", "CHILD_ADDITIONAL_NEED_AMOUNT_MISSING", `Für ${label} fehlt ein gültiger bestätigter Monatsbetrag.`, { ...context, field: "additionalNeedMonthlyAmount" });
    } else if (additionalStatus === "no" && !isBlank(child?.additionalNeedMonthlyAmount)) {
      add("warning", "CHILD_UNUSED_ADDITIONAL_NEED_AMOUNT_PRESENT", `Für ${label} ist ein Mehrbedarfsbetrag gespeichert, obwohl die Antwort Nein lautet.`, { ...context, field: "additionalNeedMonthlyAmount" });
    }
  }

  function validateCareAssignment(child, label, context, add) {
    const expected = expectedCareAssignment(child.careSituation);
    if (!Array.isArray(child.affectedHouseholds) || !sameStringSet(child.affectedHouseholds, expected.households)) {
      add("error", "CHILD_AFFECTED_HOUSEHOLDS_INVALID", `Für ${label} passt die gespeicherte Haushaltszuordnung nicht zur Betreuungssituation.`, {
        ...context,
        field: "affectedHouseholds",
      });
    }
    if (typeof child.hasExternalHousehold !== "boolean" || child.hasExternalHousehold !== expected.external) {
      add("error", "CHILD_EXTERNAL_HOUSEHOLD_MISMATCH", `Für ${label} passt die Kennzeichnung des externen Haushalts nicht zur Betreuungssituation.`, {
        ...context,
        field: "hasExternalHousehold",
      });
    }
  }

  function validateChildBenefit(child, label, households, context, add) {
    const location = child?.childBenefitAt;
    if (!BENEFIT_LOCATIONS.has(location)) {
      add("error", "CHILD_BENEFIT_LOCATION_INVALID", `Für ${label} ist der Ort des Kindergeldbezugs technisch ungültig.`, {
        ...context,
        field: "childBenefitAt",
      });
    } else if (location === "unknown") {
      add("warning", "CHILD_BENEFIT_LOCATION_UNKNOWN", `Für ${label} ist der Kindergeldbezug noch unbekannt.`, {
        ...context,
        field: "childBenefitAt",
      });
      if (!isBlank(child.childBenefitPerson)) {
        add("error", "CHILD_BENEFIT_PERSON_INVALID", `Für ${label} darf bei unbekanntem Kindergeldbezug keine Person zugeordnet sein.`, {
          ...context,
          field: "childBenefitPerson",
        });
      }
    } else if (location === "external") {
      if (child.childBenefitPerson !== "external-person") {
        add("error", "CHILD_BENEFIT_EXTERNAL_INCONSISTENT", `Für ${label} muss der externe Kindergeldbezug einer Person im anderen Haushalt zugeordnet sein.`, {
          ...context,
          field: "childBenefitPerson",
        });
      }
    } else {
      validateBenefitPersonInHousehold(child, label, location, households[location], context, add);
    }

    if (typeof child?.halfForwarded !== "boolean") {
      add("error", "CHILD_HALF_FORWARDING_INVALID", `Für ${label} ist die Angabe zur Kindergeldweiterleitung technisch ungültig.`, {
        ...context,
        field: "halfForwarded",
      });
    } else if (location === "unknown" && child.halfForwarded) {
      add("warning", "CHILD_HALF_FORWARDING_WITH_UNKNOWN_BENEFIT", `Für ${label} ist eine Weiterleitung gespeichert, obwohl der Kindergeldbezug unbekannt ist.`, {
        ...context,
        field: "halfForwarded",
      });
    }
  }

  function validateBenefitPersonInHousehold(child, label, letter, household, context, add) {
    const person = child?.childBenefitPerson;
    if (isBlank(person)) {
      add("error", "CHILD_BENEFIT_PERSON_MISSING", `Für ${label} fehlt die kindergeldberechtigte Person in Haushalt ${letter}.`, {
        ...context,
        household: letter,
        field: "childBenefitPerson",
      });
      return;
    }

    const recognized = new Set(["applicant-a", "partner-a", "applicant-b", "partner-b", "external-person"]);
    if (!recognized.has(person)) {
      add("error", "CHILD_BENEFIT_PERSON_INVALID", `Für ${label} ist die kindergeldberechtigte Person technisch ungültig.`, {
        ...context,
        household: letter,
        field: "childBenefitPerson",
      });
      return;
    }

    if (!person.endsWith(`-${letter.toLowerCase()}`)) {
      add("error", "CHILD_BENEFIT_PERSON_HOUSEHOLD_MISMATCH", `Für ${label} gehört die gespeicherte kindergeldberechtigte Person nicht zu Haushalt ${letter}.`, {
        ...context,
        household: letter,
        field: "childBenefitPerson",
      });
      return;
    }

    if (person.startsWith("partner-") && household?.adults !== "couple") {
      add("error", "CHILD_BENEFIT_PERSON_INVALID", `Für ${label} ist eine Partnerperson ausgewählt, die in Haushalt ${letter} nicht vorhanden ist.`, {
        ...context,
        household: letter,
        field: "childBenefitPerson",
      });
    }
  }

  function validateChildIncome(child, label, context, add) {
    const sources = asArray(child?.incomeSources);
    if (!CHILD_INSURANCE_STATUSES.has(child?.eligiblePrivateInsuranceStatus ?? "unknown")) {
      add("error", "CHILD_INSURANCE_STATUS_INVALID", `Für ${label} ist die Versicherungsangabe technisch ungültig.`, {
        ...context,
        field: "eligiblePrivateInsuranceStatus",
      });
    } else if (child?.hasOwnIncome === "yes" && Number(child?.age) < 18 && (child?.eligiblePrivateInsuranceStatus ?? "unknown") === "unknown") {
      add("warning", "CHILD_INSURANCE_STATUS_UNKNOWN", `Für ${label} ist bei vorhandenem Einkommen nicht geklärt, ob eine eigene angemessene private Versicherung besteht.`, {
        ...context,
        field: "eligiblePrivateInsuranceStatus",
      });
    }
    if (child?.hasOwnIncome === "unknown") {
      add("error", "CHILD_INCOME_STATUS_UNKNOWN", `Für ${label} ist noch nicht beantwortet, ob eigenes Einkommen vorhanden ist.`, {
        ...context,
        field: "hasOwnIncome",
      });
    } else if (!new Set(["yes", "no"]).has(child?.hasOwnIncome)) {
      add("error", "CHILD_INCOME_STATUS_INVALID", `Für ${label} ist die Angabe zum eigenen Einkommen technisch ungültig.`, {
        ...context,
        field: "hasOwnIncome",
      });
    } else if (child.hasOwnIncome === "no" && sources.length > 0) {
      add("error", "CHILD_INCOME_CONTRADICTION", `Für ${label} ist „kein eigenes Einkommen“ ausgewählt, obwohl Einkommensquellen gespeichert sind.`, {
        ...context,
        field: "incomeSources",
      });
    } else if (child.hasOwnIncome === "no") {
      add("info", "CHILD_NO_INCOME_ASSUMED_ZERO", `Für ${label} wurde kein eigenes Einkommen erfasst. Es werden 0 € angenommen.`, {
        ...context,
        field: "incomeSources",
      });
    } else if (sources.length === 0) {
      add("error", "CHILD_INCOME_SOURCE_MISSING", `Für ${label} ist eigenes Einkommen ausgewählt, aber keine Einkommensquelle erfasst.`, {
        ...context,
        field: "incomeSources",
      });
    }

    const seenIds = new Set();
    sources.forEach((source, index) => {
      const sourceContext = {
        entityType: "childIncomeSource",
        entityId: source?.id || null,
        field: null,
        details: { childId: child?.id || null, sourceIndex: index },
      };
      if (isBlank(source?.id)) {
        add("error", "CHILD_INCOME_ID_MISSING", `Für eine Einkommensquelle von ${label} fehlt die technische ID.`, sourceContext);
      } else if (seenIds.has(source.id)) {
        add("error", "CHILD_INCOME_DUPLICATE_ID", `Für ${label} ist die Einkommensquellen-ID „${source.id}“ doppelt vorhanden.`, sourceContext);
      } else {
        seenIds.add(source.id);
      }
      validateIncomeSource(source, label, "child", sourceContext, add);
    });
  }

  function validateIncomeSource(source, ownerLabel, ownerType, context, add) {
    const prefix = ownerType === "child" ? "CHILD" : "ADULT";
    const ownerText = ownerType === "child" ? `von ${ownerLabel}` : `für ${ownerLabel}`;
    const validTypes = ownerType === "child" ? CHILD_INCOME_TYPES : ADULT_INCOME_TYPES;

    if (source?.incomeType === "unknown") {
      add("error", `${prefix}_INCOME_TYPE_UNKNOWN`, `Die Einkommensart ${ownerText} wurde noch nicht ausgewählt.`, {
        ...context,
        field: "incomeType",
      });
    } else if (!validTypes.has(source?.incomeType)) {
      add("error", `${prefix}_INCOME_TYPE_${ownerType === "child" ? "MISSING" : "INVALID"}`, `Die Einkommensart ${ownerText} ist nicht gültig.`, {
        ...context,
        field: "incomeType",
      });
    }
    if (ownerType === "adult" && EMPLOYMENT_RELATED_INCOME_TYPES.has(source?.incomeType)) {
      if (!ADULT_EMPLOYMENT_TYPES.has(source?.employmentType)) {
        const code = source?.employmentType === "unclear" || isBlank(source?.employmentType)
          ? "ADULT_INCOME_EMPLOYMENT_TYPE_UNKNOWN"
          : "ADULT_INCOME_EMPLOYMENT_TYPE_INVALID";
        add("error", code, `Die Beschäftigungsart ${ownerText} muss ausdrücklich geklärt werden.`, {
          ...context,
          field: "employmentType",
        });
      }
    }
    if (ownerType === "child" && source?.incomeType === "side-job") {
      validateChildIncomeSubtype(
        source?.subtype ?? "unknown",
        CHILD_SIDE_JOB_SUBTYPES,
        "CHILD_SIDE_JOB_SUBTYPE_INVALID",
        "CHILD_SIDE_JOB_SUBTYPE_UNKNOWN",
        "Die Situation des Nebenjobs ist technisch ungültig.",
        "Die Situation des Nebenjobs ist unbekannt; eine Ferienjob-Ausnahme wird nicht unterstellt.",
        context,
        add
      );
    }
    if (ownerType === "child" && source?.incomeType === "education-support") {
      validateChildIncomeSubtype(
        source?.subtype ?? "unknown",
        CHILD_EDUCATION_SUPPORT_SUBTYPES,
        "CHILD_EDUCATION_SUPPORT_SUBTYPE_INVALID",
        "CHILD_EDUCATION_SUPPORT_SUBTYPE_UNKNOWN",
        "Die Art der Ausbildungsförderung ist technisch ungültig.",
        "Die Art der Ausbildungsförderung ist unbekannt und muss fachlich offen bleiben.",
        context,
        add
      );
    }
    if (ownerType === "child" && source?.incomeType === "orphan-pension") {
      validateChildIncomeSubtype(source?.subtype ?? "unknown", CHILD_ORPHAN_PENSION_SUBTYPES, "CHILD_ORPHAN_PENSION_SUBTYPE_INVALID", "CHILD_ORPHAN_PENSION_SUBTYPE_UNKNOWN", "Die Art der Waisenrentenzahlung ist technisch ungültig.", "Laufender Bezug und Nachzahlung sind noch nicht unterschieden.", context, add);
    }
    if (ownerType === "child" && source?.incomeType === "training-wage") {
      validateChildIncomeSubtype(source?.subtype ?? "unknown", CHILD_TRAINING_WAGE_SUBTYPES, "CHILD_TRAINING_WAGE_SUBTYPE_INVALID", "CHILD_TRAINING_WAGE_SUBTYPE_UNKNOWN", "Die Einordnung der Ausbildungsvergütung ist technisch ungültig.", "Die Förderfähigkeit der Ausbildung ist unbekannt.", context, add);
    }
    if (ownerType === "child" && source?.incomeType === "voluntary-service") {
      validateChildIncomeSubtype(source?.subtype ?? "unknown", CHILD_VOLUNTARY_SERVICE_SUBTYPES, "CHILD_VOLUNTARY_SERVICE_SUBTYPE_INVALID", "CHILD_VOLUNTARY_SERVICE_SUBTYPE_UNKNOWN", "Die Einordnung des Freiwilligendienstes ist technisch ungültig.", "Die Leistungsbestandteile des Freiwilligendienstes sind unbekannt.", context, add);
    }
    if (source?.incomeType === "other" && isBlank(source?.customLabel)) {
      add("error", `${prefix}_INCOME_CUSTOM_LABEL_MISSING`, `Für „Sonstiges Einkommen“ ${ownerText} fehlt eine eigene Bezeichnung.`, {
        ...context,
        field: "customLabel",
      });
    }
    if (ownerType === "adult" && source?.incomeType === "training") {
      if (!YES_NO_UNKNOWN.has(source?.u25SpecialAllowanceStatus)) {
        add("error", "ADULT_TRAINING_2B_STATUS_INVALID", "Die Angabe zum besonderen U25-Grundabsetzbetrag ist technisch ungültig.", { ...context, field: "u25SpecialAllowanceStatus" });
      } else if (source.u25SpecialAllowanceStatus === "unknown") {
        add("warning", "ADULT_TRAINING_2B_STATUS_UNKNOWN", "Die Anwendung des besonderen U25-Grundabsetzbetrags ist noch ungeklärt.", { ...context, field: "u25SpecialAllowanceStatus" });
      }
    }
    if (ownerType === "adult" && source?.incomeType === "parental-allowance") {
      if (!["basis", "plus", "unknown"].includes(source?.parentalAllowanceType)) {
        add("error", "PARENTAL_ALLOWANCE_TYPE_INVALID", "Die Elterngeldart ist technisch ungültig.", { ...context, field: "parentalAllowanceType" });
      } else if (source.parentalAllowanceType === "unknown") {
        add("warning", "PARENTAL_ALLOWANCE_TYPE_UNKNOWN", "Basiselterngeld und Elterngeld Plus sind noch nicht unterschieden.", { ...context, field: "parentalAllowanceType" });
      }
      if (isBlank(source?.confirmedExemptionMonthly)) {
        add("warning", "PARENTAL_ALLOWANCE_EXEMPTION_AMOUNT_UNKNOWN", "Der monatliche Elterngeldfreibetrag laut Bescheid oder Elterngeldstelle fehlt.", { ...context, field: "confirmedExemptionMonthly" });
      } else if (!isNonNegativeNumber(source.confirmedExemptionMonthly)) {
        add("error", "PARENTAL_ALLOWANCE_EXEMPTION_AMOUNT_INVALID", "Der bestätigte monatliche Elterngeldfreibetrag muss eine nicht negative Zahl sein.", { ...context, field: "confirmedExemptionMonthly" });
      }
    }
    if (ownerType === "adult" && source?.incomeType === "sick-pay" && source?.period !== undefined && !["monthly", "calendar-day"].includes(source.period)) {
      add("error", "ADULT_SICK_PAY_PERIOD_INVALID", "Die Einheit des Krankengeldbetrags ist technisch ungültig.", { ...context, field: "period" });
    }
    const sickPayHasSeparateAmounts = ownerType === "adult"
      && source?.incomeType === "sick-pay"
      && Object.prototype.hasOwnProperty.call(source, "netAmount");
    if (source?.amountType === "unknown" && !sickPayHasSeparateAmounts) {
      add("error", `${prefix}_INCOME_AMOUNT_TYPE_UNKNOWN`, `Der Betragstyp der Einkommensquelle ${ownerText} wurde noch nicht ausgewählt.`, {
        ...context,
        field: "amountType",
      });
    } else if (!AMOUNT_TYPES.has(source?.amountType) && !sickPayHasSeparateAmounts) {
      add("error", `${prefix}_INCOME_AMOUNT_TYPE_INVALID`, `Der Betragstyp der Einkommensquelle ${ownerText} ist ungültig.`, {
        ...context,
        field: "amountType",
      });
    } else if (ownerType === "adult" && ["employment", "minijob", "training"].includes(source?.incomeType) && source.amountType !== "gross") {
      add("error", "UNSUPPORTED_AMOUNT_TYPE", "Für diese Einkommensart wird für die KiZ-Prüfung ein Bruttobetrag benötigt.", {
        ...context,
        field: "amountType",
      });
    } else if (ownerType === "adult" && ["sick-pay", "unemployment-1", "adult-maintenance"].includes(source?.incomeType) && !(source?.incomeType === "sick-pay" && sickPayHasSeparateAmounts) && !["net", "notice"].includes(source.amountType)) {
      add("error", "UNSUPPORTED_AMOUNT_TYPE", "Für diese laufende Leistung wird für die KiZ-Prüfung der Auszahlungs- oder Bescheidbetrag benötigt.", {
        ...context,
        field: "amountType",
      });
    }
    const sickPayUsesSeparateNetSeries = ownerType === "adult"
      && source?.incomeType === "sick-pay"
      && Object.prototype.hasOwnProperty.call(source, "netAmount");
    if (sickPayUsesSeparateNetSeries) {
      validateAmountSeries(
        source.netAmount,
        `FÃ¼r ${ownerLabel} fehlt der Netto-/Zahlbetrag des Krankengeldes`,
        `${prefix}_SICK_PAY_NET`,
        { ...context, field: "netAmount" },
        add
      );
      const grossValues = asArray(source?.grossAmount?.monthlyValues);
      const grossWasEntered = !isBlank(source?.grossAmount?.monthlyAverage) || grossValues.some((value) => !isBlank(value));
      if (grossWasEntered) {
        validateAmountSeries(
          source.grossAmount,
          `Für ${ownerLabel} ist Brutto-Krankengeld eingetragen`,
          `${prefix}_SICK_PAY_GROSS`,
          { ...context, field: "grossAmount" },
          add
        );
      }
    } else if (source?.entryMethod === "unknown") {
      add("error", `${prefix}_INCOME_ENTRY_METHOD_UNKNOWN`, `Die Eingabemethode der Einkommensquelle ${ownerText} wurde noch nicht ausgewählt.`, {
        ...context,
        field: "entryMethod",
      });
    } else if (!ENTRY_METHODS.has(source?.entryMethod)) {
      add("error", `${prefix}_INCOME_ENTRY_METHOD_INVALID`, `Die Eingabemethode der Einkommensquelle ${ownerText} ist ungültig.`, {
        ...context,
        field: "entryMethod",
      });
    } else if (source.entryMethod === "average") {
      validateAverageAmount(source, ownerLabel, prefix, context, add);
    } else {
      validateMonthlyAmounts(source, ownerLabel, prefix, context, add);
    }

    if (ownerType === "adult") validateDeductions(source, ownerLabel, context, add);
    if (ownerType === "child" && isChildEarnedDeductionRequired(source)) validateChildDirectDeductions(source, ownerLabel, context, add);
  }

  function isChildEarnedDeductionRequired(source) {
    if (source?.incomeType === "training-wage") return true;
    if (source?.incomeType === "side-job") return source?.subtype !== "school-holiday-only";
    return source?.incomeType === "voluntary-service" && source?.subtype === "pocket-money-only";
  }

  function validateChildDirectDeductions(source, ownerLabel, context, add) {
    const deductions = source?.directDeductions && typeof source.directDeductions === "object" ? source.directDeductions : {};
    [["tax", "tatsächlich entrichtete Steuern"], ["socialInsurance", "Pflichtbeiträge zur Sozialversicherung"]].forEach(([field, label]) => {
      validateAmountSeries(
        deductions[field],
        `Für ${ownerLabel} fehlen ${label} (0 muss ausdrücklich eingegeben werden)`,
        field === "tax" ? "CHILD_EMPLOYMENT_TAX" : "CHILD_EMPLOYMENT_SOCIAL_INSURANCE",
        { ...context, field: `directDeductions.${field}`, details: { ...(context.details || {}), deduction: field } },
        add
      );
    });
  }

  function validateChildIncomeSubtype(subtype, allowed, invalidCode, unknownCode, invalidMessage, unknownMessage, context, add) {
    if (!allowed.has(subtype)) {
      add("error", invalidCode, invalidMessage, { ...context, field: "subtype" });
    } else if (subtype === "unknown") {
      add("warning", unknownCode, unknownMessage, { ...context, field: "subtype" });
    }
  }

  function validateAverageAmount(source, ownerLabel, prefix, context, add) {
    if (isBlank(source?.monthlyAverage)) {
      add("error", `${prefix}_INCOME_AVERAGE_MISSING`, `Für eine Einkommensquelle von ${ownerLabel} fehlt der monatliche Durchschnittsbetrag.`, {
        ...context,
        field: "monthlyAverage",
      });
    } else if (!isNonNegativeNumber(source.monthlyAverage)) {
      add("error", `${prefix}_INCOME_AMOUNT_INVALID`, `Für eine Einkommensquelle von ${ownerLabel} muss der Betrag eine nicht negative Zahl sein.`, {
        ...context,
        field: "monthlyAverage",
      });
    }
  }

  function validateMonthlyAmounts(source, ownerLabel, prefix, context, add) {
    const values = asArray(source?.monthlyValues);
    for (let index = 0; index < 6; index += 1) {
      const value = values[index];
      if (isBlank(value)) {
        add("error", `${prefix}_INCOME_MONTH_MISSING`, `Für eine Einkommensquelle von ${ownerLabel} fehlt der Betrag für Monat ${index + 1}.`, {
          ...context,
          field: `monthlyValues.${index}`,
        });
      } else if (!isNonNegativeNumber(value)) {
        add("error", `${prefix}_INCOME_AMOUNT_INVALID`, `Für eine Einkommensquelle von ${ownerLabel} ist der Betrag für Monat ${index + 1} ungültig.`, {
          ...context,
          field: `monthlyValues.${index}`,
        });
      }
    }
  }

  function validateDeductions(source, ownerLabel, context, add) {
    const deductions = source?.deductions && typeof source.deductions === "object" ? source.deductions : {};
    DEDUCTIONS.forEach(([flag, amountField, label]) => {
      const current = deductions[flag];
      const enabled = typeof current === "object" ? current.enabled === true : current === true;
      if (!enabled) return;
      if (source?.incomeType === "sick-pay" && ["healthInsurance", "careInsurance", "pensionInsurance", "unemploymentInsurance"].includes(flag) && (Object.prototype.hasOwnProperty.call(source, "netAmount") || ["net", "notice"].includes(source?.amountType))) {
        add("warning", "SICK_PAY_SOCIAL_INSURANCE_DEDUCTION_IGNORED", `${label} wird nicht nochmals abgezogen, weil der Krankengeld-Netto-/Zahlbetrag bereits nach Sozialversicherungsabzügen ausgewiesen ist.`, { ...context, field: `deductions.${flag}` });
        return;
      }
      const series = typeof current === "object"
        ? current
        : { entryMethod: "average", monthlyAverage: deductions[amountField], monthlyValues: [] };
      validateAmountSeries(
        series,
        `Für ${ownerLabel} ist ${label} aktiviert`,
        "INCOME_DEDUCTION",
        { ...context, field: `deductions.${flag}`, details: { ...(context.details || {}), deduction: flag } },
        add
      );
      if (["healthInsurance", "careInsurance", "pensionInsurance", "unemploymentInsurance"].includes(flag)) {
        if (!YES_NO_UNKNOWN.has(series?.mandatoryStatus)) {
          add("error", "SOCIAL_INSURANCE_MANDATORY_STATUS_INVALID", "Die Pflichtbeitragsangabe ist technisch ungültig.", { ...context, field: `deductions.${flag}.mandatoryStatus` });
        } else if (series.mandatoryStatus === "unknown") {
          add("warning", "SOCIAL_INSURANCE_MANDATORY_STATUS_UNKNOWN", `${label} ist noch nicht als Pflichtbeitrag bestätigt oder verneint.`, { ...context, field: `deductions.${flag}.mandatoryStatus` });
        }
      }
    });
  }

  function validateAmountSeries(series, label, codePrefix, context, add) {
    if (!new Set(["average", "monthly"]).has(series?.entryMethod)) {
      add("error", `${codePrefix}_ENTRY_METHOD_INVALID`, `${label}, aber die Eingabemethode ist ungültig.`, { ...context, field: `${context.field}.entryMethod` });
      return;
    }
    if (series.entryMethod === "average") {
      if (isBlank(series.monthlyAverage)) {
        add("error", `${codePrefix}_AMOUNT_MISSING`, `${label}, aber der monatliche Betrag fehlt.`, { ...context, field: `${context.field}.monthlyAverage` });
      } else if (!isNonNegativeNumber(series.monthlyAverage)) {
        add("error", `${codePrefix}_AMOUNT_INVALID`, `${label}; der monatliche Betrag muss eine nicht negative Zahl sein.`, { ...context, field: `${context.field}.monthlyAverage` });
      }
      return;
    }
    const values = asArray(series.monthlyValues);
    for (let index = 0; index < 6; index += 1) {
      if (isBlank(values[index])) {
        add("error", `${codePrefix}_MONTH_MISSING`, `${label}, aber der Betrag für Monat ${index + 1} fehlt.`, { ...context, field: `${context.field}.monthlyValues.${index}` });
      } else if (!isNonNegativeNumber(values[index])) {
        add("error", `${codePrefix}_AMOUNT_INVALID`, `${label}; der Betrag für Monat ${index + 1} muss eine nicht negative Zahl sein.`, { ...context, field: `${context.field}.monthlyValues.${index}` });
      }
    }
  }

  function validateHousehold(household, letter, children, add, state) {
    const label = householdLabel(household, letter);
    const context = { entityType: "household", entityId: letter, household: letter };
    if (!household || typeof household !== "object") {
      add("error", "HOUSEHOLD_DATA_MISSING", `Die Angaben für Haushalt ${letter} fehlen vollständig.`, context);
      return;
    }

    if (!new Set(["single", "couple"]).has(household.adults)) {
      add("error", "HOUSEHOLD_ADULT_TYPE_INVALID", `In ${label} ist die Haushaltsform technisch ungültig.`, {
        ...context,
        field: "adults",
      });
    }
    if (isBlank(household.person1)) {
      add("warning", "HOUSEHOLD_APPLICANT_NAME_MISSING", `In ${label} fehlt der Name der antragstellenden Person.`, {
        ...context,
        field: "person1",
      });
    }
    if (household.adults === "couple" && isBlank(household.partner)) {
      add("warning", "HOUSEHOLD_PARTNER_NAME_MISSING", `In ${label} fehlt der Name des Partners oder der Partnerin.`, {
        ...context,
        field: "partner",
      });
    }

    const partnerIncome = asArray(household.partnerIncomeSources);
    const partnerExpenses = asArray(household.partnerExpenses);
    if (household.adults === "single" && (partnerIncome.length > 0 || partnerExpenses.length > 0)) {
      add("warning", "HOUSEHOLD_UNUSED_PARTNER_DATA_PRESENT", `In ${label} sind Partnerdaten gespeichert, obwohl die Haushaltsform alleinerziehend ist. Diese Daten werden nicht verwendet.`, {
        ...context,
        field: "partnerIncomeSources",
      });
    }

    validateAdultData(household, letter, "applicant", add);
    if (household.adults === "couple") validateAdultData(household, letter, "partner", add);
    validateHousing(household, letter, add);
    validateHousingBenefit(household, letter, add);
    validateOtherResidents(household, letter, add);
    validateHotWater(household, letter, add);
    validateSpecialSituations(household, letter, add);
    validateAssets(household, letter, children, add);
    validateAdditionalNeedOverride(household, letter, add);
    validateWohngeldData(household, letter, children, add, state);
  }

  function validateAdultData(household, letter, role, add) {
    const sources = asArray(role === "partner" ? household.partnerIncomeSources : household.applicantIncomeSources);
    const expenses = asArray(role === "partner" ? household.partnerExpenses : household.applicantExpenses);
    const label = personLabel(household, letter, role);
    const statusKey = role === "partner" ? "partnerIncomeStatus" : "applicantIncomeStatus";
    const rawStatus = household?.[statusKey];
    const status = ADULT_INCOME_STATUSES.has(rawStatus) ? rawStatus : sources.length > 0 ? "present" : "unknown";
    const statusContext = {
      entityType: "adult",
      entityId: `${role}-${letter.toLowerCase()}`,
      household: letter,
      field: statusKey,
    };
    if ((!ADULT_INCOME_STATUSES.has(rawStatus) && sources.length === 0) || status === "unknown") {
      add("error", "ADULT_INCOME_STATUS_REQUIRED", `Für ${label} muss der Einkommensstatus ausdrücklich beantwortet werden.`, statusContext);
    } else if (status === "none" && sources.length > 0) {
      add("error", "ADULT_INCOME_STATUS_SOURCE_CONTRADICTION", `Für ${label} ist kein Einkommen bestätigt, obwohl Einkommensquellen gespeichert sind.`, { ...statusContext, field: "incomeSources" });
    } else if (status === "present" && sources.length === 0) {
      add("error", "ADULT_INCOME_SOURCE_MISSING", `Für ${label} ist Einkommen vorhanden ausgewählt, aber keine Einkommensquelle erfasst.`, { ...statusContext, field: "incomeSources" });
    }
    const seenIncomeIds = new Set();
    sources.forEach((source, index) => {
      const context = {
        entityType: "adultIncomeSource",
        entityId: source?.id || null,
        household: letter,
        details: { role, sourceIndex: index },
      };
      if (isBlank(source?.id)) {
        add("error", "ADULT_INCOME_ID_MISSING", `Für eine Einkommensquelle von ${label} fehlt die technische ID.`, context);
      } else if (seenIncomeIds.has(source.id)) {
        add("error", "ADULT_INCOME_DUPLICATE_ID", `In ${householdLabel(household, letter)} ist die Einkommensquellen-ID „${source.id}“ doppelt vorhanden.`, context);
      } else {
        seenIncomeIds.add(source.id);
      }
      validateIncomeSource(source, label, "adult", context, add);
    });

    validateExpenses(expenses, household, letter, role, add);
  }

  function validateExpenses(expenses, household, letter, role, add) {
    const seenIds = new Set();
    expenses.forEach((expense, index) => {
      const context = {
        entityType: "expense",
        entityId: expense?.id || null,
        household: letter,
        details: { role, expenseIndex: index },
      };
      if (isBlank(expense?.id)) {
        add("error", "EXPENSE_ID_MISSING", `In ${householdLabel(household, letter)} fehlt einer Ausgabe die technische ID.`, context);
      } else if (seenIds.has(expense.id)) {
        add("error", "EXPENSE_DUPLICATE_ID", `In ${householdLabel(household, letter)} ist die Ausgaben-ID „${expense.id}“ doppelt vorhanden.`, context);
      } else {
        seenIds.add(expense.id);
      }
      if (!EXPENSE_TYPES.has(expense?.expenseType)) {
        add("error", "EXPENSE_TYPE_INVALID", `In ${householdLabel(household, letter)} ist eine Ausgabenart technisch ungültig.`, {
          ...context,
          field: "expenseType",
        });
        return;
      }
      if (expense.expenseType === "commute" && expense.commuteMode === "details") {
        validateRequiredNonNegative(expense.distanceKm, "EXPENSE_COMMUTE_DISTANCE_MISSING", "EXPENSE_AMOUNT_INVALID", `In ${householdLabel(household, letter)} fehlt bei den Fahrtkosten die Entfernung.`, "distanceKm", context, add);
        validateRequiredNonNegative(expense.workDaysPerMonth, "EXPENSE_COMMUTE_DAYS_MISSING", "EXPENSE_AMOUNT_INVALID", `In ${householdLabel(household, letter)} fehlen bei den Fahrtkosten die Arbeitstage.`, "workDaysPerMonth", context, add);
        if (!YES_NO_UNKNOWN.has(expense.reasonablePublicTransport)) {
          add("error", "EXPENSE_PUBLIC_TRANSPORT_STATUS_INVALID", "Die Angabe zur Zumutbarkeit öffentlicher Verkehrsmittel ist ungültig.", { ...context, field: "reasonablePublicTransport" });
        } else if (expense.reasonablePublicTransport === "unknown") {
          add("warning", "EXPENSE_PUBLIC_TRANSPORT_STATUS_UNKNOWN", "Die Zumutbarkeit öffentlicher Verkehrsmittel ist noch ungeklärt.", { ...context, field: "reasonablePublicTransport" });
        } else if (expense.reasonablePublicTransport === "yes") {
          validateRequiredNonNegative(expense.monthlyPublicTransportAlternativeCost, "EXPENSE_PUBLIC_TRANSPORT_COST_MISSING", "EXPENSE_AMOUNT_INVALID", "Die monatlichen alternativen ÖPNV-Kosten fehlen.", "monthlyPublicTransportAlternativeCost", context, add);
        }
      } else {
        if (expense.expenseType === "commute" && !new Set(["amount", "details"]).has(expense.commuteMode)) {
          add("error", "EXPENSE_COMMUTE_MODE_INVALID", `In ${householdLabel(household, letter)} ist die Eingabeart der Fahrtkosten ungültig.`, {
            ...context,
            field: "commuteMode",
          });
        }
        const series = expense.entryMethod
          ? expense
          : { entryMethod: "average", monthlyAverage: expense.amount, monthlyValues: [] };
        validateAmountSeries(series, `In ${householdLabel(household, letter)} ist eine Ausgabe angelegt`, "EXPENSE", { ...context, field: "amountSeries" }, add);
      }
      const validateStatus = (value, allowed, invalidCode, unknownCode, field, label) => {
        if (!allowed.has(value)) add("error", invalidCode, `${label} ist technisch ungültig.`, { ...context, field });
        else if (value === "unknown") add("warning", unknownCode, `${label} ist noch ungeklärt.`, { ...context, field });
      };
      if (expense.expenseType === "commute" && expense.commuteMode === "amount") {
        validateStatus(expense.legalDeductibleAmountConfirmed, YES_NO_UNKNOWN, "EXPENSE_COMMUTE_CONFIRMATION_INVALID", "EXPENSE_COMMUTE_CONFIRMATION_UNKNOWN", "legalDeductibleAmountConfirmed", "Die Bestätigung des rechtlich abzugsfähigen Fahrtkostenbetrags");
      }
      if (expense.expenseType === "car-liability") {
        validateStatus(expense.liabilityOnlyConfirmed, YES_NO_UNKNOWN, "EXPENSE_CAR_LIABILITY_STATUS_INVALID", "EXPENSE_CAR_LIABILITY_STATUS_UNKNOWN", "liabilityOnlyConfirmed", "Die Bestätigung reiner Kfz-Haftpflicht");
        validateStatus(expense.proofStatus, new Set(["complete", "incomplete", "unknown"]), "EXPENSE_PROOF_STATUS_INVALID", "EXPENSE_PROOF_STATUS_UNKNOWN", "proofStatus", "Der Nachweisstatus");
      }
      if (expense.expenseType === "childcare") {
        validateStatus(expense.pureCareCostsConfirmed, YES_NO_UNKNOWN, "EXPENSE_CHILDCARE_PURE_STATUS_INVALID", "EXPENSE_CHILDCARE_PURE_STATUS_UNKNOWN", "pureCareCostsConfirmed", "Die Bestätigung reiner Betreuungskosten");
        validateStatus(expense.incomeConnectionConfirmed, YES_NO_UNKNOWN, "EXPENSE_CHILDCARE_CONNECTION_INVALID", "EXPENSE_CHILDCARE_CONNECTION_UNKNOWN", "incomeConnectionConfirmed", "Der Einkommenszusammenhang der Betreuungskosten");
      }
      if (expense.expenseType === "paid-maintenance") {
        validateStatus(expense.legalObligationConfirmed, YES_NO_UNKNOWN, "EXPENSE_MAINTENANCE_STATUS_INVALID", "EXPENSE_MAINTENANCE_STATUS_UNKNOWN", "legalObligationConfirmed", "Die gesetzliche Unterhaltsverpflichtung");
        if (expense.legalObligationConfirmed === "yes") validateRequiredNonNegative(expense.titleOrNotarialMonthlyMaximum, "EXPENSE_MAINTENANCE_MAXIMUM_MISSING", "EXPENSE_AMOUNT_INVALID", "Das titulierte oder notarielle Monatsmaximum fehlt.", "titleOrNotarialMonthlyMaximum", context, add);
      }
    });
  }

  function validateRequiredNonNegative(value, missingCode, invalidCode, missingMessage, field, context, add) {
    if (isBlank(value)) {
      add("error", missingCode, missingMessage, { ...context, field });
    } else if (!isNonNegativeNumber(value)) {
      add("error", invalidCode, "Der eingegebene Betrag beziehungsweise Wert muss eine nicht negative Zahl sein.", {
        ...context,
        field,
      });
    }
  }

  function validateHousing(household, letter, add) {
    const label = householdLabel(household, letter);
    const context = { entityType: "household", entityId: letter, household: letter };
    if (!new Set(["rent", "owner"]).has(household.housingType)) {
      add("error", "HOUSING_TYPE_INVALID", `In ${label} ist die Wohnform technisch ungültig.`, {
        ...context,
        field: "housingType",
      });
      return;
    }
    const costs = household.housingCosts && typeof household.housingCosts === "object" ? household.housingCosts : {};
    if (household.housingType === "rent") {
      const rent = costs.rent && typeof costs.rent === "object" ? costs.rent : {};
      validateHousingCost(rent.coldRent, "HOUSING_COLD_RENT_MISSING", `In ${label} fehlt die Angabe zur Kaltmiete.`, "housingCosts.rent.coldRent", context, add);
      validateHousingCost(rent.coldUtilities, "HOUSING_COLD_UTILITIES_MISSING", `In ${label} fehlt die Angabe zu den kalten Nebenkosten.`, "housingCosts.rent.coldUtilities", context, add);
      validateHousingCost(rent.heating, "HOUSING_HEATING_MISSING", `In ${label} fehlt die Angabe zu den Heizkosten.`, "housingCosts.rent.heating", context, add);
      if (Object.hasOwn(rent, "costMonth") && !/^\d{4}-(0[1-9]|1[0-2])$/.test(String(rent.costMonth))) {
        add("warning", "RENT_COST_MONTH_REQUIRED", `In ${label} muss angegeben werden, für welchen Monat die Wohnkosten gelten.`, { ...context, field: "housingCosts.rent.costMonth" });
      }
      if (Object.hasOwn(rent, "sublettingStatus") && !YES_NO_UNKNOWN.has(rent.sublettingStatus)) {
        add("error", "SUBLETTING_STATUS_INVALID", `In ${label} ist der Untervermietungsstatus ungültig.`, { ...context, field: "housingCosts.rent.sublettingStatus" });
      } else if (rent.sublettingStatus === "yes") {
        validateHousingCost(rent.sublettingAmount, "SUBLETTING_AMOUNT_MISSING", `In ${label} fehlt der monatliche Untervermietungsbetrag.`, "housingCosts.rent.sublettingAmount", context, add);
      }
      if (!isBlank(rent.parkingAmount)) {
        validateHousingCost(rent.parkingAmount, "PARKING_AMOUNT_MISSING", `In ${label} ist der Stellplatzbetrag ungültig.`, "housingCosts.rent.parkingAmount", context, add);
        if (!YES_NO_UNKNOWN.has(rent.parkingInseparableStatus)) add("error", "PARKING_STATUS_INVALID", `In ${label} ist die Stellplatzzuordnung ungültig.`, { ...context, field: "housingCosts.rent.parkingInseparableStatus" });
      }
    } else {
      const owner = costs.owner && typeof costs.owner === "object" ? costs.owner : {};
      const financingStatus = owner.financingStatus ?? (isBlank(owner.debtInterest) ? "unknown" : "yes");
      if (!["unknown", "yes", "no"].includes(financingStatus)) {
        add("error", "OWNER_FINANCING_STATUS_INVALID", `In ${label} ist die Angabe zur Immobilienfinanzierung ungültig.`, { ...context, field: "housingCosts.owner.financingStatus" });
      } else if (financingStatus === "unknown") {
        add("error", "OWNER_FINANCING_STATUS_REQUIRED", `Bitte gib für ${label} an, ob noch eine Immobilienfinanzierung läuft.`, { ...context, field: "housingCosts.owner.financingStatus" });
      } else {
        validateHousingCost(owner.debtInterest, "OWNER_DEBT_INTEREST_MISSING", `In ${label} fehlt die Angabe zu den Schuldzinsen.`, "housingCosts.owner.debtInterest", context, add);
      }
      validateHousingCost(owner.propertyTax, "OWNER_PROPERTY_TAX_MISSING", `In ${label} fehlt die Angabe zur Grundsteuer.`, "housingCosts.owner.propertyTax", context, add);
      validateHousingCost(owner.buildingInsurance, "OWNER_BUILDING_INSURANCE_MISSING", `In ${label} fehlt die Angabe zur Gebäudeversicherung.`, "housingCosts.owner.buildingInsurance", context, add);
      validateHousingCost(owner.heating, "OWNER_HEATING_MISSING", `In ${label} fehlt die Angabe zu den Heizkosten.`, "housingCosts.owner.heating", context, add);
      if (Object.hasOwn(owner, "costPeriodStatus") && !OWNER_COST_PERIODS.has(owner.costPeriodStatus)) {
        add("error", "OWNER_COST_PERIOD_INVALID", `In ${label} ist der Bezugszeitraum der Eigentumskosten ungültig.`, { ...context, field: "housingCosts.owner.costPeriodStatus" });
      }
      ["debtInterest", "propertyTax", "buildingInsurance", "heating", "otherCosts"].forEach((field) => {
        const frequencyField = `${field}Frequency`;
        if (Object.hasOwn(owner, frequencyField) && !COST_FREQUENCIES.has(owner[frequencyField])) {
          add("error", "OWNER_COST_FREQUENCY_INVALID", `In ${label} ist ein Zahlungsrhythmus ungültig.`, { ...context, field: `housingCosts.owner.${frequencyField}` });
        }
      });
      if (owner.costPeriodStatus === "recent-months") {
        const values = asArray(owner.recentMonthlyValues);
        if (!values.some((value) => !isBlank(value))) add("warning", "OWNER_RECENT_MONTH_VALUES_REQUIRED", `In ${label} fehlen die verfügbaren Monatsgesamtwerte.`, { ...context, field: "housingCosts.owner.recentMonthlyValues" });
        values.forEach((value, index) => {
          if (!isBlank(value) && !isNonNegativeNumber(value)) add("error", "OWNER_RECENT_MONTH_VALUE_INVALID", `In ${label} ist Monatswert ${index + 1} ungültig.`, { ...context, field: "housingCosts.owner.recentMonthlyValues" });
        });
      }
      if (!isBlank(owner.otherCostsAmount)) {
        if (!isNonNegativeNumber(owner.otherCostsAmount)) {
          add("error", "HOUSING_COST_INVALID", `In ${label} muss der Betrag sonstiger Eigentumskosten eine nicht negative Zahl sein.`, {
            ...context,
            field: "housingCosts.owner.otherCostsAmount",
          });
        }
        if (isNonNegativeNumber(owner.otherCostsAmount) && Number(owner.otherCostsAmount) > 0 && isBlank(owner.otherCostsDescription)) {
          add("warning", "OWNER_OTHER_COST_DESCRIPTION_MISSING", `In ${label} fehlt die Beschreibung der sonstigen Eigentumskosten.`, {
            ...context,
            field: "housingCosts.owner.otherCostsDescription",
          });
        }
      }
    }
  }

  function validateHousingCost(value, missingCode, missingMessage, field, context, add) {
    if (isBlank(value)) {
      add("error", missingCode, missingMessage, { ...context, field });
    } else if (!isNonNegativeNumber(value)) {
      add("error", "HOUSING_COST_INVALID", "Wohnkosten müssen als nicht negative Zahl eingegeben werden.", {
        ...context,
        field,
      });
    }
  }

  function validateHousingBenefit(household, letter, add) {
    const label = householdLabel(household, letter);
    const context = { entityType: "household", entityId: letter, household: letter };
    if (!HOUSING_BENEFIT_STATUSES.has(household.housingBenefitStatus)) {
      add("error", "HOUSING_BENEFIT_STATUS_INVALID", `In ${label} ist der Wohngeld-Status technisch ungültig.`, {
        ...context,
        field: "housingBenefitStatus",
      });
    } else if (household.housingBenefitStatus === "unknown") {
      add("warning", "HOUSING_BENEFIT_STATUS_UNKNOWN", `In ${label} ist der Wohngeld-Status noch unbekannt.`, {
        ...context,
        field: "housingBenefitStatus",
      });
    } else if (new Set(["approved", "estimated"]).has(household.housingBenefitStatus) && isBlank(household.housingBenefit)) {
      add("error", "HOUSING_BENEFIT_AMOUNT_MISSING", `In ${label} fehlt der Wohngeldbetrag.`, {
        ...context,
        field: "housingBenefit",
      });
    }
    if (!isBlank(household.housingBenefit) && !isNonNegativeNumber(household.housingBenefit)) {
      add("error", "HOUSING_BENEFIT_AMOUNT_INVALID", `In ${label} muss der Wohngeldbetrag eine nicht negative Zahl sein.`, {
        ...context,
        field: "housingBenefit",
      });
    }
  }

  function validateOtherResidents(household, letter, add) {
    const countContext = { entityType: "household", entityId: letter, household: letter, field: "otherResidents" };
    const statusContext = { ...countContext, field: "otherResidentsStatus" };
    const derivedStatus = ["yes", "no", "unknown"].includes(household.otherResidentsStatus)
      ? household.otherResidentsStatus
      : (isBlank(household.otherResidents) ? "unknown" : Number(household.otherResidents) === 0 ? "no" : "yes");
    if (derivedStatus === "unknown") {
      add("warning", "OTHER_RESIDENTS_UNKNOWN", `In ${householdLabel(household, letter)} ist noch unbekannt, ob weitere Menschen in der Wohnung leben.`, statusContext);
      return;
    }
    if (derivedStatus === "yes" && isBlank(household.otherResidents)) {
      add("error", "OTHER_RESIDENTS_REQUIRED", `Bitte gib für ${householdLabel(household, letter)} die Anzahl der weiteren Menschen an.`, countContext);
      return;
    }
    const value = Number(household.otherResidents);
    const minimum = derivedStatus === "yes" ? 1 : 0;
    if (!Number.isInteger(value) || value < minimum || (derivedStatus === "no" && value !== 0)) {
      add("error", "OTHER_RESIDENTS_INVALID", `In ${householdLabel(household, letter)} passt die Anzahl nicht zur Auswahl über weitere Bewohner.`, countContext);
    }
  }

  function validateHotWater(household, letter, add) {
    const context = { entityType: "household", entityId: letter, household: letter, field: "hotWaterType" };
    if (!HOT_WATER_TYPES.has(household.hotWaterType)) {
      add("error", "HOT_WATER_TYPE_INVALID", `In ${householdLabel(household, letter)} ist die Warmwasserart technisch ungültig.`, context);
    } else if (household.hotWaterType === "unknown") {
      add("warning", "HOT_WATER_TYPE_UNKNOWN", `In ${householdLabel(household, letter)} ist die Warmwassererzeugung noch unbekannt.`, context);
    } else if (household.hotWaterType === "mixed" && isBlank(household.hotWaterNote)) {
      add("warning", "HOT_WATER_MIXED_NOTE_MISSING", `In ${householdLabel(household, letter)} fehlt ein Hinweis zur gemischten Warmwassererzeugung.`, {
        ...context,
        field: "hotWaterNote",
      });
    }
    if (household.hotWaterType === "decentral" && household.decentralHotWaterAdults) {
      const roles = household.adults === "couple" ? ["applicant", "partner"] : ["applicant"];
      roles.forEach((role) => {
        if (!YES_NO_UNKNOWN.has(household.decentralHotWaterAdults?.[role])) add("error", "DECENTRAL_HOT_WATER_PERSON_STATUS_INVALID", `In ${householdLabel(household, letter)} ist die Personenzuordnung für dezentrales Warmwasser ungültig.`, { ...context, field: `decentralHotWaterAdults.${role}` });
      });
    }
  }

  function validateSpecialSituations(household, letter, add) {
    const seenIds = new Set();
    asArray(household.specialSituations).forEach((situation, index) => {
      const context = {
        entityType: "specialSituation",
        entityId: situation?.id || null,
        household: letter,
        details: { situationIndex: index },
      };
      if (isBlank(situation?.id)) {
        add("error", "SPECIAL_SITUATION_ID_MISSING", `In ${householdLabel(household, letter)} fehlt einer besonderen Situation die technische ID.`, context);
      } else if (seenIds.has(situation.id)) {
        add("error", "SPECIAL_SITUATION_DUPLICATE_ID", `In ${householdLabel(household, letter)} ist die ID „${situation.id}“ doppelt vorhanden.`, context);
      } else {
        seenIds.add(situation.id);
      }
      if (!SPECIAL_SITUATION_TYPES.has(situation?.situationType)) {
        add("error", "SPECIAL_SITUATION_TYPE_INVALID", `In ${householdLabel(household, letter)} ist eine besondere Situation technisch ungültig.`, {
          ...context,
          field: "situationType",
        });
      }
      if (Object.hasOwn(situation || {}, "personRole") && !new Set(["applicant", "partner"]).has(situation.personRole)) {
        add("error", "SPECIAL_SITUATION_PERSON_ROLE_INVALID", `In ${householdLabel(household, letter)} ist die betroffene Person ungültig.`, { ...context, field: "personRole" });
      }
      if (Object.hasOwn(situation || {}, "confirmationStatus") && !YES_NO_UNKNOWN.has(situation.confirmationStatus)) {
        add("error", "SPECIAL_SITUATION_CONFIRMATION_INVALID", `In ${householdLabel(household, letter)} ist der Bestätigungsstatus ungültig.`, { ...context, field: "confirmationStatus" });
      }
      if (situation?.situationType === "unavoidable" && Object.hasOwn(situation || {}, "recurringStatus") && !YES_NO_UNKNOWN.has(situation.recurringStatus)) {
        add("error", "SPECIAL_SITUATION_RECURRING_INVALID", `In ${householdLabel(household, letter)} ist der Status des laufenden Bedarfs ungültig.`, { ...context, field: "recurringStatus" });
      }
      if (situation?.situationType === "other" && isBlank(situation?.description)) {
        add("warning", "SPECIAL_SITUATION_DESCRIPTION_MISSING", `In ${householdLabel(household, letter)} fehlt die Beschreibung einer sonstigen besonderen Situation.`, {
          ...context,
          field: "description",
        });
      }
      if (!isBlank(situation?.monthlyAmount) && !isNonNegativeNumber(situation.monthlyAmount)) {
        add("error", "SPECIAL_SITUATION_AMOUNT_INVALID", `In ${householdLabel(household, letter)} muss der Betrag einer besonderen Situation eine nicht negative Zahl sein.`, {
          ...context,
          field: "monthlyAmount",
        });
      }
    });
  }

  function validateAssets(household, letter, children, add) {
    const context = { entityType: "household", entityId: letter, household: letter, field: "assetsStatus" };
    if (!COVERAGE_ASSET_STATUSES.has(household.coverageAssetStatus ?? "unknown")) add("error", "COVERAGE_ASSET_STATUS_INVALID", `In ${householdLabel(household, letter)} ist der Coverage-Vermögensstatus ungültig.`, { ...context, field: "coverageAssetStatus" });
    if (!EXTENDED_ACCESS_SGB_BENEFIT_STATUSES.has(household.extendedAccessSgbBenefitStatus ?? "unknown")) add("error", "EXTENDED_ACCESS_SGB_BENEFIT_STATUS_INVALID", `In ${householdLabel(household, letter)} ist der Status zu SGB-II-/SGB-XII-Leistungen ungültig.`, { ...context, field: "extendedAccessSgbBenefitStatus" });
    if (!ASSETS_STATUSES.has(household.assetsStatus)) {
      add("error", "ASSETS_STATUS_INVALID", `In ${householdLabel(household, letter)} ist der Vermögensstatus technisch ungültig.`, context);
    } else if (household.assetsStatus === "yes") {
      add("warning", "ASSETS_PRESENT_NOT_FULLY_SUPPORTED", `Vermögen wird für ${householdLabel(household, letter)} positionsbezogen geprüft; offene Schutz- oder Bewertungsfragen bleiben sichtbar.`, context);
      const persons = household.assetPersons || {};
      const relevanceState = { centralChildren: asArray(children), households: { [letter]: household } };
      const relevantChildIds = new Set((uxRelevance?.getRelevantChildrenForHousehold
        ? uxRelevance.getRelevantChildrenForHousehold(relevanceState, letter)
        : getChildrenRelevantForHousehold(relevanceState, letter)).map((child) => child?.id));
      const entries = [
        ["applicant", persons.applicant],
        ...(household.adults === "couple" ? [["partner", persons.partner]] : []),
        ...Object.entries(persons.children || {}).filter(([childId]) => relevantChildIds.has(childId)).map(([childId, person]) => [`child:${childId}`, person]),
      ];
      const assets = entries.flatMap(([personKey, person]) => asArray(person?.assets).map((asset) => ({ asset, personKey })));
      const knownChildIds = relevantChildIds;
      const seenAssetIds = new Set();
      if (!assets.length) add("error", "ASSET_DETAILS_REQUIRED", `In ${householdLabel(household, letter)} muss bei vorhandenem Vermögen mindestens eine Position erfasst werden.`, context);
      assets.forEach(({ asset, personKey }) => {
        const assetContext = { entityType: "asset", entityId: asset?.id, household: letter, field: "asset" };
        const expectedRole = personKey.startsWith("child:") ? "child" : personKey;
        if (isBlank(asset?.id) || seenAssetIds.has(asset.id)) add("error", "ASSET_ID_INVALID", "Die Vermögensposition benötigt eine eindeutige technische ID.", assetContext);
        if (!isBlank(asset?.id)) seenAssetIds.add(asset.id);
        if (!ASSET_TYPES.has(asset?.type)) add("error", "ASSET_TYPE_INVALID", "Die Vermögensart ist technisch ungültig.", assetContext);
        if (isBlank(asset?.value) || !isNonNegativeNumber(asset.value)) add("error", "ASSET_VALUE_INVALID", "Der Vermögenswert muss als nicht negative Zahl angegeben werden; leer ist nicht 0.", assetContext);
        if (!ASSET_OWNER_ROLES.has(asset?.ownerRole) || asset.ownerRole !== expectedRole) add("error", "ASSET_OWNER_INVALID", "Die Vermögensposition ist keiner gültigen Person zugeordnet.", assetContext);
        if (expectedRole === "child" && (!personKey.slice(6) || !knownChildIds.has(personKey.slice(6)))) add("error", "ASSET_CHILD_ID_REQUIRED", "Für Kindesvermögen fehlt eine gültige Kind-ID.", assetContext);
        if (!ASSETS_STATUSES.has(asset?.protectedStatus)) add("error", "ASSET_PROTECTED_STATUS_INVALID", "Der Schutzstatus der Vermögensposition ist ungültig.", assetContext);
        const details = asset?.details || {};
        if (!ASSETS_STATUSES.has(details.realizableStatus)) add("error", "ASSET_REALIZABLE_STATUS_INVALID", "Die Verwertbarkeit muss mit Ja, Nein oder Unbekannt angegeben werden.", assetContext);
        if (!ASSETS_STATUSES.has(details.incomeDoubleCountStatus)) add("error", "ASSET_INCOME_STATUS_INVALID", "Die Abgrenzung zu Einkommen muss mit Ja, Nein oder Unbekannt angegeben werden.", assetContext);
        if (asset?.type === "vehicle" && !ASSETS_STATUSES.has(details.appropriateVehicleDeclared)) add("error", "ASSET_VEHICLE_STATUS_INVALID", "Für das Fahrzeug fehlt die Angemessenheitserklärung.", assetContext);
        if (["protected-retirement", "self-employed-retirement"].includes(asset?.type) && !ASSETS_STATUSES.has(details.protectedRetirementConfirmed)) add("error", "ASSET_RETIREMENT_STATUS_INVALID", "Für die Altersvorsorge fehlt die Schutzbestätigung.", assetContext);
        if (asset?.type === "self-used-property") {
          if (!ASSETS_STATUSES.has(details.selfUsedStatus)) add("error", "ASSET_SELF_USE_STATUS_INVALID", "Für die Immobilie fehlt die Angabe zur Selbstnutzung.", assetContext);
          if (!["house", "apartment", "unknown"].includes(details.propertyType)) add("error", "ASSET_PROPERTY_TYPE_INVALID", "Die Immobilienart ist ungültig.", assetContext);
          if (isBlank(details.livingAreaSqm) || !isNonNegativeNumber(details.livingAreaSqm)) add("error", "ASSET_LIVING_AREA_INVALID", "Die Wohnfläche muss als nicht negative Zahl angegeben werden.", assetContext);
          if (isBlank(details.residentCount) || !Number.isInteger(Number(details.residentCount)) || Number(details.residentCount) < 1) add("error", "ASSET_RESIDENT_COUNT_INVALID", "Die Bewohnerzahl muss eine positive ganze Zahl sein.", assetContext);
          if (!ASSETS_STATUSES.has(details.hardshipProtection)) add("error", "ASSET_HARDSHIP_STATUS_INVALID", "Der Härtefallschutz muss mit Ja, Nein oder Unbekannt angegeben werden.", assetContext);
        }
      });
    } else if (household.assetsStatus === "unknown") {
      add("warning", "ASSETS_STATUS_UNKNOWN", `In ${householdLabel(household, letter)} ist der Vermögensstatus noch unbekannt.`, context);
    }
  }

  function validateAdditionalNeedOverride(household, letter, add) {
    if (isBlank(household.additionalNeedOverride)) return;
    const value = numberValue(household.additionalNeedOverride);
    const context = {
      entityType: "household",
      entityId: letter,
      household: letter,
      field: "additionalNeedOverride",
    };
    if (!Number.isFinite(value) || value < 0) {
      add("error", "SINGLE_PARENT_NEED_OVERRIDE_INVALID", `In ${householdLabel(household, letter)} muss der manuelle Mehrbedarf eine nicht negative Zahl sein.`, context);
    } else if (household.adults === "couple" && value !== 0) {
      add("warning", "UNUSED_SINGLE_PARENT_NEED_OVERRIDE", `In ${householdLabel(household, letter)} ist ein manueller Alleinerziehenden-Mehrbedarf gespeichert, obwohl dort ein Paar lebt. Der Wert wird nicht verwendet.`, context);
    }
  }

  function validateWohngeldData(household, letter, children, add, state) {
    const data = household?.wohngeldData;
    const context = { entityType: "wohngeld", entityId: letter, household: letter };
    if (!data || typeof data !== "object") {
      // Altdaten ohne D8B1-Block entsprechen bis zur Migration "nicht angefordert".
      return;
    }
    if (!["not-requested", "foundation", "automatic"].includes(data.calculationMode)) {
      add("error", "WG_CALCULATION_MODE_INVALID", "Der Modus der Wohngeld-Berechnung ist technisch ungültig.", { ...context, field: "wohngeldData.calculationMode" });
      return;
    }
    if (data.calculationMode === "not-requested") return;
    if (data.calculationMode === "automatic" && calculator?.evaluateCoverage) {
      const coverage = calculator.evaluateCoverage(state, letter);
      if (coverage?.housingBenefit?.basis === "NOT_NEEDED") return;
    }
    if (!["not-excluded", "excluded", "unknown"].includes(data.section20Status)) add("error", "WG_SECTION_20_STATUS_INVALID", "Der Status zur Ausbildungsförderung nach § 20 WoGG ist ungültig.", { ...context, field: "wohngeldData.section20Status" });
    if (!["not-excluded", "excluded", "unknown"].includes(data.significantAssetsStatus)) add("error", "WG_SIGNIFICANT_ASSETS_STATUS_INVALID", "Der Status zu § 21 Nummer 3 WoGG ist ungültig.", { ...context, field: "wohngeldData.significantAssetsStatus" });
    if (!WG_MIETSTUFEN.has(data.mietstufe)) add("error", "WG_MIETSTUFE_INVALID", "Die Mietstufe muss I bis VII oder unbekannt sein.", { ...context, field: "wohngeldData.mietstufe" });
    if (!["none", "simple-resident-share", "complex", "unknown"].includes(data.nonHouseholdAdjustmentStatus)) add("error", "WG_NON_HOUSEHOLD_STATUS_INVALID", "Der Wohngeld-Status für Nicht-Haushaltsmitglieder ist ungültig.", context);
    if (!YES_NO_UNKNOWN.has(data.complexUseStatus)) add("error", "WG_COMPLEX_USE_STATUS_INVALID", "Die Angabe zu gewerblich oder gemischt genutzten Flächen ist ungültig.", context);
    if (!YES_NO_UNKNOWN.has(data.singleParentAllowanceStatus)) add("error", "WG_SINGLE_PARENT_STATUS_INVALID", "Die Angabe zum Wohngeld-Alleinerziehendenfreibetrag ist ungültig.", context);

    const persons = data.persons || {};
    const personEntries = [["applicant", persons.applicant]];
    if (household.adults === "couple") personEntries.push(["partner", persons.partner]);
    const relevanceState = { centralChildren: asArray(children), households: { [letter]: household } };
    const relevantWohngeldChildren = uxRelevance?.getRelevantChildrenForWohngeld
      ? uxRelevance.getRelevantChildrenForWohngeld(relevanceState, letter)
      : getChildrenRelevantForHousehold(relevanceState, letter);
    relevantWohngeldChildren.forEach((child) => personEntries.push([
      `child:${child.id}`,
      persons.children?.[child.id],
      child.hasOwnIncome === "no",
    ]));
    personEntries.forEach(([personKey, entry, confirmedNoIncome = false]) => validateWohngeldPerson(entry, personKey, letter, add, confirmedNoIncome));

    if (household.housingType === "owner") {
      const owner = data.ownerCosts || {};
      const financingStatus = household.housingCosts?.owner?.financingStatus ?? "yes";
      const ownerFields = ["annualLeaseholdPayment", "annualPropertyTax", "annualThirdPartyAdministrationCosts"];
      if (financingStatus !== "unknown") ownerFields.push("annualInterest", "annualPrincipalRepayment", "annualLoanAncillaryCosts", "annualGuaranteeCosts");
      if (isBlank(owner.livingAreaSqm) || !isNonNegativeNumber(owner.livingAreaSqm) || Number(owner.livingAreaSqm) <= 0) add("error", "WG_OWNER_LIVING_AREA_INVALID", "Die Wohnfläche für den Lastenzuschuss muss größer als 0 sein; leer ist nicht 0.", { ...context, field: "wohngeldData.ownerCosts.livingAreaSqm" });
      ownerFields.forEach((field) => {
        if (isBlank(owner[field]) || !isNonNegativeNumber(owner[field])) add("error", "WG_OWNER_AMOUNT_INVALID", `Das Lastenzuschussfeld ${field} muss eine nicht negative Zahl enthalten; leer ist nicht 0.`, { ...context, field: `wohngeldData.ownerCosts.${field}` });
      });
      if (!isBlank(owner.annualTotalLoanPayments) && !isNonNegativeNumber(owner.annualTotalLoanPayments)) add("error", "WG_OWNER_TOTAL_LOAN_AMOUNT_INVALID", "Die Gesamt-Kreditrate muss eine nicht negative Zahl sein.", context);
    }

    asArray(data.maintenanceDeductions).forEach((entry) => {
      const entryContext = { ...context, entityType: "wohngeldMaintenance", entityId: entry?.id || null };
      if (isBlank(entry?.id)) add("error", "WG_MAINTENANCE_ID_MISSING", "Der Unterhaltsaufwendung fehlt eine technische ID.", entryContext);
      if (!["child-other-parent", "former-partner", "other-person", "away-training"].includes(entry?.type)) add("error", "WG_MAINTENANCE_TYPE_INVALID", "Die Empfängergruppe der Unterhaltsaufwendung ist ungültig.", entryContext);
      if (isBlank(entry?.annualPaidAmount) || !isNonNegativeNumber(entry.annualPaidAmount)) add("error", "WG_MAINTENANCE_AMOUNT_INVALID", "Der jährliche Unterhaltsbetrag muss eine nicht negative Zahl sein; leer ist nicht 0.", entryContext);
      if (!YES_NO_UNKNOWN.has(entry?.legalObligationStatus) || !YES_NO_UNKNOWN.has(entry?.titleStatus)) add("error", "WG_MAINTENANCE_STATUS_INVALID", "Die Statusangaben der Unterhaltsaufwendung sind ungültig.", entryContext);
      if (entry?.titleStatus === "yes" && (isBlank(entry.titleAnnualMaximum) || !isNonNegativeNumber(entry.titleAnnualMaximum))) add("error", "WG_MAINTENANCE_TITLE_AMOUNT_INVALID", "Der im Titel festgelegte Jahresbetrag muss eine nicht negative Zahl sein; leer ist nicht 0.", entryContext);
    });
  }

  function validateWohngeldPerson(entry, personKey, letter, add, confirmedNoIncome = false) {
    const context = { entityType: "wohngeldPerson", entityId: personKey, household: letter };
    if (!entry || typeof entry !== "object") {
      add("error", "WG_PERSON_DATA_MISSING", "Für eine relevante Person fehlen die Wohngeldangaben.", { ...context, field: "wohngeldExclusionStatus" });
      return;
    }
    if (!WG_EXCLUSION_STATUSES.has(entry.wohngeldExclusionStatus)) add("error", "WG_EXCLUSION_STATUS_INVALID", "Der Wohngeld-Ausschlussstatus ist ungültig.", { ...context, field: "wohngeldExclusionStatus" });
    if (!isBlank(entry.careDaysInReferenceMonth) && (!Number.isInteger(Number(entry.careDaysInReferenceMonth)) || Number(entry.careDaysInReferenceMonth) < 0 || Number(entry.careDaysInReferenceMonth) > 30)) add("error", "WG_CARE_DAYS_INVALID", "Wohngeld-Betreuungstage müssen eine ganze Zahl von 0 bis 30 sein.", { ...context, field: "careDaysInReferenceMonth" });
    if (!["unknown", "not-applicable", "confirmed-1800", "insufficient"].includes(entry.disabilityAllowanceStatus)) add("error", "WG_DISABILITY_STATUS_INVALID", "Der Status zum Behindertenfreibetrag ist ungültig.", context);
    if (!YES_NO_UNKNOWN.has(entry.nsPersecutionStatus) || !YES_NO_UNKNOWN.has(entry.wohngeldGrundrentenTimesStatus)) add("error", "WG_ALLOWANCE_STATUS_INVALID", "Ein Wohngeld-Freibetragsstatus ist ungültig.", context);
    if (confirmedNoIncome) return;
    const forecast = entry.incomeForecast || {};
    if (Object.hasOwn(forecast, "basis") && !["unknown", "confirmed-from-current-income", "custom"].includes(forecast.basis)) {
      add("error", "WG_INCOME_BASIS_INVALID", "Die Grundlage der Wohngeld-Prognose ist technisch ungültig.", { ...context, field: "incomeForecastBasis" });
      return;
    }
    if (forecast.basis === "unknown") {
      add("error", "WG_INCOME_BASIS_REQUIRED", "Bitte entscheide, ob das aktuelle Einkommen übernommen oder eine andere Wohngeld-Prognose angegeben wird.", { ...context, field: "incomeForecastBasis" });
      return;
    }
    if (!WG_INCOME_STATUSES.has(forecast.incomeStatus)) add("error", "WG_INCOME_STATUS_INVALID", "Der Wohngeld-Prognosestatus ist ungültig.", { ...context, field: "incomeStatus" });
    if (forecast.incomeStatus !== "present") return;
    if (!WG_FORECAST_MODES.has(forecast.mode) || forecast.mode === "unknown") add("error", "WG_FORECAST_MODE_INVALID", "Für vorhandenes Wohngeld-Einkommen fehlt eine gültige Prognoseart.", context);
    if (!isNetSickPayForecast(forecast)) {
      ["taxExpected", "healthCareContributionExpected", "pensionContributionExpected"].forEach((field) => {
        if (!YES_NO_UNKNOWN.has(forecast[field])) add("error", "WG_PERCENTAGE_STATUS_INVALID", "Ein §-16-Status ist technisch ungültig.", { ...context, field });
        else if (forecast[field] === "unknown") add("error", "WG_PERCENTAGE_DEDUCTION_STATUS_REQUIRED", "Bitte bestätige für die automatische Wohngeldberechnung Ja oder Nein.", { ...context, field });
      });
    }
    if (asArray(forecast.sources).length === 0) add("error", "WG_INCOME_SOURCE_MISSING", "Bei vorhandenem Wohngeld-Einkommen fehlt eine Prognosequelle.", context);
    asArray(forecast.sources).forEach((source) => validateWohngeldIncomeSource(source, forecast.mode, context, add));
  }

  function validateWohngeldIncomeSource(source, mode, personContext, add) {
    const context = { ...personContext, entityType: "wohngeldIncomeSource", entityId: source?.id || null, technicalSource: source?.type || "unknown" };
    if (isBlank(source?.id)) add("error", "WG_INCOME_SOURCE_ID_MISSING", "Der Wohngeld-Prognosequelle fehlt eine technische ID.", { ...context, field: "type" });
    if (!WG_INCOME_TYPES.has(source?.type)) add("error", "WG_INCOME_TYPE_INVALID", "Bitte wähle die Einkommensart für diese Wohngeld-Prognosequelle aus.", { ...context, field: "type" });
    const directAmountType = !["self-employed", "rental", "capital", "other-tax", "kindergeld", "kinderzuschlag", "kiz"].includes(source?.type);
    const incomeLabel = WG_INCOME_TYPE_LABELS[source?.type] || "diese Einkommensquelle";
    if (directAmountType && mode === "same-monthly" && (isBlank(source.expectedMonthlyAmount) || !isNonNegativeNumber(source.expectedMonthlyAmount))) add("error", "WG_MONTHLY_FORECAST_AMOUNT_INVALID", `Bitte gib den erwarteten monatlichen Betrag für ${incomeLabel} an.`, { ...context, field: "expectedMonthlyAmount", details: "Der erwartete Monatsbetrag muss eine nicht negative Zahl sein; leer ist nicht 0." });
    if (directAmountType && mode === "annual" && (isBlank(source.expectedAnnualAmount) || !isNonNegativeNumber(source.expectedAnnualAmount))) add("error", "WG_ANNUAL_FORECAST_AMOUNT_INVALID", `Bitte gib den erwarteten jährlichen Betrag für ${incomeLabel} an.`, { ...context, field: "expectedAnnualAmount" });
    if (directAmountType && mode === "custom-monthly") {
      const months = asArray(source.monthlyValues);
      for (let index = 0; index < 12; index += 1) if (isBlank(months[index]) || !isNonNegativeNumber(months[index])) add("error", "WG_CUSTOM_MONTH_AMOUNT_INVALID", `Der Wohngeld-Prognosebetrag für Monat ${index + 1} muss eine nicht negative Zahl sein; leer ist nicht 0.`, { ...context, field: `monthlyValues.${index}` });
    }
    if (source?.type === "minijob" && (isBlank(source.confirmedAnnualWorkExpenses) || !isNonNegativeNumber(source.confirmedAnnualWorkExpenses))) add("error", "WG_MINIJOB_EXPENSES_INVALID", "Bestätigte Minijob-Aufwendungen müssen als nicht negative Zahl erfasst werden; 0 muss ausdrücklich eingetragen sein.", context);
    if (source?.type === "self-employed" && (isBlank(source.confirmedExpectedAnnualTaxProfit) || !isNonNegativeNumber(source.confirmedExpectedAnnualTaxProfit))) add("error", "WG_SELF_EMPLOYED_PROFIT_INVALID", "Der bestätigte erwartete Jahresgewinn muss eine nicht negative Zahl sein; leer ist nicht 0.", context);
    if (["rental", "capital", "other-tax"].includes(source?.type) && (isBlank(source.confirmedExpectedAnnualPositiveTaxIncome) || !isNonNegativeNumber(source.confirmedExpectedAnnualPositiveTaxIncome))) add("error", "WG_POSITIVE_TAX_INCOME_INVALID", "Die bestätigte positive steuerliche Jahreseinkunft muss eine nicht negative Zahl sein; leer ist nicht 0.", context);
    if (source?.type === "parental-allowance" && (isBlank(source.confirmedParentalAllowanceExemptionAnnual) || !isNonNegativeNumber(source.confirmedParentalAllowanceExemptionAnnual))) add("error", "WG_PARENTAL_EXEMPTION_INVALID", "Der bestätigte Elterngeldfreibetrag muss eine nicht negative Zahl sein; leer ist nicht 0.", context);
    ["confirmedHigherAnnualWorkExpenses", "actualAnnualTaxAmount"].forEach((field) => {
      if (!isBlank(source?.[field]) && !isNonNegativeNumber(source[field])) add("error", "WG_OPTIONAL_AMOUNT_INVALID", "Ein optionaler Wohngeld-Betrag muss eine nicht negative Zahl sein.", { ...context, field });
    });
  }

  function validateDuplicateIds(children, relevantHouseholds, households, add) {
    addDuplicateMessages(children, (child) => child?.id, "DUPLICATE_CHILD_ID", "Kind", add, {
      entityType: "child",
    });

    const situations = [];
    relevantHouseholds.forEach((letter) => {
      const household = households?.[letter] || {};
      asArray(household.specialSituations).forEach((situation) => situations.push(situation));
    });
    addDuplicateMessages(situations, (situation) => situation?.id, "DUPLICATE_SPECIAL_SITUATION_ID", "besondere Situation", add, {
      entityType: "specialSituation",
    });
  }

  function addDuplicateMessages(items, getId, code, label, add, baseContext) {
    const seen = new Set();
    const reported = new Set();
    items.forEach((item) => {
      const id = getId(item);
      if (isBlank(id)) return;
      if (seen.has(id) && !reported.has(id)) {
        add("error", code, `Die technische ID „${id}“ ist für mindestens eine ${label} doppelt vorhanden.`, {
          ...baseContext,
          entityId: id,
        });
        reported.add(id);
      }
      seen.add(id);
    });
  }

  return {
    validateCalculatorState,
    isNetSickPayForecast,
    getRelevantHouseholds,
    getChildrenRelevantForHousehold,
    ADULT_INCOME_TYPES: [...ADULT_INCOME_TYPES],
    WG_INCOME_TYPES: [...WG_INCOME_TYPES],
    WG_INCOME_TYPE_LABELS: { ...WG_INCOME_TYPE_LABELS },
  };
});
