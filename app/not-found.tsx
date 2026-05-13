import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-gutter">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-lg flex h-16 w-16 items-center justify-center rounded-full bg-surface-container-low">
          <Icon name="error" size={32} className="text-on-surface-variant" />
        </div>
        <h1 className="text-headline-lg text-on-surface">Page not found</h1>
        <p className="mt-sm text-body-md text-on-surface-variant">
          The page you&rsquo;re looking for doesn&rsquo;t exist or has moved.
        </p>
        <div className="mt-xl">
          <Link href="/dashboard">
            <Button leadingIcon={<Icon name="arrow_back" />}>
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
