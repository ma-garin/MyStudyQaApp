import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../js/utils.js', () => ({
    setupCommonNavigation: vi.fn(() => {
        // 本物の injectRightsDisclaimer の要点を再現:
        // 既存の #rights-safety-disclaimer が無ければ注入する。
        if (!document.getElementById('rights-safety-disclaimer')) {
            const aside = document.createElement('aside');
            aside.id = 'rights-safety-disclaimer';
            aside.textContent = '本アプリは個人制作の非公式教材です。';
            document.body.appendChild(aside);
        }
    }),
}));

const store = {};
vi.stubGlobal('localStorage', {
    getItem: k => store[k] ?? null,
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: k => { delete store[k]; },
});

import '../js/landing.js';

function renderBody() {
    document.body.innerHTML = `
        <div class="cert-cards cert-cards--landing" id="cert-cards"></div>
        <button id="start-button" disabled></button>`;
}

async function boot() {
    document.dispatchEvent(new Event('DOMContentLoaded'));
    await new Promise(r => setTimeout(r, 0));
}

describe('ランディング画面（landing.js）', () => {
    beforeEach(() => {
        Object.keys(store).forEach(k => delete store[k]);
        renderBody();
    });

    it('5つの資格カードを描画する', async () => {
        await boot();
        const cards = document.querySelectorAll('#cert-cards .cert-card');
        expect(cards.length).toBe(5);
    });

    it('既定（fl）が選択済みで開始ボタンが有効', async () => {
        await boot();
        expect(document.querySelector('[data-cert-id="fl"]').classList.contains('cert-card--active')).toBe(true);
        expect(document.getElementById('start-button').disabled).toBe(false);
    });

    it('カード選択で active が切り替わり localStorage に保存される', async () => {
        await boot();
        document.querySelector('[data-cert-id="alta"]').click();
        expect(document.querySelector('[data-cert-id="alta"]').classList.contains('cert-card--active')).toBe(true);
        expect(document.querySelector('[data-cert-id="fl"]').classList.contains('cert-card--active')).toBe(false);
        expect(localStorage.getItem('qa_selected_cert')).toBe('alta');
    });

    it('免責文が注入される（空 aside による表示欠落の回帰防止）', async () => {
        await boot();
        const aside = document.getElementById('rights-safety-disclaimer');
        expect(aside).not.toBeNull();
        expect(aside.textContent.length).toBeGreaterThan(0);
    });
});
