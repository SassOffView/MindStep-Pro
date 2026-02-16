/* MindStep Elite v5.0 - UNIFIED EDITION */

// STATO GLOBALE
let user = JSON.parse(localStorage.getItem('mindstep_user'));
let routines = JSON.parse(localStorage.getItem('mindstep_routines') || '[]');
let stats = JSON.parse(localStorage.getItem('mindstep_stats') || '{"total_dist":0, "total_steps":0, "badges":[]}');

let walk = { 
    active: false, paused: false, startTime: 0, elapsed: 0, 
    dist: 0, steps: 0, notes: 0, lastPos: null, introIdx: 0 
};

let timerInt, recognition;

// 1. INIZIALIZZAZIONE & INTERVISTA
window.onload = () => {
    if (!user) {
        document.getElementById('onboarding').classList.add('active');
    } else {
        document.getElementById('user-display').innerText = `Pro: ${user.name}`;
        initApp();
    }
};

function finishSetup() {
    const data = {
        name: document.getElementById('name').value,
        age: document.getElementById('age').value,
        sex: document.getElementById('sex').value,
        lang: document.getElementById('lang').value
    };
    if(!data.name) return alert("Inserisci il tuo nome!");
    localStorage.setItem('mindstep_user', JSON.stringify(data));
    location.reload();
}

function initApp() {
    renderRoutines();
    renderBadges();
    checkWeather();
    if(window.DeviceMotionEvent) window.addEventListener('devicemotion', handleSteps);
}

// 2. NAVIGAZIONE ORIZZONTALE
function nav(id, el) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById(`view-${id}`).classList.add('active');
    el.classList.add('active');
    if(id === 'analysis') renderCalendar();
}

// 3. LOGICA SESSIONE & FIX GPS (BUG-001)
function toggleSession() {
    const btn = document.getElementById('btn-session');
    if (!walk.active) {
        walk.active = true;
        walk.startTime = Date.now();
        timerInt = setInterval(updateTimer, 1000);
        if(navigator.geolocation) {
            walk.watchId = navigator.geolocation.watchPosition(updateGPS, null, {enableHighAccuracy:true});
        }
        btn.innerText = "PAUSA";
    } else if (!walk.paused) {
        walk.paused = true;
        btn.innerText = "RIPRENDI";
    } else {
        walk.paused = false;
        walk.lastPos = null; // FIX BUG-001: Impedisce il salto di distanza se l'utente si è spostato in pausa
        btn.innerText = "PAUSA";
    }
}

function updateGPS(pos) {
    if(walk.paused) return;
    const {latitude: lat, longitude: lon, accuracy} = pos.coords;
    if(accuracy > 30) return;

    if(walk.lastPos) {
        const d = calculateDistance(walk.lastPos.lat, walk.lastPos.lon, lat, lon);
        if(d < 0.06) { // Solo se il movimento è umano (no glitch GPS)
            walk.dist += d;
            document.getElementById('dist').innerText = walk.dist.toFixed(2);
        }
    }
    walk.lastPos = {lat, lon};
}

// 4. CONTAPASSI & TRASCRIZIONE
function handleSteps(e) {
    if(!walk.active || walk.paused) return;
    const acc = e.accelerationIncludingGravity;
    const force = Math.sqrt(acc.x**2 + acc.y**2 + acc.z**2);
    if(force > 12) { // Soglia passo
        walk.steps++;
        document.getElementById('steps').innerText = walk.steps;
    }
}

function toggleRec() {
    if(!recognition) {
        recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
        recognition.lang = user.lang || 'it-IT';
        recognition.onresult = (e) => {
            walk.notes++;
            document.getElementById('notes').innerText = walk.notes;
            showPopup("Pensiero archiviato nell'analisi Elite.");
        };
    }
    
    const btn = document.getElementById('btn-rec');
    if(btn.classList.contains('active')) {
        recognition.stop();
        btn.classList.remove('active');
    } else {
        recognition.start();
        btn.classList.add('active');
        showPopup("Ascolto attivo...");
    }
}

// 5. INTROSPEZIONE & POPUP
const TIPS = [
    {t: 5, m: "Respira. Qual è il pensiero che ti sta bloccando?"},
    {t: 15, m: "Visualizza il tuo obiettivo come se fosse già raggiunto."},
    {t: 30, m: "Stai camminando verso una versione migliore di te."}
];

function updateTimer() {
    if(walk.paused) return;
    walk.elapsed = Date.now() - walk.startTime;
    const m = Math.floor(walk.elapsed/60000);
    const s = Math.floor((walk.elapsed/1000)%60);
    document.getElementById('time').innerText = `${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;

    if(TIPS[walk.introIdx] && m >= TIPS[walk.introIdx].t) {
        showPopup(TIPS[walk.introIdx].m);
        walk.introIdx++;
    }
}

function showPopup(txt) {
    const p = document.getElementById('popup');
    p.querySelector('span').innerText = txt;
    p.classList.add('show');
    setTimeout(() => p.classList.remove('show'), 6000);
}

// 6. ROUTINES & CALENDARIO (RIATTIVATI)
function renderRoutines() {
    const container = document.getElementById('routine-list');
    container.innerHTML = routines.map((r, i) => `
        <div class="card" style="display:flex; justify-content:space-between; align-items:center;">
            <span>${r}</span>
            <button onclick="delRoutine(${i})" style="background:none; border:none; color:#ff4757;">✕</button>
        </div>
    `).join('');
}

function addRoutine() {
    const task = prompt("Aggiungi un obiettivo quotidiano:");
    if(task) { routines.push(task); localStorage.setItem('mindstep_routines', JSON.stringify(routines)); renderRoutines(); }
}

function delRoutine(i) { routines.splice(i, 1); localStorage.setItem('mindstep_routines', JSON.stringify(routines)); renderRoutines(); }

function renderCalendar() {
    const cal = document.getElementById('calendar');
    cal.innerHTML = `<div style="display:grid; grid-template-columns:repeat(7, 1fr); gap:5px; text-align:center;">
        ${['L','M','M','G','V','S','D'].map(d => `<small>${d}</small>`).join('')}
        ${Array.from({length:28}).map((_, i) => `<div style="padding:5px; background:rgba(255,255,255,0.05); border-radius:4px;">${i+1}</div>`).join('')}
    </div>`;
}

// 7. BADGE SYSTEM (60 POSTI)
function renderBadges() {
    const grid = document.getElementById('badge-grid');
    grid.innerHTML = Array.from({length: 60}).map((_, i) => `
        <div class="badge ${stats.badges.includes(i) ? 'unlocked' : ''}">
            <svg viewBox="0 0 24 24" width="20" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 2l3 7h7l-5 5 2 7-7-4-7 4 2-7-5-5h7z"/></svg>
            <span style="margin-top:4px;">#${i+1}</span>
        </div>
    `).join('');
}

// UTILITIES
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; const dLat = (lat2-lat1)*Math.PI/180; const dLon = (lon2-lon1)*Math.PI/180;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}
function checkWeather() { document.getElementById('weather').innerText = "18°C • Sereno"; }
function resetApp() { if(confirm("Cancellare tutto?")) { localStorage.clear(); location.reload(); } }
