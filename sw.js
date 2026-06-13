// sw.js — QA Learning Trainer のオフライン対応 Service Worker
//
// 設計方針（docs と計画に準拠）:
// - GitHub Pages のサブパス配信（/MyStudyQaApp/）で動くよう、絶対パス '/' を使わず
//   すべて self.location 基準の相対 URL で解決する。
// - gtag（Google Analytics）はキャッシュもオフライン偽装もしない。
// - Google Fonts はデプロイで消さない専用キャッシュに stale-while-revalidate。
// - ナビゲーションは network-first（常に新しい HTML）、失敗時にキャッシュへフォールバック。
// - 同一オリジンの静的アセットは cache-first（バージョンで陳腐化を限定）。
// - 大きな問題/レッスンデータはプリキャッシュせず、開いた資格ぶんだけランタイムキャッシュ。

const VERSION = 'v2'; // リリースごとに手動更新（README 参照）
const APP_CACHE = `qa-app-${VERSION}`; // アプリシェル＋同一オリジン資産（デプロイで入替）
const FONT_CACHE = 'qa-fonts-v1'; // クロスオリジンの Google Fonts（デプロイで消さない）

// プリキャッシュはアプリシェルのみ。大型データ（questionsData_* / lessonsData_*）は含めない。
const PRECACHE_PATHS = [
    './',
    // ページ
    'landing.html',
    'index.html',
    'review.html',
    'ai-quiz.html',
    'privacy.html',
    'study.html',
    'quiz.html',
    'lesson.html',
    'glossary.html',
    'question.html',
    'result.html',
    'mock-exam.html',
    'settings.html',
    'syllabus.html',
    'release_notes.html',
    // スタイル
    'css/base.css',
    'css/layout.css',
    'css/components.css',
    'css/screens.css',
    // アイコン・マニフェスト
    'img/qa-learning-icon.svg',
    'manifest.json',
    // コア JS（大型データファイルは除外）
    'js/utils.js',
    'js/certifications.js',
    'js/migrations.js',
    'js/registerSW.js',
    'js/storage.js',
    'js/progress.js',
    'js/main.js',
    'js/landing.js',
    'js/srs.js',
    'js/review.js',
    'js/quiz.js',
    'js/quizEngine.js',
    'js/questionCard.js',
    'js/study.js',
    'js/lesson.js',
    'js/glossary.js',
    'js/glossaryData.js',
    'js/question.js',
    'js/result.js',
    'js/mock-exam.js',
    'js/settings.js',
    'js/syllabus.js',
    'js/chapterStats.js',
    'js/releaseNotesLoader.js',
    'js/topicMap.js',
    // データ（小さめ・常時参照）
    'data/release_notes.csv',
];

const ANALYTICS_HOSTS = new Set([
    'www.googletagmanager.com',
    'www.google-analytics.com',
    'google-analytics.com',
    'analytics.google.com',
]);

const FONT_HOSTS = new Set(['fonts.googleapis.com', 'fonts.gstatic.com']);

// self.location 基準で絶対化（サブパス配信でも正しく解決）
function toAbsolute(path) {
    return new URL(path, self.location).toString();
}

self.addEventListener('install', event => {
    event.waitUntil(
        (async () => {
            const cache = await caches.open(APP_CACHE);
            const urls = PRECACHE_PATHS.map(toAbsolute);
            await cache.addAll(urls);
            await self.skipWaiting();
        })()
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        (async () => {
            const keys = await caches.keys();
            await Promise.all(
                keys
                    // qa-app-* の旧バージョンのみ削除。qa-fonts-* は残す。
                    .filter(key => key.startsWith('qa-app-') && key !== APP_CACHE)
                    .map(key => caches.delete(key))
            );
            await self.clients.claim();
        })()
    );
});

self.addEventListener('fetch', event => {
    const { request } = event;

    // GET 以外は介入しない
    if (request.method !== 'GET') return;

    const url = new URL(request.url);

    // 1) 解析（gtag）は一切触らない。ブラウザの通常処理に任せる。
    if (ANALYTICS_HOSTS.has(url.hostname)) return;

    // 2) Google Fonts は専用キャッシュに stale-while-revalidate
    if (FONT_HOSTS.has(url.hostname)) {
        event.respondWith(staleWhileRevalidate(request, FONT_CACHE));
        return;
    }

    // 同一オリジンのみ以降の戦略を適用
    if (url.origin !== self.location.origin) return;

    // 3) ナビゲーションは network-first → キャッシュ → 最終 index.html
    if (request.mode === 'navigate') {
        event.respondWith(networkFirst(request));
        return;
    }

    // 4) 同一オリジンの静的アセット（css/js/img/manifest/データ）は cache-first
    event.respondWith(cacheFirst(request));
});

async function networkFirst(request) {
    const cache = await caches.open(APP_CACHE);
    try {
        const response = await fetch(request);
        if (response && response.ok) cache.put(request, response.clone());
        return response;
    } catch (err) {
        const cached = await cache.match(request);
        if (cached) return cached;
        const shell = await cache.match(toAbsolute('index.html'));
        if (shell) return shell;
        throw err;
    }
}

async function cacheFirst(request) {
    const cache = await caches.open(APP_CACHE);
    const cached = await cache.match(request);
    if (cached) return cached;
    const response = await fetch(request);
    // 正常な同一オリジン応答のみ保存（opaque/エラーは保存しない）
    if (response && response.ok && response.type === 'basic') {
        cache.put(request, response.clone());
    }
    return response;
}

async function staleWhileRevalidate(request, cacheName) {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(request);
    const network = fetch(request)
        .then(response => {
            if (response && (response.ok || response.type === 'opaque')) {
                cache.put(request, response.clone());
            }
            return response;
        })
        .catch(() => null);
    return cached || (await network) || fetch(request);
}
