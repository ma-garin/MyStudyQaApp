import { describe, expect, it } from 'vitest';
import {
    RATINGS,
    addDays,
    buildQueue,
    countDue,
    newCard,
    previewInterval,
    schedule,
} from '../js/srs.js';

const TODAY = '2026-06-13';

describe('addDays', () => {
    it('日付をまたいで正しく加算する', () => {
        expect(addDays('2026-06-13', 1)).toBe('2026-06-14');
        expect(addDays('2026-06-30', 1)).toBe('2026-07-01');
        expect(addDays('2026-06-13', 0)).toBe('2026-06-13');
    });
});

describe('schedule', () => {
    it('AGAIN は当日に再出題し、ease を下げ lapse を増やす', () => {
        const card = { ease: 2.5, interval: 10, reps: 3, lapses: 0, due: TODAY };
        const next = schedule(card, RATINGS.AGAIN, TODAY);
        expect(next.interval).toBe(0);
        expect(next.due).toBe(TODAY);
        expect(next.reps).toBe(0);
        expect(next.lapses).toBe(1);
        expect(next.ease).toBeCloseTo(2.3, 5);
    });

    it('新規カードの GOOD は翌日、EASY は4日後', () => {
        expect(schedule(newCard(), RATINGS.GOOD, TODAY).interval).toBe(1);
        expect(schedule(newCard(), RATINGS.EASY, TODAY).interval).toBe(4);
        expect(schedule(newCard(), RATINGS.GOOD, TODAY).due).toBe('2026-06-14');
    });

    it('2回目以降は interval に ease を掛けて伸ばす', () => {
        const card = { ease: 2.5, interval: 4, reps: 2, lapses: 0, due: TODAY };
        const next = schedule(card, RATINGS.GOOD, TODAY);
        expect(next.interval).toBe(10); // round(4 * 2.5)
        expect(next.reps).toBe(3);
    });

    it('EASY は ease を上げ、HARD は下げる（下限1.3）', () => {
        expect(schedule({ ...newCard(), reps: 2, interval: 4 }, RATINGS.EASY, TODAY).ease).toBeCloseTo(2.65, 5);
        expect(schedule({ ...newCard(), ease: 1.3, reps: 2, interval: 4 }, RATINGS.HARD, TODAY).ease).toBe(1.3);
    });

    it('元のカードを破壊しない', () => {
        const card = newCard();
        schedule(card, RATINGS.GOOD, TODAY);
        expect(card.reps).toBe(0);
        expect(card.due).toBeNull();
    });
});

describe('previewInterval', () => {
    it('各評価の次回間隔を返す', () => {
        expect(previewInterval(newCard(), RATINGS.AGAIN, TODAY)).toBe(0);
        expect(previewInterval(newCard(), RATINGS.GOOD, TODAY)).toBe(1);
        expect(previewInterval(newCard(), RATINGS.EASY, TODAY)).toBe(4);
    });

    it('null カードでも new card として扱う', () => {
        expect(previewInterval(null, RATINGS.GOOD, TODAY)).toBe(1);
    });
});

describe('buildQueue', () => {
    const allIds = ['q1', 'q2', 'q3', 'q4'];

    it('期限到来カードを先頭に、新規カードを後ろに並べる', () => {
        const state = {
            q1: { ...newCard(), due: '2026-06-10', reps: 2, interval: 3 }, // 期限切れ
            q2: { ...newCard(), due: '2026-06-20', reps: 2, interval: 7 }, // 未来
            // q3, q4 は未学習（新規）
        };
        const queue = buildQueue(state, allIds, TODAY, 10);
        expect(queue).toEqual(['q1', 'q3', 'q4']);
    });

    it('新規カードは newPerDay で上限を設ける', () => {
        const queue = buildQueue({}, allIds, TODAY, 2);
        expect(queue).toEqual(['q1', 'q2']);
    });

    it('当日が期限のカードは含める', () => {
        const state = { q1: { ...newCard(), due: TODAY, reps: 1, interval: 1 } };
        expect(buildQueue(state, ['q1'], TODAY, 0)).toEqual(['q1']);
    });
});

describe('countDue', () => {
    it('キュー長を返す', () => {
        expect(countDue({}, ['q1', 'q2', 'q3'], TODAY, 2)).toBe(2);
    });
});
