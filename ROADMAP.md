# Roadmap

状态：`PLANNED / ACTIVE / BLOCKED / DONE / CANCELLED`。工作项只追加，不删除历史。

| ID | 结果 | 负责人 | 依赖 | 证据 | 状态 |
|---|---|---|---|---|---|
| W-001 | 建立项目控制面、需求基线和 GitHub/Obsidian 双索引 | Architecture AI | - | 仓库、Issue、知识库 | DONE |
| W-002 | 建立 Agent-Autoloop 隔离验证基线 | Delivery AI | W-001 | conformance、备份恢复、第三方模型协议偏差 | CANCELLED |
| W-003 | 隔离安装并验收 Paseo 本地执行层 | Delivery AI | W-001,W-002 | daemon、停止恢复、worktree、资源与权限报告 | BLOCKED |
| W-004 | 建立设计、开发、复核三角色接力与独立工作树 | Delivery AI | W-001 | 角色越权、交接、并发与低内存测试 | ACTIVE |
| W-005 | 接入 Verification Agent 和两轮返工上限 | Delivery AI | W-004 | PASS/FAIL/人工升级场景 | PLANNED |
| W-006 | 建立 GitHub PR、required checks 和交付插件闭环 | Delivery AI | W-005 | 红灯阻断、固定 SHA、审查账本 | PLANNED |
| W-007 | 建立受控测试环境部署、健康核对与回滚演练 | Delivery AI | W-006 | 部署与回滚证据 | PLANNED |
| W-008 | 连续完成 10 个真实低风险工作项并完成执行层选型 | Architecture AI | W-007 | 指标报告、Paseo/Orca/回退方案比较、Go/No-Go | PLANNED |
| W-009 | 验证 Windows 受限执行兼容性并对照本机已有 Agent provider | Delivery AI | W-003 | 上游依据、隔离 shell/worktree、权限与经济性对照 | BLOCKED |
