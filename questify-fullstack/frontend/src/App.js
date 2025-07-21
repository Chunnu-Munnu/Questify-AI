import React, { useState } from "react";
import GeneratorComponent from "./GeneratorComponent";
import GraderComponent from "./GraderComponent";

const dashboardStyles = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100%",
  zIndex: 1000,
  background: "rgba(255,255,255,0.93)",
  boxShadow: "0 2px 12px -4px rgba(36, 42, 80, 0.13)",
  padding: "14px 0",
  display: "flex",
  justifyContent: "center",
  gap: "35px",
  fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
  fontWeight: 600,
  fontSize: "1.13rem",
  transition: "background 0.24s",
};

const itemStyles = (active) => ({
  color: active ? "#164AC9" : "#333",
  background: active ? "#e2e9ff" : "transparent",
  padding: "8px 30px",
  borderRadius: "8px",
  border: "none",
  cursor: "pointer",
  outline: "none",
  borderBottom: active ? "2.5px solid #164AC9" : "none",
  transition: "all 0.2s",
  boxShadow: active ? "0 3px 24px -8px rgba(36, 42, 80, 0.20)" : undefined,
});

function App() {
  const [section, setSection] = useState("generator");

  return (
    <>
      <nav style={dashboardStyles}>
        <button
          style={itemStyles(section === "generator")}
          onClick={() => setSection("generator")}
        >
          📘 Generator
        </button>
        <button
          style={itemStyles(section === "grader")}
          onClick={() => setSection("grader")}
        >
          📝 Grader
        </button>
      </nav>

      <div style={{ marginTop: "80px" }}>
        {section === "generator" && <GeneratorComponent />}
        {section === "grader" && <GraderComponent />}
      </div>
    </>
  );
}

export default App;
