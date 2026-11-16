---
version: phase-1
name: No independent UI
description: Phase 1 uses GitHub and Obsidian as the operator surfaces; no separate web UI is built.
colors:
  primary: "#1A3C6E"
  secondary: "#6C7278"
  neutral: "#F7F5F2"
typography:
  h1: { fontFamily: Public Sans, fontSize: 48px, fontWeight: 600 }
  body: { fontFamily: Public Sans, fontSize: 16px }
rounded: { sm: 0px, md: 0px }
spacing: { sm: 8px, md: 16px, lg: 24px }
# omitted: [spacing]   # 某段故意不要时声明，防 lint 警告
---

## Overview

一期没有独立 UI。GitHub Issue/PR 承担工作控制，Obsidian 承担知识索引，Agent-Autoloop 卡片承担暂停、提问和恢复。这样能避免在核心闭环得到验证前维护额外前端。

## Colors
这些颜色仅预留给未来只读状态页：蓝色表示正常控制信息，灰色表示辅助信息，浅色作为背景。红黄绿状态色应使用宿主平台原生语义，不由本项目重定义。

## Typography
一期沿用 GitHub 和 Obsidian 的系统字体与层级，不注入自定义样式。frontmatter 字体令牌仅作为未来状态页候选基线。

## Components
一期不开发组件。未来若状态页获批，只允许只读展示队列、工作包、门状态和证据链接；批准、合并和部署继续在权威系统完成。

## Do's and Don'ts
- **Do** 使用 GitHub 原生 Issue、PR、Checks 和 Obsidian 双向链接。
- **Don't** 在一期复制 GitHub 权限、审批或 CI 状态。
