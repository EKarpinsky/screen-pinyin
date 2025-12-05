

interface SelectionErrorProps {
  error: string;
}

export function SelectionError({ error }: SelectionErrorProps) {
  return (
    <div className="fixed inset-0 bg-black/90 text-white flex items-center justify-center text-2xl">
      Error: {error}
    </div>
  );
}

