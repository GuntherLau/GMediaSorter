# 文档关系图

本文档展示 GMediaSorter 项目各文档之间的关系和依赖。

## 📊 文档层次结构

```
README.md (项目入口)
    │
    ├─── 📚 文档目录 (docs/)
    │    │
    │    ├─── 🚀 入门层
    │    │    ├─ QUICKSTART.md ──→ INSTALL.md ──→ USER_GUIDE.md
    │    │    │                      ↓
    │    │    │                  系统依赖配置
    │    │    │                      ↓
    │    │    └────────────→ FFMPEG-PACKAGING.md
    │    │
    │    ├─── 👨‍💻 开发层
    │    │    ├─ PROJECT_SUMMARY.md (架构概览)
    │    │    │      ↓
    │    │    ├─ IMPLEMENTATION_SUMMARY.md (实现细节)
    │    │    │      ↓
    │    │    └─ TESTING.md (测试指南)
    │    │
    │    ├─── 📐 设计层
    │    │    ├─ video-resolution-filter-plan.md
    │    │    │      ↓
    │    │    └─ duplicate-similarity-detection-plan.md
    │    │           ↓
    │    │      (引用技术实现)
    │    │           ↓
    │    │    IMPLEMENTATION_SUMMARY.md
    │    │
    │    ├─── 🚢 部署层
    │    │    ├─ DEPLOYMENT.md
    │    │    │      ↓
    │    │    └─ FFMPEG-PACKAGING.md
    │    │
    │    └─── 📝 维护层
    │         └─ CHANGELOG.md
    │
    └─── 🔧 工具脚本
         └─ verify-ffmpeg.sh ──→ FFMPEG-PACKAGING.md
```

## 🔗 文档依赖关系

### 阅读路径

#### 路径 1: 快速上手 (用户视角)

```
README.md
   ↓
QUICKSTART.md (5分钟快速运行)
   ↓
USER_GUIDE.md (学习功能使用)
   ↓
开始使用应用 ✅
```

#### 路径 2: 开发入门 (开发者视角)

```
README.md
   ↓
QUICKSTART.md
   ↓
INSTALL.md (详细环境配置)
   ↓
PROJECT_SUMMARY.md (理解架构)
   ↓
IMPLEMENTATION_SUMMARY.md (查看代码)
   ↓
TESTING.md (运行测试)
   ↓
开始开发 ✅
```

#### 路径 3: 功能研究 (架构师视角)

```
README.md
   ↓
PROJECT_SUMMARY.md
   ↓
设计文档:
   ├─ video-resolution-filter-plan.md
   └─ duplicate-similarity-detection-plan.md
   ↓
IMPLEMENTATION_SUMMARY.md
   ↓
理解系统设计 ✅
```

#### 路径 4: 部署发布 (运维视角)

```
README.md
   ↓
DEPLOYMENT.md
   ↓
FFMPEG-PACKAGING.md
   ↓
verify-ffmpeg.sh (验证配置)
   ↓
打包发布应用 ✅
```

## 📋 文档依赖表

| 文档 | 依赖文档 | 被依赖文档 |
|------|---------|-----------|
| README.md | - | 所有文档 |
| QUICKSTART.md | INSTALL.md | - |
| INSTALL.md | FFMPEG-PACKAGING.md | QUICKSTART.md, DEPLOYMENT.md |
| USER_GUIDE.md | QUICKSTART.md | - |
| PROJECT_SUMMARY.md | - | IMPLEMENTATION_SUMMARY.md, 设计文档 |
| IMPLEMENTATION_SUMMARY.md | PROJECT_SUMMARY.md, 设计文档 | TESTING.md |
| TESTING.md | IMPLEMENTATION_SUMMARY.md | - |
| video-resolution-filter-plan.md | PROJECT_SUMMARY.md | IMPLEMENTATION_SUMMARY.md |
| duplicate-similarity-detection-plan.md | PROJECT_SUMMARY.md | IMPLEMENTATION_SUMMARY.md |
| DEPLOYMENT.md | INSTALL.md, FFMPEG-PACKAGING.md | - |
| FFMPEG-PACKAGING.md | - | DEPLOYMENT.md, INSTALL.md |
| CHANGELOG.md | - | - |

