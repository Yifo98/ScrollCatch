# Scripts

## package-release.sh

从 `manifest.json` 读取当前版本，清空旧的 `dist/` 发布产物，然后重新生成：

- `dist/XF-FullPage-Capture-<version>/`
- `dist/XF-FullPage-Capture-<version>.zip`

发布包会包含 README、隐私政策、功能文档、扩展脚本、弹窗、结果页和图标资源。

用法：

```bash
./scripts/package-release.sh
```

每次发布新版都用这个脚本打包，避免旧版本 ZIP 或旧解压目录残留在 `dist/` 里。
