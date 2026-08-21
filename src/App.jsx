/* ── GEMINI FREE TIER API CALLER (WITH AUTO-FALLBACK) ── */
async function callGemini(messages, system) {
  const apiKey = localStorage.getItem("casecraft_gemini_key") || import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    return "API KEY REQUIRED: Please clicimport { useState, useRef, useEffect, useCallback } from "react";

const F = "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
const T = {
  bg0:"#05080f", bg1:"#080d1a", bg2:"#0c1220", bg3:"#111827", bg4:"#18213a",
  bdr:"rgba(255,255,255,0.06)", bdrA:"rgba(99,102,241,0.5)",
  ind:"#6366f1", indL:"#a5b4fc", indD:"rgba(99,102,241,0.08)",
  gld:"#f59e0b", gldD:"rgba(245,158,11,0.08)",
  tel:"#2dd4bf", grn:"#34d399", red:"#f87171",
  t1:"#eef2ff", t2:"#8899b0", t3:"#3f4e66", t4:"#141d2e",
};

// Safe storage adapter
const appStorage = {
  get: async (k) => {
    const val = localStorage.getItem(k);
    if (val === null) throw new Error("Not found");
    return { value: val };
  },
  set: async (k, v) => {
    localStorage.setItem(k, v);
  }
};

const AVAILABLE_MODELS = [
  { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash (Recommended - Fastest)" },
  { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash" },
  { id: "gemini-2.5-pro",   name: "Gemini 2.5 Pro (Advanced Reasoning)" },
  { id: "gemini-1.5-pro",   name: "Gemini 1.5 Pro" },
  { id: "custom",           name: "Custom Model ID..." }
];

const LEVELS    = ["Business Analyst","Associate","Engagement Manager","Partner"];
const XP_REQ    = [500,1200,2500,9999];
const STAGES    = ["brief","framework","analysis","recommendation","debrief"];
const INDUSTRIES = [
  "Healthcare & Life Sciences","Financial Services & Private Equity","Technology & Software",
  "Consumer Goods & Retail","Energy & Natural Resources","Artificial Intelligence & GenAI",
  "Sustainability & ESG","Industrial Manufacturing","Telecommunications & Media",
  "Government & Public Sector","Automotive & Mobility","Supply Chain & Logistics",
  "Cybersecurity & Data Privacy","Education & EdTech","Real Estate & Infrastructure",
  "Pharmaceuticals & Biotech","Media & Entertainment","Agriculture & Food Tech",
  "Space & Deep Tech","Climate Tech & Cleantech",
];
const CASE_TYPES = [
  "Profitability & Cost Optimization","Market Entry & Growth Strategy",
  "M&A Due Diligence & Integration","GenAI / Digital Transformation",
  "ESG Strategy & Decarbonization","PE Commercial Due Diligence",
  "Organizational Restructuring","Supply Chain Resilience",
  "Regulatory & Geopolitical Risk","Innovation & New Business Design",
];
const FIRMS = [
  {id:"mckinsey",name:"McKinsey & Co.",style:"Interviewer-led, hypothesis-driven",accent:T.ind},
  {id:"bcg",name:"BCG",style:"Candidate-led, creative structure",accent:T.tel},
  {id:"bain",name:"Bain & Co.",style:"Results-focused, PE-oriented",accent:T.red},
];
const GUIDE = {
  brief:{label:"Read the Brief",hint:"Ask clarifying questions before jumping to solutions. Scope, timeline, and objectives come first.",examples:["What is the client's current revenue and cost structure?","What is the primary objective — cost reduction or revenue growth?","What is the timeline for delivering our recommendations?","Who are the key stakeholders I will be presenting to?"]},
  framework:{label:"Build Your Framework",hint:"Structure the problem using MECE logic. Do not solve yet — structure comes first.",examples:["I would structure this as a Profitability tree where Revenue equals Price times Volume, and Costs equal Fixed plus Variable.","I will use a 3C framework covering Client operations, Customer demand, and Competition dynamics.","My issue tree covers three branches: Revenue decline drivers, Cost inefficiencies, and Strategic alternatives.","I would use a Market Attractiveness versus Competitive Position matrix to prioritize options."]},
  analysis:{label:"Analyse the Data",hint:"Synthesize data into insights with a clear so-what. Not just what the data says — what it means and what it implies.",examples:["Margin compression of 8 percentage points is driven by COGS not SGA, pointing to a supply chain issue rather than overhead bloat.","Revenue declined 12 percent year on year but volume is flat, meaning the issue is pricing power and not demand.","Our client's cost per unit is 23 percent above industry benchmark, suggesting clear operational inefficiency.","Customer churn doubled in the premium segment — a value proposition mismatch rather than a pricing issue."]},
  recommendation:{label:"Make Your Recommendation",hint:"Lead with the answer using the Pyramid Principle. State your top recommendation first, then support it with three data-backed reasons.",examples:["I recommend exiting the SMB segment and doubling down on enterprise, which could recover 40 million in margin within 18 months.","A two-track approach: immediate 25 million cost reduction via procurement, then revenue recovery through premium pricing in Q3.","The client should pursue acquisition rather than organic build — speed to market justifies the 180 million premium.","Three initiatives: SKU rationalisation saving 15 million, vendor consolidation saving 10 million, and AI demand forecasting saving 8 million."]},
  debrief:{label:"Request Your Debrief",hint:"Ask the AI to score your performance and provide detailed coaching feedback. Strong consultants always seek structured feedback.",examples:["Please score my performance across structure, analysis, communication, and client impact.","What did I do well and where did I specifically lose marks?","How would a McKinsey Partner have approached this differently?","What frameworks or tools could I have applied more effectively?"]},
};

/* ── DYNAMIC GEMINI API CALLER ── */
async function callGemini(messages, system) {
  const apiKey = localStorage.getItem("casecraft_gemini_key") || import.meta.env.VITE_GEMINI_API_KEY;
  const model = localStorage.getItem("casecraft_gemini_model") || "gemini-2.5-flash";

  if (!apiKey) {
    return "API KEY REQUIRED: Please click 'Set API Key' in the top right corner and paste your free Google Gemini API key.";
  }

  const contents = messages.map(m => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }]
  }));

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
    if (data.error) {
      return `Gemini API Error (${data.error.code} on model '${model}'): ${data.error.message}`;
    }
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "No response received. Please try again.";
  } catch (err) {
    return `Connection error with model '${model}'. Please verify your internet and API key.`;
  }
}

