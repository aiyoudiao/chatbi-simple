/**
 * Dify工作流客户端
 * 优雅封装的TypeScript客户端，用于调用Dify工作流API
 */

// 基础配置接口
export interface WorkflowConfig {
  apiKey: string;
  inputs?: Record<string, any>;
  responseMode?: "streaming" | "blocking";
  user?: string;
  baseUrl?: string;
  timeout?: number;
}

// 流式响应处理选项
export interface StreamingOptions {
  onChunk?: (chunk: string) => void;
  onComplete?: () => void;
  onError?: (error: Error) => void;
}

// 重试配置
export interface RetryConfig {
  maxRetries?: number;
  retryDelay?: number;
  exponentialBackoff?: boolean;
}

// 批量执行结果
export interface BatchResult {
  successfulResults: Array<{
    config: WorkflowConfig;
    response: Response;
  }>;
  failedResults: Array<{
    config: WorkflowConfig;
    error: Error;
  }>;
  allSucceeded: boolean;
}

// API错误响应接口
export interface ApiErrorResponse {
  detail?: string;
  message?: string;
  error?: string;
  [key: string]: any;
}

/**
 * 工作流客户端类
 */
export class WorkflowClient {
  private readonly defaultConfig: Required<
    Pick<WorkflowConfig, "baseUrl" | "responseMode" | "user" | "timeout">
  >;

  /**
   * 构造函数
   * @param {Partial<WorkflowConfig>} defaultConfig - 默认配置
   */
  constructor(defaultConfig: Partial<WorkflowConfig> = {}) {
    this.defaultConfig = {
      baseUrl: defaultConfig.baseUrl || DIFY_API_URL,
      responseMode: defaultConfig.responseMode || "streaming",
      user: defaultConfig.user || "abc-123",
      timeout: defaultConfig.timeout || 30000,
    };
  }

