# ScrollCatch Docs

这个目录保存长期维护文档。README 只保留项目入口、常用安装和使用说明。

## 功能文档

- [飞书 / PPT 按页截图](./features/feishu-ppt-capture.md)：说明 `1.0.2` 的 PPT 自动识别和按页捕获模式。

## 排查记录

- [截图速度与 PPT 页码跳转](./troubleshooting/capture-speed-and-ppt-navigation.md)：说明长网页截图慢的原因、预加载建议，以及 Windows 端 PPT 页码跳转失败的处理。

## 变更记录

- [changelog](./changelog.md)：按版本记录用户可见变化。

## 产品决策

- [产品语境](../CONTEXT.md)：定义现行版、后续版本、快速结果、编辑工作台和活动分节等核心词汇。
- [ADR-0002](./adr/0002-iterate-the-existing-store-product.md)：在现有商店产品上继续迭代，并保留 `1.0.2` 回退边界。
- [ADR-0003](./adr/0003-separate-quick-results-from-advanced-editing.md)：分离快速结果与编辑工作台。
- [ADR-0004](./adr/0004-show-progressive-results-before-full-composition.md)：在完整拼接前显示渐进结果。
- [ADR-0005](./adr/0005-only-keep-the-active-section-in-high-resolution.md)：只让活动分节保留高清交互预览。
- [ADR-0006](./adr/0006-use-caught-sections-as-the-product-icon.md)：统一使用 Caught Sections 产品图标。
- [ADR-0007](./adr/0007-unify-single-and-continuous-capture-editing.md)：单段与连续截图共用一个编辑工作台入口。
- [ADR-0008](./adr/0008-reduce-the-workbench-to-three-core-tools.md)：工作台只保留自由裁切、自定义分页和导出三个核心工具组。
