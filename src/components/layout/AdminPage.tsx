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
    <div className="w-full">
      <div className="container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-6">
        {title && <h1 className="text-2xl font-semibold text-center">{title}</h1>}
        {subtitle && (
          <p className="text-muted-foreground text-center mt-1">{subtitle}</p>
        )}
        {children}
      </div>
    </div>
  );
}
