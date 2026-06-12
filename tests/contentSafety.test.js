import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { questions as flQuestions } from '../js/questionsData_fl.js';
import { questions as altaQuestions } from '../js/questionsData_alta.js';
import { questions as altmQuestions } from '../js/questionsData_altm.js';
import { questions as ctaiQuestions } from '../js/questionsData_ctai.js';
import { questions as ctgenaiQuestions } from '../js/questionsData_ctgenai.js';
import { altaTopicMap, altmTopicMap, ctaiTopicMap, ctgenaiTopicMap } from '../js/topicMap.js';
import { CERTIFICATIONS } from '../js/certifications.js';

const ROOT = process.cwd();
const QUESTION_SETS = [
    { file: '../js/questionsData_fl.js', questions: flQuestions, idPrefix: /^fl-/ },
    { file: '../js/questionsData_alta.js', questions: altaQuestions, idPrefix: /^alta-/ },
    { file: '../js/questionsData_altm.js', questions: altmQuestions, idPrefix: /^altm-/ },
    { file: '../js/questionsData_ctai.js', questions: ctaiQuestions, idPrefix: /^ct-ai-/ },
    { file: '../js/questionsData_ctgenai.js', questions: ctgenaiQuestions, idPrefix: /^ct-genai-/ },
];

const LESSON_SETS = [
    { file: '../js/lessonsData_alta.js', certId: 'alta', questions: altaQuestions, topicMap: altaTopicMap },
    { file: '../js/lessonsData_altm.js', certId: 'altm', questions: altmQuestions, topicMap: altmTopicMap },
    { file: '../js/lessonsData_ctai.js', certId: 'ct-ai', questions: ctaiQuestions, topicMap: ctaiTopicMap },
    { file: '../js/lessonsData_ctgenai.js', certId: 'ct-genai', questions: ctgenaiQuestions, topicMap: ctgenaiTopicMap },
];

function walk(dir) {
    return readdirSync(dir).flatMap(name => {
        if (name === '.git' || name === 'node_modules') return [];
        const path = join(dir, name);
        return statSync(path).isDirectory() ? walk(path) : [path];
    });
}

describe('権利安全チェック', () => {
    it.each(QUESTION_SETS)('$file は独自コンテンツ用スキーマを満たす', ({ questions, idPrefix }) => {
        expect(questions.length).toBeGreaterThan(0);
        questions.forEach(question => {
            expect(question.id).toMatch(idPrefix);
            expect(question.sourcePolicy).toBe('original');
            expect(question.officialQuestionUsed).toBe(false);
            expect(question.certificationReference).toContain('topic map');
            expect(question.choices).toHaveLength(4);
            expect(question.correctAnswerIndex).toBeGreaterThanOrEqual(0);
            expect(question.correctAnswerIndex).toBeLessThanOrEqual(3);
            expect(question.reviewerStatus).toBe('reviewed');
        });
    });

    it.each(LESSON_SETS)('$file は独自コンテンツ用スキーマと参照整合性を満たす', async ({ file, certId, questions, topicMap }) => {
        const { lessons } = await import(file);
        const sectionRefs = new Set(topicMap.flatMap(chapter => chapter.sections.map(section => section.section)));
        const questionIds = new Set(questions.map(question => question.id));
        expect(new Set(lessons.map(lesson => lesson.id)).size).toBe(lessons.length);
        expect(lessons.length).toBeGreaterThan(0);
        lessons.forEach(lesson => {
            expect(lesson.sourcePolicy).toBe('original');
            expect(lesson.officialTextUsed).toBe(false);
            expect(lesson.reviewerStatus).toBe('reviewed');
            const paragraphCharacters = lesson.body
                .flatMap(block => block.paragraphs)
                .reduce((total, paragraph) => total + paragraph.length, 0);
            expect(paragraphCharacters).toBeGreaterThan(300);
            expect(sectionRefs.has(lesson.sectionRef)).toBe(true);
            lesson.relatedQuestionIds.forEach(questionId => expect(questionIds.has(questionId)).toBe(true));
            expect(lesson.id).toBe(`${certId}-${lesson.sectionRef}`);
        });
    });

    it('資格定義の問題数は実データと一致する', () => {
        const counts = new Map([
            ['fl', flQuestions.length],
            ['alta', altaQuestions.length],
            ['altm', altmQuestions.length],
            ['ct-ai', ctaiQuestions.length],
            ['ct-genai', ctgenaiQuestions.length],
        ]);
        CERTIFICATIONS.forEach(cert => expect(cert.questionCount).toBe(counts.get(cert.id)));
    });

    it('現行HEADの作業ファイルにPDFと旧公式風画像がない', () => {
        const files = walk(ROOT).map(path => relative(ROOT, path));
        expect(files.filter(path => path.toLowerCase().endsWith('.pdf'))).toEqual([]);
        expect(files).not.toContain('img/JSTQB_TA.png');
    });

    it('削除済みの旧データ参照がない', () => {
        const targets = walk(ROOT).filter(path =>
            /\.(?:html|js|json|md|css|csv)$/.test(path)
            && relative(ROOT, path) !== 'tests/contentSafety.test.js'
        );
        const combined = targets.map(path => readFileSync(path, 'utf8')).join('\n');
        const forbiddenPatterns = [
            new RegExp('assumedProblemsData_' + '(?:alta|altm)'),
            new RegExp('mockExamData_' + 'alta'),
            new RegExp('glossaryData_' + '(?:alta|altm)'),
            new RegExp('img/' + 'JSTQB_TA\\.png'),
        ];
        forbiddenPatterns.forEach(pattern => expect(combined).not.toMatch(pattern));
    });
});
