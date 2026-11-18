# IWP-006 固定策略接力契约证据

- 日期：2026-11-18
- 可信策略提交：`de3244bf02a5e01b419c0dbdb2d23c5f77a35dc3`
- 状态：`DONE`

## 实现结果

- `ops/handoff-runtime/validate.mjs` 只做校验和解析，不执行接力单命令。
- 授权、Delivery ownership、IWP 和 command/path 策略都由 `git show fixed_sha:path` 读取。
- `fixed_sha` 必须是仓库 commit 且为当前 HEAD 的祖先，拒绝悬空或无关 commit。
- 自由文本命令字段被拒绝；command ID 只能解析为固定策略 argv。
- 写路径经过 NFC、分隔符、大小写和 Windows 特殊规则规范化，再做精确匹配；父目录和
  子目录均不能扩大权限。
- Verification/Human 没有写路径；工具不创建工作树、不启动 Agent、不合并或部署。

## 本地验证

- `npm run lint`：通过，14 个 JavaScript 模块语法检查。
- `npm test`：通过，包括治理基线、Qwen 适配器与 handoff-runtime e2e。
- `npm run build`：通过。
- `node scripts/validate-governance.mjs`：通过。
- `node tools/converge.mjs`：`CONVERGED`，gaps=0。
- `node tools/verify.mjs`：all_pass=true。

e2e 覆盖：虚构 SHA、非法角色、未知 command ID、自由命令字段、父/子目录、大小写精确
匹配、POSIX/Windows/UNC/NUL/ADS/尾随点空格/保留设备路径、Verification 写入、秘密、
重复命令、畸形/超大/目录/仓库外输入、32 MiB Node 内存和最多 8 路并发校验。

## 独立复核

- 第 1 轮 Qwen 会话 `6918b72e-7ab5-4413-9ff4-e4176b92cfff`：`PASS`。
- 第 2 轮 Qwen 会话 `0fe4f487-5b2f-4582-95b7-71292f42e42f`：`PASS`。
- 两轮均为 `plan`、只允许 `read_file` 和 Schema `structured_output`，文件变更为 0。

## 残余边界

- 校验器只证明接力单符合固定策略，不执行命令，也不证明业务代码正确。
- 当前允许请求固定策略写路径的子集，不要求一次领取全部路径。
- 人工范围、合并、部署和 UAT 批准仍不可替代。

## 229 首次运行更正

- 首次最终 CI `44213170484` 的 independent-verify 失败：`actions/checkout` 默认浅克隆，
  Runner 只有最终提交，无法解析可信策略提交的祖先关系。
- 保留 `fixed_sha` 祖先约束，不降低安全门；CI 三个 job 的 checkout 改为
  `fetch-depth: 0`，让确定性验证具备所需 Git 历史。
- 在修复后的 229 CI 通过前，本证据的远端完成结论不成立。
