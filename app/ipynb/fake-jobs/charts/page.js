"use client";
import { useRef, useState, useEffect } from "react";
import Papa from "papaparse";
import Link from "next/link";
import Nav from "../../../components/Nav";
import "../../../components/chartSetup";
import styles from "./charts.module.css";

import dynamic from "next/dynamic";
const Bar      = dynamic(() => import("react-chartjs-2").then(m=>({default:m.Bar})),      {ssr:false});
const Doughnut = dynamic(() => import("react-chartjs-2").then(m=>({default:m.Doughnut})), {ssr:false});
const Line     = dynamic(() => import("react-chartjs-2").then(m=>({default:m.Line})),     {ssr:false});

function detectJobCols(headers) {
  const low = headers.map(h=>h.toLowerCase().trim());
  return {
    titleIdx:    low.findIndex(h=>["job_title","title","position","role"].some(k=>h.includes(k))),
    locationIdx: low.findIndex(h=>["location","city","place","region"].some(k=>h.includes(k))),
    salMinIdx:   low.findIndex(h=>["salary_min","min_salary","sal_min"].some(k=>h.includes(k))),
    salMaxIdx:   low.findIndex(h=>["salary_max","max_salary","salary max","sal_max","salary"].some(k=>h.includes(k))),
    typeIdx:     low.findIndex(h=>["job_type","type","employment_type"].some(k=>h.includes(k))),
    industryIdx: low.findIndex(h=>["industry","sector","field"].some(k=>h.includes(k))),
    expIdx:      low.findIndex(h=>["experience","exp_level","seniority","level"].some(k=>h.includes(k))),
    remoteIdx:   low.findIndex(h=>["remote","work_type","location_type"].some(k=>h.includes(k))),
  };
}

function countBy(rows, key) {
  const map = {};
  rows.forEach(r => { const v=r[key]||"Unknown"; map[v]=(map[v]||0)+1; });
  return Object.entries(map).sort((a,b)=>b[1]-a[1]);
}

function avgSalaryBy(rows, groupKey, salKey) {
  const map = {};
  rows.forEach(r => {
    const g=r[groupKey]||"Unknown"; const s=parseFloat(r[salKey]);
    if (!isNaN(s)) { if(!map[g])map[g]=[]; map[g].push(s); }
  });
  return Object.entries(map).map(([k,v])=>[k, Math.round(v.reduce((a,b)=>a+b,0)/v.length)]).sort((a,b)=>b[1]-a[1]);
}

const PALETTE = ["#3b82f6","#f97316","#22c55e","#a855f7","#ec4899","#14b8a6","#f59e0b","#ef4444","#6366f1","#84cc16","#06b6d4","#fb923c"];
const GC = "rgba(0,0,0,0.06)";
const TF = { size: 11 };

