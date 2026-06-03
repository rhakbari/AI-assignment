/** @type {import('next').NextConfig} */
const nextConfig = {
  // Prisma + libSQL adapter pull in native-ish deps; keep them external to the
  // server bundle so Next's bundler does not try to inline them.
  serverExternalPackages: ["@prisma/client", "@prisma/adapter-libsql", "@libsql/client"],
};

export default nextConfig;
