# Decisions

状态：`ACCEPTED / PROVISIONAL`。新决策必须同步登记到 `PROJECT.json`。

| ID | 状态 | 决定 | 理由 | 替代 |
|---|---|---|---|---|
| D-001 | ACCEPTED | 平台面向个人单用户，不预建多人、多团队、多租户能力 | 降低实现与运维成本，匹配当前真实需求 | - |
| D-002 | ACCEPTED | 第一阶段全平台部署在本地 Windows 电脑，模型使用云端服务 | Autoloop 资源占用低，现有硬件可在容量 2、重任务串行条件下运行 | - |
| D-003 | ACCEPTED | Agent-Autoloop 只承担事件、队列、接力、暂停恢复和回执；现有治理框架继续承担授权与验收 | 避免把调度器误当权限、质量或生产决策系统 | - |
| D-004 | ACCEPTED | 不引入 LangGraph、Temporal、Redis、PostgreSQL、Kubernetes 或本地大模型 | 当前规模没有收益证据，增加组件只会扩大维护面 | - |
| D-005 | ACCEPTED | 治理、GitHub CI 和部署门禁不依赖具体 Agent 执行工具；执行层必须遵守统一输入输出契约 | 允许替换 Paseo、Orca、Autoloop 或单 Agent，而不重写治理与证据链 | 将工具内部状态作为项目权威状态 |
| D-006 | PROVISIONAL | Paseo 作为首选本地执行层进入隔离 PoC；Orca 保留为对比候选，Agent-Autoloop 保留基线与轻量回退 | Paseo 同时覆盖常驻 daemon、多 Agent、worktree、跨设备和 Hub 触发，更贴近个人后台自动开发目标 | 直接将任一候选认定为生产平台 |
| D-007 | ACCEPTED | 先采用有人在场的工具中立 MVP：Qwen 设计/复核、Codex 实施、229 确定性 CI；无人值守执行层作为独立阻断项 | 先验证真实交付闭环，避免 Windows sandbox 问题阻塞角色接力和治理价值验证 | 继续等待单一执行平台解决全部问题 |
| D-008 | ACCEPTED | 将 GitHub 仓库改为公开并对 `master` 启用管理员同样受约束的分支保护 | 用户明确选择公开仓库；公开前历史扫描未发现真实凭据、私有数据或大文件，公开后可使用 GitHub 原生 required checks | 升级 GitHub Pro 或长期接受无机械保护 |
