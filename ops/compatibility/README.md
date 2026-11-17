# Qwen 受控复核入口

这个入口只把 Qwen 用作独立复核 Agent，不把它当作开发或部署 Agent。

```powershell
node ops/compatibility/qwen-verifier.mjs --input docs/evidence/IWP-004/2026-11-17-qwen-custom-provider-poc.md
```

## 固定边界

- 输入必须是当前仓库内不超过 256 KiB 的现有文件；路径越界直接失败。
- 调度器读取文件并通过标准输入传递，模型不自行遍历仓库。
- 固定使用 `plan`、零普通工具调用、90 秒时限和固定 JSON Schema。
- 标准输出只保留 `PASS / FAIL / ESCALATE` 机器结果；Qwen 事件流和思考不进入流水线。
- API 地址和凭据沿用 Qwen 用户配置；脚本不读取、打印或保存凭据。
- Qwen 不存在、超时、退出非零或输出不合约时均以非零状态失败，不自动放宽权限。

Windows 默认从全局 npm 安装位置寻找 Qwen。其他位置可设置 `QWEN_CLI_ENTRY` 为
Qwen 的 `cli-entry.js` 绝对路径。该变量只指定程序入口，不得包含凭据。

## 不代表什么

通过该入口只证明一份已提供材料得到了模型复核，不代表代码测试通过，也不构成人工
批准。开发、测试、CI/CD、部署和真实数据操作仍由各自执行器与门禁负责。
