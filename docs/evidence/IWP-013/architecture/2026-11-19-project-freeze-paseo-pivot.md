# 项目冻结快照与 Paseo 本机验证接续

- 冻结时间：2026-11-19 14:26 CST。
- 用户决定：整个项目先冻结并记录当前事实；下一步在本机用 Paseo 对真实项目作隔离验证。
- 权威基线：`master` 为 `daa60200d932923c121d1fc6efba344df59752d8`；此记录不宣布 G1 通过、W-007 完成或任何部署完成。
- 治理状态：`PROJECT.json` 的 G1=`in_progress`，W-007=`ACTIVE`，IWP-012/IWP-013=`ACTIVE`；冻结是暂停推进决定，未把这些状态改写成 DONE。
- Delivery PR #28：`OPEN`，head=`d40ced664cacbfbad1238e4b235102ffaca224a2`，base=`daa60200d932923c121d1fc6efba344df59752d8`，`mergeStateStatus=BEHIND`；最近一次 Governance 检查失败，未满足五项 required checks，禁止合并。
- 实施复核：IWP-013 两轮有效 Qwen 复核已用完；第二轮对旧 head 给出 PASS。更新 Delivery head 会改变固定 SHA，旧 PASS 不自动覆盖新 SHA。此问题留待恢复 W-007 时由 Architecture 制定新受控工作包处理。
- 本地遗留：原主工作树 `delivery/iwp-011-transactional-deploy` 含未提交草稿；独立 Delivery 工作树保留 PR #28 的提交。冻结时未清理、覆盖或迁移两者。
- Paseo 已有本机隔离安装：`D:\Codex Runtime\personal-agent-paseo-test\app\node_modules\@getpaseo\cli`，package version `0.16.0`。IWP-003 旧证据表明 Windows `auto-review` 受限 shell 启动失败，`full-access` 对照能运行；这是待验证缺口，不是正式执行层验收。
- 下一阶段边界：只在本机隔离环境和临时 worktree 使用本项目真实代码，先复核来源、版本、进程/监听、工作树与权限边界，再执行有界任务并留证；不得接 Hub、relay、Webhook、外部业务事件、真实凭据或数据，不得部署、发布、自动合并或改变受保护分支。
- 恢复条件：分别确认 Paseo 受限执行方式、工作树清理、资源占用和独立验证；按新证据重新决定 W-003/W-009 与 W-007，不沿用旧 PASS 冒充新 SHA 验证。

本记录是冻结时点的事实快照，后续证据以新增文件记载，不追改本快照。
