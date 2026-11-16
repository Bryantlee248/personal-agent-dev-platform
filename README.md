# Personal Agent Dev Platform

个人使用的多 Agent 协同自动开发平台控制面。

## 目标

`需求 → 范围/IWP → Delivery 实施 → CI → Independent Verification → 人工批准 → 部署 → UAT`

平台不追求无人监管。它减少人工传话和等待，但保留范围、生产和业务验收三道人工门。

## 架构

- **治理控制面**：`PROJECT.json`、`GOVERNANCE.md`、`ROADMAP.md`、IWP、批准和证据。
- **接力层**：Agent-Autoloop，负责事件、队列、路由、暂停恢复和回执。
- **执行层**：本地 Architecture / Delivery / Verification Agent。
- **机器门**：GitHub Actions、治理校验、测试和构建。
- **部署层**：后续工作项建立，当前未授权生产或 229 写操作。

## 当前状态

- 生命周期：Discovery
- 阶段门：G0 立项与基线
- 活跃工作项：W-001
- 当前不会安装 Autoloop、创建密钥、接飞书或部署生产。

## 本地验证

```powershell
npm run governance
npm run converge
npm run verify
```

## 项目控制

- `ROADMAP.md`：唯一工作项清单。
- GitHub Milestones / Issues：执行和讨论入口。
- `docs/work-packages/`：工作项的授权、验收和停止条件。
- Obsidian：会话、决策和使用知识的阅读索引；不作为机器状态权威。
