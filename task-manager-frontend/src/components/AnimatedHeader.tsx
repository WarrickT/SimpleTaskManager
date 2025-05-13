import { useEffect, useState } from 'react';

const AnimatedHeader = () => {
  const fullText = 'This is your \nSimple Task Manager.';
  const [displayText, setDisplayText] = useState('');
  const [showCursor, setShowCursor] = useState(true);

  useEffect(() => {
    let current = 0;
    const interval = setInterval(() => {
      setDisplayText(fullText.slice(0, current + 1));
      current++;
      if (current === fullText.length) clearInterval(interval);
    }, 80);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const cursorBlink = setInterval(() => setShowCursor((prev) => !prev), 500);
    return () => clearInterval(cursorBlink);
  }, []);

  return (
    <div className="text-4xl md:text-5xl lg:text-6xl font-bold text-white h-[80px]">
      <span>{displayText}</span>
      <span className={`inline-block w-[1ch] ${showCursor ? 'opacity-100' : 'opacity-0'}`}>|</span>
    </div>
  );
};

export default AnimatedHeader;