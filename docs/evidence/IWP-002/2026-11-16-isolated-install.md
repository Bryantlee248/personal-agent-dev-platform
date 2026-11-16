# IWP-002 隔离安装与验证证据

日期：2026-11-16  
执行者：Delivery AI  
状态：HUMAN_ACTION_REQUIRED

## 固定锚点

| 项 | 值 |
|---|---|
| 上游 | `https://github.com/KKKKhazix/agent-autoloop.git` |
| commit | `c9ec4a187cab49627947e7e33db265ec143db3b8` |
| source snapshot | `D:\Codex Runtime\agent-autoloop-source-c9ec4a1` |
| isolated HOME | `D:\Codex Runtime\personal-agent-autoloop-test` |
| backup | `D:\Codex Runtime\personal-agent-autoloop-test-backup` |
| listen | `127.0.0.1:59468` |
| Node | `v24.18.0` |

## 验证结果

| 检查 | 结果 | 证据摘要 |
|---|---|---|
| 干净固定版本 | PASS | source 和 installed app HEAD 均为固定 commit |
| 无服务安装 | PASS | 使用 `--no-service`；doctor 如实显示系统服务未运行 |
| 回环监听 | PASS | Hub 启动日志显示 `127.0.0.1:59468` |
| 规则检查与 dry-run | PASS | `check` 通过；`try.started` 仅路由至隔离试跑规则 |
| Protocol conformance #1 | PASS | 126 checks |
| Protocol conformance #2 | PASS | 132 checks；同一数据库连续运行 |
| 重复事件和回执 | PASS | conformance 覆盖重复事件、重复回执和跨轮 token 拒绝 |
| 暂停/恢复 | PASS | 暂停期间 1 个事件被跳过；恢复后列出且未自动补跑 |
| 停止运行 | PASS | 测试运行 #7 从 claimed 进入 cancelled，摘要“已停止” |
| 备份 | PASS | `hub.db`、`master.key`、`config.json`、`rules.json` |
| 恢复 | PASS | 停机 restore 成功；恢复后 Hub/Worker 和历史状态可读 |
| 测试密钥清理 | PASS | conformance 和 desktop channel keys 已撤销；探针文件已删除 |
| 真实 Codex try | BLOCKED | `codex login status` 返回 `Not logged in` |

## 边界核对

- 未读取或修改默认 `%USERPROFILE%\.agent-autoloop`。
- 未创建登录任务或系统服务，未修改用户 PATH。
- 未连接飞书、Webhook、GitHub Source 或其他真实通道。
- 未部署到 229，未使用真实业务数据或生产凭据。
- 隔离 Hub 当前保持运行，便于用户登录后补验；仅监听本机回环地址。

## 恢复后最小续办

1. 用户本人在终端运行 `codex login`。
2. 设置 `AGENT_AUTOLOOP_HOME=D:\Codex Runtime\personal-agent-autoloop-test`。
3. 运行 `doctor`，确认 Codex 可用。
4. 运行 `try`，选择任一颜色并回答生成的卡片。
5. `status` 显示“试跑通过”后，由 Independent Verification AI 关闭 IWP-002。
