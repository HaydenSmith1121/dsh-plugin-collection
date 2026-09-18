# `dsh-connect-trae`（加固分支）· Trae 模型接入

**作用**：把本机已登录的 Trae 账号（**国内版与国际版**）作为 DSH 的模型供应商接进来 ——
国内版注册为 `trae`，国际版注册为 `trae-global`，两个 provider 可以同时使用；
同时提供只读的用量/积分概览与模型管理界面。

> **这是 [`dingminhua/dsh-connect-trae`](https://github.com/dingminhua/dsh-connect-trae)
> `v2.0.4` 的加固分支（fork），不是本仓库自研。** Trae 协议、凭据处理、区域拆分、模型目录、
> 设置卡片全部是上游的实现，**一行未改**。本分支只改三个文件，解决一件事：
> **插件自身启动失败时，不再牵连整个 Harness。** 完整机制与证据见包内 `FORK.md`。

| 项 | 值 |
|---|---|
| 版本 | `2.0.4-dsh.1`（上游 `2.0.4` + 加固） |
| 上游基线 | `v2.0.4`，commit `9c7c1139b707e11933ae107a8e0213b4ab229614` |
| tarball | `plugins/dsh-connect-trae/0.1.6-alpha.1/dsh-connect-trae-2.0.4-dsh.1.tgz` |
| sha256 | `b1ea399aa94689b3ad3524c654b8e336f7e66f56da8bf2d7de1998536fcbbffa` |
| 字节数 | `518673` |
| 包内文件数 | `133` |
| dsh 基线 | `0.1.6-alpha.1` |
| peer 结论 | `ok` —— `@deepseek-ai/dsh-*` 为 `>=0.1.5-0 <0.2.0-0`（两端带 `-0`，纳入预发布版），cordis `^4.0.1-rc.1`，react `^18.2.0` |
| 需要配置 | ✅ **要**（登录 Trae 后在卡片里选账号；Token 不写入 DSH 设置） |
| 许可 | MIT（上游 dingminhua；本分支同许可） |

---

## 1. 为什么要这个加固分支

上游把「两个 provider 注册、模型目录发现、可配置 provider 目录、teardown 注册」全放在**同一条**
`Promise.all(...).then(...)` 链里，并且**该链中的失败没有被观察**。这带来两个各自成立的后果：

**（a）实测后果：整块 provider 静默消失。** 回环 shim 绑定失败时（Trae 未安装 / 未登录 /
端口不可用），`shim.ready` 拒绝 → `then` 体完全不执行 → **两个 provider 一起消失**。
Harness 仍然能启动，但里面**一个 Trae 模型都没有**，日志只有一句既不说区域、也不说原因的
`dsh-connect-trae: loopback shim failed; providers not registered`。
在用户视角这就是「装了 Trae 插件之后 Harness 不对劲了」，而旁边那句 shim 报错很容易被当成
Harness 自己的启动失败 —— 网络上流传的「插件要求 shim 已监听，否则中止整个 Harness 启动」
就是这么来的。

**（b）潜在后果（更硬的那种）：整进程退出。** 该链里任何**其它**抛出 —— 例如 HMR 重载后
`ctx.effect` 落在已消失的 fiber 上、或路由注册被拒 —— 会让 `then` 体半途而废并留下**未被观察的
拒绝**。DSH 装有进程级 fail-loud 处理器：`unhandledRejection` → `fatal load failure` → **exit 1**。
在这条路径上，一个第三方模型 provider 确实足以让整个 Harness 起不来。

**加固分支改的就是这两条**：把「就绪」变成可观察的普通值（不抛异常、不挂起），把每个失败
收敛到它自己的区域并报出**区域名与真实原因**，并保证启动链上任何路径都不再产生未捕获拒绝。

> 改动的文件只有 `src/shim.ts`、`src/adapter.ts`、`src/index.ts`；
> `tests/` 保留了上游全部 236 例，另加 7 例回归；`lib/` 是重新构建的产物。
> **tarball 里同时带 `src/` 与 `tests/`**，不需要第二个仓库就能审计这次改动 —— 这是它比上游包大
> 得多的原因（`518673` 字节 / 133 个文件，上游包只有 `lib/` 与文档）。

---

## 2. 安装

```powershell
Invoke-WebRequest -Uri https://raw.githubusercontent.com/HaydenSmith1121/dsh-plugin-collection/main/plugins/dsh-connect-trae/0.1.6-alpha.1/dsh-connect-trae-2.0.4-dsh.1.tgz -OutFile $env:TEMP\dsh-connect-trae-2.0.4-dsh.1.tgz
(Get-FileHash $env:TEMP\dsh-connect-trae-2.0.4-dsh.1.tgz -Algorithm SHA256).Hash.ToLower()   # 应为 b1ea399aa94689b3ad3524c654b8e336f7e66f56da8bf2d7de1998536fcbbffa
dsh plugin --profile web add $env:TEMP\dsh-connect-trae-2.0.4-dsh.1.tgz
```

```bash
curl -fL -o /tmp/dsh-connect-trae-2.0.4-dsh.1.tgz https://raw.githubusercontent.com/HaydenSmith1121/dsh-plugin-collection/main/plugins/dsh-connect-trae/0.1.6-alpha.1/dsh-connect-trae-2.0.4-dsh.1.tgz
sha256sum /tmp/dsh-connect-trae-2.0.4-dsh.1.tgz   # macOS: shasum -a 256
dsh plugin --profile web add /tmp/dsh-connect-trae-2.0.4-dsh.1.tgz
```

装完**必须重启 `dsh web`** —— 新增 bundle 是在进程启动时合成的。

> ⛔ **绝不可与上游 `dsh-connect-trae` 同时安装。** 两者是**同一个包名**、同一个 provider 路由
> （`trae` / `trae-global`）、同一个设置命名空间（`trae`）。从上游切换过来请**先卸后装**：
>
> ```bash
> dsh plugin --profile web remove dsh-connect-trae
> dsh plugin --profile web add /tmp/dsh-connect-trae-2.0.4-dsh.1.tgz
> ```

**卸载**

```bash
dsh plugin --profile web remove dsh-connect-trae
```

---

## 3. 配置

**装完不能直接用** —— 插件需要读到你本机的 Trae 登录态：

1. 确保本机装过 Trae（Trae CN / TRAE SOLO CN / Trae / TRAE SOLO 任一）并已登录；
2. 重启 `dsh web` 后打开 **设置 → 模型**，找到 **Trae** 与 **Trae Global** 两行；
3. 在插件卡片的「国内版 / 国际版」tab 里**选择账号**（区域由凭证自带的 `userRegion` 自动判定，
   不需要手动指定），然后刷新并保存模型目录。

**登录态不随包迁移** —— 换机器装完需要重新登录一次。Token 不写进 DSH 设置；
刷新副本落在 `$DSH_HOME/.trae-auth.cn.json` / `.trae-auth.ai.json`。

> ⚠️ **`needsConfig: true` 的含义是「必须选账号」**，不是「要填 API Key」。
> 没登录 Trae 时插件**照样正常挂载**，只是两个 provider 都不提供模型 ——
> 加固分支下这一点是**明确报出来的**：日志会分别指出是哪个区域、什么原因（例如
> `no signed-in account found`），而不是只给一句笼统的失败。

---

## 4. 怎么确认装对了

| 检查 | 期望 |
|---|---|
| **设置 → 模型** | 出现 `Trae` 与 `Trae Global` 两行 |
| 插件卡片 | 「国内版 / 国际版」两个 tab，各自显示登录状态 |
| 模型选择器 | 已选账号的区域能列出该区模型（国内版如 `DeepSeek-V4-Flash-Official`） |
| 没登录的区域 | 该区域报 `no signed-in account found`，**另一个区域不受影响** |

最后一行正是加固分支要保证的行为：一个区域起不来，不会带走另一个，也不会带走 Harness。

---

## 5. 模型覆盖范围（上游结论，未改动）

插件提供的是 Trae **SOLO 通道**的模型。TraeCode 通道的 4 个模型
（`deepseek-v4.1-flash`、`glm-5.3-flash`、`kimi-k2.8-preview`、`qwen3.8-flash`）
**尚未开放到 SOLO 通道，因此暂不支持**，需要等官方开放；现在要用这几个请直接走 Trae IDE 本体。
注意 `GLM-5.3`（**支持**）与 `glm-5.3-flash`（**不支持**）是两个模型。

> 上游 README（`README.md` / `README.en.md`，随包分发）有完整的功能说明、工作原理与协议取证。

---

## 6. 复现与审计

包内自带全部源码、测试与构建配置，装好后也可以直接跑：

```bash
cd <profile>/node_modules/dsh-connect-trae
pnpm install
pnpm run typecheck   # tsc，宿主与客户端两套配置
pnpm test            # 243 例
pnpm run build       # tsdown → lib/
```

上游包不带 `src/` 与 `tests/`，本包带 —— 就是为了让这次加固可被独立复核。

---

## 7. 与上游的关系

* 上游：<https://github.com/dingminhua/dsh-connect-trae>（MIT，作者 dingminhua）
* 上游 issue：<https://github.com/dingminhua/dsh-connect-trae/issues>
* 本分支只做启动链加固，**不打算长期分叉**。上游若采纳等效修复，本包应退役，
  届时直接装上游包即可。
