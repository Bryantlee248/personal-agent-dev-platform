# Decisions

状态：`ACCEPTED / PROVISIONAL`。新决策必须同步登记到 `PROJECT.json`。

| ID | 状态 | 决定 | 理由 | 替代 |
|---|---|---|---|---|
| D-001 | ACCEPTED | 平台面向个人单用户，不预建多人、多团队、多租户能力 | 降低实现与运维成本，匹配当前真实需求 | - |
| D-002 | ACCEPTED | 第一阶段全平台部署在本地 Windows 电脑，模型使用云端服务 | Autoloop 资源占用低，现有硬件可在容量 2、重任务串行条件下运行 | - |
| D-003 | ACCEPTED | Agent-Autoloop 只承担事件、队列、接力、暂停恢复和回执；现有治理框架继续承担授权与验收 | 避免把调度器误当权限、质量或生产决策系统 | - |
| D-004 | ACCEPTED | 不引入 LangGraph、Temporal、Redis、PostgreSQL、Kubernetes 或本地大模型 | 当前规模没有收益证据，增加组件只会扩大维护面 | - |
