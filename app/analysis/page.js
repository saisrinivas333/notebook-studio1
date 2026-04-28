"use client";
import { useRef, useState } from "react";
import Papa from "papaparse";
import Link from "next/link";
import Nav from "../components/Nav";
import styles from "./analysis.module.css";

function detectHeartCols(headers) {
  const low = headers.map(h=>h.toLowerCase().trim());
  const find = (candidates) => low.findIndex(h=>candidates.some(k=>h===k||h.includes(k)));
  return {
    hrIdx:      find(["thalachh","thalach","max_hr","hr","bpm","heartrate","pulse"]),
    spo2Idx:    find(["spo2","o2","oxygen","saturation"]),
    ageIdx:     find(["age"]),
    sexIdx:     find(["sex","gender"]),
    cpIdx:      find(["cp","chest_pain"]),
    bpIdx:      find(["trtbps","trestbps","bp","blood_pressure"]),
    cholIdx:    find(["chol","cholesterol"]),
    fbsIdx:     find(["fbs","fasting_blood_sugar"]),
    restecgIdx: find(["restecg"]),
    hrMaxIdx:   find(["thalachh","thalach","max_hr"]),
    exngIdx:    find(["exng","exang"]),
    oldpeakIdx: find(["oldpeak","st_depression"]),
    slpIdx:     find(["slp","slope"]),
    caaIdx:     find(["caa","ca","num_vessels"]),
    thallIdx:   find(["thall","thal"]),
    outputIdx:  find(["output","target","disease","result","diagnosis"]),
    timeIdx:    find(["time","timestamp","date","datetime"]),
  };
}

function isUCI(c) { return c.ageIdx!==-1 && c.bpIdx!==-1 && c.cholIdx!==-1; }

function calcStats(arr) {
  const v=arr.filter(x=>!isNaN(x)&&x!==null&&x!==undefined);
  if(!v.length)return{};
  const s=[...v].sort((a,b)=>a-b);const n=s.length;
  const mean=v.reduce((a,b)=>a+b,0)/n;
  const std=Math.sqrt(v.reduce((a,b)=>a+(b-mean)**2,0)/n);
  const median=n%2===0?(s[n/2-1]+s[n/2])/2:s[Math.floor(n/2)];
  return{count:n,min:s[0],max:s[n-1],mean:+mean.toFixed(2),std:+std.toFixed(2),median:+median.toFixed(2),
    q1:+s[Math.floor(n*0.25)].toFixed(2),q3:+s[Math.floor(n*0.75)].toFixed(2),
    iqr:+(s[Math.floor(n*0.75)]-s[Math.floor(n*0.25)]).toFixed(2),
    range:+(s[n-1]-s[0]).toFixed(2),cv:+(std/mean*100).toFixed(2)};
}

function corr(x,y){
  const n=Math.min(x.length,y.length);if(n<2)return 0;
  const vx=x.slice(0,n),vy=y.slice(0,n);
  const mx=vx.reduce((a,b)=>a+b,0)/n,my=vy.reduce((a,b)=>a+b,0)/n;
  const num=vx.reduce((s,v,i)=>s+(v-mx)*(vy[i]-my),0);
  const den=Math.sqrt(vx.reduce((s,v)=>s+(v-mx)**2,0)*vy.reduce((s,v)=>s+(v-my)**2,0));
  return den===0?0:+(num/den).toFixed(4);
}

const CP_LABEL={0:"Typical Angina",1:"Atypical Angina",2:"Non-Anginal Pain",3:"Asymptomatic"};
const SEX_LABEL={0:"Female",1:"Male"};
const FBS_LABEL={0:"≤120 mg/dl",1:">120 mg/dl"};
const EXNG_LABEL={0:"No",1:"Yes"};
const OUT_LABEL={0:"No Disease",1:"Disease"};
const SLP_LABEL={0:"Up-sloping",1:"Flat",2:"Down-sloping"};
const RESTECG_LABEL={0:"Normal",1:"ST Abnormality",2:"LV Hypertrophy"};
const THALL_LABEL={0:"Null",1:"Fixed Defect",2:"Normal",3:"Reversable Defect"};

