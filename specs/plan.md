# Plan（技术方案 · 轻量）

> 只定「跨旅程共享的骨架」，不写每条旅程的全部细节（那在实现时做）。上限 ~1 页。

## 技术栈
见 `docs/adr/0001-tech-stack.md`：Node.js 24、可替换 Agent 执行层、GitHub/GitHub Actions、PowerShell/Node 脚本和现有 Agent CLI。首选候选是 Paseo，Orca 保留对比，Agent-Autoloop 保留基线。

## 架构分层
1. 仓库治理控制面：工作项、角色、路径、批准和证据。
2. Agent 执行层：多 Agent、独立工作区、暂停恢复和运行回执；不得成为权威控制面。
3. 本地 Worker：Architecture、Delivery、Verification 三种受限执行配置。
4. GitHub 机器门：PR、required checks、审查账本和固定 SHA。
5. 部署执行器：后续建立，当前不进入生产。

## 核心数据模型
- Work Item：权威 ID、阶段、授权和验收。
- Run / Task / Session：执行层运行事实，不复制项目当前状态。
- PR / Check / Artifact / Deployment：GitHub 与环境事实，以 SHA 关联。

## 接口约定
- 事件只能提供来源、类型、对象和资料，不能指定 Agent、目录、权限或收件人。
- IWP 是 Agent 接力的授权契约。
- 所有外部写操作在重试前必须先读回当前状态。

## 前端组件 / 信息架构
第一阶段不自建 Web UI。GitHub 查看权威状态，Paseo 查看 Agent 运行，Obsidian查看知识索引。

## 共享约定
- Worker capacity=2；同项目 maxActive=1；重任务串行。
- 实现失败最多自动返工两轮；基础设施失败最多三次退避。
- 权限边界由操作系统/CLI/GitHub/CI 执行，提示词不是强制边界。
