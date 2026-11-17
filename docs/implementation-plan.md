# Implementation Plan

## Phase 0：控制面（当前）

- 建立受治理仓库、GitHub Issue/Milestone 和 Obsidian 索引。
- 固定需求、角色、人工门、资源上限和非目标。
- 不安装中台、不创建密钥、不连接真实通道。

## Phase 1：执行层候选验证

- 保留 Agent-Autoloop 隔离验证结果，不继续扩建主链路。
- 本地隔离安装 Paseo，不连接官方 Hub，不接生产凭据。
- 验证 daemon、停止恢复、独立 worktree、第三方 Codex 和资源占用。
- Paseo 通过后才建立正式三角色接力；Orca 等待同任务对比。

## Phase 2：开发接力

- Architecture 生成 IWP 并等待范围确认；执行层不得自行改变 IWP。
- Delivery 使用 D 盘临时工作树，路径越权 fail closed。
- Verification 读取隔离快照；同问题最多两轮返工。
- 三角色通过结构化交接单传递，不把整段聊天作为唯一输入。

## Phase 3：GitHub 交付

- required checks 阻止红灯合并。
- 229 Runner 只运行确定性检查，不运行多 Agent。
- 执行层只读取 main 上的可信策略。
- 先 review-only，再人工合并，最后才评估自动合并。

## Phase 4：受控部署

- 只部署固定 SHA；静态审查部署脚本的副作用、秘密与清理。
- 测试环境完成备份、迁移、冒烟、健康 SHA 和回滚演练。
- 生产与真实数据需要新的人工授权。
