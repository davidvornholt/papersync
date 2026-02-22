const sections = [
  `---
title: Homework Overview
---

# 📚 Homework Overview

This page dynamically displays all uncompleted homework tasks from PaperSync. Click checkboxes to mark tasks as complete.
`,
  `## ⚠️ Overdue

\`\`\`dataviewjs
const today = dv.date("today").toISODate();
const pages = dv.pages('"PaperSync/Weekly"');
const tasks = [];
for (const page of pages) {
  const pageTasks = page.file.tasks.where(t => !t.completed && t.text.includes("[due::"));
  for (const task of pageTasks) {
    const dateMatch = task.text.match(/[due::s*(d{4}-d{2}-d{2})]/);
    if (dateMatch && dateMatch[1] < today) tasks.push(task);
  }
}
if (tasks.length === 0) dv.paragraph("✅ No overdue tasks!");
else dv.taskList(tasks, false);
\`\`\``,
  `## 🔴 Due Today

\`\`\`dataviewjs
const today = dv.date("today").toISODate();
const pages = dv.pages('"PaperSync/Weekly"');
const tasks = [];
for (const page of pages) {
  const pageTasks = page.file.tasks.where(t => !t.completed && t.text.includes("[due::"));
  for (const task of pageTasks) {
    const dateMatch = task.text.match(/[due::s*(d{4}-d{2}-d{2})]/);
    if (dateMatch && dateMatch[1] === today) tasks.push(task);
  }
}
if (tasks.length === 0) dv.paragraph("✅ No tasks due today!");
else dv.taskList(tasks, false);
\`\`\``,
  `## 🟡 Due Tomorrow

\`\`\`dataviewjs
const tomorrow = dv.date("today").plus({ days: 1 }).toISODate();
const pages = dv.pages('"PaperSync/Weekly"');
const tasks = [];
for (const page of pages) {
  const pageTasks = page.file.tasks.where(t => !t.completed && t.text.includes("[due::"));
  for (const task of pageTasks) {
    const dateMatch = task.text.match(/[due::s*(d{4}-d{2}-d{2})]/);
    if (dateMatch && dateMatch[1] === tomorrow) tasks.push(task);
  }
}
if (tasks.length === 0) dv.paragraph("✅ No tasks due tomorrow!");
else dv.taskList(tasks, false);
\`\`\``,
  `## 🟢 Due Later

\`\`\`dataviewjs
const tomorrow = dv.date("today").plus({ days: 1 }).toISODate();
const pages = dv.pages('"PaperSync/Weekly"');
const tasks = [];
for (const page of pages) {
  const pageTasks = page.file.tasks.where(t => !t.completed && t.text.includes("[due::"));
  for (const task of pageTasks) {
    const dateMatch = task.text.match(/[due::s*(d{4}-d{2}-d{2})]/);
    if (dateMatch && dateMatch[1] > tomorrow) tasks.push(task);
  }
}
if (tasks.length === 0) dv.paragraph("✅ No upcoming tasks!");
else dv.taskList(tasks, false);
\`\`\``,
  `## 📋 General Tasks

\`\`\`dataviewjs
const pages = dv.pages('"PaperSync/Weekly"');
const tasks = [];
for (const page of pages) {
  const allTasks = page.file.tasks.where(t => !t.completed);
  for (const task of allTasks) {
    if (task.section && task.section.subpath === "General Tasks") tasks.push(task);
  }
}
if (tasks.length === 0) dv.paragraph("✅ No uncompleted general tasks!");
else dv.taskList(tasks, false);
\`\`\``,
  `## 📝 No Due Date

\`\`\`dataviewjs
const pages = dv.pages('"PaperSync/Weekly"');
const tasks = [];
for (const page of pages) {
  const pageTasks = page.file.tasks.where(t => !t.completed && !t.text.includes("[due::"));
  for (const task of pageTasks) {
    if (!task.section || task.section.subpath !== "General Tasks") tasks.push(task);
  }
}
if (tasks.length === 0) dv.paragraph("✅ All tasks have due dates!");
else dv.taskList(tasks, false);
\`\`\``,
];

export const generateOverviewContent = (): string =>
  sections.join('\n\n---\n\n');
