import { ChatService } from "@/services/chat";
import { logger } from "@/utils/logger";
import {
  Bubble,
  BubbleProps,
  Prompts,
  useXAgent,
  useXChat,
} from "@ant-design/x";
import { useEffect, useState } from "react";
import useChatStore from "@/store/chat";
import { type GetProp, Space, Spin, Table } from "antd";
import MarkdownBase from "@/components/MarkdownView/MarkdownBase";
import { UserOutlined } from "@ant-design/icons";
import AvaAdvisor from "@/components/AvaAdvisor/AvaAdvisor";

import carsData from "@/constants/cars.json";
import studentsData from "@/constants/students.json";
import { queryCoreData } from "@/services/dify";

type BubbleRoles = GetProp<typeof Bubble.List, "roles">;
type MessageRender = BubbleProps<Chat.IChatMessage>["messageRender"];
type BubbleItem = BubbleProps<Chat.IChatMessage> & {
  key?: string | number;
  role?: string;
};

const log = logger.extend("copilot:useChat").debug;

const renderMarkdown: MessageRender = (message: Chat.IChatMessage) => {
  return <MarkdownBase content={message.content} />;
};

const renderTable: MessageRender = (message: Chat.IChatMessage) => {
  log("renderTable", message);
  if (!message.data) return "Can't render table without data";

  const dataSource = message.data as Chat.IDataRow[];
  const keys = dataSource.length ? Object.keys(dataSource[0]) : [];
  const columns = keys.map((key) => ({
    title: key,
    dataIndex: key,
  }));
  return <Table dataSource={dataSource} columns={columns} />;
};

const renderAva = (message: Chat.IChatMessage) => {
  log("renderAva", message);
  if (!message.data) return "Can't render Ava without data";
  return <AvaAdvisor data={message.data ?? []} />;
};

