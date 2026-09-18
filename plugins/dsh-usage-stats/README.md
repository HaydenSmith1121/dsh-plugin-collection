# dsh-usage-stats

在 DeepSeek Harness 的**设置 → Token 用量**里看这台 harness 花了多少 token：按
Today / 近 7 天 / 近 30 天 / 全部统计，拆出服务方上报的四个桶（未缓存输入 / 输出 /
缓存读取 / 缓存写入），并给出缓存读占比与模型调用次数。

**它解决的核心问题是「删了也不丢」**：用量按会话逐个备份进一份**只增不减**的台账，
所以删除会话（`dsh-session-cleanup`、手删目录、归档清理）**不会**把它那部分用量从统计里抹掉。

适配 dsh `0.1.6-alpha.1`。只读会话日志、不持有凭据、不联系 provider、不改模型路由；
除了自己那份台账，不写任何东西。

**[← 回仓库首页](../../README.md)** · [全部插件](../../README.md#plugins-install)

> **本包是 `dsh-workbuddy-quota@0.2.0` 的继任者**（改名 + 只保留用量统计）。
> 0.2.0 每次都现场折叠会话日志，而日志会被删 —— 于是删一次会话，历史用量就下降一次。
> 0.3.0 把折叠结果备份下来，从结构上解决它。旧包的**积分 pill**（WorkBuddy 剩余额度）
> 没有迁进来：那读的是第三方插件 `dsh-workbuddy-connect` 的状态路由，与用量统计不是一回事。

---

## 一、作用

| 位置 | 内容 |
|---|---|
| 设置侧边栏 **Token 用量**（`settings.section`，order 40） | 选定范围内的 token 用量报告 |
| `$DSH_HOME/storages/dsh-usage-stats/usage-ledger.json` | 每会话用量台账（**只增不减、从不删除**） |

**范围**是含端点的本地日历窗口且以今天结束，所以它们嵌套：7 天的数字必然包含 1 天的。

### 数字从哪来

DSH 已经在每个会话日志里精确记录了服务方上报的 token 用量，但只暴露成一个**每会话累计值**
—— 它回答不了「我今天花了多少」。本插件折叠那些日志，并**刻意复刻 DSH 自己的
`tokenUsage` 投影**（`@deepseek-ai/dsh-token-meter`），而不是自己发明一套看起来合理的规则。
三个 load-bearing 的细节：

| # | 细节 | 不这么做会怎样 |
|---|---|---|
| 1 | **同一步骤内最后一条样本胜出** | 一个流式步骤会为同一个 `(turn, step)` 记录多条 usage 样本，每条**替换**前一条。朴素求和会把一个流式步骤重复计很多遍 |
| 2 | **一次重试开一个新槽** | `llm/retry-started` 为它自己的 `(turn, step)` 关闭当前槽，所以被重试的那一次会**与它替换掉的那次并存相加** —— 它确实被计费了两次 |
| 3 | **`assistant/message` 与 `assistant/attempt` 都带 usage** | 后者是它内嵌流里最后一条 `usage` chunk |

### 台账的两条规则

| 规则 | 含义 |
|---|---|
| **只增不减** | 同一个会话、同一个 (天, 供应商, 模型) 格子，取「台账里记的」与「日志现在说的」中较大的一份。日志被压缩、截断、改写，都**不能**把已经计过费的数字降下来 |
| **从不删除** | 记录写进去就只被向上更新。没有淘汰、没有 TTL、没有上限 |

后台每 30 秒巡检一次（只对 `mtime`/`size` 变过的日志重新折叠），所以**不需要有人打开设置页**，
用量也会被记下来。

### 已知统计边界（诚实登记）

| 边界 | 说明 |
|---|---|
| **删除前 ≤30 秒的用量** | 会话在被折叠之前就被删掉时，最后那点用量可能来不及入账。巡检间隔决定这个窗口 |
| **台账启用之前已删除的会话** | 日志已经没了，任何实现都救不回来；台账从第一次扫描开始积累 |
| **标题生成不计入** | `session/title-llm-request` 花 token 但不记 usage 样本。**DSH 自己的投影有同样的盲点** |
| **fork 的会话不向父会话重复计费** | fork 继承的前缀（`inheritedEventCount`）被跳过，因为那些事件保留父会话的时间戳、已随父会话计过 |
| **台账坏了 / 写不进去** | 页面会**明说**（重建 / 不可写 + 路径 + 原因），不会假装保留仍然生效 |

---

## 二、安装

| 项 | 值 |
|---|---|
| 版本 | **`0.3.0`**（当前最新，也是本仓库里唯一的版本） |
| dsh 基线 | `0.1.6-alpha.1` |
| tarball | `plugins/dsh-usage-stats/0.1.6-alpha.1/dsh-usage-stats-0.3.0.tgz` |
| URL | https://raw.githubusercontent.com/HaydenSmith1121/dsh-plugin-collection/main/plugins/dsh-usage-stats/0.1.6-alpha.1/dsh-usage-stats-0.3.0.tgz |
| sha256 | `dbe6b427e67ce70c069ff0adbc41bfe4a4c4558db712eb6bb47a8b0eeff34cae` |
| 字节数 | 26727 |
| 源码 | https://github.com/HaydenSmith1121/dsh-usage-stats |

**方式 A（推荐）**：装一次插件市场面板（`dsh-plugins-market`），在左侧「插件市场」里点安装。

**方式 B（手动）**

**Windows（PowerShell）**

```powershell
Invoke-WebRequest -Uri https://raw.githubusercontent.com/HaydenSmith1121/dsh-plugin-collection/main/plugins/dsh-usage-stats/0.1.6-alpha.1/dsh-usage-stats-0.3.0.tgz -OutFile $env:TEMP\dsh-usage-stats-0.3.0.tgz
(Get-FileHash $env:TEMP\dsh-usage-stats-0.3.0.tgz -Algorithm SHA256).Hash.ToLower()
# 期望：dbe6b427e67ce70c069ff0adbc41bfe4a4c4558db712eb6bb47a8b0eeff34cae
dsh plugin --profile web add $env:TEMP\dsh-usage-stats-0.3.0.tgz
```

**macOS / Linux**

```bash
curl -fL -o /tmp/dsh-usage-stats-0.3.0.tgz \
  https://raw.githubusercontent.com/HaydenSmith1121/dsh-plugin-collection/main/plugins/dsh-usage-stats/0.1.6-alpha.1/dsh-usage-stats-0.3.0.tgz
sha256sum /tmp/dsh-usage-stats-0.3.0.tgz      # macOS 用 shasum -a 256
# 期望：dbe6b427e67ce70c069ff0adbc41bfe4a4c4558db712eb6bb47a8b0eeff34cae
dsh plugin --profile web add /tmp/dsh-usage-stats-0.3.0.tgz
```

**装完重启 `dsh web`**：设置页是客户端半，重启后立刻出现；但**读会话日志并维护台账的路由
由宿主半注册，只在启动时加载** —— 重启之前页面会明说这一点，而不是给一个裸 404。

> ⚠️ 那个 tarball 的路径不能删、不能挪（`dsh plugin add` 生成的是 `file:` 依赖）。
> ⚠️ 成功判据是 pnpm 退出码 0 —— 见[首页](../../README.md#pitfalls)。

---

## 三、配置

**不需要填写任何东西**（`needsConfig: false` / `usageNeedsConfig: false`）：
没有 API Key、没有设置项、没有环境变量。

唯一的路径约定是台账的位置（由 DSH 主目录推导，`$DSH_HOME` 未设置时用 `~/.dsh`）：

| 文件 | 说明 |
|---|---|
| `$DSH_HOME/storages/dsh-usage-stats/usage-ledger.json` | 用量台账（只增不减） |
| `$DSH_HOME/storages/dsh-usage-stats/usage-ledger.json.corrupt.json` | 台账损坏时被挪到这里的原件 |

---

## 四、页面上的三种台账状态

| 状态 | 页面怎么写 |
|---|---|
| `ok` | 「删除会话不会丢用量：各会话的用量已逐个备份，只增不减。」 |
| `rebuilt` | 「用量台账曾不可用，已重建（原因）—— 重建之前保留的用量不再计入。」 |
| `unavailable` | 「用量台账 <路径> 写不进去（原因），删除会话会同时删掉它的用量。」 |

会话目录整体读不到时（临时故障），页面明说「本次读不到会话目录 —— 所有数字都来自备份」，
并且**不会**把在场会话谎报成「已删除」。

---

## 五、卸载 / 回滚

```bash
dsh plugin --profile web remove dsh-usage-stats
dsh web        # 重启
```

卸载**不会**删掉台账：那是你花掉的用量的记录，删不删由你决定。
想清空统计：删掉 `$DSH_HOME/storages/dsh-usage-stats/`，下次扫描会以当前在场的会话日志为基线重建
—— 报告会随之下降，这是预期行为。

回滚到旧的额度 pill 版本：按 [`dsh-workbuddy-quota`](../dsh-workbuddy-quota/README.md) 装回 `0.2.0`
（本仓库原样保留它的字节）。两个包**不要同时装**。

---

## 六、验证

源码仓库（`github.com/HaydenSmith1121/dsh-usage-stats`）里带 5 个可离线运行的校验套件：

```bash
npm test                                # 构建一致性 / 折叠一致 / 删除保留 / 宿主路由 / 客户端渲染
npm test -- --sessions <会话目录>        # 再加上真实会话日志的逐字节比对
```

收录这一版时的实测结论（完整输出见源码仓库 `docs/verification.md`）：

- 折叠与**真实发布的 0.2.0 产物**在 **35 个真实会话日志（24 MiB）** 上逐字节一致；
- 隔离环境（`DSH_HOME` 指向独立主目录、`dsh web --port 3090`）：删除一个会话后
  **总量不变**（14,069,358 tokens），而 0.2.0 的口径会掉到 3,007,671（−78%）；
- 设置页在真实浏览器里渲染正常，浏览器 console 没有来自本插件的错误；
- 生产环境（3080）只被**只读**扫描过会话日志，未安装、未重启、未改配置。

---

## 七、来源与许可

| 项 | 值 |
|---|---|
| 来源 | **本仓库自研**（`origin: self`） |
| 作者 | HaydenSmith1121 |
| 许可 | **MIT** —— tarball 内含 `LICENSE` 正文 |
| 源码 | https://github.com/HaydenSmith1121/dsh-usage-stats（含 `src/`、`scripts/`、`lib/`、`test/` 与验证记录） |
| 第三方成分 | **无** —— 宿主半只用 Node 内置模块，客户端半只用 cordis 与 react |
| 取代 | `dsh-workbuddy-quota@0.2.0`（`replaces`），后者不再维护、字节原样保留 |