## 🎯 按场景推荐

### 场景 1: 我是新用户,想试用应用

**推荐阅读顺序:**
1. README.md (了解项目)
2. QUICKSTART.md (5分钟上手)
3. USER_GUIDE.md (学习使用)

**预计时间:** 15-30 分钟

### 场景 2: 我想参与开发

**推荐阅读顺序:**
1. README.md (项目概览)
2. QUICKSTART.md (快速开始)
3. INSTALL.md (环境配置)
4. PROJECT_SUMMARY.md (架构理解)
5. IMPLEMENTATION_SUMMARY.md (代码结构)
6. 相关设计文档 (功能设计)
7. TESTING.md (测试方法)

**预计时间:** 2-3 小时

### 场景 3: 我需要部署应用

**推荐阅读顺序:**
1. DEPLOYMENT.md (部署流程)
2. FFMPEG-PACKAGING.md (依赖处理)
3. verify-ffmpeg.sh (配置验证)

**预计时间:** 30-60 分钟

### 场景 4: 我在研究某个功能的实现

**推荐阅读顺序:**
1. 对应的设计文档 (如 duplicate-similarity-detection-plan.md)
2. IMPLEMENTATION_SUMMARY.md (代码实现)
3. 相关源代码文件

**预计时间:** 1-2 小时

### 场景 5: 我遇到了 FFmpeg 问题

**推荐阅读顺序:**
1. FFMPEG-PACKAGING.md (了解配置)
2. verify-ffmpeg.sh (运行验证)
3. INSTALL.md (重新配置)
4. DEPLOYMENT.md (打包相关)

**预计时间:** 30 分钟

## 📖 文档更新规则

### 何时更新文档

| 变更类型 | 需要更新的文档 |
|---------|---------------|
| 新增功能 | README.md, USER_GUIDE.md, CHANGELOG.md, 设计文档 |
| 修改功能 | USER_GUIDE.md, CHANGELOG.md, 相关设计文档 |
| 修复 Bug | CHANGELOG.md |
| 重构代码 | IMPLEMENTATION_SUMMARY.md, 相关设计文档 |
| 更改架构 | PROJECT_SUMMARY.md, IMPLEMENTATION_SUMMARY.md |
| 更新依赖 | INSTALL.md, DEPLOYMENT.md |
| 更改构建流程 | DEPLOYMENT.md, QUICKSTART.md |

### 文档维护检查清单

更新代码后,检查是否需要更新以下文档:

- [ ] README.md - 功能列表、示例
- [ ] QUICKSTART.md - 快速开始步骤
- [ ] INSTALL.md - 安装依赖
- [ ] USER_GUIDE.md - 使用说明
- [ ] PROJECT_SUMMARY.md - 架构说明
- [ ] IMPLEMENTATION_SUMMARY.md - 实现细节
- [ ] TESTING.md - 测试用例
- [ ] 相关设计文档 - 设计方案
- [ ] DEPLOYMENT.md - 部署流程
- [ ] CHANGELOG.md - 版本记录

## 🔄 文档版本同步

确保文档与代码保持同步:

1. **功能开发时**: 先写设计文档,后编码
2. **代码提交时**: 同时更新相关文档
3. **版本发布时**: 更新 CHANGELOG.md
4. **定期审查**: 每月检查文档准确性

## 💡 文档编写建议

1. **清晰简洁**: 使用简单直接的语言
2. **结构化**: 使用标题、列表、表格
3. **示例丰富**: 提供代码示例和截图
4. **保持更新**: 代码变更时同步更新文档
5. **交叉引用**: 使用链接关联相关文档
6. **目标导向**: 从读者角度组织内容

## 🌟 文档质量标准

优秀的文档应该:

- ✅ 信息准确无误
- ✅ 结构清晰合理
- ✅ 示例完整可运行
- ✅ 语言简洁易懂
- ✅ 格式统一规范
- ✅ 定期更新维护
- ✅ 考虑不同读者群体

---

📝 **提示**: 建议定期回顾此文档,确保文档结构合理且易于导航。
