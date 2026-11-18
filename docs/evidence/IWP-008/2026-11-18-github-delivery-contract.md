# IWP-008 GitHub PR 交付契约证据

日期：2026-11-18

## 结论

`HUMAN_ACTION_REQUIRED`。PR 契约、固定 SHA、可信 base ownership 和真实 GitHub Actions 路径已验证；required checks 的机械强制受当前私有仓库套餐限制，W-006 保持 BLOCKED。

## 实现

- `pull_request_target` 在 base SHA checkout 中运行可信校验器。
- `persist-credentials: false`；PR head 只 fetch 为 Git 数据，不 checkout、不执行。
- 授权从 base SHA 的 `PROJECT.json` 读取，拒绝 PR head 自授权。
- SHA 在任何 Git 调用前校验；base 必须是 head 祖先。
- 使用 merge-base 三点 diff 与 `--no-renames`，删除和新增路径均参与 ownership 检查。
- PR body 必须绑定 IWP、Delivery AI、固定 head SHA、PASS 账本、标准 UUID、固定检查名和 Human merge 声明。
- 无 merge、release、deploy、auto-merge、webhook 或新凭据。

## 本地验证

- `npm run lint`：通过，18 个 JavaScript 模块语法有效。
- `npm test`：通过，包括 SHA 漂移、越权路径、大小写变体、失败/缺失复核、检查声明和秘密拒绝。
- `npm run build`：通过。
- `node scripts/validate-governance.mjs`：通过。
- `node tools/converge.mjs`：`CONVERGED`，gaps=0。
- `node tools/verify.mjs`：`all_pass=true`。

## 独立复核

- 初始无 verdict 的 Qwen 调用因 session turn 上限退出，不计入质量轮次。
- 第 1 轮会话 `e3247d5f-481a-4f09-8b5a-fdfd20232dff`：FAIL；发现授权和校验器均来自 PR head、rename 绕过等实质缺陷。
- 修复为可信 base workflow、base manifest、merge-base/`--no-renames` 与 SHA-first 后，第 2 轮会话 `66e50fe7-745c-474d-bba4-6e944ae0d2c1`：PASS。

## 229 与真实 PR

- 实现提交 `0a2c0da40e907724bfe46210d737f65286c0874f`：Governance `44218220062` success；CI `44218219996` success。
- 测试 PR #11 最终 head `c52fd23816de6819885d7295e89c86c64e450867`。
- Delivery Contract `44219350662`：success；私有仓库 head fetch、可信 base 执行和契约校验通过。
- PR Governance `44219355074`：success。
- PR CI `44219354917`：success；converge、independent-verify、build-test 全部通过。
- PR #11 已关闭且未合并；测试分支已删除。

## 阻断证据

- `GET /branches/master/protection` 返回 HTTP 403：`Upgrade to GitHub Pro or make this repository public to enable this feature.`
- `GET /repos/.../rulesets` 返回相同 HTTP 403。
- 普通检查和 PR 模板不能替代 branch protection；当前管理员仍可在红灯时手工合并。

## 需要用户决定

1. 升级 GitHub Pro，保持仓库私有；或
2. 明确授权将仓库公开；或
3. 接受 W-006 长期 BLOCKED，不进入自动部署阶段。

未获得选择 1 或 2 的明确授权前，不修改仓库可见性、套餐或保护规则。
