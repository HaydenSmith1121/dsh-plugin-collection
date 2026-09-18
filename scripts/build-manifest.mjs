/**
 * manifest.json 的生成器（可重复运行，确定性输出）。
 *
 *   node scripts/build-manifest.mjs            # 生成 / 刷新 manifest.json
 *   node scripts/build-manifest.mjs --check    # 只校验，不写盘（CI 用）
 *
 * ── 谁读它 ────────────────────────────────────────────────────
 *
 * 插件市场（HaydenSmith1121/dsh-plugins）的采集脚本会拉这一份，
 * 为**每个插件**生成一份市场侧的配置文件 catalog/plugins/<slug>.json。
 * 也就是说：本仓库说「这些插件长什么样、怎么装」，市场那边照抄。
 *
 * ── 单一事实来源是 plugins/<id>/plugin.json ────────────────────
 *
 * 「一个插件一个配置文件」这条规矩在本仓库同样成立：
 * 人工维护的只有 plugins/<id>/plugin.json（以及那一个插件的 README.md），
 * 本脚本把它们汇总成 manifest.json —— 汇总文件是**派生**的，禁止手写。
 *
 * sha256 是**算出来的**，不是记下来的：plugin.json 里写的那一份只是缓存，
 * 这里每次都重新对 tarball 取指纹；对不上就报错（那意味着有人在改已发布的字节）。
 */

import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..');
const CHECK_ONLY = process.argv.includes('--check');

const REPO_SLUG = process.env.DSH_PLUGIN_COLLECTION_SLUG ?? 'HaydenSmith1121/dsh-plugin-collection';
const BRANCH = process.env.DSH_PLUGIN_COLLECTION_BRANCH ?? 'main';
const RAW_BASE = `https://raw.githubusercontent.com/${REPO_SLUG}/${BRANCH}`;

const problems = [];
const fail = (m) => { problems.push(m); console.error(`  ✗ ${m}`); };
const ok = (m) => console.log(`  ✓ ${m}`);

