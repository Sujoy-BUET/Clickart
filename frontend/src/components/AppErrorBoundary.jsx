import React from 'react';

export default class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      message: '',
    };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      message: error?.message || 'Unexpected application error',
    };
  }

  componentDidCatch(error, errorInfo) {
    console.error('App crashed:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleResetSession = () => {
    localStorage.removeItem('clickart_user');
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-gray-950 px-4 text-gray-100">
          <div className="w-full max-w-lg rounded-xl border border-red-500/30 bg-red-500/10 p-6">
            <h1 className="text-lg font-semibold text-red-300">Something went wrong</h1>
            <p className="mt-2 text-sm text-red-200">{this.state.message}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={this.handleReload}
                className="rounded-lg bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-500"
              >
                Reload page
              </button>
              <button
                onClick={this.handleResetSession}
                className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm font-medium text-gray-200 hover:bg-gray-800"
              >
                Reset login data
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
