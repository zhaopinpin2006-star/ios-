# 泥咕咕 WebAR「破画而出」项目交接文档（Codex 接手版）

> 交接日期：2026-11-13  
> 状态：已有 GitHub 仓库、可发布 WebAR 页面、预编译图片识别文件；**尚未获得 iPhone Safari 真实识别成功 + 动画成功的验收证据**。请先解决运行稳定性，再升级动画。  
> 交接原则：**优先复用现有开源框架和现有代码，不重造图片跟踪引擎；勿覆盖仓库已有的 iOS 项目文件。**

## 1. 用户想要什么（最终目标）

使用 iPhone Safari 打开一个 HTTPS 网页（可通过普通二维码进入），允许摄像头，然后用手机扫描**用户提供的「泥咕咕」海报/绘本图片**，识别成功后让海报上的黑色泥咕咕角色**从画面中向镜头方向立体飞出**，伴随发光、彩色 3D 粒子从图案表面汇聚/爆发、红色翅膀扇动、悬浮和轻微转向。手机移动时视觉内容要持续绑定图像，丢失识别后提示重新对准，重新识别或点击按钮能够重播。

角色视觉应尽量忠实原图：黑色圆润身体、黄色喙/脚、白色大眼和白色水滴纹、红色大翅膀、胸前红白花和绿色叶子。题材是河南鹤壁浚县的非遗泥咕咕文化，可作为后续文化讲解互动扩展，但**本阶段优先实现能稳定扫描并飞出来**。

重要澄清：普通 iPhone 原生相机不会自动显示自制 WebAR，须先扫码进入 Safari 网页并授权摄像头；Safari 的 404、相机授权、图片识别失败是不同层级问题。

## 2. GitHub 与线上地址（已核实）

- **仓库**：https://github.com/zhaopinpin2006-star/ios-
- **分支**：`main`；仓库公开。
- **GitHub Pages 配置**：使用 `main` 分支的 **`/docs` 目录**发布。
- **唯一推荐正式访问网址**：https://zhaopinpin2006-star.github.io/ios-/
- **开发调试可加缓存参数**：`https://zhaopinpin2006-star.github.io/ios-/?v=codex-test-1`
- **千万不要给正式网址再加 `/docs/`**；上一轮多加了 `/docs/` 导致用户看到 404。仓库内 `docs/docs/index.html` 是为误分享的旧地址补的兼容跳转，不是当前入口。
- 仓库根目录的 `index.html` 是早期的旧跳转文件；**实际 Pages 首页是 `docs/index.html`**。
- 在 2026-11-13 的 GitHub Actions 记录中，Pages build/deploy 最近一次已成功；这只证明部署成功，**不等于浏览器 AR 功能已验收**。
- GitHub App 写入权限此前已获得；以后 Codex 有写权限时可直接修改/提交该仓库，但请先检查登录授权与仓库权限。

## 3. 当前目录结构和用途

```text
ios-/
├── index.html                             # 仓库根目录历史跳转；不是 Pages 入口
├── docs/                                  # GitHub Pages 发布根目录
│   ├── index.html                        # 当前完整 WebAR 页面（HTML/CSS/JS 在同文件）
│   ├── mudgugu-target.jpg                # 泥咕咕识别用的低分辨率裁切图，260×256
│   ├── targets.mind                       # 预先编译好的图片识别数据，173429 字节
│   ├── vendor/                            # 自托管 MindAR + Three.js 模块和依赖
│   │   ├── mindar-image.prod.js
│   │   ├── mindar-image-three.prod.js
│   │   ├── controller-*.js
│   │   ├── ui-*.js
│   │   ├── three.module.js
│   │   └── addons/renderers/CSS3DRenderer.js
│   └── docs/index.html                   # 为错误的 /docs/ 访问路径做的重定向
├── scripts/
│   └── compile-mudgugu.mjs               # 用 Playwright/Chromium 预编译 .mind 文件
└── .github/workflows/
    └── build-mudgugu-target.yml          # Node 22 + Ubuntu 24.04，编译并提交目标文件
```