// Built-in sample data so charts show immediately
const SAMPLE_ROWS = [
  {job_title:"Software Engineer",company:"TechCorp",location:"New York",salary_min:"90000",salary_max:"130000",job_type:"Full-time",experience_level:"Mid",remote:"Yes",industry:"Technology"},
  {job_title:"Data Scientist",company:"DataInc",location:"San Francisco",salary_min:"110000",salary_max:"160000",job_type:"Full-time",experience_level:"Senior",remote:"Yes",industry:"Technology"},
  {job_title:"Product Manager",company:"StartupXYZ",location:"Austin",salary_min:"95000",salary_max:"140000",job_type:"Full-time",experience_level:"Mid",remote:"Hybrid",industry:"Technology"},
  {job_title:"UX Designer",company:"DesignCo",location:"Seattle",salary_min:"75000",salary_max:"110000",job_type:"Full-time",experience_level:"Junior",remote:"No",industry:"Design"},
  {job_title:"DevOps Engineer",company:"CloudSys",location:"Remote",salary_min:"100000",salary_max:"145000",job_type:"Full-time",experience_level:"Senior",remote:"Yes",industry:"Technology"},
  {job_title:"Marketing Manager",company:"BrandBig",location:"Chicago",salary_min:"70000",salary_max:"100000",job_type:"Full-time",experience_level:"Mid",remote:"Hybrid",industry:"Marketing"},
  {job_title:"Data Analyst",company:"AnalyticsPlus",location:"Boston",salary_min:"65000",salary_max:"95000",job_type:"Full-time",experience_level:"Junior",remote:"Yes",industry:"Finance"},
  {job_title:"Backend Engineer",company:"FinTechPro",location:"New York",salary_min:"105000",salary_max:"155000",job_type:"Full-time",experience_level:"Senior",remote:"No",industry:"Finance"},
  {job_title:"Frontend Developer",company:"WebWorks",location:"Los Angeles",salary_min:"80000",salary_max:"120000",job_type:"Full-time",experience_level:"Mid",remote:"Yes",industry:"Technology"},
  {job_title:"ML Engineer",company:"AILabs",location:"San Francisco",salary_min:"120000",salary_max:"180000",job_type:"Full-time",experience_level:"Senior",remote:"Yes",industry:"Technology"},
  {job_title:"HR Manager",company:"PeopleFirst",location:"Chicago",salary_min:"60000",salary_max:"85000",job_type:"Full-time",experience_level:"Mid",remote:"No",industry:"HR"},
  {job_title:"Sales Executive",company:"SalesCo",location:"Dallas",salary_min:"55000",salary_max:"90000",job_type:"Full-time",experience_level:"Junior",remote:"No",industry:"Sales"},
  {job_title:"Cybersecurity Analyst",company:"SecureNet",location:"Washington",salary_min:"95000",salary_max:"135000",job_type:"Full-time",experience_level:"Mid",remote:"Hybrid",industry:"Technology"},
  {job_title:"Cloud Architect",company:"AWSPartner",location:"Remote",salary_min:"130000",salary_max:"190000",job_type:"Full-time",experience_level:"Senior",remote:"Yes",industry:"Technology"},
  {job_title:"Content Writer",company:"MediaHub",location:"Los Angeles",salary_min:"45000",salary_max:"65000",job_type:"Part-time",experience_level:"Junior",remote:"Yes",industry:"Media"},
  {job_title:"Financial Analyst",company:"InvestCo",location:"New York",salary_min:"80000",salary_max:"120000",job_type:"Full-time",experience_level:"Mid",remote:"No",industry:"Finance"},
  {job_title:"iOS Developer",company:"MobileFirst",location:"San Francisco",salary_min:"100000",salary_max:"150000",job_type:"Full-time",experience_level:"Senior",remote:"Yes",industry:"Technology"},
  {job_title:"Python Developer",company:"ScriptLab",location:"Remote",salary_min:"85000",salary_max:"125000",job_type:"Full-time",experience_level:"Mid",remote:"Yes",industry:"Technology"},
  {job_title:"Graphic Designer",company:"CreativeCo",location:"Portland",salary_min:"50000",salary_max:"75000",job_type:"Full-time",experience_level:"Junior",remote:"Yes",industry:"Design"},
  {job_title:"Research Scientist",company:"BioLabs",location:"Boston",salary_min:"90000",salary_max:"135000",job_type:"Full-time",experience_level:"Senior",remote:"No",industry:"Healthcare"},
];

const SAMPLE_COLS = {
  titleKey:"job_title", locationKey:"location", salMinKey:"salary_min",
  salMaxKey:"salary_max", typeKey:"job_type", industryKey:"industry",
  expKey:"experience_level", remoteKey:"remote",
};

