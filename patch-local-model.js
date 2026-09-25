const fs = require('fs');
const WORKER = 'utils/embeddingWorker.js';
const TS = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

let src = fs.readFileSync(WORKER, 'utf8');

const FROM = `                const module = await import('./lib/transformers.min.js');
                pipeline = module.pipeline;
                module.env.allowLocalModels = false;

                extractor = await pipeline('feature-extraction', data.model, {`;

const TO = `                const module = await import('./lib/transformers.min.js');
                pipeline = module.pipeline;

                // 本地模型配置：只读本地文件，不访问 huggingface
                const libBase = new URL('./lib/', import.meta.url).href;
                module.env.allowLocalModels = true;
                module.env.allowRemoteModels = false;
                module.env.localModelPath = libBase + 'models/';
                if (module.env.backends?.onnx?.wasm) {
                    module.env.backends.onnx.wasm.numThreads = 1;
                }

                extractor = await pipeline('feature-extraction', data.model, {`;

const cnt = src.split(FROM).length - 1;
if (cnt !== 1) {
    console.error('❌ 锚点匹配 ' + cnt + ' 处（期望 1 处）');
    process.exit(1);
}

fs.writeFileSync(WORKER + '.bak-model-' + TS, src, 'utf8');
fs.writeFileSync(WORKER, src.replace(FROM, TO), 'utf8');

console.log('✅ 已改为本地模型模式');
console.log('   备份: embeddingWorker.js.bak-model-' + TS);
