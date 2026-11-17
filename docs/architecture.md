# Architecture

```text
需求 / GitHub Issue / 定时事件
          |
          v
治理适配层（IWP、固定 SHA、权限、验收、停止条件）
          |
          v
可替换执行层（当前有人在场；Paseo/Orca 候选；Autoloop 回退）
          |
          +--> Architecture AI（设计与工作包）
          +--> Delivery AI（独立 worktree 实施）
          +--> Verification AI（独立快照只读验证）
          |
          v
GitHub PR + 229 Runner required checks
          |
          v
人工合并/发布批准 --> 固定 SHA 部署 --> 人工 UAT
```

## 权威边界

| 问题 | 权威来源 |
|---|---|
| 现在应该做什么 | PROJECT / ROADMAP / IWP |
| 发生过什么 | GitHub 状态、执行层运行回执和固定 SHA |
| 代码是否合格 | GitHub PR / required checks / 独立核验 |
| 什么已上线 | Ship 结果与健康接口 SHA |
| 是否完成业务目标 | Human UAT |

三类状态用 ID 和 SHA 互相引用，不复制成多个“当前状态”。

## 执行层替换契约

所有执行工具只接收工作项、固定 SHA、允许路径、验收命令和停止条件；只返回提交 SHA、PR、测试结果、修改文件和待人工事项。Paseo、Orca 或 Autoloop 的内部任务 ID 不进入项目权威状态。

## 部署边界

- 本地电脑：Paseo daemon、Agent CLI 和临时 worktree。
- GitHub：工作项、PR、审批、代码和检查记录。
- 229：专用 Runner、确定性 CI，后续在独立授权下承担测试部署；不运行多 Agent。
- Obsidian：方案、决策和复盘索引；不保存唯一实时状态。
