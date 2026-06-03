

/** @type {import('next').NextConfig} */
const nextConfig = {
    output: "standalone",
    reactStrictMode: false,
    images: { unoptimized: true },
    async redirects() {
        return [
            {
                source: "/",
                destination: "/targetlock",
                permanent: false,
            },
        ];
    },
};

export default nextConfig;