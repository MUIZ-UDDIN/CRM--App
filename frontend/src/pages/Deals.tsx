import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import toast from 'react-hot-toast';
import * as dealsService from '../services/dealsService';
import ActionButtons from '../components/common/ActionButtons';
import SearchableContactSelect from '../components/common/SearchableContactSelect';
import { useSubmitOnce } from '../hooks/useSubmitOnce';
import { 
  PlusIcon, 
  XMarkIcon,
  BuildingOfficeIcon,
  UserIcon,
  Bars3Icon,
  MagnifyingGlassIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline';

interface Deal {
  id: string;
  title: string;
  value: number;
  company?: string;
  contact?: string;
  contact_id?: string;
  stage_id: string;
  pipeline_id: string;
  expected_close_date?: string;
  status?: string;
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
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedStages, setExpandedStages] = useState<string[]>([]);
  const [dealFormData, setDealFormData] = useState({
    title: '',
    value: '',
    company: '',
    contact: '',
    stage_id: 'qualification',
    pipeline_id: '',
    expectedCloseDate: '',
    status: 'open'
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

  const [deals, setDeals] = useState<Record<string, Deal[]>>({});
  const [contacts, setContacts] = useState<any[]>([]);
  const [stageMapping, setStageMapping] = useState<Record<string, string>>({}); // Maps hardcoded names to UUIDs
  const [pipelineId, setPipelineId] = useState<string>(''); // Store the actual pipeline UUID
  const [pipelines, setPipelines] = useState<any[]>([]); // Store all pipelines
  const [dynamicStages, setDynamicStages] = useState<Stage[]>([]); // Dynamic stages from backend

  // Fallback hardcoded stages (used if backend stages not loaded)
  const fallbackStages: Stage[] = [
    { id: 'qualification', name: 'Qualification', color: 'bg-blue-50 border-blue-200', textColor: 'text-blue-700' },
    { id: 'proposal', name: 'Proposal', color: 'bg-yellow-50 border-yellow-200', textColor: 'text-yellow-700' },
    { id: 'negotiation', name: 'Negotiation', color: 'bg-orange-50 border-orange-200', textColor: 'text-orange-700' },
    { id: 'closed-won', name: 'Closed Won', color: 'bg-green-50 border-green-200', textColor: 'text-green-700' }
  ];

  // Use dynamic stages if available, otherwise use fallback
  const stages = dynamicStages.length > 0 ? dynamicStages : fallbackStages;

  // Fetch pipelines and stages
  const fetchPipelinesAndStages = async () => {
      try {
        const token = localStorage.getItem('token');
        const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        
        // First, fetch all pipelines to get the default pipeline UUID
        const pipelinesResponse = await fetch(`${API_BASE_URL}/api/pipelines`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!pipelinesResponse.ok) {
          console.error('Failed to fetch pipelines:', pipelinesResponse.status, pipelinesResponse.statusText);
          return;
        }
        
        const pipelines = await pipelinesResponse.json();
        
        if (pipelines.length === 0) {
          console.error('No pipelines found in database');
          return;
        }
        
        // Store all pipelines
        setPipelines(pipelines);
        
        // Use the first pipeline's UUID as default
        const defaultPipelineId = pipelines[0].id;
        setPipelineId(defaultPipelineId); // Store for later use
        setDealFormData(prev => ({ ...prev, pipeline_id: defaultPipelineId }));
        
        // Fetch stages from the default pipeline using its UUID
        const stagesResponse = await fetch(`${API_BASE_URL}/api/pipelines/${defaultPipelineId}/stages`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (stagesResponse.ok) {
          const stages = await stagesResponse.json();
          
          if (stages.length === 0) {
            console.warn('No stages found in pipeline. Please create stages in Pipeline Settings.');
            toast.error('No stages found. Please create stages in Pipeline Settings first.');
            return;
          }
          
          // Create mapping from stage names to UUIDs
          const mapping: Record<string, string> = {};
          const dynamicStagesArray: Stage[] = [];
          const colors = [
            { color: 'bg-blue-50 border-blue-200', textColor: 'text-blue-700' },
            { color: 'bg-yellow-50 border-yellow-200', textColor: 'text-yellow-700' },
            { color: 'bg-orange-50 border-orange-200', textColor: 'text-orange-700' },
            { color: 'bg-green-50 border-green-200', textColor: 'text-green-700' },
            { color: 'bg-purple-50 border-purple-200', textColor: 'text-purple-700' },
            { color: 'bg-pink-50 border-pink-200', textColor: 'text-pink-700' },
          ];
          
          stages.forEach((stage: any, index: number) => {
            // Map stage ID to stage ID (use actual UUID)
            mapping[stage.id] = stage.id;
            
            // Create dynamic stage object
            const colorScheme = colors[index % colors.length];
            dynamicStagesArray.push({
              id: stage.id, // Use actual stage UUID
              name: stage.name,
              color: colorScheme.color,
              textColor: colorScheme.textColor
            });
          });
          
          setStageMapping(mapping);
          setDynamicStages(dynamicStagesArray);
          
          // Initialize deals state with dynamic stages
          const initialDeals: Record<string, Deal[]> = {};
          dynamicStagesArray.forEach(stage => {
            initialDeals[stage.id] = [];
          });
          setDeals(initialDeals);
          
          // Set default stage_id to the first stage if not already set
          if (dynamicStagesArray.length > 0 && !dealFormData.stage_id) {
            setDealFormData(prev => ({ ...prev, stage_id: dynamicStagesArray[0].id }));
          }
          
          // Expand first stage by default on mobile
          if (dynamicStagesArray.length > 0) {
            setExpandedStages([dynamicStagesArray[0].id]);
          }
        } else {
          console.error('Failed to fetch stages:', stagesResponse.status, stagesResponse.statusText);
        }
      } catch (error) {
        console.error('Error fetching pipeline stages:', error);
      }
    };

  // Fetch pipeline stages to get UUID mapping
  useEffect(() => {
    fetchPipelinesAndStages();
  }, []);

  // Poll pipelines every 5 seconds to catch new/updated pipelines
  useEffect(() => {
    const pollInterval = setInterval(() => {
      fetchPipelinesAndStages();
    }, 5000); // 5 seconds

    return () => clearInterval(pollInterval);
  }, []);

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
    // Only fetch deals after stage mapping is loaded
    if (Object.keys(stageMapping).length > 0) {
      fetchDeals();
    }
  }, [stageMapping]);

  // Add polling to sync deals across platforms
  useEffect(() => {
    if (Object.keys(stageMapping).length === 0) return;

    // Poll every 10 seconds to sync deals
    const pollInterval = setInterval(() => {
      fetchDeals();
    }, 10000); // 10 seconds

    return () => clearInterval(pollInterval);
  }, [stageMapping]);

  const fetchDeals = async () => {
    setLoading(true);
    try {
      const data = await dealsService.getDeals();
      
      // Initialize grouped object with all stages (using actual stage UUIDs)
      const grouped: Record<string, Deal[]> = {};
      dynamicStages.forEach(stage => {
        grouped[stage.id] = [];
      });
      
      // Group deals by stage (using actual stage UUID)
      data.forEach((deal: Deal) => {
        if (grouped[deal.stage_id]) {
          grouped[deal.stage_id].push(deal);
        } else {
          console.warn('Unknown stage_id:', deal.stage_id, 'for deal:', deal.title);
          console.warn('Available stages:', Object.keys(grouped));
          // Add to first stage as fallback
          const firstStageId = Object.keys(grouped)[0];
          if (firstStageId) {
            grouped[firstStageId].push(deal);
          }
        }
      });
      
      setDeals(grouped);
    } catch (error) {
      console.error('Error fetching deals:', error);
      toast.error('Failed to load deals');
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
      pipeline_id: pipelineId,
      expectedCloseDate: '',
      status: 'open'
    });
  };

  const handlePipelineChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newPipelineId = e.target.value;
    setDealFormData(prev => ({ ...prev, pipeline_id: newPipelineId }));
    setPipelineId(newPipelineId);

    // Fetch stages for the selected pipeline
    try {
      const token = localStorage.getItem('token');
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const stagesResponse = await fetch(`${API_BASE_URL}/api/pipelines/${newPipelineId}/stages`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (stagesResponse.ok) {
        const stages = await stagesResponse.json();
        const mapping: Record<string, string> = {};
        const dynamicStagesData: Stage[] = [];
        
        stages.forEach((stage: any, index: number) => {
          // Map stage ID to stage ID (use actual UUID)
          mapping[stage.id] = stage.id;
          
          // Assign colors based on index
          const colors = [
            { color: 'bg-blue-50 border-blue-200', textColor: 'text-blue-700' },
            { color: 'bg-yellow-50 border-yellow-200', textColor: 'text-yellow-700' },
            { color: 'bg-orange-50 border-orange-200', textColor: 'text-orange-700' },
            { color: 'bg-green-50 border-green-200', textColor: 'text-green-700' }
          ];
          const colorIndex = index % colors.length;
          
          dynamicStagesData.push({
            id: stage.id, // Use actual stage UUID
            name: stage.name,
            ...colors[colorIndex]
          });
        });
        
        setStageMapping(mapping);
        setDynamicStages(dynamicStagesData);
        
        // Set first stage as default
        if (stages.length > 0) {
          setDealFormData(prev => ({ ...prev, stage_id: stages[0].id }));
        }
      }
    } catch (error) {
      console.error('Error fetching stages:', error);
    }
  };

  const handleCloseAddModal = () => {
    setShowAddDealModal(false);
    resetDealForm();
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    resetDealForm();
  };

  const [isSubmitting, handleAddDeal] = useSubmitOnce(async (e: React.FormEvent) => {
    e.preventDefault();
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

    // Convert stage name to UUID
    const stageUUID = stageMapping[dealFormData.stage_id];
    if (!stageUUID) {
      toast.error(`Stage "${dealFormData.stage_id}" not found. Please refresh the page or select a different stage.`);
      return;
    }

    const selectedPipelineId = dealFormData.pipeline_id || pipelineId;
    if (!selectedPipelineId) {
      toast.error('Please select a pipeline.');
      return;
    }

    try {
      await dealsService.createDeal({
        title: dealFormData.title,
        value: dealValue || 0,
        company: dealFormData.company,
        contact: dealFormData.contact,
        stage_id: stageUUID, // Use actual UUID
        pipeline_id: selectedPipelineId, // Use selected pipeline UUID
        expected_close_date: dealFormData.expectedCloseDate ? dealFormData.expectedCloseDate + "T00:00:00" : undefined,
        status: dealFormData.status
      });
      toast.success('Deal created successfully!');
      setShowAddDealModal(false);
      setDealFormData({
        title: '',
        value: '',
        company: '',
        contact: '',
        stage_id: 'qualification',
        pipeline_id: pipelineId,
        expectedCloseDate: '',
        status: 'open'
      });
      fetchDeals();
    } catch (error: any) {
      // Display user-friendly error message from backend
      const errorMessage = error?.response?.data?.detail || error?.message || 'Failed to create deal. Please try again.';
      toast.error(errorMessage);
    }
  });

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
      contact: deal.contact_id || '',
      stage_id: deal.stage_id,
      pipeline_id: deal.pipeline_id,
      expectedCloseDate: deal.expected_close_date ? new Date(deal.expected_close_date).toISOString().split('T')[0] : '',
      status: deal.status || 'open'
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
        status: dealFormData.status
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
    const originalStageId = movedDeal.stage_id; // Keep the original UUID
    destDeals.splice(destination.index, 0, movedDeal);

    // Update state
    newDeals[sourceStage] = sourceDeals;
    newDeals[destStage] = destDeals;
    setDeals(newDeals);

    // Update backend - use the actual stage_id (UUID) from the deal
    try {
      // Convert hardcoded stage name to UUID
      const destStageUUID = stageMapping[destStage];
      if (!destStageUUID) {
        toast.error('Invalid destination stage');
        fetchDeals(); // Revert on error
        return;
      }
      
      await dealsService.moveDealStage(draggableId, originalStageId, destStageUUID);
      // Update the deal's stage_id with the new UUID
      movedDeal.stage_id = destStageUUID;
      toast.success('Deal moved successfully');
    } catch (error: any) {
      const errorMessage = error?.response?.data?.detail || 'Failed to move deal';
      toast.error(errorMessage);
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

      {/* Search Bar */}
      <div className="px-4 sm:px-6 lg:max-w-7xl lg:mx-auto lg:px-8 py-4">
        <div className="relative max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search deals by title, company, or contact..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
            >
              <XMarkIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
            </button>
          )}
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
            {/* Mobile: Vertical Accordion, Desktop: Grid */}
            <div className="md:grid md:grid-cols-2 lg:grid-cols-4 md:gap-4 space-y-3 md:space-y-0">
              {stages.map((stage) => {
                const isExpanded = expandedStages.includes(stage.id);
                const toggleStage = () => {
                  setExpandedStages(prev => 
                    prev.includes(stage.id) 
                      ? prev.filter(id => id !== stage.id)
                      : [...prev, stage.id]
                  );
                };
                
                return (
                <div key={stage.id} className={`rounded-lg border-2 ${stage.color} overflow-hidden`}>
                  {/* Stage Header - Clickable on Mobile */}
                  <button
                    onClick={toggleStage}
                    className="w-full p-4 text-left md:cursor-default md:pointer-events-none"
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className={`font-semibold ${stage.textColor}`}>{stage.name}</h3>
                          <span className={`text-sm ${stage.textColor}`}>
                            ({deals[stage.id]?.length || 0})
                          </span>
                          <ChevronDownIcon 
                            className={`h-4 w-4 ${stage.textColor} transition-transform md:hidden ${isExpanded ? 'rotate-180' : ''}`}
                          />
                        </div>
                        <p className={`text-lg font-bold ${stage.textColor} mt-1`}>
                          {formatCurrency(getTotalValue(deals[stage.id] || []))}
                        </p>
                      </div>
                    </div>
                  </button>

                  {/* Droppable Area - Always visible on desktop, collapsible on mobile */}
                  <div className={`${isExpanded ? 'block' : 'hidden'} md:block`}>
                    <Droppable droppableId={stage.id}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`min-h-[50px] md:min-h-[200px] space-y-3 p-4 pt-0 md:p-4 ${
                            snapshot.isDraggingOver ? 'bg-white bg-opacity-50 rounded-lg' : ''
                          }`}
                        >
                        {(deals[stage.id] || [])
                          .filter(deal => {
                            if (!searchQuery.trim()) return true;
                            const query = searchQuery.toLowerCase().trim();
                            const title = deal.title?.toLowerCase() || '';
                            const company = deal.company?.toLowerCase() || '';
                            const contact = deal.contact?.toLowerCase() || '';
                            return title.includes(query) || company.includes(query) || contact.includes(query);
                          })
                          .map((deal, index) => (
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
                                <h4 className="font-medium text-gray-900 mb-2 truncate" title={deal.title}>{deal.title}</h4>
                                <div className="space-y-1 text-sm text-gray-600">
                                  <div className="flex items-center gap-2">
                                    {deal.company && (
                                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                                        <span className="text-primary-600 font-semibold text-sm">
                                          {deal.company.charAt(0).toUpperCase()}
                                        </span>
                                      </div>
                                    )}
                                    <div className="flex items-center min-w-0 flex-1">
                                      <BuildingOfficeIcon className="h-4 w-4 mr-2 text-gray-400 flex-shrink-0" />
                                      <span className="truncate" title={deal.company}>{deal.company}</span>
                                    </div>
                                  </div>
                                  <div className="flex items-center">
                                    <UserIcon className="h-4 w-4 mr-2 text-gray-400 flex-shrink-0" />
                                    <span className="truncate" title={deal.contact}>{deal.contact}</span>
                                  </div>
                                  <div className="mt-2 flex flex-wrap gap-2">
                                    {/* Status Badge */}
                                    <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                                      deal.status === 'won' ? 'bg-green-100 text-green-800' :
                                      deal.status === 'lost' ? 'bg-red-100 text-red-800' :
                                      deal.status === 'abandoned' ? 'bg-gray-100 text-gray-800' :
                                      'bg-blue-100 text-blue-800'
                                    }`}>
                                      {deal.status === 'won' ? 'Won' :
                                       deal.status === 'lost' ? 'Lost' :
                                       deal.status === 'abandoned' ? 'Abandoned' :
                                       'Open'}
                                    </span>
                                    {/* Expiration Badge */}
                                    {deal.expected_close_date && getExpirationMessage(deal.expected_close_date) && (
                                      <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${getExpirationMessage(deal.expected_close_date)?.color}`}>
                                        {getExpirationMessage(deal.expected_close_date)?.text}
                                      </span>
                                    )}
                                  </div>
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
                </div>
                );
              })}
            </div>
          </DragDropContext>
        )}
      </div>

      {/* Add Deal Modal */}
      {showAddDealModal && (
        <div 
          className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-[9999] flex items-center justify-center p-4" 
          onClick={handleCloseAddModal}
          onMouseDown={(e) => e.target === e.currentTarget && e.preventDefault()}
          style={{ isolation: 'isolate' }}
        >
          <div className="relative mx-auto p-5 border w-full max-w-md max-h-[90vh] overflow-y-auto shadow-lg rounded-md bg-white pointer-events-auto" onClick={(e) => e.stopPropagation()}>
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pipeline</label>
                <select
                  name="pipeline_id"
                  value={dealFormData.pipeline_id}
                  onChange={handlePipelineChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                >
                  {pipelines.map(pipeline => (
                    <option key={pipeline.id} value={pipeline.id}>{pipeline.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stage</label>
                <select
                  name="stage_id"
                  value={dealFormData.stage_id}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                >
                  {stages.map(stage => (
                    <option key={stage.id} value={stage.id} title={stage.name}>
                      {stage.name.length > 40 ? stage.name.substring(0, 40) + '...' : stage.name}
                    </option>
                  ))}
                </select>
              </div>
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Deal Status</label>
                <select
                  name="status"
                  value={dealFormData.status}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                >
                  <option value="open">Open</option>
                  <option value="won">Won</option>
                  <option value="lost">Lost</option>
                  <option value="abandoned">Abandoned</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {dealFormData.status === 'won' && 'This deal will count towards revenue'}
                  {dealFormData.status === 'lost' && 'This deal will be marked as lost'}
                  {dealFormData.status === 'open' && 'This deal is active in the pipeline'}
                  {dealFormData.status === 'abandoned' && 'This deal has been abandoned'}
                </p>
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
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Creating...' : 'Create Deal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Deal Modal */}
      {showEditModal && (
        <div 
          className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-[9999] flex items-center justify-center p-4" 
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Deal Status</label>
                <select
                  name="status"
                  value={dealFormData.status}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                >
                  <option value="open">Open</option>
                  <option value="won">Won</option>
                  <option value="lost">Lost</option>
                  <option value="abandoned">Abandoned</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {dealFormData.status === 'won' && 'This deal will count towards revenue'}
                  {dealFormData.status === 'lost' && 'This deal will be marked as lost'}
                  {dealFormData.status === 'open' && 'This deal is active in the pipeline'}
                  {dealFormData.status === 'abandoned' && 'This deal has been abandoned'}
                </p>
              </div>
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
          className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-[9999] flex items-center justify-center p-4" 
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
          className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-[9999] flex items-center justify-center p-4" 
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
