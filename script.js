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
let draggedImage = null; // ドラッグ中の画像データ
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

    // スロット作成（位置固定）
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

        // ドロップイベント
        slot.addEventListener('dragover', e => e.preventDefault());
        slot.addEventListener('drop', handleDrop);

        // ドラッグイベント（fixed以外のみ、画像データのみドラッグ）
        if (!isFixed) {
            slot.addEventListener('dragstart', handleDragStart);
            slot.addEventListener('touchstart', handleTouchStart);
        }

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

    opt.addEventListener('dragstart', handleDragStart);
    opt.addEventListener('touchstart', handleTouchStart);

    document.getElementById('challenge-options').appendChild(opt);
};

// ドラッグ開始（PC）
const handleDragStart = e => {
    const elem = e.target;
    if (elem.classList.contains('fixed') || !elem.style.backgroundImage) return;

    draggedImage = elem.style.backgroundImage;
    draggedName = elem.dataset.name;

    // 移動元を即クリア（スロットの場合）
    if (elem.classList.contains('slot')) {
        elem.style.backgroundImage = '';
        elem.classList.remove('filled');
        elem.dataset.name = '';
    } else {
        // オプションの場合、要素削除
        setTimeout(() => elem.remove(), 0);
    }

    e.dataTransfer.setData('text/plain', ''); // 必須
};

// タッチ開始
const handleTouchStart = e => {
    const elem = e.target.closest('.slot:not(.fixed), .option');
    if (!elem || elem.classList.contains('fixed') || !elem.style.backgroundImage) return;

    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;

    draggedImage = elem.style.backgroundImage;
    draggedName = elem.dataset.name;

    // 移動元を即クリア
    if (elem.classList.contains('slot')) {
        elem.style.backgroundImage = '';
        elem.classList.remove('filled');
        elem.dataset.name = '';
    } else {
        elem.remove();
    }

    // クローンを作成してドラッグ表示
    const clone = elem.cloneNode(true);
    clone.style.position = 'fixed';
    clone.style.zIndex = 1000;
    clone.style.pointerEvents = 'none';
    document.body.appendChild(clone);
    draggedElement = clone; // 一時クローン

    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);
};

// タッチ移動
const handleTouchMove = e => {
    e.preventDefault(); // スクロール停止
    if (!draggedElement) return;

    const touch = e.touches[0];
    draggedElement.style.left = (touch.clientX - 45) + 'px';
    draggedElement.style.top = (touch.clientY - 45) + 'px';
    draggedElement.style.transform = 'scale(1.3)';
};

// タッチ終了
const handleTouchEnd = e => {
    if (!draggedElement) return;

    const touch = e.changedTouches[0];
    let targetSlot = document.elementFromPoint(touch.clientX, touch.clientY);
    targetSlot = targetSlot ? targetSlot.closest('.slot:not(.fixed)') : null;

    if (targetSlot) {
        // ドロップ処理
        if (targetSlot.classList.contains('filled')) {
            const oldImg = targetSlot.style.backgroundImage;
            const oldName = targetSlot.dataset.name;
            if (oldImg && oldName) {
                createOption({ name: oldName, image: oldImg.slice(5, -2) });
            }
        }
        targetSlot.style.backgroundImage = draggedImage;
        targetSlot.classList.add('filled');
        targetSlot.dataset.name = draggedName;
    } else {
        // 失敗時は元に戻す（選択肢へ）
        createOption({ name: draggedName, image: draggedImage.slice(5, -2) });
    }

    // クローン削除
    draggedElement.remove();
    draggedElement = null;
    draggedImage = null;
    draggedName = null;

    document.removeEventListener('touchmove', handleTouchMove);
    document.removeEventListener('touchend', handleTouchEnd);
};

// ドロップ処理（PC）
const handleDrop = e => {
    e.preventDefault();
    if (!draggedImage) return;

    const slot = e.target.closest('.slot:not(.fixed)');
    if (!slot) {
        // 失敗時は選択肢に戻す
        createOption({ name: draggedName, image: draggedImage.slice(5, -2) });
        draggedImage = null;
        draggedName = null;
        return;
    }

    // 置き換え
    if (slot.classList.contains('filled')) {
        const oldImg = slot.style.backgroundImage;
        const oldName = slot.dataset.name;
        if (oldImg && oldName) {
            createOption({ name: oldName, image: oldImg.slice(5, -2) });
        }
    }

    slot.style.backgroundImage = draggedImage;
    slot.classList.add('filled');
    slot.dataset.name = draggedName;

    draggedImage = null;
    draggedName = null;
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
