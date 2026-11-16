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