当前 `.mind` 已成功写入并在 GitHub 中验证存在，大小 **173429 B**。特征识别目标是**裁切过的泥咕咕图案**，不是整张原版海报的完整高分辨率设计文件。该裁切图宽高为 **260×256**；未来宜用未变形的原始高清设计稿生成新目标，测试是否改善跟踪稳定性。

## 4. 技术栈和当前实现

- **MindAR**：浏览器中的自然图像目标识别、锚点、跟踪。先从现有 `mind-ar@1.2.5` 代码/自托管资源继续，不要重写图像特征算法。
- **Three.js**：`three@0.160.0`（当前自托管版本），用于粒子、贴图、空间坐标、动画渲染。
- **前端**：纯 HTML + CSS + ES Modules，无 Vue/React 构建系统。
- **预编译目标**：`docs/targets.mind`，当前 `docs/index.html` 的 `makeTarget()` 会先 `HEAD ./targets.mind`，有文件即直接使用；找不到文件才回退到手机现场编译。
- **动画**：约 750 个 `THREE.Points` 发光粒子；使用时间插值将粒子从画面附近向图像法线的 `+Z` 方向飞散。
- **角色**：用 JavaScript 内嵌 SVG 纹理（`BIRD_SVG`、`WING_SVG`）制作前后两层平面 + 翅膀摆动，模拟浮雕/飞出。**这只是 2.5D，不是真正具有完整几何体和背面的 GLB 3D 模型，角色造型也未做到与上传图严格一致**。
- **事件**：`anchor.onTargetFound` 触发起飞，`anchor.onTargetLost` 停止/重置，`#replay` 手动重播。
- **浏览器权限**：`start()` 先单独请求 `getUserMedia()` 并停止预检流，然后调用 `ar.start()` 再开摄像头；如果 iOS 上出现权限/摄像头争用，可改为单一路径处理。

## 5. 用户此前实际遇到的问题与处理状态

| 现象 | 原因/已知结论 | 当前状态 |
|---|---|---|
| 下载 ZIP 不能用 Safari 直接打开 | ZIP 是源代码压缩包，不是 HTTPS 网页 | 已明确，需 Pages 发布 |
| GitHub Pages 404 | 曾未启用 Pages；后来错误链接再次包含 `/docs/` | Pages 已成功；正式链接固定为 `/ios-/`；仍须检查线上实际 HTTP 200 |
| Safari 点击「开启 AR 摄像头」没反应 | 旧版加载/绑定失败时，UI 缺少完整报错 | 已增加状态与错误提示；iPhone 仍需实测 |
| 相机已开，但显示「正在寻找海报」 | 旧版本加载的是官方测试图；镜头对海报也有裁切问题 | 已换为泥咕咕目标；真实识别尚未验收 |
| 报「图片编译器未能加载」 | 旧代码把 MindAR ES Module 当普通 `<script>` 加载；外部 CDN 也出现加载失败 | 改为 ES Module 和仓库自托管，并预编译 `.mind`；需真机复测 |
| GitHub 编译脚本失败 | Playwright 在 Ubuntu 26.04 不兼容、JS 模块拆分缺失、浏览器下载事件超时等 | 已用 Ubuntu 24.04、自托管依赖、浏览器内存提取方式修复，最后编译工作流成功 |

**关键现状**：最后一轮服务器日志证明 `.mind` 已生成、Pages 成功部署；但尚无用户的新截图证明最新版本已经在 iPhone Safari 完成「识别成功 → 角色飞出」。不要写“功能已全部完成”。

## 6. Codex 接手后的优先任务（按顺序执行）

### P0：检查线上网页和 iPhone 启动链路（必须先做）

