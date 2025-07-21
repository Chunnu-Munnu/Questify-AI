const express = require('express');
const cors = require('cors');
require('dotenv').config();
const axios = require('axios');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const fs = require('fs');
const Tesseract = require('tesseract.js'); // ✅ OCR
const stringSimilarity = require('string-similarity'); // ✅ Text comparison

// Multer: Files will be stored in /uploads temporarily
const upload = multer({ dest: 'uploads/' });

const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' }));

// ✅ --- Added: OCR text preprocessing function
function preprocessOcrText(text) {
  // Normalize line endings and remove excessive whitespace
  let processed = text.replace(/[\r\n]+/g, '\n').replace(/[ \t]+/g, ' ');
  // Attempt to re-insert 'Q' if it is missing before numbers/answers (covers '1)', '2)' etc.)
  processed = processed.replace(/(?:^|\n)+(\d{1,2})[\).:\-]/g, '\nQ$1)');
  // Remove extra newlines
  processed = processed.replace(/\n+/g, '\n');
  return processed;
}

// ===================== 📝 GRADER ENDPOINT (FINAL) =====================
app.post(
  '/api/grade-script',
  upload.fields([
    { name: 'modelKey', maxCount: 1 },
    { name: 'studentScript', maxCount: 1 }
  ]),
  async (req, res) => {
    const modelFile = req.files?.modelKey?.[0];
    const studentFile = req.files?.studentScript?.[0];

    if (!modelFile || !studentFile) {
      return res.status(400).json({
        error: "❌ Missing files. Upload both modelKey (.json/.txt) and studentScript (PDF/Image)."
      });
    }

    const modelPath = modelFile.path;
    const studentPath = studentFile.path;

    try {
      const ext = modelFile.originalname.split('.').pop().toLowerCase();
      if (!['json', 'txt'].includes(ext)) {
        throw new Error("Model Answer Key must be a .json or .txt file.");
      }

      const rawModel = fs.readFileSync(modelPath, 'utf-8');
      let modelAnswers = [];

      try {
        modelAnswers = JSON.parse(rawModel); // Try JSON
      } catch {
        modelAnswers = rawModel
          .split('\n')
          .map((line) => line.trim())
          .filter((line) => line.length > 0);
      }

      if (!Array.isArray(modelAnswers) || modelAnswers.length === 0) {
        throw new Error("Model file is empty or incorrectly formatted.");
      }

      // 🟨 --- Modification: Student Script Extraction (PDF/Text or OCR)
      const studentExt = studentFile.originalname.split('.').pop().toLowerCase();
      let studentText = "";

      if (studentExt === "pdf") {
        const dataBuffer = fs.readFileSync(studentPath);
        const pdfData = await pdfParse(dataBuffer);
        studentText = pdfData.text;
      } else {
        const { data: { text } } = await Tesseract.recognize(studentPath, 'eng');
        studentText = text;
      }

      // 🟨 --- Modification: Preprocess text for reliable Q# markers (for both PDF and image OCR)
      studentText = preprocessOcrText(studentText);

      // 🟨 --- Modification: Use a robust regex to split answers (accepts Q1), Q1., Q1: etc.)
      const studentAnswers = studentText
        .split(/(?:^|\n)Q\s*\d{1,2}[\).:\-]+/gi)
        .map(ans => ans.replace(/\s+/g, " ").trim()) // flatten inner whitespace and trim
        .filter(ans => ans.length > 0);

      // 🟧 Edge case: If everything is in the first answer, and only one answer,
      // and it's unusually long: warn the user
      // No change to your table warning! Kept as is below.

      // Grading logic, as per your existing design
      const fullMarks = 5;
      let total = 0;
      let maxMarks = 0;
      const details = [];

      for (let i = 0; i < modelAnswers.length; i++) {
        const model = modelAnswers[i] || '';
        const student = studentAnswers[i] || '';
        const similarity = Math.round(
          stringSimilarity.compareTwoStrings(student, model) * 100
        );
        let marks = 0;
        if (similarity >= 85) marks = fullMarks;
        else if (similarity >= 60) marks = Math.round(fullMarks / 2);

        total += marks;
        maxMarks += fullMarks;

        details.push({
          questionNo: i + 1,
          modelAnswer: model,
          studentAnswer: student,
          similarity,
          marks,
        });
      }

      // --- AI Suggestions unchanged ---
      let suggestions = '';
      try {
        const feedbackPrompt = `
You are an AI exam evaluator. Based on the following answers, grading results, and model answers, provide personalized suggestions.
Format: "Q1: Your suggestion", "Q2: Your suggestion", etc.

Data:
${JSON.stringify(details, null, 2)}

Guidelines:
- If answer is good, praise it shortly.
- If answer is weak, explain improvement.
- Be honest but encouraging.
        `.trim();

        const aiResponse = await axios.post(
          'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent',
          {
            contents: [{ parts: [{ text: feedbackPrompt }] }]
          },
          {
            headers: { 'Content-Type': 'application/json' },
            params: { key: process.env.GEMINI_API_KEY }
          }
        );

        suggestions =
          aiResponse.data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
          "✅ AI suggestions are not available.";
      } catch (suggestionError) {
        console.error("❌ AI suggestion error:", suggestionError.message);
        suggestions = "⚠️ AI suggestions could not be generated.";
      }

      return res.json({
        total,
        maxMarks,
        details,
        suggestions
      });
    } catch (err) {
      console.error("❌ /api/grade-script Error:", err.message);
      res.status(500).json({
        error: err.message || "Something went wrong during grading.",
      });
    } finally {
      try { fs.unlinkSync(modelPath); } catch {}
      try { fs.unlinkSync(studentPath); } catch {}
    }
  }
);
// ===================== 📝 END GRADER ENDPOINT =====================

