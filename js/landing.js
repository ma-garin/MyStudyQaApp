// js/landing.js - ランディングページの初期化と資格選択
import { setupCommonNavigation } from './utils.js';
import { CERTIFICATIONS, getSelectedCert, setSelectedCert } from './certifications.js';

document.addEventListener('DOMContentLoaded', () => {
    setupCommonNavigation();
    renderCertSelector();
    setupStartButton();
});

function renderCertSelector() {
    const container = document.getElementById('cert-cards');
    if (!container) return;
    const selectedId = getSelectedCert();

    container.textContent = '';
    CERTIFICATIONS.forEach(cert => {
        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'cert-card' + (cert.id === selectedId ? ' cert-card--active' : '') + (!cert.available ? ' cert-card--disabled' : '');
        card.disabled = !cert.available;
        card.setAttribute('data-cert-id', cert.id);

        const nameEl = document.createElement('span');
        nameEl.className = 'cert-card-name';
        nameEl.textContent = cert.name;

        const levelEl = document.createElement('span');
        levelEl.className = `cert-card-level cert-card-level--${cert.level}`;
        levelEl.textContent = levelLabel(cert.level);

        const descEl = document.createElement('span');
        descEl.className = 'cert-card-desc';
        descEl.textContent = cert.description;

        const statusEl = document.createElement('span');
        if (cert.available) {
            statusEl.className = 'cert-card-count';
            statusEl.textContent = `${cert.questionCount}問`;
        } else {
            statusEl.className = 'cert-card-coming';
            statusEl.textContent = '近日公開';
        }

        card.append(nameEl, levelEl, descEl, statusEl);
        card.addEventListener('click', () => {
            handleCertSelect(cert.id, container);
        });
        container.appendChild(card);
    });
}

function handleCertSelect(certId, container) {
    setSelectedCert(certId);
    container.querySelectorAll('.cert-card').forEach(c => c.classList.remove('cert-card--active'));
    container.querySelector(`[data-cert-id="${certId}"]`).classList.add('cert-card--active');
    enableStartButton();
}

function enableStartButton() {
    const button = document.getElementById('start-button');
    if (button) {
        button.disabled = false;
    }
}

function setupStartButton() {
    const button = document.getElementById('start-button');
    if (!button) return;

    // 起動時に選択済みなら開始ボタンを有効化
    const selectedId = getSelectedCert();
    if (selectedId) {
        button.disabled = false;
    }

    button.addEventListener('click', () => {
        window.location.href = 'index.html';
    });
}

function levelLabel(level) {
    const labels = { foundation: '基礎', advanced: '上級', specialist: '専門' };
    return labels[level] || level;
}
