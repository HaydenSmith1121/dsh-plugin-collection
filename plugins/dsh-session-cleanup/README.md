# dsh-session-cleanup

给 DeepSeek Harness 的「已归档会话」补上**真正删除会话日志**的能力 ——
上游只有 `archive` / `unarchive`，磁盘上的会话记录从来没有清理手段。
适配 dsh `0.1.6-alpha.1`，**带宿主半，必须随进程启动挂载**。

**[← 回仓库首页](../../README.md)** · [全部插件](../../README.md#plugins-install)

---

## 一、作用

| 操作 | 位置 | 说明 |
|---|---|---|
| **取消归档** | 每行右侧 | 放回侧边栏，日志保留（与上游行为一致） |
| **删除** | 每行右侧 | 删掉**这一条**及其会话日志，有二次确认 |
| **全部删除** | 列表上方 | 删掉**所有**已归档会话，有二次确认 |

> ⚠️ **删除不可恢复。** 会话日志会被从磁盘上移除。

### 为什么这不是一个纯前端改动

DSH 本身**没有任何删除会话的能力**。这不是「没做 UI」，而是底层压根没有这个操作：

| 层 | 现状 |
|---|---|
| Workspace 控制器 | 只有 `archiveSession` / `unarchiveSession` |
| Session 控制器 | 没有 delete 命令 |
| `SessionPersistence` | 只有 `create` / `open` / `stat` / `list`，**没有 delete**（追加写、不可改） |
| 侧边栏的「删除」 | 删的是**工作区注册**，日志明确保留 |

所以删除必须**新增一个宿主侧能力** —— 这就是本插件有宿主半的原因。

它通过 `cordis.patch.yml` 把上游那个只读页面 `ui-settings-unarchive-sessions`
**关掉**，再注册自己的同名设置页（`settings.section` 的 id 同为 `archived-sessions`，
两个都挂会渲染出两个入口）。**不替换、不修改任何官方包。**

### 删除的三个步骤，以及为什么是这个顺序

1. 从磁盘删除会话日志目录；
2. 把该 id 从 Workspace 归档集合里移除；
3. 让客户端重新拉取会话列表。

**顺序本身就是安全属性。** 归档集合直到第 2 步才放手，所以两步之间崩掉，留下的是一条
「归档着、但日志已不在」的记录 —— 页面本来就会把它显示成「不可恢复」，取消归档也仍能
清掉它。反过来先移除归档 id，就会留下一个**侧边栏看得见、却打不开**的会话。

- **第 2 步必须经过 Cordis 服务**，而服务只能在声明了 `inject` 的上下文里访问：从一个
  没有注入 `workspaceRegistry` 的上下文里读 `ctx.workspaceRegistry`，抛的是
  `cannot get property "workspaceRegistry" without inject`。宿主半因此从**同时注入
  `webServer` + `workspaceRegistry` 的作用域**挂载路由 —— 第 2 步因此真的可达；而且
  「没有 Workspace 注册表」的 profile 干脆不会挂出这个路由，而不是挂出来删掉日志、
  却永远清不掉归档条目。
- **第 3 步的理由**：删除日志**不会**产生任何 Session 生命周期事件，而客户端手里的列表
  是快照。不重拉的话，被删掉的会话会「不再归档、却仍在列表里」。删除成功后客户端会主动
  重拉一次列表；**重拉失败只记一条警告**，不会把已经成功的删除报成失败。

### 「日志已经不在磁盘上」的行也会显示

归档集合比日志活得久 —— 一次中途失败的删除、或者手工删掉的目录，都会留下
「归档着、但日志已不在」的条目。这种条目**也会渲染成行**（标题写作
「会话记录已不在磁盘上」），只是没有「删除」按钮（它已经没东西可删），
点「取消归档」就把它从归档列表里移除。

**「全部删除」也会带上它们**（确认框里会说明有几条），这样一次批量删除真的能把归档
列表清空。上游的只读页面会把这些条目整个藏起来，而归档集合没有别的入口 ——
藏起来就等于永远清不掉。

### 搜索框与「全部删除」

**搜索只影响你看到什么。** 点「全部删除」删的是**全部**已归档会话，不是当前筛选结果 ——
把破坏性批量操作悄悄收窄到当前筛选，正是那种让人删错东西的设计。
如果删除时筛选条件仍生效，确认框会**明确提示**这一点。

删除部分失败时页面会报出成功 / 失败的条数，不会假装全部成功。**失败的那条会保持
归档状态**，这样它仍然可见、可以重试。

### 没有删的东西（刻意的）

`<DSH_HOME>/storages/session_projcache/sessions/<id>.json`（会话投影检查点）**会留下**。
它是**另一个存储域**的记录，上游明确写着「清理已存储检查点属于带外维护」，
而直接删一个活着的域的文件会让内存表与磁盘不一致。留一条死记录不会让会话复活
—— 列表行来自持久化层，缓存只提供列值 —— 所以这里选择不碰它。

---

## 二、安装

| 项 | 值 |
|---|---|
| 版本 | **`0.1.2`**（当前最新，且是本仓库里唯一的版本） |
| dsh 基线 | `0.1.6-alpha.1` |
| tarball | `plugins/dsh-session-cleanup/0.1.6-alpha.1/dsh-session-cleanup-0.1.2.tgz` |
| URL | https://raw.githubusercontent.com/HaydenSmith1121/dsh-plugin-collection/main/plugins/dsh-session-cleanup/0.1.6-alpha.1/dsh-session-cleanup-0.1.2.tgz |
| sha256 | `fec87c34041445c4edb5722ad0d70f9d834a1dc0dd94bbcc79e9370646dd1786` |
| 字节数 | 18328 |

**Windows（PowerShell）**

```powershell
Invoke-WebRequest -Uri https://raw.githubusercontent.com/HaydenSmith1121/dsh-plugin-collection/main/plugins/dsh-session-cleanup/0.1.6-alpha.1/dsh-session-cleanup-0.1.2.tgz -OutFile $env:TEMP\dsh-session-cleanup-0.1.2.tgz
(Get-FileHash $env:TEMP\dsh-session-cleanup-0.1.2.tgz -Algorithm SHA256).Hash.ToLower()
# 期望：fec87c34041445c4edb5722ad0d70f9d834a1dc0dd94bbcc79e9370646dd1786
dsh plugin --profile web add $env:TEMP\dsh-session-cleanup-0.1.2.tgz
```

**macOS / Linux**

```bash
curl -fL -o /tmp/dsh-session-cleanup-0.1.2.tgz \
  https://raw.githubusercontent.com/HaydenSmith1121/dsh-plugin-collection/main/plugins/dsh-session-cleanup/0.1.6-alpha.1/dsh-session-cleanup-0.1.2.tgz
sha256sum /tmp/dsh-session-cleanup-0.1.2.tgz      # macOS 用 shasum -a 256
# 期望：fec87c34041445c4edb5722ad0d70f9d834a1dc0dd94bbcc79e9370646dd1786
dsh plugin --profile web add /tmp/dsh-session-cleanup-0.1.2.tgz
```

**装完必须重启 `dsh web`**（插件的宿主半需要在进程启动时挂载路由），
然后打开 **设置 → 已归档会话**。

> ⚠️ 那个 tarball 的路径不能删、不能挪（`dsh plugin add` 生成的是 `file:` 依赖）。
> ⚠️ 成功判据是 pnpm 退出码 0 —— 见[首页](../../README.md#pitfalls)。

---

## 三、配置

**没有任何配置项** —— 装完即用（`needsConfig: false` / `usageNeedsConfig: false`）。
没有 API Key、没有设置项、没有环境变量。

---

## 四、版本

| 版本 | 状态 | 变化 | sha256 | 字节数 | 实测 |
|---|---|---|---|---|---|
| **`0.1.2`** | **latest** | 让归档集合里的**每个 id 都渲染成行**，日志已不在的行只提供「取消归档」，「全部删除」把它们一并带上 —— 批量删除因此真的能清空归档集合；新增 `client-verify.mjs` 覆盖该行为 | `fec87c34041445c4edb5722ad0d70f9d834a1dc0dd94bbcc79e9370646dd1786` | 18328 | `2026-09-17` |

> ✅ **装 `0.1.2` 即可，不必先装 `0.1.1`。** 本仓库只收录 `0.1.2` 这一个版本
> （`versions[]` 里只有它一条，没有 `supersededBy`）。
> `0.1.0` 与 `0.1.1` 的修复记录只在包内 README 里作为历史说明存在 —— 它们的 tarball
> **不在本仓库**。

### 两个修复的来龙去脉（判断你手上是哪一版）

| 版本 | 现象 | 根因 / 修复 |
|---|---|---|
| `0.1.0` → `0.1.1`（`2026-09-17`） | 点删除提示「已删除 N 个，M 个失败」：会话日志确实从磁盘消失，但那条记录一直留在归档集合里，`全部删除` 也清不掉 | 宿主半只注入了 `webServer`，却把**外层上下文**交给 handler。第 2 步读 `ctx.workspaceRegistry` 时 Cordis 抛 `without inject`，被逐 id 的 `catch` 记进 `failed`。修复：改为从 `ctx.inject(['webServer', 'workspaceRegistry'], …)` 的作用域挂载路由，并让客户端在删除成功后重拉会话列表 |
| `0.1.1` → `0.1.2`（`2026-09-17`） | 0.1.1 修好了删除，但那条 bug 历史上留下的残渣（日志已删、id 仍归档）在页面上**没有行** —— 页面只渲染「归档集合 ∩ 已加载的会话摘要」，于是既看不见也清不掉 | 归档集合里的每个 id 都渲染成行；日志已不在的行只提供「取消归档」；`全部删除` 把它们一并带上 |

> 「为什么测试没拦住」（0.1.0 → 0.1.1）：`host-verify` 当时给 handler 传的是一个
> **普通对象**（`{ workspaceRegistry: … }`），属性随便读；`e2e-auth` 只断言了
> `removed` / `missing`，**从不断言 `failed` 为空** —— 两个测试都绕开了出问题的那一层。
> 修复后补了两处断言，并用仿 Cordis 上下文覆盖 `apply()` 的接线本身；
> **反向验证过**：把接线改回旧写法，`host-verify` / `e2e-auth` / `e2e-delete`
> 三个测试会同时红，报的就是上面那条错误。

---

## 五、已知问题 / 注意

| # | 事项 | 说明 |
|---|---|---|
| 1 | **peer 结论：`ok`** | 只约束 `@deepseek-ai/cordis ^4.0.2` 与 `react ^18.2.0`，**不对 dsh 运行时版本通道设 pin** |
| 2 | **必须有宿主半，必须重启** | 删除是宿主侧新增能力，路由在进程启动时挂载。**热插拔不生效** —— 装完不重启就打开设置页会看不到删除能力 |
| 3 | ⚠️ **删除不可恢复** | 会话日志从磁盘移除，有二次确认。这是这个插件存在的意义，但也是它唯一不可逆的动作 |
| 4 | **投影检查点会留下** | `<DSH_HOME>/storages/session_projcache/sessions/<id>.json` 不被删除（另一个存储域；直接删活着的域会让内存表与磁盘不一致）。留一条死记录**不会让会话复活** |
| 5 | 删除的一层目录 | `<DSH_HOME>/sessions/<项目目录>/session-<id>/`（含 `session.v3.jsonl.zstd`）。项目目录名由会话 `cwd` 推导；归档集合里**不存 `cwd`**，所以宿主半在有限的几个项目目录里按会话 id 找那一个目录，`projectKey()` 与持久化后端逐字节对齐并有测试覆盖 |
| 6 | 安全边界（四道） | 删除接口只监听 **`POST /plugins/dsh-session-cleanup/delete`**；**仅限本机回环**（`127.0.0.1` / `::1` / `::ffff:127.0.0.1`，其他来源一律 **403**）；目标路径必须落在 `<DSH_HOME>/sessions` 之内，否则拒绝执行；会话 id 按后端同一套规则转义后作为**单个路径段**拼接，`..` 会被转义 |
| 7 | 测试是怎么造环境的 | `host-verify.mjs` **不碰任何真实主目录**：fixture 在系统临时目录里按真实布局造，并把 `DSH_HOME` 指到它；两个 e2e 都**强制要求 `DSH_E2E_HOME`**，没有就直接退出（否则子进程会继承调用者的主目录，测到的是那台上装着的另一个版本 —— 这个坑真踩过） |
| 8 | 本包此前**漏过四处入库登记** | 它曾已放进 `plugins/` 且已装进 web profile，却漏了登记，后来补齐 —— 所以如果你在别处看到过这个插件的早期记录，版本信息可能不一致 |

---

## 六、卸载

```bash
dsh plugin --profile web remove dsh-session-cleanup
dsh web        # 重启
```

卸载后设置页回到上游那个**只读**的「已归档会话」（只有取消归档，没有删除）。
**已经删掉的会话不会回来**，归档集合维持现状。

---

## 七、来源与许可

| 项 | 值 |
|---|---|
| 来源 | **本仓库自研**（`origin: self`） |
| 作者 | HaydenSmith1121 |
| 许可 | **MIT** |
| tarball 内是否附许可正文 | ✅ 是（`package/LICENSE`） |
| 源码 | ❌ **不在本仓库内** —— 只保留编译产物（tarball）。`sourceNote`：源码见 `plugin.json` 的 `originNote` 与包内 `docs/`，`src/` 是源码、`lib/` 是构建产物（**tarball 里只带 `lib/`**） |
| 第三方成分 | **无** —— 不替换、不修改任何官方包，只通过 `cordis.patch.yml` 关掉一个官方只读页 |

客户端那半被构建脚本包成 `window.__ModuleLoader__.load({ id, factory })` 的形式 ——
浏览器没有 import map，React 与平台包都由 factory 的 `require` 按名字提供。
