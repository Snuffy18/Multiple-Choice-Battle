import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-10 px-4">
      {/* Hero */}
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="text-7xl">⚔️</div>
        <h1 className="font-display font-extrabold text-6xl md:text-7xl text-offwhite leading-none tracking-tight">
          Exam<span className="text-violet">Battle</span>
        </h1>
        <p className="text-muted font-body text-lg max-w-sm">
          Duel your classmates over exam questions. Outlast them in a real-time 1v1 battle of knowledge.
        </p>
      </div>

      {/* CTA */}
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <div className="flex gap-3">
          <Button
            className="flex-1 py-4 text-lg"
            onClick={() => navigate('/create')}
          >
            Create Battle
          </Button>
          <Button
            variant="secondary"
            className="flex-1 py-4 text-lg"
            onClick={() => navigate('/join')}
          >
            Join Battle
          </Button>
        </div>
        <Button
          variant="secondary"
          className="w-full py-3"
          onClick={() => navigate('/solo')}
        >
          Solo Practice
        </Button>
      </div>

      {/* Admin link */}
      <button
        className="text-xs text-muted hover:text-offwhite transition-colors font-body"
        onClick={() => navigate('/admin/questions')}
      >
        Manage Question Banks →
      </button>
    </div>
  );
}
