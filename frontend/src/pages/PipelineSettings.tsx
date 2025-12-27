/**
 * Pipeline Stage Management
 * Drag-and-drop reorder, add/delete/rename stages
 */

import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import * as pipelinesService from '../services/pipelinesService';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import {
  PlusIcon,
  XMarkIcon,
  PencilIcon,
  TrashIcon,
  Bars3Icon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { handleApiError } from '../utils/errorHandler';

interface Stage {
  id: string;
  name: string;
  probability: number;
  order_index: number;
  is_closed: boolean;
  is_won: boolean;
}

interface Pipeline {
  id: string;
  name: string;
  stages: Stage[];
  company_id?: string;
  company_name?: string;
}

interface Company {
  id: string;
  name: string;
}

export default function PipelineSettings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { isCompanyAdmin, isSuperAdmin, isSalesManager } = usePermissions();
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [selectedPipeline, setSelectedPipeline] = useState('');
  const [showAddStageModal, setShowAddStageModal] = useState(false);
  const [showEditStageModal, setShowEditStageModal] = useState(false);
  const [editingStage, setEditingStage] = useState<Stage | null>(null);
  const [newStageName, setNewStageName] = useState('');
  const [newStageProbability, setNewStageProbability] = useState(50);
  const [loading, setLoading] = useState(false);
  const [isAddingStage, setIsAddingStage] = useState(false);
  const [showDeleteStageModal, setShowDeleteStageModal] = useState(false);
  const [stageToDelete, setStageToDelete] = useState<Stage | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [filterCompany, setFilterCompany] = useState('all');
  
  // Check if user can customize CRM (Company Admin = Admin = Sales Manager)
  const canCustomizeCRM = isSuperAdmin() || isCompanyAdmin() || isSalesManager();

  // Check for highlight query parameter - runs when URL params change
  useEffect(() => {
    const highlightValue = searchParams.get('highlight');
    
    // If highlight parameter exists, set it as search filter
    if (highlightValue) {
      setSearchQuery(highlightValue);
      // Remove highlight param from URL after setting search
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('highlight');
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams]); // Run when searchParams change

  const resetStageForm = () => {
    setNewStageName('');
    setNewStageProbability(50);
  };

  const handleCloseAddStageModal = () => {
    setShowAddStageModal(false);
    resetStageForm();
  };

  const handleCloseEditStageModal = () => {
    setShowEditStageModal(false);
    setEditingStage(null);
  };

  const currentPipeline = pipelines.find(p => p.id === selectedPipeline);

  // Prevent background scroll when modals are open
  useEffect(() => {
    if (showAddStageModal || showEditStageModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showAddStageModal, showEditStageModal]);

  // Fetch pipelines on mount
  useEffect(() => {
    fetchPipelines();
  }, []);

  // Fetch stages when pipeline changes
  useEffect(() => {
    if (selectedPipeline) {
      fetchPipelineStages(selectedPipeline);
    }
  }, [selectedPipeline]);

  // Listen for real-time WebSocket updates
  useEffect(() => {
    const handleEntityChange = (event: any) => {
      const { entity_type, action } = event.detail;
      
      // Refresh pipeline stages when any stage is created, updated, or deleted
      if (entity_type === 'pipeline_stage') {
        if (selectedPipeline) {
          fetchPipelineStages(selectedPipeline);
        }
      }
      
      // Refresh pipelines list when pipeline is created, updated, or deleted
      if (entity_type === 'pipeline') {
        fetchPipelines();
      }
    };

    window.addEventListener('entity_change', handleEntityChange);
    return () => window.removeEventListener('entity_change', handleEntityChange);
  }, [selectedPipeline]);

  const fetchPipelines = async () => {
    setLoading(true);
    try {
      const data = await pipelinesService.getPipelines();
      
      // For Super Admin, fetch all companies for filter dropdown
      if (isSuperAdmin()) {
        const token = localStorage.getItem('token');
        const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        const companiesResponse = await fetch(`${API_BASE_URL}/api/admin-analytics/companies`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (companiesResponse.ok) {
          const companiesData = await companiesResponse.json();
          // API returns { companies: [...] } object, not a direct array
          const companiesList = companiesData.companies || companiesData;
          const companyMap = new Map(Array.isArray(companiesList) ? companiesList.map((c: any) => [c.id, c.name]) : []);
          
          // Store all companies for filter dropdown
          if (Array.isArray(companiesList)) {
            setCompanies(companiesList.map((c: any) => ({ id: c.id, name: c.name })));
          }
          
          // Add company_name to each pipeline
          data.forEach((pipeline: any) => {
            if (pipeline.company_id) {
              pipeline.company_name = companyMap.get(pipeline.company_id) || 'Unknown Company';
            } else {
              pipeline.company_name = 'No Company';
            }
          });
        }
      }
      
      setPipelines(data);
      if (data.length > 0 && !selectedPipeline) {
        setSelectedPipeline(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching pipelines:', error);
      toast.error('Failed to load pipelines');
    } finally {
      setLoading(false);
    }
  };

  const fetchPipelineStages = async (pipelineId: string) => {
    try {
      const stages = await pipelinesService.getPipelineStages(pipelineId);
      setPipelines(pipelines.map(p =>
        p.id === pipelineId ? { ...p, stages } : p
      ));
    } catch (error) {
      console.error('Error fetching stages:', error);
      toast.error('Failed to load stages');
    }
  };

  const onDragEnd = async (result: any) => {
    if (!result.destination || !currentPipeline || !currentPipeline.stages) return;

    const stages = Array.from(currentPipeline.stages);
    const [reorderedStage] = stages.splice(result.source.index, 1);
    stages.splice(result.destination.index, 0, reorderedStage);

    // Update order_index
    const updatedStages = stages.map((stage, index) => ({
      ...stage,
      order_index: index
    }));

    setPipelines(pipelines.map(p =>
      p.id === selectedPipeline ? { ...p, stages: updatedStages } : p
    ));

    try {
      await pipelinesService.reorderStages(
        selectedPipeline,
        updatedStages.map(s => ({ id: s.id, order_index: s.order_index }))
      );
      toast.success('Stage order updated');
    } catch (error) {
      toast.error('Failed to update stage order');
      fetchPipelineStages(selectedPipeline); // Revert on error
    }
  };

  // Check if input contains HTML tags or scripts
  const containsHTMLOrScript = (input: string): boolean => {
    const htmlPattern = /<[^>]*>/g;
    const scriptPattern = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;
    const jsPattern = /javascript:/gi;
    const eventPattern = /on\w+\s*=/gi;
    
    return htmlPattern.test(input) || 
           scriptPattern.test(input) || 
           jsPattern.test(input) || 
           eventPattern.test(input);
  };

  const handleAddStage = async () => {
    if (isAddingStage) return;
    
    // Validate stage name
    if (!newStageName.trim()) {
      toast.error('Stage Name is required');
      return;
    }

    // Validate character limit
    if (newStageName.length > 100) {
      toast.error('Stage Name cannot exceed 100 characters');
      return;
    }

    // Check for HTML/script tags
    if (containsHTMLOrScript(newStageName)) {
      toast.error('HTML tags and scripts are not allowed in Stage Name. Please use plain text only.');
      return;
    }
    
    // Validate probability
    if (newStageProbability === null || newStageProbability === undefined || isNaN(newStageProbability)) {
      toast.error('Win Probability is required');
      return;
    }

    if (newStageProbability < 0 || newStageProbability > 100) {
      toast.error('Win Probability must be between 0% to 100%');
      return;
    }
    
    if (!currentPipeline) {
      toast.error('No pipeline selected');
      return;
    }

    setIsAddingStage(true);
    try {
      await pipelinesService.createStage(selectedPipeline, {
        name: newStageName,
        probability: newStageProbability,
        order_index: currentPipeline.stages?.length || 0,
        is_closed: false,
        is_won: false
      });
      toast.success('Stage added successfully');
      setShowAddStageModal(false);
      resetStageForm();
      fetchPipelineStages(selectedPipeline);
    } catch (error: any) {
      console.error('Add stage error:', error);
      const errorMessage = error?.response?.data?.detail || error?.message || 'Failed to add stage';
      toast.error(errorMessage);
    } finally {
      setIsAddingStage(false);
    }
  };

  const handleEditStage = async () => {
    if (!editingStage || !currentPipeline) return;

    // Validate stage name
    if (!editingStage.name.trim()) {
      toast.error('Stage Name is required');
      return;
    }

    // Validate character limit
    if (editingStage.name.length > 100) {
      toast.error('Stage Name cannot exceed 100 characters');
      return;
    }

    // Check for HTML/script tags
    if (containsHTMLOrScript(editingStage.name)) {
      toast.error('HTML tags and scripts are not allowed in Stage Name. Please use plain text only.');
      return;
    }

    // Validate probability
    if (editingStage.probability === null || editingStage.probability === undefined || isNaN(editingStage.probability)) {
      toast.error('Win Probability is required');
      return;
    }

    if (editingStage.probability < 0 || editingStage.probability > 100) {
      toast.error('Win Probability must be between 0% to 100%');
      return;
    }

    try {
      await pipelinesService.updateStage(editingStage.id, {
        name: editingStage.name,
        probability: editingStage.probability,
        is_closed: editingStage.is_closed,
        is_won: editingStage.is_won
      });
      toast.success('Stage updated successfully');
      setShowEditStageModal(false);
      setEditingStage(null);
      fetchPipelineStages(selectedPipeline);
    } catch (error: any) {
      const errorMessage = error?.response?.data?.detail || error?.message || 'Failed to update stage';
      toast.error(errorMessage);
    }
  };

  const openDeleteStageModal = (stage: Stage) => {
    setStageToDelete(stage);
    setShowDeleteStageModal(true);
  };

  const confirmDeleteStage = async () => {
    if (!currentPipeline || !stageToDelete) return;

    try {
      await pipelinesService.deleteStage(stageToDelete.id);
      toast.success('Stage deleted successfully');
      setShowDeleteStageModal(false);
      setStageToDelete(null);
      fetchPipelineStages(selectedPipeline);
    } catch (error: any) {
      // Show specific error message from backend (e.g., "Cannot delete stage with X active deals")
      const errorMessage = error?.response?.data?.detail || error?.message || 'Failed to delete stage';
      toast.error(errorMessage);
      setShowDeleteStageModal(false);
      setStageToDelete(null);
    }
  };

  // Permission check
  if (!canCustomizeCRM) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="font-semibold text-yellow-900 mb-2">CRM Customization Restricted</div>
          <p className="text-yellow-800">Only Company Admins can manage pipeline settings.</p>
          <p className="text-yellow-700 text-sm mt-2">💡 Contact your administrator to request pipeline changes.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full">
      <div className="bg-white shadow">
        <div className="px-4 sm:px-6 lg:max-w-7xl xl:max-w-8xl 2xl:max-w-9xl 3xl:max-w-10xl lg:mx-auto lg:px-8">
          <div className="py-6">
            <h1 className="text-2xl font-bold leading-7 text-gray-900">Pipeline Settings</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage your sales pipelines and stages
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:max-w-7xl xl:max-w-8xl 2xl:max-w-9xl 3xl:max-w-10xl lg:mx-auto lg:px-8 py-8">
        {/* Company Filter - Super Admin Only */}
        {isSuperAdmin() && companies.length > 0 && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Company
            </label>
            <select
              value={filterCompany}
              onChange={(e) => {
                setFilterCompany(e.target.value);
                // Reset selected pipeline when company changes
                const companyPipelines = e.target.value === 'all' 
                  ? pipelines 
                  : pipelines.filter(p => p.company_id === e.target.value);
                if (companyPipelines.length > 0) {
                  setSelectedPipeline(companyPipelines[0].id);
                } else {
                  setSelectedPipeline('');
                }
              }}
              className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="all">All Companies</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Pipeline Selector */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Pipeline
          </label>
          {loading ? (
            <div className="text-sm text-gray-500">Loading pipelines...</div>
          ) : (() => {
            // Filter pipelines by selected company
            const filteredPipelines = filterCompany === 'all' 
              ? pipelines 
              : pipelines.filter(p => p.company_id === filterCompany);
            
            // Check if selected company has no pipelines
            const selectedCompanyName = companies.find(c => c.id === filterCompany)?.name;
            
            if (filterCompany !== 'all' && filteredPipelines.length === 0) {
              return (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-800 font-medium">No pipeline stages found</p>
                  <p className="text-sm text-yellow-700 mt-1">
                    "{selectedCompanyName}" has no pipeline configured.
                  </p>
                  <p className="text-sm text-yellow-600 mt-2">
                    Please create a pipeline in Pipeline Management for this company.
                  </p>
                </div>
              );
            }
            
            if (filteredPipelines.length === 0) {
              return (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-800">
                    No pipelines found. Please create a pipeline first in the Deals section.
                  </p>
                </div>
              );
            }
            
            return (
              <select
                value={selectedPipeline}
                onChange={(e) => setSelectedPipeline(e.target.value)}
                className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                {filteredPipelines.map(pipeline => {
                  // For Super Admin, always show company name alongside pipeline name
                  const displayName = isSuperAdmin() 
                    ? `${pipeline.name} (${pipeline.company_name || 'Unknown'})`
                    : pipeline.name;
                  const truncatedName = displayName.length > 50 ? displayName.substring(0, 50) + '...' : displayName;
                  return (
                    <option key={pipeline.id} value={pipeline.id} title={displayName}>
                      {truncatedName}
                    </option>
                  );
                })}
              </select>
            );
          })()}
        </div>

        {/* Stages List */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200 flex justify-between items-center gap-2">
            <h3 className="text-lg font-medium text-gray-900 truncate">Pipeline Stages</h3>
            <button
              onClick={() => setShowAddStageModal(true)}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700 flex-shrink-0"
            >
              <PlusIcon className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Add Stage</span>
            </button>
          </div>

          <div className="p-6">
            <DragDropContext onDragEnd={onDragEnd}>
              <Droppable droppableId="stages">
                {(provided) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="space-y-3"
                  >
                    {currentPipeline?.stages?.map((stage, index) => (
                      <Draggable key={stage.id} draggableId={stage.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`bg-gray-50 rounded-lg p-4 border-2 ${
                              snapshot.isDragging
                                ? 'border-primary-500 shadow-lg'
                                : 'border-gray-200'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center space-x-2 sm:space-x-4 flex-1 min-w-0">
                                <div {...provided.dragHandleProps} className="flex-shrink-0">
                                  <Bars3Icon className="h-5 w-5 text-gray-400 cursor-move" />
                                </div>
                                
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h4 className="text-base font-medium text-gray-900 truncate max-w-[120px] sm:max-w-[250px]" title={stage.name}>
                                      {stage.name}
                                    </h4>
                                    {stage.is_closed && (
                                      <span className={`px-2 py-0.5 text-xs font-medium rounded flex-shrink-0 ${
                                        stage.is_won
                                          ? 'bg-green-100 text-green-800'
                                          : 'bg-red-100 text-red-800'
                                      }`}>
                                        {stage.is_won ? 'Won' : 'Lost'}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-sm text-gray-500 mt-1">
                                    Probability: {stage.probability}%
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center space-x-1 flex-shrink-0">
                                <button
                                  onClick={() => {
                                    setEditingStage(stage);
                                    setShowEditStageModal(true);
                                  }}
                                  className="p-2 text-gray-400 hover:text-primary-600 rounded"
                                >
                                  <PencilIcon className="h-5 w-5" />
                                </button>
                                <button
                                  onClick={() => openDeleteStageModal(stage)}
                                  className="p-2 text-gray-400 hover:text-red-600 rounded"
                                >
                                  <TrashIcon className="h-5 w-5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          </div>
        </div>
      </div>

      {/* Add Stage Modal */}
      {showAddStageModal && (
        <div 
          className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4"
          onClick={handleCloseAddStageModal}
        >
          <div 
            className="relative mx-auto p-6 border w-full max-w-md max-h-[90vh] overflow-y-auto shadow-lg rounded-md bg-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Add New Stage</h3>
              <button
                onClick={handleCloseAddStageModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Stage Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newStageName}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value.length <= 100) {
                      if (containsHTMLOrScript(value)) {
                        toast.error('HTML tags and scripts are not allowed. Please enter plain text only.');
                        return;
                      }
                      setNewStageName(value);
                    }
                  }}
                  maxLength={100}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                  placeholder="e.g., Demo Scheduled"
                  required
                />
                <p className="text-xs text-gray-400 mt-1">{newStageName.length}/100 characters</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Win Probability (%) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={newStageProbability === 0 ? '' : newStageProbability}
                  onChange={(e) => {
                    const value = e.target.value === '' ? 0 : parseInt(e.target.value);
                    if (value >= 0 && value <= 100) {
                      setNewStageProbability(value);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === '-' || e.key === 'e' || e.key === 'E' || e.key === '+') {
                      e.preventDefault();
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                  placeholder="0-100"
                  required
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={handleCloseAddStageModal}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddStage}
                  disabled={isAddingStage}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isAddingStage ? 'Adding...' : 'Add Stage'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Stage Modal */}
      {showEditStageModal && editingStage && (
        <div 
          className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4"
          onClick={handleCloseEditStageModal}
        >
          <div 
            className="relative mx-auto p-6 border w-full max-w-md max-h-[90vh] overflow-y-auto shadow-lg rounded-md bg-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Edit Stage</h3>
              <button
                onClick={handleCloseEditStageModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Stage Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editingStage.name}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value.length <= 100) {
                      if (containsHTMLOrScript(value)) {
                        toast.error('HTML tags and scripts are not allowed. Please enter plain text only.');
                        return;
                      }
                      setEditingStage({ ...editingStage, name: value });
                    }
                  }}
                  maxLength={100}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                  required
                />
                <p className="text-xs text-gray-400 mt-1">{editingStage.name.length}/100 characters</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Win Probability (%) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={editingStage.probability === 0 ? '' : editingStage.probability}
                  onChange={(e) => {
                    const value = e.target.value === '' ? 0 : parseInt(e.target.value);
                    if (value >= 0 && value <= 100) {
                      setEditingStage({ ...editingStage, probability: value });
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === '-' || e.key === 'e' || e.key === 'E' || e.key === '+') {
                      e.preventDefault();
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                  placeholder="0-100"
                  required
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={handleCloseEditStageModal}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEditStage}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Stage Confirmation Modal */}
      {showDeleteStageModal && stageToDelete && (
        <div 
          className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-[9999] flex items-center justify-center p-4" 
          onClick={() => setShowDeleteStageModal(false)}
        >
          <div className="relative mx-auto p-6 border w-full max-w-md shadow-lg rounded-md bg-white" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Confirm Stage Deletion</h3>
              <button onClick={() => setShowDeleteStageModal(false)} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="mb-6">
              <p className="text-gray-700">
                Are you sure you want to delete the stage <span className="font-semibold text-red-600">"{stageToDelete.name}"</span>?
              </p>
              <p className="text-sm text-red-600 mt-2 font-semibold">
                This action CANNOT be undone! All deals in this stage will need to be moved.
              </p>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteStageModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                No, Cancel
              </button>
              <button
                onClick={confirmDeleteStage}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
              >
                Yes, Delete Stage
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Pipeline Modal - For companies without pipelines */}
      {showCreatePipelineModal && selectedCompanyForPipeline && (
        <div 
          className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-[9999] flex items-center justify-center p-4" 
          onClick={() => {
            setShowCreatePipelineModal(false);
            setSelectedCompanyForPipeline(null);
          }}
        >
          <div className="relative mx-auto p-6 border w-full max-w-md shadow-lg rounded-md bg-white" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Create Pipeline</h3>
              <button 
                onClick={() => {
                  setShowCreatePipelineModal(false);
                  setSelectedCompanyForPipeline(null);
                }} 
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-4">
                Create a pipeline for <span className="font-semibold text-primary-600">{selectedCompanyForPipeline.name}</span>
              </p>
              
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pipeline Name
              </label>
              <input
                type="text"
                value={newPipelineName}
                onChange={(e) => setNewPipelineName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                placeholder="e.g., Sales Pipeline"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                onClick={() => {
                  setShowCreatePipelineModal(false);
                  setSelectedCompanyForPipeline(null);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreatePipelineForCompany}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700"
              >
                Create Pipeline
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
