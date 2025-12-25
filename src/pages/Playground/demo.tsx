import {
  Attachments,
  Bubble,
  BubbleProps,
  Conversations,
  Prompts,
  Sender,
  Welcome,
  useXAgent,
  useXChat,
} from "@ant-design/x";
import { createStyles } from "antd-style";
import React, {
  useEffect,
  useMemo,
  useState,
  useRef,
  useCallback,
} from "react";

import {
  CloudUploadOutlined,
  CommentOutlined,
  EllipsisOutlined,
  FireOutlined,
  HeartOutlined,
  PaperClipOutlined,
  PlusOutlined,
  ReadOutlined,
  ShareAltOutlined,
  SmileOutlined,
  UserOutlined,
  LoadingOutlined,
  ClockCircleOutlined,
  CodeOutlined,
  LineChartOutlined,
} from "@ant-design/icons";
import {
  Affix,
  Badge,
  Button,
  type GetProp,
  Space,
  Spin,
  Table,
  Typography,
  message,
  Progress,
} from "antd";
import markdownit from "markdown-it";

import useChat from "@/hooks/useChat";
import { logger } from "@/utils/logger";
import { useIdleCallback } from "@/hooks/useIdleCallback";

const log = logger.extend("copilot:playground");
// const log = logger;

/**
 * 思维链步骤接口定义
 * 用于存储AI分析过程中的每一步思考内容
 */
interface ThinkingStep {
  id: string;
  content: string;
  timestamp: number;
}

/**
 * 处理阶段类型定义
 * 标识当前AI处理请求的不同阶段
 */
type ProcessingStage = "sending" | "thinking" | "generating" | "complete";

/**
 * 思维链组件 - 展示AI分析思路
 * 在等待后端响应时，显示AI的思考过程，提升用户体验
 */
