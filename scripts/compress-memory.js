#!/usr/bin/env node
/**
 * compress-memory.js
 * 当 Agent 上下文窗口快满时运行，压缩并归档记忆
 * 用法：node scripts/compress-memory.js
 */

const fs = require("fs");
const path = require("path");

const MEMORY_PATH = path.join(__dirname, "../memory/MEMORY.md");
const ARCHIVE_DIR = path.join(__dirname, "../memory/archive");

if (!fs.existsSync(ARCHIVE_DIR)) fs.mkdirSync(ARCHIVE_DIR, { recursive: true });

const now = new Date();
const ts = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,"0")}${String(now.getDate()).padStart(2,"0")}_${String(now.getHours()).padStart(2,"0")}${String(now.getMinutes()).padStart(2,"0")}`;

// Archive current memory
const current = fs.readFileSync(MEMORY_PATH, "utf8");
fs.writeFileSync(path.join(ARCHIVE_DIR, `MEMORY_${ts}.md`), current);

// Keep only last 10 facts, last 5 known bugs, summarize the rest
const lines = current.split("\n");
const factLines = lines.filter(l => l.match(/^- \[.*?\]/));
const recentFacts = factLines.slice(-10);

const compressed = current
  .replace(
    /## 🔑 关键事实（Facts）[\s\S]*?(?=\n---)/,
    `## 🔑 关键事实（Facts，已压缩保留最近10条）\n\n${recentFacts.join("\n")}\n`
  );

fs.writeFileSync(MEMORY_PATH, compressed);

console.log(`✓ 记忆已压缩`);
console.log(`✓ 原始记忆已归档至: memory/archive/MEMORY_${ts}.md`);
console.log(`✓ 保留最近 ${recentFacts.length} 条事实`);
console.log(`\n💡 提示：将更新后的 memory/MEMORY.md 粘贴给新会话以继续开发。`);