const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const sha256 = (p) => createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const writeJsonAtomic = (target, value) => {
  const tmp = `${target}.tmp-${process.pid}`;
  fs.writeFileSync(tmp, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  fs.renameSync(tmp, target);
};

// ─────────────────────────────────────────────────────────────
// 读每个插件的 plugin.json
// ─────────────────────────────────────────────────────────────

const pluginsDir = path.join(REPO, 'plugins');
if (!fs.existsSync(pluginsDir)) {
  console.error('plugins/ 不存在 —— 请在仓库根目录下运行。');
  process.exit(3);
}

const dirs = fs.readdirSync(pluginsDir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort();

const plugins = [];

for (const dir of dirs) {
  const configFile = path.join(pluginsDir, dir, 'plugin.json');
  if (!fs.existsSync(configFile)) {
    fail(`plugins/${dir}/ 里没有 plugin.json —— 一个插件必须有一份配置文件`);
    continue;
  }
  const cfg = readJson(configFile);
  if (cfg.id !== dir) fail(`plugins/${dir}/plugin.json 的 id（${cfg.id}）与目录名不一致`);

  const versions = [];
  for (const v of cfg.versions ?? []) {
    if (!v.tarball) { fail(`${dir} 有一个版本没有 tarball 路径`); continue; }
    const file = path.join(REPO, v.tarball);
    if (!fs.existsSync(file)) { fail(`tarball 不存在：${v.tarball}`); continue; }

    const actual = sha256(file);
    const bytes = fs.statSync(file).size;

    // ★ 已发布版本的字节不可改写：plugin.json 里记了 sha256 就必须对得上。
    if (v.sha256 && v.sha256 !== actual) {
      fail(`${v.tarball} 的 sha256 与 plugin.json 不一致`
        + `（记录 ${String(v.sha256).slice(0, 12)}… / 实测 ${actual.slice(0, 12)}…）`
        + ' —— 已发布的字节不能被改写；新增版本请**新增文件**，不要覆盖旧的。');
      continue;
    }
    if (v.snapshot) {
      const snapFile = path.join(REPO, v.snapshot);
      if (!fs.existsSync(snapFile)) fail(`快照不存在：${v.snapshot}`);
      else if (sha256(snapFile) !== actual) fail(`快照与 tarball 字节不一致：${v.snapshot}`);
    }

    versions.push({
      version: v.version,
      dshVersion: v.dshVersion,
      status: v.status ?? 'superseded',
      tarball: v.tarball,
      url: `${RAW_BASE}/${v.tarball.split(path.sep).join('/')}`,
      snapshot: v.snapshot ?? null,
      sha256: actual,
      bytes,
      verifiedAt: v.verifiedAt ?? null,
      supersededBy: v.supersededBy ?? null,
      supersedesNote: v.supersedesNote ?? null,
    });
  }

  versions.sort((a, b) => String(a.version).localeCompare(String(b.version), undefined, { numeric: true }));
  const latest = versions.find((v) => v.status === 'latest') ?? versions[versions.length - 1] ?? null;
  if (!latest) { fail(`${dir} 一个可用版本都没有`); continue; }

  const readmeFile = path.join(pluginsDir, dir, 'README.md');
  plugins.push({
    id: cfg.id,
    package: cfg.package,
    version: latest.version,
    title: cfg.title ?? cfg.package,
    summary: cfg.summary ?? '',
    tags: cfg.tags ?? [],
    author: cfg.author ?? null,
    license: cfg.license ?? null,
    repo: cfg.repo ?? `https://github.com/${REPO_SLUG}`,
    // 源码仓。「repo」是用户在界面上点开的那个地址（可能是上游），
    // 市场侧要刷 star / pushedAt 时得知道去哪儿查 —— 两者不一定同一个仓库
    // （例：dsh-connect-trae 是上游第三方插件的加固分支，源码在自己的仓库里）。
    // 没写就退回 repo，保持既有行为。
    githubRepo: cfg.githubRepo ?? null,
    homepage: cfg.homepage ?? null,
    origin: cfg.origin ?? 'self',
    originNote: cfg.originNote ?? null,
    needsConfig: cfg.needsConfig === true,
    usageNeedsConfig: cfg.usageNeedsConfig === true,
    risky: cfg.risky === true,
    peerRuntimePin: cfg.peerRuntimePin ?? null,
    peerVerdict: cfg.peerVerdict ?? null,
    peerNote: cfg.peerNote ?? null,
    coexistenceWarning: cfg.coexistenceWarning ?? null,
    notes: cfg.notes ?? null,
    collectNote: cfg.collectNote ?? null,
    replaces: cfg.replaces ?? null,
    hasSource: Boolean(cfg.source),
    sourcePath: cfg.source ?? null,
    pluginConfig: `plugins/${dir}/plugin.json`,
    readme: fs.existsSync(readmeFile) ? `plugins/${dir}/README.md` : null,

    // 市场侧采集器直接读这几个字段
    dshVersion: latest.dshVersion,
    tarball: latest.tarball,
    sha256: latest.sha256,
    bytes: latest.bytes,

    install: {
      method: 'tarball',
      url: latest.url,
      sha256: latest.sha256,
      bytes: latest.bytes,
      tarball: latest.tarball,
      dshVersion: latest.dshVersion,
      // 展示用：真正的安装由市场的手动/自动安装面板按 url + sha256 展开
      commands: [
        `Invoke-WebRequest -Uri ${latest.url} -OutFile $env:TEMP\\${path.basename(latest.tarball)}`,
        `dsh plugin --profile web add $env:TEMP\\${path.basename(latest.tarball)}`,
      ],
    },

    versions,
  });
}

// ─────────────────────────────────────────────────────────────
// 组装
// ─────────────────────────────────────────────────────────────

const manifest = {
  _comment: [
    '插件集合仓库的机器可读清单 —— 由 scripts/build-manifest.mjs 从各插件的',
    'plugins/<id>/plugin.json 派生生成，**请勿手写**。',
    '',
    '人工维护的是「一个插件一个配置文件」：plugins/<id>/plugin.json。',
    '改完跑一次：node scripts/build-manifest.mjs',
    '',
    '插件市场（HaydenSmith1121/dsh-plugins）的采集脚本会拉取本文件，',
    '为每个插件生成市场侧的配置文件。所以这里的字段就是市场看到的全部事实。',
  ],
  schemaVersion: 1,
  generatedAt: null, // 下面按「内容变没变」决定，避免每次运行都产生 diff
  repo: {
    slug: REPO_SLUG,
    url: `https://github.com/${REPO_SLUG}`,
    branch: BRANCH,
    rawBase: RAW_BASE,
  },
  runtime: {
    dshVersion: plugins[0]?.dshVersion ?? null,
    profile: 'web',
  },
  counts: {
    total: plugins.length,
    withSource: plugins.filter((p) => p.hasSource).length,
    versions: plugins.reduce((n, p) => n + p.versions.length, 0),
  },
  plugins,
};

// ─────────────────────────────────────────────────────────────
// 写盘 / 校验
// ─────────────────────────────────────────────────────────────

const manifestFile = path.join(REPO, 'manifest.json');
const existing = fs.existsSync(manifestFile) ? readJson(manifestFile) : null;

const sameContent = existing
  ? JSON.stringify({ ...existing, generatedAt: null }) === JSON.stringify(manifest)
  : false;

if (CHECK_ONLY) {
  if (!existing) fail('manifest.json 不存在，请运行 node scripts/build-manifest.mjs');
  else if (!sameContent) fail('manifest.json 已过期，请运行 node scripts/build-manifest.mjs');
  else ok('manifest.json 与各插件配置一致');
  if (problems.length) { console.error(`\n校验失败：${problems.length} 项`); process.exit(1); }
  console.log(`\n校验通过：${plugins.length} 个插件，${manifest.counts.versions} 个版本。`);
  process.exit(0);
}

if (problems.length) {
  console.error(`\n生成失败：${problems.length} 项`);
  process.exit(1);
}

// generatedAt 只在内容真的变了的时候推进 —— 否则每次 CI 都会产生一次无意义提交
manifest.generatedAt = sameContent ? (existing.generatedAt ?? null) : new Date().toISOString();
writeJsonAtomic(manifestFile, manifest);

ok(`manifest.json 已写出：${plugins.length} 个插件，${manifest.counts.versions} 个版本`);
for (const p of plugins) {
  console.log(`  · ${p.package}@${p.version}  ${p.versions.length} 个版本  ${p.hasSource ? '[含源码]' : '[仅产物]'}  sha256=${p.sha256.slice(0, 12)}…`);
}
