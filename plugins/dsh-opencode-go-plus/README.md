# dsh-opencode-go-plus

在 DeepSeek Harness 里使用 **OpenCode Go** 订阅模型 —— 支持流式回复、工具调用、图片输入与
额度显示。本包是 [`Duskriver/dsh-opencode-go`](https://github.com/Duskriver/dsh-opencode-go)
的**本仓库维护分支**，取代旧的 `dsh-opencode-go`；**两者不能装进同一个 profile**。

**[← 回仓库首页](../../README.md)** · [全部插件](../../README.md#plugins-install)

> ⛔ **本插件决定整批插件的运行时基线。** 它把整套 `@deepseek-ai/*` 精确 pin 在
> `0.1.6-alpha.1`（沿用基线、未做改动），peer 结论是 **`critical`** ——
> dsh 版本不对时**整棵插件树加载失败、`dsh web` 完全起不来**。

---

## 一、作用

| 能力 | 表现 |
|---|---|
| 模型供应商 | 在「设置 → 模型」页出现一条 **OpenCode Go** 行（0.3.0 起不再自带侧边栏分区） |
| 自动适配新模型 | 网关新上线的模型**自动出现**：按同族已知模型克隆协议与参数；**同族不存在时退到全局最接近的模型兜底**，不再丢弃。默认每 **5 分钟**重新解析一次实时目录 |
| 会话请求头 | 每次请求带 Harness User-Agent（`attributionHeaders()`）与 `x-opencode-session`；同一会话保持相同 ID |
| 流式与历史 | 流式输出、工具调用、历史回放，协议请求由 pi-ai 执行 |
| 图片输入 | 支持目录中声明图片能力的模型，需要 DSH attachment 服务 |
| 额度显示 | 会话输入区的额度 pill，路径为 `GET {baseURL}/usage` |
| 自检日志 | 每次目录解析打一行四项计数，回答「为什么这个模型不在列表里」 |

### 它相对基线改了什么（五处）

五处改动都针对同一类事故：**模型明明在网关目录里，却没出现在选择器中，而且不给任何提示。**

| # | 改动 | 基线的问题 |
|---|---|---|
| 1 ★ | **与基线共存时不再拖垮整棵插件树** | 上游只处理了**路由**冲突（`registerAdapter`），却漏掉了第二处同样 all-or-nothing 的注册：`ctx.llm.registerModelDiscovery(settingsNs, …)`，它以**设置命名空间**为键，重复注册抛 `DUPLICATE_DISCOVERY`。上游没有捕获它，错误从 loader 自身的 effect 里抛出 → **`dsh web` 完全起不来**，同 profile 其余插件一起挂掉。现在会在 **claim 路由之前**先做这一步，撞车时**静默退场**并打一条 warn |
| 2 | `opencode-go` 路由被占用时**不再静默放弃** | `ctx.llm.registerAdapter()` 同样是全有或全无的：路由已被占用就抛 `DUPLICATE_ADAPTER`。上游捕获后只写一行 error 日志然后放弃 → **整个动态目录都不可用**（占位的往往是 `settings.yaml` 里手工物化的静态模型表，它不会自己增长，于是网关新上线的模型永远不出现）。现在改为注册 `opencode-go-plus` 路由并说明原因与修法 |
| 3 | **全新家族的模型不再被丢弃** | 上游要求未知模型必须能找到**同族**（首词归一化后相同）的已知模型才能克隆协议与参数，找不到就整条丢掉 —— 网关一旦上线一个全新品牌的模型（例如 `union-alpha`），它就**永远不出现在列表里**。现在改为借用全局最接近的模型：按 token 重叠度打分 → 归到目录内多数协议 → 用 ID 长度接近度决胜 |
| 4 | **解析结果自检日志** | 新增 `catalog resolved (curated …, live listing …, adapted …, omitted …, served …)` 一行四项计数 |
| 5 | `catalogAdditions` **改为可配置** | 上游把追加项硬编码在源码里；现在它是设置项，默认值不变。条目必须四个字段齐全，缺一个会被忽略（不会半成品地塞进目录） |

`catalog resolved` 那一行怎么读：

| 字段 | 含义 |
|---|---|
| `curated` | 内置 pi-ai 目录 + `catalogAdditions` 追加项 |
| `live listing` | 网关 `/models` 返回的条数（失败时该行降级为 warn，并显示退回本地表） |
| `adapted` | 未知 ID 按族克隆 / 借用后加入的条数 |
| `omitted` | 完全无法描述的 ID（现在应为 0；非 0 时会列出具体 ID 并提示用 `catalogAdditions` 补） |
| `served` | 最终出现在选择器里的条数 |

另有 `missing` 提示：目录里有、但网关已不再列出的 ID（通常是已下线）会被标注为 withheld。

---

## 二、安装

| 项 | 值 |
|---|---|
| 版本 | **`0.3.0`**（当前最新） |
| dsh 基线 | `0.1.6-alpha.1` |
| tarball | `plugins/dsh-opencode-go-plus/0.1.6-alpha.1/dsh-opencode-go-plus-0.3.0.tgz` |
| URL | https://raw.githubusercontent.com/HaydenSmith1121/dsh-plugin-collection/main/plugins/dsh-opencode-go-plus/0.1.6-alpha.1/dsh-opencode-go-plus-0.3.0.tgz |
| sha256 | `481b8f6bbdee38dc15d2b5cc729fbe7bc25edea6ce52d0f11e69f5d66252cc37` |
| 字节数 | 65141 |

**Windows（PowerShell）**

```powershell
Invoke-WebRequest -Uri https://raw.githubusercontent.com/HaydenSmith1121/dsh-plugin-collection/main/plugins/dsh-opencode-go-plus/0.1.6-alpha.1/dsh-opencode-go-plus-0.3.0.tgz -OutFile $env:TEMP\dsh-opencode-go-plus-0.3.0.tgz
(Get-FileHash $env:TEMP\dsh-opencode-go-plus-0.3.0.tgz -Algorithm SHA256).Hash.ToLower()
# 期望：481b8f6bbdee38dc15d2b5cc729fbe7bc25edea6ce52d0f11e69f5d66252cc37
dsh plugin --profile web add $env:TEMP\dsh-opencode-go-plus-0.3.0.tgz
```

**macOS / Linux**

```bash
curl -fL -o /tmp/dsh-opencode-go-plus-0.3.0.tgz \
  https://raw.githubusercontent.com/HaydenSmith1121/dsh-plugin-collection/main/plugins/dsh-opencode-go-plus/0.1.6-alpha.1/dsh-opencode-go-plus-0.3.0.tgz
sha256sum /tmp/dsh-opencode-go-plus-0.3.0.tgz      # macOS 用 shasum -a 256
# 期望：481b8f6bbdee38dc15d2b5cc729fbe7bc25edea6ce52d0f11e69f5d66252cc37
dsh plugin --profile web add /tmp/dsh-opencode-go-plus-0.3.0.tgz
```

**装完重启 `dsh web`**，然后打开 **设置 → 模型**，找到 **OpenCode Go** 行
（该行显示凭据绿点 = 已配置）。

> ⛔ **从 `dsh-opencode-go` 升级过来必须先卸后装，顺序不能反。** 见下面「共存禁忌」。
>
> ```bash
> dsh plugin --profile web remove dsh-opencode-go
> dsh plugin --profile web add /tmp/dsh-opencode-go-plus-0.3.0.tgz
> ```
>
> ⚠️ 那个 tarball 的路径不能删、不能挪（`dsh plugin add` 生成的是 `file:` 依赖）。
> 注意：这个包是**唯一**会触发 `ERR_PNPM_IGNORED_BUILDS` 的插件（它带来的
> `@google/genai` / `protobufjs`），**装它之前先预置 `allowBuilds`** ——
> 见[首页「装不上时先看这里」](../../README.md#pitfalls)。

---

## 三、配置

| 项 | 位置 | 说明 |
|---|---|---|
| API Key | **设置 → 模型 → OpenCode Go 行 → 编辑** | 默认引用 `OPENCODE_API_KEY`，可在 `settings.yaml` 的 `llm-opencode-go.apiKeyEnv` 改名 |
| 插件专有字段 | `settings.yaml` 的 `llm-opencode-go` 段 | `refreshMinutes`、`autoDiscover`、图片预算、`catalogAdditions` —— 行内的「编辑」卡片**只有通用凭据字段**，并会明确提示其余字段留在这里手改 |

**安装插件不会自动更改默认模型。**

追加一个目录外的模型（条目必须四个字段齐全）：

```yaml
llm-opencode-go:
  catalogAdditions:
    - id: deepseek-v4.1-flash
      siblingId: deepseek-v4-flash
      inputSiblingId: deepseek-v4-flash-vision-exp
      name: DeepSeek V4.1 Flash
```

> **想让插件重新占用 `opencode-go` 这个名字**（而不是 `opencode-go-plus`）：
> 删掉 `settings.yaml` 里 `llm-pi-ai.providers.opencode-go` 那一段即可。
> ⚠️ **不要在「设置 → 模型 → opencode-go」里点「获取可用模型 → 添加所选」** ——
> 那一步会把目录重新物化回 `settings.yaml`，问题复现。

---

## 四、版本

| 版本 | 状态 | 变化 | sha256 | 字节数 | 实测 |
|---|---|---|---|---|---|
| `0.2.1` | superseded | 修复浏览器端白屏：`lib/client.js` 内硬编码的客户端注册 id 改对 | `2123562f683e94b7a8b63ed2b9ba092298fcedd18dac3b20a4bc2ced078fa78b` | 61497 | 未记录 |
| **`0.3.0`** | **latest** | 配置入口从插件自带的「设置 → OpenCode Go」分区**迁到「设置 → 模型」页里的 OpenCode Go 行**；宿主半新增 `registerConfigurableProviders` 声明、客户端半删掉 `settings.section` 注册，并去掉 `@deepseek-ai/dsh-client-ui-settings` 这个 peer | `481b8f6bbdee38dc15d2b5cc729fbe7bc25edea6ce52d0f11e69f5d66252cc37` | 65141 | `2026-09-17` |

**`0.3.0` supersedes `0.2.1`**（原文）：

> 0.3.0 把配置入口从插件自带的「设置 → OpenCode Go」分区迁到「设置 → 模型」页里的
> OpenCode Go 行：宿主半新增 `registerConfigurableProviders` 声明、客户端半删掉
> `settings.section` 注册，并去掉 `@deepseek-ai/dsh-client-ui-settings` 这个 peer。
> **0.2.1 的功能没有缺失，只是同一个 provider 有两个配置入口；留在 0.2.1 也能用，
> 但侧边栏会继续多出一个分区。**

> 💡 **`0.2.1` 是本仓库里唯一一个「功能没缺失、但仍被取代」的版本** ——
> 如果你就是要那两个配置入口（或依赖那条侧边栏分区），`0.2.1` 的 tarball
> 仍在仓库里，可以照上面的方式改文件名安装。
> 注意 `0.2.1` **没有收录快照**（`snapshot: null`）—— 目录快照只对 `0.3.0` 存在。

`0.2.1` 修掉的是 `0.2.0` 的白屏：那个版本的 `lib/client.js` 是从上游源码编译的，
包改名后脚本内硬编码的注册 id 仍是 `dsh-opencode-go`，与 dsh 下发的启动图 entry id
（`dsh-opencode-go-plus`）不匹配 → `dsh-client-modules` 的 `arrive()` 以
*bundle loaded without registering "&lt;id&gt;"* 失败并重放脚本 → 第二次执行撞上已注册的
`@deepseek-ai/dsh-api-gateway`，抛 duplicate factory registration →
浏览器端白屏「Failed to load plugins」。**服务端 `lib/index.js` 不受影响。**
（`0.2.0` 未收录进本仓库快照，`compatibility.json` 里有它的 sha256 与原因说明。）

---

## 五、已知问题 / 注意

### ⛔ 共存禁忌：不能与 `dsh-opencode-go` 装进同一个 profile

两者共用设置命名空间 `llm-opencode-go` 与 provider 路由 `opencode-go`，**都不肯让**。
**四种组合均实测**（Windows / Node 24.14.0 / pnpm 12.4.2 / dsh 0.1.6-alpha.1）：

| 安装情况 | `dsh web` | 结果 |
|---|---|---|
| ① 只有本包 | ✅ 正常 | 服务 **38** 条模型 |
| ② 只有基线 | ✅ 正常 | **37** 条（无 `union-alpha`） |
| ③ 两者共存，**基线在前** | ✅ 正常 | 基线服务 37 条；本包检测到冲突后**记一条 warn 并主动退场** |
| ④ 两者共存，**本包在前** | ❌ **退出码 1** | 基线抛未捕获的 `DUPLICATE_DISCOVERY`，从 loader 自身的 effect 里逸出，**整棵插件树加载失败**，同 profile 其余插件一并挂掉 |

**④ 是基线的缺陷，本包无法阻止。** 唯一办法就是别把两个装在一起。

- **怎么确认装对了：数模型数** —— `38` 条且含 `union-alpha` = 本包在服务；
  `37` 条且无它 = 旧包还在服务、本包已退场。
- **退场是安静的**：命令行只看得到 `dsh web` 正常启动，模型数停在旧包的 37。
  原因是 `ctx.logger.warn` **只写入 harness 的内存日志环形缓冲（1000 条），不输出到终端**
  —— cordis 的 `LoggerService` 默认只注册一个 exporter，没有任何东西转发到 stdout。
- **要两者并存做对比**：用包内 `examples/migrate-from-fork.patch.yml` 把基线
  `- id: opencode-go` 设为 `disabled: true`，作为 patch overlay 应用。
  ⚠️ 要 patch 的是**插件 id** `opencode-go`，**不是**设置命名空间 `llm-opencode-go`
  —— 后者必须保持原样，你既有的 API Key 与配置才能活过这次迁移。
  只装两个而不 patch、指望顺序解决，就是上面的崩溃情形。

### 其它注意

| # | 事项 | 说明 |
|---|---|---|
| 1 | **peer 结论：`critical`** | 整套 `@deepseek-ai/*` 精确 pin 在 `0.1.6-alpha.1`。`0.1.5-rc.x` 内置的 `@deepseek-ai/dsh-llm` 缺 `IMAGE_OFFLOAD_REQUIRED_CODE` / `offloadedImageText` / `projectOffloadedImages` / `requiredImageOffload` 导出 → ESM 具名导入**确定性失败** → 整棵插件树加载失败。**上游 `0.1.0` / `0.1.1` / `0.1.2` 全部要求 alpha，没有兼容 0.1.5 的版本可选，所以只能升 dsh、不能退插件** |
| 2 | **`opencode-go-plus` 这个路由名是刻意的** | 可配置 provider 目录**拒绝重复声明**，而 `opencode-go` 已被 `@deepseek-ai/dsh-llm-pi-ai` 声明（它内置的 pi-ai 目录里就有同名路由，`declared: false`）。若声明成 `opencode-go`，`registerConfigurableProviders` 会抛 `DUPLICATE_DIRECTORY`，且异常从 `apply()` 里逸出 → **其后所有语句全部跳过，插件彻底失效**（`listProviders()` 里只剩先注册的那一个，插件自己的 `route registered` 日志根本不出现）。换成 `opencode-go-plus` 后启动干净，目录里恰好新增一条 `opencode-go-plus <- llm-opencode-go[]` |
| 3 | 模型数是 **38**（含 `union-alpha`） | 这是「本包在服务」的判据 |
| 4 | 参数是**估计值** | 网关 `/models` 只返回 `id` / `object` / `created` / `owned_by`，不含容量或协议信息，所以自动适配的模型参数是估计值 —— 但**用户能在选择器里看到它、能选中它、能改它**，而丢弃只会让人以为网关没有这个模型。猜错的参数可以用 `modelOverrides` 覆盖 |
| 5 | ⚠️ **没有发起过真实付费补全** | 分发版的实测记录（包内 `docs/verification.md`）覆盖了目录解析、路由注册、Models 行声明与共存行为；**生成与流式没有测** |
| 6 | 包内 `docs/verification.md` 是**分发版**的实测记录 | 基线那份描述的是源码仓库，它引用的 `npm run typecheck` / `npm test` / `verify:installed` 在 tarball 里根本没有对应文件，**跑不通** |
| 7 | 浏览器侧**已实测** | 0.3.0 的 Web UI 在浏览器里驱动过：设置侧边栏**没有** OpenCode Go 分区；模型页出现 DeepSeek / **OpenCode Go** / 火山方舟 Agent Plan 三行；OpenCode Go 行显示名、路由 `opencode-go-plus`、绿色凭据点（`API 密钥已配置`）均在位 |

---

## 六、卸载

```bash
dsh plugin --profile web remove dsh-opencode-go-plus
# 或 headless profile：
dsh plugin --profile headless remove dsh-opencode-go-plus
dsh web        # 重启
```

Web 与 Headless 使用各自的 profile，**需要分别安装、也分别卸载**。

> **配置不会被删掉** —— `settings.yaml` 里的 `llm-opencode-go` 段与
> `$DSH_HOME/.credentials.yaml` 里的 Key 都留着，重装即可继续用。

---

## 七、来源与许可

| 项 | 值 |
|---|---|
| 来源 | **本仓库自研的派生分支**（`origin: self`，`replaces: dsh-opencode-go@0.1.2`） |
| 作者 | HaydenSmith1121（`package.json` 的 `contributors` 另列 `Duskriver (upstream dsh-opencode-go)` 与 `DeepSeek Harness (adapter and conversion modules)`） |
| 许可 | **MIT** |
| tarball 内是否附许可正文 | ✅ 是（`package/LICENSE`，另附 `THIRD_PARTY_NOTICES.md` 与 `docs/derivation.md`） |
| 源码 | ❌ **不在本仓库内** —— 「本仓库只保留了编译产物（tarball）。源码不在本仓库内，见 `plugin.json` 的 `originNote` 与包内 `docs/`」。包内 `package.json` 也写明 `shipsPrebuilt`：分发的是编译后的 `lib/`，没有构建步骤可跑 |

### 派生链与归属

| 层 | 来源 | 许可 |
|---|---|---|
| 基线 | [`Duskriver/dsh-opencode-go`](https://github.com/Duskriver/dsh-opencode-go) `@0.1.2` | MIT |
| 适配器、设置 UI 与 `src/conversion/*` | 派生自 **DeepSeek Harness** | MIT |
| 本仓库的改动 | 在基线之上改写了 **5 处宿主侧逻辑**（`lib/index.js` 加 3 个 `.d.ts` 声明），以编译产物形式分发 | MIT |

上游 `package.json` 的 `author` 字段缺失，上游信息来自其 `repository` 字段与包内 `LICENSE`。
完整归属与改动清单见包内 `THIRD_PARTY_NOTICES.md` 与 `docs/derivation.md`。

> 本分支的问题请提到 <https://github.com/HaydenSmith1121/dsh-plugins/issues>。
