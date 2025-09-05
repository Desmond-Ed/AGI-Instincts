// --- Data ---------------------------------------------------------------
const DEFAULT_QUESTIONS = [
  {
    q: "Which role levels are considered senior and require manual review?",
    options: ["Levels 1–3", "Levels 2–4", "Levels 4–6", "Only Level 6"],
    a: 2,
    expl: "Levels 4–6 are the senior tiers (often mapped to Early/Advanced/Sentient AGI).",
  },
  {
    q: "What does the GRID primarily represent in the community context?",
    options: [
      "A partner and contributor network",
      "A GPU cluster",
      "A governance council",
      "An NFT marketplace",
    ],
    a: 0,
    expl: "GRID refers to an expanding network of partners and contributors.",
  },
  {
    q: "What’s the typical reward mechanic for weekly Quests?",
    options: [
      "Only vanity roles",
      "XP/points and recognition",
      "On‑chain airdrops only",
      "Hardware giveaways",
    ],
    a: 1,
    expl: "Quests commonly grant XP/points and shout‑outs; on‑chain perks may occur in campaigns.",
  },
  {
    q: "Which channel helps you discover tasks to level up?",
    options: ["#roles-hub", "#price-talk", "#off-topic", "#spam"],
    a: 0,
    expl: "#roles-hub curates tasks/briefs for each role path.",
  },
  {
    q: "What boosts scoring in this quiz besides being correct?",
    options: [
      "Answering last",
      "Streak of correct answers",
      "Wrong answers",
      "Closing the tab",
    ],
    a: 1,
    expl: "Maintain a streak to get a tiny momentum bonus.",
  },
  {
    q: "A builder contributes what most directly?",
    options: [
      "Memes only",
      "Prototypes, tools, and bots",
      "Only moderation",
      "Nothing; they just watch",
    ],
    a: 1,
    expl: "Builders ship useful prototypes, integrations, or automations.",
  },
  {
    q: "Educators help the community by…",
    options: [
      "Writing guides and explainers",
      "Keeping secrets",
      "Only running paid courses",
      "Silencing feedback",
    ],
    a: 0,
    expl: "They publish explainers, tutorials, and run workshops.",
  },
  {
    q: "Which best describes ‘Sentient AGI’ as a role tier name?",
    options: [
      "An on‑chain token",
      "The top community recognition tier",
      "A hardware device",
      "A legal entity",
    ],
    a: 1,
    expl: "It’s the highest recognition tier in the role system.",
  },
  {
    q: "If you’re short on time during the quiz, what should you use?",
    options: [
      "Skip button",
      "Refresh page",
      "Inspect element",
      "Turn off device",
    ],
    a: 0,
    expl: "Skip strategically to maximize correct answers in time.",
  },
  {
    q: "Where are your best scores stored in this game?",
    options: [
      "Public server",
      "LocalStorage in your browser",
      "On‑chain",
      "Email",
    ],
    a: 1,
    expl: "All data stays local to your browser by default.",
  },
];

// --- State --------------------------------------------------------------
let QUESTIONS =
  JSON.parse(localStorage.getItem("sentient-quiz-questions") || "null") ||
  DEFAULT_QUESTIONS;
let idx = 0;
let score = 0;
let streak = 0;
let started = false;
let seconds = 90;
let timer = null;
let answers = [];

// --- Elements -----------------------------------------------------------
const byId = (id) => document.getElementById(id);
const qTotal = byId("qTotal");
const qIndex = byId("qIndex");
const qtext = byId("qtext");
const answersEl = byId("answers");
const bar = byId("bar");
const timeEl = byId("time");
const quizEl = byId("quiz");
const introEl = byId("intro");
const resultsEl = byId("results");
const reviewEl = byId("review");

// --- Helpers ------------------------------------------------------------
const fmtDate = (d) => new Date(d).toLocaleString();
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

