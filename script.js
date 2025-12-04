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
let emptySlots = [];
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

// スライドモード（自動再生）
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

    // 進捗
    document.getElementById('progress').innerHTML = zodiac.map((z,i) => 
        `<div class="progress-icon ${i===current?'current':''}" style="background-image:url(${z.image})"></div>`
    ).join('');

    current = (current + 1) % 12;
    if (current === 0) {
        setTimeout(() => document.getElementById('restart-btn').classList.remove('hidden'), 1500);
    } else {
        setTimeout(updateSlide, 700 + 800); // 音声時間＋0.7秒
    }
};

document.getElementById('restart-btn').onclick = startSlide;

// チャレンジモード
const startChallenge = () => {
    difficulty = +document.getElementById('difficulty').value;
    localStorage.setItem('lastDifficulty', difficulty);
    const count = difficulty === 4 ? 12 : difficulty * 3;
    emptySlots = Array.from({length:12},(_,i)=>i).sort(()=>Math.random()-0.5).slice(0,count);

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
        if (!emptySlots.includes(i)) {
            slot.style.backgroundImage = `url(${z.image})`;
            slot.classList.add('filled');
        }
        slotsDiv.appendChild(slot);
    });

    [...emptySlots].sort(()=>Math.random()-0.5).forEach(i => {
        const opt = document.createElement('div');
        opt.className = 'option';
        opt.draggable = true;
        opt.style.backgroundImage = `url(${zodiac[i].image})`;
        opt.dataset.name = zodiac[i].name;
        opt.dataset.index = i;

        opt.addEventListener('dragstart', e => {
            draggedElement = opt;
            e.dataTransfer.setData('text/plain', '');
        });
        opt.addEventListener('touchstart', e => {
            e.preventDefault();
            draggedElement = opt;
            opt.style.position = 'fixed';
            opt.style.zIndex = 1000;
            opt.style.transform = 'scale(1.2)';
            document.addEventListener('touchmove', touchMove);
            document.addEventListener('touchend', touchEnd);
        });

        optionsDiv.appendChild(opt);
    });
};

const touchMove = e => {
    if (!draggedElement) return;
    const touch = e.touches[0];
    draggedElement.style.left = (touch.clientX - 50) + 'px';
    draggedElement.style.top = (touch.clientY - 50) + 'px';
};

const touchEnd = e => {
    if (!draggedElement) return;
    const touch = e.changedTouches[0];
    const target = document.elementFromPoint(touch.clientX, touch.clientY);
    dropOnTarget(target);
    resetDragged();
};

const dropOnTarget = target => {
    if (target && target.classList.contains('slot') && !target.classList.contains('filled')) {
        const correctName = zodiac[target.dataset.index].name;
        if (draggedElement.dataset.name === correctName) {
            target.style.backgroundImage = draggedElement.style.backgroundImage;
            target.classList.add('filled');
            draggedElement.remove();
        }
    }
    // どこにもドロップされなければ元に戻る（自動で残る）
};

const resetDragged = () => {
    if (draggedElement) {
        draggedElement.style.position = '';
        draggedElement.style.left = '';
        draggedElement.style.top = '';
        draggedElement.style.zIndex = '';
        draggedElement.style.transform = '';
        draggedElement = null;
    }
    document.removeEventListener('touchmove', touchMove);
    document.removeEventListener('touchend', touchEnd);
};

// 一括判定
document.getElementById('check-btn').onclick = () => {
    const slots = document.querySelectorAll('#challenge-slots .slot');
    const wrongs = [];
    let allCorrect = true;

    slots.forEach(slot => {
        const idx = slot.dataset.index;
        const placedName = slot.classList.contains('filled') ? 
            zodiac.find(z => z.image === slot.style.backgroundImage.slice(5,-2))?.name : null;
        if (placedName !== zodiac[idx].name) {
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
                    s.classList.remove('filled', 'wrong-flash');
                    s.style.backgroundImage = '';
                    // 選択肢に戻す
                    const img = s.style.backgroundImage;
                    if (img) {
                        const opt = document.createElement('div');
                        opt.className = 'option';
                        opt.draggable = true;
                        opt.style.backgroundImage = img;
                        document.getElementById('challenge-options').appendChild(opt);
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
