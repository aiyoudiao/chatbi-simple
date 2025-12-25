import { useEffect } from "react";
import { useModel, history } from "@umijs/max";
import { authingClient } from "@/utils/auth";

export default function Callback() {
  const { setInitialState } = useModel("@@initialState");

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // 处理登录回调
        const token = await authingClient.handleRedirectCallback();

        if (token) {
          const { parsedIdToken: userInfo = {} } = token || {};
          localStorage.setItem("authing_token", JSON.stringify(token));
          localStorage.setItem("authing_user", JSON.stringify(userInfo));

          console.log("登录成功，token 信息:", token);
          console.log("登录成功，用户信息:", userInfo);

          setInitialState((s) => ({
            ...s,
            currentUser: {
              name: userInfo.name,
              avatar: userInfo.picture,
              userid: userInfo.aud,
              email: userInfo.email,
              ...userInfo,
            },
          }));
          history.push("/");
        }
      } catch (error: any) {
        console.error("登录回调处理失败:", error);
        history.push("/auth/login?error=" + encodeURIComponent(error.message));
      }
    };

    handleCallback();
  }, []);

  return (
    <div className="cs-flex cs-items-center cs-justify-center cs-min-h-screen cs-bg-gray-100">
      <div className="cs-text-center">
        <div className="cs-animate-spin cs-rounded-full cs-h-12 cs-w-12 cs-border-b-4 cs-border-blue-600 cs-mx-auto cs-mb-4"></div>
        <p className="cs-text-lg cs-text-gray-700">正在处理登录，请稍候...</p>
      </div>
    </div>
  );
}
