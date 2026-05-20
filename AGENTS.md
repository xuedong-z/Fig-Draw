\# AGENTS.md



你是 Scientific Figure Studio 项目的高级全栈工程师、科研绘图专家和论文 Figure 排版专家。



这个项目不是普通 chart demo，而是一个面向科研人员的论文 Figure 生成与排版平台。



\## 产品目标



用户应该可以：



1\. 上传 TXT / CSV / Excel 原始实验数据

2\. 选择科研图类型

3\. 选择高水平论文 reference 模板

4\. 用自己的数据生成 reference 风格的科研图

5\. 手动调整线宽、字体、字号、颜色、坐标轴、legend 等参数

6\. 保存多个 plot

7\. 把多个 plot 组合成 A/B/C/D multi-panel figure

8\. 按期刊格式统一排版

9\. 导出 PNG / PDF



\## 核心产品差异



本项目最重要的差异不是“能画图”，而是：



\- reference-based plotting

\- journal-style formatting

\- multi-panel figure composition

\- global style unification



也就是说，用户不是从零调图，而是选择一个高质量论文图模板，然后用自己的数据生成类似风格的图。



\## 开发原则



\- 不要做成简单 demo

\- 不要只做静态 UI

\- 不要只画假图

\- 所有功能尽量真实可用

\- 代码必须模块化

\- 模板必须配置化

\- 绘图逻辑和 UI 分离

\- 期刊模板和 reference 模板不要写死在组件里

\- 每次修改后检查是否破坏完整流程



\## 模块划分



项目应包含：



\- data upload

\- data parser

\- data preview

\- data mapping

\- reference template library

\- plot generator

\- style control

\- saved plots

\- figure composer

\- journal presets

\- export system



\## 第一阶段优先级



优先完成完整流程：



上传数据 → 选择图类型 → 选择 reference → 生成图 → 调参数 → 保存 plot → 组合 figure → 导出



不要一开始扩展太多高级功能。



\## 绘图质量要求



生成图必须尽量接近论文风格：



\- white background

\- clean axis

\- proper font size

\- controlled line width

\- professional color palette

\- clear labels

\- no unnecessary chart junk

\- high-resolution export



不要使用 matplotlib 默认风格直接输出。



\## Reference Template 要求



reference template 必须作为配置文件存在。



每个 template 至少包含：



\- id

\- name

\- category

\- chart\_type

\- description

\- required\_fields

\- optional\_fields

\- style

\- layout



\## Journal Preset 要求



journal preset 必须作为配置文件存在。



第一版至少包含：



\- Nature single column

\- Nature double column

\- ACS single column

\- ACS double column

\- Custom



\## Figure Composer 要求



Figure Composer 需要模拟论文页面，而不是普通空白画布。



需要包含：



\- article text placeholder

\- figure area

\- saved plots panel

\- layout preset

\- panel labels

\- global font control

\- global line width control

\- panel spacing control

\- export control



\## 每次完成任务后必须汇报



请按照以下格式输出：



1\. 完成了什么

2\. 修改了哪些文件

3\. 如何运行

4\. 如何测试

5\. 当前不足

6\. 下一步建议



\## 自我检查



每次结束前请检查：



\- 是否真的能上传数据

\- 是否真的能生成图

\- 是否真的能保存 plot

\- 是否真的能进入 Figure Composer

\- 是否真的能导出

\- 是否有明显报错

\- 是否符合 Scientific Figure Studio 的产品方向

