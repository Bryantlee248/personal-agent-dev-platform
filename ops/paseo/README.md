# Paseo 隔离 PoC 运行手册

本目录只记录 IWP-003 的可复现操作。Paseo 运行时不进入仓库，固定在：

```text
D:\Codex Runtime\personal-agent-paseo-test
```

## 固定版本

- npm 包：`@getpaseo/cli@0.16.0`
- 许可证：Apache-2.0
- `package-lock.json` SHA-256：`16A612E549C8329115C90ECA2714F4EF21B87574C6DC791224FE608AC02C4795`

安装命令：

```powershell
npm install --prefix 'D:\Codex Runtime\personal-agent-paseo-test\app' @getpaseo/cli@0.16.0 --save-exact
```

## 安全启动

Paseo 从 Codex Desktop 会话启动时会继承只对桌面主进程有效的
`CODEX_WINDOWS_REGISTERED_CORE`。独立 daemon 必须在其子进程环境中移除该变量，
否则 Codex Agent 的 shell 会报 `registered Core launch requires an installed app`。

```powershell
$cli = 'D:\Codex Runtime\personal-agent-paseo-test\app\node_modules\.bin\paseo.cmd'
$paseoHome = 'D:\Codex Runtime\personal-agent-paseo-test\home'
Remove-Item Env:CODEX_WINDOWS_REGISTERED_CORE -ErrorAction SilentlyContinue
$env:PASEO_LISTEN = '127.0.0.1:6767'
& $cli daemon run --home $paseoHome
```

启动后必须确认：

```powershell
& $cli --home $paseoHome daemon status --json
Get-NetTCPConnection -LocalPort 6767 -State Listen
```

验收值是 `listen=127.0.0.1:6767`、`relay.enabled=false`。PoC 不连接 Hub、
relay、手机、Webhook 或 IM 通道。

## 当前兼容性限制

Codex `0.163.0` 在 Paseo `0.16.0` 下：

- `full-access` 模式可以执行 shell 和编辑文件。
- `auto-review` 受限模式在本机失败，错误为
  `CreateProcessWithLogonW failed: 2`。

因此本 PoC 不能作为无人值守生产执行器。未解决受限模式前，只允许在隔离测试
worktree 中运行有界任务；不得把 `full-access` 当作权限治理替代品。

## 停止和清理

```powershell
& $cli --home $paseoHome daemon stop
```

`paseo workspace archive` 只隐藏工作区记录，实测不会删除磁盘 worktree 或 Git
注册。清理临时 worktree 时必须先确认精确路径，再执行：

```powershell
git worktree remove --force '<exact-worktree-path>'
git branch -D '<exact-test-branch>'
git worktree list --porcelain
```

完整卸载采用隔离目录删除，但必须先停止 daemon，并由用户另行授权删除
`D:\Codex Runtime\personal-agent-paseo-test`。现阶段保留该目录供复核。
