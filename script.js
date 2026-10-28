let score = 0;
let combo = 0;
let lives = 3;
let isPlaying = true;
let spawnTimer = null;

// Velocidad inicial (en milisegundos que tarda la nota en caer de arriba a abajo)
// Cuanto mayor sea el número, más lenta cae. 3000ms = 3 segundos.
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

// Clave para guardar el récord en localStorage
const STORAGE_KEY = 'freyaSkyeMusicHighScore';

// Cargar música seleccionada
const selectedMusic = localStorage.getItem('selectedMusic') || 'off';

if (selectedMusic !== 'off') {
    gameAudio.src = selectedMusic;
    if (selectedMusic.includes('musica.mp3')) songTitleDisplay.textContent = 'Golden Boy';
    if (selectedMusic.includes('musica2.mp3')) songTitleDisplay.textContent = 'Bad Taste';
    if (selectedMusic.includes('musica3.mp3')) songTitleDisplay.textContent = 'Dream Come True';    
    if (selectedMusic.includes('musica4.mp3')) songTitleDisplay.textContent = 'Silent Treatment';
    if (selectedMusic.includes('musica5.mp3')) songTitleDisplay.textContent = 'The Place to Be';
    if (selectedMusic.includes('aromas ilicitanos.mp3')) songTitleDisplay.textContent = 'Aromas Ilicitanos';
    

    gameAudio.play().catch(e => console.log("Audio esperando interacción:", e));
} else {
    songTitleDisplay.textContent = 'Modo Silencioso';
}

// Iniciar bucle de creación de notas (estilo Guitar Hero con dobles)
function startSpawner() {
    if (spawnTimer) clearTimeout(spawnTimer);

    function scheduleNextSpawn() {
        if (!isPlaying) return;

        const firstLaneIndex = Math.floor(Math.random() * 4);
        createNote(firstLaneIndex);

        // Probabilidad de nota doble (35%)
        if (Math.random() < 0.35) {
            let secondLaneIndex;
            do {
                secondLaneIndex = Math.floor(Math.random() * 4);
            } while (secondLaneIndex === firstLaneIndex);
            createNote(secondLaneIndex);
        }

        const randomDelay = Math.floor(Math.random() * 600 + 400);
        spawnTimer = setTimeout(scheduleNextSpawn, randomDelay);
    }
    
    scheduleNextSpawn();
}

function createNote(colIndex) {
    const lane = lanes[colIndex];
    const note = document.createElement('div');
    note.classList.add('falling-note');
    
    // Usamos la velocidad actual calculada por el temporizador de 5 segundos
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

// Progreso de la canción (2 minutos = 120 segundos)
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

    // --- CADA 5 SEGUNDOS SUBE UN PELÍN LA VELOCIDAD ---
    if (songTime % 5 === 0) {
        // Reducimos el tiempo de caída un poquito (haciendo que vayan más rápido)
        // Pero ponemos un límite (por ejemplo, 1400ms) para que no sea imposible de jugar
        if (currentFallDuration > 1400) {
            currentFallDuration -= 120; // Se acelera de forma suave cada 5s
            console.log("Velocidad incrementada. Nueva duración de caída:", currentFallDuration);
        }
    }

    // Si se acaba la canción y quedan vidas -> Victoria
    if (songTime >= maxSongTime) {
        if (lives > 0) {
            triggerVictory();
        }
    }
}, 1000);

// Controles de pausa y reanudar
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
    currentFallDuration = 3000; // Reinicia a la velocidad inicial suave
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
    if (isNewRecord) {
        html += `<div style="margin-top: 10px; color: #00ff80; font-weight: bold; font-size: 1rem; text-shadow: 0 0 8px rgba(0, 255, 128, 0.8);">¡NUEVO RÉCORD! 🎉</div>`;
    }
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
    isPlaying = false;
    if (spawnTimer) clearTimeout(spawnTimer);
    if (selectedMusic !== 'off') gameAudio.pause();

    const { highScore, isNewRecord } = checkAndSaveHighScore();

    modalTitle.textContent = "¡GAME OVER!";
    modalTitle.classList.remove('victory-title');
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

    modalTitle.textContent = "¡FELICIDADES! 🎉";
    modalTitle.classList.add('victory-title');

    let victoryHTML = `
        <div style="font-size: 0.95rem; color: #00ff80; margin-bottom: 15px; font-weight: bold;">¡Has completado la canción! 🎵</div>
        <div style="margin-bottom: 12px;">
            <span style="font-size: 0.9rem; color: #a0aec0; text-transform: uppercase; letter-spacing: 1px;">Puntuación Final</span>
            <div style="font-size: 2.5rem; font-weight: 900; color: #fff; text-shadow: 0 0 10px rgba(0, 255, 128, 0.5);">${score}</div>
        </div>
        <div style="background: rgba(255, 204, 0, 0.1); border: 1px solid rgba(255, 204, 0, 0.3); padding: 8px 15px; border-radius: 12px; display: inline-flex; align-items: center; gap: 8px; margin-bottom: 5px;">
            <span style="font-size: 1.2rem;">🏆</span>
            <span style="color: #ffcc00; font-weight: bold; font-size: 0.95rem;">Récord: ${highScore}</span>
        </div>
    `;

    if (isNewRecord) {
        victoryHTML += `<div style="margin-top: 10px; color: #00ff80; font-weight: bold; font-size: 1rem; text-shadow: 0 0 8px rgba(0, 255, 128, 0.8);">¡NUEVO RÉCORD MUNDIAL! 🌟</div>`;
    }

    finalScore.innerHTML = victoryHTML;
    modalOverlay.classList.remove('hidden');
}

// Iniciar juego por primera vez
startSpawner();