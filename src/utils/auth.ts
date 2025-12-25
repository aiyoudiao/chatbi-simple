import { Authing } from "@authing/web";

// 登录页面
export const loginPath = "/auth/login";

// 白名单
export const WHITE_LIST = ["/auth/callback", loginPath];

export const prefix = REACT_APP_ENV === "dev" ? "" : "/chatbi-simple";

export const isWithWhiteList = (path: string) => {
  return WHITE_LIST.some((whitePath) => path.includes(whitePath));
};

const authingOption = {
  domain: "https://hred4lllc4r7-demo.authing.cn",
  appId: "692ea48a6ea5bafc18dabf3f",
  redirectUri: `${window.location.origin}${prefix}/auth/callback`,
  userPoolId: "692ea4892e466f3f9b341ffc",
};
export const authingClient = new Authing(authingOption);

// 获取当前用户信息
export const getCurrentUser = async () => {
  try {
    let userInfo;
    if (localStorage.getItem("authing_user")) {
      return JSON.parse(localStorage.getItem("authing_user")!);
    } else {
      const user = await authingClient.getUserInfo();
      userInfo = user!.parsedIdToken;
      localStorage.setItem("authing_user", JSON.stringify(userInfo));
    }

    return userInfo || {};
  } catch (error) {
    console.error("获取用户信息失败:", error);
    return {};
  }
};

// 检查token是否有效
export const checkTokenValid = async () => {
  try {
    let token = localStorage.getItem("authing_token");
    if (!token) return false;
    const state = await authingClient.getLoginState({
      // ignoreCache: true,
    });
    if (!state?.accessToken) {
      authingClient.loginWithRedirect();
    }
    return true;
  } catch (error) {
    return false;
  }
};

export const getToken = () => {
  return localStorage.getItem("authing_token");
};

/**
 * 登出
 */
export const handleLogout = async () => {
  try {
    localStorage.removeItem("authing_token");
    localStorage.removeItem("authing_user");
    await authingClient.logoutWithRedirect({
      redirectUri: `${window.location.origin}${loginPath}`,
    });
    // window.location.href = '/';
  } catch (error) {
    console.error("退出登录失败:", error);
  }
};