export default function AnalysisPage() {
  const fileRef=useRef(null);
  const [rows,setRows]=useState([]);
  const [cols,setCols]=useState({});
  const [hdrs,setHdrs]=useState([]);
  const [loaded,setLoaded]=useState(false);
  const [error,setError]=useState("");
  const [fname,setFname]=useState("");
  const [uci,setUci]=useState(false);

  const parse=(text,name="")=>{
    setError("");
    Papa.parse(text,{header:true,skipEmptyLines:true,complete:res=>{
      if(!res.data.length){setError("No data found.");return;}
      const headers=res.meta.fields||[];
      const detected=detectHeartCols(headers);
      const isUCIData=isUCI(detected);
      if(!isUCIData&&detected.hrIdx===-1&&detected.spo2Idx===-1){
        setError(`Could not detect columns. Found: ${headers.join(", ")}. Supports UCI heart columns (age, trtbps, chol, thalachh…) or standard HR/SpO₂ columns.`);return;
      }
      setCols(detected);setHdrs(headers);setRows(res.data);setFname(name);setLoaded(true);setUci(isUCIData);
    },error:e=>setError("Parse error: "+e.message)});
  };

  const onFile=f=>{if(!f)return;const r=new FileReader();r.onload=e=>parse(e.target.result,f.name);r.readAsText(f);};
  const loadSample=async()=>{const r=await fetch("/data/heart.csv");const t=await r.text();parse(t,"heart.csv");};

  // Build arrays using detected column indices
  const col=(idx)=>rows.map(r=>parseFloat(r[hdrs[idx]]));
  const colRaw=(idx)=>rows.map(r=>r[hdrs[idx]]);

  const ageArr    = loaded&&cols.ageIdx!==-1    ? col(cols.ageIdx)    : [];
  const hrArr     = loaded&&cols.hrMaxIdx!==-1  ? col(cols.hrMaxIdx)  : col(cols.hrIdx);
  const bpArr     = loaded&&cols.bpIdx!==-1     ? col(cols.bpIdx)     : [];
  const cholArr   = loaded&&cols.cholIdx!==-1   ? col(cols.cholIdx)   : [];
  const opArr     = loaded&&cols.oldpeakIdx!==-1? col(cols.oldpeakIdx): [];
  const outputArr = loaded&&cols.outputIdx!==-1 ? col(cols.outputIdx) : [];

  const ageSt=calcStats(ageArr.filter(x=>!isNaN(x)));
  const hrSt=calcStats(hrArr.filter(x=>!isNaN(x)));
  const bpSt=calcStats(bpArr.filter(x=>!isNaN(x)));
  const cholSt=calcStats(cholArr.filter(x=>!isNaN(x)));
  const opSt=calcStats(opArr.filter(x=>!isNaN(x)));

  const diseaseRows=rows.filter(r=>String(r[hdrs[cols.outputIdx]])==="1");
  const noDiseaseRows=rows.filter(r=>String(r[hdrs[cols.outputIdx]])==="0");
  const maleRows=cols.sexIdx!==-1?rows.filter(r=>String(r[hdrs[cols.sexIdx]])==="1"):[];
  const femaleRows=cols.sexIdx!==-1?rows.filter(r=>String(r[hdrs[cols.sexIdx]])==="0"):[];

  const corrHrChol=loaded&&hrArr.length&&cholArr.length?corr(hrArr.filter((_,i)=>!isNaN(hrArr[i])&&!isNaN(cholArr[i])),cholArr.filter((_,i)=>!isNaN(hrArr[i])&&!isNaN(cholArr[i]))):null;
  const corrAgeHr=loaded&&ageArr.length&&hrArr.length?corr(ageArr.filter((_,i)=>!isNaN(ageArr[i])&&!isNaN(hrArr[i])),hrArr.filter((_,i)=>!isNaN(ageArr[i])&&!isNaN(hrArr[i]))):null;
  const corrBpChol=loaded&&bpArr.length&&cholArr.length?corr(bpArr.filter((_,i)=>!isNaN(bpArr[i])&&!isNaN(cholArr[i])),cholArr.filter((_,i)=>!isNaN(bpArr[i])&&!isNaN(cholArr[i]))):null;

  const pct=n=>rows.length?((n/rows.length)*100).toFixed(1)+"%":"—";

  // Categorical breakdowns
  const cpBreakdown=loaded&&cols.cpIdx!==-1?[0,1,2,3].map(v=>({label:CP_LABEL[v]||`Type ${v}`,count:rows.filter(r=>String(r[hdrs[cols.cpIdx]])===String(v)).length})):[];
  const fbsBreakdown=loaded&&cols.fbsIdx!==-1?[0,1].map(v=>({label:FBS_LABEL[v],count:rows.filter(r=>String(r[hdrs[cols.fbsIdx]])===String(v)).length})):[];
  const exngBreakdown=loaded&&cols.exngIdx!==-1?[0,1].map(v=>({label:`Exercise angina: ${EXNG_LABEL[v]}`,count:rows.filter(r=>String(r[hdrs[cols.exngIdx]])===String(v)).length})):[];
  const thallBreakdown=loaded&&cols.thallIdx!==-1?[0,1,2,3].map(v=>({label:THALL_LABEL[v]||`Thal ${v}`,count:rows.filter(r=>String(r[hdrs[cols.thallIdx]])===String(v)).length})).filter(d=>d.count>0):[];

  // anomalies: high BP + high chol
  const anomalies=loaded?rows.filter(r=>{
    const bp=parseFloat(r[hdrs[cols.bpIdx]]);
    const ch=parseFloat(r[hdrs[cols.cholIdx]]);
    const out=r[hdrs[cols.outputIdx]];
    return bp>140&&ch>240&&String(out)==="1";
  }):[];

  const dlReport=()=>{
    if(!loaded)return;
    const lines=[
      ["UCI Heart Disease Analysis Report"],[""],
      ["=== Patient Overview ==="],
      ["Total patients",rows.length],["Heart disease positive",diseaseRows.length,pct(diseaseRows.length)],
      ["Heart disease negative",noDiseaseRows.length,pct(noDiseaseRows.length)],
      ["Male",maleRows.length,pct(maleRows.length)],["Female",femaleRows.length,pct(femaleRows.length)],[""],
      ["=== Age Statistics ==="],
      ["Count",ageSt.count],["Min",ageSt.min],["Max",ageSt.max],["Mean",ageSt.mean],["Median",ageSt.median],["Std Dev",ageSt.std],[""],
      ["=== Max Heart Rate (thalachh) ==="],
      ["Mean",hrSt.mean],["Min",hrSt.min],["Max",hrSt.max],["Std Dev",hrSt.std],[""],
      ["=== Resting BP (trtbps) ==="],
      ["Mean",bpSt.mean],["Min",bpSt.min],["Max",bpSt.max],["Std Dev",bpSt.std],[""],
      ["=== Cholesterol (chol) ==="],
      ["Mean",cholSt.mean],["Min",cholSt.min],["Max",cholSt.max],["Std Dev",cholSt.std],[""],
      ["=== ST Depression (oldpeak) ==="],
      ["Mean",opSt.mean],["Min",opSt.min],["Max",opSt.max],[""],
      ["=== Correlations ==="],
      ["HR vs Cholesterol",corrHrChol],["Age vs Max HR",corrAgeHr],["BP vs Cholesterol",corrBpChol],[""],
      ["=== Chest Pain Types ==="],
      ...cpBreakdown.map(d=>[d.label,d.count,pct(d.count)]),[""],
      ["=== Thalassemia Types ==="],
      ...thallBreakdown.map(d=>[d.label,d.count,pct(d.count)]),[""],
      ["=== Risk Anomalies (BP>140 AND Chol>240 AND Disease=1) ==="],
      ["Count",anomalies.length],
    ];
    const blob=new Blob([lines.map(r=>r.join(",")).join("\n")],{type:"text/csv"});
    const url=URL.createObjectURL(blob);const a=document.createElement("a");
    a.href=url;a.download="heart_analysis_report.csv";a.click();URL.revokeObjectURL(url);
  };

  const corrColor=(v)=>v===null?"#888":Math.abs(v)>0.5?"#e05252":Math.abs(v)>0.3?"#f59e0b":"#22c55e";

  return (
    <div className={styles.page}>
      <Nav/>
      <header className={styles.hero}>
        <div className={styles.inner}>
          <span className={styles.badge}>Clinical Analysis</span>
          <h1 className={styles.title}>Heart Disease — Statistical Analysis</h1>
          <p className={styles.sub}>Full breakdown of all 14 UCI columns — stats, correlations, categorical analysis, risk flags, and downloadable report.</p>
        </div>
      </header>
      <main className={styles.main}>

        <div className={styles.upRow}>
          <div className={styles.drop} onClick={()=>fileRef.current?.click()}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            <span>Upload <strong>.csv</strong></span>
            <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={e=>onFile(e.target.files?.[0])} style={{display:"none"}}/>
          </div>
          <button className={styles.sampBtn} onClick={loadSample}>Load heart.csv</button>
          {loaded&&<button className={styles.dlBtn} onClick={dlReport}>⬇ Download report</button>}
        </div>

        {error&&<div className={styles.err}>{error}</div>}

        {loaded&&(
          <>
            <div className={styles.modeBanner}>
              {uci?"✓ UCI Heart Disease dataset — 14 clinical columns detected":"✓ Heart vitals dataset detected"}
              <span> · <strong>{fname}</strong> · {rows.length} patients</span>
            </div>

            {/* Overview */}
            <div className={styles.overviewGrid}>
              {[
                {l:"Total patients",v:rows.length,c:"#6366f1"},
                {l:"Disease positive",v:`${diseaseRows.length} (${pct(diseaseRows.length)})`,c:"#e05252"},
                {l:"Disease negative",v:`${noDiseaseRows.length} (${pct(noDiseaseRows.length)})`,c:"#22c55e"},
                {l:"Male / Female",v:`${maleRows.length} / ${femaleRows.length}`,c:"#3b82f6"},
              ].map((s,i)=>(
                <div key={i} className={styles.ov}>
                  <p className={styles.ovl}>{s.l}</p>
                  <p className={styles.ovv} style={{color:s.c}}>{s.v}</p>
                </div>
              ))}
            </div>

            {/* Stats tables */}
            <div className={styles.tgrid}>
              {[
                {title:"Age",st:ageSt,unit:"yrs",color:"#6366f1"},
                {title:"Max HR (thalachh)",st:hrSt,unit:"bpm",color:"#e05252"},
                {title:"Resting BP (trtbps)",st:bpSt,unit:"mmHg",color:"#3b82f6"},
                {title:"Cholesterol (chol)",st:cholSt,unit:"mg/dl",color:"#a855f7"},
                {title:"ST Depression (oldpeak)",st:opSt,unit:"",color:"#f97316"},
              ].map(({title,st,unit,color})=>(
                <div key={title} className={styles.tc}>
                  <h2 className={styles.th} style={{color}}>{title}</h2>
                  <table className={styles.tbl}><tbody>
                    {[["Count",st.count],["Min",`${st.min} ${unit}`],["Max",`${st.max} ${unit}`],
                      ["Mean",`${st.mean} ${unit}`],["Median",`${st.median} ${unit}`],["Std Dev",`±${st.std}`],
                      ["Q1 / Q3",`${st.q1} / ${st.q3}`],["IQR",st.iqr],["Range",st.range],["CV",`${st.cv}%`]]
                    .map(([k,v])=><tr key={k}><td className={styles.tk}>{k}</td><td className={styles.tv}>{v}</td></tr>)}
                  </tbody></table>
                </div>
              ))}
            </div>

            {/* Correlations */}
            <div className={styles.corrCard}>
              <h2 className={styles.ch}>Correlation analysis</h2>
              <div className={styles.corrRow}>
                {[
                  {label:"Max HR ↔ Cholesterol",val:corrHrChol},
                  {label:"Age ↔ Max HR",val:corrAgeHr},
                  {label:"Resting BP ↔ Cholesterol",val:corrBpChol},
                ].map(({label,val})=>(
                  <div key={label} className={styles.corrItem}>
                    <p className={styles.corrLabel}>{label}</p>
                    <p className={styles.corrVal} style={{color:corrColor(val)}}>{val??"-"}</p>
                    <p className={styles.corrDesc}>{val===null?"—":Math.abs(val)>0.5?"Strong":Math.abs(val)>0.3?"Moderate":"Weak"}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Categorical breakdowns */}
            <div className={styles.catGrid}>
              <div className={styles.zc}>
                <h2 className={styles.zh}>Chest pain type (cp)</h2>
                {cpBreakdown.filter(d=>d.count>0).map(d=>(
                  <div key={d.label} className={styles.zrow}>
                    <span className={styles.zl}>{d.label}</span>
                    <div className={styles.zbw}><div className={styles.zb} style={{width:pct(d.count),background:"#6366f133",border:"1px solid #6366f1"}}/></div>
                    <span className={styles.zn}>{d.count} <em>({pct(d.count)})</em></span>
                  </div>
                ))}
              </div>
              <div className={styles.zc}>
                <h2 className={styles.zh}>Thalassemia (thall)</h2>
                {thallBreakdown.map(d=>(
                  <div key={d.label} className={styles.zrow}>
                    <span className={styles.zl}>{d.label}</span>
                    <div className={styles.zbw}><div className={styles.zb} style={{width:pct(d.count),background:"#a855f733",border:"1px solid #a855f7"}}/></div>
                    <span className={styles.zn}>{d.count} <em>({pct(d.count)})</em></span>
                  </div>
                ))}
              </div>
              <div className={styles.zc}>
                <h2 className={styles.zh}>Fasting blood sugar (fbs)</h2>
                {fbsBreakdown.filter(d=>d.count>0).map(d=>(
                  <div key={d.label} className={styles.zrow}>
                    <span className={styles.zl}>{d.label}</span>
                    <div className={styles.zbw}><div className={styles.zb} style={{width:pct(d.count),background:"#f59e0b33",border:"1px solid #f59e0b"}}/></div>
                    <span className={styles.zn}>{d.count} <em>({pct(d.count)})</em></span>
                  </div>
                ))}
              </div>
              <div className={styles.zc}>
                <h2 className={styles.zh}>Exercise-induced angina (exng)</h2>
                {exngBreakdown.filter(d=>d.count>0).map(d=>(
                  <div key={d.label} className={styles.zrow}>
                    <span className={styles.zl}>{d.label}</span>
                    <div className={styles.zbw}><div className={styles.zb} style={{width:pct(d.count),background:"#e0525233",border:"1px solid #e05252"}}/></div>
                    <span className={styles.zn}>{d.count} <em>({pct(d.count)})</em></span>
                  </div>
                ))}
              </div>
            </div>

            {/* Risk anomalies */}
            <div className={styles.ac}>
              <h2 className={styles.ah}>⚠ High-risk patients <span className={styles.ab} style={{background:anomalies.length?"#fef2f2":"#f0fdf4",color:anomalies.length?"#dc2626":"#16a34a",borderColor:anomalies.length?"#fecaca":"#bbf7d0"}}>{anomalies.length} flagged</span></h2>
              <p className={styles.ad}>Patients with resting BP &gt; 140 mmHg AND cholesterol &gt; 240 mg/dl AND confirmed heart disease (output=1).</p>
              {anomalies.length===0
                ?<p className={styles.aok}>✓ No high-risk patients matching all three criteria.</p>
                :(
                  <table className={styles.atbl}><thead><tr>
                    {uci&&<><th>Age</th><th>Sex</th></>}
                    <th>BP (trtbps)</th><th>Chol</th><th>Max HR</th><th>CP type</th><th>Output</th>
                  </tr></thead>
                  <tbody>{anomalies.slice(0,25).map((r,i)=><tr key={i}>
                    {uci&&<><td>{r[hdrs[cols.ageIdx]]}</td><td>{r[hdrs[cols.sexIdx]]==="1"?"M":"F"}</td></>}
                    <td style={{color:"#e05252",fontWeight:600}}>{r[hdrs[cols.bpIdx]]}</td>
                    <td style={{color:"#a855f7",fontWeight:600}}>{r[hdrs[cols.cholIdx]]}</td>
                    <td>{r[hdrs[cols.hrMaxIdx]]}</td>
                    <td>{CP_LABEL[r[hdrs[cols.cpIdx]]]||r[hdrs[cols.cpIdx]]}</td>
                    <td style={{color:"#e05252",fontWeight:600}}>{r[hdrs[cols.outputIdx]]}</td>
                  </tr>)}</tbody></table>
                )
              }
            </div>

            <div className={styles.cta}>
              <button className={styles.ctaBtn} onClick={dlReport}>⬇ Download full analysis CSV</button>
              <Link href="/vitals" className={styles.ctaSec}>📊 View 8-chart dashboard →</Link>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
