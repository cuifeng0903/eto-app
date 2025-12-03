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

let currentIndex = 0;
let difficulty = 1;
let emptySlots = [];

// 画面切り替え
const showScreen = id => {
    document.querySelectorAll('#home-screen, #learn-screen, #quiz-screen')
        .forEach(el => el.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
};

// 音声読み上げ
const speak = text => {
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'ja-JP';
    speechSynthesis.speak(utter);
};

// 学習モード
const initLearnMode = () => {
    currentIndex = 0;
    showScreen('learn-screen');
    updateLearnDisplay();
};

const updateLearnDisplay = () => {
    document.getElementById('learn-image').style.backgroundImage = `url(${zodiac[currentIndex].image})`;
    speak(zodiac[currentIndex].name);

    const progress = document.getElementById('progress');
    progress.innerHTML = '';
    zodiac.forEach((z, i) => {
        const icon = document.createElement('div');
        icon.className = 'progress-icon';
        icon.style.backgroundImage = `url(${z.image})`;
        if (i === currentIndex) icon.classList.add('current');
        progress.appendChild(icon);
    });
};

document.getElementById('prev-btn').onclick = () => {
    currentIndex = (currentIndex - 1 + zodiac.length) % zodiac.length;
    updateLearnDisplay();
};
document.getElementById('next-btn').onclick = () => {
    currentIndex = (currentIndex + 1) % zodiac.length;
    updateLearnDisplay();
};
document.getElementById('speak-btn').onclick = () => speak(zodiac[currentIndex].name);

// 確認モード
const initQuizMode = () => {
    difficulty = +document.getElementById('difficulty').value;
    const emptyCount = difficulty === 4 ? 12 : difficulty * 3;
    emptySlots = Array.from({length: 12}, (_,i) => i)
        .sort(() => Math.random() - 0.5)
        .slice(0, emptyCount);

    showScreen('quiz-screen');
    document.getElementById('feedback').textContent = '';

    const slotsDiv = document.getElementById('quiz-slots');
    slotsDiv.innerHTML = '';
    zodiac.forEach((z, i) => {
        const slot = document.createElement('div');
        slot.classList.add('slot');
        slot.dataset.index = i;
        slot.dataset.correct = z.name;

        if (!emptySlots.includes(i)) {
            slot.style.backgroundImage = `url(${z.image})`;
            slot.classList.add('filled');
        } else {
            slot.addEventListener('dragover', e => e.preventDefault());
            slot.addEventListener('drop', dropHandler);
        }
        slotsDiv.appendChild(slot);
    });

    const optionsDiv = document.getElementById('quiz-options');
    optionsDiv.innerHTML = '';
    [...emptySlots].sort(() => Math.random() - 0.5).forEach(i => {
        const opt = document.createElement('div');
        opt.classList.add('option');
        opt.draggable = true;
        opt.style.backgroundImage = `url(${zodiac[i].image})`;
        opt.dataset.name = zodiac[i].name;
        opt.addEventListener('dragstart', e => e.dataTransfer.setData('name', zodiac[i].name));
        optionsDiv.appendChild(opt);
    });

    speak('すきな ばしょに えとを いれてね');
};

const dropHandler = e => {
    e.preventDefault();
    const name = e.dataTransfer.getData('name');
    const slot = e.target;
    if (name === slot.dataset.correct) {
        slot.style.backgroundImage = `url(${zodiac.find(z => z.name === name).image})`;
        slot.classList.add('filled');
        e.target.closest('.option')?.remove();
        speak('せいかい！');
        checkComplete();
    } else {
        speak('ちがうよ');
    }
};

const checkComplete = () => {
    if (document.querySelectorAll('.slot.filled').length === 12) {
        document.getElementById('feedback').textContent = 'ぜんぶ せいかい！';
        speak('すごい！ぜんぶ せいかいだよ！');
    }
};

// イベント登録
document.getElementById('learn-btn').onclick = initLearnMode;
document.getElementById('quiz-btn').onclick = initQuizMode;
document.getElementById('retry-btn').onclick = initQuizMode;
document.getElementById('back-home').onclick = () => showScreen('home-screen');
document.getElementById('back-home-quiz').onclick = () => showScreen('home-screen');
