import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createReport, getMyReports } from "../../api/reports";
import Button from "../../components/Button";
import FormField from "../../components/FormField";
import MapPicker from "../../components/MapPicker";
import PageHeader from "../../components/PageHeader";
import { useToast } from "../../components/ToastProvider";
import { useAuth } from "../../context/AuthContext";
import { analyzeDraftReport } from "../../lib/aiInsights";
import { WS_BASE_URL } from "../../lib/constants";
import { getErrorMessage } from "../../lib/errors";

const MAX_MEDIA_FILES = 4;
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const MAX_VIDEO_BYTES = 15 * 1024 * 1024;
const OFFLINE_QUEUE_KEY = "crime_offline_report_queue_v1";
const SAFETY_MODE_KEY = "crime_safety_mode_enabled_v1";
const TRUSTED_CONTACTS_KEY = "crime_safety_trusted_contacts_v1";
const SUPPORT_CHAT_KEY = "crime_support_chat_history_v1";
const USER_LANGUAGE_KEY = "crime_user_language_v1";
const AWARENESS_RADIUS_KM = 8;

const AWARENESS_COPY = {
  en: {
    sectionTitle: "Crime awareness",
    sectionSubtitle: "Location-based awareness from your recent reports.",
    languageLabel: "Language",
    englishLabel: "English",
    teluguLabel: "Telugu",
    statsTitle: "Crime statistics in your area",
    total: "Total in area",
    pending: "Pending",
    inProgress: "In progress",
    completed: "Completed",
    recent7Days: "Last 7 days",
    recentCrimesTitle: "Recent crimes nearby",
    noNearby: "No nearby incidents in your recent report history.",
    noArea: "Pin a location to get area-specific nearby incidents.",
    safetyTipsTitle: "Safety tips for this location",
    tipLocationMissing: "Pin a location to receive nearby safety insights.",
    tipHighPending: "High unresolved activity nearby. Avoid isolated routes and keep emergency numbers ready.",
    tipNightHours: "Night hours increase risk in less crowded zones. Prefer lit streets and share live location.",
    tipNoEvidence: "Attach photo/video evidence whenever possible to speed up verification.",
    tipGeneral: "Stay alert, keep your phone charged, and inform trusted contacts before late travel.",
    locationContext: "Insights radius",
    locationRadiusSuffix: "km around your pinned location",
    statusUnknown: "Unknown",
    viewMap: "Open map",
    distanceAway: "km away",
    loadingAwareness: "Loading local awareness insights...",
    tryAgain: "Try again",
    personalSafetyScoreTitle: "Personal safety score",
    personalSafetyScoreSubtitle: "Live score from nearby activity and your current safety setup.",
    scoreOutOf100: "out of 100",
    locationSafetyLabel: "Location safety",
    activityPatternLabel: "Activity pattern",
    improveSafetyTitle: "Tips to improve safety",
    riskLow: "Low risk",
    riskModerate: "Moderate risk",
    riskHigh: "High risk",
    scoreTipPinLocation: "Pin your exact location to unlock accurate nearby safety scoring.",
    scoreTipAddContacts: "Add at least one trusted contact so panic and live-location actions are ready.",
    scoreTipEnableSafetyMode: "Enable Women Safety Mode to keep emergency actions one tap away.",
    scoreTipAttachEvidence: "Attach image or video evidence for faster police verification.",
    scoreTipCrowdedRoutes: "Prefer well-lit, crowded routes while unresolved incidents are high nearby.",
    scoreTipReconnectChat: "Keep chat connected to contact police support instantly during emergencies.",
    scoreTipSyncQueue: "Sync pending offline reports now so authorities can act faster.",
    scoreTipMaintain: "Your safety setup looks strong. Keep contacts updated and stay alert."
  },
  te: {
    sectionTitle: "నేర అవగాహన",
    sectionSubtitle: "మీ ఇటీవలి రిపోర్టుల ఆధారంగా ప్రాంతీయ భద్రత సమాచారం.",
    languageLabel: "భాష",
    englishLabel: "English",
    teluguLabel: "తెలుగు",
    statsTitle: "మీ ప్రాంతంలోని నేర గణాంకాలు",
    total: "మొత్తం",
    pending: "పెండింగ్",
    inProgress: "పనిలో ఉంది",
    completed: "పూర్తైంది",
    recent7Days: "గత 7 రోజులు",
    recentCrimesTitle: "దగ్గరలో ఇటీవలి సంఘటనలు",
    noNearby: "మీ ఇటీవలి రిపోర్టులలో దగ్గరలో సంఘటనలు లేవు.",
    noArea: "ప్రాంతానికి సంబంధించిన సమాచారానికి మ్యాప్‌లో లొకేషన్ పిన్ చేయండి.",
    safetyTipsTitle: "ఈ ప్రాంతానికి భద్రత సూచనలు",
    tipLocationMissing: "దగ్గరలో భద్రత సూచనలు పొందడానికి ముందుగా లొకేషన్ పిన్ చేయండి.",
    tipHighPending: "దగ్గరలో పెండింగ్ కేసులు ఎక్కువగా ఉన్నాయి. ఒంటరి మార్గాలు తప్పించండి, అత్యవసర నంబర్లు సిద్ధంగా ఉంచండి.",
    tipNightHours: "రాత్రి వేళల్లో రిస్క్ ఎక్కువగా ఉంటుంది. వెలుతురు ఉన్న రహదారులు వాడండి, లైవ్ లొకేషన్ షేర్ చేయండి.",
    tipNoEvidence: "ధృవీకరణ త్వరగా జరగడానికి ఫోటో/వీడియో ఆధారాలు జోడించండి.",
    tipGeneral: "జాగ్రత్తగా ఉండండి, ఫోన్ చార్జ్‌గా ఉంచండి, రాత్రి ప్రయాణానికి ముందు నమ్మకమైన వారికి సమాచారం ఇవ్వండి.",
    locationContext: "సమాచార పరిధి",
    locationRadiusSuffix: "కి.మీ పరిధి (మీ పిన్ చేసిన లొకేషన్ చుట్టూ)",
    statusUnknown: "తెలియదు",
    viewMap: "మ్యాప్ తెరవండి",
    distanceAway: "కి.మీ దూరం",
    loadingAwareness: "ప్రాంతీయ అవగాహన వివరాలు లోడ్ అవుతున్నాయి...",
    tryAgain: "మళ్లీ ప్రయత్నించండి",
    personalSafetyScoreTitle: "వ్యక్తిగత భద్రత స్కోర్",
    personalSafetyScoreSubtitle: "ప్రాంతీయ పరిస్థితి, మీ భద్రత వినియోగంపై ఆధారంగా లైవ్ స్కోర్.",
    scoreOutOf100: "100లో",
    locationSafetyLabel: "ప్రాంత భద్రత",
    activityPatternLabel: "చర్యల ప్యాటర్న్",
    improveSafetyTitle: "భద్రత మెరుగుపరచడానికి సూచనలు",
    riskLow: "తక్కువ రిస్క్",
    riskModerate: "మధ్యస్థ రిస్క్",
    riskHigh: "అధిక రిస్క్",
    scoreTipPinLocation: "ఖచ్చితమైన ప్రాంతీయ స్కోర్ కోసం మ్యాప్‌లో లొకేషన్ పిన్ చేయండి.",
    scoreTipAddContacts: "పానిక్ మరియు లైవ్-లొకేషన్ కోసం కనీసం ఒక నమ్మకమైన కాంటాక్ట్ జోడించండి.",
    scoreTipEnableSafetyMode: "వుమెన్ సేఫ్టీ మోడ్ ఆన్ చేస్తే అత్యవసర చర్యలు వేగంగా ఉంటాయి.",
    scoreTipAttachEvidence: "వేగమైన పోలీస్ ధృవీకరణ కోసం ఫోటో లేదా వీడియో ఆధారాలు జత చేయండి.",
    scoreTipCrowdedRoutes: "పెండింగ్ కేసులు ఎక్కువగా ఉన్నప్పుడు వెలుతురు ఉన్న రహదారులు మాత్రమే ఎంచుకోండి.",
    scoreTipReconnectChat: "అత్యవసర సమయంలో త్వరిత సహాయం కోసం చాట్ కనెక్షన్‌ను యాక్టివ్‌గా ఉంచండి.",
    scoreTipSyncQueue: "ఆఫ్లైన్‌లో సేవ్ అయిన రిపోర్ట్‌లను వెంటనే సింక్ చేయండి.",
    scoreTipMaintain: "మీ భద్రతా సెటప్ బాగుంది. కాంటాక్ట్‌లను అప్డేట్ చేస్తూ జాగ్రత్తగా ఉండండి."
  }
};

