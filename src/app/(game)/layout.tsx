import { Toaster } from "@/components/ui/toaster";

export default function GameLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      {children}
      <Toaster />
    </>
  );
}
