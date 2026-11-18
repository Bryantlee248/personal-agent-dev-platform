# IWP-005 三角色接力 MVP 阻断证据

- 日期：2026-11-18
- 基线提交：`d3e0d7c6a8559cdc1975c2c85b6e0513e3ccaa19`
- 结论：`BLOCKED`

## 已验证方向

有人在场的 Architecture → Delivery → Verification → Human 路线仍然合理：它不依赖
Paseo/Orca，也不需要给 Qwen shell 或写入权限。Qwen 两次均遵守只读约束，并给出
结构化 `FAIL`；这证明独立复核角色能够发现 Delivery 自测没有覆盖的权限问题。

## 两轮结果

### 第 1 轮

Qwen 会话 `4ee203c8-ac49-4025-80ae-be3b516c5ce8` 读取 IWP、校验器、测试和接力单，
发现以下实质问题：

- `.`、`.git` 和宽路径可扩大写权限。
- 固定 SHA 只检查格式，不检查仓库中真实 commit。
- 验收命令使用短黑名单，危险命令可绕过。
- 常见秘密格式漏检。
- Delivery 可修改校验器自身和 `package.json`。
- 大小、路径、非法输入和并发证据不足。

Delivery 完成一轮集中修复，本地 lint/test/build/governance 通过。

### 第 2 轮

Qwen 会话 `3d400d97-1cf1-4e68-bd5c-ee54d0ec7d34` 再次只读复核，仍返回 `FAIL`：

- `node e2e/[A-Za-z0-9._/-]+.mjs` 允许 `..` 路径段，可执行仓库内任意 `.mjs`。
- 授权与 ownership 从工作区 `PROJECT.json` 读取，没有绑定 `fixed_sha` 中的版本。
- Windows 大小写、尾随点/空格等路径规范化仍可能绕过保护匹配。
- 秘密规则仍漏掉若干常见格式，相关边界测试不完整。

## 停止与清理

- IWP-005 规定同一实现问题最多两轮返工；已达到上限，不启动第 3 轮。
- 所有实现文件均未提交、未推送，并已从工作区撤回。
- 没有创建真实 worktree，没有自动启动 Agent、合并、发布、部署、外部通道或新凭据。
- 后续若重新开启，应把接力单改为“纯数据契约 + 固定 SHA 中读取策略”，命令只引用
  预登记的 command ID，不接受自由文本命令；路径使用平台规范化后的精确白名单。
