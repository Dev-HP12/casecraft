import { useState, useRef, useEffect, useCallback } from "react";

const F = "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
const T = {
  bg0:"#05080f", bg1:"#080d1a", bg2:"#0c1220", bg3:"#111827", bg4:"#18213a",
  bdr:"rgba(255,255,255,0.06)", bdrA:"rgba(99,102,241,0.5)",
  ind:"#6366f1", indL:"#a5b4fc", indD:"rgba(99,102,241,0.08)",
  gld:"#f59e0b", gldD:"rgba(245,158,11,0.08)",
  tel:"#2dd4bf", grn:"#34d399", red:"#f87171",
  t1:"#eef2ff", t2:"#8899b0", t3:"#3f4e66", t4:"#141d2e",
};

// Safe storage adapter replacing artifact window.storage
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

/* ── GEMINI FREE TIER API CALLER ── */
async function callGemini(messages, system) {
  const apiKey = localStorage.getItem("casecraft_gemini_key") || import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    return "API KEY REQUIRED: Please click 'Set API Key' in the top right corner and paste your free Google Gemini API key.";
  }

  // Convert chat roles to Gemini schema: user -> user, assistant -> model
  const contents = messages.map(m => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }]
  }));

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
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
      return `Gemini API Error (${data.error.code}): ${data.error.message}`;
    }
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "No response received. Please try again.";
  } catch (err) {
    return "Connection error. Please verify your internet connection and Gemini API key.";
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

      input,textarea{transition:border-color .16s ease,box-shadow .16s ease;font-family:${F};}
      input:focus,textarea:focus{border-color:${T.ind}66!important;box-shadow:0 0 0 3px ${T.ind}14!important;outline:none!important;}

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

/* ── API KEY MODAL (FOR PARTICIPANTS) ── */
function ApiKeyModal({isOpen, onClose, onSave}){
  const [keyInput, setKeyInput] = useState(localStorage.getItem("casecraft_gemini_key") || "");
  if(!isOpen) return null;

  return(
    <div style={{position:"fixed",inset:0,zIndex:1100,display:"flex",alignItems:"center",justifyContent:"center",padding:16,background:"rgba(5,8,15,.88)",backdropFilter:"blur(12px)",animation:"overlayFade .25s ease"}}>
      <div style={{background:T.bg2,border:`1px solid ${T.bdrA}`,borderRadius:18,padding:"32px 28px",maxWidth:480,width:"100%",boxShadow:`0 20px 60px rgba(0,0,0,.7)`,animation:"modalIn .3s ease"}}>
        <div style={{fontSize:20,fontWeight:800,marginBottom:8,color:T.t1}}>🔑 Gemini Free API Key</div>
        <div style={{fontSize:13,color:T.t2,lineHeight:1.7,marginBottom:20}}>
          Get a free API key from Google AI Studio. Free tier keys have plenty of rate limit for standard case sessions.
        </div>
        <div style={{marginBottom:18}}>
          <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" style={{color:T.indL,fontSize:12,textDecoration:"underline",fontWeight:600}}>
            → Click here to get your free key from Google AI Studio
          </a>
        </div>
        <input 
          type="password" 
          value={keyInput} 
          onChange={e=>setKeyInput(e.target.value)} 
          placeholder="Paste AIzaSy..." 
          style={{width:"100%",background:T.bg3,border:`1px solid ${T.bdr}`,borderRadius:10,padding:"12px 14px",color:T.t1,fontSize:13,marginBottom:24}}
        />
        <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
          <Btn v="ghost" onClick={onClose}>Cancel</Btn>
          <Btn v="gold" onClick={()=>{ onSave(keyInput.trim()); onClose(); }}>Save Key</Btn>
        </div>
      </div>
    </div>
  );
}

function Tutorial({onDone}){
  const [step,setStep]=useState(0);
  const [key,setKey]=useState(0);
  const bp=useBP();
  const steps=[
    {icon:"🎯",title:"Welcome to Casecraft",body:"Role-play as a consultant at McKinsey, BCG, or Bain. The AI acts as your client, interviewer, and coach — powered by Google Gemini."},
    {icon:"💬",title:"How to interact with the AI",body:"Type your response in the chat input at the bottom and press Send or hit Enter. The AI responds like a real client — pushing back on vague logic, questioning numbers, and rewarding clear structured thinking."},
    {icon:"💡",title:"Use suggestion chips",body:"Every stage shows clickable example responses. Tap any chip to fill the input instantly with a professional consultant answer."},
    {icon:"🗂",title:"Follow the five stages",body:"Each case moves through Brief, Framework, Analysis, Recommendation, and Debrief. Advance when you are ready."},
    {icon:"📊",title:"Get scored and level up",body:"At the Debrief stage, Casecraft scores you on Structure, Analysis, Communication, and Client Impact to earn promotions."},
  ];
  function go(n){setKey(k=>k+1);setStep(n);}
  const s=steps[step];
  return(
    <div style={{position:"fixed",inset:0,zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:bp.mob?12:24,background:"rgba(5,8,15,.92)",backdropFilter:"blur(16px)",animation:"overlayFade .35s ease"}}>
      <div style={{background:T.bg2,border:`1px solid ${T.bdrA}`,borderRadius:22,padding:bp.mob?"28px 22px":"48px 44px",maxWidth:500,width:"100%",textAlign:"center",boxShadow:`0 0 100px ${T.ind}18,0 40px 80px rgba(0,0,0,.7)`,animation:"modalIn .42s cubic-bezier(.22,.68,0,1.2)"}}>
        <div key={`icon-${step}`} style={{fontSize:bp.mob?44:54,marginBottom:16,animation:"scaleIn .3s ease",display:"block"}}>{s.icon}</div>
        <div style={{fontSize:9,color:T.ind,fontWeight:700,letterSpacing:3,marginBottom:10,textTransform:"uppercase"}}>Casecraft · Step {step+1} of {steps.length}</div>
        <div key={`title-${key}`} style={{fontSize:bp.mob?19:23,fontWeight:800,color:T.t1,marginBottom:10,letterSpacing:"-.4px",lineHeight:1.18,animation:"fadeUp .28s ease"}}>{s.title}</div>
        <div key={`body-${key}`} style={{fontSize:bp.mob?13:14,color:T.t2,lineHeight:1.9,marginBottom:32,fontWeight:400,animation:"fadeUp .32s .04s ease both"}}>{s.body}</div>
        <div style={{display:"flex",gap:5,justifyContent:"center",marginBottom:28}}>
          {steps.map((_,i)=><div key={i} onClick={()=>go(i)} style={{height:4,cursor:"pointer",borderRadius:3,width:i===step?26:7,background:i===step?T.ind:T.t4,transition:"all .28s cubic-bezier(.22,.68,0,1.2)"}}/>)}
        </div>
        <div style={{display:"flex",gap:10,justifyContent:"center"}}>
          {step>0&&<Btn v="ghost" onClick={()=>go(step-1)}>Back</Btn>}
          {step<steps.length-1?<Btn v="primary" onClick={()=>go(step+1)}>Next</Btn>:<Btn v="gold" sz="lg" onClick={onDone}>Start Playing</Btn>}
        </div>
      </div>
    </div>
  );
}

function Home({setScreen,player,showTut,setShowTut,openApiKeyModal,hasKey}){
  const bp=useBP();
  const lvl=Math.min(player.level,3);
  const pct=Math.min((player.xp/XP_REQ[lvl])*100,100);
  const grid=bp.mob?"1fr":bp.tab?"1fr 1fr":"repeat(3,1fr)";
  const modes=[
    {id:"tutorial_case",icon:"🎓",title:"Start Tutorial Case",desc:"Guided walkthrough with hints and example responses. The best place to start.",hi:true,st:"st0"},
    {id:"career",icon:"📈",title:"Career Mode",desc:"Climb from Business Analyst to Partner through the MBB up-or-out system.",hi:false,st:"st1"},
    {id:"sandbox",icon:"🗂",title:"Case Sandbox",desc:"Pick any industry and case type across 200+ unique engagements.",hi:false,st:"st2"},
    {id:"interview",icon:"🎯",title:"Interview Gauntlet",desc:"McKinsey, BCG, and Bain interviews each with their own distinct AI persona.",hi:false,st:"st3"},
    {id:"ai_lab",icon:"🤖",title:"AI Transformation Lab",desc:"Build GenAI ROI cases, redesign operating models, and run AI due diligence.",hi:false,st:"st4"},
    {id:"esg",icon:"🌱",title:"ESG and Sustainability",desc:"Sustainability strategy tied to M&A, market entry, and top-line growth.",hi:false,st:"st5"},
  ];
  return(
    <div style={{minHeight:"100vh",fontFamily:F,color:T.t1,background:`radial-gradient(ellipse 60% 45% at 15% 12%,${T.ind}08 0%,transparent 55%),radial-gradient(ellipse 50% 40% at 85% 88%,${T.gld}05 0%,transparent 55%),${T.bg0}`}}>
      <GS/>
      {showTut&&<Tutorial onDone={()=>setShowTut(false)}/>}
      <nav style={{position:"sticky",top:0,zIndex:50,padding:bp.mob?"12px 16px":"14px 44px",borderBottom:`1px solid ${T.bdr}`,backdropFilter:"blur(20px)",background:"rgba(5,8,15,.76)",display:"flex",justifyContent:"space-between",alignItems:"center",gap:12}}>
        <div>
          <div style={{fontSize:bp.mob?18:22,fontWeight:900,letterSpacing:"-.3px",background:`linear-gradient(105deg,${T.gld} 10%,${T.indL} 90%)`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>Casecraft</div>
          {!bp.mob&&<div style={{fontSize:9,color:T.t3,letterSpacing:3.5,marginTop:2,fontWeight:500}}>MBB CONSULTING SIMULATOR</div>}
        </div>
        <div style={{display:"flex",gap:10,alignItems:"center"}}>
          <Btn v={hasKey?"ghost":"gold"} sz="sm" onClick={openApiKeyModal}>
            {hasKey ? "🔑 Key Active" : "⚠️ Set Gemini Key"}
          </Btn>
          <Btn v="ghost" onClick={()=>setShowTut(true)} sz="sm">How to Play</Btn>
          <div style={{background:T.bg2,border:`1px solid ${T.bdr}`,borderRadius:10,padding:bp.mob?"7px 12px":"8px 16px"}}>
            <div style={{fontSize:11,color:T.gld,fontWeight:700}}>{LEVELS[lvl]}</div>
            {!bp.mob&&<div style={{fontSize:9,color:T.t3,marginTop:1}}>{player.xp} XP · {player.badges.length} badges</div>}
            <div style={{width:bp.mob?76:110,height:2.5,background:T.t4,borderRadius:2,marginTop:5}}>
              <div style={{width:`${pct}%`,height:"100%",borderRadius:2,transition:"width .7s ease",background:`linear-gradient(90deg,${T.ind},${T.gld})`}}/>
            </div>
          </div>
        </div>
      </nav>
      <div style={{textAlign:"center",padding:bp.mob?"44px 16px 32px":"72px 44px 52px",animation:"fadeUp .55s ease"}}>
        <Badge color={T.ind}>Gemini-Powered Simulation Engine</Badge>
        <div style={{fontSize:bp.mob?36:bp.tab?50:68,fontWeight:900,lineHeight:1.04,margin:"18px 0 18px",letterSpacing:"-1.8px"}}>
          Think Like a<br/>
          <span style={{background:`linear-gradient(115deg,${T.gld} 15%,${T.indL} 85%)`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",animation:"glimmer 4s ease infinite"}}>Top Consultant</span>
        </div>
        <p style={{fontSize:bp.mob?13:15,color:T.t2,maxWidth:500,margin:"0 auto",lineHeight:1.9,fontWeight:400}}>
          Real MBB scenarios. AI-powered clients. Genuine career progression.{!bp.mob&&<><br/>Train the way McKinsey, BCG, and Bain consultants structure solutions.</>}
        </p>
      </div>
      <div style={{display:"grid",gridTemplateColumns:grid,gap:bp.mob?12:16,padding:bp.mob?"0 16px 60px":"0 44px 88px",maxWidth:1110,margin:"0 auto"}}>
        {modes.map(m=>(
          <div key={m.id} className={`card ${m.st}`} onClick={()=>setScreen(m.id)}
            style={{background:m.hi?`linear-gradient(140deg,${T.ind}10,${T.gld}06)`:T.bg2,border:`1px solid ${m.hi?T.ind+"44":T.bdr}`,borderRadius:16,padding:bp.mob?"16px":"26px",cursor:"pointer",position:"relative",boxShadow:m.hi?`0 4px 32px ${T.ind}14`:"none"}}>
            {m.hi&&<div style={{position:"absolute",top:-11,right:16,background:`linear-gradient(90deg,${T.ind},#4f46e5)`,color:"#fff",fontSize:8,fontWeight:700,padding:"3px 13px",borderRadius:20,letterSpacing:1.2,boxShadow:`0 2px 12px ${T.ind}50`}}>START HERE</div>}
            <div style={{fontSize:bp.mob?28:34,marginBottom:12,lineHeight:1}}>{m.icon}</div>
            <div style={{fontSize:bp.mob?13:15,fontWeight:700,marginBottom:7,letterSpacing:"-.2px",color:m.hi?T.gld:T.t1}}>{m.title}</div>
            <div style={{fontSize:bp.mob?11:12,color:T.t2,lineHeight:1.72,fontWeight:400}}>{m.desc}</div>
            <div style={{marginTop:18,fontSize:12,color:T.ind,fontWeight:600}}>Enter →</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CaseScreen({setScreen,config,player,setPlayer,isTutorial}){
  const bp=useBP();
  const [stage,setStage]=useState("brief");
  const [msgs,setMsgs]=useState([]);
  const [input,setInput]=useState("");
  const [loading,setLoad]=useState(false);
  const [initMsg,setInit]=useState("");
  const [score,setScore]=useState(null);
  const [side,setSide]=useState(true);
  const bottom=useRef(null);
  const si=STAGES.indexOf(stage);
  const ind=config?.industry||"Consumer Goods & Retail";
  const ct=config?.caseType||"Profitability & Cost Optimization";

  const buildSys=useCallback((st)=>
    `You are a hyper-realistic MBB consulting simulation AI on the Casecraft platform, running a ${ct} case in ${ind}.
Player level: ${LEVELS[Math.min(player.level,3)]}. Current stage: ${st}.
Stage duties — brief: Detailed client brief with real dollar-million figures and a clear problem statement. End by asking what clarifying questions the player has. framework: Evaluate structure. Ask probing MECE follow-up questions. Correct weak logic firmly and kindly. analysis: Present exactly two data exhibits with specific numbers. Ask the player what the key insight is. recommendation: Act as a skeptical CFO pushing back with hard questions. Demand quantified impact. debrief: Give specific coaching feedback then output ONLY this JSON at the very end: {"structure":N,"analysis":N,"communication":N,"clientImpact":N,"xp":N,"badges":["badge name"]}
${isTutorial?"TUTORIAL MODE: Be warm, encouraging, and educational. Use a simple coffee chain losing profitability.":""}
CRITICAL: Never use markdown. No asterisks, hash symbols, backticks, or underscores. Plain paragraphs only. Use a dash for bullet points.`,
  [ct,ind,player.level,isTutorial]);

  useEffect(()=>{
    (async()=>{
      setLoad(true);
      const prompt=isTutorial?"Start the tutorial. Use a simple coffee chain losing profitability. Present the brief warmly. End by asking what clarifying questions the player has.":"Start the case. Present the client brief.";
      setInit(await callGemini([{role:"user",content:prompt}],buildSys("brief")));
      setLoad(false);
    })();
  },[]);

  useEffect(()=>{bottom.current?.scrollIntoView({behavior:"smooth"});},[msgs,loading,initMsg]);

  async function send(txt){
    const msg=txt||input; if(!msg.trim()||loading) return;
    const u={role:"user",content:msg};
    const full=[...msgs,u]; setMsgs(full); setInput(""); setLoad(true);
    const hist=[{role:"user",content:"Start."},{role:"assistant",content:initMsg},...full];
    const reply=await callGemini(hist,buildSys(stage));
    setMsgs([...full,{role:"assistant",content:reply}]); setLoad(false);
    try{
      const m=reply.match(/\{[\s\S]*?"structure"\s*:\s*\d[\s\S]*?\}/);
      if(m){const sc=JSON.parse(m[0]);setScore(sc);setPlayer(p=>{const nx=p.xp+(sc.xp||120);let nl=p.level;while(nl<3&&nx>=XP_REQ[nl])nl++;return{...p,xp:nx,level:nl,badges:[...new Set([...p.badges,...(sc.badges||[])])]}});}}
    catch(_){}
  }

  const g=GUIDE[stage];
  const showSide=side&&!bp.mob;

  return(
    <div style={{height:"100vh",display:"flex",flexDirection:"column",background:T.bg0,fontFamily:F}}>
      <GS/>
      <div style={{flexShrink:0,padding:bp.mob?"9px 14px":"10px 22px",background:"rgba(5,8,15,.9)",backdropFilter:"blur(20px)",borderBottom:`1px solid ${T.bdr}`,display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,flexWrap:"wrap"}}>
        <Btn v="ghost" sz="sm" onClick={()=>setScreen("home")}>Home</Btn>
        <div style={{display:"flex",gap:4,flexWrap:"wrap",justifyContent:"center"}}>
          {STAGES.map((s,i)=>(
            <div key={s} className={i<=si?"chip":""} onClick={()=>i<=si&&setStage(s)}
              style={{padding:"4px 12px",borderRadius:20,fontSize:10,fontWeight:600,letterSpacing:.3,cursor:i<=si?"pointer":"default",
                background:i===si?`${T.ind}22`:i<si?`${T.grn}12`:"rgba(255,255,255,.03)",
                color:i===si?T.ind:i<si?T.grn:T.t3,
                border:`1px solid ${i===si?T.ind+"55":i<si?T.grn+"33":"transparent"}`}}>
              {i<si?"✓ ":""}{s.charAt(0).toUpperCase()+s.slice(1)}
            </div>
          ))}
        </div>
        {!bp.mob&&<div style={{fontSize:10,color:T.t3,textAlign:"right",lineHeight:1.6}}><span style={{color:T.t2,fontWeight:500}}>{ind}</span><br/><span>{ct}</span></div>}
      </div>

      <div style={{flex:1,display:"flex",overflow:"hidden"}}>
        {!bp.mob&&(
          <div style={{width:showSide?260:36,flexShrink:0,background:T.bg1,borderRight:`1px solid ${T.bdr}`,transition:"width .26s cubic-bezier(.22,.68,0,1.2)",overflow:"hidden",display:"flex",flexDirection:"column"}}>
            <button onClick={()=>setSide(v=>!v)} style={{flexShrink:0,height:38,background:"transparent",border:"none",borderBottom:`1px solid ${T.bdr}`,color:T.t3,fontSize:11,cursor:"pointer",fontFamily:F,display:"flex",alignItems:"center",justifyContent:"center",transition:"color .15s,background .15s"}} onMouseEnter={e=>{e.currentTarget.style.color=T.t1;e.currentTarget.style.background="rgba(255,255,255,.03)";}} onMouseLeave={e=>{e.currentTarget.style.color=T.t3;e.currentTarget.style.background="transparent";}}>
              {showSide?"← Hide":"→"}
            </button>
            {showSide&&(
              <div style={{flex:1,overflowY:"auto",padding:18}}>
                <div style={{marginBottom:20}}>
                  <div style={{fontSize:11,fontWeight:700,color:T.gld,marginBottom:7,letterSpacing:.3}}>{g.label}</div>
                  <div style={{fontSize:12,color:T.t2,lineHeight:1.8,fontWeight:400}}>{g.hint}</div>
                </div>
                <div style={{fontSize:9,fontWeight:700,color:T.t3,letterSpacing:1.5,marginBottom:12}}>PROGRESS</div>
                {STAGES.map((s,i)=>(
                  <div key={s} style={{display:"flex",alignItems:"center",gap:9,marginBottom:10,opacity:i>si+1?.2:1,transition:"opacity .25s"}}>
                    <div style={{width:22,height:22,borderRadius:7,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700,background:i<si?T.grn:i===si?T.ind:"transparent",border:`1.5px solid ${i<si?T.grn:i===si?T.ind:T.t4}`,color:i<=si?"#fff":T.t4,transition:"all .25s ease",boxShadow:i===si?`0 0 16px ${T.ind}55`:"none"}}>
                      {i<si?"✓":i+1}
                    </div>
                    <span style={{fontSize:11.5,color:i===si?T.t1:T.t3,fontWeight:i===si?600:400}}>{s.charAt(0).toUpperCase()+s.slice(1)}</span>
                  </div>
                ))}
                {si<STAGES.length-1&&<Btn v="primary" onClick={()=>setStage(STAGES[si+1])} style={{marginTop:20,width:"100%",fontSize:11,padding:"9px 0"}}>Advance to {STAGES[si+1].charAt(0).toUpperCase()+STAGES[si+1].slice(1)} →</Btn>}
                {score&&(
                  <div style={{marginTop:22,background:T.bg2,border:`1px solid ${T.bdr}`,borderRadius:13,padding:16,animation:"scaleIn .35s cubic-bezier(.22,.68,0,1.2)"}}>
                    <div style={{fontSize:9,fontWeight:700,color:T.gld,letterSpacing:1.5,marginBottom:14}}>PERFORMANCE</div>
                    {["structure","analysis","communication","clientImpact"].map(k=>(
                      <div key={k} style={{marginBottom:11}}>
                        <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                          <span style={{fontSize:10.5,color:T.t2}}>{k==="clientImpact"?"Client Impact":k.charAt(0).toUpperCase()+k.slice(1)}</span>
                          <span style={{fontSize:11,fontWeight:700,color:score[k]>=7?T.grn:score[k]>=5?T.gld:T.red}}>{score[k]}/10</span>
                        </div>
                        <div style={{height:3,background:T.t4,borderRadius:2}}>
                          <div style={{width:`${score[k]*10}%`,height:"100%",borderRadius:2,transition:"width 1s cubic-bezier(.22,.68,0,1.2) .2s",background:score[k]>=7?T.grn:score[k]>=5?T.gld:T.red}}/>
                        </div>
                      </div>
                    ))}
                    <div style={{borderTop:`1px solid ${T.bdr}`,marginTop:12,paddingTop:12,textAlign:"center",color:T.gld,fontWeight:800,fontSize:16}}>+{score.xp||120} XP</div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",background:`radial-gradient(ellipse at 80% 5%,${T.ind}03 0%,transparent 45%),${T.bg0}`}}>
          <div style={{flex:1,overflowY:"auto",padding:bp.mob?"14px 14px":"22px 30px"}}>
            {loading&&!initMsg&&<GeneratingLoader/>}
            {initMsg&&(
              <div style={{background:`linear-gradient(135deg,${T.gld}07,${T.ind}05)`,border:`1px solid ${T.gld}22`,borderRadius:16,padding:bp.mob?"15px":"24px",marginBottom:22,animation:"fadeUp .45s ease"}}>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12,flexWrap:"wrap"}}>
                  <Badge color={T.gld}>{isTutorial?"Tutorial — Client Brief":"Client Brief"}</Badge>
                  {isTutorial&&<span style={{fontSize:10,color:T.t3}}>Read carefully, then ask clarifying questions below</span>}
                </div>
                <RichText text={initMsg}/>
              </div>
            )}
            {msgs.map((m,i)=>(
              <div key={i} className={m.role==="user"?"msg-usr":"msg-ai"} style={{marginBottom:18,display:"flex",gap:10,alignItems:"flex-start",justifyContent:m.role==="user"?"flex-end":"flex-start"}}>
                {m.role==="assistant"&&<div style={{width:28,height:28,borderRadius:8,flexShrink:0,marginTop:2,background:`linear-gradient(135deg,${T.ind},${T.tel})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700,color:"#fff"}}>AI</div>}
                <div style={{maxWidth:bp.mob?"88%":"76%",padding:"12px 17px",borderRadius:m.role==="user"?"16px 16px 4px 16px":"4px 16px 16px 16px",background:m.role==="user"?`${T.ind}1c`:T.bg2,border:`1px solid ${m.role==="user"?T.ind+"28":T.bdr}`}}>
                  {m.role==="assistant"&&<div style={{fontSize:9,color:T.ind,fontWeight:700,marginBottom:7,letterSpacing:1.5}}>CASECRAFT AI</div>}
                  <RichText text={m.content} strip={m.role==="assistant"}/>
                </div>
                {m.role==="user"&&<div style={{width:28,height:28,borderRadius:8,flexShrink:0,marginTop:2,background:`linear-gradient(135deg,${T.gld},#d97706)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700,color:T.bg0}}>YOU</div>}
              </div>
            ))}
            {loading&&initMsg&&<div style={{paddingLeft:bp.mob?0:38}}><TypingDots/></div>}
            <div ref={bottom}/>
          </div>

          {initMsg&&!loading&&(
            <div style={{padding:bp.mob?"8px 14px 4px":"10px 30px 6px",borderTop:`1px solid ${T.bdr}`}}>
              <div style={{fontSize:9,color:T.t3,letterSpacing:1.5,marginBottom:8,fontWeight:600}}>SUGGESTED RESPONSES — CLICK TO USE</div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {g.examples.map((ex,i)=>(
                  <div key={i} className="chip" onClick={()=>setInput(ex)} style={{background:`${T.ind}0a`,border:`1px solid ${T.ind}20`,color:T.t2,padding:"6px 13px",borderRadius:20,fontSize:11,lineHeight:1.4,fontWeight:400}}>
                    {ex.length>72?ex.slice(0,70)+"…":ex}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{flexShrink:0,padding:bp.mob?"8px 14px 14px":"12px 30px 18px"}}>
            {bp.mob&&si<STAGES.length-1&&<Btn v="outline" onClick={()=>setStage(STAGES[si+1])} style={{marginBottom:8,fontSize:11,padding:"7px 14px",width:"100%"}}>Advance to {STAGES[si+1].charAt(0).toUpperCase()+STAGES[si+1].slice(1)} →</Btn>}
            <div style={{display:"flex",gap:8,alignItems:"flex-end"}}>
              <textarea value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();}}}
                placeholder="Type your response… Enter to send, Shift+Enter for a new line" rows={2}
                style={{flex:1,background:T.bg2,border:`1px solid ${T.bdr}`,borderRadius:11,padding:"11px 15px",color:T.t1,fontSize:13.5,resize:"none",lineHeight:1.68}}/>
              <Btn v="primary" onClick={()=>send()} disabled={loading||!input.trim()} style={{flexShrink:0,padding:"14px 24px",borderRadius:11}}>Send</Btn>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Sandbox({setScreen,setGameConfig}){
  const bp=useBP();
  const [ind,setInd]=useState(null);
  const [ct,setCT]=useState(null);
  return(
    <div style={{minHeight:"100vh",background:T.bg0,fontFamily:F,color:T.t1,padding:bp.mob?"18px 16px":"30px 44px"}}>
      <GS/>
      <Btn v="ghost" sz="sm" onClick={()=>setScreen("home")} style={{marginBottom:26}}>Home</Btn>
      <div style={{animation:"fadeUp .45s ease",marginBottom:30}}>
        <div style={{fontSize:bp.mob?22:30,fontWeight:800,letterSpacing:"-.5px",marginBottom:6}}>Case Sandbox</div>
        <div style={{fontSize:13.5,color:T.t2,fontWeight:400}}>Pick an industry and case type — Casecraft generates a unique engagement every time.</div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:bp.mob||bp.tab?"1fr":"1fr 1fr",gap:bp.mob?22:36,maxWidth:1000}}>
        {[{label:"INDUSTRY",items:INDUSTRIES,val:ind,set:setInd},{label:"CASE TYPE",items:CASE_TYPES,val:ct,set:setCT}].map(col=>(
          <div key={col.label}>
            <div style={{fontSize:9,fontWeight:700,color:T.t3,letterSpacing:2,marginBottom:10}}>{col.label}</div>
            <div style={{display:"flex",flexDirection:"column",gap:4,maxHeight:bp.mob?220:520,overflowY:"auto",paddingRight:4}}>
              {col.items.map(item=>(
                <div key={item} className="card" onClick={()=>col.set(item)} style={{padding:"10px 14px",borderRadius:8,cursor:"pointer",fontSize:12.5,fontWeight:400,border:`1px solid ${col.val===item?T.ind+"55":T.bdr}`,background:col.val===item?`${T.ind}0e`:T.bg2,color:col.val===item?T.indL:T.t2,lineHeight:1.5}}>
                  {item}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      {ind&&ct&&<div style={{marginTop:32,animation:"fadeUp .28s ease"}}><Btn v="gold" sz="lg" onClick={()=>{setGameConfig({industry:ind,caseType:ct});setScreen("case");}}>Start Engagement →</Btn></div>}
    </div>
  );
}

function Interview({setScreen}){
  const bp=useBP();
  const [firm,setFirm]=useState(null);
  const [msgs,setMsgs]=useState([]);
  const [input,setInput]=useState("");
  const [loading,setLoad]=useState(false);
  const [started,setStart]=useState(false);
  const bottom=useRef(null);
  useEffect(()=>{bottom.current?.scrollIntoView({behavior:"smooth"});},[msgs]);
  const makeSys=f=>`You are a ${f.name} case interviewer on the Casecraft platform. Style: ${f.style}. Conduct a full realistic MBB case interview. End with verdict JSON: {"overall":N,"structure":N,"math":N,"communication":N,"verdict":"Hire/Maybe/No Hire"}. CRITICAL FORMATTING: No markdown. Plain paragraphs only.`;
  async function start(){setStart(true);setLoad(true);const r=await callGemini([{role:"user",content:"Begin. Introduce yourself and present the case."}],makeSys(firm));setMsgs([{role:"assistant",content:r}]);setLoad(false);}
  async function send(){if(!input.trim()||loading)return;const u={role:"user",content:input};const nxt=[...msgs,u];setMsgs(nxt);setInput("");setLoad(true);const r=await callGemini(nxt,makeSys(firm));setMsgs([...nxt,{role:"assistant",content:r}]);setLoad(false);}
  return(
    <div style={{height:"100vh",display:"flex",flexDirection:"column",background:T.bg0,fontFamily:F,color:T.t1}}>
      <GS/>
      <div style={{flexShrink:0,padding:bp.mob?"9px 14px":"11px 26px",background:"rgba(5,8,15,.9)",backdropFilter:"blur(20px)",borderBottom:`1px solid ${T.bdr}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <Btn v="ghost" sz="sm" onClick={()=>setScreen("home")}>Home</Btn>
        <div style={{fontSize:14,fontWeight:700,letterSpacing:"-.2px"}}>Interview Gauntlet</div>
        <div style={{width:80}}/>
      </div>
      {!started?(
        <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:bp.mob?"22px 16px":"44px",animation:"fadeUp .4s ease"}}>
          <div style={{fontSize:bp.mob?20:26,fontWeight:800,letterSpacing:"-.4px",marginBottom:8}}>Choose Your Firm</div>
          <div style={{fontSize:13.5,color:T.t2,marginBottom:36,fontWeight:400,textAlign:"center"}}>Each firm has a distinct interview style and evaluation criteria</div>
          <div style={{display:"flex",gap:14,flexWrap:"wrap",justifyContent:"center"}}>
            {FIRMS.map(f=>(
              <div key={f.id} className="card" onClick={()=>setFirm(f)} style={{width:bp.mob?160:215,padding:bp.mob?"16px":"24px",borderRadius:16,cursor:"pointer",border:`2px solid ${firm?.id===f.id?f.accent:T.bdr}`,background:firm?.id===f.id?`${f.accent}0d`:T.bg2,boxShadow:firm?.id===f.id?`0 4px 28px ${f.accent}22`:"none"}}>
                <div style={{fontSize:bp.mob?14:17,fontWeight:800,color:f.accent,marginBottom:7,letterSpacing:"-.2px"}}>{f.name}</div>
                <div style={{fontSize:bp.mob?10:11.5,color:T.t2,lineHeight:1.7,fontWeight:400}}>{f.style}</div>
              </div>
            ))}
          </div>
          {firm&&<Btn v="primary" sz="lg" onClick={start} style={{marginTop:30,animation:"fadeUp .25s ease"}}>Begin {firm.name} Interview →</Btn>}
        </div>
      ):(
        <>
          <div style={{flex:1,overflowY:"auto",padding:bp.mob?"14px":"22px 32px",maxWidth:870,width:"100%",margin:"0 auto",boxSizing:"border-box"}}>
            {msgs.map((m,i)=>(
              <div key={i} className={m.role==="user"?"msg-usr":"msg-ai"} style={{marginBottom:18,display:"flex",gap:10,alignItems:"flex-start",justifyContent:m.role==="user"?"flex-end":"flex-start"}}>
                {m.role==="assistant"&&<div style={{width:28,height:28,borderRadius:8,flexShrink:0,marginTop:2,background:firm?.accent,display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,fontWeight:700,color:"#fff"}}>INT</div>}
                <div style={{maxWidth:bp.mob?"88%":"76%",padding:"12px 17px",borderRadius:m.role==="user"?"16px 16px 4px 16px":"4px 16px 16px 16px",background:m.role==="user"?`${T.ind}1c`:T.bg2,border:`1px solid ${m.role==="user"?T.ind+"28":`${firm?.accent}22`}`}}>
                  {m.role==="assistant"&&<div style={{fontSize:9,color:firm?.accent,fontWeight:700,marginBottom:7,letterSpacing:1.5}}>{firm?.name?.toUpperCase()}</div>}
                  <RichText text={m.content} strip={m.role==="assistant"}/>
                </div>
                {m.role==="user"&&<div style={{width:28,height:28,borderRadius:8,flexShrink:0,marginTop:2,background:`linear-gradient(135deg,${T.gld},#d97706)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700,color:T.bg0}}>YOU</div>}
              </div>
            ))}
            {loading&&<TypingDots color={firm?.accent||T.ind}/>}
            <div ref={bottom}/>
          </div>
          <div style={{flexShrink:0,padding:bp.mob?"8px 14px 14px":"12px 32px 18px",borderTop:`1px solid ${T.bdr}`,backdropFilter:"blur(12px)"}}>
            <div style={{maxWidth:870,margin:"0 auto",display:"flex",gap:8}}>
              <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()} placeholder="Respond to the interviewer…" style={{flex:1,background:T.bg2,border:`1px solid ${T.bdr}`,borderRadius:10,padding:"12px 16px",color:T.t1,fontSize:13.5}}/>
              <Btn v="primary" onClick={send} disabled={loading} style={{borderRadius:10,padding:"12px 24px"}}>Send</Btn>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Specialist({setScreen,isESG}){
  const bp=useBP();
  const [scenario,setScenario]=useState(null);
  const [msgs,setMsgs]=useState([]);
  const [input,setInput]=useState("");
  const [loading,setLoad]=useState(false);
  const bottom=useRef(null);
  useEffect(()=>{bottom.current?.scrollIntoView({behavior:"smooth"});},[msgs]);
  const accent=isESG?T.grn:T.ind;
  const scenarios=isESG?[
    {title:"Net-Zero Roadmap",desc:"Build a decarbonisation path for a global steel producer.",prompt:"A global steel producer needs a net-zero by 2040 roadmap. Present the challenge with real capex and emissions data. Guide me through building it."},
    {title:"ESG M&A Screening",desc:"Embed ESG criteria into a PE firm's deal screening process.",prompt:"A mid-market PE firm wants to embed ESG into deal screening and value creation. Present the engagement."},
    {title:"Green Market Entry",desc:"Strategic options for a traditional OEM entering cleantech.",prompt:"A traditional automotive OEM wants to enter the cleantech and EV market. Present the market entry case with real market sizing."},
  ]:[
    {title:"GenAI Business Case",desc:"Build a 50 million dollar GenAI ROI case for a global bank.",prompt:"Present a GenAI transformation opportunity at a top-10 global bank. Include real dollar-million figures, specific use cases, and risk factors."},
    {title:"AI Operating Model",desc:"Redesign a global insurer's operations around intelligent automation.",prompt:"A global insurer wants to redesign their operating model around AI and automation. Present the transformation challenge."},
    {title:"AI Due Diligence",desc:"Assess a 400 million dollar AI startup for a PE fund.",prompt:"A PE fund is considering a 400 million dollar AI startup acquisition. Run an AI-focused commercial due diligence."},
  ];
  const sys=`You are an MBB ${isESG?"ESG":"AI transformation"} specialist on the Casecraft platform. Scenario: ${scenario?.prompt||""}. Use real-world data and MBB-level frameworks. Be demanding and educational. CRITICAL FORMATTING: No markdown. Plain paragraphs only. Use a dash for bullet points.`;
  async function start(sc){setScenario(sc);setLoad(true);const r=await callGemini([{role:"user",content:"Begin the scenario clearly."}],`You are an MBB specialist on Casecraft. Scenario: ${sc.prompt}. Use real-world data. Be demanding. No markdown formatting.`);setMsgs([{role:"assistant",content:r}]);setLoad(false);}
  async function send(){if(!input.trim()||loading)return;const u={role:"user",content:input};const nxt=[...msgs,u];setMsgs(nxt);setInput("");setLoad(true);const r=await callGemini(nxt,sys);setMsgs([...nxt,{role:"assistant",content:r}]);setLoad(false);}
  return(
    <div style={{height:"100vh",display:"flex",flexDirection:"column",background:T.bg0,fontFamily:F,color:T.t1}}>
      <GS/>
      <div style={{flexShrink:0,padding:bp.mob?"9px 14px":"11px 26px",background:"rgba(5,8,15,.9)",backdropFilter:"blur(20px)",borderBottom:`1px solid ${T.bdr}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <Btn v="ghost" sz="sm" onClick={()=>setScreen("home")}>Home</Btn>
        <div style={{fontSize:14,fontWeight:700,color:accent,letterSpacing:"-.2px"}}>{isESG?"ESG and Sustainability Suite":"AI Transformation Lab"}</div>
        <div style={{width:80}}/>
      </div>
      {!scenario?(
        <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:bp.mob?"22px 16px":"44px",animation:"fadeUp .4s ease"}}>
          <div style={{fontSize:bp.mob?20:26,fontWeight:800,letterSpacing:"-.4px",marginBottom:8}}>Select a Scenario</div>
          <div style={{fontSize:13.5,color:T.t2,marginBottom:34,fontWeight:400}}>Cases MBBs are actively running in industry</div>
          <div style={{display:"flex",gap:14,flexWrap:"wrap",justifyContent:"center",maxWidth:760}}>
            {scenarios.map((sc,i)=>(
              <div key={i} className="card" onClick={()=>start(sc)} style={{width:bp.mob?"100%":230,maxWidth:245,padding:bp.mob?"16px":"24px",borderRadius:16,cursor:"pointer",border:`1px solid ${accent}28`,background:`${accent}06`}}>
                <div style={{fontSize:bp.mob?13:15,fontWeight:700,color:accent,marginBottom:8,letterSpacing:"-.2px"}}>{sc.title}</div>
                <div style={{fontSize:11.5,color:T.t2,lineHeight:1.72,fontWeight:400}}>{sc.desc}</div>
              </div>
            ))}
          </div>
        </div>
      ):(
        <>
          <div style={{flex:1,overflowY:"auto",padding:bp.mob?"14px":"22px 32px",maxWidth:870,width:"100%",margin:"0 auto",boxSizing:"border-box"}}>
            {loading&&!msgs.length&&<GeneratingLoader/>}
            {msgs.map((m,i)=>(
              <div key={i} className={m.role==="user"?"msg-usr":"msg-ai"} style={{marginBottom:18,display:"flex",gap:10,alignItems:"flex-start",justifyContent:m.role==="user"?"flex-end":"flex-start"}}>
                {m.role==="assistant"&&<div style={{width:28,height:28,borderRadius:8,flexShrink:0,marginTop:2,background:isESG?`linear-gradient(135deg,${T.grn},#059669)`:`linear-gradient(135deg,${T.ind},${T.tel})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,fontWeight:700,color:"#fff"}}>{isESG?"ESG":"AI"}</div>}
                <div style={{maxWidth:bp.mob?"88%":"76%",padding:"12px 17px",borderRadius:m.role==="user"?"16px 16px 4px 16px":"4px 16px 16px 16px",background:m.role==="user"?`${T.ind}1c`:T.bg2,border:`1px solid ${m.role==="user"?T.ind+"28":`${accent}22`}`}}>
                  {m.role==="assistant"&&<div style={{fontSize:9,color:accent,fontWeight:700,marginBottom:7,letterSpacing:1.5}}>SPECIALIST COACH</div>}
                  <RichText text={m.content} strip={m.role==="assistant"}/>
                </div>
                {m.role==="user"&&<div style={{width:28,height:28,borderRadius:8,flexShrink:0,marginTop:2,background:`linear-gradient(135deg,${T.gld},#d97706)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700,color:T.bg0}}>YOU</div>}
              </div>
            ))}
            {loading&&msgs.length>0&&<TypingDots color={accent}/>}
            <div ref={bottom}/>
          </div>
          <div style={{flexShrink:0,padding:bp.mob?"8px 14px 14px":"12px 32px 18px",borderTop:`1px solid ${T.bdr}`}}>
            <div style={{maxWidth:870,margin:"0 auto",display:"flex",gap:8}}>
              <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()} placeholder="Enter your analysis or recommendation…" style={{flex:1,background:T.bg2,border:`1px solid ${T.bdr}`,borderRadius:10,padding:"12px 16px",color:T.t1,fontSize:13.5}}/>
              <Btn v="primary" onClick={send} disabled={loading} style={{borderRadius:10,padding:"12px 24px",background:`linear-gradient(135deg,${accent},${isESG?"#059669":"#4f46e5"})`,boxShadow:`0 2px 16px ${accent}30`}}>Send</Btn>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Career({setScreen,player,setGameConfig}){
  const bp=useBP();
  const lvl=Math.min(player.level,3);
  const pct=Math.min((player.xp/XP_REQ[lvl])*100,100);
  const cols=bp.mob?"1fr":bp.tab?"repeat(2,1fr)":"repeat(3,1fr)";
  const milestones=[
    {title:"Business Analyst",color:T.grn,tasks:["Profitability basics","Framework structuring","Slide building"]},
    {title:"Associate",color:T.tel,tasks:["Market entry","Client communication","Managing up"]},
    {title:"Engagement Manager",color:T.gld,tasks:["Project management","Team leadership","PE due diligence"]},
    {title:"Partner",color:T.ind,tasks:["Business development","Firm strategy","C-suite advisory"]},
  ];
  const diffs=["Beginner","Intermediate","Advanced","Expert"];
  const dcols=[T.grn,T.tel,T.gld,T.red];
  const items=INDUSTRIES.map((ind,i)=>({industry:ind,caseType:CASE_TYPES[i%CASE_TYPES.length],diff:diffs[Math.min(Math.floor(i/5),3)],color:dcols[Math.min(Math.floor(i/5),3)]}));
  return(
    <div style={{minHeight:"100vh",background:T.bg0,fontFamily:F,color:T.t1,padding:bp.mob?"18px 16px":"30px 44px"}}>
      <GS/>
      <Btn v="ghost" sz="sm" onClick={()=>setScreen("home")} style={{marginBottom:28}}>Home</Btn>
      <div style={{display:"grid",gridTemplateColumns:bp.mob?"1fr":"1fr 1fr",gap:14,marginBottom:30}}>
        <div style={{background:`linear-gradient(135deg,${T.gld}07,${T.ind}06)`,border:`1px solid ${T.bdr}`,borderRadius:14,padding:bp.mob?"16px":"24px",animation:"fadeUp .4s ease"}}>
          <div style={{fontSize:9,color:T.t3,letterSpacing:2,marginBottom:4,fontWeight:600}}>CURRENT TITLE</div>
          <div style={{fontSize:bp.mob?22:30,fontWeight:900,color:T.gld,letterSpacing:"-.6px",lineHeight:1}}>{LEVELS[lvl]}</div>
          <div style={{fontSize:11.5,color:T.t3,marginTop:6,fontWeight:400}}>{player.xp} XP earned · {player.badges.length} badges</div>
          <div style={{marginTop:12,height:4,background:T.t4,borderRadius:2}}>
            <div style={{width:`${pct}%`,height:"100%",background:`linear-gradient(90deg,${T.ind},${T.gld})`,borderRadius:2,transition:"width .8s cubic-bezier(.22,.68,0,1.2)",boxShadow:`0 0 10px ${T.ind}44`}}/>
          </div>
          <div style={{fontSize:9,color:T.t3,marginTop:5,fontWeight:400}}>{player.xp} / {XP_REQ[lvl]} XP to {LEVELS[Math.min(lvl+1,3)]}</div>
        </div>
        <div style={{background:T.bg2,border:`1px solid ${T.bdr}`,borderRadius:14,padding:bp.mob?"16px":"24px",animation:"fadeUp .5s ease"}}>
          <div style={{fontSize:9,color:T.t3,letterSpacing:2,marginBottom:10,fontWeight:600}}>BADGES EARNED</div>
          {player.badges.length===0?<div style={{fontSize:12,color:T.t3,fontWeight:400}}>Complete cases to earn your first badge</div>:<div style={{display:"flex",flexWrap:"wrap",gap:6}}>{player.badges.map((b,i)=><Badge key={i} color={T.gld}>{b}</Badge>)}</div>}
        </div>
      </div>
      <div style={{fontSize:9,fontWeight:700,color:T.t3,letterSpacing:2,marginBottom:12}}>CAREER TRACK</div>
      <div style={{display:"flex",gap:8,marginBottom:32,overflowX:"auto",paddingBottom:6}}>
        {milestones.map((m,i)=>(
          <div key={i} style={{flex:"0 0 auto",minWidth:bp.mob?130:155,padding:"13px 15px",borderRadius:11,background:i<=lvl?`${m.color}09`:T.bg2,border:`1px solid ${i===lvl?m.color:i<lvl?m.color+"44":T.bdr}`,opacity:i>lvl+1?.25:1,transition:"all .25s ease"}}>
            <div style={{fontSize:10,fontWeight:700,color:i<=lvl?m.color:T.t3,marginBottom:8}}>{m.title}</div>
            {m.tasks.map((t,j)=><div key={j} style={{fontSize:10,color:i<lvl?T.grn:T.t3,marginBottom:4,lineHeight:1.5,fontWeight:400}}>{i<lvl?"✓ ":"› "}{t}</div>)}
          </div>
        ))}
      </div>
      <div style={{fontSize:9,fontWeight:700,color:T.t3,letterSpacing:2,marginBottom:14}}>AVAILABLE ENGAGEMENTS</div>
      <div style={{display:"grid",gridTemplateColumns:cols,gap:12}}>
        {items.slice(0,6+lvl*4).map((e,i)=>(
          <div key={i} className={`card st${Math.min(i%6,5)}`} onClick={()=>{setGameConfig({industry:e.industry,caseType:e.caseType});setScreen("case");}} style={{padding:bp.mob?"13px":"18px",borderRadius:12,background:T.bg2,border:`1px solid ${T.bdr}`,cursor:"pointer"}}>
            <Badge color={e.color}>{e.diff}</Badge>
            <div style={{fontSize:bp.mob?12:13.5,fontWeight:600,marginTop:10,marginBottom:3,letterSpacing:"-.2px",color:T.t1}}>{e.industry}</div>
            <div style={{fontSize:bp.mob?10:11.5,color:T.t2,fontWeight:400,lineHeight:1.4}}>{e.caseType}</div>
            <div style={{marginTop:12,fontSize:11.5,color:T.ind,fontWeight:600}}>Take Engagement →</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function App(){
  const [screen,setScreen]=useState("home");
  const [player,setPlayer]=useState({level:0,xp:0,badges:[]});
  const [gameConfig,setGameConfig]=useState(null);
  const [showTut,setShowTut]=useState(false);
  const [storageReady,setStorageReady]=useState(false);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [hasKey, setHasKey] = useState(false);

  useEffect(()=>{
    (async()=>{
      try{
        const pd=await appStorage.get("casecraft:player");
        if(pd) setPlayer(JSON.parse(pd.value));
      }catch(_){}
      try{
        await appStorage.get("casecraft:tutorialSeen");
      }catch(_){
        setShowTut(true);
      }
      
      const existingKey = localStorage.getItem("casecraft_gemini_key") || import.meta.env.VITE_GEMINI_API_KEY;
      if(existingKey) {
        setHasKey(true);
      } else {
        setShowKeyModal(true);
      }

      setStorageReady(true);
    })();
  },[]);

  useEffect(()=>{
    if(!storageReady) return;
    appStorage.set("casecraft:player",JSON.stringify(player)).catch(()=>{});
  },[player,storageReady]);

  function dismissTutorial(){
    setShowTut(false);
    appStorage.set("casecraft:tutorialSeen","1").catch(()=>{});
  }

  function handleSaveKey(key) {
    if(key) {
      localStorage.setItem("casecraft_gemini_key", key);
      setHasKey(true);
    } else {
      localStorage.removeItem("casecraft_gemini_key");
      setHasKey(false);
    }
  }

  return (
    <>
      <ApiKeyModal 
        isOpen={showKeyModal} 
        onClose={()=>setShowKeyModal(false)} 
        onSave={handleSaveKey} 
      />
      {screen==="tutorial_case" && <CaseScreen setScreen={setScreen} config={{industry:"Consumer Goods & Retail",caseType:"Profitability & Cost Optimization"}} player={player} setPlayer={setPlayer} isTutorial={true}/>}
      {screen==="career"        && <Career     setScreen={setScreen} player={player} setGameConfig={setGameConfig}/>}
      {screen==="sandbox"       && <Sandbox    setScreen={setScreen} setGameConfig={setGameConfig}/>}
      {screen==="interview"     && <Interview  setScreen={setScreen}/>}
      {screen==="case"          && <CaseScreen setScreen={setScreen} config={gameConfig} player={player} setPlayer={setPlayer} isTutorial={false}/>}
      {screen==="ai_lab"        && <Specialist setScreen={setScreen} isESG={false}/>}
      {screen==="esg"           && <Specialist setScreen={setScreen} isESG={true}/>}
      {screen==="home"          && <Home setScreen={setScreen} player={player} showTut={showTut} setShowTut={(v)=>{ if(v) setShowTut(true); else dismissTutorial(); }} openApiKeyModal={()=>setShowKeyModal(true)} hasKey={hasKey}/>}
    </>
  );
}