const zodiac = [
    { name: 'ね', image: 'images/001.png' }, { name: 'うし', image: 'images/002.png' },
    { name: 'とら', image: 'images/003.png' }, { name: 'う', image: 'images/004.png' },
    { name: 'たつ', image: 'images/005.png' }, { name: 'み', image: 'images/006.png' },
    { name: 'うま', image: 'images/007.png' }, { name: 'ひつじ', image: 'images/008.png' },
    { name: 'さる', image: 'images/009.png' }, { name: 'とり', image: 'images/010.png' },
    { name: 'いぬ', image: 'images/011.png' }, { name: 'い', image: 'images/012.png' }
];

let current = 0;
let difficulty = localStorage.getItem('lastDifficulty') || 1;
let draggedElement = null;

// 初期化
document.getElementById('difficulty').value = difficulty;

const speak = text => {
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'ja-JP';
    speechSynthesis.speak(utter);
};

const showScreen = id => {
    document.querySelectorAll('#home-screen, #slide-screen, #challenge-screen')
        .forEach(el => el.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
};

// スライドモード（変更なし）
const startSlide = () => {
    current = 0;
    showScreen('slide-screen');
    document.getElementById('restart-btn').classList.add('hidden');
    updateSlide();
};

const updateSlide = () => {
    const img = document.getElementById('slide-image');
    img.style.backgroundImage = `url(${zodiac[current].image})`;
    speak(zodiac[current].name);

    document.getElementById('progress').innerHTML = zodiac.map((z,i) => 
        `<div class="progress-icon ${i===current?'current':''}" style="background-image:url(${z.image})"></div>`
    ).join('');

    current = (current + 1) % 12;
    if (current === 0) {
        setTimeout(() => document.getElementById('restart-btn').classList.remove('hidden'), 1500);
    } else {
        setTimeout(updateSlide, 700 + 800);
    }
};

document.getElementById('restart-btn').onclick = startSlide;

// チャレンジモード（ドロップ判定を完全改良）
const startChallenge = () => {
    difficulty = +document.getElementById('difficulty').value;
    localStorage.setItem('lastDifficulty', difficulty);
    const count = difficulty === 4 ? 12 : difficulty * 3;
    const emptyIndices = Array.from({length:12},(_,i)=>i).sort(()=>Math.random()-0.5).slice(0,count);

    showScreen('challenge-screen');
    document.getElementById('result-overlay').classList.add('hidden');

    const slotsDiv = document.getElementById('challenge-slots');
    const optionsDiv = document.getElementById('challenge-options');
    slotsDiv.innerHTML = '';
    optionsDiv.innerHTML = '';

    // スロット作成（全てドロップ可能に）
    zodiac.forEach((z, i) => {
        const slot = document.createElement('div');
        slot.className = 'slot';
        slot.dataset.index = i;
        slot.dataset.correct = z.name;

        if (!emptyIndices.includes(i)) {
            slot.style.backgroundImage = `url(${z.image})`;
            slot.classList.add('filled');
        }
        // 全てのスロットにドロップイベントを設定（空欄以外も移動可能）
        slot.addEventListener('dragover', e => e.preventDefault());
        slot.addEventListener('drop', e => handleDrop(e, slot));
        slotsDiv.appendChild(slot);
    });

    // 選択肢作成
    [...emptyIndices].sort(()=>Math.random()-0.5).forEach(i => {
        createOption(zodiac[i]);
    });
};

// 選択肢作成関数
const createOption = (z) => {
    const opt = document.createElement('div');
    opt.className = 'option';
    opt.draggable = true;
    opt.style.backgroundImage = `url(${z.image})`;
    opt.dataset.name = z.name;

    // PC用ドラッグ
    opt.addEventListener('dragstart', e => {
        draggedElement = opt;
        e.dataTransfer.setData('text/plain', '');
    });

    // タッチ用（判定範囲を大幅に広げる）
    opt.addEventListener('touchstart', e => {
        e.preventDefault();
        draggedElement = opt;
        opt.classList.add('dragging');
        document.addEventListener('touchmove', touchMove, { passive: false });
        document.addEventListener('touchend', touchEnd);
    });

    document.getElementById('challenge-options').appendChild(opt);
};

let touchMove = e => {
    e.preventDefault();
    if (!draggedElement) return;
    const touch = e.touches[0];
    draggedElement.style.position = 'fixed';
    draggedElement.style.left = (touch.clientX - 60) + 'px';
    draggedElement.style.top = (touch.clientY - 60) + 'px';
    draggedElement.style.zIndex = 1000;
    draggedElement.style.transform = 'scale(1.3)';
};

let touchEnd = () => {
    if (!draggedElement) return;

    // 画面上の全てのスロットから最も近いものを探す（判定範囲超広い）
    const slots = document.querySelectorAll('#challenge-slots .slot');
    let closestSlot = null;
    let minDistance = Infinity;

    const rect = draggedElement.getBoundingClientRect();
    const dragX = rect.left + rect.width / 2;
    const dragY = rect.top + rect.height / 2;

    slots.forEach(slot => {
        const sRect = slot.getBoundingClientRect();
        const sCenterX = sRect.left + sRect.width / 2;
        const sCenterY = sRect.top + sRect.height / 2;
        const distance = Math.hypot(dragX - sCenterX, dragY - sCenterY);
        if (distance < minDistance && distance < 200) { // 200px以内なら認識（超広め！）
            minDistance = distance;
            closestSlot = slot;
        }
    });

    if (closestSlot) {
        handleDrop(null, closestSlot);
    }

    // リセット
    draggedElement.classList.remove('dragging');
    draggedElement.style.position = '';
    draggedElement.style.left = '';
    draggedElement.style.top = '';
    draggedElement.style.zIndex = '';
    draggedElement.style.transform = '';
    draggedElement = null;
    document.removeEventListener('touchmove', touchMove);
    document.removeEventListener('touchend', touchEnd);
};

// ドロップ処理（PC・タッチ共通）
const handleDrop = (e, slot) => {
    if (e) e.preventDefault();
    if (!draggedElement) return;

    const draggedImg = draggedElement.style.backgroundImage;
    const draggedName = draggedElement.dataset.name;

    // 移動元が選択肢なら削除、配置済みなら元スロットを空にする
    if (draggedElement.parentElement.id === 'challenge-options') {
        draggedElement.remove();
    } else {
        // 配置済みの画像だった場合は元のスロットを空に
        const oldSlot = draggedElement.closest('.slot');
        if (oldSlot) {
            oldSlot.style.backgroundImage = '';
            oldSlot.classList.remove('filled');
        }
    }

    // 新しいスロットに配置
    slot.style.backgroundImage = draggedImg;
    slot.classList.add('filled');

    draggedElement = null;
};

// 一括判定（変更なし）
document.getElementById('check-btn').onclick = () => {
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

    if (allCorrect) {
        overlay.textContent = '○';
        overlay.className = 'correct';
        setTimeout(() => overlay.classList.add('hidden'), 3000);
    } else {
        overlay.textContent = '×';
        overlay.className = 'wrong';
        setTimeout(() => {
            overlay.classList.add('hidden');
            wrongs.forEach(s => {
                s.classList.add('wrong-flash');
                setTimeout(() => {
                    const img = s.style.backgroundImage;
                    s.style.backgroundImage = '';
                    s.classList.remove('filled', 'wrong-flash');
                    if (img) {
                        const z = zodiac.find(item => item.image === img.slice(5, -2));
                        if (z) createOption(z);
                    }
                }, 2000);
            });
        }, 2000);
    }
};

// イベント
document.getElementById('slide-btn').onclick = startSlide;
document.getElementById('challenge-btn').onclick = startChallenge;
document.getElementById('back-home1').onclick = () => showScreen('home-screen');
document.getElementById('back-home2').onclick = () => showScreen('home-screen');
