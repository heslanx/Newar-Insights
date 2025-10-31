import { ReactNode } from 'react';

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className = ''
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className}`}>
      <div className="mb-4 text-grey-40 opacity-50">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">
        {title}
      </h3>
      {description && (
        <p className="text-sm text-grey-60 max-w-sm mb-6">
          {description}
        </p>
      )}
      {action && (
        <div>
          {action}
        </div>
      )}
    </div>
  );
}

// Predefined empty states for common scenarios

export function EmptyRecordingsState({ onAction }: { onAction?: () => void }) {
  return (
    <EmptyState
      icon={
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <circle cx="12" cy="12" r="10" strokeWidth="2"/>
          <circle cx="12" cy="12" r="3" fill="currentColor"/>
        </svg>
      }
      title="Nenhuma gravação ainda"
      description="Comece gravando uma reunião do Google Meet para ver suas gravações aqui."
      action={onAction && (
        <button
          onClick={onAction}
          className="px-4 py-2 bg-blue text-white rounded-md hover:bg-blue/90 transition-colors"
        >
          Gravar Primeira Reunião
        </button>
      )}
    />
  );
}

export function EmptySearchState({ query }: { query: string }) {
  return (
    <EmptyState
      icon={
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <circle cx="11" cy="11" r="8" strokeWidth="2"/>
          <path d="m21 21-4.35-4.35" strokeWidth="2"/>
        </svg>
      }
      title="Nenhum resultado encontrado"
      description={`Não encontramos resultados para "${query}". Tente termos diferentes.`}
    />
  );
}

export function ErrorState({ error, onRetry }: { error: string; onRetry?: () => void }) {
  return (
    <EmptyState
      icon={
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <circle cx="12" cy="12" r="10" strokeWidth="2"/>
          <line x1="15" y1="9" x2="9" y2="15" strokeWidth="2"/>
          <line x1="9" y1="9" x2="15" y2="15" strokeWidth="2"/>
        </svg>
      }
      title="Algo deu errado"
      description={error}
      action={onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-grey-10 text-white rounded-md hover:bg-grey-20 transition-colors"
        >
          Tentar Novamente
        </button>
      )}
    />
  );
}

export function NotAuthenticatedState({ onAction }: { onAction?: () => void }) {
  return (
    <EmptyState
      icon={
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" strokeWidth="2"/>
          <path d="M7 11V7a5 5 0 0 1 10 0v4" strokeWidth="2"/>
        </svg>
      }
      title="Autenticação necessária"
      description="Faça login ou configure sua chave da API para começar a usar o Newar Insights."
      action={onAction && (
        <button
          onClick={onAction}
          className="px-4 py-2 bg-blue text-white rounded-md hover:bg-blue/90 transition-colors"
        >
          Configurar API Key
        </button>
      )}
    />
  );
}

export function NotOnMeetState() {
  return (
    <EmptyState
      icon={
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <rect x="2" y="7" width="20" height="15" rx="2" ry="2" strokeWidth="2"/>
          <polyline points="17 2 12 7 7 2" strokeWidth="2"/>
        </svg>
      }
      title="Você não está em uma reunião"
      description="Abra uma reunião do Google Meet para começar a gravar."
    />
  );
}
