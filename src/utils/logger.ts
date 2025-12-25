// import debug from 'debug';

// const logger = debug('ChatBI');

// export { logger };

/**
 * 日志工具
 * 提供应用内日志记录功能
 */

// 日志级别类型
type LogLevel = "debug" | "info" | "warn" | "error";

// 日志记录器接口
interface Logger {
  debug: (...args: any[]) => void;
  info: (...args: any[]) => void;
  warn: (...args: any[]) => void;
  error: (...args: any[]) => void;
  extend: (namespace: string) => Logger;
}

/**
 * 创建日志记录器
 * @param namespace 日志命名空间
 * @returns 日志记录器实例
 */
const createLogger = (namespace: string = "app"): Logger => {
  // 基础日志函数
  const log = (level: LogLevel, ...args: any[]) => {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}] [${namespace}]`;

    // 根据环境决定是否打印日志
    if (process.env.NODE_ENV === "development") {
      switch (level) {
        case "debug":
          console.debug(prefix, ...args);
          break;
        case "info":
          console.info(prefix, ...args);
          break;
        case "warn":
          console.warn(prefix, ...args);
          break;
        case "error":
          console.error(prefix, ...args);
          break;
      }
    }

    // 在生产环境中，只记录错误和警告
    else if (level === "error" || level === "warn") {
      console[level](prefix, ...args);
    }
  };

  return {
    debug: (...args: any[]) => log("debug", ...args),
    info: (...args: any[]) => log("info", ...args),
    warn: (...args: any[]) => log("warn", ...args),
    error: (...args: any[]) => log("error", ...args),
    extend: (subNamespace: string) =>
      createLogger(`${namespace}:${subNamespace}`),
  };
};

// 导出根日志记录器
export const logger = createLogger();
