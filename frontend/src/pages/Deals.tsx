import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import toast from 'react-hot-toast';
import * as dealsService from '../services/dealsService';
import * as customFieldsService from '../services/customFieldsService';
import ActionButtons from '../components/common/ActionButtons';
import SearchableContactSelect from '../components/common/SearchableContactSelect';
import CustomFieldsForm from '../components/CustomFieldsForm';
import CustomFieldsDisplay from '../components/CustomFieldsDisplay';
import { useSubmitOnce } from '../hooks/useSubmitOnce';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import apiClient from '../services/apiClient';
import { handleApiError } from '../utils/errorHandler';
import { 
  PlusIcon, 
  XMarkIcon,
  BuildingOfficeIcon,
  UserIcon,
  Bars3Icon,
  MagnifyingGlassIcon,
  ChevronDownIcon,
  ArrowPathIcon,
  UserCircleIcon,
  FunnelIcon,
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
  owner_id?: string;
  owner_name?: string;
}

interface AssignableUser {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  team_id?: string;
}

interface Stage {
  id: string;
  name: string;
  color: string;
  textColor: string;
}

export default function Deals() {
  const { user } = useAuth();
  const { isSuperAdmin, isCompanyAdmin, isSalesManager } = usePermissions();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showAddDealModal, setShowAddDealModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [loading, setLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [dealToDelete, setDealToDelete] = useState<Deal | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(true);
  const [filterStage, setFilterStage] = useState('all');
  const [expandedStages, setExpandedStages] = useState<string[]>([]);
  const [assignableUsers, setAssignableUsers] = useState<AssignableUser[]>([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [dealToAssign, setDealToAssign] = useState<Deal | null>(null);
  const [dealFormData, setDealFormData] = useState({
    title: '',
    value: '',
    company: '',
    contact: '',
    stage_id: '',
    pipeline_id: '',
    expectedCloseDate: '',
    status: 'open'
  });
  
  // Custom fields state
  const [customFields, setCustomFields] = useState<customFieldsService.CustomField[]>([]);
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, any>>({});
  
  // Check if user can assign deals
  const canAssignDeals = isSuperAdmin() || isCompanyAdmin() || isSalesManager();

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
          // No pipelines yet - normal for new companies
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

  // Auto-refresh when user returns to the page (cross-platform sync)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && Object.keys(stageMapping).length > 0) {
        fetchDeals();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [stageMapping]);

  // Listen for real-time WebSocket updates
  useEffect(() => {
    const handleEntityChange = (event: any) => {
      const { entity_type, action } = event.detail;
      
      // Refresh deals when any deal is created, updated, or deleted
      if (entity_type === 'deal') {
        fetchDeals();
      }
    };

    window.addEventListener('entity_change', handleEntityChange);
    return () => window.removeEventListener('entity_change', handleEntityChange);
  }, [dynamicStages]);

  // Prevent background scroll when modals are open
  useEffect(() => {
    if (showAddDealModal || showEditModal || showViewModal || showDeleteModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    // Cleanup on unmount
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showAddDealModal, showEditModal, showViewModal, showDeleteModal]);

  // Fetch custom fields for deals
  useEffect(() => {
    const fetchCustomFields = async () => {
      try {
        const fields = await customFieldsService.getCustomFieldsForEntity('deal');
        setCustomFields(fields);
      } catch (error) {
        console.error('Failed to fetch custom fields:', error);
      }
    };
    fetchCustomFields();
  }, []);

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
          // Silently add to first stage as fallback if stage not found
          const firstStageId = Object.keys(grouped)[0];
          if (firstStageId) {
            grouped[firstStageId].push(deal);
          }
        }
      });
      
      setDeals(grouped);
    } catch (error) {
      handleApiError(error, { toastMessage: 'Failed to load deals' });
    } finally {
      setLoading(false);
    }
  };

  // Fetch assignable users
  const fetchAssignableUsers = async () => {
    if (!canAssignDeals) return;
    
    try {
      const response = await apiClient.get('/users/assignable/list');
      setAssignableUsers(response.data);
    } catch (error) {
      handleApiError(error, { toastMessage: 'Failed to load assignable users' });
    }
  };

  // Assign deal to user
  const assignDeal = async (dealId: string, userId: string) => {
    try {
      await apiClient.patch(`/deals/${dealId}`, { owner_id: userId });
      toast.success('Deal assigned successfully');
      setShowAssignModal(false);
      setDealToAssign(null);
      fetchDeals(); // Refresh deals
    } catch (error) {
      handleApiError(error, { toastMessage: 'Failed to assign deal' });
    }
  };

  // Open assignment modal
  const openAssignModal = (deal: Deal) => {
    setDealToAssign(deal);
    setShowAssignModal(true);
    if (assignableUsers.length === 0) {
      fetchAssignableUsers();
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
      stage_id: stages.length > 0 ? stages[0].id : '',
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
    setCustomFieldValues({});
    // Re-enable body scroll
    document.body.style.overflow = 'unset';
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    resetDealForm();
    setCustomFieldValues({});
    // Re-enable body scroll
    document.body.style.overflow = 'unset';
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

    // Check if stage_id is already a UUID or needs mapping
    let stageUUID = dealFormData.stage_id;
    
    // If stage_id is not a UUID format, try to map it
    if (!dealFormData.stage_id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      stageUUID = stageMapping[dealFormData.stage_id];
      if (!stageUUID) {
        toast.error(`Stage "${dealFormData.stage_id}" not found. Please refresh the page or select a different stage.`);
        return;
      }
    }
    
    // Validate that the stage exists in current stages
    const stageExists = stages.some(stage => stage.id === stageUUID);
    if (!stageExists) {
      toast.error('Selected stage not found. Please refresh the page.');
      return;
    }

    const selectedPipelineId = dealFormData.pipeline_id || pipelineId;
    if (!selectedPipelineId) {
      toast.error('Please select a pipeline.');
      return;
    }

    try {
      const newDeal = await dealsService.createDeal({
        title: dealFormData.title,
        value: dealValue || 0,
        company: dealFormData.company,
        contact: dealFormData.contact,
        stage_id: stageUUID, // Use actual UUID
        pipeline_id: selectedPipelineId, // Use selected pipeline UUID
        expected_close_date: dealFormData.expectedCloseDate ? dealFormData.expectedCloseDate + "T00:00:00" : undefined,
        status: dealFormData.status
      });
      
      // Save custom field values if any
      if (customFields.length > 0) {
        const customFieldValuesToSave = customFieldsService.prepareCustomFieldValues(customFields, customFieldValues);
        if (customFieldValuesToSave.length > 0) {
          await customFieldsService.setCustomFieldValues('deal', newDeal.id, customFieldValuesToSave);
        }
      }
      
      toast.success('Deal created successfully!');
      setShowAddDealModal(false);
      setDealFormData({
        title: '',
        value: '',
        company: '',
        contact: '',
        stage_id: stages.length > 0 ? stages[0].id : '',
        pipeline_id: pipelineId,
        expectedCloseDate: '',
        status: 'open'
      });
      setCustomFieldValues({});
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

  const handleEdit = async (deal: Deal) => {
    setSelectedDeal(deal);
    setDealFormData({
      title: deal.title,
      value: deal.value.toString(),
      company: deal.company || '',
      contact: deal.contact || '',
      stage_id: deal.stage_id,
      pipeline_id: deal.pipeline_id,
      expectedCloseDate: deal.expected_close_date ? new Date(deal.expected_close_date).toISOString().split('T')[0] : '',
      status: deal.status || 'open'
    });
    
    // Load custom field values
    try {
      const values = await customFieldsService.getCustomFieldValues('deal', deal.id);
      setCustomFieldValues(values);
    } catch (error) {
      console.error('Failed to load custom field values:', error);
      setCustomFieldValues({});
    }
    
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
      
      // Save custom field values if any
      if (customFields.length > 0) {
        const customFieldValuesToSave = customFieldsService.prepareCustomFieldValues(customFields, customFieldValues);
        if (customFieldValuesToSave.length > 0) {
          await customFieldsService.setCustomFieldValues('deal', selectedDeal.id, customFieldValuesToSave);
        }
      }
      
      toast.success('Deal updated');
      setShowEditModal(false);
      resetDealForm();
      setCustomFieldValues({});
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
    } catch (error: any) {
      console.error('Delete error:', error);
      toast.error(error?.response?.data?.detail || error?.message || 'Failed to delete deal');
      setShowDeleteModal(false);
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

  // Handle drag update - auto-expand collapsed stages when dragging over them
  const onDragUpdate = (update: any) => {
    const { destination } = update;
    
    if (!destination) {
      return;
    }
    
    const destStageId = destination.droppableId;
    
    // Auto-expand the destination stage if it's collapsed
    if (!expandedStages.includes(destStageId)) {
      setExpandedStages(prev => [...prev, destStageId]);
    }
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

    // Update backend - destStage is already a UUID (from droppableId)
    try {
      await dealsService.moveDealStage(draggableId, originalStageId, destStage);
      // Update the deal's stage_id with the new UUID
      movedDeal.stage_id = destStage;
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
        <div className="px-4 sm:px-6 lg:max-w-7xl xl:max-w-8xl 2xl:max-w-9xl 3xl:max-w-10xl lg:mx-auto lg:px-8">
          <div className="py-4 sm:py-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
            <div>
              <h1 className="text-lg sm:text-xl md:text-2xl font-bold leading-tight sm:leading-7 text-gray-900">Deals Pipeline</h1>
              <p className="mt-1 text-xs sm:text-sm text-gray-500">
                Manage your sales pipeline with drag-and-drop functionality
              </p>
            </div>
            <div className="flex gap-2">
              {/* Refresh button for cross-platform sync */}
              <button
                onClick={() => fetchDeals()}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50"
                title="Refresh deals"
              >
                <ArrowPathIcon className="h-4 w-4" />
              </button>
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
      </div>

      {/* Search and Filters */}
      <div className="px-4 sm:px-6 lg:max-w-7xl xl:max-w-8xl 2xl:max-w-9xl 3xl:max-w-10xl lg:mx-auto lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search deals by title, company, or contact..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 rounded-lg transition-colors ${
                showFilters 
                  ? 'bg-primary-100 text-primary-600' 
                  : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
              }`}
              title="Toggle Filters"
            >
              <FunnelIcon className="h-5 w-5" />
            </button>
            {showFilters && (
              <select
                value={filterStage}
                onChange={(e) => setFilterStage(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 w-[200px] truncate"
                title={stages.find(s => s.id === filterStage)?.name || 'All Stages'}
              >
                <option value="all">All Stages</option>
                {stages.map((stage) => (
                  <option 
                    key={stage.id} 
                    value={stage.id}
                    title={stage.name}
                  >
                    {stage.name.length > 25 ? stage.name.substring(0, 25) + '...' : stage.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>

      {/* Pipeline Board */}
      <div className="px-4 sm:px-6 lg:max-w-7xl xl:max-w-8xl 2xl:max-w-9xl 3xl:max-w-10xl lg:mx-auto lg:px-8 py-4 sm:py-6">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : (
          <DragDropContext onDragEnd={onDragEnd} onDragUpdate={onDragUpdate}>
            {/* Mobile: Vertical Accordion, Desktop: Grid */}
            <div className="md:grid md:grid-cols-2 lg:grid-cols-4 md:gap-4 space-y-3 md:space-y-0">
              {stages.filter(stage => filterStage === 'all' || stage.id === filterStage).map((stage) => {
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
                  {/* Stage Header - Clickable on All Devices */}
                  <button
                    onClick={toggleStage}
                    className="w-full p-4 text-left cursor-pointer hover:bg-white hover:bg-opacity-10 transition-colors"
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className={`font-semibold ${stage.textColor} truncate max-w-[200px]`} title={stage.name}>
                            {stage.name}
                          </h3>
                          <span className={`text-sm ${stage.textColor} flex-shrink-0`}>
                            ({deals[stage.id]?.length || 0})
                          </span>
                          <ChevronDownIcon 
                            className={`h-4 w-4 ${stage.textColor} transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                          />
                        </div>
                        <p className={`text-lg font-bold ${stage.textColor} mt-1`}>
                          {formatCurrency(getTotalValue(deals[stage.id] || []))}
                        </p>
                      </div>
                    </div>
                  </button>

                  {/* Droppable Area - Always rendered, collapsed when not expanded */}
                  <Droppable droppableId={stage.id}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`space-y-3 p-4 pt-0 md:p-4 transition-all overflow-hidden ${
                          snapshot.isDraggingOver ? 'bg-white bg-opacity-50 rounded-lg' : ''
                        } ${isExpanded ? 'min-h-[50px] md:min-h-[200px] max-h-[2000px] opacity-100' : 'max-h-0 opacity-0 p-0'}`}
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
                                    className="cursor-grab active:cursor-grabbing p-2 md:p-1 hover:bg-gray-100 rounded touch-none"
                                    style={{ touchAction: 'none' }}
                                  >
                                    <Bars3Icon className="h-6 w-6 md:h-4 md:w-4 text-gray-400" />
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
                                  <div className="flex items-center text-sm text-gray-600">
                                    <UserIcon className="h-4 w-4 mr-2 text-gray-400 flex-shrink-0" />
                                    <span className="truncate" title={deal.contact}>{deal.contact}</span>
                                  </div>
                                  {/* Owner Info */}
                                  {deal.owner_name && (
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center text-sm text-gray-600">
                                        <UserCircleIcon className="h-4 w-4 mr-2 flex-shrink-0" />
                                        <span className="truncate" title={deal.owner_name}>{deal.owner_name}</span>
                                      </div>
                                      {canAssignDeals && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            openAssignModal(deal);
                                          }}
                                          className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                                          title="Reassign deal"
                                        >
                                          Reassign
                                        </button>
                                      )}
                                    </div>
                                  )}
                                  {!deal.owner_name && canAssignDeals && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openAssignModal(deal);
                                      }}
                                      className="flex items-center text-xs text-primary-600 hover:text-primary-700 font-medium"
                                      title="Assign deal"
                                    >
                                      <UserCircleIcon className="h-4 w-4 mr-1" />
                                      Assign to user
                                    </button>
                                  )}
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
              <h3 className="text-base sm:text-lg font-medium text-gray-900">Add New Deal</h3>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Expected Close Date (Optional)</label>
                <input
                  type="date"
                  name="expectedCloseDate"
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
              
              {/* Custom Fields */}
              <CustomFieldsForm
                customFields={customFields}
                values={customFieldValues}
                onChange={(fieldKey, value) => setCustomFieldValues({...customFieldValues, [fieldKey]: value})}
              />
              
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
              <h3 className="text-base sm:text-lg font-medium text-gray-900">Edit Deal</h3>
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
              
              {/* Custom Fields */}
              <CustomFieldsForm
                customFields={customFields}
                values={customFieldValues}
                onChange={(fieldKey, value) => setCustomFieldValues({...customFieldValues, [fieldKey]: value})}
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
          className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-[9999] flex items-center justify-center p-4" 
          onClick={() => setShowViewModal(false)}
          onMouseDown={(e) => e.target === e.currentTarget && e.preventDefault()}
          style={{ isolation: 'isolate' }}
        >
          <div className="relative mx-auto p-6 border w-full max-w-md max-h-[90vh] overflow-y-auto shadow-lg rounded-md bg-white pointer-events-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base sm:text-lg font-medium text-gray-900">Deal Details</h3>
              <button onClick={() => setShowViewModal(false)} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
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
                <p className="text-gray-900">{stages.find(s => s.id === selectedDeal.stage_id)?.name || 'Unknown Stage'}</p>
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
              <h3 className="text-base sm:text-lg font-medium text-gray-900">Confirm Deletion</h3>
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

      {/* Assignment Modal */}
      {showAssignModal && dealToAssign && (
        <div 
          className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-[9999] flex items-center justify-center p-4" 
          onClick={() => setShowAssignModal(false)}
        >
          <div className="relative mx-auto p-6 border w-full max-w-md shadow-lg rounded-md bg-white" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Assign Deal</h3>
              <button onClick={() => setShowAssignModal(false)} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-4">
                Assign <span className="font-semibold">"{dealToAssign.title}"</span> to:
              </p>
              
              {assignableUsers.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <UserCircleIcon className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                  <p>No users available for assignment</p>
                </div>
              ) : (
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {assignableUsers.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => assignDeal(dealToAssign.id, user.id)}
                      className={`w-full text-left p-3 rounded-lg border transition-colors ${
                        dealToAssign.owner_id === user.id
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-gray-900">
                            {user.first_name} {user.last_name}
                          </div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                          <div className="text-xs text-gray-400 mt-1">
                            {user.role === 'super_admin' ? 'Super Admin' :
                             user.role === 'company_admin' ? 'Company Admin' :
                             user.role === 'sales_manager' ? 'Sales Manager' :
                             user.role === 'sales_rep' ? 'Sales Rep' : user.role}
                          </div>
                        </div>
                        {dealToAssign.owner_id === user.id && (
                          <span className="text-xs font-medium text-primary-600">Current</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            <div className="flex justify-end">
              <button
                onClick={() => setShowAssignModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
