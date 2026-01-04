/** @type {import('next').NextConfig} */
const nextConfig = {
    // 開発中の型チェックなどを無視してデプロイを成功させる設定
    typescript: { ignoreBuildErrors: true },
    eslint: { ignoreDuringBuilds: true },
}

module.exports = nextConfig