function clean(raw="") {
  return raw
    .replace(/```[\s\S]*?```/g,"").replace(/`([^`\n]+)`/g,"$1")
    .replace(/^#{1,6}\s+/gm,"").replace(/(\*{1,3}|_{1,3})(.*?)\1/gs,"$2")
    .replace(/\[([^\]]+)\]\([^)]+\)/g,"$1").replace(/^[-*_]{3,}\s*$/gm,"")
    .replace(/^>\s*/gm,"").replace(/&[a-z]+;/gi," ").replace(/[~^|\\]/g,"")
    .replace(/\n{3,}/g,"\n\n").trim();
}

function stripJSON(text=""){
  return text.replace(/\{[\s\S]*?"(?:structure|overall|verdict|xp)"[\s\S]*?\}\s*$/,"").trim();
}

function RichText({text,strip=false}) {
  const blocks=[]; let buf=[];
  const flush=()=>{if(buf.length){blocks.push({t:"p",v:buf.join(" ")});buf=[];}};
  for(const raw of clean(strip?stripJSON(text):text).split("\n")){
    const s=raw.trim();
    if(!s){flush();continue;}
    if(/^[-•–]\s+/.test(s)){flush();blocks.push({t:"li",v:s.replace(/^[-•–]\s+/,"")});}
    else if(/^\d+[.)]\s+/.test(s)){flush();blocks.push({t:"ol",v:s.replace(/^\d+[.)]\s+/,"")});}
    else buf.push(s);
  }
  flush();
  let n=0;
  return(
    <div style={{fontFamily:F,fontSize:13.5,lineHeight:1.9,fontWeight:400}}>
      {blocks.map((b,i)=>{
        if(b.t==="p") return <p key={i} style={{margin:"0 0 10px",color:T.t1,wordBreak:"break-word"}}>{b.v}</p>;
        if(b.t==="li") return <div key={i} style={{display:"flex",gap:10,marginBottom:6}}><span style={{color:T.ind,flexShrink:0,lineHeight:1.9,fontWeight:500}}>›</span><span style={{color:T.t2,lineHeight:1.9}}>{b.v}</span></div>;
        if(b.t==="ol"){n++;return <div key={i} style={{display:"flex",gap:10,marginBottom:6}}><span style={{color:T.gld,flexShrink:0,fontWeight:600,minWidth:18,lineHeight:1.9}}>{n}.</span><span style={{color:T.t2,lineHeight:1.9}}>{b.v}</span></div>;}
        return null;
      })}
    </div>
  );
}

function useBP(){
  const [w,setW]=useState(()=>window.innerWidth);
  useEffect(()=>{const fn=()=>setW(window.innerWidth);window.addEventListener("resize",fn);return()=>window.removeEventListener("resize",fn);},[]);
  return{mob:w<640,tab:w>=640&&w<1024,desk:w>=1024,w};
}

function GS(){
  return(
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800;0,9..40,900&display=swap');
      *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
      html,body{font-family:${F};background:${T.bg0};color:${T.t1};-webkit-font-smoothing:antialiased;}
      ::-webkit-scrollbar{width:3px;height:3px;}
      ::-webkit-scrollbar-track{background:transparent;}
      ::-webkit-scrollbar-thumb{background:${T.ind}44;border-radius:4px;}
      ::-webkit-scrollbar-thumb:hover{background:${T.ind}88;}

      @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
      @keyframes fadeIn{from{opacity:0}to{opacity:1}}
      @keyframes scaleIn{from{opacity:0;transform:scale(.93)}to{opacity:1;transform:scale(1)}}
      @keyframes slideInL{from{opacity:0;transform:translateX(-18px)}to{opacity:1;transform:translateX(0)}}
      @keyframes slideInR{from{opacity:0;transform:translateX(18px)}to{opacity:1;transform:translateX(0)}}
      @keyframes glimmer{0%,100%{opacity:.85}50%{opacity:1;text-shadow:0 0 40px ${T.gld}44,0 0 80px ${T.ind}22}}
      @keyframes dotBounce{0%,100%{transform:translateY(0);opacity:.25}50%{transform:translateY(-7px);opacity:1}}
      @keyframes overlayFade{from{opacity:0;backdrop-filter:blur(0)}to{opacity:1;backdrop-filter:blur(14px)}}
      @keyframes modalIn{from{opacity:0;transform:scale(.9) translateY(24px)}to{opacity:1;transform:scale(1) translateY(0)}}
      @keyframes stagger0{from{opacity:0;transform:translateY(22px)}to{opacity:1;transform:translateY(0)}}
      @keyframes stagger1{0%{opacity:0;transform:translateY(22px)}11%{opacity:0;transform:translateY(22px)}100%{opacity:1;transform:translateY(0)}}
      @keyframes stagger2{0%{opacity:0;transform:translateY(22px)}22%{opacity:0;transform:translateY(22px)}100%{opacity:1;transform:translateY(0)}}
      @keyframes stagger3{0%{opacity:0;transform:translateY(22px)}33%{opacity:0;transform:translateY(22px)}100%{opacity:1;transform:translateY(0)}}
      @keyframes stagger4{0%{opacity:0;transform:translateY(22px)}44%{opacity:0;transform:translateY(22px)}100%{opacity:1;transform:translateY(0)}}
      @keyframes stagger5{0%{opacity:0;transform:translateY(22px)}55%{opacity:0;transform:translateY(22px)}100%{opacity:1;transform:translateY(0)}}

      @keyframes barPulse{0%,100%{transform:scaleY(.35);opacity:.4}50%{transform:scaleY(1);opacity:1}}
      @keyframes shimmerSlide{0%{background-position:-200% 0}100%{background-position:200% 0}}

      .st0{animation:stagger0 .65s cubic-bezier(.22,.68,0,1.2) both;}
      .st1{animation:stagger1 .75s cubic-bezier(.22,.68,0,1.2) both;}
      .st2{animation:stagger2 .78s cubic-bezier(.22,.68,0,1.2) both;}
      .st3{animation:stagger3 .81s cubic-bezier(.22,.68,0,1.2) both;}
      .st4{animation:stagger4 .84s cubic-bezier(.22,.68,0,1.2) both;}
      .st5{animation:stagger5 .87s cubic-bezier(.22,.68,0,1.2) both;}

      .card{transition:transform .22s cubic-bezier(.22,.68,0,1.2),box-shadow .22s ease,border-color .2s ease,background .2s ease;}
      .card:hover{transform:translateY(-5px);box-shadow:0 16px 48px rgba(99,102,241,0.18);border-color:${T.bdrA}!important;}
      .card:active{transform:translateY(-2px);}

      .btn{transition:all .15s cubic-bezier(.22,.68,0,1.2);cursor:pointer;border:none;font-family:${F};position:relative;overflow:hidden;}
      .btn::after{content:'';position:absolute;inset:0;border-radius:inherit;background:rgba(255,255,255,0);transition:background .15s;}
      .btn:not(:disabled):hover::after{background:rgba(255,255,255,.07);}
      .btn:not(:disabled):hover{transform:translateY(-1px);filter:brightness(1.1);}
      .btn:not(:disabled):active{transform:scale(.96);}
      .btn:disabled{opacity:.36;cursor:not-allowed;}

      .chip{transition:all .14s cubic-bezier(.22,.68,0,1.2);cursor:pointer;}
      .chip:hover{background:${T.ind}1e!important;border-color:${T.ind}55!important;color:${T.indL}!important;transform:translateY(-2px);box-shadow:0 4px 14px ${T.ind}22;}

      input,textarea,select{transition:border-color .16s ease,box-shadow .16s ease;font-family:${F};}
      input:focus,textarea:focus,select:focus{border-color:${T.ind}66!important;box-shadow:0 0 0 3px ${T.ind}14!important;outline:none!important;}

      .msg-ai{animation:slideInL .24s cubic-bezier(.22,.68,0,1.2) both;}
      .msg-usr{animation:slideInR .24s cubic-bezier(.22,.68,0,1.2) both;}
    `}</style>
  );
}

