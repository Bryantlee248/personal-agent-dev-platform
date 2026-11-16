# Autoloop configuration

这里保存审查过的示例，不保存真实 `config.json`、key、token 或 `secrets.env`。

启用流程：

1. 在隔离测试 HOME 中复制示例。
2. `agent-autoloop check <draft>`。
3. `agent-autoloop rules explain <draft>`。
4. `agent-autoloop emit requirement.opened --dry-run`。
5. 经 IWP-002 验收与人工批准后，才合并到正式本机配置。
