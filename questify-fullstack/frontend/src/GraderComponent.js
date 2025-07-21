import React, { useState, useRef } from "react";
import axios from "axios";
import html2pdf from "html2pdf.js";

// Background image
const backgroundImageUrl =
  "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1350&q=80";

function GraderComponent() {
  const [modelKey, setModelKey] = useState(null);
  const [studentScript, setStudentScript] = useState(null);
  const [gradingResult, setGradingResult] = useState(null);
  const [gradingLoading, setGradingLoading] = useState(false);

  const feedbackRef = useRef();
  const fullReportRef = useRef();

  const handleModelKeyChange = (e) => setModelKey(e.target.files[0]);
  const handleStudentScriptChange = (e) => setStudentScript(e.target.files[0]);

  const handleGradeScript = async () => {
    if (!modelKey || !studentScript) {
      alert("Please upload both the model answer key and a student script.");
      return;
    }

    try {
      setGradingLoading(true);
      setGradingResult(null);

      const formData = new FormData();
      formData.append("modelKey", modelKey);
      formData.append("studentScript", studentScript);

      const res = await axios.post("/api/grade-script", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setGradingResult(res.data);
    } catch (err) {
      alert("Grading failed: " + (err.response?.data?.error || err.message));
      console.error(err);
    } finally {
      setGradingLoading(false);
    }
  };

  const handleDownloadSuggestionsPDF = () => {
    if (!gradingResult?.suggestions) return alert("No suggestions available.");
    html2pdf().from(feedbackRef.current).save("AI-Suggestions.pdf");
  };

  const handleDownloadFullReportPDF = () => {
    if (!gradingResult) return alert("No grading result to export.");
    html2pdf().from(fullReportRef.current).save("Grading-Report.pdf");
  };

  const styles = {
    container: {
      minHeight: "100vh",
      backgroundImage: `url(${backgroundImageUrl})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
      padding: "60px 20px",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      backdropFilter: "blur(10px)",
    },
    card: {
      backgroundColor: "#ffffffee",
      borderRadius: 16,
      boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
      padding: 32,
      width: "100%",
      maxWidth: 960,
      marginBottom: 40,
    },
    heading: {
      marginBottom: 24,
      fontSize: 28,
      fontWeight: 700,
      textAlign: "center",
      color: "#3949ab",
    },
    label: {
      marginTop: 16,
      marginBottom: 6,
      fontWeight: 600,
      fontSize: 16,
    },
    input: {
      width: "100%",
      padding: "12px",
      borderRadius: 10,
      border: "1px solid #ccc",
      fontSize: 16,
      marginBottom: 10,
    },
    addBtn: {
      backgroundColor: "#ff6f61",
      color: "#fff",
      borderRadius: 10,
      padding: "12px 20px",
      border: "none",
      fontWeight: "600",
      marginTop: 20,
      cursor: "pointer",
    },
    tableHeader: {
      backgroundColor: "#3949ab",
      color: "#fff",
      padding: 12,
      fontWeight: "700",
      fontSize: 16,
    },
    tableCell: {
      border: "1px solid #e0e0e0",
      padding: 16,
      textAlign: "left",
      verticalAlign: "top",
      backgroundColor: "#fafafa",
    },
    warning: {
      backgroundColor: "#fff8e1",
      color: "#d84315",
      padding: "12px 18px",
      borderRadius: 8,
      margin: "12px 0 0",
      fontWeight: 600,
      textAlign: "center",
    },
    suggestionBox: {
      marginTop: 32,
      padding: 20,
      backgroundColor: "#f1f8e9",
      borderLeft: "5px solid #558b2f",
      borderRadius: 10,
      fontSize: 16,
      whiteSpace: "pre-line",
      color: "#33691e",
    },
    suggestionHeading: {
      fontWeight: 700,
      fontSize: 18,
      marginBottom: 10,
      color: "#33691e",
    },
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>🧠 Questify – AI Answer Script Grader</h2>

      {/* Upload Section */}
      <div style={styles.card}>
        <h3 style={{ ...styles.heading, fontSize: 22 }}>📤 Upload Files</h3>

        <label style={styles.label}>Model Answer Key (.json or .txt)</label>
        <input
          type="file"
          accept=".json,.txt"
          style={styles.input}
          onChange={handleModelKeyChange}
        />

        <label style={styles.label}>Student Script (PDF/Image)</label>
        <input
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          style={styles.input}
          onChange={handleStudentScriptChange}
        />

        <button
          style={styles.addBtn}
          onClick={handleGradeScript}
          disabled={gradingLoading}
        >
          {gradingLoading ? "Grading..." : "🔍 Grade Script"}
        </button>

        {gradingLoading && (
          <p style={{ marginTop: 10, color: "#555" }}>
            ⏳ Running OCR and evaluating...
          </p>
        )}
      </div>

      {/* Results Section */}
      {gradingResult && (
        <div style={styles.card} ref={fullReportRef}>
          <h3 style={{ ...styles.heading, fontSize: 22 }}>📊 Grading Report</h3>

          {/* Download Buttons */}
          <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
            <button onClick={handleDownloadFullReportPDF} style={styles.addBtn}>
              📥 Download Full Report
            </button>
            <button
              onClick={handleDownloadSuggestionsPDF}
              style={{ ...styles.addBtn, backgroundColor: "#009688" }}
            >
              🧠 Download AI Suggestions
            </button>
          </div>

          {/* Warning Message */}
          {gradingResult.details.length === 1 && (
            <div style={styles.warning}>
              ⚠️ Only one answer detected. Ensure each answer in the scanned document
              starts with “Q1)”, “Q2)”, etc.
            </div>
          )}

          {/* Table */}
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={styles.tableHeader}>Q.No</th>
                  <th style={styles.tableHeader}>Student Answer</th>
                  <th style={styles.tableHeader}>Model Answer</th>
                  <th style={styles.tableHeader}>Similarity</th>
                  <th style={styles.tableHeader}>Marks</th>
                </tr>
              </thead>
              <tbody>
                {gradingResult.details.map((row, index) => (
                  <tr key={index}>
                    <td style={styles.tableCell}>{row.questionNo}</td>
                    <td style={styles.tableCell}>{row.studentAnswer}</td>
                    <td style={styles.tableCell}>{row.modelAnswer}</td>
                    <td style={styles.tableCell}>{row.similarity}%</td>
                    <td style={styles.tableCell}>{row.marks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 🎯 AI Suggestions Section */}
          {gradingResult.suggestions && (
            <div style={styles.suggestionBox} ref={feedbackRef}>
              <div style={styles.suggestionHeading}>
                🎯 Personalized AI Suggestions
              </div>
              {gradingResult.suggestions}
            </div>
          )}

          <div
            style={{
              marginTop: 20,
              fontSize: 18,
              fontWeight: "bold",
              color: "#388E3C",
              textAlign: "center",
            }}
          >
            ✅ Total Score: {gradingResult.total} / {gradingResult.maxMarks}
          </div>
        </div>
      )}
    </div>
  );
}

export default GraderComponent;