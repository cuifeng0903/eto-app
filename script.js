const zodiac = [
    { name: 'ね', image: 'images/001.png' }, { name: 'うし', image: 'images/002.png' },
    { name: 'とら', image: 'images/003.png' }, { name: 'う', image: 'images/004.png' },
    { name: 'たつ', image: 'images/005.png' }, { name: 'み', image: 'images/006.png' },
    { name: 'うま', image: 'images/007.png' }, { name: 'ひつじ', image: 'images/008.png' },
    { name: 'さる', image: 'images/009.png' }, { name: 'とり', image: 'images/010.png' },
    { name: 'いぬ', image: 'images/011.png' }, { name: 'い', image: 'images/012.png' }
];

let currentIndex = 0;
let difficulty = localStorage.getItem('lastDifficulty') || 1;
let emptySlots = [];
let draggedElement = null, sourceElement = null, draggedImage = null, draggedName = null;
let startX, startY;
const dragThreshold = 10;

// 効果音
const seCorrect = document.getElementById('se-correct');
const seWrong = document.getElementById('se-wrong');
const seDrop = document.getElementById('se-drop');

// 花火
const canvas = document.getElementById('fireworks');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
let particles = [];

function createFirework() {
    const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ff8800'];
    const cx = canvas.width / 2 + (Math.random() - 0.5) * 300;
    const cy = canvas.height / 2 + (Math.random() - 0.5) * 300;
    for (let i = 0; i < 80; i++) {
        const angle = Math.PI * 2 * i / 80;
        const speed = 3 + Math.random() * 6;
        particles.push({
            x: cx, y: cy, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
            color: colors[Math.floor(Math.random() * colors.length)], life: 100, size: 4 + Math.random() * 4
        });
    }
}

function drawFireworks() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles = particles.filter(p => {
        p.x += p.vx; p.y += p.vy; p.vy += 0.12; p.life--; p.size *= 0.97;
        ctx.globalAlpha = p.life / 100; ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
        return p.life > 0;
    });
    if (particles.length > 0) requestAnimationFrame(drawFireworks);
}

// 初期化
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('difficulty').value = difficulty;
    document.getElementById('slide-btn').addEventListener('click', startSlide);
    document.getElementById('challenge-btn').addEventListener('click', startChallenge);
    document.getElementById('back-home1').addEventListener('click', goHome);
    document.getElementById('back-home2').addEventListener('click', goHome);
    document.getElementById('restart-btn').addEventListener('click', startSlide);
    document.getElementById('check-btn').addEventListener('click', checkAnswer);
});

const speak = text => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ja-JP';
    speechSynthesis.speak(utterance);
};

const showScreen = id => {
    document.querySelectorAll('#home-screen, #slide-screen, #challenge-screen').forEach(el => el.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
};

const goHome = () => {
    showScreen('home-screen');
    canvas.classList.remove('active');
    particles = [];
    ctx.clearRect(0, 0, canvas.width, canvas.height);
};

// スライドモード
const startSlide = () => {
    currentIndex = 0;
    showScreen('slide-screen');
    document.getElementById('restart-btn').classList.add('hidden');
    updateSlide();
};

const updateSlide = () => {
    document.getElementById('slide-image').style.backgroundImage = `url(${zodiac[currentIndex].image})`;
    speak(zodiac[currentIndex].name);

    const progress = document.getElementById('progress');
    progress.innerHTML = zodiac.map((z, i) => `<div class="progress-icon ${i === currentIndex ? 'current' : ''}" style="background-image:url(${z.image})"></div>`).join('');

    currentIndex = (currentIndex + 1) % 12;
    if (currentIndex === 0) {
        setTimeout(() => document.getElementById('restart-btn').classList.remove('hidden'), 1500);
    } else {
        setTimeout(updateSlide, 1500);
    }
};

// チャレンジモード
const startChallenge = () => {
    difficulty = +document.getElementById('difficulty').value;
    localStorage.setItem('lastDifficulty', difficulty);
    const count = difficulty === 4 ? 12 : difficulty * 3;
    emptySlots = Array.from({length:12}, (_,i) => i).sort(() => Math.random() - 0.5).slice(0, count);

    showScreen('challenge-screen');
    document.getElementById('result-overlay').classList.add('hidden');

    const btn = document.getElementById('check-btn');
    btn.textContent = 'かくにん！';
    btn.classList.remove('retry');
    btn.onclick = checkAnswer;

    canvas.classList.remove('active');
    particles = [];
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    document.getElementById('scroll-container').scrollLeft = 0;

    const slotsDiv = document.getElementById('challenge-slots');
    slotsDiv.innerHTML = '';
    zodiac.forEach((z, i) => {
        const slot = document.createElement('div');
        slot.className = 'slot';
        slot.dataset.index = i;
        slot.dataset.correct = z.name;

        if (!emptySlots.includes(i)) {
            slot.style.backgroundImage = `url(${z.image})`;
            slot.classList.add('filled', 'fixed');
        }

        slot.addEventListener('dragover', e => e.preventDefault());
        slot.addEventListener('drop', handleDrop);

        if (emptySlots.includes(i)) {
            slot.addEventListener('dragstart', handleDragStart);
            slot.addEventListener('touchstart', handleTouchStart);
        }
        slotsDiv.appendChild(slot);
    });

    const optionsDiv = document.getElementById('challenge-options');
    optionsDiv.innerHTML = '';
    [...emptySlots].sort(() => Math.random() - 0.5).forEach(i => {
        createOption(zodiac[i]);
    });
};

// ドラッグ/タッチ（変更なし）
const handleDragStart = e => {
    const el = e.target;
    if (el.classList.contains('fixed') || !el.style.backgroundImage) return;
    sourceElement = el;
    draggedImage = el.style.backgroundImage;
    draggedName = el.dataset.name;
    e.dataTransfer.setData('text/plain', '');
};

const handleTouchStart = e => {
    const el = e.target.closest('.slot:not(.fixed), .option');
    if (!el || el.classList.contains('fixed') || !el.style.backgroundImage) return;
    e.preventDefault();
    sourceElement = el;
    draggedImage = el.style.backgroundImage;
    draggedName = el.dataset.name;
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    draggedElement = el.cloneNode(true);
    draggedElement.style.position = 'fixed';
    draggedElement.style.zIndex = 1000;
    draggedElement.style.pointerEvents = 'none';
    draggedElement.style.opacity = '0.9';
    draggedElement.style.transition = 'none';
    document.body.appendChild(draggedElement);
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);
};

