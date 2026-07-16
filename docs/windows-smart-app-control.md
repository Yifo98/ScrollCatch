# Windows Smart App Control 兼容性说明

更新日期：2026-07-16

## 结论

ScrollCatch 是由 Chrome、Edge 等 Chromium 浏览器加载的浏览器扩展，不是 Windows 桌面应用。当前项目及发布包不包含 `.exe`、`.msi`、`.dll`、`.bat`、`.cmd`、`.ps1` 或 Native Messaging 主机，因此没有需要代码签名的 Windows 原生安装包或启动程序，也不需要为了 Smart App Control 改成 BAT 启动。

“未签名 EXE/MSI 会受影响、BAT 一定不受影响”这个判断只对了一部分：

- **未签名 EXE 等原生二进制确实有被拦截风险，但不是所有未签名文件必然被拦截。** Smart App Control 会先参考微软云端应用信誉；无法作出安全判断时，再检查有效签名。未知且未签名或签名无效的应用会被视为不受信任并被阻止。有效签名应来自 Microsoft Trusted Root Program 中受信任的 CA。[Microsoft Support：Smart App Control FAQ](https://support.microsoft.com/en-US/Windows/Security/threat-malware-protection/smart-app-control-frequently-asked-questions)；[Microsoft Learn：Smart App Control overview](https://learn.microsoft.com/en-us/windows/apps/develop/smart-app-control/overview)
- **MSI/安装链也在应用控制的风险面内。** 微软说明 Application Control 不只覆盖 EXE/DLL，也覆盖脚本和 Microsoft Installer；MSI 与脚本相关的策略事件会记录在 `AppLocker/MSI and Script` 日志中。Smart App Control FAQ 还特别说明，依赖无法数字签名的 MST 文件的安装、更新或卸载，在云端信誉判断不明确时可能被阻止。[Microsoft Learn：Application Control for Windows](https://learn.microsoft.com/en-us/windows/security/application-security/application-control/app-control-for-business/appcontrol)；[Microsoft Learn：Audit App Control policies](https://learn.microsoft.com/en-us/windows/security/application-security/application-control/app-control-for-business/deployment/audit-appcontrol-policies)；[Microsoft Support：Smart App Control FAQ](https://support.microsoft.com/en-US/Windows/Security/threat-malware-protection/smart-app-control-frequently-asked-questions)
- **BAT/CMD 不是绕过 Smart App Control 的可靠方案。** App Control 的详细脚本说明指出，它不会直接控制由 `cmd.exe` 执行的 `.bat`/`.cmd` 文件；但是批处理脚本尝试启动的任何 EXE、安装器或其他受控代码仍然受 App Control 检查。也就是说，把被拦截的 EXE 外面套一层 BAT 并不能让它通过。[Microsoft Learn：Script enforcement with App Control for Business](https://learn.microsoft.com/en-us/windows/security/application-security/application-control/app-control-for-business/design/script-enforcement)
- **用户无法为 Smart App Control 单独放行某一个应用。** 微软建议开发者为需要分发的 Windows 原生应用使用有效代码签名；关闭 Smart App Control 是设备级选择，不应作为正常安装流程的依赖。[Microsoft Support：Smart App Control FAQ](https://support.microsoft.com/en-US/Windows/Security/threat-malware-protection/smart-app-control-frequently-asked-questions)

## 对 ScrollCatch 的发布建议

1. 继续发布标准 Chromium 扩展 ZIP，仅包含 `manifest.json`、HTML、CSS、JavaScript、图片及扩展所需静态资源。
2. 不新增 EXE/MSI 安装器、独立 Windows 启动器或“BAT 包装 EXE”的分发形式。
3. 发布检查应拒绝 Windows 原生可执行文件和启动包装意外混入扩展包。
4. 如果未来确实新增 Native Messaging 或 Windows 桌面伴侣程序，应将它作为独立产品重新评估代码签名、Smart App Control、SmartScreen 和企业 App Control 兼容性；不能假设 BAT/CMD 能规避这些检查。

## 本次判断

当前 ScrollCatch 不存在需要删除的 EXE/MSI/BAT Windows 产物。对本项目最稳妥的处理不是“只保留 BAT”，而是继续保持纯浏览器扩展发布边界，不引入任何原生 Windows 启动层。