  /**
   * 运行工作流
   * @param {WorkflowConfig} config - 工作流配置
   * @returns {Promise<Response>} - fetch响应对象
   */
  async runWorkflow(config: WorkflowConfig): Promise<Response> {
    const mergedConfig = {
      ...this.defaultConfig,
      ...config,
    };

    // 输入验证
    if (!mergedConfig.apiKey) {
      throw new Error("API密钥不能为空");
    }

    const url = `${mergedConfig.baseUrl}/v1/workflows/run`;
    const headers: HeadersInit = {
      Authorization: `Bearer ${mergedConfig.apiKey}`,
      "Content-Type": "application/json",
    };

    const body: Record<string, any> = {
      inputs: mergedConfig.inputs || {},
      response_mode: mergedConfig.responseMode,
      user: mergedConfig.user,
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        mergedConfig.timeout
      );

      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
        keepalive: mergedConfig.responseMode === "streaming",
      });

      clearTimeout(timeoutId);

      // 检查HTTP状态码
      if (!response.ok) {
        const errorData = await this.parseErrorResponse(response);
        throw new Error(
          errorData.detail ||
            errorData.message ||
            errorData.error ||
            `请求失败: ${response.status} ${response.statusText}`
        );
      }

      return response;
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === "AbortError") {
          throw new Error(`请求超时（${mergedConfig.timeout}ms）`);
        }
        throw error;
      }
      throw new Error(`未知错误: ${String(error)}`);
    }
  }

  /**
   * 解析错误响应
   * @param {Response} response - 错误响应对象
   * @returns {Promise<ApiErrorResponse>} - 解析后的错误数据
   */
  private async parseErrorResponse(
    response: Response
  ): Promise<ApiErrorResponse> {
    try {
      return await response.json();
    } catch {
      return { detail: await response.text() };
    }
  }

  /**
   * 处理流式响应
   * @param {Response} response - fetch响应对象
   * @param {StreamingOptions} options - 处理选项
   * @returns {Promise<void>}
   */
  async handleStreamingResponse(
    response: Response,
    options: StreamingOptions = {}
  ): Promise<void> {
    const {
      onChunk = (chunk) => console.log("收到数据:", chunk),
      onComplete = () => console.log("流式响应完成"),
      onError = (error) => console.error("流式响应错误:", error),
    } = options;

    try {
      if (!response.body) {
        throw new Error("响应体为空");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          onComplete();
          break;
        }

        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          onChunk(chunk);
        }
      }
    } catch (error) {
      onError(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * 处理JSON响应
   * @param {Response} response - fetch响应对象
   * @returns {Promise<T>} - 解析后的JSON对象
   */
  async handleJsonResponse<T = any>(response: Response): Promise<T> {
    return await response.json();
  }

  /**
   * 批量执行工作流
   * @param {WorkflowConfig[]} configs - 工作流配置数组
   * @returns {Promise<BatchResult>} - 批量执行结果
   */
  async runWorkflowsInParallel(
    configs: WorkflowConfig[]
  ): Promise<BatchResult> {
    if (configs.length === 0) {
      return {
        successfulResults: [],
        failedResults: [],
        allSucceeded: true,
      };
    }

    const promises = configs.map((config) =>
      this.runWorkflow(config).then((response) => ({ config, response }))
    );

    const results = await Promise.allSettled(promises);

    const successfulResults: BatchResult["successfulResults"] = [];
    const failedResults: BatchResult["failedResults"] = [];

    results.forEach((result, index) => {
      if (result.status === "fulfilled") {
        successfulResults.push(result.value);
      } else {
        failedResults.push({
          config: configs[index],
          error:
            result.reason instanceof Error
              ? result.reason
              : new Error(String(result.reason)),
        });
      }
    });

    return {
      successfulResults,
      failedResults,
      allSucceeded: failedResults.length === 0,
    };
  }

  /**
   * 带重试机制的工作流执行
   * @param {WorkflowConfig} config - 工作流配置
   * @param {RetryConfig} retryConfig - 重试配置
   * @returns {Promise<Response>} - fetch响应对象
   */
  async runWorkflowWithRetry(
    config: WorkflowConfig,
    retryConfig: RetryConfig = {}
  ): Promise<Response> {
    const {
      maxRetries = 3,
      retryDelay = 1000,
      exponentialBackoff = true,
    } = retryConfig;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await this.runWorkflow(config);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // 只有在非最后一次尝试时才重试
        if (attempt < maxRetries - 1) {
          const delay = exponentialBackoff
            ? retryDelay * Math.pow(2, attempt)
            : retryDelay;

          console.warn(`尝试 ${attempt + 1} 失败，${delay}ms 后重试...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    if (lastError) {
      throw lastError;
    }
    throw new Error("重试失败，但未捕获到错误");
  }

  /**
   * 创建请求取消控制器
   * @returns {AbortController} - 取消控制器
   */
  createAbortController(): AbortController {
    return new AbortController();
  }
}

// 导出默认客户端实例
export const workflowClient = new WorkflowClient({
  timeout: 60000,
});

// 查询核心工作流数据
export const queryCoreData = async (query: string) => {
  const jsonResponse = await workflowClient.runWorkflow({
    apiKey: DIFY_API_KEY,
    inputs: {
      query,
    },
    responseMode: "blocking",
    user: "user-001",
  });

  console.debug("queryCoreData: ", jsonResponse);
  return jsonResponse;
};

// 使用示例
export async function workflowExample(): Promise<void> {
  const client = new WorkflowClient({
    baseUrl: DIFY_API_URL,
    timeout: 60000,
  });

  try {
    // 1. 流式响应示例
    console.log("开始流式响应示例...");
    const streamResponse = await client.runWorkflow({
      apiKey: "your-api-key-here",
      inputs: {
        /* 输入参数 */
      },
      responseMode: "streaming",
      user: "user-001",
    });

    await client.handleStreamingResponse(streamResponse, {
      onChunk: (chunk) => {
        console.log("数据块:", chunk);
        // 处理每个数据块
      },
      onComplete: () => {
        console.log("流式响应完成");
      },
    });

    // 2. JSON响应示例
    console.log("\n开始JSON响应示例...");
    const jsonResponse = await client.runWorkflow({
      apiKey: "your-api-key-here",
      inputs: {
        /* 输入参数 */
      },
      responseMode: "blocking",
      user: "user-001",
    });

    const result = await client.handleJsonResponse(jsonResponse);
    console.log("JSON结果:", result);

    // 3. 批量执行示例
    console.log("\n开始批量执行示例...");
    const batchResult = await client.runWorkflowsInParallel([
      {
        apiKey: "your-api-key-here",
        inputs: { workflow: "workflow-1" },
        user: "user-001",
      },
      {
        apiKey: "your-api-key-here",
        inputs: { workflow: "workflow-2" },
        user: "user-002",
      },
    ]);

    console.log("批量执行成功数:", batchResult.successfulResults.length);
    console.log("批量执行失败数:", batchResult.failedResults.length);

    // 4. 带重试的执行
    console.log("\n开始重试机制示例...");
    const retryResponse = await client.runWorkflowWithRetry(
      {
        apiKey: "your-api-key-here",
        inputs: {
          /* 输入参数 */
        },
      },
      {
        maxRetries: 5,
        retryDelay: 2000,
        exponentialBackoff: true,
      }
    );

    const retryResult = await client.handleJsonResponse(retryResponse);
    console.log("重试执行结果:", retryResult);
  } catch (error) {
    console.error("执行失败:", error);
  }
}

// 如果直接运行此文件
if (require.main === module) {
  workflowExample().catch(console.error);
}
