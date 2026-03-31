const CRITICAL_KEYWORDS = [
  "murder",
  "shoot",
  "gun",
  "weapon",
  "kidnap",
  "hostage",
  "bomb",
  "rape",
  "knife",
  "fire",
  "acid attack"
];

const HIGH_KEYWORDS = [
  "assault",
  "robbery",
  "snatching",
  "break in",
  "break-in",
  "armed",
  "threat",
  "stabbing",
  "violence",
  "chase"
];

const MEDIUM_KEYWORDS = [
  "theft",
  "fraud",
  "scam",
  "vandal",
  "drugs",
  "harassment",
  "stalk",
  "suspicious",
  "fight",
  "damage"
];

const CATEGORY_RULES = [
  {
    label: "Violent crime",
    keywords: ["murder", "assault", "weapon", "gun", "knife", "stabbing", "kidnap", "rape", "hostage", "fight"]
  },
  {
    label: "Property crime",
    keywords: ["theft", "robbery", "snatching", "break in", "break-in", "vandal", "damage", "burglary"]
  },
  {
    label: "Cyber/Fraud",
    keywords: ["fraud", "scam", "phishing", "otp", "hack", "cyber"]
  },
  {
    label: "Public safety",
    keywords: ["fire", "drugs", "suspicious", "threat", "traffic", "accident"]
  }
];

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function normalizeText(text) {
  return String(text || "").toLowerCase().replace(/\s+/g, " ").trim();
}

function countKeywordHits(text, keywords) {
  let hits = 0;
  for (const keyword of keywords) {
    if (text.includes(keyword)) {
      hits += 1;
    }
  }
  return hits;
}

function detectSeverity(text) {
  const criticalHits = countKeywordHits(text, CRITICAL_KEYWORDS);
  const highHits = countKeywordHits(text, HIGH_KEYWORDS);
  const mediumHits = countKeywordHits(text, MEDIUM_KEYWORDS);

  if (criticalHits > 0) {
    return "CRITICAL";
  }

  if (highHits >= 2 || (highHits >= 1 && mediumHits >= 1)) {
    return "HIGH";
  }

  if (highHits >= 1 || mediumHits >= 1) {
    return "MEDIUM";
  }

  return "LOW";
}

function severityWeight(severity) {
  switch (severity) {
    case "CRITICAL":
      return 4;
    case "HIGH":
      return 3;
    case "MEDIUM":
      return 2;
    default:
      return 1;
  }
}

function detectCategory(text) {
  for (const rule of CATEGORY_RULES) {
    if (countKeywordHits(text, rule.keywords) > 0) {
      return rule.label;
    }
  }
  return "General incident";
}

function words(text) {
  return normalizeText(text)
    .split(/[^a-z0-9]+/g)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3);
}

function jaccardSimilarity(textA, textB) {
  const setA = new Set(words(textA));
  const setB = new Set(words(textB));

  if (!setA.size || !setB.size) {
    return 0;
  }

  let intersection = 0;
  for (const token of setA) {
    if (setB.has(token)) {
      intersection += 1;
    }
  }

  const union = setA.size + setB.size - intersection;
  return union ? intersection / union : 0;
}

function getAgeMinutes(isoDate) {
  const created = new Date(isoDate).getTime();
  if (Number.isNaN(created)) {
    return 0;
  }
  const diffMs = Date.now() - created;
  return Math.max(0, Math.round(diffMs / 60000));
}

