# W-006 公开仓库受保护交付闭环

日期：2026-11-18

## 结论

`DONE`。仓库公开前已完成当前树、完整 Git patch 历史、历史对象大小及 Issue/PR 正文扫描，未发现真实凭据、私有数据或大文件。`master` 已启用严格分支保护且管理员同样受约束；Delivery Contract 的治理 PR 适用性修复已通过固定 SHA 复核、229 Runner 和普通受保护合并。

## 机械门证据

- 仓库可见性：PUBLIC。
- 保护基线：strict、enforce_admins、禁止 force-push/删除、要求会话解决。
- PR #12 故意缺少治理元数据：Governance 与 Delivery Contract 失败，GitHub 返回 `mergeStateStatus=BLOCKED`；关闭且未合并，测试分支已删除。
- PR #14 fixed head：`92e4009246a30f212c1092cf59085490640cc606`。
- Qwen PASS：`d694b878-4fcc-4bed-a29f-27771989315c`。
- PR #14 Governance：`44225502483` success。
- PR #14 CI：`44225502627` success，converge、independent-verify、build-test 全部通过。
- PR #14 Delivery Contract：`44225502968` success。
- PR #14 以普通 squash merge 合并，无管理员绕过或 auto-merge；合并提交 `48a7af619b75225b6ddd9810d12b93fe0f6a1794`，实现分支已删除。

## 修复后的契约

- Architecture PR 的角色和 IWP 声明只用于选择校验路径；实际权威来自可信 base SHA 的 `PROJECT.json`。
- 只有 ACTIVE IWP 的 `Architecture AI` ownership 完全覆盖实际 changed paths 时，Delivery Contract 才返回 `architecture-governance-only`。
- 混合路径、未知/关闭 IWP、缺失 ownership、不安全路径和相似角色全部失败关闭。
- Delivery PR 仍要求固定 event head SHA、PASS 复核账本、标准 UUID、固定检查声明和人工合并门。

## 本地验证

- `npm run lint`：通过。
- `npm test`：通过。
- `npm run build`：通过。
- `node scripts/validate-governance.mjs`：通过。
- `node tools/converge.mjs`：CONVERGED，gaps=0。
- `node tools/verify.mjs`：all_pass=true。
- `git diff --check`：通过。

## 合并后机械收尾

本治理 PR 合并后，把 `Validate fixed-SHA PR contract` 加入 `master` required checks，再创建一个不会合并的故意红灯 PR，确认五项保护下 `mergeStateStatus=BLOCKED`，随后关闭 PR 并删除测试分支。若该复验不成立，立即重新打开 W-006，不进入 W-007。

W-007 仍为 PLANNED；本工作没有部署、发布、真实数据、auto-merge 或生产操作。
