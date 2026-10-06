
import { useEffect, useMemo, useState } from "react";
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

import type { LoadLevel, ResponseRow, Stage, Status, TlxState } from "./research/types";
import { scenarios } from "./data/scenarios";
import { computeWorkloadComposite, summarizeByLoad } from "./research/measures";

const COLORS = {
  green: "#1B5E20",
  green2: "#2E7D32",
  red: "#C62828",
  orange: "#EF6C00",
  blue: "#1565C0",
  purple: "#6A1B9A",
  slate: "#0F172A",
};

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

  const getTlxScore = (v = tlx) => computeWorkloadComposite(v);

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

  const summaryByLoad = (load: LoadLevel) => summarizeByLoad(responses, load);

  const summaryData = [summaryByLoad("Low"), summaryByLoad("Medium"), summaryByLoad("High")];

  const buildCSV = (rows = responses) => {
    const headers = ["Participant", "Scenario", "Load", "Principle", "Decision Accuracy", "Response Time Seconds", "Selected Answer", "Correct Answer", "Prototype Workload Score", "SA Probe Accuracy", "SA Probe Selected", "SA Probe Correct", "Recommendation", "Timestamp"];
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
            <KpiCard label="SA Probe Accuracy" value={`${Math.round((totalSagat / responses.length) * 100)}%`} detail="Situational awareness score" accent={COLORS.blue} />
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
