let score = 0;
let combo = 0;
let lives = 3;
let isPlaying = true;
let spawnTimer = null;

let currentFallDuration = 2600; 

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

// Cargar música seleccionada
const selectedMusic = localStorage.getItem('selectedMusic') || 'off';

if (selectedMusic !== 'off') {
    gameAudio.src = selectedMusic;
    if (selectedMusic.includes('musica.mp3')) songTitleDisplay.textContent = 'Golden Boy';
    if (selectedMusic.includes('musica2.mp3')) songTitleDisplay.textContent = 'Bad Taste';
    if (selectedMusic.includes('musica3.mp3')) songTitleDisplay.textContent = 'Dream Come True';
    
    gameAudio.play().catch(e => console.log("Audio esperando interacción:", e));
} else {
    songTitleDisplay.textContent = 'Modo Silencioso';
}

// Iniciar bucle de creación de notas
function startSpawner() {
    if (spawnTimer) clearTimeout(spawnTimer);

    function scheduleNextSpawn() {
        if (!isPlaying) return;

        const firstLaneIndex = Math.floor(Math.random() * 4);
        createNote(firstLaneIndex);

        // Probabilidad de nota doble (estilo Guitar Hero)
        if (Math.random() < 0.35) {
            let secondLaneIndex;
            do {
                secondLaneIndex = Math.floor(Math.random() * 4);
            } while (secondLaneIndex === firstLaneIndex);
            createNote(secondLaneIndex);
        }

        const randomDelay = Math.floor(Math.random() * 700) + 450;
        spawnTimer = setTimeout(scheduleNextSpawn, randomDelay);
    }
    
    scheduleNextSpawn();
}

function createNote(colIndex) {
    const lane = lanes[colIndex];
    const note = document.createElement('div');
    note.classList.add('falling-note');
    
    if (currentFallDuration > 1300) {
        currentFallDuration -= 5;
    }

    note.style.animationDuration = `${currentFallDuration}ms`;
    
    // Toque directo en la nota
    const handleNotePress = (e) => {
        e.stopPropagation();
        if (!isPlaying) return;

        clearTimeout(note.dataset.missTimeout);
        note.remove();

        showFeedback("¡ACIERTO!", "#00f3ff");
        score += 100 * (combo > 0 ? combo : 1);
        combo++;
        updateUI();
    };

    note.addEventListener('pointerdown', handleNotePress);
    lane.appendChild(note);

    // Si la nota llega abajo sin ser tocada (MISS)
    const missTimeout = setTimeout(() => {
        if (note.parentElement) {
            note.remove();
            registerMiss();
        }
    }, currentFallDuration);

    note.dataset.missTimeout = missTimeout;
}

// Fallo si se toca el carril en vacío
lanes.forEach((lane) => {
    lane.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        if (!isPlaying) return;
        registerMiss();
    });
});

function registerMiss() {
    combo = 0;
    lives--;
    showFeedback("¡FALLO!", "#ff007f");
    updateUI();

    if (lives <= 0) {
        triggerGameOver();
    }
}

function showFeedback(text, color) {
    feedbackTxt.textContent = text;
    feedbackTxt.style.color = color;
    feedbackTxt.classList.remove('show');
    void feedbackTxt.offsetWidth;
    feedbackTxt.classList.add('show');
}

function updateUI() {
    scoreEl.textContent = score;
    comboEl.textContent = combo;
    
    let hearts = '';
    for (let i = 0; i < lives; i++) hearts += '❤️';
    livesEl.textContent = hearts || '💔';
}

// Progreso de la canción (2 minutos)
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

    if (songTime >= maxSongTime) {
        triggerVictory();
    }
}, 1000);

// Controles de pausa y reanudar
pauseBtn.addEventListener('click', togglePause);

function togglePause() {
    isPlaying = !isPlaying;
    if (!isPlaying) {
        if (selectedMusic !== 'off') gameAudio.pause();
        modalTitle.textContent = "JUEGO PAUSADO";
        
        // Mostrar score actual y récord también al pausar
        let highScore = localStorage.getItem('neonHighScore') || 0;
        if (score > highScore) highScore = score;
        finalScore.innerHTML = `Puntuación: <b>${score}</b><br><span style="font-size:0.85rem; color:#ffcc00;">🏆 Récord: ${highScore}</span>`;
        
        modalOverlay.classList.remove('hidden');
    } else {
        resetAndRestartGame();
    }
}

function resetAndRestartGame() {
    document.querySelectorAll('.falling-note').forEach(note => note.remove());
    if (spawnTimer) clearTimeout(spawnTimer);

    score = 0;
    combo = 0;
    lives = 3;
    songTime = 0;
    currentFallDuration = 2600;
    updateUI();
    modalOverlay.classList.add('hidden');
    
    if (selectedMusic !== 'off') {
        gameAudio.currentTime = 0;
        gameAudio.play().catch(e => console.log("Audio reiniciado:", e));
    }
    
    isPlaying = true;
    startSpawner();
}

resumeBtn.addEventListener('click', resetAndRestartGame);
menuBtn.addEventListener('click', () => { window.location.href = 'index.html'; });

// --- GESTIÓN DE PUNTUACIONES Y RÉCORDS AL TERMINAR ---
function checkAndSaveHighScore() {
    let highScore = localStorage.getItem('neonHighScore') || 0;
    let isNewRecord = false;

    if (score > highScore) {
        highScore = score;
        localStorage.setItem('neonHighScore', highScore);
        isNewRecord = true;
    }

    return { highScore, isNewRecord };
}

function triggerGameOver() {
    isPlaying = false;
    if (spawnTimer) clearTimeout(spawnTimer);
    if (selectedMusic !== 'off') gameAudio.pause();

    const { highScore, isNewRecord } = checkAndSaveHighScore();

    modalTitle.textContent = "¡GAME OVER!";
    
    let recordText = `Puntuación actual: <b>${score}</b><br>🏆 Récord: <b>${highScore}</b>`;
    if (isNewRecord) {
        recordText += `<br><span style="color: #00ff80; font-weight: bold;">¡NUEVO RÉCORD! 🎉</span>`;
    }
    finalScore.innerHTML = recordText;

    modalOverlay.classList.remove('hidden');
}

function triggerVictory() {
    isPlaying = false;
    if (spawnTimer) clearTimeout(spawnTimer);
    if (selectedMusic !== 'off') gameAudio.pause();

    const { highScore, isNewRecord } = checkAndSaveHighScore();

    modalTitle.textContent = "¡VICTORIA!";
    
    let recordText = `Puntuación actual: <b>${score}</b><br>🏆 Récord: <b>${highScore}</b>`;
    if (isNewRecord) {
        recordText += `<br><span style="color: #00ff80; font-weight: bold;">¡NUEVO RÉCORD! 🎉</span>`;
    }
    finalScore.innerHTML = recordText;

    modalOverlay.classList.remove('hidden');
}

// Arrancar el juego por primera vez
startSpawner();