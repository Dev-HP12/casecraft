/* ── GEMINI FREE TIER API CALLER (WITH AUTO-FALLBACK) ── */
async function callGemini(messages, system) {
  const apiKey = localStorage.getItem("casecraft_gemini_key") || import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    return "API KEY REQUIRED: Please click 'Set Gemini Key' in the top right corner and paste your free Google Gemini API key.";
  }

  // Convert chat roles to Gemini schema: user -> user, assistant -> model
  const contents = messages.map(m => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }]
  }));

  // Supported modern Gemini models with automatic fallback
  const modelsToTry = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-flash-latest"];

  for (const model of modelsToTry) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: system }]
          },
          contents: contents,
          generationConfig: {
            maxOutputTokens: 1000,
            temperature: 0.7
          }
        })
      });

      const data = await response.json();

      // If model not found (404), continue to next model in the list
      if (data.error && data.error.code === 404) {
        continue;
      }

      if (data.error) {
        return `Gemini API Error (${data.error.code}): ${data.error.message}`;
      }

      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (reply) return reply;
    } catch (err) {
      // Network or fetch failure, continue fallback
    }
  }

  return "Unable to connect to Gemini. Please verify that your API key from Google AI Studio is active.";
}
