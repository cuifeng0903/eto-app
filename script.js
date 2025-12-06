// （前半はVer.1.2と同じ）

// チャレンジモード（重要修正：スクロール位置リセット＋ボタン管理）
const startChallenge = () => {
    difficulty = +document.getElementById('difficulty').value;
    localStorage.setItem('lastDifficulty', difficulty);
    const count = difficulty === 4 ? 12 : difficulty * 3;
    const emptyIndices = Array.from({length:12},(_,i)=>i).sort(()=>Math.random()-0.5).slice(0,count);

    showScreen('challenge-screen');
    document.getElementById('result-overlay').classList.add('hidden');
    
    // 重要：ボタンを必ず「かくにん！」に戻す
    const checkBtn = document.getElementById('check-btn');
    checkBtn.textContent = 'かくにん！';
    checkBtn.classList.remove('retry');
    checkBtn.onclick = null; // 前の再挑戦関数があれば削除
    checkBtn.onclick = checkAnswer; // 正しく判定関数を再設定

    // 花火リセット
    canvas.classList.remove('active');
    particles = [];
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // スクロール位置を左端に強制リセット
    const scrollContainer = document.getElementById('scroll-container');
    scrollContainer.scrollLeft = 0;

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

// 正解判定関数（独立させて再利用可能に）
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

    if (allCorrect) {
        overlay.textContent = '○';
        overlay.className = 'correct';
        seCorrect.currentTime = 0;
        seCorrect.play();

        // 花火を確実に表示
        canvas.classList.add('active');
        for (let i = 0; i < 8; i++) {
            setTimeout(createFirework, i * 250);
        }
        drawFireworks();

        // ボタンを「もう１かい」に変更
        const btn = document.getElementById('check-btn');
        btn.textContent = 'もう１かい';
        btn.classList.add('retry');
        btn.onclick = startChallenge; // 再挑戦

        setTimeout(() => overlay.classList.add('hidden'), 4000);
    } else {
        overlay.textContent = '×';
        overlay.className = 'wrong';
        seWrong.currentTime = 0;
        seWrong.play();

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

// イベント登録（check-btnはstartChallenge内で動的に設定）
document.getElementById('slide-btn').onclick = startSlide;
document.getElementById('challenge-btn').onclick = startChallenge;
document.getElementById('back-home1').onclick = () => showScreen('home-screen');
document.getElementById('back-home2').onclick = () => showScreen('home-screen');
