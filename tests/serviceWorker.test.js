import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();

function readSwPrecachePaths() {
    const source = readFileSync(join(ROOT, 'sw.js'), 'utf8');
    const block = source.match(/const PRECACHE_PATHS = \[([\s\S]*?)\];/);
    expect(block).not.toBeNull();
    return [...block[1].matchAll(/'([^']+)'/g)].map(match => match[1]);
}

function rootHtmlFiles() {
    return readdirSync(ROOT).filter(name => name.endsWith('.html'));
}

describe('Service Worker', () => {
    it('プリキャッシュ対象のローカルファイルがすべて実在する', () => {
        const paths = readSwPrecachePaths();
        expect(paths.length).toBeGreaterThan(0);
        const missing = paths
            .filter(path => path !== './')
            .filter(path => !existsSync(join(ROOT, path)));
        expect(missing).toEqual([]);
    });

    it('大型データファイルはプリキャッシュに含めない', () => {
        const paths = readSwPrecachePaths();
        const heavy = paths.filter(path => /questionsData_|lessonsData_/.test(path));
        expect(heavy).toEqual([]);
    });

    it('gtag は Service Worker でキャッシュしない（解析オリジンを素通しする）', () => {
        const source = readFileSync(join(ROOT, 'sw.js'), 'utf8');
        expect(source).toContain('www.googletagmanager.com');
        expect(source).toContain('ANALYTICS_HOSTS');
    });
});

describe('アクセス解析の整合', () => {
    it('すべての HTML ページに gtag 設定がある', () => {
        const offenders = rootHtmlFiles().filter(name => {
            const html = readFileSync(join(ROOT, name), 'utf8');
            return !html.includes('G-BZ9EN5NX5F');
        });
        expect(offenders).toEqual([]);
    });
});
