import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: any) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * Error Boundary para capturar erros React e prevenir tela branca
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('[Newar Error Boundary]', error, errorInfo);
    
    // Callback customizado
    this.props.onError?.(error, errorInfo);
    
    // TODO: Enviar para Sentry ou serviço de error tracking
    // Sentry.captureException(error, { extra: errorInfo });
  }

  handleReload = () => {
    this.setState({ hasError: false, error: undefined });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-gray-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full text-center">
            <div className="mb-6">
              <svg
                className="w-16 h-16 mx-auto text-brand-danger"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            
            <h1 className="text-[24px] font-title text-white mb-2">
              Algo deu errado
            </h1>
            
            <p className="text-[14px] text-gray-60 mb-6">
              {this.state.error?.message || 'Ocorreu um erro inesperado'}
            </p>
            
            <div className="space-y-3">
              <button
                onClick={this.handleReload}
                className="w-full px-6 py-3 bg-brand-blue hover:bg-brand-blue/90 text-white rounded-lg font-medium transition-colors"
              >
                Recarregar Página
              </button>
              
              <button
                onClick={() => window.close()}
                className="w-full px-6 py-3 bg-gray-20 hover:bg-gray-30 text-white rounded-lg font-medium transition-colors"
              >
                Fechar
              </button>
            </div>
            
            {process.env.NODE_ENV === 'development' && (
              <details className="mt-6 text-left">
                <summary className="text-[12px] text-gray-50 cursor-pointer hover:text-white">
                  Detalhes do erro (dev)
                </summary>
                <pre className="mt-2 p-4 bg-gray-5 rounded text-[11px] text-gray-80 overflow-auto max-h-40">
                  {this.state.error?.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
