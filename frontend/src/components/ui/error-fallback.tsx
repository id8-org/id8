import { Alert, AlertDescription, AlertTitle } from "./alert";
import { Button } from "./button";
import { ScrollArea } from "./scroll-area";

interface ErrorFallbackProps {
  error: {
    message: string;
    issues?: Array<{
      code: string;
      path: string[];
      message: string;
    }>;
  };
  resetErrorBoundary?: () => void;
  className?: string;
}

export function ErrorFallback({
  error,
  resetErrorBoundary,
  className = "",
}: ErrorFallbackProps) {
  const isZodError = error.issues && Array.isArray(error.issues);

  return (
    <Alert variant="destructive" className={`my-4 ${className}`}>
      <AlertTitle>Invalid Response Format</AlertTitle>
      <AlertDescription className="mt-2">
        <div className="mb-4">
          {isZodError ? (
            <ScrollArea className="h-[200px] rounded-md border p-4">
              <div className="space-y-2">
                <p className="font-medium">Validation Errors:</p>
                {error.issues.map((issue, index) => (
                  <div key={index} className="text-sm">
                    <span className="font-medium">
                      {issue.path.join(".")}:
                    </span>{" "}
                    {issue.message}
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <p>{error.message}</p>
          )}
        </div>
        {resetErrorBoundary && (
          <Button
            variant="outline"
            onClick={resetErrorBoundary}
            className="mt-2"
          >
            Try Again
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
} 