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
  // transformers.js loads onnxruntime-node dynamically, so the file tracer
  // misses it. Include its JS plus only the Linux x64 binary (serverless hosts
  // run Linux x64); the full package bundles every OS (~290 MB).
  outputFileTracingIncludes: {
    '/api/classify': [
      'node_modules/.pnpm/onnxruntime-node@*/node_modules/onnxruntime-node/{package.json,dist/**,lib/**}',
      // CPU runtime only — never the optional CUDA/GPU libraries.
      'node_modules/.pnpm/onnxruntime-node@*/node_modules/onnxruntime-node/bin/napi-v*/linux/x64/{libonnxruntime.so.1,onnxruntime_binding.node}',
    ],
  },
  outputFileTracingExcludes: {
    '/api/classify': ['.cache/**'],
  },
}

export default nextConfig
