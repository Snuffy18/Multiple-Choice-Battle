import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

export function QuestionBankList({ banks, onSelect, onDelete, selectedId }) {
  if (banks.length === 0) {
    return (
      <p className="text-muted font-body text-sm text-center py-8">
        No question banks yet. Create one to get started.
      </p>
    );
  }

  return (
    <div className="grid gap-3">
      {banks.map((bank) => (
        <Card
          key={bank.id}
          className={`flex items-center justify-between cursor-pointer transition-all hover:border-violet/40 ${
            selectedId === bank.id ? 'border-violet bg-violet/10' : ''
          }`}
          onClick={() => onSelect(bank)}
        >
          <div>
            <p className="font-display font-semibold text-offwhite">{bank.topic}</p>
            <p className="text-xs text-muted font-body mt-0.5">
              {bank.question_count ?? '?'} questions
            </p>
          </div>
          <Button
            variant="danger"
            className="text-xs px-3 py-1.5"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(bank.id);
            }}
          >
            Delete
          </Button>
        </Card>
      ))}
    </div>
  );
}
