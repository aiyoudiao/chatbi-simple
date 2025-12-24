export default [
  {
    path: "/user",
    layout: false,
    routes: [{ name: "登录", path: "/user/login", component: "./User/Login" }],
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
