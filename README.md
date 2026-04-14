# Kuma Suite

## Zeabur 部署

1. 在 Zeabur 新建项目，先添加 PostgreSQL 服务。
2. 再添加 Web Service，选择本仓库的 GHCR 镜像：
   `ghcr.io/kumacoolgo/kuma-suite:latest`
3. 容器端口填写 `3000`。
4. 设置环境变量：

| 变量 | 说明 |
|------|------|
| `DATABASE_URL` | PostgreSQL 连接串 |
| `ADMIN_USERNAME` | 浏览器 Basic Auth 用户名 |
| `ADMIN_PASSWORD` | 浏览器 Basic Auth 密码 |
| `VAULT_SECRET` | 密码库加密密钥（可选，但建议设置） |

5. 先部署一次，再用实际域名检查访问是否正常。
6. 以后只需要更新镜像并重新部署这一个 Web Service。
