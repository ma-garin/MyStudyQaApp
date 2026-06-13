// js/registerSW.js — Service Worker 登録（全ページ共通）
//
// setupCommonNavigation() から呼ばれる。ビルド無しで 13 ページに配線するための共有モジュール。
// 注意:
// - 相対パス 'sw.js' と scope './' で登録する。絶対 '/sw.js' は GitHub Pages の
//   サブパス配信（/MyStudyQaApp/）で scope を外すため使わない。
// - serviceWorker 非対応環境（jsdom 等）では何もしない。import 時点では副作用なし。

export function registerServiceWorker() {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    window.addEventListener('load', () => {
        navigator.serviceWorker
            .register('sw.js', { scope: './', updateViaCache: 'none' })
            .catch(err => console.warn('Service Worker の登録に失敗しました:', err));
    });
}
