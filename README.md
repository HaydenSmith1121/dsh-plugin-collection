# dsh-plugin-collection · 插件集合

本仓库是 DeepSeek Harness（dsh）插件的**产物仓库** —— 插件本身、每个插件的配置文件、
以及用于复现的不可变快照，全部在这里。

**[← 插件市场（HaydenSmith1121/dsh-plugins）](https://github.com/HaydenSmith1121/dsh-plugins)**
是**另一件事**：它是目录与入口（`catalog/` + 市场面板插件 + 一键安装脚本）。
一句话区分：

> **`dsh-plugins` 是市场（目录 + 面板），本仓库是插件（tarball 本身）。**

本仓库的 `manifest.json` 是市场侧采集脚本唯一的输入 —— 市场按它为每个插件生成一份
`catalog/plugins/<slug>.json`，所以**本仓库发新版不需要改动市场仓库**。
详见[第六节](#market)。

---

## 📌 运行时基线

| 组件 | 要求 | 校验 | 说明 |
|---|---|---|---|
| dsh | **`0.1.6-alpha.1`** | `dsh --version` | ★ 精确 pin，不是「一致或更新就行」 |
| Node | **≥ 22.19** | `node -v` | dsh 的 `package.json` 没有 `engines` 字段，此下限是按实测写的 |
| pnpm | **≥ 10** | `pnpm -v` | `dsh plugin` 底层就是转发给 pnpm；pnpm 10+ 默认开启依赖构建脚本拦截 |

```bash
npm i -g @deepseek-ai/dsh@0.1.6-alpha.1
dsh --version        # 必须显示 0.1.6-alpha.1
```

### ⚠️ 为什么 dsh 版本必须锁定在 `0.1.6-alpha.1`

dsh 在 npm 上有三条发行通道，而**默认通道不是我们要的那个**：

| dist-tag | 版本 | 说明 |
|---|---|---|
| `latest` | `0.1.5-rc.1` | `npm i -g @deepseek-ai/dsh`（**不带版本**）装的就是这个 |
| `next` | `0.1.5-rc.2` | |
| **`alpha`** | **`0.1.6-alpha.1`** | ★ 本仓库插件要求的 |

版本不对的后果不是「某个插件不能用」，而是**整棵插件树加载失败、`dsh web` 完全起不来**：

```none
Error: dsh: plugin tree failed to load: failed to import loader entry opencode-go-plus
(dsh-opencode-go-plus): The requested module '@deepseek-ai/dsh-llm' does not provide
an export named 'IMAGE_OFFLOAD_REQUIRED_CODE'
```

根因：`dsh-opencode-go-plus` 把整套 `@deepseek-ai/*` 精确 pin 在 `0.1.6-alpha.1`
（沿用其基线，未做改动），而 `0.1.5-rc.1` 内置的 `@deepseek-ai/dsh-llm` 是 `0.1.5-rc.2`
—— 里面没有 `IMAGE_OFFLOAD_REQUIRED_CODE` / `offloadedImageText` /
`projectOffloadedImages` / `requiredImageOffload` 这些导出（图片卸载是 0.1.6 才加的 API）。
ESM 的具名导入在符号不存在时是**确定性失败**，不存在「有时候能过」。

**退插件版本解决不了**：`dsh-opencode-go` 在 npm 上的全部上游发布版本
（`0.1.0` / `0.1.1` / `0.1.2`）要求的都是 alpha，没有兼容 0.1.5 的版本可选。
**只能升 dsh，不能退插件。**

> ⚠️ **最大的长期陷阱：静默降级。**
> `npm i -g @deepseek-ai/dsh`（**不带版本**）会把 CLI 静默装回 `0.1.5-rc.1`，
> 故障立刻复现，而且**没有任何提示**。升级 dsh 后请显式带版本号重装。

---

## 🚀 30 秒安装（手动路径）

结论先行 —— 每个插件都是这三步，**不需要 clone 本仓库**：

```powershell
# 1) 下载 tarball（以 dsh-memory 为例）
Invoke-WebRequest -Uri https://raw.githubusercontent.com/HaydenSmith1121/dsh-plugin-collection/main/plugins/dsh-memory/0.1.6-alpha.1/dsh-memory-0.1.0.tgz -OutFile $env:TEMP\dsh-memory-0.1.0.tgz

# 2) 校验字节（可选但强烈建议，sha256 见下一节表格）
(Get-FileHash $env:TEMP\dsh-memory-0.1.0.tgz -Algorithm SHA256).Hash.ToLower()

# 3) 装进 web profile，然后重启
dsh plugin --profile web add $env:TEMP\dsh-memory-0.1.0.tgz
```

```bash
# macOS / Linux 等价写法
curl -fL -o /tmp/dsh-memory-0.1.0.tgz https://raw.githubusercontent.com/HaydenSmith1121/dsh-plugin-collection/main/plugins/dsh-memory/0.1.6-alpha.1/dsh-memory-0.1.0.tgz
shasum -a 256 /tmp/dsh-memory-0.1.0.tgz   # Linux 用 sha256sum
dsh plugin --profile web add /tmp/dsh-memory-0.1.0.tgz
```

**装完必须重启 `dsh web`** —— 新的 bundle 是在进程启动时合成的
（`dsh web` 不允许同时起两个实例）。

> ✅ **成功的判据是 pnpm 退出码为 0，不是 `node_modules` 里有没有文件。**
> 只要 pnpm 非 0 退出，就当作「这条插件没装完」，哪怕目录里文件都在 ——
> 见[第六节的 `ERR_PNPM_IGNORED_BUILDS`](#pitfalls)。

---

## 🧩 插件一览

**共 6 个插件 / 8 个版本**，全部以 dsh `0.1.6-alpha.1` 为基线。

| 插件 | 当前版本 | 作用 | 安装方式 |
|---|---|---|---|
| [`dsh-ark-plans`](#dsh-ark-plans) | `0.2.0` | 火山方舟 Agent Plan / Coding Plan 两条套餐车道接入，含会话标题栏额度 pill | tarball → `dsh plugin add` |
| [`dsh-excel-viewer`](#dsh-excel-viewer) | `0.1.0` | 在右侧预览面板直接打开 xlsx / xlsm / xls / csv / tsv | tarball → `dsh plugin add` |
| [`dsh-memory`](#dsh-memory) | `0.1.0` | 跨会话长期记忆：turn 结束蒸馏成笔记，下次会话自动召回 | tarball → `dsh plugin add` |
| [`dsh-opencode-go-plus`](#dsh-opencode-go-plus) | `0.3.0` | OpenCode Go 模型供应商（自研维护分支，取代 `dsh-opencode-go`） | tarball → `dsh plugin add`（**先卸旧包**） |
| [`dsh-session-cleanup`](#dsh-session-cleanup) | `0.1.2` | 已归档会话的真实删除 + 清理「日志已删、id 仍归档」残渣 | tarball → `dsh plugin add` |
| [`dsh-workbuddy-quota`](#dsh-workbuddy-quota) | `0.2.0` | WorkBuddy 剩余额度 + 本机 token 用量统计 | tarball → `dsh plugin add` |

> 命令行只有一种装法：**`dsh plugin --profile web add <tarball 绝对路径>`**。
> 差别只在 tarball 从哪来 —— 自己下载（下面各节）或由市场面板代下（[第五节](#two-ways)）。

### 校验信息总表

| 插件 | 版本 | sha256 | 字节数 |
|---|---|---|---|
| `dsh-ark-plans` | `0.2.0` | `04df5a7fec08df8419b4c208c08f3d8cd6a264be87febef9bbcac0cc4806fd40` | 26247 |
| `dsh-excel-viewer` | `0.1.0` | `5f7a4236b6755254886da83b7e2d096d2124e309ea4287ff9fd8bc6b566db97b` | 384363 |
| `dsh-memory` | `0.1.0` | `e773678ab7b681390a6e7f643ab0c5cee87d996c9d662da6ca004b1c17e60a3e` | 17663 |
| `dsh-opencode-go-plus` | `0.3.0` | `481b8f6bbdee38dc15d2b5cc729fbe7bc25edea6ce52d0f11e69f5d66252cc37` | 65141 |
| `dsh-session-cleanup` | `0.1.2` | `fec87c34041445c4edb5722ad0d70f9d834a1dc0dd94bbcc79e9370646dd1786` | 18328 |
| `dsh-workbuddy-quota` | `0.2.0` | `744a39879202782bdbca4d8235094949b73accf7c2f0153841872aed2d2388f8` | 14507 |

> 上表的 sha256 / 字节数全部取自 [`manifest.json`](./manifest.json)（本表由它派生）。
> `manifest.json` 由 `scripts/build-manifest.mjs` 从每插件的 `plugin.json`
> **重新计算**，不是手抄的 —— 见[第七节](#new-version)。
>
> 这些值请**直接复制**：`dsh plugin add` 本身不校验 sha256，抄错一个字符不会当场报错，
> 但你的校验会过不了（或更糟：过了，但你比对的是错的那一行）。

---

<a name="plugins-install"></a>

## 📖 各插件安装方法

下面每一节都是**自包含**的：下载 → 校验 → 安装 → 配置 → 卸载。
`$env:TEMP`（Windows）与 `/tmp`（macOS / Linux）可以换成任何你留着不删的目录。

> ⚠️ **`dsh plugin add` 生成的是 `file:` 依赖，不是把内容拷进去。**
> 那个 tarball 的路径**不能事后删掉或挪走**，否则以后任何 `pnpm install` /
> `dsh plugin` 操作都会失败（找不到 tarball）。已装好的 profile 运行时不需要它
> （内容已在 `node_modules`），但重装 / 升级时会需要。
> 自检：`grep -o 'file:[^"]*' ~/.dsh/profiles/web/package.json`

---

<a name="dsh-ark-plans"></a>

### 1. `dsh-ark-plans` — 火山方舟 Agent Plan / Coding Plan

**作用**：把火山方舟（Volcengine Ark）的 **Agent Plan** 与 **Coding Plan** 两条套餐车道
接进 harness。两条车道都实现 OpenAI 兼容协议，所以本包**不写协议转换** ——
它用 `cordis.patch.yml` 给官方 `llm-pi-ai` 适配器补两条 provider profile，
流式、工具调用、重试、replay 全部沿用官方实现。0.2.0 起，会话标题栏右侧多一个
**额度 pill**：每条车道一条进度条 + 已用百分比，点开是各个周期（5 小时 / 本周 / 本月）
的「已用 / 总额（百分比）」与刷新时间。

| 项 | 值 |
|---|---|
| 版本 | `0.2.0` |
| tarball | `plugins/dsh-ark-plans/0.1.6-alpha.1/dsh-ark-plans-0.2.0.tgz` |
| sha256 | `04df5a7fec08df8419b4c208c08f3d8cd6a264be87febef9bbcac0cc4806fd40` |
| 字节数 | 26247 |
| peer 结论 | `warn` —— 精确 pin `0.1.6-alpha.1`，换版本 pnpm 会打 peer 警告 |
| 需要配置 | ✅ **要**（套餐 API Key） |

**安装**

```powershell
Invoke-WebRequest -Uri https://raw.githubusercontent.com/HaydenSmith1121/dsh-plugin-collection/main/plugins/dsh-ark-plans/0.1.6-alpha.1/dsh-ark-plans-0.2.0.tgz -OutFile $env:TEMP\dsh-ark-plans-0.2.0.tgz
(Get-FileHash $env:TEMP\dsh-ark-plans-0.2.0.tgz -Algorithm SHA256).Hash.ToLower()   # 应为 04df5a7fec08df8419b4c208c08f3d8cd6a264be87febef9bbcac0cc4806fd40
dsh plugin --profile web add $env:TEMP\dsh-ark-plans-0.2.0.tgz
```

```bash
curl -fL -o /tmp/dsh-ark-plans-0.2.0.tgz https://raw.githubusercontent.com/HaydenSmith1121/dsh-plugin-collection/main/plugins/dsh-ark-plans/0.1.6-alpha.1/dsh-ark-plans-0.2.0.tgz
sha256sum /tmp/dsh-ark-plans-0.2.0.tgz   # macOS: shasum -a 256
dsh plugin --profile web add /tmp/dsh-ark-plans-0.2.0.tgz
```

**配置**：重启后打开 **设置 → 模型**，两行（`火山方舟 Agent Plan` / `火山方舟 Coding Plan`）
各填一次 API Key。Key 落在 `$DSH_HOME/.credentials.yaml` 的
`refs.ARK_AGENT_PLAN_API_KEY` / `refs.ARK_CODING_PLAN_API_KEY`，
**每请求解析，填完不需要重启**。

> 额度 pill 走**控制面 OpenTOP 签名**（不是数据面），复用 `arkcli` 在本机已建立的
> 身份（`~/.arkcli` 的 profile + `identities/<key>/sts.json`）。
> **没登录 arkcli 时插件照常工作**，模型调用完全不受影响 —— 只是那条车道显示
> 「不可用」，点开写明原因（`expired` / `no-identity` / `not-subscribed` / `error` 四态）。

**卸载**

```bash
dsh plugin --profile web remove dsh-ark-plans
```

> 细节（模型清单怎么探测出来的、额度四态、`apiKeyEnv` 只读的成因、自加模型的写法）见
> [`plugins/dsh-ark-plans/README.md`](./plugins/dsh-ark-plans/README.md)。

---

<a name="dsh-excel-viewer"></a>

### 2. `dsh-excel-viewer` — Excel / CSV 表格预览

**作用**：让 `.xlsx` / `.xlsm` / `.xls` / `.csv` / `.tsv` 在 harness 里直接打开 ——
点文件即在右侧预览面板渲染成只读表格（多工作表标签、行列号、工作簿自带格式的数值与日期、
合并单元格、双向滚动、大表分块挂载）。形态是 `ctx.documentPreviews` 里的一个渲染器实现
加 `sidebar.right.tab.document` 的同 id 键控 body：tab、读取、失败行、查看器选择仍全部归
上游 `@deepseek-ai/dsh-client-ui-sidebar-documentpreview` 所有，**宿主半是空模块**，
字节经上游自己的 `workspaceFiles` Remote 读取，因此不存在第二条权限判断路径。

| 项 | 值 |
|---|---|
| 版本 | `0.1.0` |
| tarball | `plugins/dsh-excel-viewer/0.1.6-alpha.1/dsh-excel-viewer-0.1.0.tgz` |
| sha256 | `5f7a4236b6755254886da83b7e2d096d2124e309ea4287ff9fd8bc6b566db97b` |
| 字节数 | 384363 |
| peer 结论 | `ok` —— 只约束 cordis 与 react，不对 dsh 运行时版本通道设 pin |
| 需要配置 | ❌ **不要**（装完即用） |

**安装**

```powershell
Invoke-WebRequest -Uri https://raw.githubusercontent.com/HaydenSmith1121/dsh-plugin-collection/main/plugins/dsh-excel-viewer/0.1.6-alpha.1/dsh-excel-viewer-0.1.0.tgz -OutFile $env:TEMP\dsh-excel-viewer-0.1.0.tgz
(Get-FileHash $env:TEMP\dsh-excel-viewer-0.1.0.tgz -Algorithm SHA256).Hash.ToLower()   # 应为 5f7a4236b6755254886da83b7e2d096d2124e309ea4287ff9fd8bc6b566db97b
dsh plugin --profile web add $env:TEMP\dsh-excel-viewer-0.1.0.tgz
```

```bash
curl -fL -o /tmp/dsh-excel-viewer-0.1.0.tgz https://raw.githubusercontent.com/HaydenSmith1121/dsh-plugin-collection/main/plugins/dsh-excel-viewer/0.1.6-alpha.1/dsh-excel-viewer-0.1.0.tgz
sha256sum /tmp/dsh-excel-viewer-0.1.0.tgz
dsh plugin --profile web add /tmp/dsh-excel-viewer-0.1.0.tgz
```

**配置**：**无。** 重启后打开会话右侧 Sidebar 的「文件」页，点一个表格文件即可。

> 这是本仓库里最大的一个 tarball（384363 字节）—— 因为它在构建期把 SheetJS CE 0.20.3
> **内联**进了 `lib/client.js`。那是分发需要，不是运行时依赖：装它的用户不需要联网取
> `xlsx`，也不会有第二份副本进 `node_modules`。

**卸载**

```bash
dsh plugin --profile web remove dsh-excel-viewer
```

> 细节（GBK CSV 怎么处理、二进制后缀为什么先验文件头、两道渲染上限）见
> [`plugins/dsh-excel-viewer/README.md`](./plugins/dsh-excel-viewer/README.md)。

---

<a name="dsh-memory"></a>

### 3. `dsh-memory` — 跨会话长期记忆

**作用**：turn 结束时把该轮的新对话蒸馏成 markdown 笔记写进 `$DSH_HOME/memory/`，
每次模型请求前把「全局笔记 + 当前工作区笔记」作为作用域提示段注入。
纯宿主半：**无客户端半、无工具、无斜杠命令、无向量检索**，所有写入都限制在
`$DSH_HOME/memory/` 之内，笔记是纯文本，**你可以直接手改**。
触发点选的是 `agent/turn-stopping`（serial、会被 await 的事件）—— 这是 headless
一次跑完就退出时唯一可靠的落盘时机；开销用「新文本量下限 + 同会话最小间隔」两道闸门压住，
**普通短轮次零开销**。

| 项 | 值 |
|---|---|
| 版本 | `0.1.0` |
| tarball | `plugins/dsh-memory/0.1.6-alpha.1/dsh-memory-0.1.0.tgz` |
| sha256 | `e773678ab7b681390a6e7f643ab0c5cee87d996c9d662da6ca004b1c17e60a3e` |
| 字节数 | 17663 |
| peer 结论 | `ok` —— 只约束 cordis；宿主半 `lib/index.js` **不 import 任何包**（只有 `node:` 内置模块） |
| 需要配置 | ❌ **不要**（可选旋钮走环境变量） |

**安装**

```powershell
Invoke-WebRequest -Uri https://raw.githubusercontent.com/HaydenSmith1121/dsh-plugin-collection/main/plugins/dsh-memory/0.1.6-alpha.1/dsh-memory-0.1.0.tgz -OutFile $env:TEMP\dsh-memory-0.1.0.tgz
(Get-FileHash $env:TEMP\dsh-memory-0.1.0.tgz -Algorithm SHA256).Hash.ToLower()   # 应为 e773678ab7b681390a6e7f643ab0c5cee87d996c9d662da6ca004b1c17e60a3e
dsh plugin --profile web add $env:TEMP\dsh-memory-0.1.0.tgz
```

```bash
curl -fL -o /tmp/dsh-memory-0.1.0.tgz https://raw.githubusercontent.com/HaydenSmith1121/dsh-plugin-collection/main/plugins/dsh-memory/0.1.6-alpha.1/dsh-memory-0.1.0.tgz
sha256sum /tmp/dsh-memory-0.1.0.tgz
dsh plugin --profile web add /tmp/dsh-memory-0.1.0.tgz
```

**配置**：**不需要任何配置。** 可选旋钮全部走环境变量（`DSH_MEMORY_MIN_CHARS`
默认 `600`、`DSH_MEMORY_MIN_INTERVAL_MS` 默认 `60000`、`DSH_MEMORY_ROOT` 等 9 个），
这是为了保持「零包导入」而刻意换来的取舍 —— 代价是没有 config schema 校验。

> 蒸馏用**默认模型路由**。想省钱就在「设置 → 模型」里把默认模型换成便宜的 ——
> 蒸馏是一次普通的 `ctx.llm.stream()` 调用，没有单独的模型配置。

**卸载**

```bash
dsh plugin --profile web remove dsh-memory
```

> ⚠️ 卸载**不会**删除已有记忆。`$DSH_HOME/memory/` 下的 markdown 文件原样保留。
> 细节（召回段为什么必须按 agent 注册、只取 `source.kind === 'user'` 的原因）见
> [`plugins/dsh-memory/README.md`](./plugins/dsh-memory/README.md)。

---

<a name="dsh-opencode-go-plus"></a>

### 4. `dsh-opencode-go-plus` — OpenCode Go 模型供应商（自研维护分支）

**作用**：OpenCode Go 的模型供应商适配器，本仓库维护的**派生分支**。
相对基线 `dsh-opencode-go@0.1.2` 的主要改动：修复上游改名后客户端注册 id 错配导致的
**整页白屏**；与基线共存时**不再拖垮整棵插件树**（改为安静退场）；`opencode-go` 路由被
占用时改用 `opencode-go-plus` 继续服务（不再静默放弃整个动态目录）；
全新家族的模型不再被丢弃；0.3.0 把配置入口从插件自带的「设置 → OpenCode Go」分区
**迁到「设置 → 模型」页里的 OpenCode Go 行**。

| 项 | 值 |
|---|---|
| 版本 | `0.3.0` |
| tarball | `plugins/dsh-opencode-go-plus/0.1.6-alpha.1/dsh-opencode-go-plus-0.3.0.tgz` |
| sha256 | `481b8f6bbdee38dc15d2b5cc729fbe7bc25edea6ce52d0f11e69f5d66252cc37` |
| 字节数 | 65141 |
| peer 结论 | ⛔ **`critical`** —— 整套 `@deepseek-ai/*` 精确 pin 在 `0.1.6-alpha.1`，**它决定整批插件的运行时基线** |
| 需要配置 | ❌ 包内不要求；但要填 OpenCode Go 的 API Key 才能用 |

**安装**

```powershell
Invoke-WebRequest -Uri https://raw.githubusercontent.com/HaydenSmith1121/dsh-plugin-collection/main/plugins/dsh-opencode-go-plus/0.1.6-alpha.1/dsh-opencode-go-plus-0.3.0.tgz -OutFile $env:TEMP\dsh-opencode-go-plus-0.3.0.tgz
(Get-FileHash $env:TEMP\dsh-opencode-go-plus-0.3.0.tgz -Algorithm SHA256).Hash.ToLower()   # 应为 481b8f6bbdee38dc15d2b5cc729fbe7bc25edea6ce52d0f11e69f5d66252cc37
dsh plugin --profile web add $env:TEMP\dsh-opencode-go-plus-0.3.0.tgz
```

```bash
curl -fL -o /tmp/dsh-opencode-go-plus-0.3.0.tgz https://raw.githubusercontent.com/HaydenSmith1121/dsh-plugin-collection/main/plugins/dsh-opencode-go-plus/0.1.6-alpha.1/dsh-opencode-go-plus-0.3.0.tgz
sha256sum /tmp/dsh-opencode-go-plus-0.3.0.tgz
dsh plugin --profile web add /tmp/dsh-opencode-go-plus-0.3.0.tgz
```

> ⛔ **从 `dsh-opencode-go` 升级过来必须先卸后装**，顺序不能反 ——
> 两者共用设置命名空间 `llm-opencode-go` 与 provider 路由 `opencode-go`，**都不肯让**：
>
> ```bash
> dsh plugin --profile web remove dsh-opencode-go
> dsh plugin --profile web add /tmp/dsh-opencode-go-plus-0.3.0.tgz
> ```
>
> 四种组合的实测结果：
>
> | 安装情况 | `dsh web` | 结果 |
> |---|---|---|
> | 只有 `dsh-opencode-go-plus` | ✅ 正常 | `opencode-go` 分组 **38** 条模型 |
> | 只有 `dsh-opencode-go`（基线） | ✅ 正常 | **37** 条（无 `union-alpha`） |
> | 两者共存，**基线在前** | ✅ 正常 | 基线服务 37 条；本包记一条 warn 后**主动退场** |
> | 两者共存，**本包在前** | ❌ **退出码 1** | 基线抛未捕获的 `DUPLICATE_DISCOVERY`，整树加载失败，同 profile 其余插件一并挂掉 |
>
> 第四行是**基线的缺陷**，本包无法阻止 —— 唯一办法就是别把两个装在一起。
> 要两者并存做对比，用包内 `examples/migrate-from-fork.patch.yml` 把基线 `disabled`。
>
> **怎么确认装对了：数模型数**（38 且含 `union-alpha` = 本包在服务；37 无它 = 旧包还在）。
> 注意本包的退场是**安静的**：命令行只看得到 `dsh web` 正常启动。

**配置**：API Key 默认引用 `OPENCODE_API_KEY`，可在 `settings.yaml` 的
`llm-opencode-go.apiKeyEnv` 改名。0.3.0 起配置入口是 **设置 → 模型** 里的
OpenCode Go 行（该行显示名 + 凭据绿点）；`refreshMinutes`、`autoDiscover`、
图片预算、`catalogAdditions` 等插件专有字段仍在 `settings.yaml` 的
`llm-opencode-go` 段，行内会明确提示这一点。安装插件**不会**自动更改默认模型。

**卸载**

```bash
dsh plugin --profile web remove dsh-opencode-go-plus
```

> 细节（五处改动分别解决了什么、`catalog resolved` 日志怎么读、路由被占用时怎么办）见
> [`plugins/dsh-opencode-go-plus/README.md`](./plugins/dsh-opencode-go-plus/README.md)。

---

<a name="dsh-session-cleanup"></a>

### 5. `dsh-session-cleanup` — 已归档会话的真实删除

**作用**：上游只有 `archive` / `unarchive`，`SessionPersistence` **没有 delete**，
所以本插件补上真正删除会话日志的能力（因此**带宿主半，必须在进程启动时挂载**），
并顺带清掉历史遗留的「日志已删、id 仍归档」残渣：归档集合里的每个 id 都渲染成行，
日志已不在的行只提供「取消归档」，「全部删除」会把它们一并带上。
它通过 `cordis.patch.yml` 关掉官方只读页 `ui-settings-unarchive-sessions`，
**不替换、不修改任何官方包**。

| 项 | 值 |
|---|---|
| 版本 | `0.1.2` |
| tarball | `plugins/dsh-session-cleanup/0.1.6-alpha.1/dsh-session-cleanup-0.1.2.tgz` |
| sha256 | `fec87c34041445c4edb5722ad0d70f9d834a1dc0dd94bbcc79e9370646dd1786` |
| 字节数 | 18328 |
| peer 结论 | `ok` —— 只约束 cordis 与 react，不对 dsh 运行时版本通道设 pin |
| 需要配置 | ❌ **不要** |

**安装**

```powershell
Invoke-WebRequest -Uri https://raw.githubusercontent.com/HaydenSmith1121/dsh-plugin-collection/main/plugins/dsh-session-cleanup/0.1.6-alpha.1/dsh-session-cleanup-0.1.2.tgz -OutFile $env:TEMP\dsh-session-cleanup-0.1.2.tgz
(Get-FileHash $env:TEMP\dsh-session-cleanup-0.1.2.tgz -Algorithm SHA256).Hash.ToLower()   # 应为 fec87c34041445c4edb5722ad0d70f9d834a1dc0dd94bbcc79e9370646dd1786
dsh plugin --profile web add $env:TEMP\dsh-session-cleanup-0.1.2.tgz
```

```bash
curl -fL -o /tmp/dsh-session-cleanup-0.1.2.tgz https://raw.githubusercontent.com/HaydenSmith1121/dsh-plugin-collection/main/plugins/dsh-session-cleanup/0.1.6-alpha.1/dsh-session-cleanup-0.1.2.tgz
sha256sum /tmp/dsh-session-cleanup-0.1.2.tgz
dsh plugin --profile web add /tmp/dsh-session-cleanup-0.1.2.tgz
```

**配置**：**无。** 重启后打开 **设置 → 已归档会话** 即可用。

> ⚠️ **删除不可恢复** —— 会话日志会被从磁盘上移除，有二次确认。
>
> **装 `0.1.2` 即可，不必先装 `0.1.1`**：0.1.2 supersedes 0.1.1（0.1.1 修好了删除，
> 但历史残渣仍然清不掉）。

**卸载**

```bash
dsh plugin --profile web remove dsh-session-cleanup
```

> 细节（删除的三步为什么是这个顺序、搜索框与「全部删除」的关系、安全边界）见
> [`plugins/dsh-session-cleanup/README.md`](./plugins/dsh-session-cleanup/README.md)。

---

<a name="dsh-workbuddy-quota"></a>

### 6. `dsh-workbuddy-quota` — WorkBuddy 额度与用量

**作用**：在界面上显示 WorkBuddy 的**剩余额度**（composer 模型选择器旁的积分 pill），
并统计**本机 harness 花了多少 token**（设置 → Token usage，可选 Today / Last 7 days /
Last 30 days / All time，给出总量与四个 provider 上报桶：未缓存输入 / 输出 / 缓存读 /
缓存写，外加缓存读占比与模型调用次数）。两个功能都是**只读**的：不持有凭据、
不联系 provider、不改变模型路由。

| 项 | 值 |
|---|---|
| 版本 | `0.2.0` |
| tarball | `plugins/dsh-workbuddy-quota/0.1.6-alpha.1/dsh-workbuddy-quota-0.2.0.tgz` |
| sha256 | `744a39879202782bdbca4d8235094949b73accf7c2f0153841872aed2d2388f8` |
| 字节数 | 14507 |
| peer 结论 | `ok` —— 只约束 cordis 与 react，不对 dsh 运行时版本通道设 pin |
| 需要配置 | ❌ 包内不要求；但**额度 pill 依赖 `dsh-workbuddy-connect`**（见下） |

**安装**

```powershell
Invoke-WebRequest -Uri https://raw.githubusercontent.com/HaydenSmith1121/dsh-plugin-collection/main/plugins/dsh-workbuddy-quota/0.1.6-alpha.1/dsh-workbuddy-quota-0.2.0.tgz -OutFile $env:TEMP\dsh-workbuddy-quota-0.2.0.tgz
(Get-FileHash $env:TEMP\dsh-workbuddy-quota-0.2.0.tgz -Algorithm SHA256).Hash.ToLower()   # 应为 744a39879202782bdbca4d8235094949b73accf7c2f0153841872aed2d2388f8
dsh plugin --profile web add $env:TEMP\dsh-workbuddy-quota-0.2.0.tgz
```

```bash
curl -fL -o /tmp/dsh-workbuddy-quota-0.2.0.tgz https://raw.githubusercontent.com/HaydenSmith1121/dsh-plugin-collection/main/plugins/dsh-workbuddy-quota/0.1.6-alpha.1/dsh-workbuddy-quota-0.2.0.tgz
sha256sum /tmp/dsh-workbuddy-quota-0.2.0.tgz
dsh plugin --profile web add /tmp/dsh-workbuddy-quota-0.2.0.tgz
```

**配置**：**不需要填任何东西**（无 API Key、无设置项）。
但要注意额度 pill 的数据来自**另一个插件**：

> **额度 pill 读取的是 `dsh-workbuddy-connect` 挂的状态路由**
> （`/plugins/dsh-workbuddy-connect/status` 与 `.../ai/status`）。
> **本仓库不含 `dsh-workbuddy-connect`** —— 它属于市场侧的第三方插件。
> 没装它时，pill 会如实显示「积分不可用 / Credits unavailable」，
> **Token usage 页面不受影响**（那条路由由本插件自己的宿主半提供）。
> 宿主半需要**进程重启**才会挂上路由 —— 重启前页面会明说这一点，而不是给一个裸 404。

**卸载**

```bash
dsh plugin --profile web remove dsh-workbuddy-quota
```

> 细节（token 折叠算法为什么必须复刻 DSH 自己的投影、三个 load-bearing 细节、
> 已知统计边界）见 [`plugins/dsh-workbuddy-quota/README.md`](./plugins/dsh-workbuddy-quota/README.md)。

---

<a name="two-ways"></a>

## 🔀 两种装法：面板装 vs 手动装

两条路都受支持，**装进去的是同一批字节**。

### 方式 A（推荐）：装一次市场面板，之后点装

```powershell
# 1) 装引导插件 dsh-plugins-market（它托管在 dsh-plugins 仓库，不在本仓库）
Invoke-WebRequest -Uri https://raw.githubusercontent.com/HaydenSmith1121/dsh-plugins/main/plugins/dsh-plugins-market/0.1.6-alpha.1/dsh-plugins-market-0.3.0.tgz -OutFile $env:TEMP\dsh-plugins-market-0.3.0.tgz
dsh plugin --profile web add $env:TEMP\dsh-plugins-market-0.3.0.tgz
dsh web    # 左侧导航 →「插件市场」
```

面板里挑插件 → 点「安装」→ 重启 `dsh web`。市场会在装前跑兼容性闸门
（环境 / profile / 候选包三层，致命项硬拦截），失败自动回滚，并且**始终给出一份
拿到就能执行的手动安装方案**（tarball 绝对路径 + sha256 + `dsh plugin add` + 重启提示），
可按 shell 切换（PowerShell / bash）。

> ⚠️ **引导插件 `dsh-plugins-market` 属于 `dsh-plugins`（市场）仓库，不属于本仓库。**
> 本仓库的 6 个插件全是「被市场安装的东西」。上面的版本号与路径取自市场仓库，
> 若那边发了新版，以市场仓库的说明为准。
> 更完整的路径（含一键安装脚本与 `-BootstrapOnly`）见
> [dsh-plugins 的安装文档](https://github.com/HaydenSmith1121/dsh-plugins/blob/main/README-安装说明.md)。

### 方式 B：手动下载 + `dsh plugin add`

就是[第四节](#plugins-install)里每个插件的命令：

```bash
# 下载（curl / Invoke-WebRequest）→ 校验 sha256 → add → 重启 dsh web
dsh plugin --profile web add <下载后的 .tgz 绝对路径>
```

### 两条路为什么等价

**sha256 就是它们之间的那条链**：市场侧的采集脚本读本仓库 `manifest.json` 的
`install.url` 与 `install.sha256`，面板下载的就是这个 URL、校验的就是这个 sha256；
你在第四节手动下载的是同一个 URL、同一个 sha256。所以：

| | 市场面板（方式 A） | 手动（方式 B） |
|---|---|---|
| tarball 来源 | `manifest.json` → `install.url` | 同一个 URL（raw.githubusercontent.com） |
| 字节校验 | 面板装前闸门核 `sha256` | 你自己 `Get-FileHash` / `sha256sum` |
| 落进 profile 的形式 | `file:<下载缓存路径>` | `file:<你下载的路径>` |
| 装前进度与预计时间 | ✅ 有 | ❌ 只有 pnpm 输出 |
| 失败自动回滚 | ✅ 有 | ❌ 手动 |
| 需要先装别的插件 | ✅ 需要 `dsh-plugins-market` | ❌ 不需要 |

> 两条路的产物**都**是 profile `package.json` 里一条 `file:` 依赖 + 一条
> `dsh.profile.bundles` 条目 —— 没有「面板装的是另一种插件」这回事。

---

<a name="market"></a>

## 🔗 与市场（`dsh-plugins`）的关系

市场仓库里的采集脚本 `scripts/sync-catalog.mjs` 是**唯一**会写 `catalog/` 的东西，
它按优先级合并四路数据：

| 优先级 | 来源 | 说明 |
|---|---|---|
| 1 | `catalog/overrides/reviewed.json` | 人工审核过的第三方插件（带审核证据） |
| 2 | **本仓库的 `manifest.json`** | 本仓库自己维护、托管 tarball 的插件 → tier = `verified` |
| 3 | 公开索引 `plugins.json` | 社区插件（默认层级） |
| 4 | 已有的 `catalog/plugins/*.json` | 上一轮结果 —— 人工审核结论与首次发现时间靠它传承 |

对本仓库的这一路，它做的是：

```none
manifest.json 的一个 plugin 条目  →  catalog/plugins/<slug>.json  （一个插件一份配置）
                                      version / author / license / repo / tags
                                      install: { method: "tarball", url, sha256, bytes }
                                      notes / peerRuntimePin / peerVerdict / peerNote
```

**因此：本仓库发布新版本时，市场侧不需要任何改动。**
版本号、sha256、下载 URL 全部来自 `manifest.json`，市场只是照抄。
你要做的只有三件事（见下一节）：放新 tarball → 改 `plugin.json` → 跑生成脚本。

> 市场侧的 `verified` 层含义是「由插件集合仓库托管 tarball、按当前 dsh 版本实测过」；
> 它会与 `reviewed` / `community` 层**去重合并**，同一插件只保留层级最高的那条。
> 采集脚本找不到本仓库时（例如离线且无缓存）会明确记一句「本轮不含自研插件」，
> 而不是静默丢掉这些条目。

---

<a name="new-version"></a>

## ➕ 新增版本 / 新增插件

### 单一事实来源

> **人工维护的只有两样东西：`plugins/<id>/plugin.json` 与该插件的 `README.md`。**
> `manifest.json` 是**派生**的 —— 由 `scripts/build-manifest.mjs` 从各 `plugin.json`
> 生成，**禁止手写**。

生成脚本每次都对 tarball **重新取指纹**，并核对 `plugin.json` 里记的那一份：

```bash
node scripts/build-manifest.mjs            # 生成 / 刷新 manifest.json
node scripts/build-manifest.mjs --check    # 只校验，不写盘（CI 用）
```

sha256 对不上会直接报错，提示「已发布的字节不能被改写」——
这正是它要挡住的事：**一个已发布版本的 sha256 是冻结的**。

### 新增一个版本（同一个插件）

1. **新增 tarball 文件，绝不覆盖旧的** —— 放到 `plugins/<id>/<dsh 版本>/<包名>-<新版本>.tgz`。
   已经发布过的文件字节不可改写：改了 sha256 就变了，等于把「装回来的还是当初那一份」作废。
2. 在 `plugin.json` 的 `versions[]` 里**追加**一条（`version` / `dshVersion` / `tarball` /
   `sha256` / `bytes` / `files` / `status` / `verifiedAt`），并把上一条的 `status` 改成
   `superseded`、补上 `supersededBy` 与 `supersedesNote`（写清这一版改了什么、要不要紧）。
3. 把 `latest` 那条的版本号同步到顶层字段（`version` / `tarball` / `sha256` / `bytes`）。
4. **新增一套快照**：`snapshots/<id>/<插件版本>/<包名>-<版本>.tgz`（快照层是**插件版本**，
   与 `plugins/` 下的 **dsh 版本**层含义相反）。已收录的快照不得修改、覆盖或删除。
5. `node scripts/build-manifest.mjs` → 提交。
   写 `plugin.json` 时 `sha256` 可以先留空让脚本算出实测值，再回填。

### 新增一个插件

1. 新建 `plugins/<id>/plugin.json`，字段照现有文件抄：`id`（**必须与目录名一致**，
   脚本会校验）、`package` / `title` / `summary` / `tags` / `author` / `license` /
   `origin` / `originNote` / `needsConfig` / `usageNeedsConfig` / `peerRuntimePin` /
   `peerVerdict` / `peerNote` / `coexistenceWarning` / `notes` / `source` / `versions[]`。
2. 放 tarball 到 `plugins/<id>/<dsh 版本>/`，加一套 `snapshots/<id>/<插件版本>/`。
3. 写该插件的 `plugins/<id>/README.md`。
4. `node scripts/build-manifest.mjs`。少一个 `plugin.json`、`id` 与目录名不符、
   tarball 不存在、sha256 对不上 —— 这四类都会被脚本明确报出来。

> `manifest.json` 里的 `generatedAt` **只在内容真的变了的时候才推进**，避免每次跑都产生
> 一次无意义提交。`--check` 因此判的是「配置与清单是否一致」，而不是时间戳。

---

<a name="pitfalls"></a>

## ⚠️ 装不上时先看这里

### `ERR_PNPM_IGNORED_BUILDS` 的假象（★ 最有欺骗性）

```none
Error: ERR_PNPM_IGNORED_BUILDS
  × adding a new package
  ╰─▶ Ignored build scripts: @google/genai@1.52.0, protobufjs@7.6.6
dsh: pnpm failed in profile directory ...
```

看到这个报错，第一反应是「装失败了」，但实际状态是：

| 检查项 | 实际 |
|---|---|
| `node_modules/dsh-opencode-go-plus/` | ✅ **已存在**，依赖也全部链接完毕 |
| `package.json` 的 `dependencies` | ✅ **已写入** |
| `package.json` 的 `dsh.profile.bundles` | ❌ **没有追加** |

原因：dsh 的流程是「先跑 pnpm → 成功后才写 bundles」。pnpm 因「有未批准的构建脚本」
**以非 0 退出**，dsh 就提前 return 了。最终表现是**插件文件都在 `node_modules` 里，
但 GUI 里完全看不到它** —— 很容易误判成「装了但没生效」而去查前端。

> **规矩：只要 pnpm 退出码非 0，就当作「这条插件没装完」。**

**修法**：预置 `allowBuilds`，然后**重跑同一条 `dsh plugin add`**（幂等，会报
`Lockfile is up to date`）→ 退出码 0 → dsh 这才补上 bundles 条目。
在 `~/.dsh/profiles/web/pnpm-workspace.yaml` 里加：

```yaml
allowBuilds:
  '@google/genai': false
  protobufjs: false
```

填 `false` 的含义是「**已知并同意忽略**」，不是「跳过构建」：`protobufjs` 的
`postinstall` 只打印一句提示；`@google/genai` 的 `prepare` 对 tarball 安装本就不执行。
触发这两条的是 `dsh-opencode-go-plus`。

> ⚠️ **不要用 `strictDepBuilds: false` 一把梭** —— 那会把将来真正需要编译的依赖
> （native 模块等）也静默跳过。用 `allowBuilds` 逐个白名单更安全：保留了严格模式，
> 遇到新的未知构建脚本仍会报出来。已实测 dsh **不会覆盖**这个文件。

### `pnpm` 必须装在「dsh 所在的那个 Node」上

多 Node 环境（nvm、便携版 Node 并存）下，直接跑 `npm i -g pnpm` 很可能装到了**另一个**
Node 上。结果是 `'pnpm' 不是内部或外部命令`，连 `dsh plugin --profile web list` 都会这样报
（`list` 同样转发给 pnpm）。

```powershell
Get-Command dsh | Select-Object Source      # 假设输出 ...\AppData\Roaming\npm\dsh.cmd
& "C:\Users\你\AppData\Roaming\npm\npm.cmd" install -g pnpm
```

### GUI 里看不到插件

按这个顺序排查：**`dsh --version` 是不是 `0.1.6-alpha.1`** →
**pnpm 退出码是不是 0**（上面那条）→ **`dsh.profile.bundles` 里有没有它** →
**重启过 `dsh web` 没有**（新增 bundle 在启动时合成）。

```bash
grep -o 'file:[^"]*' ~/.dsh/profiles/web/package.json     # 依赖有没有写进去、路径还在不在
```

### 卸载 / 回滚

```bash
dsh plugin --profile web remove <包名>     # 例如 dsh plugin --profile web remove dsh-receipt
```

> 动手前建议先备份 `~/.dsh/profiles/web/` 下的三个文件：
> `package.json`、`pnpm-workspace.yaml`、`cordis.patch.yml`。出错时把它们还原即可整体回滚。

---

<a name="license"></a>

## ⚖️ 许可

- 本仓库**自身的**代码与文档：**MIT**
- **第三方组件保留其各自的许可**，本仓库不改写、不覆盖它们的许可声明：

| 插件 | 第三方成分 | 许可 |
|---|---|---|
| `dsh-opencode-go-plus` | 派生自 [`Duskriver/dsh-opencode-go`](https://github.com/Duskriver/dsh-opencode-go) `@0.1.2`；其适配器、设置 UI 与 `src/conversion/*` 又派生自 DeepSeek Harness | MIT（归属见包内 `THIRD_PARTY_NOTICES.md` 与 `docs/derivation.md`） |
| `dsh-excel-viewer` | **内联分发** SheetJS Community Edition `0.20.3`（版权 © 2012-present SheetJS LLC） | Apache-2.0（全文见 <https://www.apache.org/licenses/LICENSE-2.0>；归属见包内 `THIRD_PARTY_NOTICES.md`） |
| 其余 4 个 | 无第三方成分 | MIT |

> `dsh-excel-viewer` 用的是 SheetJS 官方 CDN 的 `0.20.3`，不是 npm 上停在 2022 年的
> `0.18.5` —— 后者带有已在后续版本修复的问题（CVE-2023-30533 原型污染、
> CVE-2024-22363 ReDoS），而本插件解析的是**用户文件**，正处在触发面上。
>
> 包内是否随附许可正文各不相同（`dsh-memory` 与 `dsh-workbuddy-quota` 的 tarball
> **未附** `LICENSE` 正文，`plugin.json` 声明 MIT）。如实记录，不做补写。

**第三方插件的版权归各自原作者所有。** 如你是某个插件的原作者、希望调整或移除收录方式，
请开 Issue 或直接联系，我们会立即处理。