const handleTouchMove = e => {
    e.preventDefault();
    if (!draggedElement) return;
    const t = e.touches[0];
    const dx = t.clientX - startX;
    const dy = t.clientY - startY;
    if (Math.hypot(dx, dy) > dragThreshold) {
        draggedElement.style.left = (t.clientX - 45) + 'px';
        draggedElement.style.top = (t.clientY - 45) + 'px';
        draggedElement.style.transform = 'scale(1.3) rotate(5deg)';
    }
};

const handleTouchEnd = e => {
    if (!draggedElement) return;
    const t = e.changedTouches[0];
    const target = document.elementFromPoint(t.clientX, t.clientY);
    const slot = target ? target.closest('.slot:not(.fixed)') : null;
    if (slot) {
        performDrop(slot);
        seDrop.currentTime = 0;
        seDrop.play();
    }
    cleanupDrag();
};

const handleDrop = e => {
    e.preventDefault();
    if (!sourceElement) return;
    const slot = e.target.closest('.slot:not(.fixed)');
    if (slot) {
        performDrop(slot);
        seDrop.currentTime = 0;
        seDrop.play();
    }
    cleanupDrag();
};

const performDrop = slot => {
    if (slot.classList.contains('filled')) {
        const oldImg = slot.style.backgroundImage;
        const oldName = slot.dataset.name || zodiac.find(z => `url("${z.image}")` === oldImg)?.name;
        if (oldImg && oldName) createOption({ name: oldName, image: oldImg.slice(5, -2) });
    }
    slot.style.backgroundImage = draggedImage;
    slot.classList.add('filled');
    slot.dataset.name = draggedName;
    if (sourceElement.classList.contains('option')) sourceElement.remove();
    else {
        sourceElement.style.backgroundImage = '';
        sourceElement.classList.remove('filled');
        delete sourceElement.dataset.name;
    }
};

const cleanupDrag = () => {
    if (draggedElement) draggedElement.remove();
    draggedElement = sourceElement = draggedImage = draggedName = null;
    document.removeEventListener('touchmove', handleTouchMove);
    document.removeEventListener('touchend', handleTouchEnd);
};

const createOption = ({ name, image }) => {
    const opt = document.createElement('div');
    opt.className = 'option';
    opt.draggable = true;
    opt.style.backgroundImage = `url(${image})`;
    opt.dataset.name = name;
    opt.addEventListener('dragstart', handleDragStart);
    opt.addEventListener('touchstart', handleTouchStart);
    document.getElementById('challenge-options').appendChild(opt);
};

// 正誤判定（自動再挑戦削除 + ボタンクリック時のみ再挑戦）
const checkAnswer = () => {
    const slots = document.querySelectorAll('#challenge-slots .slot');
    const wrongs = [];
    let allCorrect = true;

    slots.forEach(slot => {
        const idx = +slot.dataset.index;
        const currentImg = slot.style.backgroundImage;
        const correctImg = `url("${zodiac[idx].image}")`;
        if (currentImg !== correctImg || !slot.classList.contains('filled')) {
            allCorrect = false;
            if (slot.classList.contains('filled')) wrongs.push(slot);
        }
    });

    const overlay = document.getElementById('result-overlay');
    overlay.classList.remove('hidden');
    const btn = document.getElementById('check-btn');

    if (allCorrect) {
        overlay.textContent = '○';
        overlay.className = 'correct';
        seCorrect.currentTime = 0;
        seCorrect.play();

        canvas.classList.add('active');
        for (let i = 0; i < 8; i++) setTimeout(createFirework, i * 250);
        drawFireworks();

        btn.textContent = 'もう１かい';
        btn.classList.add('retry');
        // クリック時のみ再挑戦（自動なし）
        btn.onclick = () => startChallenge();

        setTimeout(() => overlay.classList.add('hidden'), 4000);
    } else {
        overlay.textContent = '×';
        overlay.className = 'wrong';
        seWrong.currentTime = 0;
        seWrong.play();
        speak('がんばろう！');

        setTimeout(() => {
            overlay.classList.add('hidden');
            // 重複解消: 選択領域クリア後、誤り画像のみ再追加
            const optionsDiv = document.getElementById('challenge-options');
            optionsDiv.innerHTML = '';
            wrongs.forEach(slot => {
                slot.classList.add('wrong-flash');
                const img = slot.style.backgroundImage;
                const name = slot.dataset.name;
                setTimeout(() => {
                    slot.style.backgroundImage = '';
                    slot.classList.remove('filled', 'wrong-flash');
                    delete slot.dataset.name;
                    if (img && name) createOption({ name, image: img.slice(5, -2) });
                }, 2000);
            });
        }, 2000);
    }
};
