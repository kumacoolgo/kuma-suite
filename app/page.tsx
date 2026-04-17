'use client';

export default function HomePage() {
  return (
    <div className="page stack" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="panel" style={{ maxWidth: 600 }}>
        <div className="panel-head">
          <h2>Kuma Suite</h2>
        </div>
        <div className="panel-body stack">
          <div className="card">
            <div className="badge green">欢迎</div>
            <div>这是一个集成工具套件，包含游戏测试记录、费用时间轴、文本板、密码库等功能。</div>
          </div>
          <div className="card">
            <div className="badge blue">快速导航</div>
            <div className="stack" style={{ gap: 8 }}>
              <a href="/tracker" className="btn">游戏测试记录</a>
              <a href="/timeline" className="btn">费用时间轴</a>
              <a href="/board" className="btn">文本板</a>
              <a href="/vault" className="btn">密码库</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