function toTitleCase(text) {
  return String(text || "")
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function suggestTitle(title, description, category) {
  const cleanTitle = String(title || "").trim();
  if (cleanTitle.length >= 6) {
    return cleanTitle;
  }

  const source = String(description || "").trim();
  if (!source) {
    return `${category} report`;
  }

  const line = source.split(/[.!?\n]/)[0].slice(0, 72).trim();
  return line ? toTitleCase(line) : `${category} report`;
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const toRad = (value) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

function getMediaCount(report) {
  return (report.imageUrls?.length || 0) + (report.videoUrls?.length || 0);
}

function getSeverityTone(severity) {
  switch (severity) {
    case "CRITICAL":
      return "bg-rose-100 text-rose-700 ring-rose-200";
    case "HIGH":
      return "bg-orange-100 text-orange-700 ring-orange-200";
    case "MEDIUM":
      return "bg-amber-100 text-amber-700 ring-amber-200";
    default:
      return "bg-slate-100 text-slate-700 ring-slate-200";
  }
}

export function analyzeDraftReport(draft) {
  const title = String(draft.title || "");
  const description = String(draft.description || "");
  const text = normalizeText(`${title} ${description}`);
  const category = detectCategory(text);
  const severity = detectSeverity(text);

  const missing = [];
  const tips = [];

  if (title.trim().length < 6) {
    missing.push("Add a clear title (at least 6 characters).");
  }

  if (description.trim().length < 40) {
    missing.push("Add more details (what, when, and who/vehicle clues).");
  }

  if (draft.latitude === null || draft.longitude === null) {
    missing.push("Select the exact incident location on the map.");
  }

  if (!draft.mediaFiles?.length) {
    tips.push("Add a photo or short video if it is safe to capture evidence.");
  }

  if (/\b\d{10}\b/.test(description)) {
    tips.push("Consider removing phone numbers from public-facing descriptions.");
  }

  const titleScore = clamp(Math.round((title.trim().length / 18) * 25), 0, 25);
  const descriptionScore = clamp(Math.round((description.trim().length / 140) * 35), 0, 35);
  const locationScore = draft.latitude !== null && draft.longitude !== null ? 25 : 0;
  const mediaScore = clamp((draft.mediaFiles?.length || 0) * 4, 0, 15);
  const completenessScore = clamp(titleScore + descriptionScore + locationScore + mediaScore, 0, 100);

  if (completenessScore < 65) {
    tips.push("Include time, direction, and landmarks to improve verification speed.");
  }

  return {
    severity,
    severityTone: getSeverityTone(severity),
    category,
    completenessScore,
    missing,
    tips,
    suggestedTitle: suggestTitle(title, description, category)
  };
}

export function buildCitizenAiInsights(reports) {
  const total = reports.length;
  if (!total) {
    return {
      openCritical: 0,
      pendingLong: 0,
      evidenceGaps: 0,
      advice: []
    };
  }

  const openReports = reports.filter((report) => report.status !== "COMPLETED");
  const openCritical = openReports.filter((report) => {
    const severity = detectSeverity(normalizeText(`${report.title} ${report.description}`));
    return severity === "CRITICAL" || severity === "HIGH";
  }).length;

  const pendingLong = reports.filter(
    (report) => report.status === "PENDING" && getAgeMinutes(report.createdAt) >= 12 * 60
  ).length;

  const evidenceGaps = openReports.filter((report) => getMediaCount(report) === 0).length;

  const advice = [];
  if (openCritical > 0) {
    advice.push(`${openCritical} high-priority case(s) are still open. Monitor status closely.`);
  }
  if (pendingLong > 0) {
    advice.push(`${pendingLong} pending case(s) are older than 12 hours.`);
  }
  if (evidenceGaps > 0) {
    advice.push(`${evidenceGaps} open case(s) have no media attached. You can add follow-up evidence.`);
  }

  if (!advice.length) {
    advice.push("Your case history looks healthy. Keep notifications enabled for realtime updates.");
  }

  return {
    openCritical,
    pendingLong,
    evidenceGaps,
    advice
  };
}

export function buildPoliceAiInsights(reports) {
  const enriched = reports.map((report) => {
    const text = normalizeText(`${report.title} ${report.description}`);
    const severity = detectSeverity(text);
    const ageMinutes = getAgeMinutes(report.createdAt);
    const mediaCount = getMediaCount(report);
    const priorityScore = clamp(
      severityWeight(severity) * 18 +
        Math.min(Math.floor(ageMinutes / 30), 24) +
        (report.status === "PENDING" ? 16 : 0) +
        Math.min(mediaCount * 4, 12),
      0,
      100
    );

    let recommendedStatus = "";
    let reason = "";

    if (report.status === "PENDING" && priorityScore >= 55) {
      recommendedStatus = "IN_PROGRESS";
      reason =
        severity === "CRITICAL" || severity === "HIGH"
          ? "High-risk language detected with pending status."
          : "Pending case has aging risk and should be assigned.";
    }

    if (
      report.status === "IN_PROGRESS" &&
      /(resolved|recovered|secured|arrested|closed)/.test(text) &&
      ageMinutes >= 60
    ) {
      recommendedStatus = "COMPLETED";
      reason = "Narrative suggests closure language. Verify and close if confirmed.";
    }

    return {
      ...report,
      severity,
      severityTone: getSeverityTone(severity),
      ageMinutes,
      mediaCount,
      priorityScore,
      recommendedStatus,
      reason
    };
  });

  const recommendedActions = enriched
    .filter((report) => report.recommendedStatus && report.recommendedStatus !== report.status)
    .sort((a, b) => b.priorityScore - a.priorityScore)
    .slice(0, 5)
    .map((report) => ({
      reportId: report.id,
      title: report.title,
      reporterName: report.reporterName,
      currentStatus: report.status,
      recommendedStatus: report.recommendedStatus,
      priorityScore: report.priorityScore,
      reason: report.reason
    }));

  const hotspotsMap = new Map();
  for (const report of enriched) {
    const lat = Number(report.latitude);
    const lng = Number(report.longitude);
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      continue;
    }
    const key = `${lat.toFixed(2)},${lng.toFixed(2)}`;
    const existing = hotspotsMap.get(key) || {
      key,
      count: 0,
      latitude: Number(lat.toFixed(2)),
      longitude: Number(lng.toFixed(2))
    };
    existing.count += 1;
    hotspotsMap.set(key, existing);
  }

  const hotspots = Array.from(hotspotsMap.values())
    .filter((entry) => entry.count >= 2)
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  const duplicates = [];
  for (let i = 0; i < enriched.length; i += 1) {
    for (let j = i + 1; j < enriched.length; j += 1) {
      const a = enriched[i];
      const b = enriched[j];

      if (a.status === "COMPLETED" && b.status === "COMPLETED") {
        continue;
      }

      const distanceKm = haversineKm(
        Number(a.latitude),
        Number(a.longitude),
        Number(b.latitude),
        Number(b.longitude)
      );

      const timeGapMinutes = Math.abs(a.ageMinutes - b.ageMinutes);
      const titleSimilarity = jaccardSimilarity(a.title, b.title);

      if (distanceKm <= 0.8 && timeGapMinutes <= 180 && titleSimilarity >= 0.32) {
        duplicates.push({
          pairKey: `${a.id}-${b.id}`,
          firstTitle: a.title,
          secondTitle: b.title,
          distanceKm: Number(distanceKm.toFixed(2)),
          similarityPercent: Math.round(titleSimilarity * 100)
        });
      }
    }
  }

  return {
    recommendedActions,
    hotspots,
    duplicates: duplicates.slice(0, 3)
  };
}