const ThinkingChain: React.FC<{
  steps: ThinkingStep[];
  isVisible: boolean;
  stage: ProcessingStage;
}> = ({ steps, isVisible, stage }) => {
  if (!isVisible) return null;

  // 获取当前阶段的描述和图标
  const getStageInfo = () => {
    switch (stage) {
      case "sending":
        return { text: "正在发送请求...", icon: <LoadingOutlined /> };
      case "thinking":
        return { text: "正在分析问题...", icon: <ClockCircleOutlined /> };
      case "generating":
        return { text: "正在生成答案...", icon: <CodeOutlined /> };
      default:
        return { text: "处理中...", icon: <LoadingOutlined /> };
    }
  };

  const stageInfo = getStageInfo();

  return (
    <div className="cs-bg-blue-50 cs-rounded-lg cs-p-4 cs-mb-4 cs-border cs-border-blue-100 cs-animate-fadeIn cs-mt-2">
      <div className="cs-flex cs-items-center cs-mb-3 cs-text-blue-600">
        <Spin size="small" indicator={stageInfo.icon} className="cs-mr-2" />
        <span className="cs-font-medium">{stageInfo.text}</span>
      </div>

      {steps.length > 0 && (
        <div className="cs-space-y-2 cs-pl-6">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className="cs-flex cs-items-start cs-animate-slideIn"
              style={{ animationDelay: `${index * 0.2}s` }}
            >
              <div className="cs-bg-blue-100 cs-text-blue-700 cs-rounded-full cs-w-5 cs-h-5 cs-flex cs-items-center cs-justify-center cs-text-xs cs-mr-2 cs-mt-0.5">
                {index + 1}
              </div>
              <p className="cs-text-gray-700 cs-text-sm">{step.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * 进度指示器组件
 * 显示当前处理进度，提供视觉反馈
 */
const ProcessingProgress: React.FC<{ stage: ProcessingStage }> = ({
  stage,
}) => {
  // 根据阶段设置进度百分比
  const getProgressPercent = () => {
    switch (stage) {
      case "sending":
        return 25;
      case "thinking":
        return 50;
      case "generating":
        return 75;
      case "complete":
        return 100;
      default:
        return 0;
    }
  };

  if (stage === "complete") return null;

  return (
    <div className="mb-4">
      <Progress
        percent={getProgressPercent()}
        strokeColor="#1677ff"
        showInfo={false}
        className="animate-pulse"
      />
    </div>
  );
};

/**
 * 样式定义
 * 使用antd-style创建组件样式
 */
const useStyle = createStyles(({ token, css }) => {
  return {
    layout: css`
      width: 100%;
      min-height: 100%;
      height: 100%;
      border-radius: ${token.borderRadius}px;
      display: flex;
      flex-direction: column;
      background: ${token.colorBgContainer};
      font-family: AlibabaPuHuiTi, ${token.fontFamily}, sans-serif;

      .ant-prompts {
        color: ${token.colorText};
      }
    `,
    menu: css`
      background: ${token.colorBgLayout}80;
      width: 280px;
      height: 100%;
      display: flex;
      flex-direction: column;
    `,
    conversations: css`
      padding: 0 12px;
      flex: 1;
      overflow-y: auto;
    `,
    chat: css`
      height: 100%;
      width: 100%;
      overflow-y: auto;
      margin: 0 auto;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      padding: ${token.paddingLG}px;
      gap: 16px;
      padding-bottom: 100px;
      scrollbar-width: 'thin',
      scrollbar-gutter: 'stable',
    `,
    messages: css`
      flex: 1;

      p {
       margin-bottom: 0;
      }
    `,
    placeholder: css`
      padding-top: 32px;
    `,
    sender: css`
      box-shadow: ${token.boxShadow};
    `,
    addBtn: css`
      background: #1677ff0f;
      border: 1px solid #1677ff34;
      width: calc(100% - 24px);
      margin: 0 12px 24px 12px;
    `,
    // 新增动画样式
    fadeIn: css`
      animation: fadeIn 0.3s ease-in-out;
      @keyframes fadeIn {
        from {
          opacity: 0;
          transform: translateY(-10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
    `,
    slideIn: css`
      animation: slideIn 0.3s ease-out;
      @keyframes slideIn {
        from {
          opacity: 0;
          transform: translateX(-10px);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }
    `,
  };
});

/**
 * Chat BI 主界面组件
 * 提供自然语言数据分析交互界面，支持思维链展示和文件上传
 */
const Playground: React.FC = () => {
  // 从自定义Hook获取聊天相关状态和方法
  const {
    loading,
    onPromptsItemClick,
    onSubmit,
    clearMessages,
    roles,
    prompt,
    setPrompt,
    bubbleItems,

    isGeneratingThinking,
    setIsGeneratingThinking,
    processingStage,
    setProcessingStage,
    thinkingChain, setThinkingChain,
    mockThinkingStep
  } = useChat();

  // 预设提示问题列表
  const prompts = [
    "查询 7 天订单趋势",
    "查询 30 天订单趋势",
    "查询 10 个月订单趋势",
    "查询 1 年订单趋势",
  ];

  // 样式
  const { styles } = useStyle();

  // 生成发送者提示项
  const senderPromptsItems = useMemo(
    () =>
      prompts.map((description, index) => ({
        key: `${index}`,
        description,
        icon: <FireOutlined style={{ color: "#FF4D4F" }} />,
      })),
    [prompts]
  );

  // ==================== 状态管理 ====================
  const [headerOpen, setHeaderOpen] = React.useState(false);
  const [attachedFiles, setAttachedFiles] = React.useState<
    GetProp<typeof Attachments, "items">
  >([]);


  // 容器引用，用于滚动控制
  const [container, setContainer] = React.useState<HTMLDivElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  /**
   * 文件上传处理函数
   * 处理文件上传状态变化，显示成功提示
   */
  const handleFileChange: GetProp<typeof Attachments, "onChange"> = (info) => {
    setAttachedFiles(info.fileList);
    // 如果上传了文件，可以在这里添加额外的处理逻辑
    if (info.fileList.length > 0 && info.file.status === "done") {
      message.success(`文件 ${info.file.name} 上传成功`);
    }
  };

  // 附件节点
  const attachmentsNode = (
    <Badge dot={attachedFiles.length > 0 && !headerOpen}>
      <Button
        type="text"
        icon={<PaperClipOutlined />}
        onClick={() => setHeaderOpen(!headerOpen)}
        title="上传文件"
      />
    </Badge>
  );

  // 发送者头部（文件上传区域）
  const senderHeader = (
    <Sender.Header
      title="附件"
      open={headerOpen}
      onOpenChange={setHeaderOpen}
      styles={{
        content: {
          padding: 0,
        },
      }}
    >
      <Attachments
        beforeUpload={() => false}
        items={attachedFiles}
        onChange={handleFileChange}
        placeholder={(type) =>
          type === "drop"
            ? { title: "拖放文件到此处" }
            : {
                icon: <CloudUploadOutlined />,
                title: "上传文件",
                description: "点击或拖拽文件到此区域以上传",
              }
        }
      />
    </Sender.Header>
  );

  /**
   * 增强的提交处理函数
   * 添加思维链生成和多阶段状态管理
   */
  const handleSubmit = async (value: string) => {
    if (!value.trim()) return;
    try {
      // 1. 设置初始阶段为发送中
      // 2. 模拟思维链生成过程
      mockThinkingStep();

      // 3. 调用原始提交函数
      await onSubmit(value);

      // 清空附件
      if (attachedFiles.length > 0) {
        setAttachedFiles([]);
      }
    } catch (error) {
      log.error("提交消息失败:", error);
      message.error("提交失败，请重试");
      setProcessingStage("complete");
      setIsGeneratingThinking(false);
    }
  };

  /**
   * 自动滚动到最新消息
   */
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // 当消息列表或思维链更新时，滚动到底部
  useEffect(() => {
    scrollToBottom();
  }, [bubbleItems, thinkingChain, scrollToBottom]);

  // 使用空闲回调优化滚动性能
  useIdleCallback(() => {
    if (container) {
      const scroll = container.querySelector("#chatbi-messages");
      if (scroll) {
        scroll.scrollTo({
          top: scroll.scrollHeight,
          behavior: "smooth",
        });
      }
    }
  }, [container, bubbleItems, thinkingChain]);

  return (
    <div className={styles.layout} ref={setContainer}>
      <div id="chatbi-messages" className={styles.chat}>
        <div className={styles.messages}>
          {/* 欢迎信息 - 仅在没有消息时显示 */}
          {bubbleItems.length === 0 && !loading && (
            <div className="cs-text-center cs-py-12">
              <div className="cs-mb-4 cs-text-gray-400">
                <LineChartOutlined style={{ fontSize: "48px" }} />
              </div>
              <h3 className="cs-text-xl cs-font-medium cs-mb-2">
                欢迎使用 Chat BI S
              </h3>
              <p className="cs-text-gray-500 cs-max-w-lg cs-mx-auto">
                通过自然语言查询分析您的数据。上传文件或选择预设问题开始探索数据洞察。
              </p>
            </div>
          )}

          {/* 消息列表 */}
          {bubbleItems.length > 0 && (
            <Bubble.List
              autoScroll={true}
              items={bubbleItems}
              roles={roles}
              className={styles.messages}
            />
          )}

          {/* 思维链展示 - 仅在生成中显示 */}
          <ThinkingChain
            steps={thinkingChain}
            isVisible={isGeneratingThinking}
            stage={processingStage}
          />

          {/* 进度指示器 */}
          <ProcessingProgress stage={processingStage} />

          {/* 滚动锚点 */}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <Affix offsetBottom={10} target={() => container} style={{ flex: 1 }}>
        <div className="cs-p-2 cs-flex cs-flex-col cs-gap-2 cs-bg-white">
          {/* 预设提示问题 */}
          <Prompts
            items={senderPromptsItems}
            onItemClick={onPromptsItemClick}
          />

          {/* 操作按钮区域 */}
          <div className="cs-flex cs-justify-between cs-items-center">
            <Button
              onClick={clearMessages}
              size="small"
              danger={bubbleItems.length > 0}
            >
              清除历史记录
            </Button>

            {attachedFiles.length > 0 && (
              <div className="cs-text-sm cs-text-gray-500">
                已上传 {attachedFiles.length} 个文件
              </div>
            )}
          </div>

          {/* 消息发送区域 */}
          <Sender
            value={prompt}
            header={senderHeader}
            onSubmit={handleSubmit}
            onChange={setPrompt}
            prefix={attachmentsNode}
            loading={loading || isGeneratingThinking}
            className={styles.sender}
            placeholder={
              loading || isGeneratingThinking
                ? "AI正在思考中..."
                : "输入您的问题..."
            }
          />
        </div>
      </Affix>
    </div>
  );
};

export default Playground;
