/**
 * Message Bubble Component following Chat SDK patterns
 */

import React, { memo } from 'react';
import { StructuredMessage, MessagePart } from '@/lib/message-types';
import ReactMarkdown from 'react-markdown';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Code, 
  BarChart3, 
  Table, 
  FileText, 
  ExternalLink, 
  Copy,
  Wrench,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MessageBubbleProps {
  message: StructuredMessage;
  onArtifactToggle: (artifactId?: string) => void;
  isStreaming?: boolean;
  isLastMessage?: boolean;
}

const ArtifactTypeIcons = {
  code: Code,
  chart: BarChart3,
  table: Table,
  diagram: FileText,
  text: FileText
} as const;

type ArtifactType = keyof typeof ArtifactTypeIcons;

const ToolInvocationRenderer = memo(({ 
  toolInvocation, 
  onArtifactToggle 
}: { 
  toolInvocation: any;
  onArtifactToggle: (artifactId?: string) => void;
}) => {
  const { toolName, toolCallId, state, args, result } = toolInvocation;

  if (state === 'call') {
    return (
      <Card className="mt-2 border border-muted bg-muted/30">
        <CardContent className="p-3">
          <div className="flex items-center gap-2">
            <Wrench className="w-4 h-4 text-foreground" />
            <span className="text-sm font-medium">Executing {toolName}...</span>
          </div>
          {args && Object.keys(args).length > 0 && (
            <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-x-auto">
              {JSON.stringify(args, null, 2)}
            </pre>
          )}
        </CardContent>
      </Card>
    );
  }

  if (state === 'result') {
    if (typeof result === 'object' && result.type === 'error') {
      return (
        <Card className="mt-2 border border-red-200 bg-red-50">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <span className="text-sm font-medium text-red-800">Tool Error</span>
            </div>
            <p className="mt-1 text-sm text-red-700">{result.content}</p>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className="mt-2 border border-green-200 bg-green-50">
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wrench className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-800">
                {toolName} completed
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onArtifactToggle()}
              className="h-7 px-2 text-xs"
            >
              <ExternalLink className="w-3 h-3 mr-1" />
              View
            </Button>
          </div>
          <div className="mt-2 text-sm text-green-700">
            {typeof result === 'string' ? (
              <ReactMarkdown>{result}</ReactMarkdown>
            ) : (
              <pre className="text-xs bg-green-100 p-2 rounded overflow-x-auto">
                {JSON.stringify(result, null, 2)}
              </pre>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
});

const ArtifactRenderer = memo(({ 
  artifact, 
  onArtifactToggle 
}: { 
  artifact: any;
  onArtifactToggle: (artifactId?: string) => void;
}) => {
  const IconComponent = ArtifactTypeIcons[artifact.type as ArtifactType] || FileText;
  
  const getArtifactTypeLabel = (type: string) => {
    switch (type) {
      case 'code': return 'Code Block';
      case 'chart': return 'Data Visualization';
      case 'table': return 'Data Table';
      case 'diagram': return 'Diagram';
      default: return 'Artifact';
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(artifact.content);
  };

  return (
    <Card className="mt-3 border border-accent/20 bg-accent/5">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <IconComponent className="w-5 h-5 text-accent" />
            <div>
              <h4 className="text-sm font-medium text-foreground">
                {artifact.title}
              </h4>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="text-xs">
                  {getArtifactTypeLabel(artifact.type)}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {artifact.format}
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className="h-8 px-2"
            >
              <Copy className="w-3 h-3" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onArtifactToggle(artifact.id)}
              className="h-8 px-2"
            >
              <ExternalLink className="w-3 h-3 mr-1" />
              Open
            </Button>
          </div>
        </div>
        
        {artifact.format === 'json' && artifact.type === 'chart' && (
          <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
            Interactive chart ready to view
          </div>
        )}
        
        {artifact.format === 'markdown' && artifact.type === 'code' && (
          <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
            Code ready for execution and editing
          </div>
        )}
      </CardContent>
    </Card>
  );
});

const ReasoningRenderer = memo(({ reasoning }: { reasoning: string }) => (
  <Card className="mt-2 border border-secondary bg-secondary/50">
    <CardContent className="p-3">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-2 h-2 rounded-full bg-accent"></div>
        <span className="text-sm font-medium text-foreground">Reasoning</span>
      </div>
      <div className="text-sm text-muted-foreground">
        <ReactMarkdown>{reasoning}</ReactMarkdown>
      </div>
    </CardContent>
  </Card>
));

const MessagePartRenderer = memo(({ 
  part, 
  onArtifactToggle 
}: { 
  part: MessagePart;
  onArtifactToggle: (artifactId?: string) => void;
}) => {
  switch (part.type) {
    case 'text':
      return (
        <div className="prose prose-sm max-w-none">
          <ReactMarkdown>{part.text}</ReactMarkdown>
        </div>
      );
    
    case 'tool-invocation':
      return (
        <ToolInvocationRenderer 
          toolInvocation={part.toolInvocation}
          onArtifactToggle={onArtifactToggle}
        />
      );
    
    case 'artifact':
      return (
        <ArtifactRenderer 
          artifact={part.artifact}
          onArtifactToggle={onArtifactToggle}
        />
      );
    
    case 'reasoning':
      return <ReasoningRenderer reasoning={part.reasoning} />;
    
    default:
      return null;
  }
});

export const MessageBubble = memo(function MessageBubble({
  message,
  onArtifactToggle,
  isStreaming = false,
  isLastMessage = false
}: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div className={cn(
      "flex gap-3 max-w-3xl w-full mx-auto",
      isUser ? "flex-row-reverse" : "flex-row"
    )}>
      {/* Avatar */}
      <div className={cn(
        "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
        isUser 
          ? "bg-muted text-muted-foreground" 
          : "bg-secondary text-secondary-foreground"
      )}>
        {isUser ? "U" : "AI"}
      </div>

      {/* Message Content */}
      <div className={cn(
        "flex-1 space-y-2",
        isUser ? "items-end" : "items-start"
      )}>
        <div className={cn(
          "rounded-lg px-4 py-3 max-w-none",
          isUser 
            ? "bg-muted text-foreground ml-auto max-w-[80%]" 
            : "bg-secondary text-secondary-foreground"
        )}>
          {/* Render message parts */}
          <div className="space-y-2">
            {message.parts.map((part, index) => (
              <MessagePartRenderer
                key={`${message.id}-part-${index}`}
                part={part}
                onArtifactToggle={onArtifactToggle}
              />
            ))}
          </div>

          {/* Streaming indicator */}
          {isStreaming && isLastMessage && !isUser && (
            <div className="flex items-center gap-1 mt-2">
              <div className="w-2 h-2 bg-accent rounded-full animate-pulse"></div>
              <span className="text-xs text-muted-foreground">Thinking...</span>
            </div>
          )}
        </div>

        {/* Attachments */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {message.attachments.map((attachment, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {attachment.name}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

MessageBubble.displayName = 'MessageBubble';
