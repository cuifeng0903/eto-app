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
let draggedElement = null; // 現在ドラッグ中のクローン
let sourceElement = null;  // 元の要素（スロット or オプション）
let draggedImage = null;
let draggedName = null;
let startX, startY;
const dragThreshold = 10;

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

// チャレンジモード
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

    zodiac.forEach((z, i) => {
        const slot = document.createElement('div');
        slot.className = 'slot';
        slot.dataset.index = i;
        slot.dataset.correct = z.name;

        const isFixed = !emptyIndices.includes(i);
        if (isFixed) {
            slot.style.backgroundImage = `url(${z.image})`;
            slot.classList.add('filled', 'fixed');
        }

        slot.addEventListener('dragover', e => e.preventDefault());
        slot.addEventListener('drop', handleDrop);

        if (!isFixed) {
            slot.addEventListener('dragstart', handleDragStart);
            slot.addEventListener('touchstart', handleTouchStart);
        }

        slotsDiv.appendChild(slot);
    });

    [...emptyIndices].sort(()=>Math.random()-0.5).forEach(i => {
        createOption(zodiac[i]);
    });
};

const createOption = (z) => {
    const opt = document.createElement('div');
    opt.className = 'option';
    opt.draggable = true;
    opt.style.backgroundImage = `url(${z.image})`;
    opt.dataset.name = z.name;

    opt.addEventListener('dragstart', handleDragStart);
    opt.addEventListener('touchstart', handleTouchStart);

    document.getElementById('challenge-options').appendChild(opt);
};

// ドラッグ開始（PC）
const handleDragStart = e => {
    const elem = e.target;
    if (elem.classList.contains('fixed') || !elem.style.backgroundImage) return;

    sourceElement = elem;
    draggedImage = elem.style.backgroundImage;
    draggedName = elem.dataset.name;

    // 見た目は残す（クローンで移動）
    e.dataTransfer.setData('text/plain', '');
};

// タッチ開始（最も重要な修正）
const handleTouchStart = e => {
    const elem = e.target.closest('.slot:not(.fixed), .option');
    if (!elem || elem.classList.contains('fixed') || !elem.style.backgroundImage) return;

    e.preventDefault();
    sourceElement = elem;
    draggedImage = elem.style.backgroundImage;
    draggedName = elem.dataset.name;

    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;

    // クローン作成（指の下に表示）
    draggedElement = elem.cloneNode(true);
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

    const touch = e.touches[0];
    const dx = touch.clientX - startX;
    const dy = touch.clientY - startY;

    if (Math.hypot(dx, dy) > dragThreshold) {
        draggedElement.style.left = (touch.clientX - 45) + 'px';
        draggedElement.style.top = (touch.clientY - 45) + 'px';
        draggedElement.style.transform = 'scale(1.3) rotate(5deg)';
    }
};

const handleTouchEnd = e => {
    if (!draggedElement) return;

    const touch = e.changedTouches[0];
    const target = document.elementFromPoint(touch.clientX, touch.clientY);
    const targetSlot = target ? target.closest('.slot:not(.fixed)') : null;

    if (targetSlot) {
        performDrop(targetSlot);
    } else {
        // ドロップ失敗 → 元に戻す
        cancelDrag();
    }

    cleanupDrag();
};

const handleDrop = e => {
    e.preventDefault();
    if (!sourceElement) return;

    const slot = e.target.closest('.slot:not(.fixed)');
    if (slot) {
        performDrop(slot);
    } else {
        cancelDrag();
    }
    cleanupDrag();
};

// ドロップ実行
const performDrop = (slot) => {
    // 置き換え処理
    if (slot.classList.contains('filled')) {
        const oldImg = slot.style.backgroundImage;
        const oldName = slot.dataset.name || zodiac.find(z => `url("${z.image}")` === oldImg)?.name;
        if (oldImg) {
            createOption({ name: oldName, image: oldImg.slice(5, -2) });
        }
    }

    slot.style.backgroundImage = draggedImage;
    slot.classList.add('filled');
    slot.dataset.name = draggedName;

    // 元の場所を空にする
    if (sourceElement.classList.contains('option')) {
        sourceElement.remove();
    } else {
        sourceElement.style.backgroundImage = '';
        sourceElement.classList.remove('filled');
        delete sourceElement.dataset.name;
    }
};

// ドラッグキャンセル
const cancelDrag = () => {
    // 何もしない（元々あった場所に残る）
};

// ドラッグ終了処理
const cleanupDrag = () => {
    if (draggedElement) {
        draggedElement.remove();
        draggedElement = null;
    }
    sourceElement = null;
    draggedImage = null;
    draggedName = null;
    document.removeEventListener('touchmove', handleTouchMove);
    document.removeEventListener('touchend', handleTouchEnd);
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
                        const z = zodiac.find(item => `url("${item.image}")` === img);
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
