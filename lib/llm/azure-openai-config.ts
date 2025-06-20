/**
 * Azure OpenAI Environment Configuration
 * Handles loading and validation of Azure OpenAI settings from environment variables
 */

import { AzureOpenAIConfig } from '../mcp/types';

/**
 * Load Azure OpenAI configuration from environment variables
 */
export function loadAzureOpenAIConfig(): AzureOpenAIConfig | null {
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const apiKey = process.env.AZURE_OPENAI_API_KEY;
  const deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT_NAME;
  const apiVersion = process.env.AZURE_OPENAI_API_VERSION;

  // If endpoint is not provided, Azure OpenAI is not configured
  if (!endpoint) {
    console.log('ℹ️ Azure OpenAI not configured (no endpoint provided)');
    return null;
  }

  // Validate required fields
  if (!deploymentName) {
    throw new Error('AZURE_OPENAI_DEPLOYMENT_NAME is required when Azure OpenAI endpoint is configured');
  }

  // Automatically determine authentication method: if API key is provided, use it; otherwise use Azure AD
  const useAzureAD = !apiKey;

  const config: AzureOpenAIConfig = {
    endpoint,
    deploymentName,
    apiVersion: apiVersion || '2024-10-21',
    useAzureAD,
  };

  // Add API key if provided
  if (apiKey) {
    config.apiKey = apiKey;
  }

  console.log('✅ Azure OpenAI configuration loaded from environment variables', {
    endpoint: config.endpoint,
    deploymentName: config.deploymentName,
    apiVersion: config.apiVersion,
    authMethod: useAzureAD ? 'Azure AD' : 'API Key',
    hasApiKey: !!config.apiKey
  });

  return config;
}

/**
 * Validate Azure OpenAI environment variables
 */
export function validateAzureOpenAIConfig(): {
  isValid: boolean;
  missingVars: string[];
  errors: string[];
} {
  const errors: string[] = [];
  const missingVars: string[] = [];

  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const apiKey = process.env.AZURE_OPENAI_API_KEY;
  const deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT_NAME;

  // Check if Azure OpenAI is configured at all
  if (!endpoint) {
    return { isValid: true, missingVars: [], errors: [] }; // Not configured is valid
  }

  // Validate endpoint format
  if (!endpoint.startsWith('https://') || !endpoint.includes('openai.azure.com')) {
    errors.push('AZURE_OPENAI_ENDPOINT must be a valid Azure OpenAI endpoint URL');
  }

  // Validate deployment name
  if (!deploymentName) {
    missingVars.push('AZURE_OPENAI_DEPLOYMENT_NAME');
  }

  // Note: No authentication validation needed - if no API key, Azure AD will be used automatically

  return {
    isValid: missingVars.length === 0 && errors.length === 0,
    missingVars,
    errors
  };
}

/**
 * Get Azure OpenAI configuration status for display
 */
export function getAzureOpenAIConfigStatus(): {
  configured: boolean;
  authMethod: 'azure-ad' | 'api-key' | 'none';
  endpoint?: string;
  deploymentName?: string;
} {
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const apiKey = process.env.AZURE_OPENAI_API_KEY;
  const deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT_NAME;

  if (!endpoint) {
    return {
      configured: false,
      authMethod: 'none'
    };
  }

  // Automatically determine auth method: API key takes precedence, otherwise Azure AD
  const authMethod = apiKey ? 'api-key' : 'azure-ad';

  return {
    configured: true,
    authMethod,
    endpoint,
    deploymentName
  };
}
