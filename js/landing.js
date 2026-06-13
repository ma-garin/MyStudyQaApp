// js/landing.js - ランディングページの初期化と資格選択
import { setupCommonNavigation } from './utils.js';
import { CERTIFICATIONS, setSelectedCert } from './certifications.js';

document.addEventListener('DOMContentLoaded', () => {
    setupCommonNavigation();
    renderCertList();
});

function renderCertList() {
    const list = document.getElementById('cert-list');
    if (!list) return;

    CERTIFICATIONS.forEach(cert => {
        const li = document.createElement('li');
        li.className = 'cert-list-item' + (!cert.available ? ' cert-list-item--disabled' : '');

        const nameArea = document.createElement('span');
        nameArea.className = 'cert-list-name';

        const nameEl = document.createElement('span');
        nameEl.className = 'cert-list-cert-name';
        nameEl.textContent = cert.name;

        const levelEl = document.createElement('span');
        levelEl.className = `cert-card-level cert-card-level--${cert.level}`;
        levelEl.textContent = levelLabel(cert.level);

        nameArea.append(nameEl, levelEl);

        const descEl = document.createElement('span');
        descEl.className = 'cert-list-desc';
        descEl.textContent = cert.available ? cert.description : '近日公開';

        const metaArea = document.createElement('span');
        metaArea.className = 'cert-list-meta';

        if (cert.available) {
            const countEl = document.createElement('span');
            countEl.className = 'cert-list-count';
            countEl.textContent = `${cert.questionCount}問`;
            metaArea.appendChild(countEl);
        }

        const arrowEl = document.createElement('span');
        arrowEl.className = 'material-icons cert-list-arrow';
        arrowEl.setAttribute('aria-hidden', 'true');
        arrowEl.textContent = 'chevron_right';
        metaArea.appendChild(arrowEl);

        li.append(nameArea, descEl, metaArea);

        if (cert.available) {
            li.setAttribute('role', 'button');
            li.setAttribute('tabindex', '0');
            li.setAttribute('aria-label', `${cert.name}（${levelLabel(cert.level)}）${cert.questionCount}問`);
            li.addEventListener('click', () => selectAndGo(cert.id));
            li.addEventListener('keydown', e => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectAndGo(cert.id); }
            });
        }

        list.appendChild(li);
    });
}

function selectAndGo(certId) {
    setSelectedCert(certId);
    window.location.href = 'index.html';
}

function levelLabel(level) {
    const labels = { foundation: '基礎', advanced: '上級', specialist: '専門' };
    return labels[level] || level;
}
