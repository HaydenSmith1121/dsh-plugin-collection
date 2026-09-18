# dsh-workbuddy-quota

> ## ⚠️ 已被 [`dsh-usage-stats`](../dsh-usage-stats/README.md) 取代
>
> **本包不再维护。** 0.2.0 有一个结构性缺陷：它每次都**现场折叠**会话日志来统计用量，
> 而会话日志是会被删掉的（`dsh-session-cleanup` 就是 `rm -rf` 会话目录）——
> 日志一没，那部分历史用量就从统计里凭空消失：**清理一次侧边栏，用量就下降一次**。
>
> `dsh-usage-stats@0.3.0` 在折叠之外加了一份**只增不减的每会话用量台账**，
> 从结构上修掉了它，并**只保留用量统计**这一半。本页保留的是**回滚用的原样字节**，
> 以及只有本包才有的 **WorkBuddy 额度 pill** 的说明。
>
> | 你想要 | 装哪个 |
> |---|---|
> | Token 用量统计（且删会话不丢账） | [`dsh-usage-stats`](../dsh-usage-stats/README.md) `0.3.0` |
> | WorkBuddy 剩余额度 pill | 本包 `0.2.0`（仍可用，不再维护） |
>
> **两个包不要同时装**：它们的 Token 用量是同一个设置分区里的两页。

在 DeepSeek Harness 界面上显示 **WorkBuddy 的剩余额度**，并统计**这台 harness 花了多少
token**。适配 dsh `0.1.6-alpha.1`，两个功能都是**只读**的：不持有凭据、不联系 provider、
不改变模型路由。

