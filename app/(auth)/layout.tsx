export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4 py-10">
      <div className="mb-8 text-center">
        <div className="text-2xl font-bold tracking-tight">
          TOBB ETÜ <span className="text-primary">Racing</span>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">Yönetim Paneli</p>
      </div>
      <div className="w-full max-w-sm rounded-xl border bg-card p-6 shadow-sm">
        {children}
      </div>
    </div>
  );
}
