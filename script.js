let score = 0;
let combo = 0;
let lives = 3;
let isPlaying = true;
let spawnTimer = null;
let isStarting = false; 

// Registro de logros en esta sesión
let currentSessionAchievements = [];

// Velocidad inicial (en milisegundos que tarda la nota en caer)
let currentFallDuration = 3000; 

// Referencias del DOM
const scoreEl = document.getElementById('score-el');
const comboEl = document.getElementById('combo-el');
const livesEl = document.getElementById('lives-el');
const feedbackTxt = document.getElementById('feedback-txt');
const lanes = document.querySelectorAll('.lane');
const gameAudio = document.getElementById('game-audio');
const modalOverlay = document.getElementById('modal-overlay');
const modalTitle = document.getElementById('modal-title');
const finalScore = document.getElementById('final-score');
const resumeBtn = document.getElementById('resume-btn');
const menuBtn = document.getElementById('menu-btn');
const pauseBtn = document.getElementById('pause-btn');
const progressBarFill = document.getElementById('progress-bar-fill');
const timeDisplay = document.getElementById('time-display');
const songTitleDisplay = document.getElementById('song-title-display');
const arcadeContainer = document.querySelector('.arcade-container');

// Claves de localStorage
const STORAGE_KEY = 'freyaSkyeMusicHighScore';
const ACHIEVEMENTS_KEY = 'freyaSkyeAchievements';

// Cargar música seleccionada
const selectedMusic = localStorage.getItem('selectedMusic') || 'off';

if (selectedMusic !== 'off') {
    gameAudio.src = selectedMusic;
    if (selectedMusic.includes('musica.mp3')) songTitleDisplay.textContent = 'Golden Boy';
    if (selectedMusic.includes('musica2.mp3')) songTitleDisplay.textContent = 'Bad Taste';
    if (selectedMusic.includes('musica3.mp3')) songTitleDisplay.textContent = 'Dream Come True';
    if (selectedMusic.includes('musica4.mp3')) songTitleDisplay.textContent = 'Silent Treatment';
    if (selectedMusic.includes('musica5.mp3')) songTitleDisplay.textContent = 'The Place to Be';
    
    gameAudio.play().catch(e => console.log("Audio esperando interacción:", e));
} else {
    songTitleDisplay.textContent = 'Modo Silencioso';
}

let lastHoldSpawnSecond = -1;


// --- SISTEMA DE LOGROS (8 LOGROS) ---
const ACHIEVEMENTS_LIST = {
    'logro0': { id: 'logro0', img: 'logros/logro0.png', title: 'Ritmo Inicial', check: () => combo >= 10 },
    'logro1': { id: 'logro1', img: 'logros/logro1.png', title: 'Fiebre del Neón', check: () => combo >= 15 },
    'logro2': { id: 'logro2', img: 'logros/logro2.png', title: 'Estrella Naciente', check: () => score >= 50000 },
    'logro3': { id: 'logro3', img: 'logros/logro3.png', title: 'Dominador del Teclado', check: () => score >= 100000 },
    'logro4': { id: 'logro4', img: 'logros/logro4.png', title: 'Incapaz de Fallar', check: () => combo >= 50 },
    'logro5': { id: 'logro5', img: 'logros/logro5.png', title: 'Maestro del Ritmo', check: () => score >= 150000 },
    'logro6': { id: 'logro6', img: 'logros/logro6.png', title: 'Pulso de Acero', check: () => combo >= 75 },
    'logro7': { id: 'logro7', img: 'logros/logro7.png', title: 'Leyenda Absoluta', check: () => score >= 200000 }
};

function checkAndUnlockAchievements() {
    let unlocked = JSON.parse(localStorage.getItem(ACHIEVEMENTS_KEY) || '[]');
    let newlyUnlocked = [];

    Object.keys(ACHIEVEMENTS_LIST).forEach(key => {
        const ach = ACHIEVEMENTS_LIST[key];
        if (ach.check()) {
            if (!unlocked.includes(ach.id)) {
                unlocked.push(ach.id);
            }
            if (!currentSessionAchievements.includes(ach.id)) {
                currentSessionAchievements.push(ach.id);
                newlyUnlocked.push(ach);
            }
        }
    });

    localStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(unlocked));
}

