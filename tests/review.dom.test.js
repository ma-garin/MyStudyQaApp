import { beforeEach, describe, expect, it, vi } from 'vitest';

// 依存モジュールをモックして、review.js のDOM配線とSRS連携だけを検証する。
vi.mock('../js/certifications.js', () => ({
    getSelectedCert: () => 'fl',
    getCertById: () => ({ name: 'FL', dataFile: 'questionsData_fl' }),
}));

const sampleQuestions = [
    { id: 'fl-001', topic: 'T', loCode: '', kLevel: 'K1', question: 'Q1', choices: ['a', 'b', 'c', 'd'], correctAnswerIndex: 0, explanation: 'E1' },
    { id: 'fl-002', topic: 'T', loCode: '', kLevel: 'K1', question: 'Q2', choices: ['a', 'b', 'c', 'd'], correctAnswerIndex: 1, explanation: 'E2' },
];

vi.mock('../js/utils.js', () => ({
    setupCommonNavigation: vi.fn(),
    setTextWithBreaks: (el, t) => { el.textContent = t; },
    fetchQuestions: vi.fn(async () => sampleQuestions),
}));

const recordAnswer = vi.fn();
vi.mock('../js/progress.js', () => ({
    recordAnswer: (...a) => recordAnswer(...a),
    addWrongQuestion: vi.fn(),
    removeCorrectQuestion: vi.fn(),
}));

import '../js/review.js';
import { loadState } from '../js/srs.js';

function renderBody() {
    document.body.innerHTML = `
        <span id="review-remaining"></span>
        <span id="review-cert-name"></span>
        <div id="review-progress-fill"></div>
        <div id="review-question-container">
            <p id="review-meta"></p>
            <p id="review-question-text"></p>
            <div id="review-options-container">
                <label class="option-label"><input type="radio" name="review-answer" value="a"><span class="option-text"></span></label>
                <label class="option-label"><input type="radio" name="review-answer" value="b"><span class="option-text"></span></label>
                <label class="option-label"><input type="radio" name="review-answer" value="c"><span class="option-text"></span></label>
                <label class="option-label"><input type="radio" name="review-answer" value="d"><span class="option-text"></span></label>
            </div>
            <p id="review-answer-warning" class="hidden"></p>
            <button id="review-submit-button"></button>
        </div>
        <div id="review-feedback-container" class="hidden">
            <p id="review-result-message"></p>
            <p id="review-explanation-text"></p>
            <div id="srs-rating">
                <button class="srs-btn" data-rating="0"><span class="srs-btn-interval"></span></button>
                <button class="srs-btn" data-rating="1"><span class="srs-btn-interval"></span></button>
                <button class="srs-btn" data-rating="2"><span class="srs-btn-interval"></span></button>
                <button class="srs-btn" data-rating="3"><span class="srs-btn-interval"></span></button>
            </div>
        </div>
        <div id="review-complete" class="hidden">
            <h2 id="review-complete-title"></h2>
            <p id="review-complete-sub"></p>
        </div>`;
}

async function boot() {
    document.dispatchEvent(new Event('DOMContentLoaded'));
    await new Promise(r => setTimeout(r, 0));
    await new Promise(r => setTimeout(r, 0));
}

function answerAndRate(value, ratingSelector) {
    document.querySelector(`input[value="${value}"]`).checked = true;
    document.getElementById('review-submit-button').click();
    document.querySelector(ratingSelector).click();
}

describe('復習画面（review.js）', () => {
    beforeEach(() => {
        localStorage.clear();
        recordAnswer.mockClear();
        renderBody();
    });

    it('新規カードのキューを構築し最初の問題を表示する', async () => {
        await boot();
        expect(document.getElementById('review-question-text').textContent).toBe('Q1');
        expect(document.getElementById('review-remaining').textContent).toBe('2');
        expect(document.getElementById('review-cert-name').textContent).toBe('FL');
    });

    it('解答するとフィードバックと確信度の間隔プレビューを表示する', async () => {
        await boot();
        document.querySelector('input[value="a"]').checked = true; // 正解
        document.getElementById('review-submit-button').click();
        expect(document.getElementById('review-feedback-container').classList.contains('hidden')).toBe(false);
        expect(document.getElementById('review-result-message').textContent).toContain('正解');
        // 「できた」(GOOD) の新規カード間隔は1日
        expect(document.querySelector('[data-rating="2"] .srs-btn-interval').textContent).toBe('1日');
        expect(recordAnswer).toHaveBeenCalledWith(true, 'fl-001');
    });

    it('評価すると次のカードへ進み、SRS状態を保存する', async () => {
        await boot();
        answerAndRate('a', '[data-rating="2"]'); // Q1 を「できた」
        expect(document.getElementById('review-question-text').textContent).toBe('Q2');
        expect(document.getElementById('review-remaining').textContent).toBe('1');
        const state = loadState('fl');
        expect(state['fl-001'].reps).toBe(1);
        expect(state['fl-001'].interval).toBe(1);
    });

    it('「もう一度」は同セッション内で再出題する', async () => {
        await boot();
        answerAndRate('b', '[data-rating="0"]'); // Q1 を不正解＋もう一度
        // Q1 はキュー末尾へ回るため、次は Q2、残りは2のまま
        expect(document.getElementById('review-question-text').textContent).toBe('Q2');
        expect(document.getElementById('review-remaining').textContent).toBe('2');
    });

    it('全カード評価後に完了画面を表示する', async () => {
        await boot();
        answerAndRate('a', '[data-rating="2"]'); // Q1
        answerAndRate('b', '[data-rating="2"]'); // Q2
        expect(document.getElementById('review-complete').classList.contains('hidden')).toBe(false);
        expect(document.getElementById('review-complete-title').textContent).toContain('完了');
        expect(document.getElementById('review-complete-sub').textContent).toContain('2 枚');
    });
});
