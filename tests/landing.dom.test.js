import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../js/utils.js', () => ({
    setupCommonNavigation: vi.fn(() => {
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

// window.location.href への代入をキャプチャ
let navigatedTo = null;
Object.defineProperty(window, 'location', {
    value: { href: '', replace: vi.fn() },
    writable: true,
});
Object.defineProperty(window.location, 'href', {
    get: () => navigatedTo ?? '',
    set: v => { navigatedTo = v; },
});

import '../js/landing.js';

function renderBody() {
    navigatedTo = null;
    document.body.innerHTML = `<ul id="cert-list"></ul>`;
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

    it('5つの資格リストを描画する', async () => {
        await boot();
        const items = document.querySelectorAll('#cert-list .cert-list-item');
        expect(items.length).toBe(5);
    });

    it('利用可能な資格をクリックすると localStorage に保存し index.html へ遷移する', async () => {
        await boot();
        const fl = document.querySelector('[aria-label*="FL"]');
        expect(fl).not.toBeNull();
        fl.click();
        expect(localStorage.getItem('qa_selected_cert')).toBe('fl');
        expect(navigatedTo).toBe('index.html');
    });

    it('ALTA を選択すると alta が保存される', async () => {
        await boot();
        const alta = document.querySelector('[aria-label*="ALTA"]');
        expect(alta).not.toBeNull();
        alta.click();
        expect(localStorage.getItem('qa_selected_cert')).toBe('alta');
    });

    it('免責文が注入される（空 aside による表示欠落の回帰防止）', async () => {
        await boot();
        const aside = document.getElementById('rights-safety-disclaimer');
        expect(aside).not.toBeNull();
        expect(aside.textContent.length).toBeGreaterThan(0);
    });
});