1. 拉取当前 `main`，阅读 `docs/index.html` 和自动编译脚本，**不要从旧 ZIP 恢复或覆盖较新的提交**。
2. 用 Playwright 访问 `https://zhaopinpin2006-star.github.io/ios-/`，核对页面实际 HTTP 状态、资源状态、浏览器控制台、JS module import / CORS / MIME / 404 / CSP 错误。
3. 检查并修复自托管模块之间的 `import` 相对路径、Three.js 与 MindAR 实际版本/导出兼容性，尤其是 `mindar-image-three.prod.js`、`controller-*.js`、`CSS3DRenderer.js`、Three.js 的旧导出。不要假设“Pages 构建成功”就意味着 Three.js 可正常 import。
4. 确认 `./targets.mind` 返回 200、文件非 HTML、大小合理；`./mudgugu-target.jpg` 可访问；网页不会错误走手机编译回退。
5. 对 `start()` 建立可观测状态机：`idle → camera-request → target-ready → engine-loading → tracking → target-found / target-lost → error`；加载失败要展示**真实错误内容与阶段**，避免只提示“网络不好”。
6. 尽可能加入浏览器无摄像头条件下的自动化冒烟测试（fake camera/video 可以测试启动流程，但不能代表真实印刷海报识别）；再由用户用 iPhone Safari、实物纸质海报完成真机验收。

### P1：提高泥咕咕的图片识别可靠性

1. 目前目标是裁切压缩版 `260×256`，需要评估图像特征数量、与纸质版本的裁切一致性、反光/倾斜/距离影响。
2. 尽量从原设计稿提取**不拉伸、清晰、高对比度、包含较丰富独特细节**的图像进行重新编译；不要把实际打印图案与训练图片换成两种不同构图。
3. 若需要识别整张海报，可新建完整海报目标并重新编译 `.mind`；在相机视野中测试完整入框的不同距离/倾斜角度。
4. 用户此前扫描照片里标题和右侧被取景框裁切；在 UI 上展示识别目标预览和明确指导，避免用户以为只要瞄准任意局部即可触发。
5. `onTargetFound` 触发后反馈清晰（UI + 动画），丢失后暂停或按产品设计决定何时重播，防止频繁抖动导致不断重播。

### P2：完善“从图片中飞出来”的视觉演出

1. 先做稳定的 2.5D 演示版：原图颜色贴合、角色从平面抬起、翅膀扇动、红/黄/绿/白粒子从鸟的轮廓和花纹表面释放，减少完全随机的散点。
2. 之后替换为**真实 GLB/glTF 模型**：保证泥咕咕黑色圆润体型、黄喙、黄脚、红色羽翼、白水滴和红白花纹与用户原稿一致，完整背面、稳定重心和坐标原点；可用 Meshy/Blender 建模后导出，但不要把 AI 生成的“3D 效果图片”当作可渲染的 `.glb`。
3. 推荐演出：识别时图案发光 0.3s → 纹样粒子升起 0.6s → 角色沿局部 +Z 浮出 1–2s → 轻微转向、翅膀扇动、悬浮待机 → 点击重播；不使用无限大粒子数导致 iPhone 掉帧。
4. 手机性能基线：粒子上限可配置（例如 300 / 600 / 1000 档）；降低渲染像素比；复用 BufferGeometry/纹理，不在每帧创建几千个新对象。

### P3：工程化与交付

- 将 `docs/index.html` 的大量 JS 分拆为 `src/ar.js`、`src/particles.js`、`src/character.js`、`src/ui.js`（或与现有结构兼容的轻量方案），用受控版本管理依赖。
- 更新/完善 `README.md`、`LICENSE` 声明；确认开源第三方授权要求。
- 提供可复制的二维码，指向正式 HTTPS 链接；不要指向 GitHub 仓库网页或 ZIP 文件。
- 加入 Safari iOS 真机诊断页：显示 HTTPS、相机支持、WebGL、资源加载、目标加载、跟踪事件、帧率。
- 不要未经确认清理或覆盖 `ios-` 仓库原有 `.github` 其他工作流、证书或配置文件。

## 7. 建议验收标准

- 在 iPhone Safari 打开 `https://zhaopinpin2006-star.github.io/ios-/`，首页 HTTP 200、无白屏、无模块加载报错。
- 点击开启 AR，出现相机授权提示或已授权直接进入取景画面；UI 不会卡在“编译器加载失败”。
- `targets.mind` 直接加载，不强制临时编译照片。
- 摄像头对准与目标相符的泥咕咕纸质图片，实际触发 `onTargetFound`，角色和粒子正常出现。
- 角色确实从**海报平面向外**浮出，移动手机时仍附着于海报；失去目标后给出提示，重新识别/重播正常。
- Safari 前后台切换、不同网络条件下不出现永久黑屏；报错可见且便于诊断。
- 真机截图或短视频证明：至少一张识别成功截图，一段完整飞出演示；**没有证据时标记“待验收”**。