// --- BUCLE DE CREACIÓN DE NOTAS ---
function startSpawner() {
    if (spawnTimer) clearTimeout(spawnTimer);

    function scheduleNextSpawn() {
        if (!isPlaying) return;

        const firstLaneIndex = Math.floor(Math.random() * 4);
        
        let forceHold = false;
        if (songTime > 0 && songTime % 5 === 0 && songTime !== lastHoldSpawnSecond) {
            forceHold = true;
            lastHoldSpawnSecond = songTime;
        }

        const isHold = forceHold; 
        createNote(firstLaneIndex, isHold);

        if (!isHold && Math.random() < 0.3) {
            let secondLaneIndex;
            do {
                secondLaneIndex = Math.floor(Math.random() * 4);
            } while (secondLaneIndex === firstLaneIndex);
            createNote(secondLaneIndex, false);
        }

        const randomDelay = Math.floor(Math.random() * 500 + 450);
        spawnTimer = setTimeout(scheduleNextSpawn, randomDelay);
    }
    
    scheduleNextSpawn();
}

function createNote(colIndex, isHold = false) {
    const lane = lanes[colIndex];
    const note = document.createElement('div');
    note.classList.add('falling-note');
    
    if (isHold) {
        note.classList.add('hold-note');
        note.dataset.isHold = "true";
    }
    
    note.style.animationDuration = `${currentFallDuration}ms`;

    let noteColor = '#00f3ff';
    if (lane === lanes[0]) noteColor = '#ff007f';
    else if (lane === lanes[1]) noteColor = '#00f3ff';
    else if (lane === lanes[2]) noteColor = '#ffe600';
    else if (lane === lanes[3]) noteColor = '#00ff80';

    let noteProcessed = false;

    // Evento único de toque / presión para ambos tipos de notas
    note.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        e.preventDefault();
        if (!isPlaying || isStarting || noteProcessed) return;

        noteProcessed = true;
        clearTimeout(note.dataset.missTimeout);

        if (isHold) {
            // Nota larga: al tocarla y mantenerla, se ilumina y da el excellent al completarse el tiempo
            note.classList.add('holding');

            setTimeout(() => {
                if (note.parentElement) {
                    note.remove();
                    showGradeAndScore("¡EXCELLENT!", noteColor, 300, lane);
                }
            }, 700); // 0.7 segundos de duración de la retención

        } else {
            // Nota normal
            note.remove();
            showGradeAndScore("¡ACIERTO!", noteColor, 100, lane);
        }
    });

    lane.appendChild(note);

    // Margen por si se deja escapar la nota sin tocarla
    const extraTime = isHold ? 1500 : 0;
    const missTimeout = setTimeout(() => {
        if (note.parentElement && !noteProcessed) {
            note.remove();
            registerMiss();
        }
    }, currentFallDuration + extraTime);

    note.dataset.missTimeout = missTimeout;
}

lanes.forEach((lane) => {
    lane.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        if (!isPlaying || isStarting) return;
        registerMiss();
    });
});

function showGradeAndScore(text, color, pointsMultiplier, lane) {
    showFeedback(text, color);
    score += pointsMultiplier * (combo > 0 ? combo : 1);
    combo++;
    spawnParticles(lane, color);
    checkAndUnlockAchievements(); // Comprobar logros al aumentar puntuación / combo
    updateUI();
}

function spawnParticles(lane, color) {
    for (let i = 0; i < 8; i++) {
        const p = document.createElement('div');
        p.classList.add('particle');
        p.style.backgroundColor = color;
        p.style.color = color;

        const angle = (Math.random() * Math.PI); 
        const distance = Math.random() * 50 + 20;
        
        const dx = Math.cos(angle) * distance - (distance / 2);
        const dy = -Math.sin(angle) * distance;

        p.style.setProperty('--dx', `${dx}px`);
        p.style.setProperty('--dy', `${dy}px`);

        lane.appendChild(p);
        
        setTimeout(() => {
            p.remove();
        }, 400);
    }
}