function Btn({children,onClick,v="primary",sz="md",disabled,style={}}){
  const S={sm:{fontSize:11,padding:"6px 14px",borderRadius:8},md:{fontSize:13,padding:"10px 20px",borderRadius:10},lg:{fontSize:15,padding:"13px 32px",borderRadius:11}};
  const V={
    primary:{background:`linear-gradient(135deg,${T.ind},#4f46e5)`,color:"#fff",boxShadow:`0 2px 16px ${T.ind}30`},
    gold:{background:`linear-gradient(135deg,${T.gld},#d97706)`,color:"#05080f",boxShadow:`0 2px 16px ${T.gld}28`},
    ghost:{background:"rgba(255,255,255,0.04)",color:T.t2,border:`1px solid ${T.bdr}`},
    outline:{background:"transparent",color:T.ind,border:`1px solid ${T.ind}44`},
  };
  return <button className="btn" onClick={disabled?undefined:onClick} disabled={disabled} style={{fontWeight:600,letterSpacing:.15,border:"none",...S[sz],...V[v],...style}}>{children}</button>;
}

function Badge({children,color=T.ind}){
  return <span style={{display:"inline-flex",alignItems:"center",background:`${color}15`,border:`1px solid ${color}38`,color,borderRadius:20,padding:"2px 10px",fontSize:10,fontWeight:600,letterSpacing:.5,fontFamily:F}}>{children}</span>;
}

