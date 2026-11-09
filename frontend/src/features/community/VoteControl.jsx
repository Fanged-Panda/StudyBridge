import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowBigDown, ArrowBigUp } from 'lucide-react';
import { communityApi } from '../../services/api';

const sizes = {
  sm: { button: 'h-7 w-7', icon: 15, score: 'text-xs' },
  md: { button: 'h-8 w-8', icon: 17, score: 'text-sm' },
  lg: { button: 'h-10 w-10', icon: 20, score: 'text-base' },
};

/**
 * Up/down vote pair, done the way Reddit does it: one vote per member, clicking
 * the active arrow again removes it. Voting needs an account, so signed-out
 * visitors are sent to the login page with a way back.
 */
const VoteControl = ({ slug, score = 0, myVote = 0, size = 'md', layout = 'row', className = '' }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [total, setTotal] = useState(Number(score) || 0);
  const [vote, setVote] = useState(Number(myVote) || 0);
  const [busy, setBusy] = useState(false);

  const dims = sizes[size] || sizes.md;

  const cast = async (next) => {
    if (busy) return;
    if (!localStorage.getItem('token')) {
      navigate('/login', { state: { from: location.pathname } });
      return;
    }

    const value = next === vote ? 0 : next;
    const previous = { total, vote };

    // Optimistic: the arrows react immediately, then we trust the server total.
    setTotal(total - vote + value);
    setVote(value);
    setBusy(true);

    try {
      const data = await communityApi.vote(slug, value);
      setTotal(Number(data?.score) || 0);
      setVote(Number(data?.myVote) || 0);
    } catch {
      setTotal(previous.total);
      setVote(previous.vote);
    } finally {
      setBusy(false);
    }
  };

  const layoutClass = layout === 'column' ? 'flex-col' : 'flex-row items-center';

  return (
    <div className={`inline-flex ${layoutClass} gap-0.5 ${className}`} role="group" aria-label="Upvote or downvote this post">
      <button
        type="button"
        onClick={() => cast(1)}
        aria-pressed={vote === 1}
        aria-label="Upvote"
        className={`inline-flex ${dims.button} items-center justify-center rounded-full transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
          vote === 1 ? 'bg-accent/15 text-accent' : 'text-text-muted hover:bg-slate-100 hover:text-accent'
        }`}
      >
        <ArrowBigUp size={dims.icon} strokeWidth={2.2} fill={vote === 1 ? 'currentColor' : 'none'} />
      </button>

      <span
        aria-live="polite"
        className={`min-w-6 text-center font-extrabold tabular-nums ${dims.score} ${
          vote === 1 ? 'text-accent' : vote === -1 ? 'text-red-500' : 'text-primary'
        }`}
      >
        {total}
      </span>

      <button
        type="button"
        onClick={() => cast(-1)}
        aria-pressed={vote === -1}
        aria-label="Downvote"
        className={`inline-flex ${dims.button} items-center justify-center rounded-full transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
          vote === -1 ? 'bg-red-50 text-red-500' : 'text-text-muted hover:bg-slate-100 hover:text-red-500'
        }`}
      >
        <ArrowBigDown size={dims.icon} strokeWidth={2.2} fill={vote === -1 ? 'currentColor' : 'none'} />
      </button>
    </div>
  );
};

export default VoteControl;
