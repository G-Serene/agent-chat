/**
 * Artifact Detection System
 * Detects and extracts artifacts from text content
 */

export interface ArtifactContent {
  id: string;
  title: string;
  content: string;
  type: 'code' | 'chart' | 'table' | 'diagram' | 'text';
  language?: string;
  filename?: string;
  metadata?: {
    description?: string;
    [key: string]: any;
  };
}

/**
 * Detect artifacts in text content
 */
export function detectArtifacts(content: string, messageId: string): ArtifactContent[] {
  const artifacts: ArtifactContent[] = [];
  
  // Detect code blocks
  const codeBlockRegex = /```(\w+)?\n?([\s\S]*?)```/g;
  let match;
  let index = 0;
  
  while ((match = codeBlockRegex.exec(content)) !== null) {
    const language = match[1] || 'text';
    const code = match[2].trim();
    
    if (code.length > 0) {
      const artifactType = detectArtifactType(code, language);
      
      artifacts.push({
        id: `${messageId}-artifact-${index}`,
        title: generateTitle(artifactType, language, code),
        content: code,
        type: artifactType,
        language: language,
        filename: `artifact-${index}.${language === 'mermaid' ? 'mmd' : language === 'javascript' ? 'js' : language === 'typescript' ? 'ts' : language === 'python' ? 'py' : language || 'txt'}`,
        metadata: {
          description: `${artifactType} artifact in ${language}`
        }
      });
      
      index++;
    }
  }
  
  // Detect JSON data outside of code blocks
  const jsonRegex = /(?:^|\n)(\{[\s\S]*?\}|\[[\s\S]*?\])(?:\n|$)/g;
  while ((match = jsonRegex.exec(content)) !== null) {
    try {
      const jsonContent = match[1].trim();
      const parsed = JSON.parse(jsonContent);
      
      // Skip if it's likely part of a code block or too simple
      if (jsonContent.length > 50 && !content.includes('```')) {
        const artifactType = detectJSONArtifactType(parsed);
        
        artifacts.push({
          id: `${messageId}-json-${index}`,
          title: generateJSONTitle(artifactType, parsed),
          content: JSON.stringify(parsed, null, 2),
          type: artifactType,
          language: 'json',
          filename: `data-${index}.json`,
          metadata: {
            description: `${artifactType} data structure`
          }
        });
        
        index++;
      }
    } catch {
      // Not valid JSON, skip
    }
  }
  
  return artifacts;
}

/**
 * Detect the type of artifact based on content and language
 */
function detectArtifactType(content: string, language: string): ArtifactContent['type'] {
  const lowerContent = content.toLowerCase();
  
  // Explicit language-based detection
  if (language === 'chart') {
    return 'chart';
  }
  
  if (language === 'table') {
    return 'table';
  }
  
  // Check for chart data patterns in JSON/JavaScript
  if (language === 'json' || language === 'javascript') {
    try {
      const parsed = JSON.parse(content);
      const chartType = detectJSONArtifactType(parsed);
      if (chartType !== 'text') return chartType;
    } catch {
      // Not JSON, continue with other checks
    }
  }
  
  // Check for Mermaid diagrams
  if (language === 'mermaid' || lowerContent.includes('graph') || lowerContent.includes('flowchart')) {
    return 'diagram';
  }
  
  // Check for table-like structures
  if (lowerContent.includes('|') && lowerContent.includes('---')) {
    return 'table';
  }
  
  // Default to code
  return 'code';
}

/**
 * Detect artifact type from JSON data
 */
function detectJSONArtifactType(data: any): ArtifactContent['type'] {
  if (Array.isArray(data)) {
    // Check for chart data patterns
    if (data.length > 0 && typeof data[0] === 'object') {
      const firstItem = data[0];
      const keys = Object.keys(firstItem);
      
      // Common chart data patterns
      if (keys.some(key => ['value', 'count', 'amount', 'y'].includes(key.toLowerCase()))) {
        return 'chart';
      }
      
      // Table data pattern
      if (keys.length > 1) {
        return 'table';
      }
    }
  } else if (typeof data === 'object' && data !== null) {
    // Check for chart configuration objects
    if (data.type || data.chart || data.data || data.datasets) {
      return 'chart';
    }
    
    // Check for table-like structures
    if (data.headers || data.rows || data.columns) {
      return 'table';
    }
  }
  
  return 'text';
}

/**
 * Generate a title for the artifact
 */
function generateTitle(type: ArtifactContent['type'], language: string, content: string): string {
  const preview = content.substring(0, 50).replace(/\n/g, ' ').trim();
  
  switch (type) {
    case 'chart':
      return 'Data Visualization';
    case 'table':
      return 'Data Table';
    case 'diagram':
      return 'Diagram';
    case 'code':
      return `${language.toUpperCase()} Code`;
    default:
      return `${type.charAt(0).toUpperCase() + type.slice(1)} - ${preview}...`;
  }
}

/**
 * Generate a title for JSON artifacts
 */
function generateJSONTitle(type: ArtifactContent['type'], data: any): string {
  switch (type) {
    case 'chart':
      return 'Chart Data';
    case 'table':
      return 'Table Data';
    default:
      if (Array.isArray(data)) {
        return `JSON Array (${data.length} items)`;
      }
      return 'JSON Data';
  }
}