## 8. 当前已知的开发风险与避免踩坑

- **正确入口路径**：`/ios-/`。源码在仓库 `/docs/`，**网页 URL 不再追加 `/docs/`**；因此页面内的 `./vendor/`、`./targets.mind` 相对于 Pages 首页解析。
- **图片质量**：仓库里的识别图是低清裁切缩略图，不能把已成功编译等同于一定能识别印刷海报。
- **兼容性风险**：MindAR bundle 中引用旧式 Three.js API 的可能性需实际核对；如果 import 报错，优先统一官方支持的依赖版本或按构建工具重打包。
- **工程结构**：同一份 HTML 包含内联 SVG、运行时交互和粒子引擎，修改时注意静态语法检查、CSP、MIME 类型和 GitHub Pages Jekyll 构建影响；可以添加 `.nojekyll` 保留静态资源。
- **GitHub Action**：当前预编译工作流由 `workflow_dispatch` 或特定路径 push 触发。更改 `scripts/compile-mudgugu.mjs` 本身未必触发新编译，必要时手动运行工作流。
- **真 3D 与伪 3D**：当前视觉角色是 SVG 二维平面的 2.5D 浮出。真正三维模型待制作，不能向用户宣称已具备完整 3D 拓扑或可旋转背面。
- **隐私**：相机图像应在浏览器本地处理，不必上传云端；页面不得无告知采集图像。

## 9. Codex 可直接执行的任务提示词

复制下面内容发给 Codex（或让 Codex 先读本文件）：

```text
请接手当前 GitHub 项目 https://github.com/zhaopinpin2006-star/ios- ，先阅读仓库根目录 CODEX_HANDOFF_MUDGUGU_AR.md，再检查 docs/index.html、docs/targets.mind、docs/mudgugu-target.jpg、docs/vendor 和构建脚本。

目标：用 iPhone Safari 打开 https://zhaopinpin2006-star.github.io/ios-/ ，允许摄像头后扫描泥咕咕印刷海报，角色带有粒子特效从海报里立体飞出，跟随图像移动，支持重新扫描和重播。

优先级：
P0 先验证线上 HTTP、全部 JS 模块和资源加载、MindAR 与 Three.js 兼容性、摄像头启动和预编译目标读取。用 Playwright/浏览器开发者工具检查 console/network，发现错误直接修复并提交，不要误把 GitHub Pages 成功部署等同于 AR 已正常运行。保留有效日志用于 iPhone Safari 排错。
P1 优化图像识别可靠性，对比仓库中的 260×256 裁切图与用户实际扫描的海报，不要擅自改动角色原设计。
P2 在 P0 稳定后优化粒子从图案轮廓飞出、角色升空、翅膀扇动；目前只有 2.5D，若需要完整 3D 请明确准备 GLB 模型。
P3 提供项目结构和 README、真机测试清单及修改记录。

不得删除原仓库其他 iOS 文件；不得新造图像跟踪算法；尽量使用已有 MindAR / Three.js，锁定依赖版本；每个改动要可验证。最终向我汇报：改了哪些文件、代码提交、线上 URL、哪几项自动验收通过、哪几项仍需 iPhone 真机验证。
```

## 10. 本次交接的实际状态总结

**已经完成**：GitHub 仓库连接、`docs/index.html`、泥咕咕裁切识别图、预编译 `.mind`（173429 字节）、自托管 MindAR/Three.js 依赖、Playwright 编译脚本与 GitHub Actions、Pages 成功发布记录。

**尚未确认**：最新部署的 iPhone Safari 摄像头流程是否完整无报错；当前 `.mind` 对**真实纸质海报**的匹配是否足够可靠；`onTargetFound` 是否已在真机触发；视觉动画效果是否达到用户期望；完整 GLB 三维泥咕咕模型。

**推荐下一步**：让 Codex 先把最新线上版本在可自动化的浏览器环境中完成“资源加载 + JS 启动”测试，并修好任何失败，再要求用户提供 iPhone Safari 最新错误页面或实际识别短视频作真机验收。