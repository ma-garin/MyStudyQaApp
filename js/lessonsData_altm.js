// 分割した独自レッスンを、画面側が読み込む単一配列にまとめる。
import { lessons as part1 } from './lessonsData_altm_part1.js';
import { lessons as part2 } from './lessonsData_altm_part2.js';
import { lessons as part3 } from './lessonsData_altm_part3.js';

export const lessons = [...part1, ...part2, ...part3];

export default lessons;
