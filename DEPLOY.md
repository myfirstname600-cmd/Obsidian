# 部署到 GitHub Pages + PWA

当前应用是纯静态站点，不需要后端。`prototype/` 目录就是可直接部署的站点根目录。

- 本地 `file://` 或 `localhost` 打开：**可编辑**；
- 部署到 GitHub Pages（或任何非 localhost 域名）：**自动只读**；
- 内容更新方式：本地编辑 → 导出 `published-vault.js` → 提交 → 推送。

## 一、先生成只读站内容

在本地打开应用（双击 `prototype/index.html` 或 `http://127.0.0.1:8765/`）：

1. 编辑好笔记；
2. 左下 `⋯` →「导出发布快照」，下载 `published-vault.js`；
3. 用它替换 `prototype/published-vault.js`；
4. 建议先打开命令面板执行「预览访客只读页」，确认访客看到的内容；
5. 再按下面步骤提交部署。

> `published-vault.js` 会公开给所有访客，请不要放秘密内容。它包含笔记正文、分类、标签和关系。

## 二、推到 GitHub

在项目根目录执行：

```bash
git init
git add .
git commit -m "feat: knowledge nebula pwa"
git branch -M main
git remote add origin https://github.com/<你的用户名>/<仓库名>.git
git push -u origin main
```

## 三、开启 GitHub Pages

1. 打开 GitHub 仓库 → **Settings** → **Pages**。
2. **Build and deployment** → **Source** 选择 **GitHub Actions**。
3. 回到 **Actions**，运行 `Deploy Knowledge Nebula to GitHub Pages`，或再次 push 到 `main`。
4. 部署完成后访问：

   `https://<用户名>.github.io/<仓库名>/`

工作流文件：`.github/workflows/pages.yml`，会把 `prototype/` 作为站点根目录上传。

> 如果不想用 Actions，也可以在 Pages 里选择 **Deploy from a branch**，分支选 `main`、目录选 `/prototype`。此时地址会变成 `https://<用户名>.github.io/<仓库名>/prototype/`，manifest 和 Service Worker 使用相对路径，仍然可以安装/离线。

## 四、本地验证 PWA

在 `prototype/` 目录启动静态服务：

```bash
cd prototype
python -m http.server 8765 --bind 127.0.0.1
```

打开 <http://127.0.0.1:8765/>。

- Chrome / Edge 地址栏出现安装图标，或菜单里「安装应用 / 添加到主屏幕」；
- Android Chrome 菜单「添加到主屏幕」；
- 安装后独立窗口运行；
- 断网刷新仍能打开应用（应用壳和已发布的只读数据都在 Service Worker 缓存）。

`file://` 直接双击仍可用，但 Service Worker 和 PWA 安装需要 `http://localhost` 或 HTTPS。

## 五、更新应用时

修改静态资源后：

1. 同步修改 `prototype/index.html` 里 CSS/JS 的 `?v=` 版本号；
2. 修改 `prototype/service-worker.js` 的 `CACHE_VERSION`；
3. push 后用户刷新即可拿到新版本。

## 六、数据与只读说明

- **本地编辑**：数据保存在当前浏览器 `localStorage`；换域名、换设备不会同步，部署前先导出 JSON 备份或 Obsidian Vault。
- **线上访客**：只读，读取 `published-vault.js`，不会写入 localStorage。
- **内容更新**：重新「导出发布快照」并替换 `prototype/published-vault.js`，再 push。
- **安全边界**：这是纯静态“发布快照”方案，访客不能修改服务器上的内容，但源码和发布数据都是公开的；它不是账号级鉴权。真正的 GitHub 登录编辑 / 私有内容需要 OAuth + 后端或 Serverless，属于后续阶段。
- 访客在本地用浏览者工具改自己的副本不会影响线上内容。
