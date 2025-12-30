/**
 * Reusable Action Buttons Component
 * View, Edit, Delete icons
 */

import { EyeIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';

interface ActionButtonsProps {
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  showView?: boolean;
  showEdit?: boolean;
  showDelete?: boolean;
  disableEdit?: boolean;
  disableDelete?: boolean;
}

export default function ActionButtons({
  onView,
  onEdit,
  onDelete,
  showView = true,
  showEdit = true,
  showDelete = true,
  disableEdit = false,
  disableDelete = false,
}: ActionButtonsProps) {
  return (
    <div className="flex items-center space-x-2">
      {showView && onView && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onView();
          }}
          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
          title="View"
        >
          <EyeIcon className="h-4 w-4" />
        </button>
      )}
      
      {showEdit && onEdit && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (!disableEdit) onEdit();
          }}
          disabled={disableEdit}
          className={`p-1.5 rounded transition-colors ${
            disableEdit 
              ? 'text-gray-300 cursor-not-allowed' 
              : 'text-gray-400 hover:text-primary-600 hover:bg-primary-50'
          }`}
          title={disableEdit ? 'Edit (Disabled - Trial Expired)' : 'Edit'}
        >
          <PencilIcon className="h-4 w-4" />
        </button>
      )}
      
      {showDelete && onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (!disableDelete) onDelete();
          }}
          disabled={disableDelete}
          className={`p-1.5 rounded transition-colors ${
            disableDelete 
              ? 'text-gray-300 cursor-not-allowed' 
              : 'text-gray-400 hover:text-red-600 hover:bg-red-50'
          }`}
          title={disableDelete ? 'Delete (Disabled - Trial Expired)' : 'Delete'}
        >
          <TrashIcon className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
