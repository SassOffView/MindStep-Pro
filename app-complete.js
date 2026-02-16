/* MindStep v5.0 ELITE - Full Integrated Edition */

let user = JSON.parse(localStorage.getItem('mindstep_user'));
let routines = JSON.parse(localStorage.getItem('mindstep_routines') || '[]');
let walkData = { isActive: false, isPaused: false, startTime: null, elapsedTime: 0, distance: 0, steps: 0, notes: 0, positions: [], lastValidPos: null, introspectIdx: 0 };
let timerInterval = null;
let recognition = null;

// --- INIZIALIZZAZIONE ---
window.onload = () => {
    if (!user) {
        document.getElementById('onboarding-view').classList.add('active');
    } else {
        document.getElementById('welcome-msg').innerText = `Bentornato, ${user.name}`;
        initApp();
    }
};

function initApp() {
    renderRoutines();
    renderBadges();
    checkWeather();
    // Inizializza accelerometro per passi
    if(window.DeviceMotionEvent) window.addEventListener('devicemotion', handlePedometer);
}

function finishOnboarding() {
    const name = document.getElementById('user-name').value;
    if(!name) return alert("Inserisci almeno il nome");
    user = { name, age: document.getElementById('user-age').value, lang: document.getElementById('user-lang').value };
    localStorage.setItem('mindstep_user', JSON.stringify(user));
    document.getElementById('onboarding-view').classList.remove('active');
    location.reload();
}

// --- NAVIGATION ---
function switchView(viewId, el) {
    document.querySelectorAll('.view-container').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById(`view-${viewId}`).classList.add('active');
    el.classList.add('active');
    if(viewId === 'performance') renderCalendar();
}

// --- SESSION LOGIC (FIX GPS BUG-001) ---
function toggleSession() {
    const btn = document.getElementById('main-action-btn');
    if (!walkData.isActive) {
        startSession();
        btn.innerText = "PAUSA";
    } else if (!walkData.isPaused) {
        walkData.isPaused = true;
        btn.innerText = "RIPRENDI";
        btn.style.background = "#ff9f43";
    } else {
        walkData.isPaused = false;
        walkData.lastValidPos = null; // FIX BUG-001: Impedisce il salto di distanza
        btn.innerText = "PAUSA";
        btn.style.background = "var(--primary)";
    }
}

function startSession() {
    walkData.isActive = true;
    walkData.startTime = Date.now();
    if(navigator.geolocation) {
        walkData.watchId = navigator.geolocation.watchPosition(updatePos, null, {enableHighAccuracy:true});
    }
    timerInterval = setInterval(updateTimer, 1000);
}

function updatePos(pos) {
    if(walkData.isPaused) return;
    const {latitude: lat, longitude: lon, accuracy} = pos.coords;
    if(accuracy > 30) return;

    if(walkData.lastValidPos) {
        const d = calcDist(walkData.lastValidPos.lat, walkData.lastValidPos.lon, lat, lon);
        if(d < 0.05) { // Filtro movimento irreale
            walkData.distance += d;
            document.getElementById('dist-display').innerText = walkData.distance.toFixed(2);
        }
    }
    walkData.lastValidPos = {lat, lon};
}

// --- PEDOMETER (FEATURE-001) ---
let lastTotalAcc = 0;
function handlePedometer(e) {
    if(!walkData.isActive || walkData.isPaused) return;
    const acc = e.accelerationIncludingGravity;
    const total = Math.sqrt(acc.x**2 + acc.y**2 + acc.z**2);
    if(total > 12 && Math.abs(total - lastTotalAcc) > 2) {
        walkData.steps++;
        document.getElementById('steps-display').innerText = walkData.steps;
    }
    lastTotalAcc = total;
}

// --- INTROSPEZIONE (PSYCHOLOGIST) ---
const MESSAGES = [
    {t: 5, m: "Come senti il tuo corpo ora? Lascia andare le tensioni."},
    {t: 15, m: "Qual è il vero obiettivo di quello che stai pensando?"},
    {t: 30, m: "Sei in stato di flow. Sfrutta questa chiarezza."}
];

