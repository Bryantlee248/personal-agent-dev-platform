# IWP-003 Paseo 本地隔离 PoC 证据

- 日期：2026-11-17
- 执行者：Delivery AI
- 固定版本：Paseo CLI/daemon `0.16.0`
- Codex CLI：`0.163.0`
- 环境：本地 Windows，隔离目录 `D:\Codex Runtime\personal-agent-paseo-test`
- 结论状态：`BLOCKED`，不能关闭 W-003

## 结论

Paseo 的 daemon、本地回环监听、Agent 会话、日志、固定 worktree、停止和重启均可
运行。Codex 在 `full-access` 模式下可编辑隔离 worktree，但 `auto-review` 受限模式
无法启动 shell。当前只能作为可控 PoC，不能作为无人值守自动开发平台的正式执行层。

## 验证矩阵

| 项目 | 结果 | 证据 |
|---|---|---|
| 固定来源和版本 | 通过 | `@getpaseo/cli@0.16.0`；Apache-2.0；npm integrity `sha512-ai3S...FzEKdQ==` |
| 可重复安装 | 通过 | 独立 `app` 目录，`paseo --version` 返回 `0.16.0` |
| 锁文件完整性 | 通过 | `package-lock.json` SHA-256 `16A612E549C8329115C90ECA2714F4EF21B87574C6DC791224FE608AC02C4795` |
| 本地监听 | 通过 | `127.0.0.1:6767`，OwningProcess 为 daemon worker |
| 外部 relay | 通过 | daemon status 显示 `relay.enabled=false` |
| Codex provider 发现 | 通过 | diagnostic 返回 `Status: Ready`、Codex `0.163.0`、8 models |
| 受限只读任务 | 失败 | `auto-review` shell 报 `CreateProcessWithLogonW failed: 2` |
| full-access 对照 | 通过但不可作为正式方案 | 隔离目录内 `Get-Location` 和 `Get-ChildItem` exit 0 |
| 临时 worktree 写入 | 通过 | Agent `7b3718f4-...` 仅创建 `paseo-iwp003-probe.txt`，主工作区无变化 |
| 停止 | 通过 | stop 后 `localDaemon=stopped`，6767 无监听 |
| 重启恢复 | 部分通过 | Agent 元数据和 worktree 可见；完成 Agent 恢复为 `closed`，未证明可续跑 |
| archive 清理 | 失败 | archive 仅隐藏记录，磁盘 worktree 和 Git 注册仍存在 |
| 精确清理 | 通过 | `git worktree remove --force <exact-path>` 后删除测试分支，主仓仅保留 master worktree |

## 关键过程

首次从 Codex Desktop 环境直接启动 daemon 后，Codex shell 报：

```text
registered Core launch requires an installed app
```

只在 Paseo 子进程环境移除 `CODEX_WINDOWS_REGISTERED_CORE` 后重启，错误转为：

```text
CreateProcessWithLogonW failed: 2
```

这证明桌面专用环境变量继承是一个问题，但不是全部问题。`full-access` 对照任务成功，
进一步将剩余缺口定位为 Windows 受限执行兼容性，而不是模型、API 或 Paseo daemon
整体不可用。

## 资源观测

- 空闲 daemon worker：Working Set 约 200-218 MB，Private Memory 约 189-198 MB。
- supervisor：Working Set 约 74 MB，Private Memory 约 60 MB。
- 单个短任务结束后 worker 约 207 MB；未观察到触发 3 GB 可用内存保护线。
- 本轮是短时采样，不代表长时间并发容量；正式容量结论仍需 W-004 压力测试。

## 安装脚本和插件说明

npm 安装时阻止了 `esbuild@0.25.12`、`node-pty@1.2.0-beta.15`、
`msgpackr-extract@3.0.7` 的安装脚本。本轮 daemon、Agent、shell 和 worktree 对照测试
无需放行这些脚本，因此没有扩大安装权限。

daemon 启动日志显示内置 `antigravity-provider` 被加载，但 provider 状态为 unavailable；
本轮没有安装外部插件，也没有授予该 provider 外部权限。

## 清理与残留

- 探针 worktree、探针文件和 `poc/iwp003-probe` 分支已删除。
- 主仓库在测试后保持干净。
- daemon 最终应停止；隔离安装目录保留供 Independent Verification AI 复核。
- Autoloop 隔离运行时和 server229 Runner 未修改。

## 阻断与下一步

在以下两项完成前，W-003 不应关闭：

1. 找到不依赖 `full-access` 的 Windows Codex 执行方式，或换用能提供可验证权限边界的 Agent provider。
2. 由 Independent Verification AI 复核本证据、监听边界、工作树清理和恢复语义。

当前执行态：`BLOCKED`。阻断原因是受限模式无法执行 shell，不需要用户立即授权扩大权限。
