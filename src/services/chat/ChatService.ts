import type { components } from "../api-schema";
import { request } from "@umijs/max";

export async function chat(question: string, options?: { [key: string]: any }) {
  // const {
  //   data, // only present if 2XX response
  //   error, // only present if 4XX or 5XX response
  // } = await request("/api/v1/chat", {
  //   method: "POST",
  //   headers: {
  //     "Content-Type": "application/json",
  //   },
  //   data: {
  //     question,
  //   },
  // ...(options || {}),
  // });

  // if (error) {
  //   throw error;
  // }

  // return data as components["schemas"]["CommonResponse"];
  return {};
}
