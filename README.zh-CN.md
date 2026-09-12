[![](public/icon-180x180.png)](https://tenlines.skrxiaoyu.com)

[English](./README.md) | [简体中文](./README.zh-CN.md)

## Ten Lines Fork 中文说明

这个仓库是对 Lincoln-LM 的 **Ten Lines** 的个人 Fork，重点放在更实用的 FRLG 目标筛选体验，以及更容易自部署的网站构建流程。

上游原始项目：
[Lincoln-LM/ten-lines](https://github.com/Lincoln-LM/ten-lines)

## 这个 Fork 增加了什么

- Searcher 现在支持 **可达 advances 预筛选**
- 可以直接在 Searcher 页面输入 **允许 advances 区间**
- Searcher 结果会自动结合 Initial Seed 的可达性逻辑进行检查
- 不存在可达路径、或者不在允许范围内的结果会被提前过滤掉
- Searcher 可以显示每个结果的 **最小可达 advances**
- FRLG 的 Searcher 可达性筛选新增了 **声音** 选项，支持 `任意`、`单声道`、`立体声`
- Searcher 现在支持 **满个体数量筛选**，可以搜索 `1V` 到 `6V`，内部会自动遍历所有对应的 31 个体组合
- 界面现在支持 **英文 / 中文切换**
- 游戏内命名资源现在可以显示 **中文**，包括宝可梦、性格、特性、属性、地点等
- 中文用词做了额外整理，尽量贴近常见社区习惯和 PokeWiki 表达
- ID Combo 搜索现在支持 **多选性格筛选**，并会在结果中显示 **示例个体值**
- Calibration 现在包含 **目标 / 历史对照面板**，支持快速添加、列显示控制、差值显示、浮动窗口模式，以及内置计算器
- 校准页面设置现在也可以统一控制 **动态修正工具开关**、**结果表显示列**，以及基于 **IV 第一行等级** 的可选野生等级筛选
- Calibration 搜索改为 **手动点击提交** 才执行，避免输入过程中不断自动重跑
- Searcher 和 Initial Seed 现在可以 **自动把选中的目标带入 Calibration 对照表**
- Calibration 对照表设置中新增了 **自动添加目标** 开关，默认开启
- Bingo 确认结果后现在会 **自动追加到校准历史**
- 对同一个 Bingo 结果重复确认时，也会重复写入历史
- 对照表里的目标 Seed 现在会同时显示 **十六进制 Seed 和毫秒时间**
- 构建流程支持 **离线缓存 FRLG seed 数据**
- Vite base path 可以配置，因此网站可以更方便地部署到自定义域名或子路径

## 为什么要做这个 Fork

原始流程里，经常会遇到这样的问题：

1. 在 Searcher 里找到一个看起来不错的目标
2. 打开 Initial Seed 继续看
3. 结果发现可达 advances 太大，实际根本不好用

这个 Fork 的目标，就是尽量把这种“后知后觉”的无效目标提前过滤掉，让 Searcher 阶段就能更接近实战使用场景。

## 主要功能

- FRLG / RSE 搜索工具
- Initial Seed 查询
- 支持多性格筛选和示例 IV 展示的 ID Combo 搜索
- Calibration 校准工具
- 带目标 / 历史记录、差值显示、浮动模式、内置计算器、自动承接前序目标的 Calibration 对照面板
- Searcher 的可达 advances 预筛选
- Searcher 的 `1V` 到 `6V` 满个体数量筛选
- 独立的实验性 FRLG 野生携带物标签页（火红英文版甜甜香气实测档案）
- FRLG 可达性搜索中的声音筛选，以及 `任意` 声音模式
- 英文 / 中文界面切换
- 界面中可显示中文的 Gen 3 数据名称资源
- 支持离线构建的 FRLG seed 缓存
- 可自托管的 Vite 构建输出

## 本地化说明

- 网站顶部导航栏内置了语言切换按钮
- 语言选择会保存在浏览器本地，刷新后依然生效
- 中文文本会尽量遵循常见 Pokemon / 宝可梦社区术语
- 游戏数据名称来自随项目打包的 PokeFinder i18n 资源，而界面文案由网页层单独维护
- 中文模式下，性格名称会额外显示英文括号，方便交叉对照

## Calibration 说明

### Dynamic Correction Tool

- 这个动态修正工具是为了配合 [炫夜鳞](https://space.bilibili.com/29039016?spm_id_from=333.1387.fans.user_card.click) 的脚本一起使用而补充的网页侧辅助功能
- `添加到目标` 会把对应帧数自动写入动态修正工具的 `目标帧数`
- `添加到历史` 会把对应帧数自动写入动态修正工具的 `实际命中帧数`
- 从 Initial Seed 页面进入 Calibration 并自动加入目标时，也会同步写入动态修正工具的 `目标帧数`
- 动态修正工具支持 TV / 非 TV 两套基础保底时间、上一轮数据保留，以及按模式拆分的历史记录表格，历史单位为 `ms`

- Calibration 结果可以直接加入对照面板，作为目标或历史记录
- 历史记录可以选择和目标比较，也可以选择和上一条历史记录比较 Seed / advances 差值
- 对照历史列可以自定义显示，新增了单独的 **能力值** 列，会显示实际六项数值 `HP/攻击/防御/特攻/特防/速度`
- 历史记录每一行都带有一个可再次追加的按钮，重复确认同一结果时可以直接再次写入历史
- 校准页面设置里还可以统一控制 **结果表显示列** 和 **动态修正工具** 开关
- 当使用野生校准方法时，校准页面设置里可以开启 **按 IV 第一行的等级筛选野生结果**，并且只会读取 IV 输入第一行的等级，第二行及之后不会影响筛选
- 对照面板可以切换为可拖拽的浮动窗口
- 浮动对照面板内置可选计算器，方便做帧数和时间换算
- Calibration 搜索现在只有在点击提交时才会执行，避免输入时卡顿
- 在 Initial Seed 页面点击 **Calibration** 时，可以在跳转前自动把该目标加入对照面板
- 如果目标最初来自 Searcher，那么对照面板会尽量保留该目标的完整信息，包括宝可梦名称 / 显示名及相关搜索属性
- 对照面板设置里可以关闭 **自动添加目标**，改回手动流程
- 对照面板里的目标 Seed 会显示为 `SEED (xxx ms)` 这种格式，方便看时间
- Bingo 中确认的结果会自动同步进对照历史，可以直接作为持续校准记录使用

## Searcher 说明

- Searcher 的性格筛选支持多选，空选择表示 `任意`
- 满个体数量筛选与手动 IV 区间筛选是互斥思路：启用后会自动枚举“恰好 N 项为 31”的所有组合并执行搜索
- 在 FRLG 可达性筛选里，如果声音选择 `任意`，内部会同时检查 `单声道` 和 `立体声`，并对同一 seed 取更小的可达 advances
- Searcher 中选中的目标可以继续传递到 Initial Seed / Calibration，减少后续重复录入

## 携带物说明

- 携带物搜索使用独立的顶层标签页，不会向 Searcher 或 Calibration 添加开关、筛选项或结果列
- 页面只列出火红叶绿中实际具有携带物的宝可梦，并保留这些宝可梦的全部草丛／洞窟地点
- 页面按 16 位初始 Seed 向前扫描指定 Advance 范围（单次最多 100,000）；不需要填写 TID、SID，也不需要筛选个体值
- 已知地点会自动填写实测 H1 标准 Offset；未知地点默认显示 `0`，需要手动填写后再搜索
- **H1 稳定模式**检查 `O`、`O+1`；**H1/H2/H4 全覆盖模式**检查 `O-1`、`O`、`O+1`；**四轨广覆盖模式**再检查 `O+2`；两种五轨模式分别检查 `O-1` 至 `O+3`、`O-2` 至 `O+2`
- 闪光 + 帧数范围模式会搜索全部 Seed 库，只按闪光状态和 Advance 范围筛选；覆盖模式只控制结果中显示的携带物轨迹，不参与筛选
- 结果会逐项显示全部被检查的 Offset、roll 和预测道具

## ID Combo 说明

- ID Combo 搜索支持同时选择多个目标性格
- 结果表会显示示例个体、PID 和 Seed，方便判断某个 TID/SID 命中的样例结果是什么样

## 本地构建

环境要求：

- `git`
- `node` / `npm`
- 带有 `numpy` 和 `requests` 的 Python
- Emscripten / `emsdk`
- `cmake`
- `ninja`

典型流程：

```bash
git clone --recursive <your-fork-url>
cd ten-lines
npm install
python3 -m pip install --user numpy requests pytest
source ~/emsdk/emsdk_env.sh
npm run build
```

在 Windows 上，请根据自己的环境使用等价的 Python 和 emsdk 激活命令。

## 离线构建说明

这个 Fork 支持复用以下位置中的 FRLG seed 缓存文件：

- `src/wasm/src/generated`
- `public/generated`

如果这些生成文件已经存在，构建时就可以直接复用，而不必重新从 Google Sheets 下载 seed 数据。

如果你想强制刷新 FRLG seed 缓存，可以这样执行：

```bash
TEN_LINES_REFRESH_FRLG_SEEDS=true npm run build
```

## 部署

构建完成后，把 `dist/` 目录下的内容部署到静态网站目录即可。

示例：

```bash
npm run build
rsync -av --delete dist/ /var/www/ten-lines/
```

如果部署在子域名或自定义路径下，这个 Fork 现在默认按根路径托管方式处理，不再要求硬编码 `/ten-lines/` base path。

## 致谢

- 原始 Ten Lines 的概念与实现来自 Lincoln-LM 及上游贡献者
- PokeFinderCore 项目来自 [Admiral-Fish](https://github.com/Admiral-Fish/PokeFinder)
