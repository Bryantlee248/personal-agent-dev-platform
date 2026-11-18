# IWP-010 本机部署演练阻断证据

日期：2026-11-18

## 结论

`BLOCKED`。治理 bootstrap 与保护恢复已经完成，但本机部署模拟器在两轮独立复核上限内未达到安全门槛。所有未通过实现均已撤回，未提交、未推送、未部署。

## 一次性治理 bootstrap

- 用户明确批准临时移除第五项 required check，只用于建立 IWP-010。
- PR #17 由 Governance、converge、independent-verify、build-test 四项 required checks 和 `strict=true`、`enforce_admins=true` 保护，普通 squash 合并为 `3df69432830de4db55019b83df41891b5601a307`。
- 合并后立即恢复 `Validate fixed-SHA PR contract`，五项 required checks、禁止 force-push/删除和会话解决要求均保持有效。
- 故意红灯 PR #18：Delivery Contract `44230683512` 因缺少 IWP 元数据失败，GitHub 返回 `mergeStateStatus=BLOCKED`；PR 关闭且未合并，测试分支删除。

## 本地草稿验证

撤回前，本地草稿的 focused test、完整 `npm test`、lint、build、governance、converge、verify 和 `git diff --check` 曾通过。它们只证明已有测试覆盖的行为，不推翻独立复核发现的未覆盖安全缺陷。

草稿未启动进程、端口、Docker 或网络访问；未使用凭据；只使用操作系统临时目录并在测试中清理。没有写入 229、ENV-PILOT、生产或真实数据。

## 独立复核

### 第 1 个有效质量轮次

- 会话：`3f4eb15d-c966-439f-ac32-80a864727ab7`
- 结论：FAIL。
- 根因：`git diff` 默认遗漏未跟踪的新实现和测试文件，只传入 `package.json`。评审正确拒绝不完整证据；这属于评审输入流程缺陷，未据此修复代码。

### 第 2 个有效质量轮次

- 会话：`6ef2c6a8-b9d3-40ae-83ac-d18b1aa0730b`
- 结论：FAIL。
- 实质问题：
  - `mkdirSync(target, {recursive:true})` 在真实路径 containment 校验前发生；中间 junction 可先在 sandbox 外创建目录，之后才失败且不清理。
  - 错误 source 仍可能留下 target/release 目录，违背失败零副作用目标。
  - 回滚 `writeCurrent` 自身失败时可能跳过失败 release 清理，且没有恢复日志。
  - 负向测试只断言“任意异常”，未锁定具体拒绝原因，也未覆盖中间 junction 逃逸和失败残留。

## 停止与清理

- 触发 IWP-010“两轮独立复核后仍有实质缺陷”停止条件。
- `ops/local-deploy/`、`e2e/local-deploy.mjs` 和 `package.json` 草稿修改已撤回。
- 本地工作区在治理状态修改前恢复为干净 `master`；不存在实现分支、实现提交、部署目标或临时测试目录残留。

## 重新开启条件

必须由 Architecture 另建工作包，不能继续第三轮。新设计至少要冻结：

1. 在任何写入前逐级解析 target 的最近现有祖先并拒绝 symlink/reparse point，创建后再次核对。
2. 在创建 target 前完整验证 source manifest、文件列表、大小和摘要。
3. target 单实例锁和可恢复的 prepare/switch/verify/rollback 日志。
4. 回滚失败时同时保留主错误和清理错误，禁止声称 rollback completed。
5. 精确错误断言、中间 junction、残留扫描、并发部署和进程中断恢复测试。

W-008 不得在该阻断解决前开始。
