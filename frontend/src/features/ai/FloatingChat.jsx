import { MessageCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

const FloatingChat = () => (
  <>
    <Link
      to="/chatbot"
      className="fixed bottom-6 right-6 z-[60] flex h-14 w-14 items-center justify-center rounded-full bg-primary shadow-lg transition-all duration-300 hover:scale-105 hover:bg-opacity-90"
      aria-label="Open AI advisor"
      title="Open AI advisor"
    >
      <MessageCircle className="h-6 w-6 text-white" />
    </Link>

    {/* Pulse ring */}
    <span className="pointer-events-none fixed bottom-6 right-6 z-[59] h-14 w-14 animate-ping rounded-full bg-accent/30" />
  </>
);

export default FloatingChat;
