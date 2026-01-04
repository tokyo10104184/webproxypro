'use client';
import { useState, useRef } from 'react';

export default function Home() {
  const [inputUrl, setInputUrl] = useState('');
  const [proxyUrl, setProxyUrl] = useState('');
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const handleGo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputUrl) return;
    
    // URLの正規化 (httpがない場合など)
    let target = inputUrl;
    if (!target.startsWith('http')) {
      target = 'https://' + target;
    }

    // API経由でアクセスするためのURLを生成
    // タイムスタンプをつけてキャッシュを防ぐ
    const apiUrl = `/api/proxy?url=${encodeURIComponent(target)}&t=${Date.now()}`;
    setProxyUrl(apiUrl);
  };

  const handleEmergency = () => {
    // 緊急脱出ボタン: 一瞬で無害なページへ
    setProxyUrl('');
    setInputUrl('');
    window.location.href = 'https://www.google.com'; 
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', fontFamily: 'monospace' }}>
      {/* --- Control Bar --- */}
      <div style={{ 
        padding: '10px', 
        background: '#111', 
        borderBottom: '1px solid #333', 
        display: 'flex', 
        gap: '10px',
        alignItems: 'center'
      }}>
        <div style={{ fontWeight: 'bold', color: '#0f0' }}>👻 GhostFrame</div>
        
        <form onSubmit={handleGo} style={{ flex: 1, display: 'flex', gap: '5px' }}>
          <input 
            type="text" 
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            placeholder="Enter URL (e.g., example.com)"
            style={{ 
              flex: 1, 
              padding: '8px', 
              background: '#222', 
              border: '1px solid #444', 
              color: '#fff',
              borderRadius: '4px',
              outline: 'none'
            }}
          />
          <button type="submit" style={{ cursor: 'pointer', background: '#333', color: '#fff', border: 'none', padding: '0 15px', borderRadius: '4px' }}>
            Go
          </button>
        </form>

        <button 
          onClick={handleEmergency}
          style={{ 
            background: '#d00', 
            color: '#fff', 
            border: 'none', 
            padding: '8px 12px', 
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}>
          EXIT
        </button>
      </div>

      {/* --- Viewport (Iframe) --- */}
      <div style={{ flex: 1, position: 'relative', background: '#fff' }}>
        {proxyUrl ? (
          <iframe 
            ref={iframeRef}
            src={proxyUrl}
            style={{ width: '100%', height: '100%', border: 'none' }}
            sandbox="allow-scripts allow-same-origin allow-forms"
          />
        ) : (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#333' }}>
            Ready to vanish.
          </div>
        )}
      </div>
    </div>
  );
}
