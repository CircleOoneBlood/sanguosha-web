#!/usr/bin/env node
/**
 * export-memory.js
 * 将当前所有记忆合并导出为单个 Markdown 文件
 * 可直接粘贴给新 Claude 会话使用
 *
 * 用法：node scripts/export-memory.js [输出路径]
 */

const fs = require("fs");
const path = require("path");

const OUT_PATH = process.argv[2] || path.join(__dirname, "../memory/EXPORT_FOR_NEXT_SESSION.md");

const MEMORY = path.join(__dirname, "../memory/MEMORY.md");
const PROGRESS = path.join(__dirname, "../memory/PROGRESS.md");
const CLAUDE_MD = path.join(__dirname, "../CLAUDE.md");

const now = new Date().toLocaleString("zh-CN");

const memory = fs.existsSync(MEMORY) ? fs.readFileSync(MEMORY, "utf8") : "（无）";
const progress = fs.existsSync(PROGRESS) ? fs.readFileSync(PROGRESS, "utf8") : "（无）";
const claudeMd = fs.existsSync(CLAUDE_MD) ? fs.readFileSync(CLAUDE_MD, "utf8") : "（无）";

// Extract only the most critical sections to save tokens
const factSection = memory.match(/## 🔑 关键事实[\s\S]*?(?=\n## )/)?.[0] || "";
const decisionSection = memory.match(/## 🛠️ 技术决策[\s\S]*?(?=\n## )/)?.[0] || "";
const pendingSection = memory.match(/## ⚠️ 待决策[\s\S]*?(?=\n## )/)?.[0] || "";
const bugSection = memory.match(/## 🐛 已知问题[\s\S]*?(?=\n## |\n*$)/)?.[0] || "";

// Get only active + done phases from progress
const progressSummary = progress
  .split("\n")
  .filter(l => l.includes("✅") || l.includes("🔄") || l.includes("总体进度"))
  .join("\n");

const output = `# 🧠 三国杀项目 · 跨会话记忆包
> 生成时间：${now}
> **使用说明**：将整个文件内容粘贴到新 Claude 会话的第一条消息中，Claude 会自动恢复项目上下文。

---

${factSection}

${decisionSection}

${pendingSection}

${bugSection}

---

## 📊 进度摘要

${progressSummary}

---

## 📋 继续开发指令

请根据以上记忆继续开发三国杀 Web 游戏项目。
项目路径：\`./sanguosha/\`
启动命令：\`npm run dev\`
下一步任务请参考 \`memory/PROGRESS.md\` 中第一个未完成的阶段。

⚠️ 开始前请先读取 \`CLAUDE.md\` 了解完整项目规范。
`;

fs.writeFileSync(OUT_PATH, output);

const size = Buffer.byteLength(output, "utf8");
console.log(`✓ 记忆包已导出: ${OUT_PATH}`);
console.log(`✓ 文件大小: ${(size / 1024).toFixed(1)} KB`);
console.log(`\n💡 使用方法：将 ${path.basename(OUT_PATH)} 的内容粘贴给新会话的 Claude，即可继续开发。`);
