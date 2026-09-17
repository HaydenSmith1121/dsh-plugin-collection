# dsh-excel-viewer

让 **Excel / CSV 表格在 DeepSeek Harness 里直接打开** —— 点 `.xlsx` / `.xlsm` / `.xls` /
`.csv` / `.tsv` 即在右侧预览面板渲染成只读表格，不用导出到别的软件。适配 dsh `0.1.6-alpha.1`。

**[← 回仓库首页](../../README.md)** · [全部插件](../../README.md#plugins-install)

---

## 一、作用

点开一个表格文件，不再看到「不支持预览」的空态，而是一张**只读表格**：

| 能力 | 表现 |
|---|---|
| 多工作表 | 顶部出现工作表标签，点击切换 |
| 行列号 | 渲染出行号 / 列标 |
| 数值与日期 | 按**工作簿自带格式**显示（`2,340.00`、`35.12%`、`2024-01-31`） |
| 合并单元格 | 按 `rowspan` / `colspan` 呈现 |
| 滚动 | 双向滚动；大表分块挂载 |
| 长文本 | 按列宽裁切并带省略号，鼠标悬停有完整 `title` |
| 查看器切换 | tab 头部的查看器下拉（**仅 `.csv` / `.tsv` 提供**，可切回纯文本看原始内容） |

### 它是怎么接进去的

Harness 的右侧文档预览本来就为「按后缀接管渲染」留了公开扩展点：
`@deepseek-ai/dsh-client-ui-sidebar-documentpreview` 提供一个注册表
（`ctx.documentPreviews`）和一个键控子 slot（`sidebar.right.tab.document`）。
本插件只回答那个包提出的两个问题：

```js
// 1) 认领哪些后缀 —— extension 档位，比兜底的纯文本类型优先
ctx.documentPreviews.register({
  id: 'dsh-excel-viewer/sheet',
  extensions: ['xlsx', 'xlsm', 'xls', 'csv', 'tsv'],
  binaryExtensions: ['xlsx', 'xlsm', 'xls'],   // 取消这些后缀的「纯文本」兜底
  priority: 'extension',
  title: () => t('title'),
  loading: 'bytes-complete',                   // 工作表必须先拿到完整字节才能排版
  wrap: false,
})

// 2) 画什么 —— 与元数据同 id 的 keyed body
ctx.slots.register({ name: 'sidebar.right.tab.document', key: 'dsh-excel-viewer/sheet', locale: NS, ... })
```

**其它一切都不归本插件管**：tab 怎么开、地址怎么解析、文件怎么读、失败行怎么画、
查看器下拉里有哪些候选，全部仍由上游那个包拥有。本插件既不碰 Sidebar 的 store，
也不新增读取路径 —— 字节是 owner 自己经 `workspaceFiles` Remote 读完递进来的，
所以「这个会话能不能读这个文件」**只有一个答案**（也就没有第二个权限判断）。

> 这也是**宿主半是空模块**的原因：没有第二个读路径，就没有宿主侧的事可做。
> 那个模块存在只为让 Loader 有一行可 import 的入口 —— 客户端的 bundle 是靠扫描
> 宿主 Loader 行里声明了 `dsh.client` 的包才被发现的。

### 支持的格式与各自的读法

| 后缀 | 容器 / 编码 | 读法 | 纯文本兜底 |
|---|---|---|---|
| `.xlsx` | OOXML（ZIP + XML） | SheetJS `read(type:'array')` | 关闭（二进制） |
| `.xlsm` | 同上 + VBA part | 同上 | 关闭（二进制） |
| `.xls` | OLE2 / BIFF8 | 同上（代码页表已随 bundle 内联） | 关闭（二进制） |
| `.csv` | 文本 | 严格 UTF-8 → 失败则 GB18030 → 再失败则代码页 936 | **保留**（可切回纯文本） |
| `.tsv` | 文本（制表符分隔） | 同上，`FS: '\t'` | **保留** |

两处**实测出来的关键取舍**，都直接关系到「看得见」：

| 取舍 | 原因 |
|---|---|
| **二进制后缀先验文件头** | SheetJS 对认不出的内容会退回文本解析 —— 一个改了后缀的 `.txt` 会被它当成单列 CSV，于是画出「一张看着像表格的错答案」。所以 `.xlsx/.xlsm/.xls` 先检查 ZIP / OLE2 / BIFF8 文件头，不匹配就直接给出「这不是一个有效的工作簿文件」 |
| **中文 CSV 走平台解码器** | Excel 在中文 Windows 上默认存 GBK：严格 UTF-8 解码失败后用平台的 `TextDecoder('gb18030')` 再解一次，因此不再是 `ÇøÓò` 这种乱码。`.xlsx/.xlsm/.xls` 声明为二进制，**不给**必然乱码的纯文本选项 |

### 两道渲染上限（都写在页脚，不静默截断）

| 上限 | 值 | 为什么 |
|---|---|---|
| 模型层：每张表解析的行 × 列 | **2000 × 200** | 表格不是文本：没有「下一页」可读，排一次版就要决定留下多少 |
| 视图层：首次挂载 / 每次追加 | **300 行 / +500 行** | 一个 `<td>` 就是一个 DOM 节点，2000 行的宽表是 20 万节点；预览面板不该冻住整个窗口 |

页脚始终显示 `共 N 行 × M 列`，被截断时追加 `仅渲染前 X 行、前 Y 列`，
行还没挂完时给一个「再显示 500 行」按钮。

---

## 二、安装

| 项 | 值 |
|---|---|
| 版本 | **`0.1.0`**（当前最新，且是唯一版本） |
| dsh 基线 | `0.1.6-alpha.1` |
| tarball | `plugins/dsh-excel-viewer/0.1.6-alpha.1/dsh-excel-viewer-0.1.0.tgz` |
| URL | https://raw.githubusercontent.com/HaydenSmith1121/dsh-plugin-collection/main/plugins/dsh-excel-viewer/0.1.6-alpha.1/dsh-excel-viewer-0.1.0.tgz |
| sha256 | `5f7a4236b6755254886da83b7e2d096d2124e309ea4287ff9fd8bc6b566db97b` |
| 字节数 | 384363 |

**Windows（PowerShell）**

```powershell
Invoke-WebRequest -Uri https://raw.githubusercontent.com/HaydenSmith1121/dsh-plugin-collection/main/plugins/dsh-excel-viewer/0.1.6-alpha.1/dsh-excel-viewer-0.1.0.tgz -OutFile $env:TEMP\dsh-excel-viewer-0.1.0.tgz
(Get-FileHash $env:TEMP\dsh-excel-viewer-0.1.0.tgz -Algorithm SHA256).Hash.ToLower()
# 期望：5f7a4236b6755254886da83b7e2d096d2124e309ea4287ff9fd8bc6b566db97b
dsh plugin --profile web add $env:TEMP\dsh-excel-viewer-0.1.0.tgz
```

**macOS / Linux**

```bash
curl -fL -o /tmp/dsh-excel-viewer-0.1.0.tgz \
  https://raw.githubusercontent.com/HaydenSmith1121/dsh-plugin-collection/main/plugins/dsh-excel-viewer/0.1.6-alpha.1/dsh-excel-viewer-0.1.0.tgz
sha256sum /tmp/dsh-excel-viewer-0.1.0.tgz      # macOS 用 shasum -a 256
# 期望：5f7a4236b6755254886da83b7e2d096d2124e309ea4287ff9fd8bc6b566db97b
dsh plugin --profile web add /tmp/dsh-excel-viewer-0.1.0.tgz
```

**装完重启 `dsh web`**，然后打开会话右侧 Sidebar 的**「文件」页**，展开目录，
点一个表格文件即可。

> ⚠️ **384363 字节是本仓库最大的 tarball** —— 因为 SheetJS 在构建期被内联进了
> `lib/client.js`。那是分发需要，不是运行时依赖：装它的用户**不需要联网取 `xlsx`**，
> 也不会有第二份副本进 `node_modules`。
>
> ⚠️ 那个 tarball 的路径不能删、不能挪（`dsh plugin add` 生成的是 `file:` 依赖）。
> ⚠️ 成功判据是 pnpm 退出码 0 —— 见[首页](../../README.md#pitfalls)。

---

## 三、配置

**没有任何配置项** —— 装完即用（`needsConfig: false` / `usageNeedsConfig: false`）。
没有 API Key、没有设置页、没有环境变量。

---

## 四、版本

| 版本 | 状态 | 变化 | sha256 | 字节数 | 实测 |
|---|---|---|---|---|---|
| **`0.1.0`** | **latest** | 首个版本：SheetJS 渲染器注册 + keyed body，`binaryExtensions` 先验文件头，GBK CSV 走 `gb18030` | `5f7a4236b6755254886da83b7e2d096d2124e309ea4287ff9fd8bc6b566db97b` | 384363 | `2026-09-17` |

只有一个版本，没有 `supersedesNote` / `supersededBy`。

---

## 五、已知问题 / 注意

| # | 事项 | 说明 |
|---|---|---|
| 1 | **peer 结论：`ok`** | 只约束 `@deepseek-ai/cordis ^4.0.2` 与 `react ^18.2.0`，**不对 dsh 运行时版本通道设 pin** |
| 2 | 为什么不设 pin 也没事 | SheetJS 是被内联进 `lib/client.js` 的（`devDependency`，不是运行时依赖），浏览器侧不存在「缺具名导出 → 整棵树加载失败」的失败面；真正的版本敏感性只在它用到的三个客户端服务上（`slots` / `locale` / `documentPreviews`），这些是 `0.1.6-alpha.1` 的实测面 |
| 3 | **宿主半是空的，这是设计** | 空模块存在的唯一目的是让 Loader 有一行可 import 的入口（客户端 bundle 靠扫描声明了 `dsh.client` 的宿主行被发现）。它不读文件、不注册工具，因此本插件**不存在第二条权限判断路径** |
| 4 | 认不出的内容**直接报错，不退化成假表格** | `.xlsx/.xlsm/.xls` 先验文件头，不匹配就报「这不是一个有效的工作簿文件」；`.csv/.tsv` 保留纯文本兜底 |
| 5 | **两道截断上限写在页脚** | 模型层 2000 × 200，视图层首屏 300 行 / 每次 +500 行 —— 不静默截断 |
| 6 | 真浏览器验证的范围 | 31 条真浏览器断言（隔离 3092 harness 里点文件），含**对照基线**：同目录未被认领的 `.docx` 显示的正是被本插件替换掉的上游空态 |
| 7 | 其它两层的验证 | 解析层 **84** 条断言；客户端 bundle **57** 条（按浏览器方式加载 + 桩 ctx + `react-dom/server` 实渲染 9 个样本） |

---

## 六、卸载

```bash
dsh plugin --profile web remove dsh-excel-viewer
dsh web        # 重启
```

卸载后点表格文件会回到上游的空态（`.docx` 那种状态）—— 表格不再被认领，
但文件本身与 Sidebar 都不受影响。

---

## 七、来源与许可

| 项 | 值 |
|---|---|
| 来源 | **本仓库自研**（`origin: self`） |
| 作者 | HaydenSmith1121 |
| 许可 | **MIT**（本插件自身代码） |
| tarball 内是否附许可正文 | ✅ 是（`package/LICENSE`，另附 `THIRD_PARTY_NOTICES.md`） |
| 源码 | ❌ **不在本仓库内** —— 只保留编译产物（tarball）。`sourceNote` 写着：「本仓库只保留了编译产物（tarball）。源码不在本仓库内，见 `plugin.json` 的 `originNote` 与包内 `docs/`」 |
| 第三方成分 | ✅ **内联分发** SheetJS Community Edition（npm 包名 `xlsx`）`0.20.3`，版权 © 2012-present SheetJS LLC，**Apache-2.0** |

### 关于第三方成分（务必读）

这是本仓库唯一一个**不是纯 MIT 产物**的 tarball —— 不是因为它改了许可，
而是因为它在构建期把 Apache-2.0 的 SheetJS 内联进去了：

| 项 | 值 |
|---|---|
| 组件 | SheetJS Community Edition（`xlsx`）**0.20.3** |
| 许可 | **Apache-2.0**（全文 <https://www.apache.org/licenses/LICENSE-2.0>） |
| 上游 | <https://git.sheetjs.com/SheetJS/sheetjs> · <https://sheetjs.com/> |
| 获取方式 | `https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz`（官方 CDN） |
| 是否修改 | **没有**修改 SheetJS 源码，只做整体内联打包 |
| 版权头 | 以 `legalComments: 'inline'` 保留在 `lib/client.js` 中（`/*! xlsx.js (C) 2013-present SheetJS */`），未被剥离 |

- **为什么内联而不是依赖**：本仓库的 dsh 浏览器模块表**只**提供 `react` 与
  `@deepseek-ai/*`；插件 bundle 里出现任何别的 `require(...)`，用户打开文件的那一刻
  就会在浏览器里抛错。构建脚本在打包后会扫描 `require(...)`，发现平台提供不了的
  specifier 就**直接失败**，所以「内联漏了」不可能悄悄发出去。
- **为什么是 `0.20.3` 而不是 npm 上的 `0.18.5`**：`registry.npmjs.org` 上的 `xlsx`
  停在 **0.18.5（2022 年）**，作者已把发布迁到自己的 CDN。0.18.5 带有已在后续版本
  修复的问题（原型污染 CVE-2023-30533、ReDoS CVE-2024-22363），
  而本插件解析的是**用户文件**，正处在这些问题的触发面上。
- **不声称背书**：本插件是第三方作品，与 SheetJS LLC 无隶属关系，也未获得其背书。

完整归属与合规动作见包内 `THIRD_PARTY_NOTICES.md`。
