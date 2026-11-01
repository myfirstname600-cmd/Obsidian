# 知识星图 · 使用说明

一个 Obsidian Light 风格的本地优先知识库 Web App。  
本地可编辑；发布到 GitHub Pages 后默认只读，供访客浏览。

- 线上地址：<https://myfirstname600-cmd.github.io/Obsidian/>
- 本地编辑：双击 `prototype/index.html`，或在 `prototype/` 下运行 `python -m http.server 8765`
- 源码仓库：<https://github.com/myfirstname600-cmd/Obsidian>

---

## 一、两种运行模式

### 1. 本地编辑模式

打开方式：

- 直接双击 `prototype/index.html`（`file://`）
- 或在本机启动静态服务后访问 `http://127.0.0.1:8765/`

特征：

- 可以新建、编辑、删除笔记和分类；
- 数据保存在当前浏览器 `localStorage`；
- 有自动保存、版本历史、Markdown 导入导出；
- 可以把内容导出为 JSON 备份或 Obsidian Vault。

### 2. 线上只读模式

打开 `https://myfirstname600-cmd.github.io/Obsidian/` 或其他非 `localhost` 域名时：

- 自动只读；
- 隐藏新建、删除、导入、源码编辑等入口；
- 标题、分类、标签、正文不可修改；
- 不写 `localStorage`；
- 侧栏和状态栏显示「只读 / 已发布」；
- 图谱、搜索、标签页、阅读视图、反向链接和 PWA 安装仍可用。

线上内容来自 `prototype/published-vault.js` 发布快照。

### 3. 手机/远程所有者编辑

在线上只读页登录 GitHub Token 后，可在手机或任意设备进入编辑模式：

1. 点空工作区底部「所有者登录 · 开启手机编辑」，或左侧栏锁图标 `⚿`；
2. 粘贴一个有 **Contents: Read and write** 权限的细粒度 Token；
3. 验证成功后页面切换为可编辑；
4. 编辑后左下 `⋯` →「发布到 GitHub Pages」；
5. GitHub Actions 自动更新线上快照，约 1 分钟后刷新可见。

Token 只保存在当前设备 localStorage，不会写入仓库；游客没有 Token 时仍是只读。

---

## 二、初始状态

当前仓库的发布快照是**初始示例数据**：

- 4 个一级分类；
- 24 篇示例笔记；
- 19 条手动关系；
- 打开网站默认显示**无标签空工作区**；
- 左侧文件树、顶部标签栏、底部状态栏可用。

本地编辑器如果已被修改，恢复到示例数据：

1. 打开本地应用；
2. 左下 `⋯` →「恢复示例数据」；
3. 确认后会清除当前本地修改和版本历史。

> 线上只读站不会因为访客操作改变；要更新线上内容，需要重新导出发布快照并推送。

---

## 三、界面结构

```
┌────┬──────────────┬────────────────────────────────────┬──────────────┐
│    │ 文件树        │ 标签页                               │ 大纲/反链     │
│ 功 │ 知识网络      │ 笔记编辑器 / 3D/2D 知识网络            │ 出链          │
│ 能 │ 全部知识点    │                                      │              │
│ 条 │ 分类 / 文件   │                                      │              │
├────┴──────────────┴────────────────────────────────────┴──────────────┤
│ 状态栏：当前文件 / 反向链接 / 字数 / 在线 / 只读 / 已发布              │
└───────────────────────────────────────────────────────────────────────┘
```

- **左侧功能条（Ribbon）**：新建、搜索、知识网络、命令面板、安装、收起侧栏等。
- **文件树**：分类和笔记；顶部「知识网络」是图谱入口。
- **标签页**：打开的笔记和图谱；可关闭、切换。
- **右侧检查器**：大纲、反向链接、出链。
- **底部状态栏**：保存状态、字数、在线/离线、只读状态。

---

## 四、日常使用

### 1. 新建笔记

- 先选左侧一个分类，再点左下「新建」：在该分类下新建笔记；
- 没有选中分类时点「新建」：自动新建一个分类，并在其中创建笔记；
- 标题自动聚焦，输入即改名；
- 也可以点 Ribbon 的 `+` 或标签栏 `+`。

### 2. 打开和切换

- 点左侧文件打开笔记；
- 点左侧「知识网络」打开 3D/2D 图谱；
- 顶部标签可切换；`×` 或 `Ctrl/Cmd+W` 关闭；
- 全部标签关闭后回到空工作区。

### 3. 编辑与保存

- 正文是 Live Preview 风格的富文本；
- 工具栏支持加粗、斜体、删除线、H2/H3、列表、引用、代码块、链接、图片、表格；
- 停止输入约 0.7 秒自动保存；
- 底部「历史」可查看版本并恢复；
- 页面底部「删除」删除当前笔记。

### 4. 分类

- 点一级分类展开/收起并选中；
- 双击分类名内联重命名；
- 分类右侧 `×` 删除分类（连同其中笔记和版本历史，需确认）。

