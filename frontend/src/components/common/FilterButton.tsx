import { FunnelIcon } from '@heroicons/react/24/outline';

interface FilterButtonProps {
  isActive: boolean;
  onClick: () => void;
}

export default function FilterButton({ isActive, onClick }: FilterButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`p-2 rounded-lg transition-colors ${
        isActive 
          ? 'bg-primary-100 text-primary-600' 
          : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
      }`}
      title="Toggle Filters"
    >
      <FunnelIcon className="h-5 w-5" />
    </button>
  );
}
