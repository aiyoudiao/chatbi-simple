export default [
  {
    path: "/auth",
    layout: false,
    routes: [
      { name: "登录", path: "/auth/login", component: "./Auth/Login/auth" },
      {
        name: "授权回调",
        path: "/auth/callback",
        component: "./Auth/Callback",
      },
    ],
  },
  {
    path: "/home",
    component: "./Home",
    name: "首页",
    wrappers: ["@/wrappers/container"],
    exact: true,
  },
  {
    path: "/playground",
    component: "./Playground",
    name: "演练场",
    wrappers: ["@/wrappers/container"],
    exact: true,
  },
  { path: "/", redirect: "/home" },
  { path: "*", layout: false, component: "./404" },
];
