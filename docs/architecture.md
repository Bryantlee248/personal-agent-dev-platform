# Architecture

```text
需求 / Issue / 定时事件
          |
          v
Agent-Autoloop（事件、队列、路由、卡片、恢复）
          |
          +--> Architecture AI（治理写）
          +--> Delivery AI（IWP 路径写）
          +--> Verification AI（只读）
          |
          v
GitHub PR + required checks
          |
          v
人工合并/发布批准 --> 固定 SHA 部署 --> 人工 UAT
```

## 权威边界

| 问题 | 权威来源 |
|---|---|
| 现在应该做什么 | PROJECT / ROADMAP / IWP |
| 发生过什么 | Autoloop 事件日志和运行回执 |
| 代码是否合格 | GitHub PR / required checks / 独立核验 |
| 什么已上线 | Ship 结果与健康接口 SHA |
| 是否完成业务目标 | Human UAT |

三类状态用 ID 和 SHA 互相引用，不复制成多个“当前状态”。
