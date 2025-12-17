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
      // Max height constraint (approx 4-5 lines)
      const newHeight = Math.min(textarea.scrollHeight, 120);
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
    <div className="fixed bottom-0 left-0 w-full z-50 px-4 pb-6 pt-2 bg-gradient-to-t from-[#F2F2F7] via-[#F2F2F7] to-transparent">
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
                className="relative w-full bg-transparent border-none rounded-[26px] py-[13px] px-5 pr-12 text-[17px] leading-[1.3] text-black placeholder-gray-400 focus:ring-0 focus:outline-none resize-none overflow-hidden max-h-[120px] font-normal disabled:opacity-50"
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
                className={`absolute right-1.5 bottom-1.5 p-2 rounded-full transition-all duration-200 ${
                    text.trim() && !disabled 
                    ? 'bg-blue-500 text-white scale-100 opacity-100' 
                    : 'bg-gray-200 text-gray-400 scale-90 opacity-0 pointer-events-none'
                }`}
            >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
            </button>
        </div>
      </div>
    </div>
  );
};

export default InputArea;