**[← 回仓库首页](../../README.md)** · [全部插件](../../README.md#plugins-install)

---

## 一、作用

| 功能 | 位置 | 内容 |
|---|---|---|
| **积分 pill** | composer 的模型选择器旁（`conversation.input.right` seat，order 20） | WorkBuddy 剩余积分 |
| **Token usage 页** | 设置侧边栏的 **Token usage** 分区（`settings.section`，order 40） | 选定时间范围内的 token 用量报告 |

两个功能彼此独立：**没装 `dsh-workbuddy-connect` 时只有积分 pill 受影响**
（见下面「已知问题」第 2 条），Token usage 页照常工作。

### Token usage 页显示什么

对选定的范围给出：

- **总 tokens**，以及构成它的四个 provider 上报桶：**未缓存输入 / 输出 / 缓存读 / 缓存写**；
- **缓存读占比** —— 在有缓存的 harness 上它经常远超其它桶，只给一个裸总数会显得吓人；
- 该范围内的**模型调用次数**。

**范围**：Today / Last 7 days / Last 30 days / All time。范围是**含端点的本地日历窗口**
且以今天结束，所以它们是嵌套的 —— 7 天的数字必然包含 1 天的数字。

### 数字从哪来

DSH 已经在 `$DSH_HOME/sessions/` 下的每个会话日志里**精确记录了 provider 上报的
token 用量**，但只暴露成一个**每会话累计值** —— 那个数字回答不了「我今天花了多少」。
本插件就是去折叠那些日志。

折叠**刻意复刻了 DSH 自己的 `tokenUsage` 投影算法**（`@deepseek-ai/dsh-token-meter`），
而不是自己发明一套看起来合理的规则 —— 一份和框架自己对不上的报告，比没有报告更糟。
三个 load-bearing 的细节：

| # | 细节 | 不这么做会怎样 |
|---|---|---|
| 1 | **同一步骤内最后一条样本胜出** | 一个流式步骤会为同一个 `(turn, step)` 记录多条 usage 样本，每条**替换**前一条。朴素求和会把一个流式步骤重复计很多遍 |
| 2 | **一次重试开一个新槽** | `llm/retry-started` 为它自己的 `(turn, step)` 关闭当前槽，所以被重试的那一次会**与它替换掉的那次并存相加** —— 它确实被计费了两次 |
| 3 | **`assistant/message` 与 `assistant/attempt` 都带 usage** | 后者是它内嵌流里最后一条 `usage` chunk |

`npm run verify:fold` 会重新推导每个会话的合计，并与 DSH 自己持久化的投影缓存比对
—— 当前 **12/12 字节级一致**。

### 已知统计边界（诚实登记）

| 边界 | 说明 |
|---|---|
| **标题生成不计入** | `session/title-llm-request` 会消耗 token 但不记录 usage 样本，任何折叠都看不见。**DSH 自己的投影有同样的盲点** —— 报告与框架一致，而不是悄悄和它不同 |
| **fork 的会话不向父会话重复计费** | fork 继承的前缀（`inheritedEventCount`）被跳过，因为那些事件保留父会话的时间戳、已经随父会话计过。DSH 的**每会话**投影会算它们，因为它回答的是另一个问题（「这一个会话的日志里有什么」） |
| **读失败会被报出来，不会被藏起来** | 页脚显示读了多少个会话日志，并点名哪些读不了。**不完整的数字永远不会被当成完整的呈现** |

---

## 二、安装

| 项 | 值 |
|---|---|
| 版本 | **`0.2.0`**（当前最新，且是本仓库里唯一的版本） |
| dsh 基线 | `0.1.6-alpha.1` |
| tarball | `plugins/dsh-workbuddy-quota/0.1.6-alpha.1/dsh-workbuddy-quota-0.2.0.tgz` |
| URL | https://raw.githubusercontent.com/HaydenSmith1121/dsh-plugin-collection/main/plugins/dsh-workbuddy-quota/0.1.6-alpha.1/dsh-workbuddy-quota-0.2.0.tgz |
| sha256 | `744a39879202782bdbca4d8235094949b73accf7c2f0153841872aed2d2388f8` |
| 字节数 | 14507 |

**Windows（PowerShell）**

```powershell
Invoke-WebRequest -Uri https://raw.githubusercontent.com/HaydenSmith1121/dsh-plugin-collection/main/plugins/dsh-workbuddy-quota/0.1.6-alpha.1/dsh-workbuddy-quota-0.2.0.tgz -OutFile $env:TEMP\dsh-workbuddy-quota-0.2.0.tgz
(Get-FileHash $env:TEMP\dsh-workbuddy-quota-0.2.0.tgz -Algorithm SHA256).Hash.ToLower()
# 期望：744a39879202782bdbca4d8235094949b73accf7c2f0153841872aed2d2388f8
dsh plugin --profile web add $env:TEMP\dsh-workbuddy-quota-0.2.0.tgz
```

**macOS / Linux**

```bash
curl -fL -o /tmp/dsh-workbuddy-quota-0.2.0.tgz \
  https://raw.githubusercontent.com/HaydenSmith1121/dsh-plugin-collection/main/plugins/dsh-workbuddy-quota/0.1.6-alpha.1/dsh-workbuddy-quota-0.2.0.tgz
sha256sum /tmp/dsh-workbuddy-quota-0.2.0.tgz      # macOS 用 shasum -a 256
# 期望：744a39879202782bdbca4d8235094949b73accf7c2f0153841872aed2d2388f8
dsh plugin --profile web add /tmp/dsh-workbuddy-quota-0.2.0.tgz
```

**装完直接重启 `dsh web`**：积分 pill 是客户端半，DSH 的 live reload（`patchReload: live`）
会就地改写客户端 bundle，所以设置页在重建后**立刻**出现；但**读会话日志的那条路由由宿主半
注册，只在启动时加载** —— 重启之前 Token usage 页会**明说这一点**，
而不是给一个没有信息的裸 404。

> ⚠️ 那个 tarball 的路径不能删、不能挪（`dsh plugin add` 生成的是 `file:` 依赖）。
> ⚠️ 成功判据是 pnpm 退出码 0 —— 见[首页](../../README.md#pitfalls)。

---

## 三、配置

**不需要填写任何东西**（`needsConfig: false` / `usageNeedsConfig: false`）：
没有 API Key、没有设置项、没有环境变量。

**但有一个前置条件要注意**（见下）：积分 pill 的数据来自**另一个插件**。

---

## 四、版本

| 版本 | 状态 | 变化 | sha256 | 字节数 | 实测 |
|---|---|---|---|---|---|
| **`0.2.0`** | **latest** | 当前版本：积分 pill（模型选择器旁）+ Token usage 设置页（Today / 7 days / 30 days / All time，四个 provider 桶 + 缓存读占比 + 调用次数） | `744a39879202782bdbca4d8235094949b73accf7c2f0153841872aed2d2388f8` | 14507 | `2026-09-17` |

只有一个版本，没有 `supersedesNote` / `supersededBy`。

> `plugin.json` 的 `notes` 字段为 `null`（本插件在集合仓库侧没有额外的长说明），
> 本页的细节来自 tarball 内的 `README.md` 与 `cordis.patch.yml`。

---

## 五、已知问题 / 注意

| # | 事项 | 说明 |
|---|---|---|
| 1 | **peer 结论：`ok`** | 只约束 `@deepseek-ai/cordis ^4.0.2` 与 `react ^18.2.0`，**不对 dsh 运行时版本通道设 pin** |
| 2 | ⚠️ **积分 pill 依赖 `dsh-workbuddy-connect`，而它不在本仓库** | pill 读的是**另一个插件**挂的状态路由：`/plugins/dsh-workbuddy-connect/status` 与 `/plugins/dsh-workbuddy-connect/ai/status`（`cordis.patch.yml` 原文：*reads (never reconfigures) the status route `dsh-workbuddy-connect` already mounts*）。**没装它时 pill 会如实显示「积分不可用 / Credits unavailable」**，不会报错、也不会影响模型路由；**Token usage 页不受影响**（那条路由由本插件自己的宿主半提供，路径 `/plugins/dsh-workbuddy-quota/usage`）。<br>`dsh-workbuddy-connect` 是市场侧的第三方插件（作者 corrinehu），见[插件市场仓库](https://github.com/HaydenSmith1121/dsh-plugins) |
| 3 | **宿主半需要进程重启** | 读会话日志的路由只在启动时注册。重启前页面**明确说明**，而不是裸 404 |
| 4 | **两个功能都不写任何东西** | 不持有凭据、不联系 provider、不改变模型路由 —— `cordis.patch.yml` 里写得很直白：*Neither replaces nor reconfigures the WorkBuddy provider itself, and no credential is held by this plugin.* |
| 5 | 报告与**框架自身**的数字对齐 | 折叠刻意复刻 `@deepseek-ai/dsh-token-meter` 的投影算法；`npm run verify:fold` 当前 **12/12 字节级一致** |
| 6 | 已知**不计入**的一项 | 标题生成（`session/title-llm-request`）花 token 但不记 usage 样本 —— DSH 自己的投影有同样盲点 |
| 7 | fork 的计费口径 | fork 继承的前缀不重复计（与 DSH 的**每会话**投影口径不同，因为它回答的是另一个问题） |
| 8 | 读不到就报出来 | 页脚给出读取的会话日志数量，并点名读不了的；不完整数字不会被当成完整的 |
| 9 | 注册面（供排查用） | 客户端半 inject `slots` / `locale` / `modelDirectories`；注册两个 seat：`conversation.input.right`（id `workbuddy-quota`，order **20** —— 排在 `dsh-workbuddy-connect` 的探测控件 order 10 之后，读起来是从左到右的顺序）与 `settings.section`（id `token-usage`，order 40）。整个 `apply()` 外面包了一层 try/catch，失败只打一行 `[dsh-workbuddy-quota] quota pill failed to load (model routing unaffected)` |
| 10 | 构建期的验证命令**在 tarball 里跑不通** | 包内 README 列出的 `npm run build` / `typecheck` / `test` / `verify:fold` / `verify:host` / `verify:install` 需要包内的 `scripts/` 与 `src/` —— 分发的是编译产物（tarball 内只有 `lib/`、`cordis.patch.yml`、`README.md`、`package.json`），这些脚本**不在包里** |

---

## 六、卸载

```bash
dsh plugin --profile web remove dsh-workbuddy-quota
dsh web        # 重启
```

卸载后积分 pill 与 Token usage 设置页一并消失。
**它不修改任何东西，所以卸载不会留下需要清理的状态** —— `$DSH_HOME/sessions/` 下的会话
日志本来就属于 DSH，不是本插件写的。

---

## 七、来源与许可

| 项 | 值 |
|---|---|
| 来源 | **本仓库自研**（`origin: self`） |
| 作者 | HaydenSmith1121 |
| 许可 | **MIT** |
| tarball 内是否附许可正文 | ❌ **未附** —— tarball 内只有 `package.json`（`"license": "MIT"`）/ `cordis.patch.yml` / `lib/index.js` / `lib/client.js` / `README.md`，**没有 LICENSE 正文**。`collectNote` 如实记录了这一点：「自研。包内未附 LICENSE 正文。」 |
| 源码 | ❌ **不在本仓库内** —— 只保留编译产物（tarball）。包内 README 的「Layout」一节列出的是源码仓库里的路径（`src/index.ts`、`src/usage-host.ts`、`src/usage-fold.ts`、`src/client/UsageSection.tsx` 等），**这些源码不在本仓库的 `src/` 下**（本仓库 `src/` 只有 `dsh-ark-plans` 与 `dsh-memory`） |
| 第三方成分 | **无** —— 只用 cordis 与 react |

> 包内 `package.json` 另标了 `"private": true`，且 `files` 只有 `lib` + `cordis.patch.yml`
> （`package.json` 与 `README.md` 由 npm 自动附带）。