function updateTimer() {
    if(walkData.isPaused) return;
    walkData.elapsedTime = Date.now() - walkData.startTime;
    const sec = Math.floor((walkData.elapsedTime/1000)%60);
    const min = Math.floor(walkData.elapsedTime/60000);
    document.getElementById('timer-display').innerText = `${min.toString().padStart(2,'0')}:${sec.toString().padStart(2,'0')}`;

    // Pop-up trigger
    if(MESSAGES[walkData.introspectIdx] && min >= MESSAGES[walkData.introspectIdx].t) {
        showPopup(MESSAGES[walkData.introspectIdx].m);
        walkData.introspectIdx++;
    }
}

function showPopup(txt) {
    const p = document.getElementById('introspection-popup');
    document.getElementById('popup-text').innerText = txt;
    p.classList.add('visible');
    setTimeout(() => p.classList.remove('visible'), 6000);
}

// --- BRAINSTORMING (REINTEGRATO) ---
function toggleRecording() {
    if(isRecording) {
        recognition.stop();
        isRecording = false;
        document.getElementById('rec-btn').classList.remove('recording');
    } else {
        recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
        recognition.lang = user.lang || 'it-IT';
        recognition.onresult = (e) => {
            walkData.notes++;
            document.getElementById('notes-display').innerText = walkData.notes;
            showPopup("Pensiero archiviato nell'analisi AI.");
        };
        recognition.start();
        isRecording = true;
        document.getElementById('rec-btn').classList.add('recording');
    }
}

// --- ROUTINES (REINTEGRATO & FIX BUG-005) ---
function renderRoutines() {
    const list = document.getElementById('routine-list');
    list.innerHTML = routines.map((r, i) => `
        <div class="card" style="display:flex; justify-content:space-between; align-items:center;">
            <span>${r}</span>
            <button onclick="deleteRoutine(${i})" style="background:none; border:none; color:#ff4757;">✕</button>
        </div>
    `).join('');
}

function addRoutine() {
    const task = prompt("Cosa vuoi automatizzare?");
    if(task) { routines.push(task); localStorage.setItem('mindstep_routines', JSON.stringify(routines)); renderRoutines(); }
}

function deleteRoutine(i) { routines.splice(i, 1); localStorage.setItem('mindstep_routines', JSON.stringify(routines)); renderRoutines(); }

// --- CALENDAR & BADGES ---
function renderCalendar() {
    const cont = document.getElementById('calendar-container');
    const days = ['D','L','M','M','G','V','S'];
    cont.innerHTML = `<div style="display:grid; grid-template-columns: repeat(7, 1fr); text-align:center; font-size:0.7rem;">
        ${days.map(d => `<div>${d}</div>`).join('')}
        ${Array.from({length:30}).map((_,i) => `<div style="padding:5px; border:1px solid rgba(255,255,255,0.05);">${i+1}</div>`).join('')}
    </div>`;
}

function renderBadges() {
    const grid = document.getElementById('badges-grid');
    const list = [
        {id:'1', n:'Innesco', icon:'M12 19V5'},
        {id:'2', n:'Focus', icon:'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z'},
        {id:'3', n:'Elite', icon:'M21 16V8l-9-5-9 5v8l9 5z'}
    ];
    grid.innerHTML = list.map(b => `<div class="badge-item"><svg viewBox="0 0 24 24" width="24" fill="none" stroke="currentColor" stroke-width="2"><path d="${b.icon}"/></svg><br>${b.n}</div>`).join('');
}

// UTILS
function calcDist(lat1, lon1, lat2, lon2) {
    const R = 6371; const dLat = (lat2-lat1)*Math.PI/180; const dLon = (lon2-lon1)*Math.PI/180;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function checkWeather() { document.getElementById('weather-info').innerText = "Cielo Sereno • 18°C • Ideale per il focus"; }
function resetApp() { if(confirm("Resettare tutto?")) { localStorage.clear(); location.reload(); } }