function renderLeaderboard() {
  const tbody = document.querySelector("#leaderboard tbody");
  tbody.innerHTML = "";
  const lb = JSON.parse(localStorage.getItem("sentient-quiz-lb") || "[]");
  lb.sort((a, b) => b.score - a.score || a.time - b.time);
  lb.slice(0, 10).forEach((row, i) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${i + 1}</td><td>${row.name || "Anon"}</td><td>${
      row.score
    }</td><td>${row.time}s</td><td>${fmtDate(row.date)}</td>`;
    tbody.appendChild(tr);
  });
  const best = lb[0]?.score || 0;
  byId("kpi-best").textContent = best;
}

function setProgress() {
  const pct = (idx / QUESTIONS.length) * 100;
  bar.style.width = pct + "%";
  qIndex.textContent = Math.min(idx + 1, QUESTIONS.length);
}

function renderQuestion() {
  const q = QUESTIONS[idx];
  qtext.textContent = q.q;
  answersEl.innerHTML = "";
  q.options.forEach((opt, i) => {
    const btn = document.createElement("button");
    btn.className = "answer";
    btn.innerHTML = `<strong>${String.fromCharCode(65 + i)}.</strong> ${opt}`;
    btn.setAttribute("aria-pressed", "false");
    btn.onclick = () => selectAnswer(i);
    answersEl.appendChild(btn);
  });
  setProgress();
  document.getElementById("prev").disabled = idx === 0;
}

function selectAnswer(i) {
  const q = QUESTIONS[idx];
  const correct = i === q.a;
  answers[idx] = { pick: i, correct, expl: q.expl };
  if (correct) {
    streak++;
    const bonus = Math.min(streak - 1, 3); // small streak bonus max +3
    score += 10 + bonus;
  } else {
    streak = 0;
  }
  // mark UI
  [...answersEl.children].forEach((el, j) => {
    el.classList.toggle("correct", j === q.a);
    el.classList.toggle("wrong", j === i && j !== q.a);
    el.disabled = true;
  });
}

function nextQ() {
  if (idx < QUESTIONS.length - 1) {
    idx++;
    renderQuestion();
  } else {
    endGame();
  }
}
function prevQ() {
  if (idx > 0) {
    idx--;
    renderQuestion();
  }
}

function startGame() {
  started = true;
  score = 0;
  streak = 0;
  idx = 0;
  seconds = 90;
  answers = [];
  introEl.hidden = true;
  resultsEl.hidden = true;
  quizEl.hidden = false;
  renderQuestion();
  timeEl.textContent = seconds;
  byId("kpi-time").textContent = seconds + "s";
  timer = setInterval(() => {
    seconds--;
    timeEl.textContent = seconds;
    if (seconds <= 0) {
      endGame();
    }
  }, 1000);
}

function endGame() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  quizEl.hidden = true;
  resultsEl.hidden = false;
  setProgress();
  const correctCount = answers.filter((a) => a?.correct).length;
  const line = `You scored ${score} with ${correctCount}/${
    QUESTIONS.length
  } correct in ${90 - seconds}s.`;
  document.getElementById("scoreline").textContent = line;
  // review
  reviewEl.innerHTML = "";
  QUESTIONS.forEach((q, i) => {
    const li = document.createElement("div");
    li.className = "card";
    li.style.marginTop = "10px";
    const pick = answers[i]?.pick;
    const ok = q.a === pick;
    li.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
          <div><strong>Q${i + 1}.</strong> ${q.q}</div>
          <span class="pill" style="border-color:${
            ok ? "#193a2a" : "#3a1a1a"
          };">${ok ? "✔ Correct" : "✖ Wrong"}</span>
        </div>
        <div class="muted" style="margin-top:6px">Answer: <strong>${
          q.options[q.a]
        }</strong>${
      pick != null ? ` • You chose: ${q.options[pick]}` : ""
    }</div>
        <div style="margin-top:6px">${q.expl || ""}</div>`;
    reviewEl.appendChild(li);
  });
}

function saveScore() {
  const name = (document.getElementById("playerName").value || "Anon").slice(
    0,
    24
  );
  const lb = JSON.parse(localStorage.getItem("sentient-quiz-lb") || "[]");
  lb.push({ name, score, time: 90 - seconds, date: Date.now() });
  localStorage.setItem("sentient-quiz-lb", JSON.stringify(lb));
  renderLeaderboard();
}