### 5. 双向链接

- 正文写 `[[HTTP 与 HTTPS]]`；
- 支持别名：`[[HTTP 与 HTTPS|HTTP 笔记]]`；
- 工具栏 `[[ ]]` 可插入；
- 点击双链打开目标；
- 目标不存在时，本地模式自动创建；只读模式提示目标不存在。

### 6. 反向链接 / 出链 / 大纲

- 右侧检查器自动解析；
- 反向链接 = 哪些笔记链接到当前笔记；
- 出链 = 当前笔记链接到哪些笔记；
- 大纲列出正文 H1/H2/H3，可点击跳转。

### 7. 知识网络

- 左侧「知识网络」入口；
- 3D 图谱支持拖拽旋转、滚轮缩放、点击节点打开笔记/分类；
- 右侧数据卡：最近更新、数据概览；
- 图谱标签可关闭；从 Ribbon 或空工作区重新打开；
- WebGL 不可用时自动切换 Canvas 2D 图谱；
- 手机/窄屏自动改为全宽，数据卡单列。

### 8. 搜索

- 搜索框或按 `K`；
- 显示匹配笔记，点击打开；
- 搜索会高亮图谱节点，不隐藏节点。

### 9. 命令面板 / 快速切换

- `Ctrl/Cmd+P`：命令面板；
- `Ctrl/Cmd+O`：按标题快速切换笔记；
- 命令面板包含新建、搜索、收起侧栏、切换图谱、阅读、Markdown 源码、导出、安装等。

### 10. 阅读视图

- `Ctrl/Cmd+E` 切换阅读/编辑；
- 阅读视图隐藏工具栏，锁定标题和属性；
- 右上角 `▤` 按钮同效。

### 11. Markdown 源码 + 实时预览

- 笔记页右上 `M↓`，或 `Ctrl/Cmd+Shift+M`；
- 左侧编辑 Markdown，右侧实时预览；
- 支持标题、加粗/斜体/删除线、列表、引用、代码块、表格、链接、图片、`[[双链]]`；
- 退出源码模式后同步回富文本并保存；
- 切换标签、进入阅读、关闭标签时会先处理源码。

### 12. Markdown / Obsidian 互通

左下 `⋯` 菜单或命令面板：

- **导出 Obsidian Vault（.zip）**
  - 按分类生成文件夹；
  - 每篇 `.md` 带 `title/category/tags/updated` frontmatter；
  - 双链保持 `[[标题]]`；
- **导入 Markdown 笔记**
  - 多选 `.md`；
  - 读取 frontmatter 的标题/分类/标签；
  - 支持标题、列表、引用、代码块、表格、双链；
- **导出当前笔记 Markdown**
  - 单篇 `.md` 下载。

### 13. 手机所有者编辑 / 发布

- 线上空工作区「所有者登录 · 开启手机编辑」或侧栏 `⚿`；
- 需要细粒度 GitHub Token：
  1. GitHub → Settings → Developer settings → Personal access tokens → **Fine-grained tokens**；
  2. Resource owner 选 `myfirstname600-cmd`；
  3. Repository access → Only select repositories → 选 `Obsidian`；
  4. Repository permissions → **Contents: Read and write**；Metadata 会自动只读；
  5. 设置过期时间并生成，复制 `github_pat_...`；
  6. 粘贴到应用「所有者编辑」弹窗，验证并启用。
- 验证后直接编辑；点笔记页底部「发布」，或 `⋯` →「发布到 GitHub Pages」，提交 `prototype/published-vault.js`；
- 约 1 分钟 Pages 更新，刷新/重开 PWA 可见；
- 同一时间建议只在一台设备编辑并发布，避免覆盖。

### 14. 备份

- `⋯` →「导出备份 JSON / 导入备份 JSON」；
- JSON 包含笔记、分类、关系和版本历史；
- 导入会覆盖当前数据，先导出再导入。

### 15. PWA 安装 / 离线

线上 HTTPS 或本地 `localhost` 下：

- Windows Edge/Chrome：地址栏安装图标，或「安装应用」；
- Android Chrome：菜单「添加到主屏幕」；
- 安装后独立窗口运行；
- Service Worker 缓存应用壳和发布快照，断网可打开；
- 本地编辑模式的离线数据仍在 `localStorage`。

---

## 五、所有者发布流程

> 线上是纯静态只读站；内容更新通过发布快照完成。

1. 本地打开应用并编辑；
2. `⋯` →「导出发布快照」；
3. 下载 `published-vault.js`；
4. 替换 `prototype/published-vault.js`；
5. 命令面板执行「预览访客只读页」；
6. 提交并推送：

```bash
git add prototype/published-vault.js
git commit -m "publish notes"
git push
```

7. GitHub Actions 自动部署，访客刷新后看到新内容。

当前发布快照已经重置为初始示例数据，所以线上显示 4 个分类、24 篇示例笔记。

---

## 六、快捷键

