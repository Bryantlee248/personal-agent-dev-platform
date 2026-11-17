# IWP-004 Qwen Code 自定义 Provider PoC

- 日期：2026-11-17
- Qwen Code：`0.27.4`
- Provider：OpenAI 兼容自定义 Provider
- 模型：`deepseek-flash`
- 状态：`PARTIAL`

## 结论

Qwen Code 与现有第三方 API 的模型链路、Git worktree 创建、工具预算终止和 JSON
Schema 输出均可用。当前自定义 Provider 会话没有注册 `run_shell_command`、
`write_file` 或 `edit`，Windows 本机也没有 Qwen 可用的 sandbox 后端。因此它目前适合
设计、分析、评审和结构化结论，不适合开发写入、测试或 CI 执行。

## 验证矩阵

| 项目 | 结果 | 证据 |
|---|---|---|
| CLI 版本 | 通过 | `qwen --version` 返回 `0.27.4` |
| 自定义 Provider 模型连通 | 通过 | 零工具调用返回 `QWEN_CUSTOM_API_OK`，模型 `deepseek-flash` |
| 配置识别 | 通过 | `selectedType=openai`、模型和 Base URL 存在、密钥条目存在；值未写入证据 |
| 结构化输出 | 通过 | JSON Schema 接受 `{"verdict":"PASS","reason":"QWEN_SCHEMA_OK"}` |
| 工具调用预算 | 通过 | 上限 3/4/1 时均以 exit code 55 主动终止 |
| Git worktree | 通过 | 创建独立 `worktree-iwp004-qwen-readonly` 和 `worktree-iwp004-qwen-edit`，主分支未修改 |
| Windows sandbox | 失败 | `--sandbox true` 无可用后端，要求 Docker/Podman |
| 只读 shell | 失败 | `run_shell_command` 未注册；Agent 未伪造命令输出 |
| 文件写入 | 失败 | `write_file/edit` 未注册，目标探针文件未创建 |
| 精确清理 | 通过 | 两个临时 worktree 和分支均删除，主仓只保留 master worktree |

## 关键观察

1. `--bare` 会跳过自定义 Provider 的配置注入，不能用于该 Provider 的无头运行。
2. `--safe-mode` 也不适合作为这条自定义 Provider 路径的验证入口。
3. 正常无头运行必须加载用户配置，但可同时关闭 telemetry/chat recording，并用
   `plan`、工具预算、时长预算和 JSON Schema 缩小行为面。
4. Qwen 的 worktree 位于主仓 `.qwen/worktrees/`，创建时会让主仓出现未跟踪
   `.qwen/`；清理 worktree 后还需处理 Qwen 创建的 `.qwen/.gitignore`。
5. 第三方模型能识别并正确调用 `structured_output`，但对动态工具发现消耗较多轮次和
   token；不应为简单任务设置过低预算，也不应在工具缺失时无限提高预算。

## 资源与经济性

- 无工具连通测试：1 次模型请求，约 10k 输入 token、49 输出 token。
- Schema 测试：1 次模型请求，约 10k 输入 token、165 输出 token。
- 工具缺失诊断会产生多轮模型调用，成本明显高于简单任务；正式平台应在调度前检查
  工具能力，避免让模型反复搜索不存在的工具。
- 未安装 Docker/Podman，避免仅为 PoC 增加长期运维组件。

## 当前允许角色

- 允许：需求整理、设计草案、代码只读分析、评审意见、结构化 PASS/FAIL 输出。
- 禁止：修改代码、运行测试、执行 Git 命令、CI/CD、部署、生产或真实数据操作。

## 下一步

1. 研究 Qwen 自定义 Provider 为什么未注册 core tools；只采用受支持配置，不打补丁绕过。
2. 若工具面可恢复，在隔离 worktree 重新执行一个写入探针和一个只读 shell 探针。
3. 在此之前，可把 Qwen 作为 Verification/Design Agent 接入工具中立治理契约。
