import { useEffect, useState } from 'react';

type CopyButtonProps = {
  text: string;
  langLabel: string;
};

export function CopyButton({ text, langLabel }: CopyButtonProps) {
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (isCopied) {
      timer = setTimeout(() => setIsCopied(false), 1200);
    }

    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [isCopied]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setIsCopied(true);
    } catch (error) {
      console.error('Failed to copy code block', error);
    }
  };

  return (
    <button
      type="button"
      className="md-code__copy"
      aria-label="Copy code"
      title={`Copy ${langLabel}`}
      onClick={handleCopy}
    >
      {isCopied ? 'Скопировано!' : 'Copy'}
    </button>
  );
}