function formatFileSize(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function toRadians(value) {
  return (value * Math.PI) / 180;
}

function distanceKm(lat1, lon1, lat2, lon2) {
  const earthRadiusKm = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

function buildOfflineQueueItem(reportForm) {
  return {
    id: `offline-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    title: reportForm.title.trim(),
    description: reportForm.description.trim(),
    latitude: reportForm.latitude,
    longitude: reportForm.longitude,
    createdAt: new Date().toISOString(),
    droppedMediaCount: reportForm.mediaFiles.length
  };
}

function normalizePhone(value) {
  const cleaned = value.replace(/[^\d+]/g, "");
  const withoutExtraPlus = cleaned.startsWith("+")
    ? `+${cleaned.slice(1).replace(/\+/g, "")}`
    : cleaned.replace(/\+/g, "");
  return withoutExtraPlus.slice(0, 16);
}

function composeSafetyMessage(label, latitude, longitude) {
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
  return `${label}\nLocation: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}\nMap: ${mapsUrl}\nTime: ${new Date().toLocaleString()}`;
}

function buildSmsUrl(phoneNumbers, text) {
  const recipients = phoneNumbers.filter(Boolean);
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const recipientSeparator = isIOS ? ";" : ",";
  const recipientList = recipients.join(recipientSeparator);
  const hasRecipients = recipientList.length > 0;
  const bodyPrefix = hasRecipients ? (isIOS ? "&body=" : "?body=") : "?body=";
  return `sms:${recipientList}${bodyPrefix}${encodeURIComponent(text)}`;
}

function buildWhatsAppUrl(phoneNumber, text) {
  const normalized = phoneNumber.replace(/[^\d]/g, "");
  return `https://wa.me/${normalized}?text=${encodeURIComponent(text)}`;
}

function toSockJsEndpoint(baseUrl) {
  if (baseUrl.startsWith("https://")) {
    return `${baseUrl}/ws`;
  }
  if (baseUrl.startsWith("http://")) {
    return `${baseUrl}/ws`;
  }
  if (baseUrl.startsWith("wss://")) {
    return `${baseUrl.replace("wss://", "https://")}/ws`;
  }
  if (baseUrl.startsWith("ws://")) {
    return `${baseUrl.replace("ws://", "http://")}/ws`;
  }
  return `${window.location.origin}/ws`;
}

export default function SubmitReportPage() {
  const navigate = useNavigate();
  const { user, token, logout } = useAuth();
  const { pushToast } = useToast();
  const [form, setForm] = useState({
    title: "",
    description: "",
    latitude: null,
    longitude: null,
    mediaFiles: []
  });
  const [submitting, setSubmitting] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [offlineQueue, setOfflineQueue] = useState([]);
  const [syncingQueue, setSyncingQueue] = useState(false);
  const [womenSafetyMode, setWomenSafetyMode] = useState(false);
  const [trustedContacts, setTrustedContacts] = useState([]);
  const [newContact, setNewContact] = useState({
    name: "",
    phone: ""
  });
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatState, setChatState] = useState("idle");
  const [sendingPanic, setSendingPanic] = useState(false);
  const [activeSafetyMessage, setActiveSafetyMessage] = useState("");
  const [uiLanguage, setUiLanguage] = useState(() => localStorage.getItem(USER_LANGUAGE_KEY) || "en");
  const [awarenessReports, setAwarenessReports] = useState([]);
  const [awarenessLoading, setAwarenessLoading] = useState(false);
  const [awarenessError, setAwarenessError] = useState("");
  const chatClientRef = useRef(null);
  const seenChatMessageIdsRef = useRef(new Set());
  const aiDraft = analyzeDraftReport(form);
  const t = AWARENESS_COPY[uiLanguage] || AWARENESS_COPY.en;
  const titleReady = form.title.trim().length >= 8;
  const descriptionReady = form.description.trim().length >= 40;
  const locationReady = form.latitude !== null && form.longitude !== null;
  const mediaCount = form.mediaFiles.length;
  const readinessScore = Math.round(
    ((titleReady ? 1 : 0) + (descriptionReady ? 1 : 0) + (locationReady ? 1 : 0)) / 3 * 100
  );
  const coordinatesLabel = locationReady
    ? `${form.latitude.toFixed(5)}, ${form.longitude.toFixed(5)}`
    : "";
  const googleMapsUrl = locationReady
    ? `https://www.google.com/maps/search/?api=1&query=${form.latitude},${form.longitude}`
    : "#";
  const openStreetMapUrl = locationReady
    ? `https://www.openstreetmap.org/?mlat=${form.latitude}&mlon=${form.longitude}#map=16/${form.latitude}/${form.longitude}`
    : "#";
  const nearestStationMapsUrl = locationReady
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`nearest police station near ${form.latitude},${form.longitude}`)}`
    : "https://www.google.com/maps/search/?api=1&query=nearest+police+station";
  const defaultSafetyMessage = locationReady
    ? composeSafetyMessage("Safety update from Crime Reporting app.", form.latitude, form.longitude)
    : `Safety update from Crime Reporting app.\nTime: ${new Date().toLocaleString()}`;
  const contactMessage = activeSafetyMessage || defaultSafetyMessage;
  const chatVisibleMessages = useMemo(() => {
    return chatMessages
      .filter(
        (message) =>
          message.senderEmail === user?.email ||
          message.targetEmail === user?.email ||
          message.targetRole === "ALL"
      )
      .slice(-12);
  }, [chatMessages, user?.email]);
  const awarenessReportsWithDistance = useMemo(() => {
    const validReports = awarenessReports.filter(
      (report) => Number.isFinite(report.latitude) && Number.isFinite(report.longitude)
    );

    if (!locationReady) {
      return validReports.map((report) => ({
        ...report,
        distanceFromPinKm: null
      }));
    }

    return validReports.map((report) => ({
      ...report,
      distanceFromPinKm: distanceKm(form.latitude, form.longitude, report.latitude, report.longitude)
    }));
  }, [awarenessReports, form.latitude, form.longitude, locationReady]);

  const areaReports = useMemo(() => {
    if (!locationReady) {
      return awarenessReportsWithDistance;
    }

    return awarenessReportsWithDistance.filter((report) => report.distanceFromPinKm <= AWARENESS_RADIUS_KM);
  }, [awarenessReportsWithDistance, locationReady]);

  const recentNearbyReports = useMemo(() => {
    return [...areaReports]
      .sort((first, second) => new Date(second.createdAt || 0) - new Date(first.createdAt || 0))
      .slice(0, 5);
  }, [areaReports]);

  const areaStats = useMemo(() => {
    const now = Date.now();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    const pending = areaReports.filter((report) => report.status === "PENDING").length;
    const inProgress = areaReports.filter((report) => report.status === "IN_PROGRESS").length;
    const completed = areaReports.filter((report) => report.status === "COMPLETED").length;
    const recent7Days = areaReports.filter((report) => {
      if (!report.createdAt) {
        return false;
      }
      const reportTime = new Date(report.createdAt).getTime();
      return Number.isFinite(reportTime) && now - reportTime <= sevenDaysMs;
    }).length;

    return {
      total: areaReports.length,
      pending,
      inProgress,
      completed,
      recent7Days
    };
  }, [areaReports]);

  const awarenessTips = useMemo(() => {
    if (!locationReady) {
      return [t.tipLocationMissing];
    }

    const tips = [];
    const currentHour = new Date().getHours();
    if (areaStats.pending > Math.max(1, areaStats.completed)) {
      tips.push(t.tipHighPending);
    }

    if (currentHour >= 20 || currentHour <= 5) {
      tips.push(t.tipNightHours);
    }

    if (mediaCount === 0) {
      tips.push(t.tipNoEvidence);
    }

    if (!tips.length) {
      tips.push(t.tipGeneral);
    }

    return tips.slice(0, 3);
  }, [locationReady, areaStats.pending, areaStats.completed, mediaCount, t]);

  const locationSafetyScore = useMemo(() => {
    if (!locationReady) {
      return 30;
    }

    let score = 88;
    if (areaStats.total > 0) {
      score -= Math.min(36, areaStats.pending * 7 + areaStats.inProgress * 4);
      score += Math.min(12, areaStats.completed * 2);
      score -= Math.min(12, areaStats.recent7Days * 2);
    }

    const currentHour = new Date().getHours();
    if (currentHour >= 21 || currentHour <= 5) {
      score -= 8;
    }

    return Math.max(8, Math.min(100, Math.round(score)));
  }, [locationReady, areaStats.pending, areaStats.inProgress, areaStats.completed, areaStats.recent7Days, areaStats.total]);

  const activityPatternScore = useMemo(() => {
    let score = 42;

    if (womenSafetyMode) {
      score += 14;
    }

    if (trustedContacts.length >= 2) {
      score += 18;
    } else if (trustedContacts.length === 1) {
      score += 10;
    } else {
      score -= 8;
    }

    if (chatState === "connected") {
      score += 8;
    } else if (chatState === "connecting") {
      score += 2;
    } else {
      score -= 6;
    }

    if (offlineQueue.length === 0) {
      score += 8;
    } else {
      score -= Math.min(12, offlineQueue.length * 3);
    }

    if (mediaCount > 0) {
      score += 6;
    }
    if (titleReady) {
      score += 5;
    }
    if (descriptionReady) {
      score += 7;
    }
    if (locationReady) {
      score += 8;
    }
    if (!isOnline) {
      score -= 8;
    }

    return Math.max(8, Math.min(100, Math.round(score)));
  }, [
    womenSafetyMode,
    trustedContacts.length,
    chatState,
    offlineQueue.length,
    mediaCount,
    titleReady,
    descriptionReady,
    locationReady,
    isOnline
  ]);

  const personalSafetyScore = useMemo(
    () => Math.round(locationSafetyScore * 0.6 + activityPatternScore * 0.4),
    [locationSafetyScore, activityPatternScore]
  );

  const safetyRiskMeta = useMemo(() => {
    if (personalSafetyScore >= 75) {
      return {
        label: t.riskLow,
        badgeClass: "bg-emerald-100 text-emerald-700 ring-emerald-200",
        barClass: "bg-emerald-500"
      };
    }
    if (personalSafetyScore >= 45) {
      return {
        label: t.riskModerate,
        badgeClass: "bg-amber-100 text-amber-700 ring-amber-200",
        barClass: "bg-amber-500"
      };
    }
    return {
      label: t.riskHigh,
      badgeClass: "bg-rose-100 text-rose-700 ring-rose-200",
      barClass: "bg-rose-500"
    };
  }, [personalSafetyScore, t]);

  const personalSafetyTips = useMemo(() => {
    const tips = [];
    if (!locationReady) {
      tips.push(t.scoreTipPinLocation);
    }
    if (trustedContacts.length === 0) {
      tips.push(t.scoreTipAddContacts);
    }
    if (!womenSafetyMode) {
      tips.push(t.scoreTipEnableSafetyMode);
    }
    if (mediaCount === 0) {
      tips.push(t.scoreTipAttachEvidence);
    }
    if (areaStats.pending > Math.max(1, areaStats.completed)) {
      tips.push(t.scoreTipCrowdedRoutes);
    }
    if (chatState !== "connected") {
      tips.push(t.scoreTipReconnectChat);
    }
    if (offlineQueue.length > 0) {
      tips.push(t.scoreTipSyncQueue);
    }
    if (!tips.length) {
      tips.push(t.scoreTipMaintain);
    }
    return tips.slice(0, 4);
  }, [
    locationReady,
    trustedContacts.length,
    womenSafetyMode,
    mediaCount,
    areaStats.pending,
    areaStats.completed,
    chatState,
    offlineQueue.length,
    t
  ]);

  const statusLabels = useMemo(
    () => ({
      PENDING: t.pending,
      IN_PROGRESS: t.inProgress,
      COMPLETED: t.completed
    }),
    [t]
  );

  async function refreshAwarenessInsights(isMountedRef) {
    if (!token) {
      setAwarenessReports([]);
      return;
    }

    setAwarenessLoading(true);
    setAwarenessError("");
    try {
      const data = await getMyReports({ page: 0, size: 100 });
      if (isMountedRef && !isMountedRef.current) {
        return;
      }
      setAwarenessReports(Array.isArray(data.content) ? data.content : []);
    } catch (requestError) {
      if (isMountedRef && !isMountedRef.current) {
        return;
      }
      if (requestError.response?.status === 401) {
        logout();
        navigate("/login", { replace: true });
        return;
      }
      setAwarenessError(getErrorMessage(requestError, "Unable to load awareness insights right now."));
    } finally {
      if (!isMountedRef || isMountedRef.current) {
        setAwarenessLoading(false);
      }
    }
  }

  async function copyTextToClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return;
    }

    const helperTextArea = document.createElement("textarea");
    helperTextArea.value = text;
    helperTextArea.style.position = "fixed";
    helperTextArea.style.left = "-9999px";
    document.body.appendChild(helperTextArea);
    helperTextArea.focus();
    helperTextArea.select();
    document.execCommand("copy");
    document.body.removeChild(helperTextArea);
  }

  useEffect(() => {
    const rawQueue = localStorage.getItem(OFFLINE_QUEUE_KEY);
    const rawContacts = localStorage.getItem(TRUSTED_CONTACTS_KEY);
    const rawSafetyMode = localStorage.getItem(SAFETY_MODE_KEY);
    const rawChat = localStorage.getItem(SUPPORT_CHAT_KEY);

    if (rawQueue) {
      try {
        const parsed = JSON.parse(rawQueue);
        if (Array.isArray(parsed)) {
          setOfflineQueue(parsed);
        }
      } catch {
      }
    }

    if (rawContacts) {
      try {
        const parsed = JSON.parse(rawContacts);
        if (Array.isArray(parsed)) {
          setTrustedContacts(parsed);
        }
      } catch {
      }
    }

    if (rawSafetyMode === "true") {
      setWomenSafetyMode(true);
    }

    if (rawChat) {
      try {
        const parsed = JSON.parse(rawChat);
        if (Array.isArray(parsed)) {
          setChatMessages(parsed.slice(-30));
          parsed.slice(-30).forEach((message) => {
            if (message.id) {
              seenChatMessageIdsRef.current.add(message.id);
            }
          });
        }
      } catch {
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(offlineQueue));
  }, [offlineQueue]);

  useEffect(() => {
    localStorage.setItem(TRUSTED_CONTACTS_KEY, JSON.stringify(trustedContacts));
  }, [trustedContacts]);

  useEffect(() => {
    localStorage.setItem(SAFETY_MODE_KEY, String(womenSafetyMode));
  }, [womenSafetyMode]);

  useEffect(() => {
    localStorage.setItem(SUPPORT_CHAT_KEY, JSON.stringify(chatMessages.slice(-30)));
  }, [chatMessages]);

  useEffect(() => {
    localStorage.setItem(USER_LANGUAGE_KEY, uiLanguage);
  }, [uiLanguage]);

  useEffect(() => {
    if (!token) {
      setAwarenessReports([]);
      return undefined;
    }

    const isMountedRef = { current: true };
    refreshAwarenessInsights(isMountedRef);
    return () => {
      isMountedRef.current = false;
    };
  }, [token, logout, navigate]);

  useEffect(() => {
    function handleOnline() {
      setIsOnline(true);
    }
    function handleOffline() {
      setIsOnline(false);
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  function addChatMessage(message) {
    if (!message.id || seenChatMessageIdsRef.current.has(message.id)) {
      return;
    }
    seenChatMessageIdsRef.current.add(message.id);
    setChatMessages((current) => [...current.slice(-29), message]);
  }

  useEffect(() => {
    if (!token || !user?.email) {
      setChatState("idle");
      return undefined;
    }

    let isMounted = true;
    let stompClient;

    async function connectChat() {
      try {
        setChatState("connecting");
        const [{ Client }, sockJsModule] = await Promise.all([
          import("@stomp/stompjs"),
          import("sockjs-client/dist/sockjs")
        ]);

        if (!isMounted) {
          return;
        }

        const SockJS = sockJsModule.default;
        stompClient = new Client({
          webSocketFactory: () => new SockJS(toSockJsEndpoint(WS_BASE_URL)),
          connectHeaders: {
            Authorization: `Bearer ${token}`
          },
          debug: () => {},
          reconnectDelay: 5000,
          heartbeatIncoming: 10000,
          heartbeatOutgoing: 10000,
          connectionTimeout: 15000,
          onConnect: () => {
            if (!isMounted) {
              return;
            }
            setChatState("connected");
            stompClient.subscribe("/topic/support/chat", (frame) => {
              try {
                const payload = JSON.parse(frame.body);
                addChatMessage(payload);
              } catch {
              }
            });
          },
          onStompError: () => {
            if (isMounted) {
              setChatState("error");
            }
          },
          onWebSocketClose: () => {
            if (isMounted) {
              setChatState("reconnecting");
            }
          },
          onWebSocketError: () => {
            if (isMounted) {
              setChatState("reconnecting");
            }
          }
        });

        chatClientRef.current = stompClient;
        stompClient.activate();
      } catch {
        if (isMounted) {
          setChatState("error");
        }
      }
    }

    connectChat();

    return () => {
      isMounted = false;
      if (stompClient) {
        stompClient.deactivate();
      }
      if (chatClientRef.current === stompClient) {
        chatClientRef.current = null;
      }
      setChatState("idle");
    };
  }, [token, user?.email]);

  function publishChatMessage(payload) {
    const client = chatClientRef.current;
    if (!client || !client.connected) {
      pushToast({
        title: "Chat not connected",
        description: "Realtime chat is reconnecting. Please try again."
      });
      return false;
    }

    addChatMessage(payload);
    client.publish({
      destination: "/topic/support/chat",
      body: JSON.stringify(payload)
    });
    return true;
  }

  function resetReportForm() {
    setForm({
      title: "",
      description: "",
      latitude: null,
      longitude: null,
      mediaFiles: []
    });
  }

  function queueReportOffline() {
    const queuedItem = buildOfflineQueueItem(form);
    setOfflineQueue((current) => [...current, queuedItem]);
    pushToast({
      title: "Saved offline",
      description:
        queuedItem.droppedMediaCount > 0
          ? `Report queued offline. ${queuedItem.droppedMediaCount} media file(s) will need re-upload when online.`
          : "Report queued offline and will sync automatically when internet returns."
    });
    resetReportForm();
  }

  async function syncOfflineReports() {
    if (!isOnline || syncingQueue || offlineQueue.length === 0) {
      return;
    }

    setSyncingQueue(true);
    let remainingQueue = [...offlineQueue];

    try {
      while (remainingQueue.length > 0) {
        const item = remainingQueue[0];
        await createReport({
          title: item.title,
          description: item.description,
          latitude: item.latitude,
          longitude: item.longitude,
          mediaFiles: []
        });
        remainingQueue = remainingQueue.slice(1);
        setOfflineQueue(remainingQueue);
      }

      pushToast({
        title: "Offline queue synced",
        description: "All offline reports were submitted successfully."
      });
    } catch {
      setOfflineQueue(remainingQueue);
      pushToast({
        title: "Sync paused",
        description: "Some offline reports are still pending. We will retry automatically."
      });
    } finally {
      setSyncingQueue(false);
    }
  }

  useEffect(() => {
    if (isOnline && offlineQueue.length > 0) {
      syncOfflineReports();
    }
  }, [isOnline, offlineQueue.length]);

  function handleChange(event) {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value
    }));
  }

  function handleLocationChange(location) {
    setForm((current) => ({
      ...current,
      latitude: location.latitude,
      longitude: location.longitude
    }));
  }

  function handleUseCurrentLocation() {
    if (!navigator.geolocation) {
      pushToast({
        title: "Geolocation unavailable",
        description: "Your browser does not support current location detection."
      });
      return;
    }

    setDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        handleLocationChange({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
        pushToast({
          title: "Location captured",
          description: "Current location has been pinned on the map."
        });
        setDetectingLocation(false);
      },
      () => {
        pushToast({
          title: "Location access denied",
          description: "Allow location permission or pin the location manually on the map."
        });
        setDetectingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000
      }
    );
  }

  async function handleCopyCoordinates() {
    if (!locationReady) {
      pushToast({
        title: "Select a map location first",
        description: "Use search or click on the map before copying coordinates."
      });
      return;
    }

    try {
      await copyTextToClipboard(coordinatesLabel);

      pushToast({
        title: "Coordinates copied",
        description: "Map coordinates are copied to clipboard."
      });
    } catch {
      pushToast({
        title: "Copy failed",
        description: "Unable to copy coordinates right now."
      });
    }
  }

  function handleInsertLocationInDescription() {
    if (!locationReady) {
      pushToast({
        title: "Select a map location first",
        description: "Use search or click on the map before adding location details."
      });
      return;
    }

    const locationLine = `Location pin: ${coordinatesLabel}`;
    const timestampLine = `Reported at: ${new Date().toLocaleString()}`;

    setForm((current) => {
      if (current.description.includes(locationLine)) {
        return current;
      }

      const prefix = current.description.trim() ? `${current.description.trim()}\n\n` : "";
      return {
        ...current,
        description: `${prefix}${locationLine}\n${timestampLine}`
      };
    });

    pushToast({
      title: "Location details added",
      description: "Coordinates and report time were inserted into description."
    });
  }

  function addTrustedContact(event) {
    event.preventDefault();
    const name = newContact.name.trim();
    const phone = normalizePhone(newContact.phone);

    if (!name || !phone) {
      pushToast({
        title: "Contact details required",
        description: "Enter both name and phone number."
      });
      return;
    }

    if (trustedContacts.some((contact) => contact.phone === phone)) {
      pushToast({
        title: "Duplicate contact",
        description: "This phone number is already in trusted contacts."
      });
      return;
    }

    if (trustedContacts.length >= 5) {
      pushToast({
        title: "Limit reached",
        description: "You can keep up to 5 trusted contacts."
      });
      return;
    }

    setTrustedContacts((current) => [...current, { id: `c-${Date.now()}`, name, phone }]);
    setNewContact({ name: "", phone: "" });
  }

  function removeTrustedContact(id) {
    setTrustedContacts((current) => current.filter((contact) => contact.id !== id));
  }

  async function shareLiveLocationWithContacts() {
    if (trustedContacts.length === 0) {
      pushToast({
        title: "No trusted contacts",
        description: "Add at least one trusted contact first."
      });
      return;
    }

    setDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        handleLocationChange({ latitude, longitude });
        const message = `${composeSafetyMessage(
          "Live location update for safety check.",
          latitude,
          longitude
        )}\nPlease open WhatsApp live location and share real-time tracking.`;
        setActiveSafetyMessage(message);
        const primaryContact = trustedContacts[0];

        try {
          await copyTextToClipboard(message);
        } catch {
        }

        try {
          window.location.href = buildWhatsAppUrl(primaryContact.phone, message);
          pushToast({
            title: "Opening WhatsApp",
            description:
              trustedContacts.length > 1
                ? `Sending to ${primaryContact.name}. You can use per-contact WhatsApp buttons for others.`
                : `Sending to ${primaryContact.name}. Tap send in WhatsApp.`
          });
        } catch {
          pushToast({
            title: "WhatsApp open failed",
            description: "Use the WhatsApp action next to the trusted contact."
          });
        }
        setDetectingLocation(false);
      },
      () => {
        pushToast({
          title: "Unable to fetch live location",
          description: "Enable location permission and try again."
        });
        setDetectingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000
      }
    );
  }

  async function triggerPanicAlert() {
    if (!navigator.geolocation) {
      pushToast({
        title: "Panic alert unavailable",
        description: "Geolocation is not supported in this browser."
      });
      return;
    }
    if (trustedContacts.length === 0) {
      pushToast({
        title: "Add trusted contacts first",
        description: "Panic alert requires at least one saved contact to send SMS."
      });
      return;
    }

    setSendingPanic(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        handleLocationChange({ latitude, longitude });
        const text = composeSafetyMessage("PANIC ALERT: Immediate police assistance requested.", latitude, longitude);

        const panicPayload = {
          id: `chat-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          senderEmail: user.email,
          senderName: user.name,
          senderRole: user.role,
          targetRole: "POLICE",
          targetEmail: "",
          type: "PANIC",
          text,
          timestamp: new Date().toISOString()
        };
        const panicSentToPolice = publishChatMessage(panicPayload);
        setActiveSafetyMessage(text);

        try {
          await copyTextToClipboard(text);
        } catch {
        }

        try {
          const contactNumbers = trustedContacts.map((contact) => contact.phone);
          window.location.href = buildSmsUrl(contactNumbers, text);
        } catch {
        }

        pushToast({
          title: "Panic alert processed",
          description: panicSentToPolice
            ? "Police channel alerted. SMS opened with trusted contacts and live location."
            : "SMS opened with trusted contacts and live location. Chat is reconnecting for police channel."
        });
        setSendingPanic(false);
      },
      () => {
        pushToast({
          title: "Panic alert failed",
          description: "Unable to access your location. Please call emergency number directly."
        });
        setSendingPanic(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000
      }
    );
  }

  function sendChatToPolice(event) {
    event.preventDefault();
    const text = chatInput.trim();
    if (!text) {
      return;
    }

    const messagePayload = {
      id: `chat-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      senderEmail: user.email,
      senderName: user.name,
      senderRole: user.role,
      targetRole: "POLICE",
      targetEmail: "",
      type: "CHAT",
      text,
      timestamp: new Date().toISOString()
    };

    const sent = publishChatMessage(messagePayload);
    if (sent) {
      setChatInput("");
    }
  }

  function handleMediaChange(event) {
    const selectedFiles = Array.from(event.target.files || []);
    event.target.value = "";

    if (!selectedFiles.length) {
      return;
    }

    setForm((current) => {
      const nextFiles = [...current.mediaFiles];
      const remainingSlots = MAX_MEDIA_FILES - nextFiles.length;

      if (remainingSlots <= 0) {
        pushToast({
          title: "Upload limit reached",
          description: `You can upload up to ${MAX_MEDIA_FILES} files per report.`
        });
        return current;
      }

      for (const file of selectedFiles.slice(0, remainingSlots)) {
        const contentType = file.type || "";
        const isImage = contentType.startsWith("image/");
        const isVideo = contentType.startsWith("video/");

        if (!isImage && !isVideo) {
          pushToast({
            title: "Unsupported file",
            description: `${file.name} is not an image or video.`
          });
          continue;
        }

        if (isImage && file.size > MAX_IMAGE_BYTES) {
          pushToast({
            title: "Image too large",
            description: `${file.name} exceeds 4 MB.`
          });
          continue;
        }

        if (isVideo && file.size > MAX_VIDEO_BYTES) {
          pushToast({
            title: "Video too large",
            description: `${file.name} exceeds 15 MB.`
          });
          continue;
        }

        nextFiles.push(file);
      }

      return {
        ...current,
        mediaFiles: nextFiles
      };
    });
  }

  function removeMediaFile(index) {
    setForm((current) => ({
      ...current,
      mediaFiles: current.mediaFiles.filter((_, fileIndex) => fileIndex !== index)
    }));
  }

  function applySuggestedTitle() {
    setForm((current) => ({
      ...current,
      title: aiDraft.suggestedTitle
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (form.latitude === null || form.longitude === null) {
      pushToast({
        title: "Location required",
        description: "Search by place name or click on the map to pin the incident location."
      });
      return;
    }

    if (!isOnline) {
      queueReportOffline();
      return;
    }

    setSubmitting(true);

    try {
      await createReport({
        title: form.title,
        description: form.description,
        latitude: form.latitude,
        longitude: form.longitude,
        mediaFiles: form.mediaFiles
      });

      pushToast({
        title: "Report submitted",
        description: "Your incident report was saved and is now visible in your tracker."
      });
      navigate("/my-reports");
    } catch (requestError) {
      const status = requestError.response?.status;
      if (status === 401) {
        logout();
        navigate("/login", { replace: true });
        return;
      }
      if (status === 403 && user?.role && user.role !== "USER") {
        navigate("/police/verification", { replace: true });
        return;
      }
      const shouldQueueOffline = !requestError.response || [502, 503, 504].includes(status);
      if (shouldQueueOffline) {
        queueReportOffline();
        return;
      }
      pushToast({
        title: "Submission failed",
        description: getErrorMessage(requestError, "The server could not save your report.")
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow="Citizen reporting"
        title="Submit a new crime report"
        description="Add a concise summary, describe what happened, and pin the location accurately on the map."
      />

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <form className="panel space-y-5" onSubmit={handleSubmit}>
          <FormField
            label="Incident title"
            name="title"
            placeholder="Suspicious activity near market entrance"
            value={form.title}
            onChange={handleChange}
            required
          />
          <FormField
            as="textarea"
            rows="6"
            label="Description"
            name="description"
            placeholder="Provide the key facts, time window, and any visible details that help responders."
            value={form.description}
            onChange={handleChange}
            required
          />

          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-semibold text-slate-900">AI report assistant</p>
              <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ${aiDraft.severityTone}`}>
                {aiDraft.severity} priority
              </span>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-white px-3 py-3">
                <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Category</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{aiDraft.category}</p>
              </div>
              <div className="rounded-xl bg-white px-3 py-3">
                <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Completeness</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{aiDraft.completenessScore}%</p>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full bg-sky-500"
                    style={{ width: `${aiDraft.completenessScore}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={applySuggestedTitle}
                disabled={!aiDraft.suggestedTitle}
              >
                Use AI title suggestion
              </Button>
              <p className="self-center text-xs text-slate-600">
                Suggested title: {aiDraft.suggestedTitle}
              </p>
            </div>

            {aiDraft.missing.length ? (
              <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-xs text-amber-800">
                {aiDraft.missing.map((tip, index) => (
                  <p key={`missing-${index}`}>{tip}</p>
                ))}
              </div>
            ) : null}

            {aiDraft.tips.length ? (
              <div className="mt-3 rounded-xl border border-slate-200 bg-white px-3 py-3 text-xs text-slate-600">
                {aiDraft.tips.map((tip, index) => (
                  <p key={`tip-${index}`}>{tip}</p>
                ))}
              </div>
            ) : null}
          </div>

          <div className="rounded-2xl bg-sand px-4 py-3 text-sm text-slate-700">
            <p className="font-semibold text-slate-900">Selected location</p>
            <p className="mt-1">
              {form.latitude !== null && form.longitude !== null
                ? `${form.latitude.toFixed(5)}, ${form.longitude.toFixed(5)}`
                : "No location selected yet"}
            </p>
          </div>

          <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
            <div>
              <p className="text-sm font-semibold text-slate-900">Upload media (optional)</p>
              <p className="mt-1 text-xs text-slate-600">
                Add up to {MAX_MEDIA_FILES} files. Images up to 4 MB each, videos up to 15 MB each.
              </p>
            </div>
            <input
              type="file"
              accept="image/*,video/*"
              multiple
              className="input-field"
              onChange={handleMediaChange}
            />

            {form.mediaFiles.length ? (
              <div className="space-y-2">
                {form.mediaFiles.map((file, index) => (
                  <div
                    key={`${file.name}-${file.size}-${index}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2"
                  >
                    <p className="min-w-0 text-xs text-slate-700">
                      <span className="block truncate font-semibold">{file.name}</span>
                      <span className="text-slate-500">{formatFileSize(file.size)}</span>
                    </p>
                    <button
                      type="button"
                      className="text-xs font-semibold text-rose-600 hover:text-rose-700"
                      onClick={() => removeMediaFile(index)}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <Button type="submit" disabled={submitting}>
            {submitting ? "Submitting..." : "Submit Report"}
          </Button>

          <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">{t.sectionTitle}</p>
                <p className="mt-1 text-xs text-slate-600">{t.sectionSubtitle}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">{t.languageLabel}</span>
                <button
                  type="button"
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold ring-1 ${
                    uiLanguage === "en"
                      ? "bg-slate-900 text-white ring-slate-900"
                      : "bg-white text-slate-700 ring-slate-200"
                  }`}
                  onClick={() => setUiLanguage("en")}
                >
                  {t.englishLabel}
                </button>
                <button
                  type="button"
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold ring-1 ${
                    uiLanguage === "te"
                      ? "bg-slate-900 text-white ring-slate-900"
                      : "bg-white text-slate-700 ring-slate-200"
                  }`}
                  onClick={() => setUiLanguage("te")}
                >
                  {t.teluguLabel}
                </button>
              </div>
            </div>

            <p className="rounded-xl bg-white px-3 py-2 text-xs text-slate-600">
              {locationReady
                ? `${t.locationContext}: ${AWARENESS_RADIUS_KM} ${t.locationRadiusSuffix}`
                : t.noArea}
            </p>

            {awarenessLoading ? <p className="text-xs text-slate-600">{t.loadingAwareness}</p> : null}

            {!awarenessLoading && awarenessError ? (
              <div className="space-y-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-3">
                <p className="text-xs text-rose-700">{awarenessError}</p>
                <Button type="button" variant="ghost" onClick={() => refreshAwarenessInsights()}>
                  {t.tryAgain}
                </Button>
              </div>
            ) : null}

            {!awarenessLoading && !awarenessError ? (
              <>
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{t.statsTitle}</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="rounded-xl bg-white px-3 py-3">
                      <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500">{t.total}</p>
                      <p className="mt-1 text-lg font-semibold text-slate-900">{areaStats.total}</p>
                    </div>
                    <div className="rounded-xl bg-white px-3 py-3">
                      <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500">{t.recent7Days}</p>
                      <p className="mt-1 text-lg font-semibold text-slate-900">{areaStats.recent7Days}</p>
                    </div>
                    <div className="rounded-xl bg-white px-3 py-3">
                      <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500">{t.pending}</p>
                      <p className="mt-1 text-lg font-semibold text-slate-900">{areaStats.pending}</p>
                    </div>
                    <div className="rounded-xl bg-white px-3 py-3">
                      <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500">{t.inProgress}</p>
                      <p className="mt-1 text-lg font-semibold text-slate-900">{areaStats.inProgress}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{t.recentCrimesTitle}</p>
                  {recentNearbyReports.length ? (
                    <div className="max-h-44 space-y-2 overflow-y-auto rounded-xl border border-slate-200 bg-white px-3 py-3">
                      {recentNearbyReports.map((report) => {
                        const reportStatus = statusLabels[report.status] || t.statusUnknown;
                        const reportMapLink = `https://www.google.com/maps/search/?api=1&query=${report.latitude},${report.longitude}`;
                        return (
                          <div key={report.id} className="rounded-lg bg-slate-50 px-2 py-2 text-xs text-slate-700">
                            <p className="font-semibold text-slate-900">{report.title || "Incident report"}</p>
                            <p className="mt-1">{reportStatus}</p>
                            <p className="mt-1 text-slate-500">
                              {report.distanceFromPinKm !== null
                                ? `${report.distanceFromPinKm.toFixed(1)} ${t.distanceAway}`
                                : new Date(report.createdAt || Date.now()).toLocaleString()}
                            </p>
                            <a
                              href={reportMapLink}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-1 inline-block font-semibold text-sky-700 underline underline-offset-2"
                            >
                              {t.viewMap}
                            </a>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-xs text-slate-600">
                      {t.noNearby}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{t.safetyTipsTitle}</p>
                  <div className="space-y-2 rounded-xl border border-slate-200 bg-white px-3 py-3">
                    {awarenessTips.map((tip, index) => (
                      <p key={`awareness-tip-${index}`} className="text-xs text-slate-700">
                        {tip}
                      </p>
                    ))}
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </form>

        <div className="panel space-y-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-950">Pin the incident</h2>
            <p className="mt-2 text-sm text-slate-600">
              Search by location name or click directly on the map to capture latitude and longitude.
            </p>
          </div>
          <MapPicker
            latitude={form.latitude}
            longitude={form.longitude}
            onChange={handleLocationChange}
          />

          <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">Location & submission readiness</p>
                <p className="mt-1 text-xs text-slate-600">Complete these checks for faster verification.</p>
              </div>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-900 ring-1 ring-slate-200">
                {readinessScore}% ready
              </span>
            </div>

            <div className="h-2 overflow-hidden rounded-full bg-slate-200">
              <div className="h-full bg-emerald-500" style={{ width: `${readinessScore}%` }} />
            </div>

            <div className="space-y-3 rounded-xl border border-slate-200 bg-white px-3 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
                Quick location tools
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleUseCurrentLocation}
                  disabled={detectingLocation}
                >
                  {detectingLocation ? "Detecting..." : "Use current location"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleCopyCoordinates}
                  disabled={!locationReady}
                >
                  Copy coordinates
                </Button>
                <a
                  href={googleMapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(event) => {
                    if (!locationReady) {
                      event.preventDefault();
                    }
                  }}
                  className={`inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold ring-1 transition ${
                    locationReady
                      ? "text-slate-700 ring-slate-200 hover:bg-slate-50"
                      : "cursor-not-allowed text-slate-400 ring-slate-200"
                  }`}
                >
                  Open in Google Maps
                </a>
                <a
                  href={openStreetMapUrl}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(event) => {
                    if (!locationReady) {
                      event.preventDefault();
                    }
                  }}
                  className={`inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold ring-1 transition ${
                    locationReady
                      ? "text-slate-700 ring-slate-200 hover:bg-slate-50"
                      : "cursor-not-allowed text-slate-400 ring-slate-200"
                  }`}
                >
                  Open in OpenStreetMap
                </a>
              </div>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={handleInsertLocationInDescription}
                disabled={!locationReady}
              >
                Add location details to description
              </Button>
            </div>
          </div>

          <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-semibold text-slate-900">Women safety mode</p>
              <button
                type="button"
                className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${
                  womenSafetyMode
                    ? "bg-rose-100 text-rose-700 ring-rose-200"
                    : "bg-white text-slate-700 ring-slate-200"
                }`}
                onClick={() => setWomenSafetyMode((current) => !current)}
              >
                {womenSafetyMode ? "Enabled" : "Disabled"}
              </button>
            </div>

            <form className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]" onSubmit={addTrustedContact}>
              <input
                className="input-field"
                type="text"
                placeholder="Contact name"
                value={newContact.name}
                onChange={(event) =>
                  setNewContact((current) => ({
                    ...current,
                    name: event.target.value
                  }))
                }
              />
              <input
                className="input-field"
                type="tel"
                placeholder="Phone number"
                value={newContact.phone}
                onChange={(event) =>
                  setNewContact((current) => ({
                    ...current,
                    phone: normalizePhone(event.target.value)
                  }))
                }
              />
              <Button type="submit" variant="ghost">
                Add
              </Button>
            </form>

            {trustedContacts.length ? (
              <div className="space-y-2 rounded-xl border border-slate-200 bg-white px-3 py-3">
                {trustedContacts.map((contact) => (
                  <div key={contact.id} className="flex items-center justify-between gap-3 text-xs">
                    <p className="min-w-0 truncate text-slate-700">
                      <span className="font-semibold">{contact.name}</span> ({contact.phone})
                    </p>
                    <div className="flex items-center gap-2">
                      <a className="text-emerald-700 hover:underline" href={`tel:${contact.phone}`}>
                        Call
                      </a>
                      <a
                        className="text-sky-700 hover:underline"
                        href={buildSmsUrl([contact.phone], contactMessage)}
                      >
                        SMS
                      </a>
                      <a
                        className="text-green-700 hover:underline"
                        href={buildWhatsAppUrl(contact.phone, contactMessage)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        WhatsApp
                      </a>
                      <button
                        type="button"
                        className="text-rose-600 hover:underline"
                        onClick={() => removeTrustedContact(contact.id)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-600">Add trusted contacts for live-location and panic alerts.</p>
            )}

            <div className="grid gap-2 sm:grid-cols-2">
              <Button type="button" variant="ghost" onClick={shareLiveLocationWithContacts} disabled={detectingLocation}>
                {detectingLocation ? "Getting live location..." : "Share live location on WhatsApp"}
              </Button>
              <Button type="button" onClick={triggerPanicAlert} disabled={sendingPanic || chatState !== "connected"}>
                {sendingPanic ? "Sending panic alert..." : "Send panic alert"}
              </Button>
            </div>
          </div>

          <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-slate-900">Offline reporting</p>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${isOnline ? "bg-emerald-100 text-emerald-700 ring-emerald-200" : "bg-amber-100 text-amber-700 ring-amber-200"}`}>
                {isOnline ? "Online" : "Offline"}
              </span>
            </div>
            <p className="text-xs text-slate-600">
              Pending offline reports: <span className="font-semibold">{offlineQueue.length}</span>
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              <Button
                type="button"
                variant="ghost"
                onClick={syncOfflineReports}
                disabled={!isOnline || syncingQueue || offlineQueue.length === 0}
              >
                {syncingQueue ? "Syncing..." : "Sync queued reports"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setOfflineQueue([]);
                  pushToast({
                    title: "Offline queue cleared",
                    description: "All pending offline reports were removed."
                  });
                }}
                disabled={offlineQueue.length === 0 || syncingQueue}
              >
                Clear queue
              </Button>
            </div>
            {offlineQueue.length ? (
              <div className="max-h-32 space-y-1 overflow-y-auto rounded-xl border border-slate-200 bg-white px-3 py-3 text-xs text-slate-700">
                {offlineQueue.map((item) => (
                  <p key={item.id}>
                    {new Date(item.createdAt).toLocaleTimeString()} - {item.title || "Untitled report"}
                  </p>
                ))}
              </div>
            ) : null}
          </div>

          <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-slate-900">Communication center</p>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                Chat {chatState}
              </span>
            </div>

            <div className="max-h-40 space-y-2 overflow-y-auto rounded-xl border border-slate-200 bg-white px-3 py-3">
              {chatVisibleMessages.length ? (
                chatVisibleMessages.map((message) => (
                  <div key={message.id} className="rounded-lg bg-slate-50 px-2 py-2 text-xs">
                    <p className="font-semibold text-slate-800">
                      {message.senderName || message.senderEmail} ({message.senderRole})
                    </p>
                    <p className="mt-1 text-slate-700">{message.text}</p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-600">No chat messages yet. Send a message to police support.</p>
              )}
            </div>

            <form className="flex gap-2" onSubmit={sendChatToPolice}>
              <input
                className="input-field"
                type="text"
                placeholder="Type message to police..."
                value={chatInput}
                onChange={(event) => setChatInput(event.target.value)}
              />
              <Button type="submit" variant="ghost" disabled={chatState !== "connected"}>
                Send
              </Button>
            </form>

            <div className="grid gap-2 sm:grid-cols-3">
              <a
                className="inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold ring-1 ring-slate-200 transition hover:bg-slate-50"
                href="tel:112"
              >
                Call 112
              </a>
              <a
                className="inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold ring-1 ring-slate-200 transition hover:bg-slate-50"
                href="tel:100"
              >
                Call Police 100
              </a>
              <a
                className="inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold ring-1 ring-slate-200 transition hover:bg-slate-50"
                href={nearestStationMapsUrl}
                target="_blank"
                rel="noreferrer"
              >
                Nearest station
              </a>
            </div>
          </div>

          <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">{t.personalSafetyScoreTitle}</p>
                <p className="mt-1 text-xs text-slate-600">{t.personalSafetyScoreSubtitle}</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${safetyRiskMeta.badgeClass}`}>
                {safetyRiskMeta.label}
              </span>
            </div>

            <div className="space-y-3 rounded-xl border border-slate-200 bg-white px-3 py-3">
              <div className="flex items-end justify-between gap-3">
                <p className="text-3xl font-bold text-slate-900">{personalSafetyScore}</p>
                <p className="text-xs text-slate-500">{t.scoreOutOf100}</p>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                <div className={`h-full ${safetyRiskMeta.barClass}`} style={{ width: `${personalSafetyScore}%` }} />
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500">{t.locationSafetyLabel}</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">{locationSafetyScore}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500">{t.activityPatternLabel}</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">{activityPatternScore}</p>
              </div>
            </div>

            <div className="space-y-2 rounded-xl border border-slate-200 bg-white px-3 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{t.improveSafetyTitle}</p>
              {personalSafetyTips.map((tip, index) => (
                <p key={`score-tip-${index}`} className="text-xs text-slate-700">
                  {tip}
                </p>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
