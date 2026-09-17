# dsh-ark-plans

把**火山方舟（Volcengine Ark）的 Agent Plan 与 Coding Plan** 两条套餐车道接进 DeepSeek Harness ——
模型选择器里多出两条 provider，会话标题栏右侧多一个额度 pill。适配 dsh `0.1.6-alpha.1`。

**[← 回仓库首页](../../README.md)** · [全部插件](../../README.md#plugins-install)

---

## 一、作用

| 能力 | 表现 |
|---|---|
| 两条套餐车道 | `ark-agent-plan`（`火山方舟 Agent Plan`）与 `ark-coding-plan`（`火山方舟 Coding Plan`）作为 provider 出现在模型选择器与「设置 → 模型」页 |
| 协议支持 | **不写协议转换** —— 两条车道都是 OpenAI 兼容协议，本包只给官方 `llm-pi-ai` 适配器补 provider profile，流式 / 工具调用 / 重试 / replay / 按请求解析凭据全部沿用官方实现 |
| 额度显示（0.2.0 新增） | 会话标题栏右侧一个 pill，每条车道一格：**进度条 + 已用百分比**（取当前最紧的窗口，通常是 5 小时） |
| 额度面板 | 点开 pill 是每个周期的明细：`5 小时 / 本周 / 本月` 的「已用 / 总额（百分比）」+「刷新：\<绝对时间\>」+ 相对时间提示；颜色按用量分级（正常品牌色 / **≥70% 警告** / **≥90% 错误**）；每 **5 分钟**自动取一次，点开面板或按「刷新」强制绕过缓存重取 |
| 凭据诊断 | 宿主半在启动时、以及每次凭据引用变化时各打一行状态（`Agent Plan ready — route "ark-agent-plan" resolves ARK_AGENT_PLAN_API_KEY` / `Coding Plan declared but keyless`） |

> **它为什么还需要一个宿主半**：组合配置无法报告自己最关键的失败模式 ——
> `apiKeyEnv` 解析不到时这条路由**依然合法**，照常挂载、照常出现在选择器里，
> 只有真正请求时才以 `MISSING_CREDENTIAL` 失败。
> 诊断只通过 `ctx.credentials.describe()` 读**引用是否存在**，**从不读密钥值本身**，
> 且所有分支都自行兜住异常 —— 诊断永远不会拖垮插件树。

### 额度数据从哪来（重要）

**额度不在数据面。** 本插件用的 `/api/plan/v3` 那条 OpenAI 兼容车道，
`/usage`、`/quota`、`/subscription` 等 20 条组合实测全部 **404**。
额度由**控制面（OpenTOP）**提供：

| 车道 | Action | 返回 |
|---|---|---|
| Agent Plan | `GetAFPUsage` | `Result.AFPFiveHour` / `AFPWeekly` / `AFPMonthly`，带 `Used` / `Total` / `Percent` / `ResetTime` |
| Coding Plan | `GetCodingPlanUsage` | `Result.QuotaUsage[]` —— **只给 `Percent`**，没有绝对值 |

这两个 Action 要**控制面 SSO/STS 或 AK-SK 签名**，**套餐 API Key 调不动它们**
（API Key 是数据面凭证）。所以宿主半自己签 V4，复用 `arkcli` 在这台机器上已经建立的
身份（`~/.arkcli` 的 profile + `identities/<key>/sts.json`），而不是去猜一个数据面路径。

### 拿不到额度时的四态

插件**从不编造数字**，而是把「为什么拿不到 + 怎么办」直接渲染在面板里：

| 状态 | 面板显示 | 处理 |
|---|---|---|
| `expired` | arkcli 的 SSO 凭证已过期… | 运行 `arkcli auth login volc-sso` 重新登录 |
| `no-identity` | 未找到 arkcli 身份… | 同上；额度接口需要控制面身份 |
| `not-subscribed` | 该账号下这条车道没有生效订阅 | 确认套餐是否已购买 / 到期 |
| `error` | 控制面拒绝签名时的原始原因 | 一般同 `expired` |

> **没登录 arkcli 时插件照常工作**，只是那条车道显示「不可用」，点开写明原因 ——
> **模型调用本身完全不受影响。**

---

## 二、安装

| 项 | 值 |
|---|---|
| 版本 | **`0.2.0`**（当前最新） |
| dsh 基线 | `0.1.6-alpha.1` |
| tarball | `plugins/dsh-ark-plans/0.1.6-alpha.1/dsh-ark-plans-0.2.0.tgz` |
| URL | https://raw.githubusercontent.com/HaydenSmith1121/dsh-plugin-collection/main/plugins/dsh-ark-plans/0.1.6-alpha.1/dsh-ark-plans-0.2.0.tgz |
| sha256 | `04df5a7fec08df8419b4c208c08f3d8cd6a264be87febef9bbcac0cc4806fd40` |
| 字节数 | 26247 |

**Windows（PowerShell）**

```powershell
Invoke-WebRequest -Uri https://raw.githubusercontent.com/HaydenSmith1121/dsh-plugin-collection/main/plugins/dsh-ark-plans/0.1.6-alpha.1/dsh-ark-plans-0.2.0.tgz -OutFile $env:TEMP\dsh-ark-plans-0.2.0.tgz
(Get-FileHash $env:TEMP\dsh-ark-plans-0.2.0.tgz -Algorithm SHA256).Hash.ToLower()
# 期望：04df5a7fec08df8419b4c208c08f3d8cd6a264be87febef9bbcac0cc4806fd40
dsh plugin --profile web add $env:TEMP\dsh-ark-plans-0.2.0.tgz
```

**macOS / Linux**

```bash
curl -fL -o /tmp/dsh-ark-plans-0.2.0.tgz \
  https://raw.githubusercontent.com/HaydenSmith1121/dsh-plugin-collection/main/plugins/dsh-ark-plans/0.1.6-alpha.1/dsh-ark-plans-0.2.0.tgz
sha256sum /tmp/dsh-ark-plans-0.2.0.tgz      # macOS 用 shasum -a 256
# 期望：04df5a7fec08df8419b4c208c08f3d8cd6a264be87febef9bbcac0cc4806fd40
dsh plugin --profile web add /tmp/dsh-ark-plans-0.2.0.tgz
```

**装完重启 `dsh web`**（新增 bundle 在进程启动时合成），然后打开
**设置 → 模型**，两行各填一次 API Key。

> ⚠️ **那个 tarball 的路径不能删、不能挪** —— `dsh plugin add` 生成的是 `file:` 依赖。
> 自检：`grep -o 'file:[^"]*' ~/.dsh/profiles/web/package.json`
>
> ⚠️ **成功判据是 pnpm 退出码 0**，不是 `node_modules` 里有没有文件
> （见[首页「装不上时先看这里」](../../README.md#pitfalls)）。

---

## 三、配置

| 项 | 位置 | 说明 |
|---|---|---|
| Agent Plan Key | **设置 → 模型 → 火山方舟 Agent Plan → API Key** | 落到 `$DSH_HOME/.credentials.yaml` 的 `refs.ARK_AGENT_PLAN_API_KEY` |
| Coding Plan Key | **设置 → 模型 → 火山方舟 Coding Plan → API Key** | 落到 `refs.ARK_CODING_PLAN_API_KEY` |

- **Key 不在包内、也不进 `settings.yaml`**，由 credentials 服务按请求解析 ——
  **填完不需要重启**，下一次请求就生效。
- 解析优先级是「启动时的环境变量 → 该文件 → 项目 `.env` → `$DSH_HOME/.env`」。
  所以**如果启动 harness 时环境里已有同名变量，它会压过你在页面上填的值**
  （页面此时显示只读）—— 这是 credentials 服务的分层规则，不是插件问题。
- 额度 pill **额外**需要 `arkcli` 的控制面身份（见第一节「额度数据从哪来」）。
  与模型调用互不影响。

### 自己加模型（不需要改插件）

`llm-pi-ai` 的用户层按 provider 合并覆盖组合层的 base，所以在 `settings.yaml` 里补一条
同名 provider 即可追加 / 整表替换该 provider 的模型清单（页面写的就是这个 section）：

```yaml
llm-pi-ai:
  providers:
    ark-coding-plan:
      models:
        - id: ark-code-latest
          name: Ark 智能路由 (ark-code-latest)
          contextWindow: 262144
        - id: kimi-k2.7-code
          name: Kimi-K2.7-Code
          contextWindow: 200000
```

> 模型 id 写错时，该 provider 行会显示红色诊断（`catalogError`），行本身不会消失，
> 可随时改回来。

---

## 四、版本

| 版本 | 状态 | 变化 | sha256 | 字节数 | 实测 |
|---|---|---|---|---|---|
| `0.1.0` | superseded | 首个版本：两条 provider profile + 凭据状态诊断 | `f02f8f4510b29c2def63a9078527800c57ed6a5f98c169eb71832f5a0163a363` | 11758 | 未记录 |
| **`0.2.0`** | **latest** | **新增额度显示**：会话标题栏 pill（各周期已用百分比 + 刷新时间），额度走控制面 OpenTOP 签名查询；同时源码首次入库 | `04df5a7fec08df8419b4c208c08f3d8cd6a264be87febef9bbcac0cc4806fd40` | 26247 | `2026-09-17` |

- **装最新版 `0.2.0` 即可。** `0.1.0` 的快照保留不动，但没有理由去装它 ——
  它没有额度显示，其余行为是 0.2.0 的子集。
- 两个版本的 `dshVersion` 都是 `0.1.6-alpha.1`。
- 0.2.0 的 `verifiedAt` 为 `2026-09-17`（0.1.0 为 `null`，即未记录实测日期）。

> 0.1.0 的分层目录与 0.2.0 相同（`plugins/dsh-ark-plans/0.1.6-alpha.1/`），
> 两者靠**文件名**区分：`dsh-ark-plans-0.1.0.tgz` 与 `dsh-ark-plans-0.2.0.tgz`。

---

## 五、已知问题 / 注意

| # | 事项 | 说明 |
|---|---|---|
| 1 | **peer 结论：`warn`** | peer 精确 pin 在 `0.1.6-alpha.1` 线上（`@deepseek-ai/cordis 4.0.2`、`dsh-client-ui-conversation` / `dsh-credentials` / `dsh-llm-pi-ai` 均 `0.1.6-alpha.1`、`react ^18.2.0`），**换 dsh 版本 pnpm 会打 peer 警告** |
| 2 | 为什么不是 `critical` | 宿主半 `lib/index.js` **不 import 任何 dsh 包**（只 import `node:` 内置模块，连 credentials 都只用 `ctx.get('credentials')` 取服务），客户端半是 factory-form CJS bundle、react 走平台 seed 表 —— 因此不存在 0.1.5 → 0.1.6 那类「缺具名导出 → 整棵树加载失败」的失败面 |
| 3 | 真正的版本敏感性 | ① 注入的 provider profile（`api` / `baseURL` / `apiKeyEnv` / `models`）只在 `0.1.6-alpha.1` 的 `dsh-llm-pi-ai` 上实测过；② 0.2.0 的客户端半依赖 conversation 插件的 `conversation.session.header.utilities` Slot，该 Slot 由 `@deepseek-ai/dsh-client-ui-conversation` 声明（本机 `0.1.6-alpha.1` 实测存在） |
| 4 | **不支持图片输入** | 所有模型条目都未声明 `input: [text, image]`，因为图片车道没有实测。pi-ai 的规则是「少声明会拒图并说明原因，多声明则会在请求发出后被 provider 拒掉」，宁可保守。要开：在 settings 里给自己的模型条目加 `input: [text, image]` |
| 5 | **不提供思考强度档位** | 方舟车道确实返回 `reasoning_content`（实测），harness 会显示出来，但本包未声明 `reasoningEfforts`，因此选择器里没有强度可调 —— 模型按其默认强度思考，harness 也**不发送**任何 `reasoning_effort` 参数。声明了却发错参数会导致请求 400，所以这是刻意的保守选择 |
| 6 | 组合层声明的 provider **用户删不掉** | 这是 pi-ai 的设计（用户层只能覆盖、不能删除 base 路由）。不想要就卸载本插件 |
| 7 | 与 `arkcli helper configure deepseek-harness` **会各写一份** | arkcli 写的是 `llm-pi-ai.providers.arkcli-<planType>`，本插件写的是 `ark-agent-plan` / `ark-coding-plan`，两者路由名不同、会同时出现在选择器里（各自独立凭据）。**二选一即可，别把同一个 Key 填两遍** |
| 8 | `apiKeyEnv` 引用了启动环境里的同名变量时**页面显示只读** | credentials 服务的分层规则（环境变量优先级最高），不是插件问题 |
| 9 | **patch 是整段替换 `config`** | 官方 `dsh-base` 挂 `llm-pi-ai` 时**不带 config**，本仓库其余插件的 patch 也都没打这一行，因此当前不冲突；但将来若有别的 bundle 也打 `- id: llm-pi-ai` + `config:`，**后加载者会覆盖本包声明的 providers** |
| 10 | ⚠️ **客户端半未在真浏览器里验证** | 自动化浏览器在本机不稳定，0.2.0 的 UI 验证改用「真实组件代码 + 脚本化 hooks」在 Node 里渲染并断言文本（12 项：车道名、窗口名、`已用 / 总额（百分比）`、`刷新：<绝对时间>`、相对时间提示、档位、失败原因、更新时间、刷新按钮），**没有截图证据** |
| 11 | ⚠️ **控制面真实额度数字未见过** | 受凭证失效阻塞，本包**没有**见过这个账号真实的 `used` / `total` 返回。字段名与结构取自 arkcli 二进制的 struct 标签，解析逻辑已按该契约用 stub 验证，但**未经真实响应确认**。Coding Plan 的真实额度同理（该账号无 Coding Plan 订阅，连降级路径也只测到 `no-identity`） |

---

## 六、卸载

```bash
dsh plugin --profile web remove dsh-ark-plans
dsh web        # 重启
```

卸载后两条 provider 行与额度 pill 一并消失。

> **Key 不会被自动删掉** —— `$DSH_HOME/.credentials.yaml` 里的
> `ARK_AGENT_PLAN_API_KEY` / `ARK_CODING_PLAN_API_KEY` 仍留着，下次重装可直接复用。
> 不打算再用了就手动清掉那两行。

---

## 七、来源与许可

| 项 | 值 |
|---|---|
| 来源 | **本仓库自研**（`origin: self`） |
| 作者 | HaydenSmith1121 |
| 许可 | **MIT** |
| tarball 内是否附许可正文 | ✅ 是（`package/LICENSE`） |
| 源码 | ✅ **在本仓库内**：`src/dsh-ark-plans/`（`lib/index.js`、`lib/client.js`、`cordis.patch.yml`、`docs/verification.md`）—— 0.2.0 首次入库，此前只有 tarball |
| 第三方成分 | 无协议转换代码；**适配器行为全部来自官方 `@deepseek-ai/dsh-llm-pi-ai`**，本包只提供配置 |

包内还有 `docs/verification.md`（本包的实测记录：端点 / 协议 / 模型 / 额度），
其中第 12 节「未验证的部分」正是上表第 10、11 条的出处。
