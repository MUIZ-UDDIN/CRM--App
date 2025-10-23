import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import toast from 'react-hot-toast';
import * as dealsService from '../services/dealsService';
import ActionButtons from '../components/common/ActionButtons';
import SearchableContactSelect from '../components/common/SearchableContactSelect';
import { 
  PlusIcon, 
  XMarkIcon,
  BuildingOfficeIcon,
  UserIcon,
  Bars3Icon,
} from '@heroicons/react/24/outline';

interface Deal {
  id: string;
  title: string;
  value: number;
  company?: string;
  contact?: string;
  stage_id: string;
  pipeline_id: string;
  expected_close_date?: string;
}

interface Stage {
  id: string;
  name: string;
  color: string;
  textColor: string;
}

export default function Deals() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [showAddDealModal, setShowAddDealModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [loading, setLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [dealToDelete, setDealToDelete] = useState<Deal | null>(null);
  const [dealFormData, setDealFormData] = useState({
    title: '',
    value: '',
    company: '',
    contact: '',
    stage_id: 'qualification',
    expectedCloseDate: ''
  });

  // Get today's date in YYYY-MM-DD format for min date
  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  // Check if deal is expired
  const isDealExpired = (expectedCloseDate?: string) => {
    if (!expectedCloseDate) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const closeDate = new Date(expectedCloseDate);
    closeDate.setHours(0, 0, 0, 0);
    return closeDate < today;
  };

  // Get expiration message
  const getExpirationMessage = (expectedCloseDate?: string) => {
    if (!expectedCloseDate) return null;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const closeDate = new Date(expectedCloseDate);
    closeDate.setHours(0, 0, 0, 0);
    
    const diffTime = closeDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return { text: 'Expired', color: 'text-red-600 bg-red-50' };
    } else if (diffDays === 0) {
      return { text: 'Expires today', color: 'text-orange-600 bg-orange-50' };
    } else if (diffDays === 1) {
      return { text: 'Expires tomorrow', color: 'text-yellow-600 bg-yellow-50' };
    } else if (diffDays <= 7) {
      return { text: `${diffDays} days left`, color: 'text-yellow-600 bg-yellow-50' };
    } else {
      return { text: `Active until ${closeDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`, color: 'text-green-600 bg-green-50' };
    }
  };

  const [deals, setDeals] = useState<Record<string, Deal[]>>({
    qualification: [],
    proposal: [],
    negotiation: [],
    'closed-won': []
  });
  const [contacts, setContacts] = useState<any[]>([]);

  const stages: Stage[] = [
    { id: 'qualification', name: 'Qualification', color: 'bg-blue-50 border-blue-200', textColor: 'text-blue-700' },
    { id: 'proposal', name: 'Proposal', color: 'bg-yellow-50 border-yellow-200', textColor: 'text-yellow-700' },
    { id: 'negotiation', name: 'Negotiation', color: 'bg-orange-50 border-orange-200', textColor: 'text-orange-700' },
    { id: 'closed-won', name: 'Closed Won', color: 'bg-green-50 border-green-200', textColor: 'text-green-700' }
  ];

  // Fetch contacts
  useEffect(() => {
    const fetchContacts = async () => {
      try {
        const token = localStorage.getItem('token');
        const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        const response = await fetch(`${API_BASE_URL}/api/contacts/`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setContacts(data);
        }
      } catch (error) {
        console.error('Error fetching contacts:', error);
      }
    };
    fetchContacts();
  }, []);

  // Check for action query parameter
  useEffect(() => {
    const action = searchParams.get('action');
    if (action === 'add') {
      setShowAddDealModal(true);
      searchParams.delete('action');
      setSearchParams(searchParams);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchDeals();
  }, []);

  const fetchDeals = async () => {
    setLoading(true);
    try {
      const data = await dealsService.getDeals();
      
      // Group deals by stage
      const grouped: Record<string, Deal[]> = {
        qualification: [],
        proposal: [],
        negotiation: [],
        'closed-won': []
      };
      
      data.forEach((deal: Deal) => {
        if (grouped[deal.stage_id]) {
          grouped[deal.stage_id].push(deal);
        } else {
          console.warn('Unknown stage_id:', deal.stage_id, 'for deal:', deal.title);
        }
      });
      
      setDeals(grouped);
    } catch (error) {
      console.error('Error fetching deals:', error);
      toast.error('Failed to load deals');
      setDeals({
        qualification: [],
        proposal: [],
        negotiation: [],
        'closed-won': []
      });
    } finally {
      setLoading(false);
    }
  };

  // Check if input contains HTML tags or scripts
  const containsHTMLOrScript = (input: string): boolean => {
    // Check for any HTML tags, script tags, or event handlers
    const htmlPattern = /<[^>]*>/g;
    const scriptPattern = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;
    const jsPattern = /javascript:/gi;
    const eventPattern = /on\w+\s*=/gi;
    
    return htmlPattern.test(input) || 
           scriptPattern.test(input) || 
           jsPattern.test(input) || 
           eventPattern.test(input);
  };

  // Sanitize input to prevent script injection (only used for display, not validation)
  const sanitizeInput = (input: string): string => {
    // Remove HTML tags and script content
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<[^>]*>/g, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .trim();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // For text inputs, don't allow HTML at all
    if (name === 'title' || name === 'company') {
      // Enforce 255 character limit for text fields
      if (value.length > 255) {
        toast.error(`${name === 'title' ? 'Deal Title' : 'Company'} cannot exceed 255 characters`);
        return;
      }
      
      // Check if input contains HTML/scripts
      if (containsHTMLOrScript(value)) {
        toast.error('HTML tags and scripts are not allowed. Please enter plain text only.');
        return; // Don't update the state with invalid input
      }
    }
    
    setDealFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const resetDealForm = () => {
    setDealFormData({
      title: '',
      value: '',
      company: '',
      contact: '',
      stage_id: 'qualification',
      expectedCloseDate: ''
    });
  };

  const handleCloseAddModal = () => {
    setShowAddDealModal(false);
    resetDealForm();
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    resetDealForm();
  };

  const handleAddDeal = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Validate that title and company don't contain HTML/scripts
      if (containsHTMLOrScript(dealFormData.title) || containsHTMLOrScript(dealFormData.company)) {
        toast.error('Cannot create deal: HTML tags and scripts are not allowed. Please use plain text only.');
        return;
      }

      // Validate positive number
      const dealValue = parseFloat(dealFormData.value);
      if (dealValue <= 0 || isNaN(dealValue)) {
        toast.error('Please enter a positive number for deal value');
        return;
      }

      await dealsService.createDeal({
        title: dealFormData.title,
        value: dealValue,
        company: dealFormData.company,
        contact: dealFormData.contact,
        stage_id: dealFormData.stage_id,
        pipeline_id: '1', // Default pipeline
        expected_close_date: dealFormData.expectedCloseDate ? dealFormData.expectedCloseDate + "T00:00:00" : undefined
      });
      toast.success('Deal created successfully!');
      setShowAddDealModal(false);
      setDealFormData({
        title: '',
        value: '',
        company: '',
        contact: '',
        stage_id: 'qualification',
        expectedCloseDate: ''
      });
      fetchDeals();
    } catch (error) {
      toast.error('Failed to create deal');
    }
  };

  const handleView = (deal: Deal) => {
    setSelectedDeal(deal);
    setShowViewModal(true);
  };

  const handleEdit = (deal: Deal) => {
    setSelectedDeal(deal);
    setDealFormData({
      title: deal.title,
      value: deal.value.toString(),
      company: deal.company || '',
      contact: deal.contact || '',
      stage_id: deal.stage_id,
      expectedCloseDate: ''
    });
    setShowEditModal(true);
  };

  const handleUpdate = async () => {
    if (!selectedDeal) return;
    try {
      // Validate that title and company don't contain HTML/scripts
      if (containsHTMLOrScript(dealFormData.title) || containsHTMLOrScript(dealFormData.company)) {
        toast.error('Cannot update deal: HTML tags and scripts are not allowed. Please use plain text only.');
        return;
      }

      await dealsService.updateDeal(selectedDeal.id, {
        title: dealFormData.title,
        value: parseFloat(dealFormData.value),
        company: dealFormData.company,
        contact: dealFormData.contact,
      });
      toast.success('Deal updated');
      setShowEditModal(false);
      resetDealForm();
      setSelectedDeal(null);
      fetchDeals();
    } catch (error) {
      toast.error('Failed to update deal');
    }
  };

  const handleDelete = (deal: Deal) => {
    setDealToDelete(deal);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!dealToDelete) return;
    try {
      await dealsService.deleteDeal(dealToDelete.id);
      toast.success('Deal deleted successfully');
      setShowDeleteModal(false);
      setDealToDelete(null);
      fetchDeals();
    } catch (error) {
      toast.error('Failed to delete deal');
    }
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setDealToDelete(null);
  };

  const getTotalValue = (deals: Deal[]) => {
    return deals.reduce((sum, deal) => sum + deal.value, 0);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value);
  };

  // Handle drag and drop
  const onDragEnd = async (result: any) => {
    const { source, destination, draggableId } = result;

    if (!destination) {
      return;
    }
    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return;
    }

    const sourceStage = source.droppableId;
    const destStage = destination.droppableId;

    // Create new deals object
    const newDeals = { ...deals };
    const sourceDeals = Array.from(newDeals[sourceStage]);
    const destDeals = sourceStage === destStage ? sourceDeals : Array.from(newDeals[destStage]);

    // Find and move the deal
    const [movedDeal] = sourceDeals.splice(source.index, 1);
    movedDeal.stage_id = destStage;
    destDeals.splice(destination.index, 0, movedDeal);

    // Update state
    newDeals[sourceStage] = sourceDeals;
    newDeals[destStage] = destDeals;
    setDeals(newDeals);

    // Update backend
    try {
      await dealsService.moveDealStage(draggableId, sourceStage, destStage);
      toast.success('Deal moved successfully');
    } catch (error) {
      toast.error('Failed to move deal');
      fetchDeals(); // Revert on error
    }
  };

  return (
    <div className="min-h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="px-4 sm:px-6 lg:max-w-7xl lg:mx-auto lg:px-8">
          <div className="py-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold leading-7 text-gray-900">Deals Pipeline</h1>
              <p className="mt-1 text-sm text-gray-500">
                Manage your sales pipeline with drag-and-drop functionality
              </p>
            </div>
            <button
              onClick={() => setShowAddDealModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-red-600 hover:bg-red-700"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Add New Deal
            </button>
          </div>
        </div>
      </div>

      {/* Pipeline Board */}
      <div className="px-4 sm:px-6 lg:max-w-7xl lg:mx-auto lg:px-8 py-6">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : (
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {stages.map((stage) => (
                <div key={stage.id} className={`rounded-lg border-2 ${stage.color} p-4`}>
                  {/* Stage Header */}
                  <div className="mb-4">
                    <div className="flex justify-between items-center">
                      <h3 className={`font-semibold ${stage.textColor}`}>{stage.name}</h3>
                      <span className={`text-sm ${stage.textColor}`}>
                        {deals[stage.id]?.length || 0} deals
                      </span>
                    </div>
                    <p className={`text-lg font-bold ${stage.textColor} mt-1`}>
                      {formatCurrency(getTotalValue(deals[stage.id] || []))}
                    </p>
                  </div>

                  {/* Droppable Area */}
                  <Droppable droppableId={stage.id}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`min-h-[200px] space-y-3 ${
                          snapshot.isDraggingOver ? 'bg-white bg-opacity-50 rounded-lg' : ''
                        }`}
                      >
                        {(deals[stage.id] || []).map((deal, index) => (
                          <Draggable key={deal.id} draggableId={deal.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className={`bg-white rounded-lg p-4 shadow-sm border border-gray-200 hover:shadow-md transition-shadow ${
                                  snapshot.isDragging ? 'shadow-lg ring-2 ring-primary-500' : ''
                                }`}
                              >
                                {/* Drag Handle */}
                                <div className="flex items-start justify-between mb-2">
                                  <div
                                    {...provided.dragHandleProps}
                                    className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-100 rounded"
                                  >
                                    <Bars3Icon className="h-4 w-4 text-gray-400" />
                                  </div>
                                  <ActionButtons
                                    onView={() => handleView(deal)}
                                    onEdit={() => handleEdit(deal)}
                                    onDelete={() => handleDelete(deal)}
                                  />
                                </div>

                                {/* Deal Info */}
                                <h4 className="font-medium text-gray-900 mb-2">{deal.title}</h4>
                                <div className="space-y-1 text-sm text-gray-600">
                                  <div className="flex items-center">
                                    <BuildingOfficeIcon className="h-4 w-4 mr-2 text-gray-400" />
                                    <span>{deal.company}</span>
                                  </div>
                                  <div className="flex items-center">
                                    <UserIcon className="h-4 w-4 mr-2 text-gray-400" />
                                    <span>{deal.contact}</span>
                                  </div>
                                  {deal.expected_close_date && getExpirationMessage(deal.expected_close_date) && (
                                    <div className="mt-2">
                                      <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${getExpirationMessage(deal.expected_close_date)?.color}`}>
                                        {getExpirationMessage(deal.expected_close_date)?.text}
                                      </span>
                                    </div>
                                  )}
                                  <div className="mt-2 pt-2 border-t border-gray-200">
                                    <span className="font-semibold text-gray-900">
                                      {formatCurrency(deal.value)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}

                        {/* Add Deal Button */}
                        <button
                          onClick={() => {
                            setDealFormData({ ...dealFormData, stage_id: stage.id });
                            setShowAddDealModal(true);
                          }}
                          className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-gray-400 hover:text-gray-600 transition-colors"
                        >
                          Add Deal
                        </button>
                      </div>
                    )}
                  </Droppable>
                </div>
              ))}
            </div>
          </DragDropContext>
        )}
      </div>

      {/* Add Deal Modal */}
      {showAddDealModal && (
        <div 
          className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4" 
          onClick={handleCloseAddModal}
          onMouseDown={(e) => e.target === e.currentTarget && e.preventDefault()}
          style={{ isolation: 'isolate' }}
        >
          <div className="relative mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white pointer-events-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Add New Deal</h3>
              <button onClick={handleCloseAddModal} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleAddDeal} className="space-y-4">
              <div className="relative">
                <input
                  type="text"
                  name="title"
                  placeholder="Deal Title"
                  value={dealFormData.title}
                  onChange={handleInputChange}
                  required
                  maxLength={255}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
                <p className="text-xs text-gray-400 mt-1">{dealFormData.title.length}/255</p>
              </div>
              <input
                type="number"
                name="value"
                placeholder="Deal Value"
                value={dealFormData.value}
                onChange={handleInputChange}
                onKeyDown={(e) => {
                  if (e.key === '-' || e.key === 'e' || e.key === 'E') {
                    e.preventDefault();
                  }
                }}
                required
                min="0.01"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
              <div className="relative">
                <input
                  type="text"
                  name="company"
                  placeholder="Company"
                  value={dealFormData.company}
                  onChange={handleInputChange}
                  maxLength={255}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
                <p className="text-xs text-gray-400 mt-1">{dealFormData.company.length}/255</p>
              </div>
              <SearchableContactSelect
                contacts={contacts}
                value={dealFormData.contact}
                onChange={(value) => setDealFormData(prev => ({ ...prev, contact: value }))}
                placeholder="Search and select contact..."
              />
              <select
                name="stage_id"
                value={dealFormData.stage_id}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                {stages.map(stage => (
                  <option key={stage.id} value={stage.id}>{stage.name}</option>
                ))}
              </select>
              <div className="relative">
                <input
                  type="date"
                  name="expectedCloseDate"
                  placeholder="Expected Close Date"
                  value={dealFormData.expectedCloseDate}
                  onChange={handleInputChange}
                  min={getTodayDate()}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 cursor-pointer"
                  onClick={(e) => e.currentTarget.showPicker && e.currentTarget.showPicker()}
                />
                {dealFormData.expectedCloseDate && (
                  <p className="text-xs text-gray-500 mt-1">
                    Deal will be active until {new Date(dealFormData.expectedCloseDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                )}
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseAddModal}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
                >
                  Create Deal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Deal Modal */}
      {showEditModal && (
        <div 
          className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4" 
          onClick={handleCloseEditModal}
          onMouseDown={(e) => e.target === e.currentTarget && e.preventDefault()}
          style={{ isolation: 'isolate' }}
        >
          <div className="relative mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white pointer-events-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Edit Deal</h3>
              <button onClick={handleCloseEditModal} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <input
                type="text"
                name="title"
                placeholder="Deal Title"
                value={dealFormData.title}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
              <input
                type="number"
                name="value"
                placeholder="Deal Value"
                value={dealFormData.value}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
              <input
                type="text"
                name="company"
                placeholder="Company"
                value={dealFormData.company}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
              <SearchableContactSelect
                contacts={contacts}
                value={dealFormData.contact}
                onChange={(value) => setDealFormData(prev => ({ ...prev, contact: value }))}
                placeholder="Search and select contact..."
              />
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={handleCloseEditModal}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdate}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Deal Modal */}
      {showViewModal && selectedDeal && (
        <div 
          className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4" 
          onClick={() => setShowViewModal(false)}
          onMouseDown={(e) => e.target === e.currentTarget && e.preventDefault()}
          style={{ isolation: 'isolate' }}
        >
          <div className="relative mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white pointer-events-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Deal Details</h3>
              <button onClick={() => setShowViewModal(false)} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-500">Title</label>
                <p className="text-gray-900">{selectedDeal.title}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Value</label>
                <p className="text-gray-900">{formatCurrency(selectedDeal.value)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Company</label>
                <p className="text-gray-900">{selectedDeal.company || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Contact</label>
                <p className="text-gray-900">{selectedDeal.contact || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Stage</label>
                <p className="text-gray-900 capitalize">{selectedDeal.stage_id.replace('-', ' ')}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && dealToDelete && (
        <div 
          className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4" 
          onClick={cancelDelete}
          onMouseDown={(e) => e.target === e.currentTarget && e.preventDefault()}
          style={{ isolation: 'isolate' }}
        >
          <div className="relative mx-auto p-6 border w-full max-w-md shadow-lg rounded-md bg-white pointer-events-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Confirm Deletion</h3>
              <button onClick={cancelDelete} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="mb-6">
              <p className="text-gray-700">
                Are you sure you want to delete <span className="font-semibold">"{dealToDelete.title}"</span>?
              </p>
              <p className="text-sm text-gray-500 mt-2">
                This action cannot be undone.
              </p>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={cancelDelete}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                No, Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
