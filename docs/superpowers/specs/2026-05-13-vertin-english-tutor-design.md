# Vertin 英语口语陪练 — 设计文档

## 概述

一个英语口语练习 Web 应用，用户通过语音与 AI 进行英语对话，AI 的回答使用重返未来1999 中维尔汀（Vertin）的语音合成。前端为 React 网页，后端 Python 负责语音识别、LLM 对话、调用 TTS 服务。

## 架构

```
┌─────────────────────────────────────────────────────────────┐
│  React Web 前端                                              │
│  ┌────────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐ │
│  │ 语音录入    │ │ 对话展示   │ │ 角色设定   │ │ 场景/设置  │ │
│  └──────┬─────┘ └─────┬─────┘ └─────┬─────┘ └─────┬─────┘ │
└─────────┼──────────────┼─────────────┼──────────────┼───────┘
          │  WebSocket / HTTP           │              │
┌─────────┴──────────────┼─────────────┼──────────────┼───────┐
│  Python FastAPI 后端   │             │              │       │
│  ┌──────────┐  ┌──────┴──────┐  ┌───┴─────────┐           │
│  │ /api/stt │  │ /api/chat   │  │ /api/tts    │           │
│  │ Whisper  │  │ DeepSeek    │  │ 调GPT-SoVITS│           │
│  │ GPU:本地 │  │ API:云端    │  │ GPU:本地    │           │
│  └──────────┘  └─────────────┘  └──────┬──────┘           │
└────────────────────────────────────────┼───────────────────┘
                                         │ HTTP
                               ┌─────────┴──────────┐
                               │  GPT-SoVITS API服务  │
                               │   (独立进程)          │
                               │   Vertin 语音模型     │
                               └────────────────────┘
```

## 技术栈

| 层次 | 技术 | 说明 |
|------|------|------|
| 前端 | React 19 + Vite + TypeScript | 现代前端框架 |
| UI | Tailwind CSS + shadcn/ui | 组件库，美观统一 |
| 语音交互 | MediaRecorder API + Web Audio API | 浏览器原生录音与播放 |
| 后端 | Python FastAPI + Uvicorn | 异步 HTTP 服务 |
| STT | faster-whisper (large-v3 或 medium) | 本地 GPU 推理 |
| LLM | DeepSeek Chat API | 对话生成 |
| TTS | GPT-SoVITS API (独立服务, http://localhost:9880) | 加载 Vertin 模型 |

## 对话流程

1. 用户点击录音 → 浏览器通过 MediaRecorder 录制麦克风输入
2. 录音结束 → 音频 blob 发送到后端 `/api/stt`
3. 后端用 faster-whisper 转写为文字
4. 文字发送到 DeepSeek API（带上对话历史 + 人设 system prompt）
5. DeepSeek 返回英文回答
6. 回答文字发送到 GPT-SoVITS API `/tts` 合成 Vertin 语音
7. 音频返回前端播放

## 前端页面

### 1. 聊天主界面
- 对话气泡列表，显示对话历史（用户文字 + AI 文字）
- 底部录音按钮（长按/点击说话）
- AI 回答自动播放语音，带播放/暂停控制
- 输入框（可选打字模式）

### 2. 角色设定面板
- 可编辑 System Prompt 文本框（设置 AI 人设、语气、行为）
- 预设模板：冷淡维尔汀、友好维尔汀、毒舌维尔汀等
- 对话语言/难度设置
- 设置实时生效

### 3. 设置面板
- 对话难度：初级 / 中级 / 高级
- 话题场景：日常对话 / 面试 / 旅游 / 学术讨论 / 自由对话
- DeepSeek API key 配置
- 语音速度/音调调节

### 4. 历史记录
- 历史对话列表
- 可回放、可删除

## 后端 API

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/stt` | POST | 接收音频，返回文字 |
| `/api/chat` | POST | 发送用户文字，返回 AI 文字 |
| `/api/tts` | POST | 发送文字，返回音频 |
| `/api/chat/stream` | WebSocket | 全流程流式对话（录音→文字→回答→语音） |
| `/api/config` | GET/PUT | 读/写配置（人设、难度、场景等） |
| `/api/history` | GET/DELETE | 对话历史管理 |

## 数据流（流式对话 API）

推荐使用 WebSocket `/api/chat/stream` 实现一键对话：
1. 前端流式发送音频 chunk
2. 后端实时 STT，流式返回识别中间结果
3. 识别完整后调 DeepSeek 流式返回文字
4. 文字收齐后调 GPT-SoVITS 合成语音
5. 后端流式返回音频 chunk，前端边收边播

## GPT-SoVITS 部署

- 独立进程，监听 `:9880`
- 使用 GPT-SoVITS v2Pro（当前推荐版本）
- 加载社区训练的 Vertin 语音模型（GTP-SoVITS V4 版本或 B站 UP 主版本）
- 提供参考音频（reference audio）以保持音色一致
- 显存占用约 2-4GB

## 非功能需求

- 对话延迟目标：STT < 1s + LLM < 2s + TTS < 2s = 总计 < 5s
- Whisper 和 GPT-SoVITS 均利用 GPU 推理
- TTS 音频在前端缓存，避免重复合成
- DeepSeek API key 在前端配置，后端透传或直接调用
