/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  // The email catalogue reads its snapshot from data/ with node:fs at request
  // time. Without this, the files aren't traced into the serverless bundle and
  // the page deploys empty.
  outputFileTracingIncludes: {
    "/email-catalogue": ["./data/**"],
    "/email-catalogue/[id]": ["./data/**"],
    "/api/email-catalogue/[id]": ["./data/**"],
  },
};

export default nextConfig;
