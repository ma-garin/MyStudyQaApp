// js/main.js - ホーム画面の初期化
import { setupCommonNavigation, setupBackToTopButtons, fetchQuestions } from './utils.js';
import { getDashboardStats, getWrongQuestionIds } from './progress.js';
import { topicMaps } from './topicMap.js';
import { getCertById, getSelectedCert } from './certifications.js';
import { certKey, SUFFIXES } from './storage.js';
import { aggregateChapterStats } from './chapterStats.js';
import { countDue, loadState as loadSrsState } from './srs.js';

document.addEventListener('DOMContentLoaded', async () => {
    setupCommonNavigation();
    setupBackToTopButtons();
    await renderDashboard();
});

function readStoredIds(key) {
    try {
        const value = JSON.parse(localStorage.getItem(key) || '[]');
        return Array.isArray(value) ? value : [];
    } catch {
        return [];
    }
}

function renderChapterHeatmap(questions, certId, map) {
    const section = document.getElementById('chapter-heatmap-section');
    const container = document.getElementById('chapter-heatmap');
    if (!section || !container) return;

    const answeredIds = readStoredIds(certKey(certId, SUFFIXES.answeredIds));
    const stats = aggregateChapterStats(questions, answeredIds, getWrongQuestionIds());
    container.textContent = '';
    section.hidden = stats.length === 0;
    if (!stats.length) return;

    stats.forEach(stat => {
        const tile = document.createElement('button');
        const level = stat.achievement >= 75 ? 'high' : stat.achievement >= 40 ? 'medium' : 'low';
        const chapterInfo = map.find(item => String(item.chapter) === stat.chapter);
        tile.type = 'button';
        tile.className = `chapter-heatmap-tile chapter-heatmap-tile--${level}`;
        tile.setAttribute('aria-label', `${stat.chapter}章 ${chapterInfo?.title || ''} ${stat.achievement}%`);

        const chapter = document.createElement('span');
        chapter.className = 'chapter-heatmap-number';
        chapter.textContent = `${stat.chapter}章`;
        const achievement = document.createElement('strong');
        achievement.className = 'chapter-heatmap-value';
        achievement.textContent = `${stat.achievement}%`;
        const detail = document.createElement('span');
        detail.className = 'chapter-heatmap-detail';
        detail.textContent = `回答 ${stat.answered}/${stat.total}`;

        tile.append(chapter, achievement, detail);
        tile.addEventListener('click', () => {
            window.location.href = `study.html?chapter=${encodeURIComponent(stat.chapter)}`;
        });
        container.appendChild(tile);
    });
}

async function renderDashboard() {
    const certId = getSelectedCert();
    const cert = getCertById(certId);
    const map = topicMaps[cert.id] || topicMaps.fl;

    const questions = await fetchQuestions();
    const totalQuestions = questions.length;
    const { todayAnswered, todayCorrect, accuracy, streak, totalAnswered } = getDashboardStats();

    const setText = (id, text) => {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    };
    setText('action-desc-quiz', `${cert.name}の自作問題 ${totalQuestions}問で確認`);
    setText('action-desc-problems', `全${totalQuestions}問・独自解説付き`);
    setText('action-desc-syllabus', `${cert.name}: ${map.length}章のマップとレッスン`);
    setText('info-syllabus-version', `${cert.fullName} ・ 自作問題${totalQuestions}問`);
    setText('greeting-sub', cert.fullName);
    setText('action-title-study', totalAnswered > 0 ? '学習を続ける' : '学習を始める');
    setText('stat-answered', todayAnswered);
    setText('stat-correct', todayCorrect);
    setText('stat-accuracy', accuracy !== null ? `${accuracy}%` : '—');
    setText('streak-count', streak);

    const pct = totalQuestions > 0 ? Math.min(Math.round((totalAnswered / totalQuestions) * 100), 100) : 0;
    const bar = document.getElementById('progress-bar-fill');
    if (bar) bar.style.width = `${pct}%`;
    setText('progress-note', `全${totalQuestions}問中 ${Math.min(totalAnswered, totalQuestions)}問 回答済み`);

    const weakBadge = document.getElementById('weak-badge');
    if (weakBadge) {
        const wrongCount = getWrongQuestionIds().length;
        weakBadge.textContent = `復習 ${wrongCount}問`;
        weakBadge.style.display = wrongCount > 0 ? 'inline-block' : 'none';
    }

    const dueCount = countDue(loadSrsState(certId), questions.map(q => q.id));
    const reviewBadge = document.getElementById('review-badge');
    if (reviewBadge) {
        reviewBadge.textContent = `${dueCount}枚`;
        reviewBadge.style.display = dueCount > 0 ? 'inline-block' : 'none';
    }
    setText('review-desc', dueCount > 0
        ? `${dueCount}枚が復習タイミングです`
        : '間隔反復で記憶を定着');

    renderChapterHeatmap(questions, certId, map);
}
