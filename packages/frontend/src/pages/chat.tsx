import { useState, useEffect, useRef } from 'react';
import { inference } from '../lib/api';
import type { ChatMessage } from '@shared/types/inference';
import type { ModelInfo } from '@shared/types/inference';

export function ChatPage() {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [tokenInfo, setTokenInfo] = useState<{ prompt: number; completion: number } | null>(null);
  const messagesEnd = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inference.listModels().then(res => {
      setModels(res.data);
      if (res.data.length > 0) setSelectedModel(res.data[0].id);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend() {
    const text = input.trim();
    if (!text || !selectedModel || streaming) return;

    const userMsg: ChatMessage = { role: 'user', content: text };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput('');
    setStreaming(true);
    setTokenInfo(null);

    const assistantMsg: ChatMessage = { role: 'assistant', content: '' };
    setMessages([...updatedMessages, assistantMsg]);

    try {
      let fullContent = '';
      const stream = inference.chatCompletionStream({
        model: selectedModel,
        messages: updatedMessages,
        stream: true,
      });

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content;
        if (delta) {
          fullContent += delta;
          setMessages([...updatedMessages, { role: 'assistant', content: fullContent }]);
        }
      }

      // Get token usage from a non-streaming request for display
      // The streaming response doesn't always include usage, so we just show the content
      setTokenInfo(null);
    } catch (err) {
      const errorContent = err instanceof Error ? err.message : 'Error generating response';
      setMessages([...updatedMessages, { role: 'assistant', content: `Error: ${errorContent}` }]);
    } finally {
      setStreaming(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="flex flex-col h-screen">
      <div className="border-b border-gray-800 p-4 flex items-center gap-4">
        <h2 className="text-lg font-semibold">Chat</h2>
        <select
          value={selectedModel}
          onChange={e => setSelectedModel(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500"
        >
          {models.map(m => (
            <option key={m.id} value={m.id}>{m.id}</option>
          ))}
        </select>
        {models.find(m => m.id === selectedModel) && (
          <span className="text-xs text-gray-500">
            ${models.find(m => m.id === selectedModel)!.cost_per_million_tokens}/M tokens
          </span>
        )}
        <button
          onClick={() => { setMessages([]); setTokenInfo(null); }}
          className="ml-auto text-sm text-gray-400 hover:text-white transition-colors"
        >
          Clear
        </button>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full text-gray-500">
            Start a conversation
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-2xl rounded-xl px-4 py-3 text-sm whitespace-pre-wrap ${
              msg.role === 'user'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-100'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}
        {tokenInfo && (
          <div className="text-center text-xs text-gray-500">
            Tokens: {tokenInfo.prompt} prompt + {tokenInfo.completion} completion
          </div>
        )}
        <div ref={messagesEnd} />
      </div>

      <div className="border-t border-gray-800 p-4">
        <div className="flex gap-2 max-w-4xl mx-auto">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            rows={1}
            className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:border-blue-500"
          />
          <button
            onClick={handleSend}
            disabled={streaming || !input.trim()}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl px-6 py-3 text-sm font-medium transition-colors"
          >
            {streaming ? '...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
}
