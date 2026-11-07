(function initializeCalculationRules(root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.KizCalculationRules = api;
  }
})(typeof window !== "undefined" ? window : globalThis, function createCalculationRulesApi() {
  "use strict";

  const RULE_ID = "KIZ-CHILD-001";
  const RULE_IDS = Object.freeze({
    household: "KIZ-HH-001",
    child: RULE_ID,
    childBenefit: "KIZ-KG-001",
    sharedCare: "KIZ-WM-001",
    externalSharedCare: "KIZ-WM-EXT-001",
    residence: "KIZ-RESIDENCE-001",
    contact: "KIZ-CONTACT-001",
  });

  const CARE_METADATA = Object.freeze({
    "wechselmodell-50-50": Object.freeze({
      households: Object.freeze(["A", "B"]),
      residenceClassification: "SHARED_50_50",
      inferredDayClassification: "DAYS_13_17",
      temporaryResidence: true,
    }),
    "wechselmodell-a-external": Object.freeze({
      households: Object.freeze(["A"]),
      residenceClassification: "EXTERNAL_SHARED_50_50",
      inferredDayClassification: "DAYS_13_17",
      temporaryResidence: true,
    }),
    "wechselmodell-b-external": Object.freeze({
      households: Object.freeze(["B"]),
      residenceClassification: "EXTERNAL_SHARED_50_50",
      inferredDayClassification: "DAYS_13_17",
      temporaryResidence: true,
    }),
    "dauerhaft-a": Object.freeze({
      households: Object.freeze(["A"]),
      residenceClassification: "PERMANENT_IN_HOUSEHOLD",
      inferredDayClassification: "FULL_TIME",
      temporaryResidence: false,
    }),
    "dauerhaft-b": Object.freeze({
      households: Object.freeze(["B"]),
      residenceClassification: "PERMANENT_IN_HOUSEHOLD",
      inferredDayClassification: "FULL_TIME",
      temporaryResidence: false,
    }),
    "ueberwiegend-a": Object.freeze({
      households: Object.freeze(["A"]),
      residenceClassification: "PREDOMINANT_IN_HOUSEHOLD",
      inferredDayClassification: "DAYS_18_PLUS",
      temporaryResidence: false,
    }),
    "ueberwiegend-b": Object.freeze({
      households: Object.freeze(["B"]),
      residenceClassification: "PREDOMINANT_IN_HOUSEHOLD",
      inferredDayClassification: "DAYS_18_PLUS",
      temporaryResidence: false,
    }),
    "umgang-a": Object.freeze({
      households: Object.freeze(["A"]),
      residenceClassification: "CONTACT_1_12",
      inferredDayClassification: "DAYS_1_12",
      temporaryResidence: true,
    }),
    "umgang-b": Object.freeze({
      households: Object.freeze(["B"]),
      residenceClassification: "CONTACT_1_12",
      inferredDayClassification: "DAYS_1_12",
      temporaryResidence: true,
    }),
  });

  const FAMILY_STATUS_OPEN_CHECKS = Object.freeze([
    "CHILD_OWN_CHILD_STATUS_NOT_CAPTURED",
    "CHILD_OWN_PARTNER_HOUSEHOLD_STATUS_NOT_CAPTURED",
  ]);

  function warning(code, message, field = null) {
    return { code, message, field };
  }

  function normalizeAge(value) {
    if (value === "" || value === null || value === undefined) return null;
    const age = Number(value);
    return Number.isInteger(age) && age >= 0 ? age : null;
  }

  function classifyConcreteStayDays(value) {
    if (value === "" || value === null || value === undefined) return null;
    const days = Number(value);
    if (!Number.isInteger(days) || days < 0) return null;
    if (days <= 12) return "DAYS_1_12";
    if (days <= 17) return "DAYS_13_17";
    return "DAYS_18_PLUS";
  }

  function getRelevantHouseholds(state) {
    if (state?.mode === "single") return ["A"];
    if (state?.mode === "compare") return ["A", "B"];
    return [];
  }

  function evaluateChildRelevanceForHousehold(child, householdId) {
    const safeChild = child && typeof child === "object" ? child : {};
    const childId = typeof safeChild.id === "string" ? safeChild.id : "";
    const reasons = [];
    const warnings = [];
    const exclusionReasons = [];
    const openChecks = [];
    const supportedHousehold = householdId === "A" || householdId === "B";
    const care = CARE_METADATA[safeChild.careSituation] || null;
    const affectedHouseholds = Array.isArray(safeChild.affectedHouseholds) ? safeChild.affectedHouseholds : [];

    if (!supportedHousehold) {
      warnings.push(warning("HOUSEHOLD_ID_UNSUPPORTED", "KIZ-CHILD-001 unterstützt ausschließlich die betrachteten Haushalte A und B.", "householdId"));
    }
    if (!care) {
      warnings.push(warning("CHILD_CARE_SITUATION_UNSUPPORTED", "Die Betreuungssituation kann durch KIZ-CHILD-001 nicht klassifiziert werden.", "careSituation"));
    }

    const careAssignsHousehold = Boolean(care && supportedHousehold && care.households.includes(householdId));
    const affectedAssignsHousehold = supportedHousehold && affectedHouseholds.includes(householdId);
    const isRelevantForHousehold = careAssignsHousehold && affectedAssignsHousehold;

    if (care && careAssignsHousehold !== affectedAssignsHousehold) {
      warnings.push(
        warning(
          "CHILD_HOUSEHOLD_ASSIGNMENT_INCONSISTENT",
          "Betreuungssituation und gespeicherte Haushaltszuordnung widersprechen sich. Die fachliche Klassifikation bleibt für diesen Haushalt negativ.",
          "affectedHouseholds"
        )
      );
    }

    if (isRelevantForHousehold) {
      reasons.push("Kind lebt (auch zeitweise) in diesem Haushalt.");
    } else {
      reasons.push("Kind ist diesem Haushalt nicht konsistent zugeordnet.");
      exclusionReasons.push("NOT_RELEVANT_FOR_HOUSEHOLD");
    }

    const belongsToChildBenefitHousehold = supportedHousehold && safeChild.childBenefitAt === householdId;
    const benefitKnown = safeChild.childBenefitAt === "A" || safeChild.childBenefitAt === "B" || safeChild.childBenefitAt === "external";
    if (belongsToChildBenefitHousehold) {
      reasons.push("Der Kindergeldbezug ist diesem Haushalt zugeordnet.");
    } else if (safeChild.childBenefitAt === "unknown") {
      warnings.push(
        warning(
          "CHILD_BENEFIT_LOCATION_UNKNOWN",
          "Der Kindergeldbezug ist unbekannt; eine sichere Zuordnung als mögliches eigenes KiZ-Kind ist nicht möglich.",
          "childBenefitAt"
        )
      );
      exclusionReasons.push("CHILD_BENEFIT_LOCATION_UNKNOWN");
    } else if (safeChild.childBenefitAt === "external") {
      reasons.push("Der Kindergeldbezug liegt in einem externen Haushalt.");
      exclusionReasons.push("CHILD_BENEFIT_IN_EXTERNAL_HOUSEHOLD");
    } else if (safeChild.childBenefitAt === "A" || safeChild.childBenefitAt === "B") {
      reasons.push("Nur der kindergeldberechtigte Haushalt kann KiZ für dieses Kind beziehen.");
      exclusionReasons.push("CHILD_BENEFIT_IN_OTHER_HOUSEHOLD");
    } else {
      warnings.push(warning("CHILD_BENEFIT_LOCATION_UNSUPPORTED", "Der technische Wert des Kindergeldbezugs wird nicht unterstützt.", "childBenefitAt"));
      exclusionReasons.push("CHILD_BENEFIT_LOCATION_INVALID");
    }

    const age = normalizeAge(safeChild.age);
    if (age === null) {
      warnings.push(warning("CHILD_AGE_INVALID_FOR_CLASSIFICATION", "Das Alter ist für die fachliche Klassifikation nicht verwertbar.", "age"));
      exclusionReasons.push("AGE_INVALID");
    } else if (age >= 25) {
      reasons.push("Das Kind scheidet wegen eines Alters von 25 Jahren oder mehr als mögliches eigenes KiZ-Kind aus.");
      exclusionReasons.push("AGE_25_OR_OLDER");
    }

    const maritalPartnershipStatus = safeChild.maritalPartnershipStatus ?? "unknown";
    if (maritalPartnershipStatus === "yes") {
      exclusionReasons.push("CHILD_MARRIED_OR_PARTNERED");
      reasons.push("Das Kind ist verheiratet oder verpartnert und kommt deshalb nicht als eigenes KiZ-Kind in Betracht.");
    } else if (maritalPartnershipStatus === "unknown") {
      openChecks.push("CHILD_MARITAL_PARTNERSHIP_STATUS_REVIEW_REQUIRED");
      warnings.push(
        warning(
          "CHILD_MARITAL_PARTNERSHIP_STATUS_UNKNOWN",
          "Es ist unbekannt, ob das Kind verheiratet oder verpartnert ist.",
          "maritalPartnershipStatus"
        )
      );
    } else if (maritalPartnershipStatus !== "no") {
      exclusionReasons.push("CHILD_MARITAL_PARTNERSHIP_STATUS_INVALID");
      warnings.push(
        warning(
          "CHILD_MARITAL_PARTNERSHIP_STATUS_INVALID",
          "Der technische Wert zu Heirat oder Verpartnerung wird nicht unterstützt.",
          "maritalPartnershipStatus"
        )
      );
    }

    if (isRelevantForHousehold && age !== null && age < 25) {
      openChecks.push(...FAMILY_STATUS_OPEN_CHECKS);
      warnings.push(
        warning(
          "CHILD_REMAINING_FAMILY_STATUS_NOT_CAPTURED",
          "Ein eigenes Kind des Kindes und das Zusammenleben mit einem eigenen Partner werden noch nicht erfasst.",
          null
        )
      );
    }

    const isPotentialOwnKizChildForThisHousehold =
      isRelevantForHousehold &&
      belongsToChildBenefitHousehold &&
      age !== null &&
      age < 25 &&
      maritalPartnershipStatus === "no";

    if (isPotentialOwnKizChildForThisHousehold) {
      reasons.push("Das Kind kommt nach den derzeit erfassbaren Merkmalen als mögliches eigenes KiZ-Kind dieses Haushalts in Betracht.");
    } else if (isRelevantForHousehold && !belongsToChildBenefitHousehold && benefitKnown) {
      reasons.push("Das Kind ist in diesem Haushalt nur für spätere Bedarfswirkungen zu berücksichtigen.");
    }

    const isTemporaryOrNeedRelevantOnly =
      isRelevantForHousehold && !belongsToChildBenefitHousehold && benefitKnown;

    const concreteDayClassification = classifyConcreteStayDays(safeChild.stayDays);
    const dayClassification = concreteDayClassification || care?.inferredDayClassification || "NOT_CAPTURED";

    return {
      ruleId: RULE_ID,
      childId,
      householdId,
      isRelevantForHousehold,
      isPotentialOwnKizChildForThisHousehold,
      isTemporaryOrNeedRelevantOnly,
      residenceClassification: isRelevantForHousehold ? care.residenceClassification : "NOT_RELEVANT_FOR_HOUSEHOLD",
      dayClassification,
      belongsToChildBenefitHousehold,
      exclusionReasons,
      openChecks,
      reasons,
      warnings,
    };
  }

  function evaluateChildBenefitAssignment(child, householdId) {
    const safeChild = child && typeof child === "object" ? child : {};
    const supportedHousehold = householdId === "A" || householdId === "B";
    const location = safeChild.childBenefitAt;
    const knownLocation = location === "A" || location === "B" || location === "external";
    const belongsToChildBenefitHousehold = supportedHousehold && location === householdId;
    const warnings = [];
    const openChecks = [];
    const reasons = [];

    if (!supportedHousehold) {
      warnings.push(warning("HOUSEHOLD_ID_UNSUPPORTED", "KIZ-KG-001 unterstützt ausschließlich Haushalt A oder B.", "householdId"));
    }
    if (belongsToChildBenefitHousehold) {
      reasons.push("Der Kindergeldbezug ist dem betrachteten Haushalt zugeordnet.");
    } else if (location === "external") {
      reasons.push("Der Kindergeldbezug liegt außerhalb der betrachteten Haushalte.");
    } else if (location === "unknown") {
      warnings.push(warning("CHILD_BENEFIT_LOCATION_UNKNOWN", "Der Kindergeldbezug ist unbekannt; eine positive KiZ-Zuordnung ist nicht möglich.", "childBenefitAt"));
      openChecks.push("CHILD_BENEFIT_LOCATION_REVIEW_REQUIRED");
    } else if (location === "A" || location === "B") {
      reasons.push("Der Kindergeldbezug liegt im anderen betrachteten Haushalt.");
    } else {
      warnings.push(warning("CHILD_BENEFIT_LOCATION_UNSUPPORTED", "Der technische Wert des Kindergeldbezugs wird nicht unterstützt.", "childBenefitAt"));
      openChecks.push("CHILD_BENEFIT_LOCATION_REVIEW_REQUIRED");
    }

    return {
      ruleId: RULE_IDS.childBenefit,
      childId: typeof safeChild.id === "string" ? safeChild.id : "",
      householdId,
      childBenefitLocation: location || "unknown",
      belongsToChildBenefitHousehold,
      isOwnKizPossibleByChildBenefit: belongsToChildBenefitHousehold,
      childBenefitPersonId: knownLocation ? safeChild.childBenefitPerson || "" : "",
      externalChildBenefitPerson: location === "external" ? safeChild.externalChildBenefitPerson || "" : "",
      halfForwarded: safeChild.halfForwarded === true,
      childBenefitSgbCheckFactor: safeChild.halfForwarded === true ? 0.5 : 1,
      warnings,
      openChecks,
      reasons,
    };
  }

  function isSingleAdultHousehold(state, householdId) {
    return state?.households?.[householdId]?.adults === "single";
  }

  function hasPermanentChildAlongsideSharedCare(state, householdId, currentChildId) {
    const permanentCare = householdId === "A" ? "dauerhaft-a" : "dauerhaft-b";
    return Array.isArray(state?.centralChildren) && state.centralChildren.some(
      (child) => child?.id !== currentChildId && child?.careSituation === permanentCare && child?.affectedHouseholds?.includes(householdId)
    );
  }

  function singleParentModeForSharedCare(state, householdId, childId) {
    if (!isSingleAdultHousehold(state, householdId)) return "NOT_APPLICABLE";
    return hasPermanentChildAlongsideSharedCare(state, householdId, childId) ? "AVERAGE_REQUIRED" : "HALF";
  }

  function classificationRuleId(careSituation) {
    if (careSituation === "wechselmodell-50-50") return RULE_IDS.sharedCare;
    if (careSituation === "wechselmodell-a-external" || careSituation === "wechselmodell-b-external") return RULE_IDS.externalSharedCare;
    if (["dauerhaft-a", "dauerhaft-b", "ueberwiegend-a", "ueberwiegend-b"].includes(careSituation)) return RULE_IDS.residence;
    if (careSituation === "umgang-a" || careSituation === "umgang-b") return RULE_IDS.contact;
    return RULE_IDS.child;
  }

  function emptyNeedClassification(relevance, ruleId) {
    return {
      ruleId,
      childId: relevance.childId,
      householdId: relevance.householdId,
      isRelevantForHousehold: false,
      isPotentialOwnKizChild: false,
      isTemporaryBgMember: false,
      residenceType: relevance.residenceClassification,
      dayClassification: relevance.dayClassification,
      regularNeedMode: "NONE",
      childAdditionalNeedMode: "NONE",
      housingNeedMode: "NONE",
      singleParentAdditionalNeedMode: "NONE",
      regularNeedFactor: 0,
      childAdditionalNeedFactor: 0,
      housingNeedFactor: 0,
      requiresExactStayDays: false,
      reasons: [...relevance.reasons],
      warnings: [...relevance.warnings],
      openChecks: [...relevance.openChecks],
    };
  }

  function evaluateChildNeedClassification(child, householdId, state = {}) {
    const safeChild = child && typeof child === "object" ? child : {};
    const relevance = evaluateChildRelevanceForHousehold(safeChild, householdId);
    const childBenefit = evaluateChildBenefitAssignment(safeChild, householdId);
    const ruleId = classificationRuleId(safeChild.careSituation);
    if (!relevance.isRelevantForHousehold) return emptyNeedClassification(relevance, ruleId);

    const result = {
      ruleId,
      childId: relevance.childId,
      householdId,
      isRelevantForHousehold: true,
      isPotentialOwnKizChild: relevance.isPotentialOwnKizChildForThisHousehold,
      isTemporaryBgMember: relevance.isTemporaryOrNeedRelevantOnly,
      residenceType: relevance.residenceClassification,
      dayClassification: relevance.dayClassification,
      regularNeedMode: "UNRESOLVED",
      childAdditionalNeedMode: "UNRESOLVED",
      housingNeedMode: "UNRESOLVED",
      singleParentAdditionalNeedMode: "NOT_APPLICABLE",
      regularNeedFactor: null,
      childAdditionalNeedFactor: null,
      housingNeedFactor: null,
      requiresExactStayDays: false,
      reasons: [...relevance.reasons, ...childBenefit.reasons],
      warnings: [...relevance.warnings, ...childBenefit.warnings],
      openChecks: [...new Set([...relevance.openChecks, ...childBenefit.openChecks])],
    };

    if (["wechselmodell-50-50", "wechselmodell-a-external", "wechselmodell-b-external"].includes(safeChild.careSituation)) {
      result.regularNeedMode = "HALF";
      result.childAdditionalNeedMode = "HALF";
      result.housingNeedMode = "FULL";
      result.regularNeedFactor = 0.5;
      result.childAdditionalNeedFactor = 0.5;
      result.housingNeedFactor = 1;
      result.singleParentAdditionalNeedMode = singleParentModeForSharedCare(state, householdId, relevance.childId);
      return result;
    }

    if (["dauerhaft-a", "dauerhaft-b", "ueberwiegend-a", "ueberwiegend-b"].includes(safeChild.careSituation)) {
      if (!childBenefit.belongsToChildBenefitHousehold) {
        const code = safeChild.careSituation.startsWith("ueberwiegend-")
          ? "PREDOMINANT_RESIDENCE_CHILD_BENEFIT_MISMATCH"
          : "PERMANENT_RESIDENCE_CHILD_BENEFIT_MISMATCH";
        result.warnings.push(warning(code, "Die bestätigte Vollbedarfsregel setzt hier den Kindergeldbezug im Aufenthalts-Haushalt voraus.", "childBenefitAt"));
        result.openChecks.push(code);
        return result;
      }
      result.regularNeedMode = "FULL";
      result.childAdditionalNeedMode = "FULL";
      result.housingNeedMode = "FULL";
      result.regularNeedFactor = 1;
      result.childAdditionalNeedFactor = 1;
      result.housingNeedFactor = 1;
      result.singleParentAdditionalNeedMode = isSingleAdultHousehold(state, householdId) ? "FULL" : "NOT_APPLICABLE";
      return result;
    }

    if (safeChild.careSituation === "umgang-a" || safeChild.careSituation === "umgang-b") {
      result.requiresExactStayDays = true;
      result.singleParentAdditionalNeedMode = "NONE";
      if (childBenefit.belongsToChildBenefitHousehold) {
        const code = "CONTACT_DAYS_CHILD_BENEFIT_HOUSEHOLD_UNRESOLVED";
        result.warnings.push(warning(code, "Die bestätigte 1-bis-12-Tage-Regel beschreibt den nicht kindergeldberechtigten Elternteil.", "childBenefitAt"));
        result.openChecks.push(code);
        return result;
      }
      const days = Number(safeChild.stayDays);
      if (!Number.isInteger(days) || days < 1 || days > 12) {
        const code = "CONTACT_STAY_DAYS_INVALID_FOR_FACTOR";
        result.warnings.push(warning(code, "Für die Faktorbildung werden 1 bis 12 ganze Aufenthaltstage benötigt.", "stayDays"));
        result.openChecks.push(code);
        return result;
      }
      result.regularNeedMode = "DAYS_OVER_30";
      result.childAdditionalNeedMode = "DAYS_OVER_30";
      result.housingNeedMode = "FULL";
      result.regularNeedFactor = days / 30;
      result.childAdditionalNeedFactor = days / 30;
      result.housingNeedFactor = 1;
      return result;
    }

    result.warnings.push(warning("CHILD_NEED_CLASSIFICATION_UNSUPPORTED", "Für diese Betreuungssituation ist keine Bedarfsfaktorregel implementiert.", "careSituation"));
    result.openChecks.push("CHILD_NEED_CLASSIFICATION_REVIEW_REQUIRED");
    return result;
  }

  return {
    RULE_ID,
    RULE_IDS,
    CARE_METADATA,
    getRelevantHouseholds,
    evaluateChildRelevanceForHousehold,
    evaluateChildBenefitAssignment,
    evaluateChildNeedClassification,
  };
});
