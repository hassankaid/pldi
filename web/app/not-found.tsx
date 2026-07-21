import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-ground p-4">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2 text-ink">404</h1>
        <p className="text-ink-soft mb-6">Page introuvable</p>
        <Link href="/" className={buttonVariants()}>
          Retour au dashboard
        </Link>
      </div>
    </div>
  );
}
