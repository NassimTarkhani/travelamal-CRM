import React from 'react';

interface State {
    error: Error | null;
    errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<React.PropsWithChildren, State> {
    constructor(props: React.PropsWithChildren) {
        super(props);
        this.state = { error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error: Error) {
        return { error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        this.setState({ error, errorInfo });
        // eslint-disable-next-line no-console
        console.error('Uncaught error:', error, errorInfo);
    }

    render() {
        if (this.state.error) {
            return (
                <div className="p-8">
                    <h1 className="text-2xl font-bold text-red-600">An error occurred</h1>
                    <p className="mt-4 text-sm text-foreground">{this.state.error?.message}</p>
                    <pre className="mt-4 whitespace-pre-wrap bg-slate-100 p-4 rounded">{this.state.errorInfo?.componentStack}</pre>
                </div>
            );
        }

        return this.props.children as React.ReactElement;
    }
}

export default ErrorBoundary;
