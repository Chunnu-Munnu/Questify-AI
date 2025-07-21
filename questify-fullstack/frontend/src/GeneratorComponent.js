import React, { useState, useRef } from "react";
import axios from "axios";
import html2pdf from "html2pdf.js";

const backgroundImageUrl =
  "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1350&q=80";

function GeneratorComponent() {
  const [file, setFile] = useState(null);
  const [extractedText, setExtractedText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState("medium");
  const [examType, setExamType] = useState("");
  const [mcqs, setMcqs] = useState([{ marks: 1, count: 2 }]);
  const [subjectives, setSubjectives] = useState([{ marks: 2, count: 2 }]);
  const [generatedPaper, setGeneratedPaper] = useState("");
  const [generating, setGenerating] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [teacherFeedback, setTeacherFeedback] = useState("");
  const [isRegeneratingMode, setIsRegeneratingMode] = useState(false);

  // --- Bloom's Levels constants and state ---
  const BLOOM_LEVELS = [
    { key: "remember", label: "Remember" },
    { key: "understand", label: "Understand" },
    { key: "apply", label: "Apply" },
    { key: "analyze", label: "Analyze" },
    { key: "evaluate", label: "Evaluate" },
    { key: "create", label: "Create" }
  ];
  const [bloomLevels, setBloomLevels] = useState([
    "remember", "understand", "apply", "analyze", "evaluate", "create"
  ]);

  const questionRef = useRef();
  const answerRef = useRef();

  const handleFileChange = (e) => setFile(e.target.files[0]);

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await axios.post("http://localhost:5000/api/upload-pdf", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setExtractedText(res.data.text);
    } catch (err) {
      alert("Failed to upload PDF: " + err.message);
    }
    setUploading(false);
  };

  const buildQuestionsConfig = () => ({
    mcq: mcqs.reduce((acc, curr) => {
      acc[curr.marks] = (acc[curr.marks] || 0) + curr.count;
      return acc;
    }, {}),
    subjective: subjectives.reduce((acc, curr) => {
      acc[curr.marks] = (acc[curr.marks] || 0) + curr.count;
      return acc;
    }, {})
  });

  const handleGeneratePaper = async () => {
    if (!extractedText) {
      alert("Please upload a PDF first.");
      return;
    }
    setGenerating(true);
    try {
      const res = await axios.post("http://localhost:5000/api/generate-paper", {
        pdfText: extractedText,
        topic,
        difficulty,
        examType,
        questionsConfig: buildQuestionsConfig(),
        teacherFeedback: "",
        bloomLevels // <-- ADD
      });
      setGeneratedPaper(res.data.questionPaper);
    } catch (err) {
      alert("Error generating paper: " + err.message);
    }
    setGenerating(false);
  };

  const handleRegeneratePaper = async () => {
    if (!extractedText) {
      alert("Please upload a PDF first.");
      return;
    }
    if (!teacherFeedback.trim()) {
      alert("Please enter teacher feedback before regenerating.");
      return;
    }
    setRegenerating(true);
    try {
      const res = await axios.post("http://localhost:5000/api/generate-paper", {
        pdfText: extractedText,
        topic,
        difficulty,
        examType,
        questionsConfig: buildQuestionsConfig(),
        teacherFeedback,
        bloomLevels // <-- ADD
      });
      setGeneratedPaper(res.data.questionPaper);
    } catch (err) {
      alert("Error regenerating paper: " + err.message);
    }
    setRegenerating(false);
  };

  const handleDownloadQuestionPDF = () => {
    if (!generatedPaper) return alert("Please generate a paper first.");
    html2pdf().from(questionRef.current).save("Question-Paper.pdf");
  };

  const handleDownloadAnswerPDF = () => {
    if (!generatedPaper) return alert("Please generate a paper first.");
    html2pdf().from(answerRef.current).save("Answer-Key.pdf");
  };

  const handleDownloadAnswerTXT = () => {
    if (!generatedPaper) return alert("Please generate a paper first.");
    const { answers } = getSplitPaper();
    const blob = new Blob([answers.join("\n")], {
      type: "text/plain;charset=utf-8"
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "Answer-Key.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  // --- Helper: Split paper into questions/answers ---
  const getSplitPaper = () => {
    if (!generatedPaper) return { questions: [], answers: [] };

    let questionBlock = "";
    let answerBlock = "";

    const questionStart = generatedPaper.indexOf("==== QUESTION PAPER START ====");
    const answerStart = generatedPaper.indexOf("==== ANSWER KEY START ====");
    const answerEnd = generatedPaper.indexOf("==== ANSWER KEY END ====");

    if (questionStart !== -1 && answerStart !== -1) {
      questionBlock = generatedPaper.slice(questionStart + 30, answerStart).trim();
    } else {
      questionBlock = generatedPaper;
    }

    if (answerStart !== -1 && answerEnd !== -1) {
      answerBlock = generatedPaper.slice(answerStart + 26, answerEnd).trim();
    }

    return {
      questions: questionBlock.split("\n").map(line => line.trim()),
      answers: answerBlock.split("\n").map(line => line.trim()),
    };
  };

  const selectedBlooms = BLOOM_LEVELS
    .filter(lvl => bloomLevels.includes(lvl.key))
    .map(lvl => lvl.label);

  const styles = {
    container: {
      minHeight: "100vh",
      backgroundImage: `url(${backgroundImageUrl})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      padding: "40px 20px",
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      color: "#4B4B70",
      backgroundColor: "rgba(255, 235, 238, 0.7)",
      backgroundBlendMode: "screen"
    },
    card: {
      backgroundColor: "#E0F7FA",
      borderRadius: 10,
      boxShadow: "0 8px 16px rgba(0,0,0,0.1)",
      padding: 24,
      width: "100%",
      maxWidth: 900,
      marginBottom: 40
    },
    heading: {
      marginBottom: 24,
      fontSize: 26,
      fontWeight: "bold",
      textAlign: "center",
      color: "#FF6F91"
    },
    label: { marginTop: 12, marginBottom: 6, fontWeight: "600" },
    input: {
      width: "100%",
      padding: 10,
      borderRadius: 6,
      border: "1px solid #B0BEC5",
      fontSize: 16,
      outlineColor: "#81D4FA"
    },
    questionRow: {
      display: "flex",
      gap: 10,
      alignItems: "center",
      marginBottom: 10
    },
    removeBtn: {
      backgroundColor: "#ef5350",
      color: "#fff",
      borderRadius: 6,
      padding: "6px 12px",
      border: "none",
      marginLeft: 6,
      cursor: "pointer"
    },
    addBtn: {
      backgroundColor: "#4CAF50",
      color: "#fff",
      borderRadius: 6,
      padding: "8px 15px",
      border: "none",
      marginBottom: 20,
      cursor: "pointer",
      marginTop: 3
    },
    preOutput: {
      backgroundColor: "#f4f9fb",
      color: "#37474f",
      padding: 20,
      borderRadius: 10,
      whiteSpace: "pre-wrap",
      minHeight: 180,
      overflowY: "auto",
      fontFamily: "monospace",
      boxShadow: "inset 0 2px 6px rgba(0,0,0,0.1)"
    }
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.heading}>📘 Questify – AI Question Paper Generator</h1>

      {/* Upload PDF Section */}
      <div style={styles.card}>
        <h2 style={{ ...styles.heading, fontSize: 22, color: "#00838F" }}>
          📄 Upload Curriculum PDF
        </h2>
        <input type="file" accept=".pdf" onChange={handleFileChange} style={styles.input} />
        <button onClick={handleUpload} disabled={uploading || !file} style={styles.addBtn}>
          {uploading ? "Uploading..." : "Upload & Extract"}
        </button>
        {uploading ? (
          <div style={{ marginTop: 16, fontWeight: 600, color: "#0077cc" }}>
            🛠 Uploading and extracting content from PDF...
          </div>
        ) : extractedText ? (
          <div style={{ marginTop: 16, fontWeight: 600, color: "#388e3c" }}>
            ✅ Curriculum uploaded and text extracted successfully!
          </div>
        ) : null}
      </div>

      {/* Configure Paper */}
      <div style={styles.card}>
        <h2 style={{ ...styles.heading, fontSize: 22, color: "#00838F" }}>
          ✏ Configure Question Paper
        </h2>

        <label style={styles.label}>Focus Topic:</label>
        <input
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Enter focus topic"
          style={styles.input}
        />

        <label style={styles.label}>Difficulty:</label>
        <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} style={styles.input}>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>

        <label style={styles.label}>Exam Type:</label>
        <input
          type="text"
          value={examType}
          onChange={e => setExamType(e.target.value)}
          placeholder="Enter exam type (e.g., Half-Yearly, Pre-board, etc.)"
          style={styles.input}
        />

        {/* --- Bloom's Level(s) selection START --- */}
        <label style={styles.label}>Bloom's Level(s):</label>
        <div style={{ marginBottom: 12 }}>
          {BLOOM_LEVELS.map(lvl => (
            <label key={lvl.key} style={{ marginRight: 16, fontWeight: 500 }}>
              <input
                type="checkbox"
                checked={bloomLevels.includes(lvl.key)}
                onChange={() =>
                  setBloomLevels(bloomLevels.includes(lvl.key)
                    ? bloomLevels.filter(k => k !== lvl.key)
                    : [...bloomLevels, lvl.key]
                  )
                }
                style={{ marginRight: 6 }}
              />
              {lvl.label}
            </label>
          ))}
        </div>
        {/* Show selected blooms */}
        <div style={{ color: "#00838f", margin: "0 0 12px 0", fontWeight: 500 }}>
          Using Bloom Level(s): {selectedBlooms.length ? selectedBlooms.join(", ") : "None"}
        </div>
        {/* --- Bloom's Level(s) selection END --- */}

        {/* MCQ Setup */}
        <h3 style={{ color: "#006064", marginTop: 20 }}>🧠 MCQ Configuration</h3>
        {mcqs.map((q, i) => (
          <div key={i} style={{ marginBottom: 10 }}>
            {i === 0 && (
              <div style={{ ...styles.questionRow, fontWeight: 600, marginBottom: 4 }}>
                <div style={{ width: "30%" }}>Marks per Question</div>
                <div style={{ width: "50%" }}>No. of Questions</div>
              </div>
            )}
            <div style={styles.questionRow}>
              <input
                type="number"
                min={1}
                placeholder="Marks"
                value={q.marks}
                onChange={e => {
                  const updated = [...mcqs];
                  updated[i].marks = parseInt(e.target.value) || 1;
                  setMcqs(updated);
                }}
                style={{ ...styles.input, width: "30%" }}
              />
              <input
                type="number"
                min={1}
                placeholder="No. of MCQs"
                value={q.count}
                onChange={e => {
                  const updated = [...mcqs];
                  updated[i].count = parseInt(e.target.value) || 1;
                  setMcqs(updated);
                }}
                style={{ ...styles.input, width: "50%" }}
              />
              {mcqs.length > 1 && (
                <button
                  onClick={() => setMcqs(mcqs.filter((_, n) => n !== i))}
                  style={styles.removeBtn}
                  type="button"
                >
                  ✖
                </button>
              )}
            </div>
          </div>
        ))}
        <button onClick={() => setMcqs([...mcqs, { marks: 1, count: 1 }])} style={styles.addBtn} type="button">
          ➕ Add MCQ
        </button>

        {/* Subjectives Setup */}
        <h3 style={{ color: "#006064", marginTop: 20 }}>📝 Subjective Configuration</h3>
        {subjectives.map((q, i) => (
          <div key={i} style={{ marginBottom: 10 }}>
            {i === 0 && (
              <div style={{ ...styles.questionRow, fontWeight: 600, marginBottom: 4 }}>
                <div style={{ width: "30%" }}>Marks per Question</div>
                <div style={{ width: "50%" }}>No. of Questions</div>
              </div>
            )}
            <div style={styles.questionRow}>
              <input
                type="number"
                min={1}
                placeholder="Marks"
                value={q.marks}
                onChange={e => {
                  const updated = [...subjectives];
                  updated[i].marks = parseInt(e.target.value) || 1;
                  setSubjectives(updated);
                }}
                style={{ ...styles.input, width: "30%" }}
              />
              <input
                type="number"
                min={1}
                placeholder="No. of Questions"
                value={q.count}
                onChange={e => {
                  const updated = [...subjectives];
                  updated[i].count = parseInt(e.target.value) || 1;
                  setSubjectives(updated);
                }}
                style={{ ...styles.input, width: "50%" }}
              />
              {subjectives.length > 1 && (
                <button
                  onClick={() => setSubjectives(subjectives.filter((_, n) => n !== i))}
                  style={styles.removeBtn}
                  type="button"
                >
                  ✖
                </button>
              )}
            </div>
          </div>
        ))}
        <button onClick={() => setSubjectives([...subjectives, { marks: 2, count: 1 }])} style={styles.addBtn} type="button">
          ➕ Add Subjective
        </button>

        {/* Toggle Regenerate */}
        <div style={{ marginTop: 16 }}>
          <label style={{ fontWeight: 600 }}>
            <input
              type="checkbox"
              checked={isRegeneratingMode}
              onChange={() => setIsRegeneratingMode(!isRegeneratingMode)}
              style={{ marginRight: 8 }}
            />
            Regenerate with Feedback
          </label>
        </div>
        {isRegeneratingMode && (
          <>
            <label style={styles.label}>Teacher Feedback (For Regeneration):</label>
            <textarea
              value={teacherFeedback}
              onChange={e => setTeacherFeedback(e.target.value)}
              placeholder="Suggest improvements or changes"
              rows={4}
              style={styles.input}
            />
          </>
        )}

        {!isRegeneratingMode ? (
          <button
            onClick={handleGeneratePaper}
            disabled={generating}
            style={{ ...styles.addBtn, backgroundColor: "#FF6F91" }}
            type="button"
          >
            {generating ? "Generating..." : "Generate Question Paper"}
          </button>
        ) : (
          <button
            onClick={handleRegeneratePaper}
            disabled={regenerating}
            style={{ ...styles.addBtn, backgroundColor: "#4BC0C0" }}
            type="button"
          >
            {regenerating ? "Regenerating..." : "Regenerate with Feedback"}
          </button>
        )}
      </div>
      {/* OUTPUT SECTION */}
      <div style={styles.card}>
        <h2 style={{ ...styles.heading, fontSize: 22, color: "#00838F" }}>
          🧾 Generated Question Paper
        </h2>
        <button
          onClick={handleDownloadQuestionPDF}
          style={{ ...styles.addBtn, backgroundColor: "#0077cc" }}
          type="button"
        >
          📥 Download Question Paper PDF
        </button>
        <div ref={questionRef} style={styles.preOutput}>
          {generatedPaper
            ? (
              <>
                {getSplitPaper().questions.join("\n")}
                <div
                  style={{
                    color: "#607d8b",
                    fontSize: 14,
                    marginTop: 24,
                    fontStyle: "italic"
                  }}
                >{selectedBlooms.length > 0 && `[Bloom Levels Included: ${selectedBlooms.join(", ")}]`}
                </div>
              </>
            )
            : "Your generated paper will appear here."}
        </div>

        <h2 style={{ ...styles.heading, fontSize: 20, color: "#00838F", marginTop: 40 }}>
          ✅ Answer Key / Marking Scheme
        </h2>
        <button
          onClick={handleDownloadAnswerPDF}
          style={{ ...styles.addBtn, backgroundColor: "#0077cc" }}
          type="button"
        >
          🧾 Download Answer Key PDF
        </button>
        <button
          onClick={handleDownloadAnswerTXT}
          style={{ ...styles.addBtn, backgroundColor: "#4CAF50", marginLeft: 10 }}
          type="button"
        >
          📁 Download Answer Key TXT
        </button>
        <div ref={answerRef} style={styles.preOutput}>
          {generatedPaper
            ? getSplitPaper().answers.join("\n")
            : "Answer key and marking scheme will appear here."}
        </div>
      </div>
    </div>
  );
}

export default GeneratorComponent;
