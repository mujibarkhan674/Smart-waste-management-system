import { fileURLToPath } from 'node:url'

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Pin the workspace root (a stray lockfile in a parent folder confuses detection).
  turbopack: { root: fileURLToPath(new URL('.', import.meta.url)) },
  images: {
    unoptimized: true,
  },
  // Native / large server-only packages used by the local CLIP classifier.
  serverExternalPackages: ['@huggingface/transformers', 'onnxruntime-node', 'sharp'],
  // transformers.js loads onnxruntime-node and sharp dynamically, so the file
  // tracer misses their native files. Include the JS plus only the Linux x64
  // binaries (serverless hosts run Linux x64); onnxruntime-node alone bundles
  // every OS (~290 MB). Relies on node-linker=hoisted in .npmrc (no symlinks).
  outputFileTracingIncludes: {
    '/api/classify': [
      'node_modules/onnxruntime-node/{package.json,dist/**,lib/**}',
      'node_modules/onnxruntime-node/bin/napi-v*/linux/x64/{libonnxruntime.so.1,onnxruntime_binding.node}',
      'node_modules/onnxruntime-common/**',
      'node_modules/@img/sharp-linux-x64/**',
      'node_modules/@img/sharp-libvips-linux-x64/**',
    ],
  },
  outputFileTracingExcludes: {
    '/api/classify': ['.cache/**'],
  },
}

export default nextConfig