function registerMiss() {
    combo = 0;
    lives--;
    showFeedback("¡FALLO!", "#ff007f");
    triggerScreenShake();
    updateUI();

    if (lives <= 0) {
        triggerGameOver();
    }
}

function triggerScreenShake() {
    arcadeContainer.classList.add('shake');
    setTimeout(() => {
        arcadeContainer.classList.remove('shake');
    }, 200);
}

let feedbackTimeout = null;

function showFeedback(text, color) {
    feedbackTxt.textContent = text;
    feedbackTxt.style.color = color;
    feedbackTxt.classList.remove('show');
    void feedbackTxt.offsetWidth;
    feedbackTxt.classList.add('show');

    if (feedbackTimeout) clearTimeout(feedbackTimeout);
    feedbackTimeout = setTimeout(() => {
        feedbackTxt.classList.remove('show');
    }, 350);
}

function updateUI() {
    scoreEl.textContent = score;
    comboEl.textContent = combo;
    
    let hearts = '';
    for (let i = 0; i < lives; i++) hearts += '❤️';
    livesEl.textContent = hearts || '💔';

    if (combo >= 15) {
        arcadeContainer.classList.add('fever-mode');
    } else {
        arcadeContainer.classList.remove('fever-mode');
    }
}

let songTime = 0;
const maxSongTime = 120; 

const progressInterval = setInterval(() => {
    if (!isPlaying) return;
    songTime++;
    
    let mins = Math.floor(songTime / 60).toString().padStart(2, '0');
    let secs = (songTime % 60).toString().padStart(2, '0');
    timeDisplay.textContent = `${mins}:${secs} / 02:00`;
    
    let progressPercent = (songTime / maxSongTime) * 100;
    progressBarFill.style.width = `${progressPercent}%`;

    if (songTime % 5 === 0) {
        if (currentFallDuration > 1400) {
            currentFallDuration -= 120; 
        }
    }

    if (songTime >= maxSongTime) {
        if (lives > 0) {
            triggerVictory();
        }
    }
}, 1000);

pauseBtn.addEventListener('click', togglePause);

function togglePause() {
    isPlaying = !isPlaying;
    if (!isPlaying) {
        if (selectedMusic !== 'off') gameAudio.pause();
        modalTitle.textContent = "JUEGO PAUSADO";
        modalTitle.classList.remove('victory-title');
        modalOverlay.querySelector('.modal-content').classList.remove('victory-glow');
        
        let highScore = localStorage.getItem(STORAGE_KEY) || 0;
        if (score > highScore) highScore = score;
        
        finalScore.innerHTML = generateScoreHTML(score, highScore, false);
        modalOverlay.classList.remove('hidden');
    } else {
        resetAndRestartGame();
    }
}

function resetAndRestartGame() {
    document.querySelectorAll('.falling-note').forEach(note => note.remove());
    if (spawnTimer) clearTimeout(spawnTimer);

    modalOverlay.querySelector('.modal-content').classList.remove('victory-glow');
    modalTitle.classList.remove('victory-title');

    score = 0;
    combo = 0;
    lives = 3;
    songTime = 0;
    lastHoldSpawnSecond = -1;
    currentSessionAchievements = [];
    currentFallDuration = 3000;
    arcadeContainer.classList.remove('fever-mode');
    updateUI();
    modalOverlay.classList.add('hidden');
    
    isStarting = true;
    setTimeout(() => {
        isStarting = false;
    }, 300);

    if (selectedMusic !== 'off') {
        gameAudio.currentTime = 0;
        gameAudio.play().catch(e => console.log("Audio reiniciado:", e));
    }
    
    isPlaying = true;
    startSpawner();
}

resumeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    resetAndRestartGame();
});

menuBtn.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    e.preventDefault();
    window.location.href = 'index.html';
});

