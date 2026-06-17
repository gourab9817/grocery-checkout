export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
      {Icon && (
        <div className="w-20 h-20 rounded-full bg-parchment border border-stone flex items-center justify-center mb-6">
          <Icon size={32} strokeWidth={1} className="text-sage" />
        </div>
      )}
      <h3 className="font-serif font-bold text-2xl text-forest mb-2">{title}</h3>
      {description && (
        <p className="text-forest/60 text-base max-w-xs leading-relaxed">{description}</p>
      )}
      {action && <div className="mt-8">{action}</div>}
    </div>
  );
}