// ======= 📘 GENERATOR ENDPOINTS BEGIN =======

// Upload and extract curriculum text from PDF
app.post('/api/upload-pdf', upload.single('file'), async (req, res) => {
  try {
    const filePath = req.file.path;
    const dataBuffer = fs.readFileSync(filePath);
    const pdfData = await pdfParse(dataBuffer);
    fs.unlinkSync(filePath);
    res.json({ text: pdfData.text });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Generate question paper using Gemini
app.post('/api/generate-paper', async (req, res) => {
  const {
    pdfText,
    topic,
    difficulty,
    examType,
    questionsConfig,
    teacherFeedback,
    bloomLevels // ==== ADDED: Receive bloomLevels from frontend ====
  } = req.body;

  try {
    const mcqDetails = Object.entries(questionsConfig.mcq || {})
      .map(([mark, count]) => `${count} MCQs of ${mark} mark`)
      .join(', ') || 'None';

    const subjectiveDetails = Object.entries(questionsConfig.subjective || {})
      .map(([mark, count]) => `${count} Subjective questions of ${mark} marks`)
      .join(', ') || 'None';

    // ==== ADDED: bloomLevels injection ====
    let bloomPrompt = '';
    if (Array.isArray(bloomLevels) && bloomLevels.length > 0) {
      // Capitalize for display
      const bloomLabels = bloomLevels.map(
        key => key.charAt(0).toUpperCase() + key.slice(1)
      );
      bloomPrompt = `\nChoose ONLY from the following Bloom's taxonomy cognitive levels for the questions: ${bloomLabels.join(', ')}.`;
      bloomPrompt += `\nAfter every question, indicate its Bloom's level in square brackets, e.g. [Apply].`;
    }

    let prompt = `
You are an expert teacher. Generate a ${examType} school exam paper.

Instructions:
- FIRST: Provide the entire question paper, starting with "==== QUESTION PAPER START ===="
- After all questions, write "==== ANSWER KEY START ====" and list answers clearly
- End answers with "==== ANSWER KEY END ===="

Generate:
- ${mcqDetails}
- ${subjectiveDetails}

Curriculum:
${pdfText.slice(0, 10000)}

Topic: ${topic}
Level: ${difficulty}
${bloomPrompt}
`.trim();

    if (teacherFeedback && teacherFeedback.trim().length > 0) {
      prompt += `

TEACHER FEEDBACK:
${teacherFeedback.trim()}
`;
    }

    const response = await axios.post(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent',
      {
        contents: [{ parts: [{ text: prompt }] }]
      },
      {
        headers: { 'Content-Type': 'application/json' },
        params: { key: process.env.GEMINI_API_KEY }
      }
    );

    const generatedPaper = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;

    res.json({ questionPaper: generatedPaper || "AI did not return valid output." });
  } catch (err) {
    console.error("❌ Error in /generate-paper:", err.message);
    res.status(500).json({ error: err.message || 'Error generating paper.' });
  }
});
// ======= 📘 GENERATOR ENDPOINTS END =======

// Start server
const PORT = process.env.PORT || 5000;
app.listen(8080, "0.0.0.0", () => {
  console.log("✅ Backend running on http://0.0.0.0:8080");
});

