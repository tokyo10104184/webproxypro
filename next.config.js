/** @type {import('next').NextConfig} */
const nextConfig = {
    typescript: {
        // 型エラーがあっても無理やりビルドを成功させる
        ignoreBuildErrors: true,
    },
}

module.exports = nextConfig
