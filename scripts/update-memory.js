#!/usr/bin/env node
/**
 * update-memory.js
 * 供 Claude Code Agent 调用，更新记忆文件
 * 用法：node scripts/update-memory.js --fact "完成了XX" --decision "选择了React" --progress "phase1:task1"
 */

const fs = require("fs");
const path = require("path");

const args = process.argv.slice(2);
const get = (flag) => {
  const i = args.indexOf(flag);
  return i !== -1 ? args[i + 1] : null;
};

const MEMORY_PATH = path.join(__dirname, "../memory/MEMORY.md");
const PROGRESS_PATH = path.join(__dirname, "../memory/PROGRESS.md");

const fact = get("--fact");
const decision = get("--decision");
const decisionKey = get("--decision-key");
const progressTask = get("--progress");
const note = get("--note");

let updated = [];

// Update MEMORY.md with new fact
if (fact) {
  let content = fs.readFileSync(MEMORY_PATH, "utf8");
  const timestamp = new Date().toLocaleString("zh-CN");
  const newFact = `- [${timestamp}] ${fact}`;
  content = content.replace(
    "- [ 待填写 ] Agent 尚未开始开发，等待第一次会话",
    newFact
  );
  // If placeholder already replaced, append
  if (!content.includes(newFact)) {
    content = content.replace(
      /## 🔑 关键事实（Facts）\n.*?\n/s,
      (m) => m + newFact + "\n"
    );
  }
  fs.writeFileSync(MEMORY_PATH, content);
  updated.push(`✓ 事实已记录: ${fact}`);
}

// Update decision
if (decision && decisionKey) {
  let content = fs.readFileSync(MEMORY_PATH, "utf8");
  const timestamp = new Date().toLocaleDateString("zh-CN");
  const newRow = `| ${decisionKey} | ${decision} | ${timestamp} |\n`;
  content = content.replace(
    "| 样式方案 | Tailwind CSS | 初始化 |\n",
    `| 样式方案 | Tailwind CSS | 初始化 |\n${newRow}`
  );
  fs.writeFileSync(MEMORY_PATH, content);
  updated.push(`✓ 决策已记录: ${decisionKey} → ${decision}`);
}

// Mark progress task as done
if (progressTask) {
  let content = fs.readFileSync(PROGRESS_PATH, "utf8");
  const timestamp = new Date().toLocaleDateString("zh-CN");
  content = content.replace(
    new RegExp(`(\\| ${progressTask.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"]}[^|]*\\| )⏳ 待开始( \\| — \\| )`),
    `$1✅ 完成$2${timestamp} | `
  );
  // Update total count
  const done = (content.match(/✅ 完成/g) || []).length;
  const total = (content.match(/⏳ 待开始|✅ 完成|🔄 进行中/g) || []).length;
  content = content.replace(
    /总体进度：[\d%]+ \([\d\/]+ 任务\)/,
    `总体进度：${Math.round(done/total*100)}% (${done}/${total} 任务)`
  );
  fs.writeFileSync(PROGRESS_PATH, content);
  updated.push(`✓ 进度已更新: ${progressTask}`);
}

if (note) {
  let content = fs.readFileSync(MEMORY_PATH, "utf8");
  const timestamp = new Date().toLocaleString("zh-CN");
  content = content.replace(
    "_暂无_",
    `- [${timestamp}] ${note}`
  );
  fs.writeFileSync(MEMORY_PATH, content);
  updated.push(`✓ 已记录: ${note}`);
}

if (updated.length === 0) {
  console.log("用法: node scripts/update-memory.js --fact '事实' --decision '方案' --decision-key '决策项' --progress '任务名' --note '备注'");
} else {
  updated.forEach(u => console.log(u));
  console.log("\n📁 记忆文件已更新。");
}
