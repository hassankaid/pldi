import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">404</h1>
        <p className="text-muted-foreground mb-6">Page introuvable</p>
        <Button asChild>
          <Link href="/">Retour au dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