function setupEditor() {
  const sample = JSON.stringify(QUESTIONS, null, 2);
  const ed = document.getElementById("editor");
  ed.value = sample;
}

// --- Share --------------------------------------------------------------
async function share() {
  const text = `I scored ${score} on the Sentient Quiz! Try to beat me.`;
  const url = location.href;
  if (navigator.share) {
    try {
      await navigator.share({ title: "Sentient Quiz", text, url });
    } catch (e) {}
  } else {
    await navigator.clipboard.writeText(text + " " + url);
    alert("Copied result to clipboard!");
  }
}

// --- Theme --------------------------------------------------------------
const themeBtn = document.getElementById("toggleTheme");
function loadTheme() {
  const t = localStorage.getItem("sentient-theme") || "dark";
  themeBtn.setAttribute("aria-pressed", String(t === "light"));
  if (t === "light") {
    document.documentElement.style.setProperty("--bg", "#f6f8fb");
    document.documentElement.style.setProperty("--card", "#ffffff");
    document.documentElement.style.setProperty("--text", "#0b1220");
    document.body.style.background = "#f6f8fb";
  } else {
    document.documentElement.style.setProperty("--bg", "#0b0e13");
    document.documentElement.style.setProperty("--card", "#121721");
    document.documentElement.style.setProperty("--text", "#e6edf3");
    document.body.style.background = "linear-gradient(180deg,#0b0e13,#0f1320)";
  }
}
function toggleTheme() {
  const t = localStorage.getItem("sentient-theme") || "dark";
  const next = t === "dark" ? "light" : "dark";
  localStorage.setItem("sentient-theme", next);
  loadTheme();
}

// --- Events -------------------------------------------------------------
document.getElementById("start").onclick = startGame;
document.getElementById("next").onclick = nextQ;
document.getElementById("prev").onclick = prevQ;
document.getElementById("skip").onclick = nextQ;
document.getElementById("retry").onclick = () => {
  introEl.hidden = false;
  resultsEl.hidden = true;
};
document.getElementById("saveScore").onclick = saveScore;
document.getElementById("shareBtn").onclick = share;
document.getElementById("resetLb").onclick = () => {
  localStorage.removeItem("sentient-quiz-lb");
  renderLeaderboard();
};

document.getElementById("howTo").onclick = () => {
  alert(
    `How it works:\n\n• 90 seconds on the clock.\n• +10 per correct answer, small streak bonus.\n• Skip to move fast.\n• Save your score locally and challenge friends with Share.\n\nCustomize questions via the JSON editor below.`
  );
};

themeBtn.onclick = toggleTheme;

// Editor buttons
document.getElementById("loadJson").onclick = () => {
  try {
    const data = JSON.parse(document.getElementById("editor").value);
    if (!Array.isArray(data))
      throw new Error("JSON must be an array of questions");
    if (
      !data.every(
        (q) => q.q && Array.isArray(q.options) && typeof q.a === "number"
      )
    ) {
      throw new Error("Each question needs { q, options[], a }");
    }
    QUESTIONS = data;
    localStorage.setItem("sentient-quiz-questions", JSON.stringify(QUESTIONS));
    byId("kpi-questions").textContent = QUESTIONS.length;
    byId("qTotal").textContent = QUESTIONS.length;
    alert("Questions loaded!");
  } catch (err) {
    alert("Invalid JSON: " + err.message);
  }
};

document.getElementById("downloadJson").onclick = () => {
  const blob = new Blob([document.getElementById("editor").value], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "sentient-quiz-questions.json";
  a.click();
  URL.revokeObjectURL(url);
};

// --- Init ---------------------------------------------------------------
function init() {
  qTotal.textContent = QUESTIONS.length;
  byId("kpi-questions").textContent = QUESTIONS.length;
  setupEditor();
  renderLeaderboard();
  loadTheme();
  // Show best on load
  const lb = JSON.parse(localStorage.getItem("sentient-quiz-lb") || "[]");
  byId("kpi-best").textContent = lb[0]?.score || 0;
}
init();
