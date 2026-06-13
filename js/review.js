// js/review.js - 今日の復習（間隔反復）ページ
import { setupCommonNavigation, setTextWithBreaks, fetchQuestions } from './utils.js';
import { recordAnswer, addWrongQuestion, removeCorrectQuestion } from './progress.js';
import { getCertById, getSelectedCert } from './certifications.js';
import {
    RATINGS,
    buildQueue,
    loadState,
    previewInterval,
    rateCard,
    todayStr,
} from './srs.js';

const VALUE_TO_INDEX = { a: 0, b: 1, c: 2, d: 3 };

function intervalLabel(days) {
    if (days <= 0) return '今日';
    if (days >= 30) return `${Math.round(days / 30)}か月`;
    return `${days}日`;
}

document.addEventListener('DOMContentLoaded', async () => {
    setupCommonNavigation();

    const certId = getSelectedCert();
    const certName = getCertById(certId)?.name || '-';
    const today = todayStr();

    const els = {
        remaining: document.getElementById('review-remaining'),
        certName: document.getElementById('review-cert-name'),
        progressFill: document.getElementById('review-progress-fill'),
        questionContainer: document.getElementById('review-question-container'),
        meta: document.getElementById('review-meta'),
        questionText: document.getElementById('review-question-text'),
        optionsContainer: document.getElementById('review-options-container'),
        warning: document.getElementById('review-answer-warning'),
        submitBtn: document.getElementById('review-submit-button'),
        feedback: document.getElementById('review-feedback-container'),
        resultMessage: document.getElementById('review-result-message'),
        explanation: document.getElementById('review-explanation-text'),
        rating: document.getElementById('srs-rating'),
        complete: document.getElementById('review-complete'),
        completeTitle: document.getElementById('review-complete-title'),
        completeSub: document.getElementById('review-complete-sub'),
    };
    const optionLabels = [...els.optionsContainer.querySelectorAll('.option-label')];
    const optionInputs = [...els.optionsContainer.querySelectorAll('input[type="radio"]')];
    const optionTexts = [...els.optionsContainer.querySelectorAll('.option-text')];
    const ratingButtons = [...els.rating.querySelectorAll('.srs-btn')];

    if (els.certName) els.certName.textContent = certName;

    const questions = await fetchQuestions(certId);
    const questionsById = Object.fromEntries(questions.map(q => [q.id, q]));
    const allIds = questions.map(q => q.id);
    const state = loadState(certId);

    let queue = buildQueue(state, allIds, today);
    const initialTotal = queue.length;
    let reviewedCount = 0;
    let currentId = null;
    let lastCorrect = false;

    els.submitBtn.addEventListener('click', submitAnswer);
    ratingButtons.forEach(btn => {
        btn.addEventListener('click', () => rate(Number(btn.dataset.rating)));
    });

    loadNext();

    function loadNext() {
        els.feedback.classList.add('hidden');
        els.submitBtn.classList.remove('hidden');
        els.warning.classList.add('hidden');
        optionLabels.forEach(l => l.classList.remove('correct', 'incorrect'));
        optionInputs.forEach(i => { i.checked = false; i.disabled = false; });

        if (queue.length === 0) {
            showComplete();
            return;
        }

        currentId = queue[0];
        const q = questionsById[currentId];
        if (!q) { // データ不整合のカードはスキップ
            queue.shift();
            loadNext();
            return;
        }

        if (els.remaining) els.remaining.textContent = String(queue.length);
        const done = reviewedCount;
        const pct = initialTotal ? Math.round((done / (done + queue.length)) * 100) : 0;
        if (els.progressFill) els.progressFill.style.width = `${pct}%`;

        els.meta.textContent = [q.topic, q.loCode, q.kLevel].filter(Boolean).join(' ・ ');
        setTextWithBreaks(els.questionText, q.question);
        q.choices.forEach((choice, i) => {
            if (optionTexts[i]) setTextWithBreaks(optionTexts[i], choice);
        });
    }

    function submitAnswer() {
        const selected = els.optionsContainer.querySelector('input[name="review-answer"]:checked');
        if (!selected) {
            els.warning.classList.remove('hidden');
            return;
        }
        els.warning.classList.add('hidden');

        const q = questionsById[currentId];
        const userAnswer = VALUE_TO_INDEX[selected.value];
        const correctAnswer = q.correctAnswerIndex;
        lastCorrect = userAnswer === correctAnswer;

        els.resultMessage.textContent = lastCorrect ? '正解です！' : '不正解です。';
        els.resultMessage.style.color = lastCorrect ? 'var(--success)' : 'var(--error)';
        setTextWithBreaks(els.explanation, q.explanation);

        optionInputs.forEach(inp => {
            inp.disabled = true;
            const val = VALUE_TO_INDEX[inp.value];
            if (val === correctAnswer) inp.parentElement.classList.add('correct');
            else if (val === userAnswer) inp.parentElement.classList.add('incorrect');
        });

        // 解答は通常クイズと同様に進捗・苦手リストへ反映する
        recordAnswer(lastCorrect, currentId);
        if (lastCorrect) removeCorrectQuestion(currentId);
        else addWrongQuestion(currentId);

        // 各確信度ボタンに次回間隔のプレビューを表示
        const card = state[currentId];
        ratingButtons.forEach(btn => {
            const rating = Number(btn.dataset.rating);
            const span = btn.querySelector('.srs-btn-interval');
            if (span) span.textContent = intervalLabel(previewInterval(card, rating, today));
        });

        els.submitBtn.classList.add('hidden');
        els.feedback.classList.remove('hidden');
    }

    function rate(rating) {
        const updated = rateCard(currentId, rating, certId, today);
        state[currentId] = updated; // ローカル state を最新化（以降のプレビュー用）

        queue.shift();
        if (rating === RATINGS.AGAIN) {
            queue.push(currentId); // 同セッション内で再出題
        } else {
            reviewedCount += 1;
        }
        loadNext();
    }

    function showComplete() {
        els.questionContainer.classList.add('hidden');
        els.feedback.classList.add('hidden');
        els.complete.classList.remove('hidden');
        if (els.progressFill) els.progressFill.style.width = '100%';
        if (els.remaining) els.remaining.textContent = '0';

        if (initialTotal === 0) {
            els.completeTitle.textContent = '今日の復習はありません';
            els.completeSub.textContent = '新しい問題を解くと、復習カードが追加されます。';
        } else {
            els.completeTitle.textContent = '今日の復習は完了です！';
            els.completeSub.textContent = `${reviewedCount} 枚を復習しました。お疲れさまでした。`;
        }
    }
});
