"use client";
import { createContext, useContext, useState, useCallback } from "react";
import Papa from "papaparse";

const DataContext = createContext(null);

function detectCols(headers) {
  const low = headers.map(h => h.toLowerCase().trim());
  const f = (candidates) => {
    const exact = low.findIndex(h => candidates.some(k => h === k));
    return exact !== -1 ? exact : low.findIndex(h => candidates.some(k => h.includes(k)));
  };
  return {
    age:      f(["age"]),
    sex:      f(["sex","gender"]),
    cp:       f(["cp","chest_pain"]),
    trtbps:   f(["trtbps","trestbps","bp","resting_bp"]),
    chol:     f(["chol","cholesterol"]),
    fbs:      f(["fbs","fasting"]),
    restecg:  f(["restecg","ecg"]),
    thalachh: f(["thalachh","thalach","max_hr"]),
    exng:     f(["exng","exang"]),
    oldpeak:  f(["oldpeak","st_dep"]),
    slp:      f(["slp","slope"]),
    caa:      f(["caa","ca"]),
    thall:    f(["thall","thal"]),
    output:   f(["output","target","disease","result"]),
    hr:       f(["hr","bpm","heartrate","pulse","thalachh"]),
    spo2:     f(["spo2","o2","oxygen","saturation"]),
  };
}

export function DataProvider({ children }) {
  const [rows,   setRows]   = useState([]);
  const [hdr,    setHdr]    = useState([]);
  const [cols,   setCols]   = useState({});
  const [loaded, setLoaded] = useState(false);
  const [error,  setError]  = useState("");
  const [fname,  setFname]  = useState("");

  const parseText = useCallback((text, name = "") => {
    setError("");
    Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        if (!res.data.length) { setError("No data rows found."); return; }
        const headers = res.meta.fields || [];
        const detected = detectCols(headers);
        if (detected.age === -1 && detected.hr === -1 && detected.spo2 === -1) {
          setError(`Cannot detect columns. Found: ${headers.join(", ")}. Expected UCI columns (age, trtbps, chol, thalachh, output…)`);
          return;
        }
        setHdr(headers);
        setCols(detected);
        setRows(res.data);
        setFname(name);
        setLoaded(true);
        setError("");
      },
      error: (e) => setError("Parse error: " + e.message),
    });
  }, []);

  const loadFile = useCallback((file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => parseText(e.target.result, file.name);
    reader.readAsText(file);
  }, [parseText]);

  const loadUrl = useCallback(async (url, name) => {
    try {
      const res = await fetch(url);
      const text = await res.text();
      parseText(text, name);
    } catch (e) {
      setError("Failed to load: " + e.message);
    }
  }, [parseText]);

  return (
    <DataContext.Provider value={{ rows, hdr, cols, loaded, error, fname, parseText, loadFile, loadUrl }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used inside DataProvider");
  return ctx;
}
