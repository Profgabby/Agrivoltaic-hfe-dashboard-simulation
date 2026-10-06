export type Status = "Normal" | "Watch" | "Warning" | "Critical";
export type LoadLevel = "Low" | "Medium" | "High";
export type Stage = "decision" | "feedback" | "tlx" | "sagat";
export type EvidenceClass = "DESIGNED_EXPERIMENTAL_STIMULUS";

export type StimulusProvenance = {
  evidenceClass: EvidenceClass;
  source: "AUTHORED_SCENARIO";
  measuredFieldData: false;
  validatedPhysicalModel: false;
};

export type Metric = { value: string; status: Status; meaning: string; };
export type Scenario = {
  id: string; loadLevel: LoadLevel; principle: string; title: string;
  criticalSignal: string; dashboard: Record<string, Metric>; alerts: string[];
  question: string; options: { text: string; consequence: string }[];
  correct: string; recommendation: string; sagatQuestion: string;
  sagatOptions: string[]; sagatCorrect: string;
  trendData: Array<{time:string;moisture:number;temp:number;solar:number;battery:number;stress:number;}>;
};
export type ResponseRow = {
  participant:string;scenarioId:string;loadLevel:LoadLevel;principle:string;question:string;
  selectedAnswer:string;correctAnswer:string;accuracy:"Correct"|"Incorrect";responseTimeSeconds:string;
  consequence:string;recommendation:string;timestamp:string;tlxMental?:number;tlxPhysical?:number;
  tlxTemporal?:number;tlxPerformance?:number;tlxEffort?:number;tlxFrustration?:number;tlxScore?:number;
  sagatQuestion?:string;sagatSelected?:string;sagatCorrectAnswer?:string;sagatAccuracy?:"Correct"|"Incorrect";
};
export type TlxState={Mental:number;Physical:number;Temporal:number;Performance:number;Effort:number;Frustration:number;};
