# 固定策略接力校验器

```powershell
node ops/handoff-runtime/validate.mjs validate e2e/fixtures/handoff-runtime/architecture-to-delivery.json
```

校验器从接力单的 `fixed_sha` 读取该提交中的 `PROJECT.json` 和
`contracts/handoff-policy.json`。当前工作区文件不能扩大固定提交授权。

- `command_ids` 只解析为固定策略中的 argv；校验器不执行命令。
- 写路径必须与固定策略条目精确匹配，不能用父目录或子目录扩大。
- 路径按 Windows 兼容规则规范化并以不区分大小写方式比较。
- Verification 和 Human 始终没有写路径。
- 该工具不创建工作树、不启动 Agent、不合并、不发布、不部署。
