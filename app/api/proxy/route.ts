import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  const urlStr = req.nextUrl.searchParams.get('url');
  
  if (!urlStr) {
    return new NextResponse('URL Parameter is missing', { status: 400 });
  }

  try {
    // ターゲットURLの正規化
    let targetUrl = urlStr;
    if (!targetUrl.startsWith('http')) {
      targetUrl = 'https://' + targetUrl;
    }

    // 1. ターゲットサイトへリクエスト
    const targetRes = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    const contentType = targetRes.headers.get('content-type') || '';
    
    // HTML以外（画像やCSSなど）はそのまま通過させる
    if (!contentType.includes('text/html')) {
      const blob = await targetRes.blob();
      const headers = new Headers(targetRes.headers);
      headers.set('Access-Control-Allow-Origin', '*');
      // CSPなどを削除して表示崩れを防ぐ
      headers.delete('content-security-policy');
      headers.delete('x-frame-options');
      
      return new NextResponse(blob, {
        status: targetRes.status,
        headers: headers,
      });
    }

    // 2. HTMLの場合は「罠」を仕込む
    let html = await targetRes.text();
    const origin = new URL(targetUrl).origin;

    // ベースタグを注入（画像の相対パス対策）
    // 既存のheadがあればそこに追加、なければhtmlの直後に追加
    const baseTag = `<base href="${origin}/">`;
    if (html.includes('<head>')) {
      html = html.replace('<head>', `<head>${baseTag}`);
    } else {
      html = baseTag + html;
    }

    // 3. 最強のスクリプト注入 (ここが重要)
    // ページ内の全クリックと全フォーム送信をジャックして、再びこのプロキシを通すようにする
    const injectionScript = `
      <script>
        (function() {
          console.log('👻 GhostFrame Hook Loaded');
          
          // 現在のプロキシAPIのパス
          const proxyBase = '/api/proxy?url=';

          function wrapUrl(target) {
            if (!target) return '';
            // すでにプロキシ経由なら何もしない
            if (target.includes(proxyBase)) return target;
            
            try {
              // 相対パスを絶対パスに変換 (baseタグのおかげで正確に動く)
              const absolute = new URL(target, document.baseURI).href;
              return proxyBase + encodeURIComponent(absolute);
            } catch (e) {
              return target;
            }
          }

          // Aタグ(リンク)のクリックをジャックする
          document.addEventListener('click', function(e) {
            const link = e.target.closest('a');
            if (link && link.href) {
              e.preventDefault(); // 本来の移動をキャンセル
              const newUrl = wrapUrl(link.getAttribute('href')); // href属性そのものを取得
              window.location.href = newUrl; // プロキシ経由で移動
            }
          });

          // フォーム送信(検索ボタンなど)をジャックする
          document.addEventListener('submit', function(e) {
            e.preventDefault(); // 本来の送信をキャンセル
            const form = e.target;
            const method = (form.method || 'GET').toUpperCase();
            
            // GETリクエスト(Google検索など)の場合
            if (method === 'GET') {
              const action = form.getAttribute('action') || window.location.href;
              const formData = new FormData(form);
              const params = new URLSearchParams(formData);
              
              // actionのURLを解決
              let actionUrl;
              try {
                 actionUrl = new URL(action, document.baseURI);
              } catch(e) {
                 actionUrl = new URL(window.location.href);
              }
              
              // パラメータを付与
              params.forEach((val, key) => actionUrl.searchParams.set(key, val));
              
              // プロキシ経由でリダイレクト
              window.location.href = proxyBase + encodeURIComponent(actionUrl.href);
            } else {
              // POSTなどの場合は今の簡易版では対応しきれないのでアラート
              // ※高度なプロキシを作るならここでfetchを使って裏で送信する必要がある
              alert('GhostFrame: Login/Post forms are limited in this version.');
            }
          });
        })();
      </script>
    `;

    // bodyの閉じタグの直前にスクリプトを挿入
    html = html.replace('</body>', injectionScript + '</body>');

    // 4. レスポンスヘッダーの掃除
    const newHeaders = new Headers();
    newHeaders.set('Content-Type', 'text/html');
    newHeaders.set('Access-Control-Allow-Origin', '*');
    // セキュリティ制限を無効化
    newHeaders.delete('x-frame-options');
    newHeaders.delete('content-security-policy');
    newHeaders.delete('x-content-type-options');

    return new NextResponse(html, {
      status: 200,
      headers: newHeaders,
    });

  } catch (error) {
    console.error(error);
    return new NextResponse('Proxy Error', { status: 500 });
  }
}
