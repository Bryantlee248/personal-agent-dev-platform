# Roadmap

状态：`PLANNED / ACTIVE / BLOCKED / DONE / CANCELLED`。工作项只追加，不删除历史。

| ID | 结果 | 负责人 | 依赖 | 证据 | 状态 |
|---|---|---|---|---|---|
| W-001 | 建立项目控制面、需求基线和 GitHub/Obsidian 双索引 | Architecture AI | - | 仓库、Issue、知识库 | DONE |
| W-002 | 在隔离测试目录安装并验收 Agent-Autoloop 固定版本 | Delivery AI | W-001 | conformance、备份恢复报告 | PLANNED |
| W-003 | 接入一个本地只读 Architecture Agent 和人工卡片闭环 | Delivery AI | W-002 | ask/answer/resume/stop 证据 | PLANNED |
| W-004 | 接入 Delivery Agent、独立工作树与资源保护锁 | Delivery AI | W-003 | 越权、并发、低内存测试 | PLANNED |
| W-005 | 接入 Verification Agent 和两轮返工上限 | Delivery AI | W-004 | PASS/FAIL/人工升级场景 | PLANNED |
| W-006 | 建立 GitHub PR、required checks 和交付插件闭环 | Delivery AI | W-005 | 红灯阻断、固定 SHA、审查账本 | PLANNED |
| W-007 | 建立受控测试环境部署、健康核对与回滚演练 | Delivery AI | W-006 | 部署与回滚证据 | PLANNED |
| W-008 | 连续完成 10 个真实低风险工作项并作试点评估 | Architecture AI | W-007 | 指标报告、风险复盘、Go/No-Go | PLANNED |
