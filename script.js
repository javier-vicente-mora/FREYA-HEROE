let score = 0;
let combo = 0;
let lives = 3;
let isPlaying = true;
let spawnTimer = null;
let isStarting = false; 

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


// Clave para guardar el récord en localStorage
const STORAGE_KEY = 'freyaSkyeMusicHighScore';

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
    
    note.style.animationDuration = `${currentFallDuration}ms`;
    
    // Toque directo en la nota
    const handleNotePress = (e) => {
        e.stopPropagation();
        e.preventDefault();
        if (!isPlaying || isStarting) return;

        clearTimeout(note.dataset.missTimeout);
        
        // Definir el color de la chispa según el carril
        let noteColor = '#00f3ff';
        if (lane === lanes[0]) noteColor = '#ff007f';
        else if (lane === lanes[1]) noteColor = '#00f3ff';
        else if (lane === lanes[2]) noteColor = '#ffe600';
        else if (lane === lanes[3]) noteColor = '#00ff80';

        note.remove(); // Elimina la nota inmediatamente al acertar

        showFeedback("¡ACIERTO!", noteColor);
        score += 100 * (combo > 0 ? combo : 1);
        combo++;
        
        // --- ¡AQUÍ ESTABA EL TRUCO! Lanzamos las partículas ---
        spawnParticles(lane, noteColor);
        
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
// --- SISTEMA DE TOQUE POR CARRIL (Optimizado y sin bloqueo de aciertos) ---
// --- SISTEMA DE TOQUE POR CARRIL (Optimizado y sin bloqueo de aciertos) ---
lanes.forEach((lane) => {
    lane.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        if (!isPlaying || isStarting) return;

        const notesInLane = lane.querySelectorAll('.falling-note');
        let hit = false;
        let noteColor = '#00f3ff';

        notesInLane.forEach(note => {
            const rect = note.getBoundingClientRect();
            const laneRect = lane.getBoundingClientRect();
            const distanceFromBottom = laneRect.bottom - rect.bottom;

            if (distanceFromBottom >= -20 && distanceFromBottom <= 110) {
                clearTimeout(note.dataset.missTimeout);
                note.remove(); 
                hit = true;
                
                // Definir el color de la chispa según el carril
                if (lane === lanes[0]) noteColor = '#ff007f';
                if (lane === lanes[1]) noteColor = '#00f3ff';
                if (lane === lanes[2]) noteColor = '#ffe600';
                if (lane === lanes[3]) noteColor = '#00ff80';
            }
        });

        if (hit) {
            showFeedback("¡ACIERTO!", noteColor);
            score += 100 * (combo > 0 ? combo : 1);
            combo++;
            spawnParticles(lane, noteColor); // <-- Genera las chispas aquí
            updateUI();
        } else {
            registerMiss();
        }
    });
});

// Función que crea las chispas de colores
function spawnParticles(lane, color) {
    for (let i = 0; i < 8; i++) { // 8 chispas por acierto para que sea más vistoso
        const p = document.createElement('div');
        p.classList.add('particle');
        p.style.backgroundColor = color;
        p.style.color = color; // Para que funcione el box-shadow de brillo

        // Ángulo aleatorio en abanico hacia los lados y arriba
        const angle = (Math.random() * Math.PI); // de 0 a 180 grados hacia arriba
        const distance = Math.random() * 50 + 20; // Distancia de dispersión
        
        const dx = Math.cos(angle) * distance - (distance / 2);
        const dy = -Math.sin(angle) * distance;

        p.style.setProperty('--dx', `${dx}px`);
        p.style.setProperty('--dy', `${dy}px`);

        lane.appendChild(p);
        
        // Eliminar la partícula al terminar la animación (400ms)
        setTimeout(() => {
            p.remove();
        }, 400);
    }
}

function registerMiss() {
    combo = 0;
    lives--;
    showFeedback("¡FALLO!", "#ff007f"); // <-- Quita el cuadrito de color de ahí

    // --- ACTIVAR SACUDIDA DE PANTALLA ---
    triggerScreenShake();

    updateUI();

    if (lives <= 0) {
        triggerGameOver();
    }
}

// Función que aplica y quita la clase de sacudida durante 200ms
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
    void feedbackTxt.offsetWidth; // Reinicia la animación
    feedbackTxt.classList.add('show');

    // Limpia el temporizador anterior si existe y oculta el texto tras 350 milisegundos
    if (feedbackTimeout) clearTimeout(feedbackTimeout);
    feedbackTimeout = setTimeout(() => {
        feedbackTxt.classList.remove('show');
    }, 350);
}

// Referencia al contenedor arcade (si no la tienes arriba del todo, puedes declararla o usar querySelector)
const arcadeContainer = document.querySelector('.arcade-container');

function updateUI() {
    scoreEl.textContent = score;
    comboEl.textContent = combo;
    
    let hearts = '';
    for (let i = 0; i < lives; i++) hearts += '❤️';
    livesEl.textContent = hearts || '💔';

    // --- ACTIVAR / DESACTIVAR MODO FEVER ---
    if (combo >= 15) {
        arcadeContainer.classList.add('fever-mode');
    } else {
        arcadeContainer.classList.remove('fever-mode');
    }
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

    // Aceleración suave cada 5 segundos
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

// Controles de pausa
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
    currentFallDuration = 3000;
    updateUI();
    modalOverlay.classList.add('hidden');
    
    // Escudo exacto de 300ms para ignorar el residuo del botón de reanudar
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

// Botones del Modal con pointerdown seguro
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
    if (!isPlaying) return; // Evita que se ejecute varias veces si ya estamos en Game Over
    isPlaying = false;
    
    // Limpia todas las notas que estén cayendo en el momento de morir
    document.querySelectorAll('.falling-note').forEach(note => {
        clearTimeout(note.dataset.missTimeout);
        note.remove();
    });

    if (spawnTimer) clearTimeout(spawnTimer);
    
    // Detenemos la música de fondo
    if (selectedMusic !== 'off') {
        gameAudio.pause();
    }

    // Reproducir sonido de Game Over una sola vez
    const gameOverAudio = new Audio('canciones/game_over.mp3');
    gameOverAudio.volume = 1.0;
    gameOverAudio.play().catch(e => console.log("Audio de Game Over bloqueado:", e));

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