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
} from '@ant-design/x';
import { createStyles } from 'antd-style';
import React, { useEffect, useMemo, useState } from 'react';

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
} from '@ant-design/icons';
import {
  Affix,
  Badge,
  Button,
  type GetProp,
  Space,
  Spin,
  Table,
  Typography,
} from 'antd';
import markdownit from 'markdown-it';

import useChat from '@/hooks/useChat';
import { logger } from '@/utils/logger';
import { useIdleCallback } from '@/hooks/useIdleCallback';

const log = logger.extend('copilot:playground');

const useStyle = createStyles(({ token, css }) => {
  return {
    layout: css`
      width: 100%;
      // min-width: 1000px;
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
  };
});

const Playground: React.FC = () => {
  const {
    loading,
    onPromptsItemClick,
    onSubmit,
    clearMessages,
    roles,
    prompt,
    setPrompt,

    bubbleItems,
  } = useChat();
  const prompts = [
    '查询 7 天订单趋势',
    '查询 30 天订单趋势',
    '查询 10 个月订单趋势',
    '查询 1 年订单趋势',
  ];
  // ==================== Style ====================
  const { styles } = useStyle();

  const senderPromptsItems = useMemo(
    () =>
      prompts.map((description, index) => ({
        key: `${index}`,
        description,
        icon: <FireOutlined style={{ color: '#FF4D4F' }} />,
      })),
    [prompts],
  );

  // ==================== State ====================
  const [headerOpen, setHeaderOpen] = React.useState(false);

  const [attachedFiles, setAttachedFiles] = React.useState<
    GetProp<typeof Attachments, 'items'>
  >([]);

  const handleFileChange: GetProp<typeof Attachments, 'onChange'> = (info) =>
    setAttachedFiles(info.fileList);

  const attachmentsNode = (
    <Badge dot={attachedFiles.length > 0 && !headerOpen}>
      <Button
        type="text"
        icon={<PaperClipOutlined />}
        onClick={() => setHeaderOpen(!headerOpen)}
      />
    </Badge>
  );

  const senderHeader = (
    <Sender.Header
      title="Attachments"
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
          type === 'drop'
            ? { title: 'Drop file here' }
            : {
                icon: <CloudUploadOutlined />,
                title: 'Upload files',
                description: 'Click or drag files to this area to upload',
              }
        }
      />
    </Sender.Header>
  );

  const [container, setContainer] = React.useState<HTMLDivElement | null>(null);


  useIdleCallback(() => {
    if (container) {
      const scroll = container.querySelector('#chatbi-messages')!
      scroll.scrollTo({
        top: 999999,
        behavior: 'smooth',
      })
    }
  }, [container, bubbleItems]);

  return (
    <div className={styles.layout} ref={setContainer}>
      <div id="chatbi-messages" className={styles.chat}>
        <div className={styles.messages}>
          {bubbleItems.length > 0 && (
            <Bubble.List
              autoScroll={true}
              // @ts-ignore
              items={bubbleItems.length > 0 ? bubbleItems : []}
              roles={roles}
              className={styles.messages}
            />
          )}
        </div>
      </div>

      <Affix offsetBottom={10} target={() => container} style={{ flex: 1 }}>
        <div className="cs-p-2 cs-flex cs-flex-col cs-gap-2 cs-bg-white">
          <Prompts
            items={senderPromptsItems}
            onItemClick={onPromptsItemClick}
          />

          <Button onClick={clearMessages}>清除历史记录</Button>

          <Sender
            value={prompt}
            header={senderHeader}
            onSubmit={onSubmit}
            onChange={setPrompt}
            // prefix={attachmentsNode}
            loading={loading}
            className={styles.sender}
          />
        </div>
      </Affix>
    </div>
  );
};

export default Playground;
