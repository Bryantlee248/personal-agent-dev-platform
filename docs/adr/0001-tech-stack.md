# ADR-0001：个人自动开发平台技术栈

- 状态：accepted
- 日期：2026-11-16
- 决定人：Bryantlee248

## Context

单人、多 Agent、一个主要项目；Windows 11 本地电脑为 4 核 8 线程、16 GB RAM。已有 GitHub、治理框架和云端 Agent，目标是低成本建立需求到部署的可审计接力，不构建通用企业平台。

## Decision

- 接力内核：固定并验收过的 Agent-Autoloop commit。
- 运行时：Node.js 24；Hub、Worker 和三个 Agent 配置均在本地。
- 权威控制面：Git 仓库治理文件和 GitHub Issues/PR/Actions。
- 运行状态：Autoloop 自带 SQLite；不增加 Redis/PostgreSQL。
- 自动化：PowerShell/Node 脚本；云端模型；不运行本地大模型。
- 部署：第一阶段不部署生产；后续通过独立受控脚本处理固定 SHA。

## Consequences

### 变容易的

- 组件少、成本低、与现有治理兼容、可离线开发。
- 人工流程可随时接管，不被编排框架锁定。

### 代价

- 电脑关机时 Agent 不执行。
- 16 GB 内存要求重任务串行。
- Agent-Autoloop 是年轻项目，升级前必须独立验收。

## Considered Options

- 229 承载 Hub：技术可行，但会与 ENV-PILOT/部署环境形成共同故障域，第一阶段不采用。
- LangGraph/Temporal/Kubernetes：当前没有并发、HA 或编排复杂度证据，暂不采用。
- 全自研接力内核：重复实现事件去重、恢复、卡片、熔断和备份，成本不合理。

## 回退

停止 Hub 后，仓库治理文件、GitHub PR/CI 和部署脚本仍可由人串行执行。