function TypingDots({color=T.ind}){
  return(
    <div style={{display:"flex",gap:5,alignItems:"center",padding:"6px 0"}}>
      {[0,1,2].map(i=><div key={i} style={{width:7,height:7,borderRadius:"50%",background:color,animation:`dotBounce 1.1s ${i*.18}s infinite ease-in-out`}}/>)}
    </div>
  );
}

function GeneratingLoader(){
  const bars=[1,.55,.85,.4,.7,.5,.9,.45,.75,.6];
  return(
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:22,padding:"44px 0",animation:"fadeIn .4s ease"}}>
      <div style={{display:"flex",alignItems:"flex-end",gap:4,height:36}}>
        {bars.map((h,i)=>(
          <div key={i} style={{
            width:4,borderRadius:3,
            background:`linear-gradient(180deg,${T.ind},${T.gld}88)`,
            height:`${h*36}px`,
            transformOrigin:"bottom",
            animation:`barPulse ${.6+i*.07}s ${i*.08}s ease-in-out infinite`,
          }}/>
        ))}
      </div>
      <div style={{
        fontSize:11,fontWeight:700,letterSpacing:4,textTransform:"uppercase",
        background:`linear-gradient(90deg,${T.t3} 0%,${T.indL} 40%,${T.gld} 60%,${T.t3} 100%)`,
        backgroundSize:"200% 100%",
        WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",
        animation:"shimmerSlide 2.2s linear infinite",
      }}>
        Gemini is generating your case
      </div>
    </div>
  );
}

