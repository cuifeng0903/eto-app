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
let startX, startY; // タッチ開始位置
const dragThreshold = 10; // ドラッグ判定閾値（px）

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

    // スロット作成
    zodiac.forEach((z, i) => {
        const slot = document.createElement('div');
        slot.className = 'slot';
        slot.dataset.index = i;
        slot.dataset.correct = z.name;

        if (!emptyIndices.includes(i)) {
            slot.style.backgroundImage = `url(${z.image})`;
            slot.classList.add('filled');
        }

        // ドロップイベント
        slot.addEventListener('dragover', e => e.preventDefault());
        slot.addEventListener('drop', e => handleDrop(e, slot));

        // 配置済みもドラッグ可能
        slot.addEventListener('dragstart', e => {
            if (slot.classList.contains('filled')) {
                draggedElement = slot;
                e.dataTransfer.setData('text/plain', '');
            }
        });
        slot.addEventListener('touchstart', handleTouchStart);

        slotsDiv.appendChild(slot);
    });

    // 選択肢作成
    [...emptyIndices].sort(()=>Math.random()-0.5).forEach(i => {
        createOption(zodiac[i]);
    });
};

// 選択肢作成
const createOption = (z) => {
    const opt = document.createElement('div');
    opt.className = 'option';
    opt.draggable = true;
    opt.style.backgroundImage = `url(${z.image})`;
    opt.dataset.name = z.name;

    opt.addEventListener('dragstart', e => {
        draggedElement = opt;
        e.dataTransfer.setData('text/plain', '');
    });
    opt.addEventListener('touchstart', handleTouchStart);

    document.getElementById('challenge-options').appendChild(opt);
};

// タッチ開始（スクロール両立）
const handleTouchStart = e => {
    const elem = e.target.closest('.slot.filled, .option');
    if (!elem) return;

    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    draggedElement = elem;

    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);
};

// タッチ移動（閾値でドラッグ判定）
const handleTouchMove = e => {
    if (!draggedElement) return;

    const touch = e.touches[0];
    const dx = touch.clientX - startX;
    const dy = touch.clientY - startY;

    if (Math.hypot(dx, dy) > dragThreshold) {
        e.preventDefault(); // 閾値超えでスクロール停止、ドラッグ開始
        draggedElement.style.position = 'fixed';
        draggedElement.style.left = (touch.clientX - 45) + 'px';
        draggedElement.style.top = (touch.clientY - 45) + 'px';
        draggedElement.style.zIndex = 1000;
        draggedElement.style.transform = 'scale(1.3)';
    }
};

// タッチ終了
const handleTouchEnd = e => {
    if (!draggedElement) return;

    const touch = e.changedTouches[0];
    let closestSlot = null;
    let minDistance = Infinity;

    const rect = draggedElement.getBoundingClientRect();
    const dragX = rect.left + rect.width / 2;
    const dragY = rect.top + rect.height / 2;

    document.querySelectorAll('#challenge-slots .slot').forEach(slot => {
        const sRect = slot.getBoundingClientRect();
        const dist = Math.hypot(dragX - (sRect.left + sRect.width / 2), dragY - (sRect.top + sRect.height / 2));
        if (dist < minDistance && dist < 200) {
            minDistance = dist;
            closestSlot = slot;
        }
    });

    if (closestSlot) {
        handleDrop(null, closestSlot);
    }

    // リセット
    draggedElement.style.position = '';
    draggedElement.style.left = '';
    draggedElement.style.top = '';
    draggedElement.style.zIndex = '';
    draggedElement.style.transform = '';
    draggedElement = null;

    document.removeEventListener('touchmove', handleTouchMove);
    document.removeEventListener('touchend', handleTouchEnd);
};

// ドロップ処理
const handleDrop = (e, slot) => {
    if (e) e.preventDefault();
    if (!draggedElement) return;

    const draggedImg = draggedElement.style.backgroundImage;
    const draggedName = draggedElement.dataset.name;

    // 置き換え: 既にfilledなら元の画像を選択肢に戻す
    if (slot.classList.contains('filled')) {
        const oldImg = slot.style.backgroundImage;
        const oldName = zodiac.find(z => `url("${z.image}")` === oldImg)?.name;
        if (oldImg && oldName) {
            createOption({ name: oldName, image: oldImg.slice(5, -2) });
        }
    }

    // 新しい画像を配置
    slot.style.backgroundImage = draggedImg;
    slot.classList.add('filled');
    slot.dataset.name = draggedName;

    // 移動元削除
    if (draggedElement.classList.contains('option')) {
        draggedElement.remove();
    } else if (draggedElement.classList.contains('slot')) {
        draggedElement.style.backgroundImage = '';
        draggedElement.classList.remove('filled');
        draggedElement.dataset.name = '';
    }

    draggedElement = null;
};

// 一括判定
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
