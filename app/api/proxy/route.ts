import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');
  if (!url) return new NextResponse('Missing URL', { status: 400 });

  try {
    // ターゲットサイトへアクセス
    const targetRes = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    const contentType = targetRes.headers.get('content-type') || '';

    // HTML以外（画像、CSS、JSなど）はそのまま流す
    if (!contentType.includes('text/html')) {
      const blob = await targetRes.blob();
      return new NextResponse(blob, {
        status: targetRes.status,
        headers: {
          'Content-Type': contentType,
          'Access-Control-Allow-Origin': '*',
        }
      });
    }

    // HTMLテキストを取得
    let html = await targetRes.text();
    const origin = new URL(url).origin;

    // --- ここからが魔法（Magic）です ---

    // 1. <base>タグを注入
    // これにより、画像やCSSの相対パス（例: src="/logo.png"）が
    // 自動的にターゲットサイト（例: google.com/logo.png）を参照するようになります。
    html = html.replace('<head>', `<head><base href="${origin}/">`);

    // 2. リンクとフォームを乗っ取るスクリプトを注入
    // ユーザーがクリックした瞬間、プロキシURLに変換します。
    const interceptorScript = `
      <script>
        (function() {
          console.log('👻 GhostFrame Interceptor Active');
          
          // リンククリックを乗っ取る
          document.addEventListener('click', function(e) {
            const link = e.target.closest('a');
            if (link && link.href) {
              e.preventDefault(); // 本来の移動をキャンセル
              
              // リンク先がhttpで始まっていればプロキシ経由にする
              const targetUrl = link.href;
              const proxyUrl = '/api/proxy?url=' + encodeURIComponent(targetUrl);
              
              // iframe内のページ移動を実行
              window.location.href = proxyUrl;
            }
          });

          // 検索フォームなどの送信を乗っ取る
          document.addEventListener('submit', function(e) {
            e.preventDefault();
            const form = e.target;
            
            // フォームの送信先URLを構築
            const url = new URL(form.action);
            const params = new URLSearchParams(new FormData(form));
            const fullTargetUrl = url.toString() + '?' + params.toString();
            
            // プロキシ経由で移動
            window.location.href = '/api/proxy?url=' + encodeURIComponent(fullTargetUrl);
          });
        })();
      </script>
    `;

    // </body>の直前にスクリプトを挿入（なければ末尾に追加）
    if (html.includes('</body>')) {
      html = html.replace('</body>', interceptorScript + '</body>');
    } else {
      html += interceptorScript;
    }

    // レスポンスヘッダーの調整
    const newHeaders = new Headers();
    newHeaders.set('Content-Type', 'text/html');
    newHeaders.set('Access-Control-Allow-Origin', '*');

    return new NextResponse(html, {
      status: 200,
      headers: newHeaders,
    });

  } catch (e) {
    console.error(e);
    return new NextResponse('Proxy Error', { status: 500 });
  }
}