| 快捷键 | 功能 |
|---|---|
| `Ctrl/Cmd+P` | 命令面板 |
| `Ctrl/Cmd+O` | 快速切换笔记 |
| `Ctrl/Cmd+W` | 关闭当前标签 |
| `Ctrl/Cmd+E` | 阅读视图 |
| `Ctrl/Cmd+Shift+M` | Markdown 源码/实时预览 |
| `Ctrl/Cmd+S` | 立即保存（本地模式） |
| `N` | 新建笔记（本地模式） |
| `K` | 聚焦搜索 |
| `Esc` | 关闭面板/返回图谱 |

---

## 七、已实现功能清单

### 工作区 / 主题
- Obsidian Light 白底紫调主题
- Ribbon + 文件树 + 标签页 + 编辑器/图谱 + 右侧检查器 + 状态栏
- 默认无标签空工作区
- 图谱标签可关闭/重开
- 桌面/Android 响应式布局
- `100dvh` 移动端适配
- WebGL 不可用自动 2D 图谱兜底

### 笔记 / 分类
- 一级分类 + 笔记文件
- 分类展开/收起、重命名、删除
- 笔记新建、改名、改分类、标签、删除
- 自动保存
- 版本历史与恢复
- JSON 备份导入/导出
- 恢复示例数据

### 编辑 / 链接
- 富文本编辑工具栏
- 双向链接及别名
- 缺失目标自动创建（本地）
- 反向链接、出链、大纲
- 阅读视图
- Markdown 源码 + 实时预览

### 图谱
- 3D 力导向知识网络
- 分类节点、文件节点、分类主干、手动关系、Wiki 连线
- 节点点击打开
- 相机自动旋转、拖拽、缩放、适配
- 2D Canvas 兼容图谱
- 图谱数据卡（最近更新、数据概览）

### 命令 / 搜索
- 命令面板
- 快速切换
- 全文搜索（标题、摘要、标签、分类）
- 图谱搜索高亮

### Markdown / Obsidian
- 导出 Obsidian Vault `.zip`
- 导入 Markdown 笔记
- 导出当前笔记 `.md`
- frontmatter 分类/标签
- 双向链接保留

### PWA / 发布
- Web App Manifest
- Service Worker 缓存与离线
- Windows/Android 安装
- 在线/离线状态
- GitHub Pages Actions 部署
- 本地编辑 + 线上只读
- GitHub Token 手机/远程所有者编辑
- 一键提交 `published-vault.js` 到 GitHub Pages
- 发布快照 `published-vault.js`
- 只读模式隐藏所有编辑入口

---

## 八、数据与限制

- 本地数据保存在当前浏览器 `localStorage`；换浏览器、换设备不同步。
- 线上访客只读，读取 `prototype/published-vault.js`。
- 这是纯静态发布方案，不是账号级鉴权；源码和发布数据公开。
- 当前没有：完整账号体系、私有内容、自动跨设备同步、附件上传、完整 Markdown 文件系统。
- 手机编辑使用细粒度 Token，Token 保存在该设备浏览器；请使用最小权限并设置过期时间。多人/多设备同时编辑同一份快照会互相覆盖。
- Markdown 源码是 HTML 内容的转换层，内部存储仍为 HTML。
- Obsidian callout、`![[嵌入]]`、frontmatter 直接编辑尚未完整支持。

---

## 九、部署 / 更新

详细步骤见 [DEPLOY.md](DEPLOY.md)。

- GitHub Pages 的 Source 选择 **GitHub Actions**；
- 工作流：`.github/workflows/pages.yml`；
- 每次 push 到 `main` 自动重新部署；
- 修改静态资源时同步更新 `prototype/index.html` 的 `?v=` 和 `prototype/service-worker.js` 的 `CACHE_VERSION`。

---

## 十、故障排查

### 图谱不显示
- 先点左侧「知识网络」或空工作区「打开知识网络」；
- 如果左上角显示「2D 兼容视图」，说明 WebGL 被禁用，2D 图谱仍可用；
- 想要 3D：在浏览器设置中开启图形加速/WebGL。

### 线上还是旧内容
- 发布快照是否已替换并 push；
- Actions 是否部署成功；
- 强制刷新 `Ctrl/Cmd+Shift+R`；
- 检查 Service Worker 缓存版本。

### 本地数据丢了
- 检查是否换了浏览器或地址（file / localhost / github.io 是不同存储域）；
- 尝试之前导出的 JSON 备份；
- 本地开发数据与线上发布数据是分开的。

---

## 十一、项目结构

```
prototype/
  index.html              入口
  app.js                  应用逻辑
  markdown.js             Markdown 转换
  data.js                 初始示例数据
  published-vault.js      线上只读发布快照
  service-worker.js       PWA 缓存
  manifest.webmanifest    PWA 清单
  icons/                  PWA 图标
  vendor/                 3D 图谱、JSZip
.github/workflows/pages.yml  GitHub Pages 部署
DEPLOY.md                  部署说明
```
