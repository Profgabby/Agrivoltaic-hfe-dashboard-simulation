import React, { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Status = "Normal" | "Watch" | "Warning" | "Critical";
type LoadLevel = "Low" | "Medium" | "High";
type Stage = "decision" | "feedback" | "tlx" | "sagat";

type Metric = {
  value: string;
  status: Status;
  meaning: string;
};

type Scenario = {
  id: string;
  loadLevel: LoadLevel;
  principle: string;
  title: string;
  criticalSignal: string;
  dashboard: Record<string, Metric>;
  alerts: string[];
  question: string;
  options: { text: string; consequence: string }[];
  correct: string;
  recommendation: string;
  sagatQuestion: string;
  sagatOptions: string[];
  sagatCorrect: string;
  trendData: Array<{
    time: string;
    moisture: number;
    temp: number;
    solar: number;
    battery: number;
    stress: number;
  }>;
};

type ResponseRow = {
  participant: string;
  scenarioId: string;
  loadLevel: LoadLevel;
  principle: string;
  question: string;
  selectedAnswer: string;
  correctAnswer: string;
  accuracy: "Correct" | "Incorrect";
  responseTimeSeconds: string;
  consequence: string;
  recommendation: string;
  timestamp: string;
  tlxMental?: number;
  tlxPhysical?: number;
  tlxTemporal?: number;
  tlxPerformance?: number;
  tlxEffort?: number;
  tlxFrustration?: number;
  tlxScore?: number;
  sagatQuestion?: string;
  sagatSelected?: string;
  sagatCorrectAnswer?: string;
  sagatAccuracy?: "Correct" | "Incorrect";
};

type TlxState = {
  Mental: number;
  Physical: number;
  Temporal: number;
  Performance: number;
  Effort: number;
  Frustration: number;
};

const COLORS = {
  green: "#1B5E20",
  green2: "#2E7D32",
  red: "#C62828",
  orange: "#EF6C00",
  blue: "#1565C0",
  purple: "#6A1B9A",
  slate: "#0F172A",
};

const trend = (
  moisture: number[],
  temp: number[],
  solar: number[],
  battery: number[],
  stress: number[]
) =>
  ["08:00", "09:00", "10:00", "11:00", "12:00"].map((time, i) => ({
    time,
    moisture: moisture[i],
    temp: temp[i],
    solar: solar[i],
    battery: battery[i],
    stress: stress[i],
  }));

const scenarios: Scenario[] = [
  {
    id: "L1",
    loadLevel: "Low",
    principle: "Salience + Proximity",
    title: "Low Load 1: Water Status Dashboard",
    criticalSignal: "Soil moisture is falling below the safe crop threshold.",
    dashboard: {
      "Soil Moisture": { value: "28%", status: "Warning", meaning: "Crop water is becoming low" },
      "Air Temperature": { value: "29°C", status: "Normal", meaning: "Acceptable field temperature" },
      "Solar Output": { value: "80%", status: "Normal", meaning: "Energy production is stable" },
      Humidity: { value: "55%", status: "Normal", meaning: "No humidity problem" },
    },
    alerts: ["Moderate irrigation demand"],
    question: "Crop moisture is gradually declining while all other systems remain stable. Which action is most appropriate?",
    options: [
      { text: "Increase irrigation moderately", consequence: "Correct. This responds directly to the moisture warning." },
      { text: "Shut down energy monitoring", consequence: "Incorrect. The solar system is stable and does not require shutdown." },
      { text: "Replace environmental sensors", consequence: "Incorrect. The dashboard does not indicate sensor failure." },
      { text: "Reduce crop shading", consequence: "Incorrect. The problem is water deficit, not excess shade." },
    ],
    correct: "Increase irrigation moderately",
    recommendation: "Increase irrigation moderately and recheck soil moisture after the next irrigation cycle.",
    sagatQuestion: "Which variable was the main warning signal?",
    sagatOptions: ["Soil Moisture", "Solar Output", "Humidity", "Air Temperature"],
    sagatCorrect: "Soil Moisture",
    trendData: trend([39, 35, 32, 30, 28], [27, 27, 28, 29, 29], [74, 77, 80, 82, 80], [80, 78, 78, 77, 76], [20, 24, 29, 35, 42]),
  },
  {
    id: "L2",
    loadLevel: "Low",
    principle: "Expectations + Accessible Language",
    title: "Low Load 2: Water Tank Dashboard",
    criticalSignal: "Water reserve is declining before crop stress becomes visible.",
    dashboard: {
      "Crop Temperature": { value: "27°C", status: "Normal", meaning: "Crop heat is acceptable" },
      "Water Tank": { value: "48%", status: "Warning", meaning: "Water reserve is below preferred level" },
      "Solar Output": { value: "85%", status: "Normal", meaning: "Solar system is performing well" },
      "Wind Speed": { value: "Low", status: "Normal", meaning: "No wind-related risk" },
    },
    alerts: ["Water reserve declining"],
    question: "Water storage levels are falling but crop conditions remain stable. What should the operator monitor next?",
    options: [
      { text: "Irrigation supply system", consequence: "Correct. A falling tank level requires checking irrigation supply before crops suffer." },
      { text: "Crop harvest schedule", consequence: "Incorrect. Harvest timing is not the immediate issue." },
      { text: "Solar panel angle", consequence: "Incorrect. Solar output is stable." },
      { text: "Wind direction", consequence: "Incorrect. Wind is low and not the current risk." },
    ],
    correct: "Irrigation supply system",
    recommendation: "Check the irrigation supply line, pump status, and tank refill schedule before the next watering period.",
    sagatQuestion: "Which subsystem should be checked next?",
    sagatOptions: ["Irrigation supply", "Solar angle", "Wind direction", "Harvest timing"],
    sagatCorrect: "Irrigation supply",
    trendData: trend([42, 39, 36, 33, 31], [26, 26, 27, 27, 27], [80, 82, 84, 86, 85], [85, 80, 73, 60, 48], [18, 20, 22, 25, 29]),
  },
  {
    id: "L3",
    loadLevel: "Low",
    principle: "Interface Signal + Expectations",
    title: "Low Load 3: Stable Energy Dashboard",
    criticalSignal: "Energy is stable, but irrigation timing still needs routine attention.",
    dashboard: {
      "Soil Moisture": { value: "31%", status: "Watch", meaning: "Acceptable but trending down" },
      "Solar Output": { value: "88%", status: "Normal", meaning: "Strong energy production" },
      "Battery Level": { value: "78%", status: "Normal", meaning: "Backup power is available" },
      "Irrigation Timer": { value: "Due in 30 min", status: "Watch", meaning: "Routine irrigation is approaching" },
    },
    alerts: ["Irrigation cycle due soon"],
    question: "The dashboard shows stable solar energy but the irrigation cycle is due soon. What should the farmer do next?",
    options: [
      { text: "Prepare the irrigation cycle", consequence: "Correct. The main expected action is to prepare irrigation at the scheduled time." },
      { text: "Turn off the battery", consequence: "Incorrect. Battery level is normal and useful for backup." },
      { text: "Ignore irrigation because solar is strong", consequence: "Incorrect. Solar performance does not replace crop water needs." },
      { text: "Harvest immediately", consequence: "Incorrect. Nothing indicates urgent harvest need." },
    ],
    correct: "Prepare the irrigation cycle",
    recommendation: "Prepare irrigation valves, confirm water availability, and begin the scheduled irrigation cycle if field moisture continues downward.",
    sagatQuestion: "What event is expected soon?",
    sagatOptions: ["Irrigation cycle", "Battery shutdown", "Solar failure", "Emergency harvest"],
    sagatCorrect: "Irrigation cycle",
    trendData: trend([40, 38, 35, 33, 31], [25, 26, 26, 27, 27], [78, 82, 86, 88, 88], [74, 75, 77, 78, 78], [16, 18, 21, 24, 28]),
  },
  {
    id: "M1",
    loadLevel: "Medium",
    principle: "Redundancy + Interface Signal",
    title: "Medium Load 1: Crop Stress Dashboard",
    criticalSignal: "Low soil moisture and high temperature are combining to increase crop stress.",
    dashboard: {
      "Soil Moisture": { value: "18%", status: "Critical", meaning: "Crop water deficit is high" },
      "Air Temperature": { value: "35°C", status: "Warning", meaning: "Heat stress risk is increasing" },
      Humidity: { value: "65%", status: "Normal", meaning: "Humidity is acceptable" },
      "Solar Output": { value: "72%", status: "Normal", meaning: "Energy is usable" },
      "Battery Level": { value: "48%", status: "Watch", meaning: "Battery is lower but not urgent" },
    },
    alerts: ["Irrigation needed", "High crop temperature"],
    question: "Both crop temperature and soil moisture are reaching critical thresholds. Which issue should be addressed first?",
    options: [
      { text: "Soil moisture depletion", consequence: "Correct. Water deficit is the direct cause that can worsen heat stress." },
      { text: "Battery recharge cycle", consequence: "Incorrect. Battery is not the immediate crop-risk driver." },
      { text: "Solar energy efficiency", consequence: "Incorrect. Energy performance is not the most urgent crop threat." },
      { text: "Humidity adjustment", consequence: "Incorrect. Humidity is within the acceptable range." },
    ],
    correct: "Soil moisture depletion",
    recommendation: "Prioritize irrigation, then continue monitoring temperature and crop stress after water delivery improves.",
    sagatQuestion: "Which two conditions are combining to create crop stress?",
    sagatOptions: ["Low moisture + high temperature", "High battery + low wind", "High humidity + solar gain", "Sensor delay + high wind"],
    sagatCorrect: "Low moisture + high temperature",
    trendData: trend([31, 27, 23, 20, 18], [29, 31, 33, 34, 35], [80, 78, 76, 74, 72], [70, 65, 58, 52, 48], [35, 44, 55, 66, 76]),
  },
  {
    id: "M2",
    loadLevel: "Medium",
    principle: "Discriminability + Salience",
    title: "Medium Load 2: Irrigation Pressure Dashboard",
    criticalSignal: "Irrigation pressure is unstable while crop stress is rising.",
    dashboard: {
      "Irrigation Pressure": { value: "Low", status: "Critical", meaning: "Water delivery may fail" },
      "Crop Stress Index": { value: "High", status: "Critical", meaning: "Plants are under stress" },
      "Solar Efficiency": { value: "70%", status: "Normal", meaning: "PV system is acceptable" },
      "Wind Speed": { value: "Moderate", status: "Normal", meaning: "No immediate wind hazard" },
      "Battery Level": { value: "44%", status: "Watch", meaning: "Monitor later" },
    },
    alerts: ["Crop stress increasing", "Irrigation pressure unstable"],
    question: "The system reports unstable irrigation pressure alongside increasing crop stress. Which action is the best operational response?",
    options: [
      { text: "Inspect irrigation system immediately", consequence: "Correct. Low pressure may prevent water from reaching crops." },
      { text: "Reorient solar panels", consequence: "Incorrect. The current issue is water delivery, not solar orientation." },
      { text: "Export historical data", consequence: "Incorrect. Reporting can wait until the urgent risk is controlled." },
      { text: "Reduce battery usage", consequence: "Incorrect. Battery status is secondary in this scenario." },
    ],
    correct: "Inspect irrigation system immediately",
    recommendation: "Inspect pump, valves, filters, and pipe leakage immediately; confirm pressure recovery before leaving the field.",
    sagatQuestion: "Which subsystem is unstable?",
    sagatOptions: ["Irrigation pressure", "Solar efficiency", "Wind speed", "Battery level"],
    sagatCorrect: "Irrigation pressure",
    trendData: trend([34, 30, 25, 22, 19], [28, 30, 32, 34, 36], [78, 76, 73, 71, 70], [64, 59, 54, 49, 44], [32, 43, 55, 68, 80]),
  },
  {
    id: "M3",
    loadLevel: "Medium",
    principle: "Proximity + Action Guidance",
    title: "Medium Load 3: Shade and Water Balance Dashboard",
    criticalSignal: "Crop stress is rising because shade is acceptable but water delivery is delayed.",
    dashboard: {
      "Shade Level": { value: "Optimal", status: "Normal", meaning: "Panel shade is helping crop comfort" },
      "Soil Moisture": { value: "20%", status: "Critical", meaning: "Water is too low" },
      "Irrigation Delay": { value: "45 min", status: "Warning", meaning: "Water delivery is late" },
      "Solar Output": { value: "76%", status: "Normal", meaning: "Energy is acceptable" },
      "Crop Stress": { value: "Rising", status: "Critical", meaning: "Plant risk is increasing" },
    },
    alerts: ["Irrigation delayed", "Crop stress rising"],
    question: "Shade is optimal, but soil moisture is low and irrigation is delayed. What is the best next step?",
    options: [
      { text: "Start backup irrigation", consequence: "Correct. The crop stress is tied to delayed water delivery." },
      { text: "Reduce shade immediately", consequence: "Incorrect. Shade is optimal and is not the cause of the stress." },
      { text: "Optimize solar output first", consequence: "Incorrect. Energy is acceptable; crop water is urgent." },
      { text: "Wait until tomorrow", consequence: "Incorrect. Crop stress is already rising." },
    ],
    correct: "Start backup irrigation",
    recommendation: "Use backup irrigation or manual watering support until the automated irrigation delay is resolved.",
    sagatQuestion: "Is shade the main problem in this scenario?",
    sagatOptions: ["No, water delivery is the issue", "Yes, shade is too high", "Yes, shade is too low", "No, battery is the only issue"],
    sagatCorrect: "No, water delivery is the issue",
    trendData: trend([35, 31, 27, 23, 20], [28, 29, 31, 32, 33], [82, 80, 78, 76, 76], [66, 61, 58, 54, 50], [30, 40, 52, 65, 78]),
  },
  {
    id: "H1",
    loadLevel: "High",
    principle: "Cognitive Load Control + Priority Coding",
    title: "High Load 1: Emergency Prioritization Dashboard",
    criticalSignal: "The most immediate risk is irrigation failure under heat stress conditions.",
    dashboard: {
      "Soil Moisture": { value: "14%", status: "Critical", meaning: "Severe water deficit" },
      "Crop Temperature": { value: "38°C", status: "Critical", meaning: "Heat stress is likely" },
      Humidity: { value: "72%", status: "Watch", meaning: "May worsen discomfort" },
      "Battery Level": { value: "32%", status: "Warning", meaning: "Energy backup is low" },
      "Wind Speed": { value: "High", status: "Watch", meaning: "Monitor structure safety" },
      "Sensor Delay": { value: "Detected", status: "Warning", meaning: "Data may be delayed" },
      "Solar Output": { value: "65%", status: "Normal", meaning: "Reduced but usable" },
    },
    alerts: ["CRITICAL IRRIGATION FAILURE", "HEAT STRESS WARNING", "BATTERY LOW", "SENSOR DELAY"],
    question: "Multiple systems are reporting simultaneous failures. Which issue presents the highest immediate operational risk?",
    options: [
      { text: "Irrigation failure", consequence: "Correct. Water failure during heat stress can rapidly damage crops." },
      { text: "Wind speed increase", consequence: "Incorrect. It is important, but less immediate than irrigation failure here." },
      { text: "Battery storage level", consequence: "Incorrect. Battery is low, but crop survival depends first on irrigation." },
      { text: "Sensor communication delay", consequence: "Incorrect. Data delay matters, but the visible operational risk is irrigation failure." },
    ],
    correct: "Irrigation failure",
    recommendation: "Activate emergency irrigation response, verify pump power, and assign a technician to inspect water delivery immediately.",
    sagatQuestion: "Which alert should receive highest priority?",
    sagatOptions: ["Critical irrigation failure", "Sensor delay", "Battery low", "High wind"],
    sagatCorrect: "Critical irrigation failure",
    trendData: trend([28, 23, 19, 16, 14], [31, 34, 36, 37, 38], [75, 72, 69, 66, 65], [58, 51, 43, 36, 32], [46, 58, 70, 82, 90]),
  },
  {
    id: "H2",
    loadLevel: "High",
    principle: "Redundancy + Expectations + Action Guidance",
    title: "High Load 2: Crisis Decision Dashboard",
    criticalSignal: "Severe crop stress is linked to critical irrigation flow instability.",
    dashboard: {
      "Soil Moisture": { value: "12%", status: "Critical", meaning: "Extremely low water availability" },
      "Crop Temperature": { value: "40°C", status: "Critical", meaning: "Severe heat stress" },
      "Battery Level": { value: "28%", status: "Warning", meaning: "Power reserve declining" },
      "Irrigation Flow": { value: "Critical", status: "Critical", meaning: "Water delivery failure likely" },
      "Solar Efficiency": { value: "62%", status: "Watch", meaning: "Reduced PV performance" },
      Humidity: { value: "75%", status: "Watch", meaning: "High moisture in air" },
      "Sensor Accuracy": { value: "Low", status: "Warning", meaning: "Confirm with field inspection" },
    },
    alerts: ["MULTI-SYSTEM FAILURE", "SEVERE CROP STRESS", "ENERGY INSTABILITY", "LOW SENSOR ACCURACY"],
    question: "The dashboard displays severe crop stress, irrigation instability, and declining battery performance simultaneously. Which response should be prioritized first?",
    options: [
      { text: "Stabilize irrigation delivery", consequence: "Correct. This directly addresses the crop survival risk." },
      { text: "Optimize photovoltaic angle", consequence: "Incorrect. PV optimization does not solve the immediate crop stress." },
      { text: "Export monitoring reports", consequence: "Incorrect. Reporting should follow emergency response." },
      { text: "Reduce environmental sampling", consequence: "Incorrect. The priority is stabilizing water delivery." },
    ],
    correct: "Stabilize irrigation delivery",
    recommendation: "Stabilize irrigation delivery first, then verify data accuracy through field inspection and review battery backup after crop risk is controlled.",
    sagatQuestion: "What should happen after irrigation is stabilized?",
    sagatOptions: ["Verify sensor data and review battery backup", "Export reports immediately", "Ignore the field", "Reduce all monitoring"],
    sagatCorrect: "Verify sensor data and review battery backup",
    trendData: trend([25, 20, 17, 14, 12], [33, 35, 37, 39, 40], [70, 68, 65, 63, 62], [50, 43, 37, 31, 28], [55, 68, 80, 88, 94]),
  },
  {
    id: "H3",
    loadLevel: "High",
    principle: "Discriminability + Redundancy + Emergency Hierarchy",
    title: "High Load 3: Multi-Alert Control Dashboard",
    criticalSignal: "Several alerts are active, but only one directly threatens crop survival within the next hour.",
    dashboard: {
      "Soil Moisture": { value: "10%", status: "Critical", meaning: "Extreme drought stress" },
      "Pump Status": { value: "Offline", status: "Critical", meaning: "No water delivery" },
      "Panel Temperature": { value: "High", status: "Warning", meaning: "PV system needs later review" },
      "Battery Backup": { value: "35%", status: "Warning", meaning: "Limited reserve" },
      "Network Signal": { value: "Weak", status: "Watch", meaning: "Dashboard may update slowly" },
      "Crop Stress": { value: "Severe", status: "Critical", meaning: "Immediate crop damage risk" },
      "Wind Alert": { value: "Moderate", status: "Watch", meaning: "Monitor structure" },
    },
    alerts: ["PUMP OFFLINE", "EXTREME SOIL WATER DEFICIT", "SEVERE CROP STRESS", "WEAK NETWORK SIGNAL"],
    question: "The pump is offline, soil moisture is extremely low, and crop stress is severe. What should be done first?",
    options: [
      { text: "Restore pump or activate backup water delivery", consequence: "Correct. Restoring water delivery addresses the immediate crop survival threat." },
      { text: "Troubleshoot network signal first", consequence: "Incorrect. Weak network is secondary when crop survival is at risk." },
      { text: "Cool the PV panels first", consequence: "Incorrect. Panel temperature should be monitored, but water delivery is more urgent." },
      { text: "Wait for the next dashboard update", consequence: "Incorrect. Waiting increases the risk of crop loss." },
    ],
    correct: "Restore pump or activate backup water delivery",
    recommendation: "Restore pump operation immediately; if not possible, activate backup water delivery and send a field worker to confirm crop condition.",
    sagatQuestion: "Which secondary issue should NOT distract from crop survival?",
    sagatOptions: ["Weak network signal", "Pump offline", "Extreme soil water deficit", "Severe crop stress"],
    sagatCorrect: "Weak network signal",
    trendData: trend([22, 18, 15, 12, 10], [34, 36, 38, 39, 40], [74, 70, 66, 63, 60], [56, 50, 44, 39, 35], [60, 72, 84, 92, 98]),
  },
];

const statusDot: Record<Status, string> = {
  Normal: "bg-emerald-500",
  Watch: "bg-amber-400",
  Warning: "bg-orange-500",
  Critical: "bg-red-600",
};

const statusPanel: Record<Status, string> = {
  Normal: "border-emerald-200 bg-emerald-50 text-emerald-950",
  Watch: "border-amber-200 bg-amber-50 text-amber-950",
  Warning: "border-orange-200 bg-orange-50 text-orange-950",
  Critical: "border-red-300 bg-red-50 text-red-950",
};

export default function AgrivoltaicHFESimulationProfessional() {
  const participantId = useMemo(() => `P-${Math.floor(Math.random() * 9000 + 1000)}`, []);
  const [started, setStarted] = useState(false);
  const [current, setCurrent] = useState(0);
  const [stage, setStage] = useState<Stage>("decision");
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());
  const [responses, setResponses] = useState<ResponseRow[]>([]);
  const [feedback, setFeedback] = useState<ResponseRow | null>(null);
  const [tlx, setTlx] = useState<TlxState>({ Mental: 5, Physical: 1, Temporal: 5, Performance: 5, Effort: 5, Frustration: 5 });
  const [sagatSelection, setSagatSelection] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [csvText, setCsvText] = useState("");

  useEffect(() => {
    if (started && stage === "decision") setQuestionStartTime(Date.now());
  }, [started, current, stage]);

  const scenario = scenarios[current];

  const getTlxScore = (v = tlx) =>
    Math.round((Number(v.Mental) + Number(v.Physical) + Number(v.Temporal) + (11 - Number(v.Performance)) + Number(v.Effort) + Number(v.Frustration)) / 6);

  const handleAnswer = (answer: string) => {
    const selected = scenario.options.find((o) => o.text === answer);
    const isCorrect = answer === scenario.correct;
    const rt = ((Date.now() - questionStartTime) / 1000).toFixed(2);

    setFeedback({
      participant: participantId,
      scenarioId: scenario.id,
      loadLevel: scenario.loadLevel,
      principle: scenario.principle,
      question: scenario.question,
      selectedAnswer: answer,
      correctAnswer: scenario.correct,
      accuracy: isCorrect ? "Correct" : "Incorrect",
      responseTimeSeconds: rt,
      consequence: selected?.consequence || "",
      recommendation: scenario.recommendation,
      timestamp: new Date().toLocaleTimeString(),
    });
    setStage("feedback");
  };

  const submitTlx = () => setStage("sagat");

  const submitSagat = () => {
    if (!feedback) return;
    const sagatCorrect = sagatSelection === scenario.sagatCorrect;
    const fullEntry: ResponseRow = {
      ...feedback,
      tlxMental: tlx.Mental,
      tlxPhysical: tlx.Physical,
      tlxTemporal: tlx.Temporal,
      tlxPerformance: tlx.Performance,
      tlxEffort: tlx.Effort,
      tlxFrustration: tlx.Frustration,
      tlxScore: getTlxScore(tlx),
      sagatQuestion: scenario.sagatQuestion,
      sagatSelected: sagatSelection,
      sagatCorrectAnswer: scenario.sagatCorrect,
      sagatAccuracy: sagatCorrect ? "Correct" : "Incorrect",
    };

    setResponses((prev) => [...prev, fullEntry]);
    setFeedback(null);
    setSagatSelection("");
    setTlx({ Mental: 5, Physical: 1, Temporal: 5, Performance: 5, Effort: 5, Frustration: 5 });

    if (current + 1 < scenarios.length) {
      setCurrent(current + 1);
      setStage("decision");
    } else {
      setShowResults(true);
    }
  };

  const summaryByLoad = (load: LoadLevel) => {
    const rows = responses.filter((r) => r.loadLevel === load);
    const correct = rows.filter((r) => r.accuracy === "Correct").length;
    const sagat = rows.filter((r) => r.sagatAccuracy === "Correct").length;
    const avgTlx = rows.length ? rows.reduce((s, r) => s + Number(r.tlxScore || 0), 0) / rows.length : 0;
    const avgRt = rows.length ? rows.reduce((s, r) => s + Number(r.responseTimeSeconds), 0) / rows.length : 0;

    return {
      load,
      trials: rows.length,
      decisionPct: rows.length ? Math.round((correct / rows.length) * 100) : 0,
      sagatPct: rows.length ? Math.round((sagat / rows.length) * 100) : 0,
      avgTlx: Number(avgTlx.toFixed(1)),
      avgRt: Number(avgRt.toFixed(2)),
    };
  };

  const summaryData = [summaryByLoad("Low"), summaryByLoad("Medium"), summaryByLoad("High")];

  const buildCSV = (rows = responses) => {
    const headers = ["Participant", "Scenario", "Load", "Principle", "Decision Accuracy", "Response Time Seconds", "Selected Answer", "Correct Answer", "NASA TLX Score", "SAGAT Accuracy", "SAGAT Selected", "SAGAT Correct", "Recommendation", "Timestamp"];
    const dataRows = rows.map((r) => [r.participant, r.scenarioId, r.loadLevel, r.principle, r.accuracy, r.responseTimeSeconds, r.selectedAnswer, r.correctAnswer, r.tlxScore, r.sagatAccuracy, r.sagatSelected, r.sagatCorrectAnswer, r.recommendation, r.timestamp]);
    return [headers, ...dataRows].map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
  };

  const exportXLSX = () => {
    const decisionRows = responses.map((r) => ({
      Participant: r.participant,
      Scenario: r.scenarioId,
      Load: r.loadLevel,
      Principle: r.principle,
      DecisionAccuracy: r.accuracy,
      ResponseTimeSeconds: r.responseTimeSeconds,
      SelectedAnswer: r.selectedAnswer,
      CorrectAnswer: r.correctAnswer,
      TLXScore: r.tlxScore,
      SAGATAccuracy: r.sagatAccuracy,
      SAGATSelected: r.sagatSelected,
      SAGATCorrect: r.sagatCorrectAnswer,
      Recommendation: r.recommendation,
      Timestamp: r.timestamp,
    }));

    const summaryRows = summaryData.map((s) => ({
      Load: s.load,
      Trials: s.trials,
      DecisionAccuracyPercent: s.decisionPct,
      SAGATAccuracyPercent: s.sagatPct,
      AverageTLX: s.avgTlx,
      AverageResponseTime: s.avgRt,
    }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(decisionRows), "Raw Data");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryRows), "Summary Stats");
    XLSX.writeFile(wb, "agrivoltaic_hfe_professional_dashboard_results.xlsx");
  };

  const showCSV = async () => {
    const csv = buildCSV();
    setCsvText(csv);
    try {
      await navigator.clipboard.writeText(csv);
      alert("CSV copied. Paste into Excel or Google Sheets.");
    } catch {
      alert("CSV displayed below. Copy it manually into Excel or Google Sheets.");
    }
  };

  const resetSimulation = () => {
    setStarted(false);
    setCurrent(0);
    setStage("decision");
    setResponses([]);
    setFeedback(null);
    setSagatSelection("");
    setCsvText("");
    setShowResults(false);
  };

  const KpiCard = ({ label, value, detail, accent }: { label: string; value: string; detail: string; accent: string }) => (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-500">{label}</p>
        <span className="h-3 w-3 rounded-full" style={{ background: accent }} />
      </div>
      <p className="mt-2 text-3xl font-black text-slate-950">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{detail}</p>
    </div>
  );

  const Slider = ({ label, value, onChange, low = "Low", high = "High" }: { label: string; value: number; onChange: (v: number) => void; low?: string; high?: string }) => (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-2 flex justify-between font-bold text-slate-800"><span>{label}</span><span>{value}</span></div>
      <input className="w-full accent-green-700" type="range" min="1" max="10" value={value} onChange={(e) => onChange(Number(e.target.value))} />
      <div className="mt-1 flex justify-between text-xs text-slate-500"><span>{low}</span><span>{high}</span></div>
    </div>
  );

  const TrendChart = ({ data }: { data: Scenario["trendData"] }) => (
    <div className="h-72 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="font-black text-slate-900">Live System Trends</h3>
          <p className="text-xs text-slate-500">Moisture, crop heat, solar energy, and stress over time</p>
        </div>
        <div className="hidden gap-3 text-xs font-semibold text-slate-600 md:flex">
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-green-700" />Moisture</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-700" />Temp</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-700" />Solar</span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height="82%">
        <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
          <XAxis dataKey="time" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip />
          <Line type="monotone" dataKey="moisture" name="Soil moisture" stroke={COLORS.green2} strokeWidth={3} dot={false} />
          <Line type="monotone" dataKey="temp" name="Crop temperature" stroke={COLORS.red} strokeWidth={3} dot={false} />
          <Line type="monotone" dataKey="solar" name="Solar output" stroke={COLORS.blue} strokeWidth={3} dot={false} />
          <Line type="monotone" dataKey="stress" name="Crop stress" stroke={COLORS.purple} strokeWidth={3} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );

  const MiniGauge = ({ label, value, color }: { label: string; value: number; color: string }) => (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between"><span className="text-sm font-bold text-slate-700">{label}</span><span className="text-sm font-black">{value}%</span></div>
      <div className="h-3 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full" style={{ width: `${value}%`, background: color }} /></div>
    </div>
  );

  if (!started) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#E8F5E9,white_35%,#F8FAFC)] p-6">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 rounded-[2rem] bg-slate-950 p-8 text-white shadow-2xl">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="mb-3 text-sm font-bold uppercase tracking-[0.3em] text-green-300">Agrivoltaic HFE Lab</p>
                <h1 className="max-w-4xl text-4xl font-black leading-tight md:text-6xl">Professional Dashboard Simulation for Smart Agrivoltaic Decision Support</h1>
                <p className="mt-5 max-w-3xl text-lg text-slate-300">A research-grade interface prototype that measures decision accuracy, NASA-TLX workload, SAGAT situational awareness, and response time under low, medium, and high dashboard complexity.</p>
              </div>
              <div className="rounded-3xl border border-green-400/30 bg-green-400/10 p-6 text-center">
                <p className="text-sm text-green-200">Participant</p>
                <p className="text-3xl font-black">{participantId}</p>
              </div>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            <KpiCard label="Experimental Variable" value="3 Loads" detail="Low, Medium, High dashboard complexity" accent={COLORS.green} />
            <KpiCard label="Human Factors Measures" value="4 Metrics" detail="Accuracy, TLX, SAGAT, response time" accent={COLORS.blue} />
            <KpiCard label="Export Format" value="XLSX" detail="Raw data and summary statistics" accent={COLORS.purple} />
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-3">
            <div className="rounded-3xl border border-green-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-black text-green-900">Low Load</h2>
              <p className="mt-2 text-slate-600">Simple dashboards with limited variables and clear signal placement.</p>
            </div>
            <div className="rounded-3xl border border-amber-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-black text-amber-900">Medium Load</h2>
              <p className="mt-2 text-slate-600">Multiple interacting variables with crop-water-energy tradeoffs.</p>
            </div>
            <div className="rounded-3xl border border-red-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-black text-red-900">High Load</h2>
              <p className="mt-2 text-slate-600">Emergency-level alerts and competing signals requiring prioritization.</p>
            </div>
          </div>

          <button onClick={() => setStarted(true)} className="mt-8 rounded-2xl bg-green-800 px-8 py-4 text-xl font-black text-white shadow-xl transition hover:bg-green-900">Start Simulation</button>
        </div>
      </div>
    );
  }

  if (showResults) {
    const totalCorrect = responses.filter((r) => r.accuracy === "Correct").length;
    const totalSagat = responses.filter((r) => r.sagatAccuracy === "Correct").length;
    const avgTlx = Math.round(responses.reduce((s, r) => s + Number(r.tlxScore || 0), 0) / responses.length);
    const avgRt = Number((responses.reduce((s, r) => s + Number(r.responseTimeSeconds), 0) / responses.length).toFixed(2));
    const weakest = summaryData.reduce((a, b) => (a.decisionPct <= b.decisionPct ? a : b));
    const pieData = [
      { name: "Correct", value: totalCorrect, color: COLORS.green2 },
      { name: "Incorrect", value: responses.length - totalCorrect, color: COLORS.red },
    ];

    return (
      <div className="min-h-screen bg-slate-100 p-6">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6 rounded-[2rem] bg-slate-950 p-8 text-white shadow-2xl">
            <p className="text-sm font-bold uppercase tracking-[0.3em] text-green-300">Final Research Output</p>
            <h1 className="mt-2 text-4xl font-black">Statistical Summary Dashboard</h1>
            <p className="mt-3 text-slate-300">Participant {participantId} · {responses.length} completed trials · XLSX-ready dataset</p>
          </div>

          <div className="grid gap-5 md:grid-cols-4">
            <KpiCard label="Decision Accuracy" value={`${Math.round((totalCorrect / responses.length) * 100)}%`} detail={`${totalCorrect}/${responses.length} correct`} accent={COLORS.green2} />
            <KpiCard label="SAGAT Accuracy" value={`${Math.round((totalSagat / responses.length) * 100)}%`} detail="Situational awareness score" accent={COLORS.blue} />
            <KpiCard label="Average TLX" value={`${avgTlx}/10`} detail="Perceived workload" accent={COLORS.orange} />
            <KpiCard label="Avg Response Time" value={`${avgRt}s`} detail="Decision speed" accent={COLORS.purple} />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
              <h2 className="mb-4 text-2xl font-black text-slate-950">Decision Accuracy and SAGAT by Load</h2>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={summaryData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="load" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Bar dataKey="decisionPct" name="Decision accuracy %" fill={COLORS.green2} radius={[8, 8, 0, 0]} />
                    <Bar dataKey="sagatPct" name="SAGAT accuracy %" fill={COLORS.blue} radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-2xl font-black text-slate-950">Overall Decisions</h2>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={70} outerRadius={105} paddingAngle={4}>
                      {pieData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-2xl font-black text-slate-950">Workload and Response Time</h2>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={summaryData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="load" />
                  <YAxis />
                  <Tooltip />
                  <Area type="monotone" dataKey="avgTlx" name="Average TLX" stroke={COLORS.orange} fill="#FFE0B2" strokeWidth={3} />
                  <Area type="monotone" dataKey="avgRt" name="Average response time" stroke={COLORS.purple} fill="#E1BEE7" strokeWidth={3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="bg-slate-950 px-6 py-4 text-white"><h2 className="text-xl font-black">Raw Participant Results</h2></div>
            <div className="overflow-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-100 text-slate-700"><tr><th className="p-3 text-left">Scenario</th><th className="p-3 text-left">Load</th><th className="p-3 text-left">Decision</th><th className="p-3 text-left">RT</th><th className="p-3 text-left">TLX</th><th className="p-3 text-left">SAGAT</th><th className="p-3 text-left">Recommendation</th></tr></thead>
                <tbody>{responses.map((r, i) => <tr key={i} className="border-t align-top"><td className="p-3 font-bold">{r.scenarioId}</td><td className="p-3">{r.loadLevel}</td><td className={`p-3 font-black ${r.accuracy === "Correct" ? "text-green-700" : "text-red-700"}`}>{r.accuracy}</td><td className="p-3">{r.responseTimeSeconds}s</td><td className="p-3">{r.tlxScore}/10</td><td className={`p-3 font-black ${r.sagatAccuracy === "Correct" ? "text-green-700" : "text-red-700"}`}>{r.sagatAccuracy}</td><td className="p-3 text-slate-600">{r.recommendation}</td></tr>)}</tbody>
              </table>
            </div>
          </div>

          <div className="mt-6 rounded-3xl border border-green-200 bg-green-50 p-6 shadow-sm">
            <h2 className="text-2xl font-black text-green-950">Automatic Workload Analysis and Next Steps</h2>
            <ol className="mt-4 list-decimal space-y-2 pl-6 text-lg text-green-950">
              <li>The weakest decision-load condition is <strong>{weakest.load}</strong>. Provide extra training for this dashboard level.</li>
              <li>If TLX is high, reduce dashboard density by grouping water, crop, and energy variables separately.</li>
              <li>If SAGAT accuracy is low, improve situation-awareness cues by making the critical subsystem more salient.</li>
              <li>If response time is slow, simplify labels and place alerts close to the recommended action.</li>
              <li>For field use, prioritize irrigation failure and crop stress before solar optimization, report export, or network troubleshooting.</li>
            </ol>
          </div>

          <div className="mt-6 flex flex-wrap gap-4">
            <button onClick={exportXLSX} className="rounded-2xl bg-green-800 px-6 py-3 font-black text-white shadow-lg hover:bg-green-900">Export XLSX Results</button>
            <button onClick={showCSV} className="rounded-2xl bg-blue-700 px-6 py-3 font-black text-white shadow-lg hover:bg-blue-800">Copy / Show CSV</button>
            <button onClick={resetSimulation} className="rounded-2xl bg-slate-900 px-6 py-3 font-black text-white shadow-lg hover:bg-slate-950">Restart Simulation</button>
          </div>
          {csvText && <textarea className="mt-6 h-56 w-full rounded-2xl border border-slate-300 p-4 font-mono text-xs" value={csvText} readOnly onFocus={(e) => e.target.select()} />}
        </div>
      </div>
    );
  }

  const lastTrend = scenario.trendData[scenario.trendData.length - 1];

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 grid gap-5 lg:grid-cols-[1.4fr_0.6fr]">
          <div className="rounded-[2rem] bg-slate-950 p-7 text-white shadow-2xl">
            <p className="text-sm font-bold uppercase tracking-[0.25em] text-green-300">{scenario.loadLevel} Complexity</p>
            <h1 className="mt-2 text-4xl font-black leading-tight">{scenario.title}</h1>
            <p className="mt-3 text-slate-300">Interface principle: {scenario.principle}</p>
          </div>
          <div className="rounded-[2rem] border border-green-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-bold text-slate-500">Trial Progress</p>
            <p className="mt-2 text-5xl font-black text-green-800">{current + 1}<span className="text-2xl text-slate-400">/{scenarios.length}</span></p>
            <p className="mt-2 text-sm text-slate-500">Participant {participantId}</p>
          </div>
        </div>

        {stage === "decision" && (
          <>
            <div className="mb-6 rounded-3xl border border-red-200 bg-red-50 p-5 shadow-sm">
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-red-700">Most Salient Interface Signal</p>
              <p className="mt-2 text-2xl font-black text-red-950">{scenario.criticalSignal}</p>
            </div>

            <div className="grid gap-6 xl:grid-cols-[0.9fr_1.4fr_0.9fr]">
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="mb-4 text-xl font-black text-slate-950">System Variables</h2>
                <div className="space-y-3">
                  {Object.entries(scenario.dashboard).map(([key, item]) => (
                    <div key={key} className={`rounded-2xl border p-4 ${statusPanel[item.status]}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-black">{key}</p>
                          <p className="mt-1 text-sm opacity-80">{item.meaning}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-xl font-black">{item.value}</span>
                          <div className="mt-1 flex items-center justify-end gap-1 text-xs font-bold"><span className={`h-2 w-2 rounded-full ${statusDot[item.status]}`} />{item.status}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-5">
                <TrendChart data={scenario.trendData} />
                <div className="grid gap-4 md:grid-cols-3">
                  <MiniGauge label="Moisture" value={lastTrend.moisture} color={COLORS.green2} />
                  <MiniGauge label="Solar Output" value={lastTrend.solar} color={COLORS.blue} />
                  <MiniGauge label="Crop Stress" value={lastTrend.stress} color={COLORS.red} />
                </div>
              </div>

              <div className="rounded-3xl border border-red-200 bg-white p-5 shadow-sm">
                <h2 className="mb-4 text-xl font-black text-red-900">Priority Alerts</h2>
                <div className="space-y-3">
                  {scenario.alerts.map((a, idx) => <div key={idx} className="rounded-2xl border border-red-200 bg-red-50 p-4 font-black text-red-950">⚠ {a}</div>)}
                </div>
                <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">Decision Rule</p>
                  <p className="mt-2 font-bold text-slate-900">Crop survival risks come before energy optimization, reporting, and network troubleshooting.</p>
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-black text-slate-950">Decision Task</h2>
              <p className="mt-2 text-lg text-slate-700">{scenario.question}</p>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {scenario.options.map((option) => <button key={option.text} onClick={() => handleAnswer(option.text)} className="rounded-2xl bg-blue-700 p-5 text-left text-lg font-black text-white shadow-lg transition hover:bg-blue-800">{option.text}</button>)}
              </div>
            </div>
          </>
        )}

        {stage === "feedback" && feedback && (
          <div className={`rounded-3xl border p-8 shadow-sm ${feedback.accuracy === "Correct" ? "border-green-300 bg-green-50" : "border-red-300 bg-red-50"}`}>
            <p className={`text-sm font-bold uppercase tracking-[0.25em] ${feedback.accuracy === "Correct" ? "text-green-700" : "text-red-700"}`}>Decision Feedback</p>
            <h2 className={`mt-2 text-4xl font-black ${feedback.accuracy === "Correct" ? "text-green-950" : "text-red-950"}`}>{feedback.accuracy === "Correct" ? "Good Decision" : "Decision Correction Needed"}</h2>
            <p className="mt-4 text-lg text-slate-800">{feedback.consequence}</p>
            <p className="mt-3 font-black text-slate-950">Response Time: {feedback.responseTimeSeconds}s</p>
            <div className="mt-5 rounded-2xl bg-white p-5 shadow-sm"><h3 className="font-black text-slate-950">Recommended Farmer Action</h3><p className="mt-2 text-slate-700">{feedback.recommendation}</p></div>
            <button onClick={() => setStage("tlx")} className="mt-6 rounded-2xl bg-green-800 px-6 py-3 font-black text-white shadow-lg hover:bg-green-900">Continue to NASA-TLX</button>
          </div>
        )}

        {stage === "tlx" && (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <h2 className="text-3xl font-black text-slate-950">NASA-TLX Workload Rating</h2>
            <p className="mt-2 text-slate-600">Rate the workload you experienced on this dashboard task.</p>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <Slider label="Mental Demand" value={tlx.Mental} onChange={(v) => setTlx({ ...tlx, Mental: v })} />
              <Slider label="Physical Demand" value={tlx.Physical} onChange={(v) => setTlx({ ...tlx, Physical: v })} />
              <Slider label="Temporal Demand" value={tlx.Temporal} onChange={(v) => setTlx({ ...tlx, Temporal: v })} />
              <Slider label="Performance" value={tlx.Performance} onChange={(v) => setTlx({ ...tlx, Performance: v })} low="Poor" high="Good" />
              <Slider label="Effort" value={tlx.Effort} onChange={(v) => setTlx({ ...tlx, Effort: v })} />
              <Slider label="Frustration" value={tlx.Frustration} onChange={(v) => setTlx({ ...tlx, Frustration: v })} />
            </div>
            <div className="mt-6 rounded-2xl bg-green-50 p-5 text-xl font-black text-green-950">Computed TLX Score: {getTlxScore(tlx)} / 10</div>
            <button onClick={submitTlx} className="mt-6 rounded-2xl bg-green-800 px-6 py-3 font-black text-white shadow-lg hover:bg-green-900">Continue to SAGAT Probe</button>
          </div>
        )}

        {stage === "sagat" && (
          <div className="rounded-3xl border border-blue-200 bg-white p-8 shadow-sm">
            <p className="text-sm font-bold uppercase tracking-[0.25em] text-blue-700">Situation Awareness Probe</p>
            <h2 className="mt-2 text-3xl font-black text-slate-950">SAGAT Question</h2>
            <p className="mt-3 text-xl text-slate-700">{scenario.sagatQuestion}</p>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {scenario.sagatOptions.map((opt) => <button key={opt} onClick={() => setSagatSelection(opt)} className={`rounded-2xl border-2 p-5 text-left font-black transition ${sagatSelection === opt ? "border-blue-900 bg-blue-700 text-white" : "border-blue-100 bg-blue-50 text-blue-950 hover:border-blue-400"}`}>{opt}</button>)}
            </div>
            <button disabled={!sagatSelection} onClick={submitSagat} className="mt-6 rounded-2xl bg-green-800 px-6 py-3 font-black text-white shadow-lg hover:bg-green-900 disabled:bg-slate-400">Submit SAGAT and Continue</button>
          </div>
        )}
      </div>
    </div>
  );
}
