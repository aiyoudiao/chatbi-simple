/**
 * 使用示例文件
 * 展示如何使用WorkflowClient的各种功能
 */

import { WorkflowClient, workflowClient } from "./index";

// 创建自定义客户端实例
const client = new WorkflowClient({
  baseUrl: DIFY_API_URL,
  timeout: 60000,
  user: "default-user",
});

// 示例1: 基本的流式响应
async function basicStreamingExample() {
  console.log("=== 基本流式响应示例 ===");

  try {
    const response = await client.runWorkflow({
      apiKey: "your-api-key-here",
      inputs: {
        prompt: "请生成一个关于TypeScript的简介",
      },
      responseMode: "streaming",
    });

    await client.handleStreamingResponse(response, {
      onChunk: (chunk) => {
        process.stdout.write(chunk); // 实时输出到控制台
      },
      onComplete: () => {
        console.log("\n✅ 流式响应完成");
      },
    });
  } catch (error) {
    console.error("❌ 流式响应失败:", error);
  }
}

// 示例2: JSON响应
async function jsonResponseExample() {
  console.log("\n=== JSON响应示例 ===");

  try {
    const response = await client.runWorkflow({
      apiKey: "your-api-key-here",
      inputs: {
        prompt: "计算123 + 456",
      },
      responseMode: "blocking",
    });

    const result = await client.handleJsonResponse(response);
    console.log("✅ JSON结果:", JSON.stringify(result, null, 2));
  } catch (error) {
    console.error("❌ JSON响应失败:", error);
  }
}

// 示例3: 批量执行
async function batchExecutionExample() {
  console.log("\n=== 批量执行示例 ===");

  const tasks = [
    {
      apiKey: "your-api-key-here",
      inputs: { prompt: "生成一个JavaScript函数示例" },
      user: "user-001",
    },
    {
      apiKey: "your-api-key-here",
      inputs: { prompt: "解释什么是Promise" },
      user: "user-002",
    },
    {
      apiKey: "your-api-key-here",
      inputs: { prompt: "列出TypeScript的主要特性" },
      user: "user-003",
    },
  ];

  try {
    const result = await client.runWorkflowsInParallel(tasks);

    console.log(`📊 批量执行统计:`);
    console.log(`   ✅ 成功: ${result.successfulResults.length}`);
    console.log(`   ❌ 失败: ${result.failedResults.length}`);

    if (result.failedResults.length > 0) {
      console.log("\n❌ 失败详情:");
      result.failedResults.forEach((failed, index) => {
        console.log(
          `   ${index + 1}. 用户: ${failed.config.user}, 错误: ${
            failed.error.message
          }`
        );
      });
    }
  } catch (error) {
    console.error("❌ 批量执行失败:", error);
  }
}

// 示例4: 重试机制
async function retryMechanismExample() {
  console.log("\n=== 重试机制示例 ===");

  try {
    const response = await client.runWorkflowWithRetry(
      {
        apiKey: "your-api-key-here",
        inputs: {
          prompt: "生成一个复杂的SQL查询示例",
        },
      },
      {
        maxRetries: 3,
        retryDelay: 2000,
        exponentialBackoff: true,
      }
    );

    const result = await client.handleJsonResponse(response);
    console.log("✅ 重试执行成功:", result);
  } catch (error) {
    console.error("❌ 重试执行失败:", error);
  }
}

// 示例5: 使用默认客户端
async function defaultClientExample() {
  console.log("\n=== 默认客户端示例 ===");

  try {
    const response = await workflowClient.runWorkflow({
      apiKey: "your-api-key-here",
      inputs: { prompt: "你好，世界！" },
    });

    await workflowClient.handleStreamingResponse(response, {
      onChunk: (chunk) => console.log("📦 数据块:", chunk.trim()),
      onComplete: () => console.log("✅ 默认客户端示例完成"),
    });
  } catch (error) {
    console.error("❌ 默认客户端示例失败:", error);
  }
}

// 示例6: 错误处理演示
async function errorHandlingExample() {
  console.log("\n=== 错误处理示例 ===");

  try {
    // 故意使用错误的API密钥
    await client.runWorkflow({
      apiKey: "invalid-api-key",
      inputs: { prompt: "这将失败" },
    });
  } catch (error) {
    console.log("✅ 错误处理成功捕获:", error.message);
  }
}

// 运行所有示例
async function runAllExamples() {
  console.log("🚀 开始运行WorkflowClient示例...\n");

  try {
    await basicStreamingExample();
    await jsonResponseExample();
    await batchExecutionExample();
    await retryMechanismExample();
    await defaultClientExample();
    await errorHandlingExample();

    console.log("\n🎉 所有示例运行完成！");
  } catch (error) {
    console.error("💥 示例运行出错:", error);
  }
}

// 导出示例函数
export {
  basicStreamingExample,
  jsonResponseExample,
  batchExecutionExample,
  retryMechanismExample,
  defaultClientExample,
  errorHandlingExample,
  runAllExamples,
};

// 如果直接运行此文件
if (require.main === module) {
  runAllExamples().catch(console.error);
}
