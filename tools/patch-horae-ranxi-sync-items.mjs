#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FILES = {
    hm:   path.join(ROOT, 'core/horaeManager.js'),
    zhCN: path.join(ROOT, 'prompts/zh-CN/customSystemPrompt.txt'),
    zhTW: path.join(ROOT, 'prompts/zh-TW/customSystemPrompt.txt'),
    en:   path.join(ROOT, 'prompts/en/customSystemPrompt.txt'),
    ja:   path.join(ROOT, 'prompts/ja/customSystemPrompt.txt'),
    ko:   path.join(ROOT, 'prompts/ko/customSystemPrompt.txt'),
    ru:   path.join(ROOT, 'prompts/ru/customSystemPrompt.txt'),
};
const SUFFIX = '.bak-sync-items';
const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const ROLLBACK = args.includes('--rollback');
const DRY_RUN = !APPLY && !ROLLBACK;

if (ROLLBACK) {
    let n = 0;
    for (const f of Object.values(FILES)) {
        const b = f + SUFFIX;
        if (fs.existsSync(b)) { fs.copyFileSync(b, f); fs.unlinkSync(b); n++; console.log('restored ' + path.basename(f)); }
    }
    console.log('rolled back ' + n);
    process.exit(0);
}

console.log('=== Horae-ranxi 物品系统同步 patch ===');
console.log('mode: ' + (DRY_RUN ? 'DRY-RUN' : 'APPLY'));
console.log('');

function readNorm(f) {
    const raw = fs.readFileSync(f, 'utf8');
    const isCRLF = raw.includes('\r\n');
    return { isCRLF, content: isCRLF ? raw.replace(/\r\n/g, '\n') : raw };
}
function writeNorm(f, content, isCRLF) {
    fs.writeFileSync(f, isCRLF ? content.replace(/\n/g, '\r\n') : content, 'utf8');
}
function backup(f) { const b = f + SUFFIX; if (!fs.existsSync(b)) fs.copyFileSync(f, b); }

const buffers = {};
const fileMeta = {};
for (const [k, f] of Object.entries(FILES)) {
    const { isCRLF, content } = readNorm(f);
    buffers[k] = content;
    fileMeta[k] = { isCRLF, path: f, dirty: false };
}

let failed = 0;
function applyPatch(fileKey, name, before, after, appliedCheck, expectedOcc = 1) {
    const cur = buffers[fileKey];
    if (appliedCheck && cur.includes(appliedCheck)) {
        console.log('  .. ' + name + ' (already)');
        return;
    }
    const occ = cur.split(before).length - 1;
    if (occ === 0) { console.error('  XX ' + name + ' anchor NOT FOUND'); failed++; return; }
    if (occ !== expectedOcc) { console.error('  XX ' + name + ' occ=' + occ + ' expect=' + expectedOcc); failed++; return; }
    console.log('  OK ' + name);
    buffers[fileKey] = cur.split(before).join(after);
    fileMeta[fileKey].dirty = true;
}

const LINE1 = '                                console.log(`[Horae] 物品数量归零自动删除: ${itemName}`);\n';
const LINE2 = '                                console.log(`[Horae] 物品已消耗自动删除: ${itemName}`);\n';
applyPatch('hm', 'P1-a 删"物品数量归零" log', LINE1, '', null);
applyPatch('hm', 'P1-b 删"物品已消耗" log', LINE2, '', null);

applyPatch(
    'zhCN', 'P2 zh-CN item 补强',
    '  ✗ 物品仅被提及但无状态改变 → 不写\n',
    '  ✗ 物品仅被提及但无状态改变 → 不写\n' +
    '  ✗ 禁止重新罗列全部持有物品（禁止完整库存输出）\n' +
    '  ✗ 若本回合物品完全没有变化，禁止输出任何 item: 或 item-:\n',
    '禁止重新罗列全部持有物品'
);

applyPatch(
    'zhTW', 'P3 zh-TW item 补强',
    '  ✗ 物品僅被提及但無狀態改變 → 不冩\n',
    '  ✗ 物品僅被提及但無狀態改變 → 不冩\n' +
    '  ✗ 禁止重新羅列全部持有物品（禁止完整庫存輸出）\n' +
    '  ✗ 若本回合物品完全沒有變化，禁止輸出任何 item: 或 item-:\n',
    '禁止重新羅列全部持有物品'
);

applyPatch(
    'en', 'P4 en item 补强',
    '  ✗ Item is only mentioned but state does not change → do not write\n',
    '  ✗ Item is only mentioned but state does not change → do not write\n' +
    '  ✗ Do not re-list the entire inventory (full inventory dump is forbidden)\n' +
    '  ✗ If no item changed at all this turn, output no item: or item-: lines\n',
    'Do not re-list the entire inventory'
);

applyPatch(
    'ja', 'P5 ja item 补强',
    '  ✗ ただ言及されただけで状態が変わっていない\n',
    '  ✗ ただ言及されただけで状態が変わっていない\n' +
    '  ✗ 全所持品リストの再列挙は禁止（フルインベントリ出力禁止）\n' +
    '  ✗ 今回のターンで物品変化が一切ない場合、item: も item-: も出力しないこと\n',
    '全所持品リストの再列挙は禁止'
);

applyPatch(
    'ko', 'P6 ko item 补强',
    '  ✗ 단순히 언급만 되었고 상태가 변하지 않음\n',
    '  ✗ 단순히 언급만 되었고 상태가 변하지 않음\n' +
    '  ✗ 전체 소지품 목록 재나열 금지(전체 인벤토리 출력 금지)\n' +
    '  ✗ 이번 턴에 아이템 변화가 전혀 없다면 item: / item-: 을 절대 출력하지 말 것\n',
    '전체 소지품 목록 재나열 금지'
);

applyPatch(
    'ru', 'P7 ru item 补强',
    '  ✗ предмет только упомянут, но его состояние не изменилось\n',
    '  ✗ предмет только упомянут, но его состояние не изменилось\n' +
    '  ✗ ЗАПРЕЩЕНО выводить полный список инвентаря\n' +
    '  ✗ Если в этом ходу предметы НЕ изменились — не выводить ни item:, ни item-:\n',
    'ЗАПРЕЩЕНО выводить полный список инвентаря'
);

console.log('');
if (failed > 0) { console.error('APPLY ABORTED: ' + failed + ' 处失败'); process.exit(1); }

if (DRY_RUN) {
    console.log('DRY-RUN done, nothing written.');
    for (const [k, m] of Object.entries(fileMeta)) {
        if (m.dirty) console.log('  会修改: ' + path.relative(ROOT, m.path));
    }
    process.exit(0);
}

let written = 0;
for (const [k, m] of Object.entries(fileMeta)) {
    if (!m.dirty) continue;
    backup(m.path);
    writeNorm(m.path, buffers[k], m.isCRLF);
    console.log('APPLIED: ' + path.relative(ROOT, m.path));
    written++;
}
console.log('written: ' + written + ' file(s)');
console.log('done.');