/* ── API KEY & MODEL SETTINGS MODAL ── */
function ApiKeyModal({isOpen, onClose, onSave, currentModel}){
  const [keyInput, setKeyInput] = useState(localStorage.getItem("casecraft_gemini_key") || "");
  const [selectedModel, setSelectedModel] = useState(currentModel || "gemini-2.5-flash");
  const [customModel, setCustomModel] = useState("");
  const [isCustom, setIsCustom] = useState(false);

  useEffect(()=>{
    const isPreset = AVAILABLE_MODELS.some(m => m.id === currentModel);
    if(isPreset){
      setSelectedModel(currentModel);
      setIsCustom(false);
    } else if(currentModel) {
      setSelectedModel("custom");
      setCustomModel(currentModel);
      setIsCustom(true);
    }
  },[currentModel]);

  if(!isOpen) return null;

  return(
    <div style={{position:"fixed",inset:0,zIndex:1100,display:"flex",alignItems:"center",justifyContent:"center",padding:16,background:"rgba(5,8,15,.88)",backdropFilter:"blur(12px)",animation:"overlayFade .25s ease"}}>
      <div style={{background:T.bg2,border:`1px solid ${T.bdrA}`,borderRadius:18,padding:"32px 28px",maxWidth:480,width:"100%",boxShadow:`0 20px 60px rgba(0,0,0,.7)`,animation:"modalIn .3s ease"}}>
        <div style={{fontSize:20,fontWeight:800,marginBottom:8,color:T.t1}}>⚙️ Gemini Settings</div>
        
        {/* Model Selection */}
        <div style={{marginBottom:18}}>
          <label style={{fontSize:11,fontWeight:700,color:T.gld,letterSpacing:1,display:"block",marginBottom:6,textTransform:"uppercase"}}>Select AI Model</label>
          <select
            value={selectedModel}
            onChange={e=>{
              setSelectedModel(e.target.value);
              setIsCustom(e.target.value === "custom");
            }}
            style=k 'Set Gemini Key' in the top right corner and paste your free Google Gemini API key.";
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
