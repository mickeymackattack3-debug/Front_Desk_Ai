// FrontDesk AI — Embeddable Chat Widget
(function () {
  'use strict';

  const DEFAULT_OPTIONS = {
    businessId: 'demo-001',
    apiUrl: 'http://localhost:3000',
    position: 'right',
    primaryColor: '#4F46E5',
    title: 'Need help?',
    subtitle: 'We typically reply in minutes',
    greetingMessage: 'Hi! 👋 How can I help you today?'
  };

  class FrontDeskWidget {
    constructor(options) {
      this.options = Object.assign({}, DEFAULT_OPTIONS, options);
      this.conversationId = null;
      this.messages = [];
      this.isOpen = false;
      this._init();
    }

    _init() {
      this._injectStyles();
      this._createDOM();
      this._attachEvents();
    }

    _injectStyles() {
      const css = `
        .fdai-widget-container * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        .fdai-widget-container {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          position: fixed;
          bottom: 20px;
          ${this.options.position}: 20px;
          z-index: 999999;
          line-height: 1.5;
        }
        .fdai-button {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: ${this.options.primaryColor};
          color: white;
          border: none;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(0,0,0,0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.2s, box-shadow 0.2s;
          font-size: 28px;
        }
        .fdai-button:hover {
          transform: scale(1.05);
          box-shadow: 0 6px 16px rgba(0,0,0,0.3);
        }
        .fdai-button svg {
          width: 28px;
          height: 28px;
          fill: white;
        }
        .fdai-chat-box {
          position: absolute;
          bottom: 75px;
          ${this.options.position}: 0;
          width: 360px;
          height: 520px;
          background: white;
          border-radius: 16px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.15);
          display: none;
          flex-direction: column;
          overflow: hidden;
          animation: fdaiSlideUp 0.3s ease;
        }
        .fdai-chat-box.open {
          display: flex;
        }
        @keyframes fdaiSlideUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .fdai-header {
          background: ${this.options.primaryColor};
          color: white;
          padding: 16px 20px;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .fdai-header-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: rgba(255,255,255,0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
        }
        .fdai-header-info {
          flex: 1;
        }
        .fdai-header-title {
          font-weight: 600;
          font-size: 15px;
        }
        .fdai-header-subtitle {
          font-size: 12px;
          opacity: 0.85;
        }
        .fdai-header-close {
          background: none;
          border: none;
          color: white;
          cursor: pointer;
          font-size: 22px;
          opacity: 0.7;
          padding: 4px;
        }
        .fdai-header-close:hover {
          opacity: 1;
        }
        .fdai-messages {
          flex: 1;
          padding: 16px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 8px;
          background: #f8f9fa;
        }
        .fdai-message {
          max-width: 80%;
          padding: 10px 14px;
          border-radius: 14px;
          font-size: 14px;
          line-height: 1.45;
          word-wrap: break-word;
          animation: fdaiMsgIn 0.2s ease;
        }
        @keyframes fdaiMsgIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .fdai-message.visitor {
          align-self: flex-end;
          background: ${this.options.primaryColor};
          color: white;
          border-bottom-right-radius: 4px;
        }
        .fdai-message.assistant {
          align-self: flex-start;
          background: white;
          color: #1a1a1a;
          border: 1px solid #e5e7eb;
          border-bottom-left-radius: 4px;
        }
        .fdai-message.system {
          align-self: center;
          background: transparent;
          color: #6b7280;
          font-size: 12px;
          border: none;
        }
        .fdai-input-area {
          display: flex;
          padding: 12px 16px;
          border-top: 1px solid #e5e7eb;
          background: white;
          gap: 8px;
        }
        .fdai-input {
          flex: 1;
          border: 1px solid #d1d5db;
          border-radius: 24px;
          padding: 10px 16px;
          font-size: 14px;
          outline: none;
          transition: border-color 0.2s;
          font-family: inherit;
        }
        .fdai-input:focus {
          border-color: ${this.options.primaryColor};
        }
        .fdai-send-btn {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: ${this.options.primaryColor};
          color: white;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s;
          flex-shrink: 0;
        }
        .fdai-send-btn:hover {
          opacity: 0.9;
        }
        .fdai-send-btn svg {
          width: 18px;
          height: 18px;
          fill: white;
        }
        .fdai-typing {
          align-self: flex-start;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 14px;
          padding: 12px 18px;
          display: flex;
          gap: 4px;
          animation: fdaiMsgIn 0.2s ease;
        }
        .fdai-typing span {
          width: 8px;
          height: 8px;
          background: #9ca3af;
          border-radius: 50%;
          animation: fdaiBounce 1.4s infinite;
        }
        .fdai-typing span:nth-child(2) { animation-delay: 0.2s; }
        .fdai-typing span:nth-child(3) { animation-delay: 0.4s; }
        @keyframes fdaiBounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-6px); }
        }
        @media (max-width: 480px) {
          .fdai-chat-box {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            width: 100%;
            height: 100%;
            border-radius: 0;
          }
        }
      `;
      const style = document.createElement('style');
      style.textContent = css;
      document.head.appendChild(style);
    }

    _createDOM() {
      const container = document.createElement('div');
      container.className = 'fdai-widget-container';
      container.innerHTML = `
        <div class="fdai-chat-box" id="fdaiChatBox">
          <div class="fdai-header">
            <div class="fdai-header-avatar">🤖</div>
            <div class="fdai-header-info">
              <div class="fdai-header-title">${this._escapeHtml(this.options.title)}</div>
              <div class="fdai-header-subtitle">${this._escapeHtml(this.options.subtitle)}</div>
            </div>
            <button class="fdai-header-close" id="fdaiCloseBtn">&times;</button>
          </div>
          <div class="fdai-messages" id="fdaiMessages"></div>
          <div class="fdai-input-area">
            <input class="fdai-input" id="fdaiInput" type="text" placeholder="Type your message..." autocomplete="off">
            <button class="fdai-send-btn" id="fdaiSendBtn">
              <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
            </button>
          </div>
        </div>
        <button class="fdai-button" id="fdaiButton">
          <svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg>
        </button>
      `;
      document.body.appendChild(container);
      this.chatBox = container.querySelector('#fdaiChatBox');
      this.button = container.querySelector('#fdaiButton');
      this.closeBtn = container.querySelector('#fdaiCloseBtn');
      this.messagesEl = container.querySelector('#fdaiMessages');
      this.input = container.querySelector('#fdaiInput');
      this.sendBtn = container.querySelector('#fdaiSendBtn');
    }

    _attachEvents() {
      this.button.addEventListener('click', () => this.open());
      this.closeBtn.addEventListener('click', () => this.close());
      this.sendBtn.addEventListener('click', () => this.sendMessage());
      this.input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') this.sendMessage();
      });
    }

    async open() {
      this.isOpen = true;
      this.chatBox.classList.add('open');
      this.button.style.display = 'none';

      if (!this.conversationId) {
        await this._startConversation();
      }
    }

    close() {
      this.isOpen = false;
      this.chatBox.classList.remove('open');
      this.button.style.display = 'flex';
    }

    async _startConversation() {
      this._addTypingIndicator();
      try {
        const res = await fetch(`${this.options.apiUrl}/api/conversations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ businessId: this.options.businessId })
        });
        const data = await res.json();
        this.conversationId = data.conversationId;
        this._removeTypingIndicator();
        this._addMessage(data.greeting, 'assistant');
      } catch (err) {
        this._removeTypingIndicator();
        this._addMessage('Sorry, something went wrong. Please try again.', 'assistant');
      }
    }

    async sendMessage() {
      const text = this.input.value.trim();
      if (!text || !this.conversationId) return;

      this.input.value = '';
      this._addMessage(text, 'visitor');
      this._addTypingIndicator();

      try {
        const res = await fetch(`${this.options.apiUrl}/api/message`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            conversationId: this.conversationId,
            businessId: this.options.businessId,
            content: text
          })
        });
        const data = await res.json();
        this._removeTypingIndicator();
        this._addMessage(data.content, 'assistant');
      } catch (err) {
        this._removeTypingIndicator();
        this._addMessage('Sorry, I couldn\'t process that. Please try again.', 'assistant');
      }
    }

    _addMessage(text, role) {
      const msg = document.createElement('div');
      msg.className = `fdai-message ${role}`;
      // Simple markdown-like formatting: **bold** and newlines
      const formatted = this._escapeHtml(text)
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br>');
      msg.innerHTML = formatted;
      this.messagesEl.appendChild(msg);
      this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
    }

    _addTypingIndicator() {
      const el = document.createElement('div');
      el.className = 'fdai-typing';
      el.id = 'fdaiTyping';
      el.innerHTML = '<span></span><span></span><span></span>';
      this.messagesEl.appendChild(el);
      this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
    }

    _removeTypingIndicator() {
      const el = this.messagesEl.querySelector('#fdaiTyping');
      if (el) el.remove();
    }

    _escapeHtml(str) {
      const div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
    }
  }

  // Auto-initialize with data attributes
  function initFromDataAttrs() {
    const script = document.querySelector('script[data-fdai-business-id]');
    if (!script) return null;

    const options = {
      businessId: script.getAttribute('data-fdai-business-id'),
      apiUrl: script.getAttribute('data-fdai-api-url') || DEFAULT_OPTIONS.apiUrl,
      position: script.getAttribute('data-fdai-position') || DEFAULT_OPTIONS.position,
      primaryColor: script.getAttribute('data-fdai-color') || DEFAULT_OPTIONS.primaryColor,
      title: script.getAttribute('data-fdai-title') || DEFAULT_OPTIONS.title,
      subtitle: script.getAttribute('data-fdai-subtitle') || DEFAULT_OPTIONS.subtitle
    };

    return new FrontDeskWidget(options);
  }

  // Expose for manual initialization too
  window.FrontDeskAI = {
    init: (options) => new FrontDeskWidget(options),
    widget: null
  };

  // Auto-init on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.FrontDeskAI.widget = initFromDataAttrs();
    });
  } else {
    window.FrontDeskAI.widget = initFromDataAttrs();
  }
})();