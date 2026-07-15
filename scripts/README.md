# Scripts

## package-release.sh

从 `manifest.json` 读取当前版本，只替换该版本对应的候选目录与 ZIP，然后生成：

- `dist/ScrollCatch-<version>/`
- `dist/ScrollCatch-<version>.zip`

发布包会包含 README、隐私政策、产品语境、功能文档、扩展脚本、弹窗、结果页和图标资源。

用法：

```bash
./scripts/package-release.sh
```

每次发布新版都用这个脚本打包。脚本会保留 `dist/` 中其他版本的稳定包，方便回退和对照验收。
