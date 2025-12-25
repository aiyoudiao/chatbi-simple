import React, { useEffect, useState } from "react";
import { history, useModel } from "@umijs/max";
import {
  authingClient,
  checkTokenValid,
  getCurrentUser,
  handleLogout,
  isWithWhiteList,
} from "@/utils/auth";

export default function Login() {
  const { initialState, setInitialState } = useModel("@@initialState");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    setLoading(true);
    setError("");

    try {
      // 跳转到Authing登录页
      await authingClient.loginWithRedirect();
    } catch (error: any) {
      setError(error.message || "登录失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  const reLogin = async () => {
    const loggedIn = await checkTokenValid();
    const pathname = window.location.pathname;

    if (!loggedIn) {
      // ⚠️ 如果当前就是回调页，不要再跳
      setTimeout(() => authingClient.loginWithRedirect(), 1000);
    } else {

      // 如果登录成功，跳转到之前访问的页面
      if (!initialState?.currentUser || Object.keys(initialState?.currentUser).length === 0) {
        const currentUser = await getCurrentUser()
        setInitialState( state => ({
          ...state,
          currentUser,
        }));
      }

      if (isWithWhiteList(pathname)) {
        history.push("/");
      }
    }
  };

  useEffect(() => {
    reLogin();
  }, []);

  return (
    <div className="cs-p-8 cs-max-w-md cs-mx-auto">
      <h1 className="cs-text-2xl cs-font-bold cs-mb-6 cs-text-center">
        用户登录
      </h1>

      {error && (
        <div className="cs-bg-red-100 cs-text-red-700 cs-p-4 cs-rounded cs-mb-4">
          {error}
        </div>
      )}

      <button
        onClick={handleLogin}
        disabled={loading}
        className="cs-w-full cs-bg-blue-600 cs-text-white cs-py-3 cs-px-4 cs-rounded-lg hover:cs-bg-blue-700 cs-transition-colors disabled:cs-bg-gray-400"
      >
        {loading ? "登录中..." : "使用Authing登录"}
      </button>

      <button
        onClick={handleLogout}
        className="cs-w-full cs-mt-4 cs-bg-gray-600 cs-text-white cs-py-3 cs-px-4 cs-rounded-lg hover:cs-bg-gray-700 cs-transition-colors"
      >
        退出登录
      </button>
    </div>
  );
}
