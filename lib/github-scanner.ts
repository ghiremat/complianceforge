/**
 * Types and constants shared by the GitHub webhook path, policy engine, and AI-BOM builder.
 * Full remote scanning can extend these shapes without changing consumers.
 */

export type ScanFinding = {
  name: string;
  framework: string;
  files: string[];
  dependencies: string[];
  suggestedRiskTier: string;
  suggestedSector: string;
  confidence: number;
  suggestedUseCase?: string;
  /** Optional infrastructure hints used by policy evaluation. */
  apiEndpoints?: string[];
};

export type RepositoryScanResult = {
  repository: string;
  branch: string;
  findings: ScanFinding[];
  totalFindings: number;
  reviewRequired: number;
  errors: string[];
};

/** Common npm packages that indicate ML / AI usage in a repository. */
export const NPM_AI_PACKAGES = [
  "@tensorflow/tfjs",
  "@tensorflow/tfjs-node",
  "tensorflow",
  "@huggingface/inference",
  "@xenova/transformers",
  "openai",
  "@anthropic-ai/sdk",
  "@google/generative-ai",
  "langchain",
  "@langchain/core",
  "vectordb",
  "chromadb",
  "onnxruntime-node",
  "sharp",
  "torch",
] as const;

/** Common PyPI packages that indicate ML / AI usage. */
export const PYTHON_AI_PACKAGES = [
  "torch",
  "tensorflow",
  "transformers",
  "keras",
  "sklearn",
  "scikit-learn",
  "onnx",
  "jax",
  "mlx",
  "openai",
  "anthropic",
  "langchain",
  "sentence-transformers",
  "diffusers",
  "accelerate",
] as const;
