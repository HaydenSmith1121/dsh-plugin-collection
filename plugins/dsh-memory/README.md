# dsh-memory

给 DeepSeek Harness 加一层**跨会话长期记忆**：一轮结束后自己把新对话蒸馏成 markdown 笔记，
下一次会话开始时，**全局笔记 + 当前工作区笔记**作为提示段自动带上。
适配 dsh `0.1.6-alpha.1`，**纯宿主半、零包导入、不需要任何配置**。

**[← 回仓库首页](../../README.md)** · [全部插件](../../README.md#plugins-install)

---

## 一、作用

它补的是 harness 自身**缺的那一环**：会话结束 → 自己总结 → 下次自动带上。

| harness 现有能力 | 边界 |
|---|---|
| `dsh-compaction-*` | 只压**当前会话**上下文，会话一结束就没了 |
| `dsh-session-persistence-jsonl` | 会话原文存在 `$DSH_HOME/sessions`，但**没有任何东西会去读它、总结它** |
| `dsh-agent-instructions` | 每次会话自动注入 `AGENTS.md`，但那是**人手写**的，不会自己长 |
| `dsh-session-query-sqlite` | 有全文检索，但默认 `openAt: never`，且检索是「你主动去查」 |

### 召回（每次模型请求前）

给**每个 agent** 注册一个作用域提示段：

```js
agent.ctx.inject(['systemPrompt'], (scope) => {
  scope.systemPrompt.section({
    name: 'memory:recall',
    order: scope.systemPrompt.getSectionOrder('FILE_REFERENCE') - 50,
    text: () => store.recall(workspaceOf(agent)),
  })
})
```

- **必须按 agent 注册，不能全局注册。** `AssembleContext` 只带 `scope` 和 `signal`，
  拿不到 agent —— 全局段没办法知道当前是哪个工作区。
  按 agent 注册还有第二个好处：这个 fiber 随 agent 一起卸载，**不会漏到下一个会话**。
- 插入位置取 `FILE_REFERENCE`(900) − 50 = **850**：紧挨在环境类上下文那一带，
  在 persona 之后、工具说明之前。

### 蒸馏（`agent/turn-stopping`）

| 决策 | 原因 |
|---|---|
| 触发点选 **`agent/turn-stopping`** | 它是 **serial（会被 await）** 事件 —— 这个监听器的 promise 不 settle，turn 就不关闭。这是 `dsh --profile headless "…"` 这种**一次跑完就退出**的用法下唯一可靠的落盘时机 |
| **不用空闲防抖**（`agent/status → idle` 后起定时器） | 体验更好，但**对持久化是错的钩子**：turn 一关进程就走了，任何「turn 之后再跑」的活儿根本不会执行 |
| 开销用两道闸门压住 | 普通短轮次**零开销**（实测：默认参数下短任务不产生任何记忆文件） |

| 闸门 | 默认 | 环境变量 |
|---|---|---|
| 新一轮文本量的下限 | 600 字符 | `DSH_MEMORY_MIN_CHARS` |
| 同一会话两次蒸馏的最小间隔 | 60 秒 | `DSH_MEMORY_MIN_INTERVAL_MS` |

### 只喂人说的话

`session/event` 里只取 `user/message` 中 `source.kind === 'user'` 的，加上
`assistant/message`。**合成消息**（召回段自身、文件变更通知、skill 正文、goal 续跑）
**一律不要** —— 否则记忆会把自己的输出当成新事实再总结一遍，几轮之后就漂了。

### 存储布局

```none
$DSH_HOME/memory/
├─ MEMORY.md                          # 全局笔记（跨项目的事实）
├─ workspaces/
│  └─ <slug>-<hash8>/MEMORY.md        # 按工作区隔离的笔记
└─ journal/
   └─ YYYY-MM-DD.md                   # 每次蒸馏的段落，append-only
```

- `<slug>` 取自工作区目录名（给你翻目录时看的）；`<hash8>` 是路径 sha1 前 8 位，
  用来区分同名 checkout（`D:\a\web` 和 `D:\b\web` 不会撞）。
- 笔记行格式：`- YYYY-MM-DD HH:mm · <一句话>`，**纯文本，手改完全安全**。
- 追加时按归一化文本去重；超过 `DSH_MEMORY_FILE_BYTES` 时丢**最旧**的。
- 写入走**临时文件 + rename**，中途崩溃不会把已有记忆截断。

蒸馏产物是一段 JSON：`{"global":[…],"workspace":[…],"summary":"一段话"}`。
模型经常会裹一层代码块或加一句废话，所以解析时**取最外层花括号对**，不假设回复是干净的。

---

## 二、安装

| 项 | 值 |
|---|---|
| 版本 | **`0.1.0`**（当前最新，且是唯一版本） |
| dsh 基线 | `0.1.6-alpha.1` |
| tarball | `plugins/dsh-memory/0.1.6-alpha.1/dsh-memory-0.1.0.tgz` |
| URL | https://raw.githubusercontent.com/HaydenSmith1121/dsh-plugin-collection/main/plugins/dsh-memory/0.1.6-alpha.1/dsh-memory-0.1.0.tgz |
| sha256 | `e773678ab7b681390a6e7f643ab0c5cee87d996c9d662da6ca004b1c17e60a3e` |
| 字节数 | 17663 |

**Windows（PowerShell）**

```powershell
Invoke-WebRequest -Uri https://raw.githubusercontent.com/HaydenSmith1121/dsh-plugin-collection/main/plugins/dsh-memory/0.1.6-alpha.1/dsh-memory-0.1.0.tgz -OutFile $env:TEMP\dsh-memory-0.1.0.tgz
(Get-FileHash $env:TEMP\dsh-memory-0.1.0.tgz -Algorithm SHA256).Hash.ToLower()
# 期望：e773678ab7b681390a6e7f643ab0c5cee87d996c9d662da6ca004b1c17e60a3e
dsh plugin --profile web add $env:TEMP\dsh-memory-0.1.0.tgz
```

**macOS / Linux**

```bash
curl -fL -o /tmp/dsh-memory-0.1.0.tgz \
  https://raw.githubusercontent.com/HaydenSmith1121/dsh-plugin-collection/main/plugins/dsh-memory/0.1.6-alpha.1/dsh-memory-0.1.0.tgz
sha256sum /tmp/dsh-memory-0.1.0.tgz      # macOS 用 shasum -a 256
# 期望：e773678ab7b681390a6e7f643ab0c5cee87d996c9d662da6ca004b1c17e60a3e
dsh plugin --profile web add /tmp/dsh-memory-0.1.0.tgz
```

**装完必须重启 `dsh web`**：本插件在**进程启动时**挂载（要拿到 `agent/created`、
`session/event`、`agent/turn-stopping` 这些宿主事件），**不是热插拔的**。

> ⚠️ 那个 tarball 的路径不能删、不能挪（`dsh plugin add` 生成的是 `file:` 依赖）。
> ⚠️ 成功判据是 pnpm 退出码 0 —— 见[首页](../../README.md#pitfalls)。

---

## 三、配置

**不需要配置，也没有设置页。** 全部旋钮走环境变量 —— 这样宿主半**一个包都不导入**
（只有 `node:` 内置模块）。代价是没有 config schema 校验，收益是：harness 换版本时
改了任何插件 API，都不可能让本模块 import 失败把整棵插件树带崩
（就是 `plugin tree failed to load` 那个失败面）。只有 9 个旋钮、也没有 UI，
这个取舍是划算的。

| 变量 | 默认 | 作用 |
|---|---|---|
| `DSH_MEMORY_DISABLED` | — | 非空则**挂载但完全惰性**，排查插件树时用 |
| `DSH_MEMORY_ROOT` | `$DSH_HOME/memory` | 记忆根目录，测试指到临时目录 |
| `DSH_MEMORY_MIN_CHARS` | `600` | 新一轮文本量下限 |
| `DSH_MEMORY_MIN_INTERVAL_MS` | `60000` | 同会话两次蒸馏最小间隔 |
| `DSH_MEMORY_TRANSCRIPT_CHARS` | `16000` | 单次蒸馏喂进去的正文上限 |
| `DSH_MEMORY_RECALL_BYTES` | `6000` | 召回段字节上限（超了丢最旧的） |
| `DSH_MEMORY_FILE_BYTES` | `32000` | 单个记忆文件字节上限 |
| `DSH_MEMORY_MAX_TOKENS` | `1200` | 单次蒸馏输出预算 |
| `DSH_MEMORY_TIMEOUT_MS` | `45000` | 单次蒸馏超时（AbortController） |

> **蒸馏用默认模型路由**（`agentDefaultModel.currentSelection()`）。
> 想省钱就在**设置 → 模型**里把默认模型换成便宜的 —— 蒸馏是一次普通的
> `ctx.llm.stream()` 调用，**没有单独的模型配置**。

---

## 四、版本

| 版本 | 状态 | 变化 | sha256 | 字节数 | 实测 |
|---|---|---|---|---|---|
| **`0.1.0`** | **latest** | 首个版本：自动召回 + 自动蒸馏两条路 | `e773678ab7b681390a6e7f643ab0c5cee87d996c9d662da6ca004b1c17e60a3e` | 17663 | `2026-09-17` |

只有一个版本，没有 `supersedesNote` / `supersededBy`。0.1.0 的功能范围就是
「自动召回 + 自动蒸馏」—— 见下面「明确不做的事」。

---

## 五、已知问题 / 注意

| # | 事项 | 说明 |
|---|---|---|
| 1 | **peer 结论：`ok`** | 只约束 `@deepseek-ai/cordis ^4.0.2`，**不对 dsh 运行时版本通道设 pin**。宿主半 `lib/index.js` **不 import 任何包**（只有 `node:` 内置模块），连 `ctx.get('credentials')` 这类服务读取都用可选形式 —— 因此不存在 0.1.5 → 0.1.6 那类「缺具名导出 → 整棵树加载失败」的失败面 |
| 2 | 真正的版本敏感性 | 只在它用到的 ctx 服务与事件上：`systemPrompt.section` / `agent.ctx.inject` / `session/event` / `agent/turn-stopping` / `llm.stream` —— 这些都是 `0.1.6-alpha.1` 的实测面 |
| 3 | ⚠️ **Web 会话只验证到启动** | 端到端跑的是 **headless**；Web 剖面只验证到「真实启动 + `apply()` 激活」为止，**没有在浏览器里驱动多轮对话** |
| 4 | ⚠️ **冒烟测试不覆盖三件事** | `node test/smoke.mjs` 用手搭的 Cordis ctx 真正驱动 `apply()`，但**不覆盖**只有真实运行时能回答的部分：作用域提示段注册是否被接受、`agent/turn-stopping` 是否真的被 await、`llm.stream` 的 option 形状是否被接受。那些由隔离环境上的端到端实测覆盖（见包内 `docs/verification.md`） |
| 5 | 端到端实测含一条**反向验证** | 同一个 prompt 在工作区 A 答出种进去的独有暗号、在**全新目录**答 `UNKNOWN` —— 证明召回确实来自提示段，而不是模型顺着问句编 |
| 6 | **不做向量检索** | 召回是「全局 + 当前工作区」全量注入（有字节上限），不是语义检索。笔记量到几千条以后需要换策略，那是 0.2 的事 |
| 7 | **体积增长到上限后的裁剪未做量级实测** | 只在冒烟测试里以逻辑覆盖，没有做几千条量级的实测 |
| 8 | 一个与本插件**无关**的已知 bug | 往**全新** `--home` 跑 `scripts/dev-env.mjs init` 会在复制凭据那一步崩（`ENOENT … copyFileSync`）：`devProfile === templateName === 'web'` 时脚本跳过了 profile 初始化步骤，于是 `devHome` 目录自始至终没人创建。先 `mkdir` 那个 home 再 `init` 即可 |

### 明确不做的事

- **不读会话日志。** 正文来自 `session/event` 的实时通知，不解析 `$DSH_HOME/sessions`，
  也不依赖 `session-query-sqlite`（它默认是关的）。
- **不碰设置、凭据、会话。** 所有写入都限制在 `$DSH_HOME/memory/` 之内。
- **不提供工具和斜杠命令。** 0.1.0 只有「自动召回 + 自动蒸馏」两条路。
  `memory_write` / `memory_search` / `/remember` 是 0.1.x 的下一步 ——
  那需要 `tools.register` 的 `ToolDefinition` 契约，本版有意不引入这个面。
- **没有客户端半。** 无 UI、无 pill、无设置页。

---

## 六、卸载

```bash
dsh plugin --profile web remove dsh-memory
dsh web        # 重启
```

> ⚠️ **卸载不会删除已有记忆。** `$DSH_HOME/memory/` 下的 markdown 文件原样保留 ——
> 它们就是普通文本，你想清掉就自己删那个目录，想留着就留着。
> 顺便：这也意味着**记忆是纯本地文件**，不依赖任何云服务。

---

## 七、来源与许可

| 项 | 值 |
|---|---|
| 来源 | **本仓库自研**（`origin: self`） |
| 作者 | HaydenSmith1121 |
| 许可 | **MIT** |
| tarball 内是否附许可正文 | ❌ **未附**（tarball 内是 `package.json` / `cordis.patch.yml` / `lib/index.js` / `README.md` / `docs/verification.md`），`plugin.json` 声明 MIT |
| 源码 | ✅ **在本仓库内**：`src/dsh-memory/`（`lib/index.js`、`cordis.patch.yml`、`test/smoke.mjs`、`docs/verification.md`、`LICENSE`） |
| 第三方成分 | **无** —— 宿主半零包导入，只用 `node:` 内置模块 |
