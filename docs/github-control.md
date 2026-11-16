# GitHub Control Plane

| 仓库对象 | 用途 |
|---|---|
| Milestone | 阶段结果，不替代 PROJECT gate |
| Issue | 一个 Roadmap 工作项的执行入口 |
| PR | 代码和治理变更的评审入口 |
| Actions | 确定性机器门 |
| Releases | 后续固定工具包与版本证据 |

标签：`phase:g0..g4`、`type:governance/platform/delivery/validation`、`gate:human-action`、`risk:security`、`status:blocked`。

GitHub Project 看板需要额外 `project` OAuth scope。未取得该 scope 前，以 Milestone + Issue + ROADMAP 为完整控制面，不扩大 GitHub 凭据权限。

## 实际对象

- 仓库：https://github.com/Bryantlee248/personal-agent-dev-platform
- G0 / W-001：https://github.com/Bryantlee248/personal-agent-dev-platform/issues/1
- G1 / W-002..W-003：https://github.com/Bryantlee248/personal-agent-dev-platform/issues/2 和 https://github.com/Bryantlee248/personal-agent-dev-platform/issues/3
- G2 / W-004..W-006：https://github.com/Bryantlee248/personal-agent-dev-platform/issues/4 至 https://github.com/Bryantlee248/personal-agent-dev-platform/issues/6
- G3 / W-007..W-008：https://github.com/Bryantlee248/personal-agent-dev-platform/issues/7 和 https://github.com/Bryantlee248/personal-agent-dev-platform/issues/8

## 已知外部门禁

2026-11-16 首次 push 后，GitHub Actions 因账户近期付款失败或支出上限而拒绝分配 Runner，Job 未执行任何步骤。远端 CI 状态必须保持为未验证，直到账户问题由用户处理并成功重跑。

## 229 自托管 Runner

- 名称：`server229-personal-agent`
- 注册范围：仅 `Bryantlee248/personal-agent-dev-platform`
- 标签：`self-hosted, Linux, X64, server229, personal-agent-ci`
- 服务账户：`gha-personal`（本仓库专用、非 root）
- systemd 资源上限：1 GiB 内存、1 CPU、512 tasks
- 用途：仅运行本仓库治理、收敛、独立验证和轻量 Node 质量门；不承担 Docker、部署或 ENV-PILOT 写操作。
- 运行时：使用服务器已有 Node.js 22；工作流不在线下载 Node，以适应 229 的受限 HTTPS 出口。
- 仓库读取：本仓库独立只读 Deploy Key；私钥仅保存在 `gha-personal` HOME，不与旧 Runner 共享。

现有 `trade-tracker` Runner 是另一个 repository-level Runner，不能跨个人仓库直接复用，且其服务曾因 OOM 失败。本项目使用独立目录和服务，避免覆盖其配置。
