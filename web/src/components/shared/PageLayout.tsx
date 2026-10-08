interface PageLayoutProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
}

export function PageLayout({
  title,
  subtitle,
  action,
  children,
}: PageLayoutProps) {
  return (
    <div className="px-8 py-7 w-full">
      <div className="flex items-start justify-between mb-7">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-slate-800">{title}</h1>
          </div>
          {subtitle && (
            <div className="text-sm text-slate-500 mt-0.5">{subtitle}</div>
          )}
        </div>
        {action && <div>{action}</div>}
      </div>
      {children}
    </div>
  );
}