function generateScoreHTML(score, highScore, isNewRecord) {
    let html = `
        <div style="margin-bottom: 12px;">
            <span style="font-size: 0.9rem; color: #a0aec0; text-transform: uppercase; letter-spacing: 1px;">Puntuación Actual</span>
            <div style="font-size: 2.5rem; font-weight: 900; color: #fff; text-shadow: 0 0 10px rgba(0, 243, 255, 0.5);">${score}</div>
        </div>
        <div style="background: rgba(255, 204, 0, 0.1); border: 1px solid rgba(255, 204, 0, 0.3); padding: 8px 15px; border-radius: 12px; display: inline-flex; align-items: center; gap: 8px; margin-bottom: 5px;">
            <span style="font-size: 1.2rem;">🏆</span>
            <span style="color: #ffcc00; font-weight: bold; font-size: 0.95rem;">Récord: ${highScore}</span>
        </div>
    `;

    // Renderizar Logros Conseguidos en esta partida
    if (currentSessionAchievements.length > 0) {
        html += `
            <div class="unlocked-achievements-container">
                <h4>🏆 LOGROS DE LA PARTIDA 🏆</h4>
                <div class="achievements-row">
        `;
        currentSessionAchievements.forEach(achId => {
            const ach = ACHIEVEMENTS_LIST[achId];
            if (ach) {
                html += `<img src="${ach.img}" title="${ach.title}" class="achievement-circle-item" onerror="this.src='https://via.placeholder.com/48?text=🏆'">`;
            }
        });
        html += `
                </div>
            </div>
        `;
    }

    if (isNewRecord) {
        html += `<div style="margin-top: 10px; color: #00ff80; font-weight: bold; font-size: 1rem; text-shadow: 0 0 8px rgba(0, 255, 128, 0.8);">¡NUEVO RÉCORD! 🎉</div>`;
    }

    // Botón para ir a la Sala de Logros
    html += `
        <a href="logros.html" class="neon-btn secondary" style="margin-top: 15px; display: block; text-decoration: none; font-size: 0.9rem; padding: 10px;">
            🏆 Ver Todos los Logros
        </a>
    `;

    return html;
}

function checkAndSaveHighScore() {
    let highScore = localStorage.getItem(STORAGE_KEY) || 0;
    let isNewRecord = false;

    if (score > highScore) {
        highScore = score;
        localStorage.setItem(STORAGE_KEY, highScore);
        isNewRecord = true;
    }

    return { highScore, isNewRecord };
}

function triggerGameOver() {
    if (!isPlaying) return; 
    isPlaying = false;
    
    document.querySelectorAll('.falling-note').forEach(note => {
        clearTimeout(note.dataset.missTimeout);
        note.remove();
    });

    if (spawnTimer) clearTimeout(spawnTimer);
    
    if (selectedMusic !== 'off') {
        gameAudio.pause();
    }

    const gameOverAudio = new Audio('canciones/game_over.mp3');
    gameOverAudio.volume = 1.0;
    gameOverAudio.play().catch(e => console.log("Audio de Game Over bloqueado:", e));

    const { highScore, isNewRecord } = checkAndSaveHighScore();

    modalTitle.textContent = "¡GAME OVER!";
    modalTitle.classList.remove('victory-title');
    arcadeContainer.classList.remove('fever-mode');
    modalOverlay.querySelector('.modal-content').classList.remove('victory-glow');

    finalScore.innerHTML = generateScoreHTML(score, highScore, isNewRecord);
    modalOverlay.classList.remove('hidden');
}

function triggerVictory() {
    isPlaying = false;
    if (spawnTimer) clearTimeout(spawnTimer);
    if (selectedMusic !== 'off') gameAudio.pause();

    const { highScore, isNewRecord } = checkAndSaveHighScore();

    const modalContentBox = modalOverlay.querySelector('.modal-content');
    modalContentBox.classList.add('victory-glow');
    arcadeContainer.classList.remove('fever-mode');

    modalTitle.textContent = "¡FELICIDADES! 🎉";
    modalTitle.classList.add('victory-title');

    finalScore.innerHTML = generateScoreHTML(score, highScore, isNewRecord);
    modalOverlay.classList.remove('hidden');
}

// Iniciar juego por primera vez
startSpawner();