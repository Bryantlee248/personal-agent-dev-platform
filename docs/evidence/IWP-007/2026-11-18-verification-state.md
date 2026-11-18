# IWP-007 Verification 状态机证据

日期：2026-11-18

## 结果

`DONE`。已实现有人在场的确定性 Verification 状态机，限制最多两轮返工。状态机不启动 Agent、不执行命令、不写文件、不合并、不发布、不部署。

## 行为证据

- `PASS`：输出 `AWAITING_HUMAN`，下一角色为 Human。
- round 0 的 `FAIL`：输出 `AWAITING_DELIVERY`，轮次变为 1。
- round 1 的 `FAIL`：输出 `AWAITING_DELIVERY`，轮次变为 2。
- round 2 的 `FAIL`：输出 `ESCALATE / HUMAN_ACTION_REQUIRED`，不产生第三轮返工。
- 显式 `ESCALATE`：立即输出 `HUMAN_ACTION_REQUIRED`。
- 身份、固定 SHA、轮次不一致，未知结论，写路径，command ID，秘密，越界 findings 和额外字段均拒绝。

## 本地验证

- `npm run lint`：通过，16 个 JavaScript 模块语法有效。
- `npm test`：通过，包括 verification-state 合法流与失败关闭场景。
- `npm run build`：通过。
- `node scripts/validate-governance.mjs`：通过。
- `node tools/converge.mjs`：`CONVERGED`，gaps=0。
- `node tools/verify.mjs`：`all_pass=true`。

## 独立复核

- 第 1 轮 Qwen 会话 `5393ad44-14db-4979-bc8f-c1c9ac1bcb51`：`PASS`。
- 人工加固：将已校验、已限长、已做秘密扫描的 findings 返回给 Delivery，避免只有计数而无法返工。
- 第 2 轮 Qwen 会话 `1efec88e-17c6-4b42-aca2-09b531293145`：`PASS`。
- 两轮均为 plan/read-only；没有文件修改或命令执行权限。

## 229 Runner

- 实现提交：`05696c9a33b6ba5aee5d545c0bab8d2e8bcf77da`。
- Governance run `44215585816`：success。
- CI run `44215585992`：success；converge、independent-verify、build-test 全部通过。

## 保留边界

- 状态机把输入的 prior state 视为可信持久状态，只校验 review 与该状态完全绑定。
- 调度器接入时必须可靠保存并原样传递 `next_state`；若上游同时伪造 state 和 review，本纯函数无法单独识别。
- 秘密识别是失败关闭的常见模式扫描，不替代上游凭据隔离；真实秘密仍禁止进入模型上下文。