export default function FakeJobsCharts() {
  const fileRef = useRef(null);
  const [rows,   setRows]   = useState(SAMPLE_ROWS);
  const [colMap, setColMap] = useState(SAMPLE_COLS);
  const [error,  setError]  = useState("");
  const [fname,  setFname]  = useState("sample data");
  const [mounted, setMounted] = useState(false);

  useEffect(()=>{ setMounted(true); }, []);

  const parse = (text, name="") => {
    setError("");
    Papa.parse(text, {
      header:true, skipEmptyLines:true,
      complete: res => {
        if (!res.data.length) { setError("No data rows found."); return; }
        const hdrs = res.meta.fields || [];
        const {titleIdx,locationIdx,salMinIdx,salMaxIdx,typeIdx,industryIdx,expIdx,remoteIdx} = detectJobCols(hdrs);
        if (titleIdx===-1 && typeIdx===-1 && industryIdx===-1) {
          setError(`Could not detect job columns. Found: ${hdrs.join(", ")}`); return;
        }
        setColMap({
          titleKey:   titleIdx!==-1    ? hdrs[titleIdx]    : null,
          locationKey:locationIdx!==-1 ? hdrs[locationIdx] : null,
          salMinKey:  salMinIdx!==-1   ? hdrs[salMinIdx]   : null,
          salMaxKey:  salMaxIdx!==-1   ? hdrs[salMaxIdx]   : null,
          typeKey:    typeIdx!==-1     ? hdrs[typeIdx]      : null,
          industryKey:industryIdx!==-1 ? hdrs[industryIdx] : null,
          expKey:     expIdx!==-1      ? hdrs[expIdx]       : null,
          remoteKey:  remoteIdx!==-1   ? hdrs[remoteIdx]   : null,
        });
        setRows(res.data); setFname(name);
      },
      error: e => setError("Parse error: "+e.message),
    });
  };

  const onFile = f => { if(!f)return; const r=new FileReader(); r.onload=e=>parse(e.target.result,f.name); r.readAsText(f); };

  // ── Derived chart data ──────────────────────────────────────────────────────
  const { locationKey, salMaxKey, salMinKey, typeKey, industryKey, expKey, remoteKey } = colMap;

  // Chart 1: Jobs by location (top 8)
  const locCounts = locationKey ? countBy(rows, locationKey).slice(0,8) : [];
  const c1 = {
    labels: locCounts.map(([k])=>k),
    datasets:[{ label:"Job Count", data:locCounts.map(([,v])=>v),
      backgroundColor:locCounts.map((_,i)=>PALETTE[i%PALETTE.length]+"cc"),
      borderRadius:5, borderWidth:0 }],
  };
  const o1 = { responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}},
    scales:{ x:{ticks:{font:{size:10},maxRotation:40},grid:{display:false}}, y:{title:{display:true,text:"Jobs",font:TF},ticks:{font:TF},grid:{color:GC}} }};

  // Chart 2: Job type doughnut
  const typeCounts = typeKey ? countBy(rows, typeKey) : [];
  const c2 = { labels:typeCounts.map(([k])=>k),
    datasets:[{ data:typeCounts.map(([,v])=>v), backgroundColor:PALETTE.slice(0,typeCounts.length), borderWidth:3, borderColor:"#fff" }]};
  const o2 = { responsive:true, maintainAspectRatio:false, cutout:"55%",
    plugins:{ legend:{position:"right",labels:{font:TF,padding:10,boxWidth:12,boxHeight:12}},
    tooltip:{callbacks:{label:c=>` ${c.label}: ${c.raw} (${((c.raw/rows.length)*100).toFixed(1)}%)`}}}};

  // Chart 3: Avg salary by industry (top 8)
  const indSal = (industryKey && salMaxKey) ? avgSalaryBy(rows, industryKey, salMaxKey).slice(0,8) : [];
  const c3 = { labels:indSal.map(([k])=>k),
    datasets:[{ label:"Avg Max Salary ($)", data:indSal.map(([,v])=>v),
      backgroundColor:indSal.map((_,i)=>PALETTE[i%PALETTE.length]+"bb"), borderRadius:5, borderWidth:0 }]};
  const o3 = { responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}},
    scales:{ x:{ticks:{font:{size:10},maxRotation:40},grid:{display:false}},
    y:{title:{display:true,text:"Avg Salary ($)",font:TF},ticks:{font:TF,callback:v=>"$"+(v/1000).toFixed(0)+"k"},grid:{color:GC}} }};

  // Chart 4: Experience level bar
  const expCounts = expKey ? countBy(rows, expKey) : [];
  const c4 = { labels:expCounts.map(([k])=>k),
    datasets:[{ label:"Jobs", data:expCounts.map(([,v])=>v),
      backgroundColor:["#60a5fa","#34d399","#f59e0b","#f87171","#a78bfa"].slice(0,expCounts.length),
      borderRadius:5, borderWidth:0 }]};
  const o4 = { responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}},
    scales:{ x:{ticks:{font:{size:10}},grid:{display:false}}, y:{title:{display:true,text:"Count",font:TF},ticks:{font:TF},grid:{color:GC}} }};

  // Chart 5: Remote distribution doughnut
  const remoteCounts = remoteKey ? countBy(rows, remoteKey) : [];
  const c5 = { labels:remoteCounts.map(([k])=>k),
    datasets:[{ data:remoteCounts.map(([,v])=>v),
      backgroundColor:["#22c55e","#f97316","#3b82f6","#a855f7"].slice(0,remoteCounts.length),
      borderWidth:3, borderColor:"#fff" }]};
  const o5 = { responsive:true, maintainAspectRatio:false, cutout:"55%",
    plugins:{ legend:{position:"right",labels:{font:TF,padding:10,boxWidth:12,boxHeight:12}},
    tooltip:{callbacks:{label:c=>` ${c.label}: ${c.raw} (${((c.raw/rows.length)*100).toFixed(1)}%)`}}}};

  // Chart 6: Salary min vs max range line (by industry or sorted)
  const salRangeData = (salMinKey && salMaxKey && industryKey)
    ? avgSalaryBy(rows, industryKey, salMaxKey).slice(0,10).map(([k])=>({
        industry:k,
        avg_min: Math.round(rows.filter(r=>r[industryKey]===k).reduce((s,r)=>s+(parseFloat(r[salMinKey])||0),0)/Math.max(1,rows.filter(r=>r[industryKey]===k).length)),
        avg_max: Math.round(rows.filter(r=>r[industryKey]===k).reduce((s,r)=>s+(parseFloat(r[salMaxKey])||0),0)/Math.max(1,rows.filter(r=>r[industryKey]===k).length)),
      }))
    : [];
  const c6 = { labels:salRangeData.map(d=>d.industry),
    datasets:[
      { label:"Avg Min Salary", data:salRangeData.map(d=>d.avg_min), borderColor:"#60a5fa", backgroundColor:"rgba(96,165,250,0.08)", borderWidth:2, tension:0.3, pointRadius:4, fill:true },
      { label:"Avg Max Salary", data:salRangeData.map(d=>d.avg_max), borderColor:"#f97316", backgroundColor:"rgba(249,115,22,0.08)", borderWidth:2, tension:0.3, pointRadius:4, fill:true },
    ]};
  const o6 = { responsive:true, maintainAspectRatio:false, interaction:{mode:"index",intersect:false},
    plugins:{ legend:{position:"top",labels:{font:TF,boxWidth:12,boxHeight:12,padding:12}} },
    scales:{ x:{ticks:{font:{size:10},maxRotation:40},grid:{display:false}},
    y:{title:{display:true,text:"Salary ($)",font:TF},ticks:{font:TF,callback:v=>"$"+(v/1000).toFixed(0)+"k"},grid:{color:GC}} }};

  const totalJobs = rows.length;

  return (
    <div className={styles.page}>
      <Nav/>
      <header className={styles.hero}>
        <div className={styles.inner}>
          <span className={styles.badge}>📊 6 Live Charts</span>
          <h1 className={styles.title}>Fake Jobs — Interactive Charts</h1>
          <p className={styles.sub}>Upload your CSV and all 6 charts update instantly. Currently showing: <strong>{fname}</strong> ({totalJobs} jobs)</p>
        </div>
      </header>

      <main className={styles.main}>
        {/* Upload bar */}
        <div className={styles.upBar}>
          <div className={styles.drop} onClick={()=>fileRef.current?.click()}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            <span>Upload new CSV to refresh charts</span>
            <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={e=>onFile(e.target.files?.[0])} style={{display:"none"}}/>
          </div>
          <a href="/data/fake_jobs_sample.csv" download className={styles.dlBtn}>⬇ Sample CSV</a>
          <Link href="/ipynb/fake-jobs" className={styles.backBtn}>← Tutorial</Link>
          <span className={styles.counter}>{totalJobs} jobs loaded</span>
          {error && <span className={styles.err}>{error}</span>}
        </div>

        {mounted && (
          <div className={styles.grid}>

            <div className={styles.card}>
              <span className={styles.num}>01</span>
              <h2 className={styles.ct}>Jobs by location (top 8)</h2>
              <p className={styles.cd}>Cities with the highest number of job postings in the dataset.</p>
              <div style={{position:"relative",height:230}}><Bar data={c1} options={o1}/></div>
            </div>

            <div className={styles.card}>
              <span className={styles.num}>02</span>
              <h2 className={styles.ct}>Job type distribution</h2>
              <p className={styles.cd}>Breakdown of Full-time / Part-time / Contract / Freelance roles.</p>
              <div style={{position:"relative",height:230}}><Doughnut data={c2} options={o2}/></div>
            </div>

            <div className={styles.card}>
              <span className={styles.num}>03</span>
              <h2 className={styles.ct}>Avg salary by industry</h2>
              <p className={styles.cd}>Average maximum salary offered per industry (top 8 industries).</p>
              <div style={{position:"relative",height:230}}><Bar data={c3} options={o3}/></div>
            </div>

            <div className={styles.card}>
              <span className={styles.num}>04</span>
              <h2 className={styles.ct}>Experience level demand</h2>
              <p className={styles.cd}>Count of jobs by seniority — Junior, Mid, Senior breakdown.</p>
              <div style={{position:"relative",height:230}}><Bar data={c4} options={o4}/></div>
            </div>

            <div className={styles.card}>
              <span className={styles.num}>05</span>
              <h2 className={styles.ct}>Remote vs hybrid vs on-site</h2>
              <p className={styles.cd}>Proportion of jobs by work arrangement type.</p>
              <div style={{position:"relative",height:230}}><Doughnut data={c5} options={o5}/></div>
            </div>

            <div className={`${styles.card} ${styles.w2}`}>
              <span className={styles.num}>06</span>
              <h2 className={styles.ct}>Salary range by industry (min vs max)</h2>
              <p className={styles.cd}>Average minimum (blue) vs maximum (orange) salary per industry — shows compensation spread.</p>
              <div style={{position:"relative",height:260}}><Line data={c6} options={o6}/></div>
            </div>

          </div>
        )}
      </main>
    </div>
  );
}
