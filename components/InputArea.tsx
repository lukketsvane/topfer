import React, { useState, useRef, useEffect } from 'react';

interface InputAreaProps {
  onSend: (text: string) => void;
  disabled: boolean;
  placeholder?: string;
}

const InputArea: React.FC<InputAreaProps> = ({ onSend, disabled, placeholder = "Describe your book spread..." }) => {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      // Increased max height significantly (approx 320px) to accommodate long text inputs typical for book content
      const newHeight = Math.min(textarea.scrollHeight, 320);
      textarea.style.height = `${newHeight}px`;
    }
  };

  useEffect(() => {
    adjustHeight();
  }, [text]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (text.trim() && !disabled) {
        onSend(text.trim());
        setText('');
      }
    }
  };

  return (
    <div className="fixed bottom-0 left-0 w-full z-50 px-4 pb-8 pt-2 bg-gradient-to-t from-[#F2F2F7] via-[#F2F2F7] to-transparent">
      <div className="max-w-screen-md mx-auto">
        <div className="relative group">
            <div className={`absolute inset-0 bg-white rounded-[26px] shadow-sm transition-shadow duration-200 pointer-events-none ${disabled ? 'opacity-50' : 'group-focus-within:shadow-md'}`}></div>
            <textarea
                ref={textareaRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={disabled}
                placeholder={disabled ? "Processing..." : placeholder}
                rows={1}
                className="relative w-full bg-transparent border-none rounded-[26px] py-[13px] px-5 pr-14 text-[17px] leading-[1.5] text-black placeholder-gray-400 focus:ring-0 focus:outline-none resize-none overflow-hidden max-h-[320px] font-normal disabled:opacity-50"
                style={{ WebkitAppearance: 'none' }}
            />
            
            <button
                onClick={() => {
                    if (text.trim() && !disabled) {
                        onSend(text.trim());
                        setText('');
                    }
                }}
                disabled={!text.trim() || disabled}
                className={`absolute right-3 bottom-2 p-2 transition-all duration-200 ${
                    text.trim() && !disabled 
                    ? 'opacity-100' 
                    : 'opacity-0 pointer-events-none'
                }`}
            >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-black">
                    <line x1="12" y1="19" x2="12" y2="5"></line>
                    <polyline points="5 12 12 5 19 12"></polyline>
                </svg>
            </button>
        </div>
      </div>
    </div>
  );
};

export default InputArea;