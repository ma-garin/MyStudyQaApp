// js/srs.js - 間隔反復（SRS）スケジューラ
//
// SM-2 を簡略化した方式で、解答時の確信度（4段階）から次回出題日を決める。
// 設計方針:
// - 純粋関数（schedule / buildQueue / previewInterval）を中心に据え、テスト可能にする。
// - 状態は資格ごとに localStorage キー `${certId}_srs_cards` に保存する。
// - 日付は UTC の YYYY-MM-DD 文字列で扱い、ローカルタイムのずれを避ける。

import { getSelectedCert } from './certifications.js';
import { certKey, SUFFIXES } from './storage.js';

// 確信度の評価値。値が大きいほど「よく覚えていた」。
export const RATINGS = { AGAIN: 0, HARD: 1, GOOD: 2, EASY: 3 };

const MIN_EASE = 1.3;
const DEFAULT_EASE = 2.5;

// 1日に導入する新規カードの上限（Anki の new cards/day に相当）。
export const NEW_CARDS_PER_DAY = 10;

export function todayStr(date = new Date()) {
    return date.toISOString().slice(0, 10);
}

export function addDays(dateStr, days) {
    const d = new Date(`${dateStr}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
}

export function newCard() {
    return { ease: DEFAULT_EASE, interval: 0, reps: 0, lapses: 0, due: null };
}

// 純粋関数: カードと評価から、today を起点に再スケジュールした新カードを返す。
export function schedule(card, rating, today = todayStr()) {
    const base = { ...newCard(), ...card };
    const next = { ...base };

    if (rating === RATINGS.AGAIN) {
        next.reps = 0;
        next.lapses = base.lapses + 1;
        next.ease = Math.max(MIN_EASE, base.ease - 0.2);
        next.interval = 0;       // 同日中に再出題
        next.due = today;
        return next;
    }

    if (rating === RATINGS.HARD) next.ease = Math.max(MIN_EASE, base.ease - 0.15);
    else if (rating === RATINGS.EASY) next.ease = base.ease + 0.15;
    // GOOD は ease 据え置き

    let interval;
    if (base.reps === 0) {
        interval = rating === RATINGS.EASY ? 4 : 1;
    } else if (base.reps === 1) {
        interval = rating === RATINGS.HARD ? 3 : (rating === RATINGS.EASY ? 7 : 4);
    } else {
        const factor = rating === RATINGS.HARD ? 1.2 : (rating === RATINGS.EASY ? next.ease * 1.3 : next.ease);
        interval = Math.round(base.interval * factor);
    }
    interval = Math.max(1, interval);

    next.reps = base.reps + 1;
    next.interval = interval;
    next.due = addDays(today, interval);
    return next;
}

// 純粋関数: ある評価を選んだ場合の次回間隔（日数）。0 は「今日」。
export function previewInterval(card, rating, today = todayStr()) {
    return schedule(card || newCard(), rating, today).interval;
}

// 純粋関数: 今日復習すべきカードIDの並びを返す（期限到来分 → 新規を上限まで）。
export function buildQueue(state, allIds, today = todayStr(), newPerDay = NEW_CARDS_PER_DAY) {
    const due = [];
    const fresh = [];
    allIds.forEach(id => {
        const card = state[id];
        if (!card || card.due == null) fresh.push(id);
        else if (card.due <= today) due.push(id);
    });
    due.sort((a, b) => (state[a].due < state[b].due ? -1 : state[a].due > state[b].due ? 1 : 0));
    return [...due, ...fresh.slice(0, newPerDay)];
}

export function countDue(state, allIds, today = todayStr(), newPerDay = NEW_CARDS_PER_DAY) {
    return buildQueue(state, allIds, today, newPerDay).length;
}

// --- localStorage 連携（副作用あり） ---

export function loadState(certId = getSelectedCert()) {
    try {
        const value = JSON.parse(localStorage.getItem(certKey(certId, SUFFIXES.srsCards)) || '{}');
        return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    } catch {
        return {};
    }
}

export function saveState(state, certId = getSelectedCert()) {
    localStorage.setItem(certKey(certId, SUFFIXES.srsCards), JSON.stringify(state));
}

// カードを評価して保存し、更新後カードを返す。
export function rateCard(questionId, rating, certId = getSelectedCert(), today = todayStr()) {
    const state = loadState(certId);
    const updated = schedule(state[questionId] || newCard(), rating, today);
    state[questionId] = updated;
    saveState(state, certId);
    return updated;
}
