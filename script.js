// （前半部分は変更なし：zodiac、変数宣言、効果音、花火関数、初期化など）

/* 正解判定（重要修正：再挑戦時も判定関数を維持） */
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

        // ここが大事！onclickは判定のまま！
        btn.textContent = 'もう１かい';
        btn.classList.add('retry');
        // onclickはそのままcheckAnswer（上書きしない！）
        // 代わりに再挑戦は別の方法で実行
        btn.onclick = () => {
            startChallenge(); // 再挑戦実行
            // 再挑戦後にボタンを「かくにん！」に戻す処理はstartChallenge内で実施
        };

        setTimeout(() => overlay.classList.add('hidden'), 4000);
    } else {
        overlay.textContent = '×';
        overlay.className = 'wrong';
        seWrong.currentTime = 0;
        seWrong.play();
        speak('がんばろう！');

        setTimeout(() => {
            overlay.classList.add('hidden');
            wrongs.forEach(slot => {
                slot.classList.add('wrong-flash');
                const img = slot.style.backgroundImage;
                const name = slot.dataset.name;
                setTimeout(() => {
                    slot.style.backgroundImage = '';
                    slot.classList.remove('filled', 'wrong-flash');
                    delete slot.dataset.name;
                    if (img && name) {
                        createOption({ name, image: img.slice(5, -2) });
                    }
                }, 2000);
            });
        }, 2000);
    }
};

// startChallenge内でボタンを必ず「かくにん！」に戻す（再挑戦時も安全）
const startChallenge = () => {
    difficulty = +document.getElementById('difficulty').value;
    localStorage.setItem('lastDifficulty', difficulty);
    const count = difficulty === 4 ? 12 : difficulty * 3;
    emptySlots = Array.from({length:12}, (_,i) => i).sort(() => Math.random() - 0.5).slice(0, count);

    showScreen('challenge-screen');
    document.getElementById('result-overlay').classList.add('hidden');

    const btn = document.getElementById('check-btn');
    btn.textContent = 'かくにん！';        // 必ず「かくにん！」
    btn.classList.remove('retry');         // スタイルも戻す
    btn.onclick = checkAnswer;             // 判定関数を確実に設定

    canvas.classList.remove('active');
    particles = [];
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    document.getElementById('scroll-container').scrollLeft = 0;

    // （以降、スロット・選択肢生成ロジックは前回と同じ）
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
