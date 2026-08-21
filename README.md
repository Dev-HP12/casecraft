# 🏛️ Casecraft — MBB Consulting Simulator

[![Built with React](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Powered by Gemini](https://img.shields.io/badge/AI-Google%20Gemini%20Free%20Tier-4285F4?logo=googlegemini&logoColor=white)](https://aistudio.google.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Casecraft** is an interactive, hyper-realistic MBB (McKinsey, BCG, Bain) case interview and management consulting simulator. Role-play through complex business problems, structure issue trees using MECE logic, test hypotheses against exhibits, deliver pyramid-principle recommendations, and receive structured coaching evaluations.

Powered by **Google Gemini Free Tier API** with a client-side **Bring Your Own Key (BYOK)** architecture.

---

## ✨ Features

- 🎓 **Tutorial Mode**: Step-by-step guided case on profitability with helpful prompts and consulting structure suggestions.
- 📈 **Career Mode**: Work your way from *Business Analyst* to *Associate*, *Engagement Manager*, and *Partner* through MBB-style up-or-out performance milestones.
- 🗂️ **Case Sandbox**: Over 200+ procedural case combinations spanning 20+ industries (GenAI, Healthcare, Private Equity, Climate Tech, SaaS, etc.) and 10+ engagement types.
- 🎯 **Interview Gauntlet**: Practice firm-specific interview styles:
  - **McKinsey & Co.** — Interviewer-led, hypothesis-driven issue trees.
  - **BCG** — Candidate-led, creative frameworks.
  - **Bain & Co.** — Results-focused, PE/commercial due diligence style.
- 🤖 **Specialist Labs**: Real-world scenarios for **GenAI / Digital Transformation** and **ESG & Decarbonization Roadmap Design**.
- 📊 **Dynamic Debrief & Scoring**: Get scored out of 10 on *Structure*, *Analysis*, *Communication*, and *Client Impact*, with custom XP rewards and badge unlocks.

---

## 🔑 Free API Key Setup (For Participants)

Casecraft runs on the **Google Gemini Free Tier**. No credit card is required.

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Sign in with your Google account and click **"Create API key"**.
3. Copy your API key (`AIzaSy...`).
4. In Casecraft, click **"🔑 Set Gemini Key"** in the top navigation bar and paste your key.
5. Your key is stored securely in your browser's `localStorage` and is never sent to any intermediary server.

---

## 🚀 Quickstart (Run Locally)

### Prerequisites
- [Node.js](https://nodejs.org/) (version 18+ recommended)
- Git (optional)

### 1. Clone the repository
```bash
git clone https://github.com/YOUR_USERNAME/casecraft.git
cd casecraft
