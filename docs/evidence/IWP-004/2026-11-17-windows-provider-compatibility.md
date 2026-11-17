# IWP-004 Windows 受限执行与 Provider 对照证据

- 日期：2026-11-17
- 执行者：Delivery AI
- 状态：`HUMAN_ACTION_REQUIRED`
- 范围：只读上游调研、本机已安装候选盘点、无持久会话探针

## 结论

当前没有一个已配置候选可以同时满足“无需新增授权、Windows 受限执行可用、支持
自动化调用、工作区隔离可验证”。问题不在治理框架，而在本机 Agent 执行入口：

1. Paseo `0.16.0` + Codex `0.163.0` 的非 full-access shell 被 Windows sandbox
   包身份/受限进程问题阻断。
2. TraeCLI `0.209.1` 的能力表面最符合需求，但 headless 身份验证失败，且尝试访问
   ByteDance 内部 Codebase 地址；模型任务没有启动。
3. 本机所谓 Orca Agent 入口只是一个 CodeBuddy shim，不是 Orca 编排服务；直接
   CodeBuddy 入口还报告缺少 `job-object.node`，不能据此宣称安全停止或子进程治理可用。

因此不应继续通过修改 sandbox、ACL、系统账户或复用未知内部认证来强行打通。下一步
需要用户在“完成 TraeCLI 正式登录”与“授权安装独立 Orca PoC”之间选择；在选择前
保持 Paseo/Autoloop 运行时不变。

## 上游依据

- OpenAI Codex Issue #60633：
  `https://github.com/openai/codex/issues/60633`
- Issue 描述独立 app-server/子进程丢失 Windows registered-Core 包身份，并明确列出
  不应采用的绕过方式，包括移除标志、修改权限或绕过 admission checks。
- 该 Issue 在 2026-11-17 检查时为 open；因此本项目不能把本机现象当作已解决问题。

## 候选对照

| 候选 | 已安装版本/入口 | 受限执行接口 | 本轮结果 | 经济性 | 结论 |
|---|---|---|---|---|---|
| Paseo + Codex | Paseo 0.16.0 / Codex 0.163.0 | auto-review | shell 失败；full-access 可用 | 无新增订阅 | 保留 PoC，不投产 |
| TraeCLI | 0.209.1 | read-only / workspace-write / approvals / worktree | headless authentication 失败，未运行模型 | 已安装，无新增安装 | 完成正式登录后最值得复测 |
| Orca shim | `codebuddy.cmd`，SHA-256 `B3B0155D...B3620D` | shim 未声明边界 | 仅转发至 CodeBuddy 42761 端口 | 已存在 | 不是独立 Orca PoC |
| CodeBuddy direct | 本机 WorkBuddy runtime | CLI 帮助未正常返回 | 缺少 `job-object.node` 警告 | 已存在 | 不作为自动执行入口 |
| Agent-Autoloop | 既有隔离基线 | 依赖下游 Agent | 调度可用，模型协议曾偏离 | 最低 | 继续保留回退，不解决 Agent 沙箱 |

## TraeCLI 探针

固定事实：

- `traecli --version`：`0.209.1`，installation `public`。
- `traex.exe` 产品名：`codex-windows-sandbox`。
- `traex.exe` SHA-256：
  `71882A60547F4A3BAA2CF80DFC701A1E097C467E83DE35AC6A487CECA7C576A8`。
- CLI 原生支持 `exec`、`--ephemeral`、`--ignore-user-config`、`--sandbox
  read-only|workspace-write`、`--permission-mode` 和 `--worktree`。

第一次探针在参数校验阶段退出：非交互 exec 不支持需要人工弹窗的 `default`
permission mode。未启动模型、未执行命令。

第二次省略 permission mode，保留 `--sandbox read-only`、`--ephemeral` 和禁止编辑/
联网工具后，headless Codebase Git authentication 失败；CLI 尝试访问
`code.byted.org/builtin/cli-authenticate.git`。未启动模型，主仓库无修改。根据 IWP-004
停止条件，没有继续认证重试。

## Orca/CodeBuddy 事实

本机 `C:\Users\ooo\AppData\Local\Programs\orca-agent-shims\codebuddy.cmd` 只做两件事：

1. 转发到 WorkBuddy 自带的 `codebuddy.cmd`。
2. 未指定端口时增加 `--port 42761`，避免与 WorkBuddy 桌面的 42660 冲突。

它没有暴露 Orca 的任务队列、角色、工作树或权限控制接口，不能作为“Orca 已安装并
可用”的证据。直接请求 CodeBuddy 帮助时报告缺少 native `job-object.node`，因此本轮
没有用它执行 Agent 任务。

## 安全与清理

- 未修改 Codex、Trae、WorkBuddy 或 Orca 的默认配置。
- 未读取或输出任何凭据，未创建新账户或密钥。
- 未修改 sandbox、系统 ACL、Windows 账户或安全服务。
- 未创建临时 worktree，因为所有替代候选都在任务执行前停止。
- 主仓库除本工作包证据和治理状态外无业务文件改动。

## 需要的人类选择

推荐顺序：

1. 用户在正常交互界面完成 TraeCLI 的正式登录，然后只复测 read-only 和隔离
   worktree；这是成本最低、能力最贴合的路径。
2. 若不希望使用 Trae，再单独授权下载固定版本的 Orca，按与 Paseo 相同标准做独立
   PoC；不能把现有 shim 当成 Orca。

当前状态：`HUMAN_ACTION_REQUIRED`。
