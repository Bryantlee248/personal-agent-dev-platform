# Implementation Plan

## Phase 0：控制面（当前）

- 建立受治理仓库、GitHub Issue/Milestone 和 Obsidian 索引。
- 固定需求、角色、人工门、资源上限和非目标。
- 不安装中台、不创建密钥、不连接真实通道。

## Phase 1：隔离 PoC

- 在独立 `AGENT_AUTOLOOP_HOME` 安装固定 commit。
- 验证 try、conformance、重复事件、停止、重启、备份和恢复。
- 通过后才允许接入一个只读 Agent。

## Phase 2：开发接力

- Architecture 生成 IWP 并等待范围确认。
- Delivery 使用 D 盘临时工作树，路径越权 fail closed。
- Verification 读取隔离快照；同问题最多两轮返工。

## Phase 3：GitHub 交付

- required checks 阻止红灯合并。
- 交付插件只读取 main 上的可信策略。
- 先 review-only，再人工合并，最后才评估自动合并。

## Phase 4：受控部署

- 只部署固定 SHA；静态审查部署脚本的副作用、秘密与清理。
- 测试环境完成备份、迁移、冒烟、健康 SHA 和回滚演练。
- 生产与真实数据需要新的人工授权。
