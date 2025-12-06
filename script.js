const zodiac = [
    { name: 'ね', image: 'images/001.png' },
    { name: 'うし', image: 'images/002.png' },
    { name: 'とら', image: 'images/003.png' },
    { name: 'う', image: 'images/004.png' },
    { name: 'たつ', image: 'images/005.png' },
    { name: 'み', image: 'images/006.png' },
    { name: 'うま', image: 'images/007.png' },
    { name: 'ひつじ', image: 'images/008.png' },
    { name: 'さる', image: 'images/009.png' },
    { name: 'とり', image: 'images/010.png' },
    { name: 'いぬ', image: 'images/011.png' },
    { name: 'い', image: 'images/012.png' }
];

let current = 0;
let difficulty = localStorage.getItem('lastDifficulty') || 1;
let draggedElement = null;
let sourceElement = null;
let draggedImage = null;
let draggedName = null;
let startX, startY;
const dragThreshold = 10;

// 効果音
const seCorrect = document.getElementById('se-correct');
const seWrong = document.getElementById('se-wrong');
const seDrop = document.getElementById('se-drop');

// 花火キャンバス
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
            x: cx, y: cy,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            color: colors[Math.floor(Math.random() * colors.length)],
            life: 100,
            size: 4 + Math.random() * 4
        });
    }
}

function drawFireworks() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles = particles.filter(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.12;
        p.life--;
        p.size *= 0.97;

        ctx.globalAlpha = p.life / 100;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();

        return p.life > 0;
    });
    if (particles.length > 0) requestAnimationFrame(drawFireworks);
}

// 初期化
document.getElementById('difficulty').value = difficulty;

const speak = text => {
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'ja-JP';
    speechSynthesis.speak(utter);
};

const showScreen = id => {
    document.querySelectorAll('#home-screen, #slide-screen, #challenge-screen').forEach(el => el.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
};

// スライドモード
const startSlide = () => {
    current = 0;
    showScreen('slide-screen');
    updateSlide();
};

const updateSlide = () => {
    const imgDiv = document.getElementById('slide-image');
    imgDiv.style.backgroundImage = `url(${zodiac[current].image})`;
    speak(zodiac[current].name);

    const progress = document.getElementById('progress');
    progress.innerHTML = '';
    zodiac.forEach((_, i) => {
        const icon = document.createElement('img');
        icon.src = zodiac[i].image;
        icon.classList.add('progress-icon');
        if (i === current) icon.classList.add('current');
        progress.appendChild(icon);
    });

    current = (current < zodiac.length - 1) ? current + 1 : 0;
    if (current === 0) {
        document.getElementById('restart-btn').classList.remove('hidden');
    } else {
        setTimeout(updateSlide, 700);
    }
};

document.getElementById('restart-btn').addEventListener('click', startSlide);

// チャレンジモード
const startChallenge = () => {
    difficulty = parseInt(document.getElementById('difficulty').value);
    const emptyCount = difficulty * 3; // 1:3, 2:6, 3:9, 4:12
    emptySlots = Array.from({length: 12}, (_, i) => i).sort(() => Math.random() - 0.5).slice(0, emptyCount);

    showScreen('challenge-screen');
    const btn = document.getElementById('check-btn');
    btn.textContent = 'かくにん！';
    btn.classList.remove('retry');
    btn.onclick = checkAnswer;

    canvas.classList.remove('active');
    particles = [];
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const scrollContainer = document.getElementById('scroll-container');
    scrollContainer.scrollLeft = 0;

    const slotsDiv = document.getElementById('challenge-slots');
    slotsDiv.innerHTML = '';
    zodiac.forEach((item, i) => {
        const slot = document.createElement('div');
        slot.classList.add('slot');
        slot.dataset.index = i;
        slot.dataset.correct = item.name;

        if (!emptySlots.includes(i)) {
            slot.style.backgroundImage = `url(${item.image})`;
            slot.classList.add('filled');
        } else {
            slot.addEventListener('dragover', (e) => e.preventDefault());
            slot.addEventListener('drop', drop);
        }
        slotsDiv.appendChild(slot);
    });

    const optionsDiv = document.getElementById('challenge-options');
    optionsDiv.innerHTML = '';
    emptySlots.sort(() => Math.random() - 0.5).forEach(i => {
        const option = document.createElement('div');
        option.classList.add('option');
        option.draggable = true;
        option.style.backgroundImage = `url(${zodiac[i].image})`;
        option.dataset.name = zodiac[i].name;
        option.addEventListener('dragstart', drag);
        option.addEventListener('touchstart', handleTouchStart);
        optionsDiv.appendChild(option);
    });
};

const drag = (e) => {
    e.dataTransfer.setData('name', e.target.dataset.name);
};

const drop = (e) => {
    e.preventDefault();
    const name = e.dataTransfer.getData('name');
    const index = parseInt(e.target.dataset.index);
    if (zodiac[index].name === name) {
        e.target.style.backgroundImage = `url(${zodiac[index].image})`;
        e.target.dataset.name = name;
        speak('せいかい！');
        checkComplete();
    } else {
        speak('ちがうよ');
    }
};

const checkComplete = () => {
    const slots = document.querySelectorAll('.slot');
    if (Array.from(slots).every(slot => slot.dataset.name)) {
        document.getElementById('feedback').textContent = 'ぜんぶせいかい！';
        speak('ぜんぶせいかい！');
    }
};

document.getElementById('retry-btn').addEventListener('click', initQuizMode);

// ボタンイベント
document.getElementById('learn-btn').addEventListener('click', initLearnMode);
document.getElementById('quiz-btn').addEventListener('click', initQuizMode);
document.getElementById('back-home').addEventListener('click', () => showScreen('home-screen'));
document.getElementById('back-home-quiz').addEventListener('click', () => showScreen('home-screen'));