const useChat = () => {
  const roles: BubbleRoles = {
    assistant: {
      placement: "start",
      avatar: { icon: <UserOutlined />, style: { background: "#fde3cf" } },

      typing: { step: 5, interval: 20 },
      styles: {
        content: {
          borderRadius: 16,
        },
      },
      loadingRender: () => (
        <Space>
          <Spin size="small" />
          Thinking
        </Space>
      ),
    },
    user: {
      placement: "end",
      variant: "shadow",
      avatar: { icon: <UserOutlined />, style: { background: "#87d068" } },
    },
  };
  const chatStore = useChatStore();
  // const messages = useChatStore((state) => state.messages);
  const prompt = useChatStore((state) => state.prompt);
  const setPrompt = useChatStore((state) => state.setPrompt);
  const [loading, setLoading] = useState(false);
  const [sql, setSql] = useState("");

  const [id, setId] = useState("");
  const [isVisualizing, setIsVisualizing] = useState(false);
  const [isCanVisualize, setIsCanVisualize] = useState(false);
  const [tableData, setTableData] = useState<Chat.IDataRow>([]);
  const [bubbleItems, setBubbleItems] = useState<BubbleItem[]>([]);

  const [isGeneratingThinking, setIsGeneratingThinking] = useState(false);
  const [processingStage, setProcessingStage] =
    useState<ProcessingStage>("complete");

  // 新增：思维链相关状态
  const [thinkingChain, setThinkingChain] = useState<ThinkingStep[]>([]);

  async function chat(
    message: Chat.IChatMessage,
    onSuccess: (msg: Chat.IChatMessage) => void
  ) {
    log("message", message);
    const res = await ChatService.chat(message.content);
    log("sendChat", res);

    let newMsg = "" as unknown;
    let flag = false;
    const msgId = crypto.randomUUID();
    // 消息 1
    // newMsg = 'Sorry, I have no idea';
    let messageContent = {
      role: "assistant",
      content: newMsg,
    } as Chat.IChatMessage;
    // onSuccess(messageContent);
    // addMessage({
    //   id: msgId,
    //   message: messageContent,
    //   status: 'success',
    // });

    setId(msgId);

    setIsCanVisualize(true);

    // 消息 2
    let newTableData = [] as any;
    if (DIFY_API_URL && DIFY_API_KEY) {
      const data = await (await queryCoreData(message.content)).json();
      console.debug("data => ", data);
      newTableData = data.data.outputs.data[0]?.result;
    } else {
      newTableData = carsData.dataSource as any;
      // const newTableData = studentsData.dataSource as any;
    }
    log("newTableData", newTableData);
    setTableData(newTableData);

    messageContent = {
      role: "assistant",
      content: "Here is the table data",
      type: "table",
      data: newTableData,
    } as Chat.IChatMessage;

    // add table message
    addMessage({
      id: id,
      message: messageContent,
      status: "success",
    });
    onSuccess(messageContent);

    // 消息 3 生成可视化图表

    generateVisualization(newTableData || [], onSuccess);

    setProcessingStage("complete");
    setIsGeneratingThinking(false);
  }

  async function generateVisualization(
    data: Chat.IDataRow,
    onSuccess: (msg: Chat.IChatMessage) => void
  ) {
    // TODO: use api to generate visualization
    const messageContent = {
      role: "assistant",
      content: "Here is the visualization",
      type: "ava",
      data: data,
    } as Chat.IChatMessage;

    // add viz message
    addMessage({
      id: id,
      message: messageContent,
      status: "success",
    });

    onSuccess(messageContent);
  }

  const [agent] = useXAgent<Chat.IChatMessage>({
    request: async ({ message }, { onSuccess }) => {
      if (!message) return;
      await chat(message, onSuccess);
    },
  });

  useEffect(() => {
    setLoading(agent.isRequesting());
  }, [agent]);

  const { onRequest, messages, setMessages } = useXChat({
    agent,
  });

  function updateMessages() {
    setMessages(chatStore.messages);
  }

  useEffect(() => {
    log("Init Messages", chatStore.messages);
    updateMessages();
  }, []);

  useEffect(() => {
    const newItems = chatStore.messages.map(
      ({ id, message, status }, index) => {
        log("message", message);
        let render = renderMarkdown;
        if (message.type === "table") {
          render = renderTable;
        }
        if (message.type === "ava") {
          render = renderAva;
        }
        return {
          key: `${id}-${index}`,
          loading: status === "loading",
          role: message.role,
          content: message,
          messageRender: render,
        };
      }
    );
    setBubbleItems(newItems);
  }, [chatStore.messages]);

  const addMessage = (newStoreMessage: Chat.IMessage) => {
    chatStore.addMessage([newStoreMessage]);
  };

  // ==================== Event ====================
  const onSubmit = (nextContent: string, callback?) => {
    if (!nextContent) return;
    onRequest({
      role: "user",
      content: nextContent,
    });
    setPrompt("");

    // add message to store
    addMessage({
      id: id,
      message: {
        role: "user",
        content: nextContent,
      },
      status: "success",
    });

    callback && callback();
  };

  const clearMessages = () => {
    chatStore.clearMessages();

    setMessages([]);
  };

  const onPromptsItemClick: GetProp<typeof Prompts, "onItemClick"> = (info) => {
    mockThinkingStep()
    onSubmit(info.data.description as string);
  };

  const mockThinkingStep = () => {
    setProcessingStage("sending");
    setIsGeneratingThinking(true);
    setThinkingChain([]);

    const mockThinkingSteps = [
      "理解用户问题：分析用户需要查询的时间范围和数据类型",
      "确定数据来源：连接到订单数据库",
      "执行数据查询：提取指定时间范围内的订单数据",
      "数据处理：计算趋势指标，识别异常值",
      "可视化准备：生成趋势图表",
      "结果总结：准备自然语言解释",
    ];

    // 逐步添加思维步骤，模拟AI思考过程
    let stepIndex = 0;
    const interval = setInterval(() => {
      if (stepIndex < mockThinkingSteps.length) {
        setThinkingChain((prev) => [
          ...prev,
          {
            id: `step-${Date.now()}-${stepIndex}`,
            content: mockThinkingSteps[stepIndex],
            timestamp: Date.now(),
          },
        ]);
        stepIndex++;

        // 更新处理阶段
        if (stepIndex === 1) {
          setProcessingStage("thinking");
        } else if (stepIndex === mockThinkingSteps.length - 1) {
          setProcessingStage("generating");
        }
      } else {
        clearInterval(interval);
      }
    }, 500); // 每个思考步骤间隔800ms
  };

  return {
    loading,
    agent,
    roles,
    messages,
    prompt,
    setPrompt,
    bubbleItems,

    onSubmit,
    clearMessages,

    onPromptsItemClick,

    isGeneratingThinking,
    setIsGeneratingThinking,
    processingStage,
    setProcessingStage,
    thinkingChain,
    setThinkingChain,
    mockThinkingStep
  };
};

export default useChat;
