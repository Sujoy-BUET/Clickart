import { ShoppingBag } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function EmptyState({ icon: Icon = ShoppingBag, title = 'Nothing here', message = '', actionLabel, actionTo }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
      <div className="rounded-full bg-gray-800 p-5">
        <Icon className="h-10 w-10 text-gray-600" />
      </div>
      <h3 className="text-lg font-semibold text-gray-300">{title}</h3>
      {message && <p className="max-w-sm text-sm text-gray-500">{message}</p>}
      {actionLabel && actionTo && (
        <Link
          to={actionTo}
          className="mt-2 rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-violet-500 transition"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
