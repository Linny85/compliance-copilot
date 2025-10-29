export default function AdminPage({
  title,
  subtitle,
  children,
}: {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="container mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-6">
      {title && <h1 className="text-center text-2xl font-semibold">{title}</h1>}
      {subtitle && (
        <p className="mt-1 text-center text-muted-foreground">{subtitle}</p>
      )}
      <div className="mt-6">{children}</div>
    </div>
  );
}
