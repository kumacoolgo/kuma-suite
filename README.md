# Xiler Suite

## Zeabur 部署

1. 在 Zeabur 创建项目，并添加 PostgreSQL 服务。
2. 添加 Web Service，镜像使用 GHCR：
   `ghcr.io/kumacoolgo/kuma-suite:latest`
3. 容器端口设置为 `3000`。
4. 配置环境变量：

| 变量 | 说明 |
|------|------|
| `SITE_NAME` | 网站名称，默认 `Xiler Suite` |
| `DATABASE_URL` | PostgreSQL 连接串 |
| `DATABASE_SSL` | PostgreSQL 是否启用 SSL，Zeabur 可按连接要求设置 |
| `ADMIN_USERNAME` | Basic Auth 用户名 |
| `ADMIN_PASSWORD` | Basic Auth 密码，必须设置强密码 |
| `VAULT_SECRET` | 密码库加密密钥，必须设置为长随机字符串，部署后不要随意修改 |

tracker 和 timeline 的导入/导出格式都是 CSV。

`.env` 只用于本地开发，不会提交到仓库。
