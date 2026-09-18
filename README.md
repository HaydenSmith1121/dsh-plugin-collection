# dsh-plugin-collection · 插件集合 —— ⚠️ 已退役

> **本仓库已停止收录。插件全部迁到了各自的源码仓库，本仓库不再分发任何 tarball。**
>
> 安装请走**插件市场**面板（[`HaydenSmith1121/dsh-plugins`](https://github.com/HaydenSmith1121/dsh-plugins)），
> 或按下表直接装。

---

## 插件现在在哪

每个插件都有自己的源码仓库。安装方式是 pnpm 的 git 依赖，**不需要下载 tarball**：

| 插件 | 源码仓库 | 安装 |
|---|---|---|
| `dsh-ark-plans` | [HaydenSmith1121/dsh-ark-plans](https://github.com/HaydenSmith1121/dsh-ark-plans) | `dsh plugin --profile web add github:HaydenSmith1121/dsh-ark-plans` |
| `dsh-memory` | [HaydenSmith1121/dsh-memory](https://github.com/HaydenSmith1121/dsh-memory) | `dsh plugin --profile web add github:HaydenSmith1121/dsh-memory` |
| `dsh-excel-viewer` | [HaydenSmith1121/dsh-excel-viewer](https://github.com/HaydenSmith1121/dsh-excel-viewer) | `dsh plugin --profile web add github:HaydenSmith1121/dsh-excel-viewer` |
| `dsh-session-cleanup` | [HaydenSmith1121/dsh-session-cleanup](https://github.com/HaydenSmith1121/dsh-session-cleanup) | `dsh plugin --profile web add github:HaydenSmith1121/dsh-session-cleanup` |
| `dsh-opencode-go-plus` | [HaydenSmith1121/dsh-opencode-go-plus](https://github.com/HaydenSmith1121/dsh-opencode-go-plus) | `dsh plugin --profile web add github:HaydenSmith1121/dsh-opencode-go-plus` |
| `dsh-connect-trae` | [HaydenSmith1121/dsh-connect-trae-plus](https://github.com/HaydenSmith1121/dsh-connect-trae-plus) | `dsh plugin --profile web add github:HaydenSmith1121/dsh-connect-trae-plus` |
| `dsh-workbuddy-quota` | **已下线** —— 用量统计部分由 [`dsh-usage-stats`](https://github.com/HaydenSmith1121/dsh-usage-stats) 接手 | — |

> ⚠️ **`dsh-opencode-go-plus` 装之前请先读它的 README**：它的依赖树里有两条未批准的构建脚本
> （`@google/genai` / `protobufjs`），pnpm 10+ 会以 `ERR_PNPM_IGNORED_BUILDS` 非 0 退出 ——
> 表现是「文件都装了，但 GUI 里看不到它」。修法（把 profile 的 `allowBuilds` 填好再重跑同一条命令）
> 写在那个仓库的 README 里。

> ⚠️ **`dsh-connect-trae` 与上游 `dsh-connect-trae` 不能同装**：同一个包名、同一个 provider 路由
> （`trae` / `trae-global`）、同一个设置命名空间。切换时先 `remove` 再 `add`。

---

## 这个仓库还剩什么

只剩这份 README、`manifest.json`（`plugins` 是**空数组**）与 LICENSE。

`manifest.json` 留着不是遗漏 —— 插件市场的采集脚本 `sync-catalog.mjs` 会读它，而且合成记录时
**`collection` 来源的优先级高于 `manual`**。所以只要这里还留着条目，市场就会继续按集合仓库的
tarball 路径生成安装信息，而那些 tarball 已经随本仓库下架、URL 全部 404。留一个空的 `plugins`
数组，市场就能干净地回落到各插件自己仓库的 `github:` 规格。

**请不要再往 `plugins/` 加东西** —— 本仓库不再接收收录。

---

## 历史

本仓库曾经是 DeepSeek Harness（dsh）插件的**产物仓库**：插件本体（tarball）、每个插件一份
`plugin.json` 与安装说明、以及用于复现的不可变收录快照，全部在这里；市场那边按 `manifest.json`
为每个插件生成一份 `catalog/plugins/<slug>.json`。

最后收录的状态是 **7 个插件 / 9 个版本**，运行时基线 dsh `0.1.6-alpha.1`。
2026-09-18 起自研插件逐个迁到各自的源码仓库，本仓库随之退役。

**旧内容没有丢**：7 个插件的 tarball、快照、`plugin.json`、`docs/`（收录规范、快照说明、
版本兼容矩阵、注意事项）与校验脚本都还在 git 历史里 ——

```bash
git log --oneline          # 最后一次收录内容在 28cad98
git checkout 28cad98       # 取回退役前的完整内容
```

---

## 与市场的关系

插件市场在 [`HaydenSmith1121/dsh-plugins`](https://github.com/HaydenSmith1121/dsh-plugins)：
它是目录（`catalog/`）+ 可视化面板 + 一键安装。**市场是市场，插件是插件** ——
本仓库退役不影响市场，只是市场不再从这里取安装信息。

---

## 许可

- 本仓库**自身的**代码与文档：**MIT**
- **第三方组件保留其各自的许可**，本仓库不改写、不覆盖它们的许可声明：

| 插件 | 第三方成分 | 许可 |
|---|---|---|
| `dsh-connect-trae` | **派生分支**：上游 [`dingminhua/dsh-connect-trae`](https://github.com/dingminhua/dsh-connect-trae) `v2.0.4`（版权 © 2026 LaoDing） | MIT（上游许可） |
| `dsh-opencode-go-plus` | 派生自 [`Duskriver/dsh-opencode-go`](https://github.com/Duskriver/dsh-opencode-go) `@0.1.2`，其适配器与 `src/conversion/*` 又派生自 DeepSeek Harness | MIT |
| `dsh-excel-viewer` | **内联分发** SheetJS Community Edition `0.20.3`（版权 © 2012-present SheetJS LLC） | Apache-2.0 |
| 其余 | 无第三方成分 | MIT |

各插件包内的 `THIRD_PARTY_NOTICES.md` 与 `LICENSE` 是许可归属的权威位置。
