import type { LoadLevel, ResponseRow, TlxState } from "./types";

export const computeWorkloadComposite=(v:TlxState)=>
Math.round((Number(v.Mental)+Number(v.Physical)+Number(v.Temporal)+(11-Number(v.Performance))+Number(v.Effort)+Number(v.Frustration))/6);

export const summarizeByLoad=(responses:ResponseRow[],load:LoadLevel)=>{
 const rows=responses.filter(r=>r.loadLevel===load);
 const correct=rows.filter(r=>r.accuracy==="Correct").length;
 const situational=rows.filter(r=>r.sagatAccuracy==="Correct").length;
 const avgWorkload=rows.length?rows.reduce((s,r)=>s+Number(r.tlxScore||0),0)/rows.length:0;
 const avgRt=rows.length?rows.reduce((s,r)=>s+Number(r.responseTimeSeconds),0)/rows.length:0;
 return {load,trials:rows.length,decisionPct:rows.length?Math.round(correct/rows.length*100):0,
 sagatPct:rows.length?Math.round(situational/rows.length*100):0,avgTlx:Number(avgWorkload.toFixed(1)),avgRt:Number(avgRt.toFixed(2))};
};
