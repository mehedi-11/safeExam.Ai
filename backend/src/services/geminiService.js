const GEMINI_MODELS = [
  'gemini-3.8-flash',
  'gemini-3.5-flash',
  'gemini-2.5-flash-lite'
];

async function callGemini(prompt, systemInstruction = '') {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in backend environment');
  }

  let lastError = null;

  for (const model of GEMINI_MODELS) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    try {
      const payload = {
        contents: [
          {
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 2048,
          responseMimeType: "application/json"
        }
      };

      if (systemInstruction) {
        payload.systemInstruction = {
          parts: [{ text: systemInstruction }]
        };
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.warn(`[Gemini API] Model ${model} returned status ${response.status}: ${errorBody}`);
        lastError = new Error(`Model ${model} failed with ${response.status}`);
        continue;
      }

      const data = await response.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) {
        continue;
      }

      try {
        return JSON.parse(rawText);
      } catch (parseErr) {
        // Fallback: extract json from markdown code block if present
        const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[1]);
        }
        return { rawText };
      }
    } catch (err) {
      console.warn(`[Gemini API] Error calling ${model}:`, err.message);
      lastError = err;
    }
  }

  throw lastError || new Error('All Gemini models failed');
}

/**
 * Analyze student exams and generate deep academic & behavioral diagnosis
 */
async function analyzeStudentPerformance(studentData) {
  const { studentName, subjects, totalDemerits } = studentData;

  const prompt = `You are "ELI" (Agent ELI), an elite academic diagnostic AI tutor for SafeExam.AI.
Analyze the following student exam record across all completed exams and detect underlying study bottlenecks, pacing issues, and root causes for underperformance. Provide highly specific, actionable advice.

Student Name: ${studentName || 'Student'}
Total Proctoring Demerit Flags: ${totalDemerits || 0}
Subject Records:
${JSON.stringify(subjects, null, 2)}

Return a strict JSON object with this EXACT structure:
{
  "summary": "Concise 2-sentence diagnosis from Agent ELI of overall strengths, core learning bottlenecks, and pacing.",
  "riskLevel": "Low" | "Moderate" | "High",
  "riskDescription": "Short explanation of the student's risk regarding upcoming exams or grade drops.",
  "detectedProblems": [
    {
      "subject": "Subject Name",
      "issue": "Specific study/knowledge problem (e.g. Concept retention gap in calculus, rushed answering)",
      "rootCause": "Why this happens (e.g. Passive revision rather than active problem solving, weak prerequisite knowledge)",
      "severity": "Critical" | "Moderate" | "Minor"
    }
  ],
  "timeAndBehavioralInsights": "Specific insights regarding exam duration, pacing traps, and integrity/focus health.",
  "targetGoals": [
    {
      "subject": "Subject Name",
      "targetScore": "Target percentage goal (e.g. 80%)",
      "actionNeeded": "Key intervention required to hit this target"
    }
  ],
  "remedialRoadmap": [
    {
      "phase": "Phase 1: Days 1-2 (Foundation Recovery)",
      "focus": "Core concept & formula reconstruction",
      "action": "Specific active revision task"
    },
    {
      "phase": "Phase 2: Days 3-5 (Diagnostic Practice)",
      "focus": "Re-attempt failed problems without solutions",
      "action": "Timed problem sets"
    },
    {
      "phase": "Phase 3: Days 6-7 (Exam Simulation)",
      "focus": "Full length mock under time limits",
      "action": "Mock test with web proctoring rules"
    }
  ],
  "quickTips": [
    "High-impact tip 1...",
    "High-impact tip 2...",
    "High-impact tip 3..."
  ]
}`;

  const systemInstruction = "You are Agent ELI, an expert educational data scientist and cognitive mentor for students. Never mention any underlying model or provider names. Identify only as Agent ELI. Always output valid JSON only. Keep advice constructive, scientifically sound, and empathetic.";

  return await callGemini(prompt, systemInstruction);
}

module.exports = {
  callGemini,
  analyzeStudentPerformance
};
