# 知识星图 · Knowledge Nebula

一个 Obsidian Light 风格的本地优先知识库 Web App：笔记、分类、双向链接、反向链接、标签页、3D/2D 知识网络、Markdown 源码实时预览、Obsidian Vault 导入导出，以及本地/手机 GitHub 所有者编辑 + 只读发布。

## 快速打开

- 直接双击 `prototype/index.html`（不需要服务端）；
- 或在 `prototype/` 下启动静态服务：

```bash
cd prototype
python -m http.server 8765 --bind 127.0.0.1
```

然后打开 <http://127.0.0.1:8765/>。

## 部署 / 安装

- [DEPLOY.md](DEPLOY.md)：生成只读发布快照、GitHub Pages 部署、Android/Windows PWA 安装、离线验证、更新缓存版本。
- 已包含：`manifest.webmanifest`、`service-worker.js`、PWA 图标、`.github/workflows/pages.yml`。
- 本地 `file://` / `localhost` 可编辑；GitHub Pages 等非 localhost 域名默认只读。
- 手机/远程编辑：线上点「所有者登录 · 开启手机编辑」，粘贴仅限本仓库 Contents 读写的 GitHub Token，即可编辑并「发布到 GitHub Pages」。
- 更新线上内容：手机/本地 `⋯` →「发布到 GitHub Pages」，或导出发布快照替换 `prototype/published-vault.js` 后 push。

## 文档

- [GUIDE.md](GUIDE.md)：完整使用说明、快捷键、已实现功能、故障排查
- [prototype/README.md](prototype/README.md)：开发视角的功能与限制
- [docs/需求文档.md](docs/需求文档.md)：需求和交互修订记录

## 说明

- 本地编辑数据存本机浏览器 `localStorage`；
- 线上访客只读，读取 `prototype/published-vault.js`；
- 没有后端、账号登录或跨设备同步；
- 这是纯静态“发布快照”方案，不是账号级鉴权；真正的 GitHub 登录编辑 / 私有内容需要 OAuth + 后端或 Serverless。
