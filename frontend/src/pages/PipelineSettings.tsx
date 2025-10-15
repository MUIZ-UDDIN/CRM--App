/**
 * Pipeline Stage Management
 * Drag-and-drop reorder, add/delete/rename stages
 */

import { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import {
  PlusIcon,
  XMarkIcon,
  PencilIcon,
  TrashIcon,
  Bars3Icon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

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
}

export default function PipelineSettings() {
  const [pipelines, setPipelines] = useState<Pipeline[]>([
    {
      id: '1',
      name: 'Sales Pipeline',
      stages: [
        { id: 'qualification', name: 'Qualification', probability: 25, order_index: 0, is_closed: false, is_won: false },
        { id: 'proposal', name: 'Proposal', probability: 50, order_index: 1, is_closed: false, is_won: false },
        { id: 'negotiation', name: 'Negotiation', probability: 75, order_index: 2, is_closed: false, is_won: false },
        { id: 'closed-won', name: 'Closed Won', probability: 100, order_index: 3, is_closed: true, is_won: true },
      ]
    }
  ]);

  const [selectedPipeline, setSelectedPipeline] = useState('1');
  const [showAddStageModal, setShowAddStageModal] = useState(false);
  const [showEditStageModal, setShowEditStageModal] = useState(false);
  const [editingStage, setEditingStage] = useState<Stage | null>(null);
  const [newStageName, setNewStageName] = useState('');
  const [newStageProbability, setNewStageProbability] = useState(50);

  const currentPipeline = pipelines.find(p => p.id === selectedPipeline);

  const onDragEnd = async (result: any) => {
    if (!result.destination || !currentPipeline) return;

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
      // Call API to update stage order
      // await axios.patch(`/api/pipelines/${selectedPipeline}/reorder-stages`, {
      //   stages: updatedStages.map(s => ({ id: s.id, order_index: s.order_index }))
      // });
      toast.success('Stage order updated');
    } catch (error) {
      toast.error('Failed to update stage order');
    }
  };

  const handleAddStage = async () => {
    if (!newStageName.trim() || !currentPipeline) return;

    const newStage: Stage = {
      id: `s${Date.now()}`,
      name: newStageName,
      probability: newStageProbability,
      order_index: currentPipeline.stages.length,
      is_closed: false,
      is_won: false
    };

    setPipelines(pipelines.map(p =>
      p.id === selectedPipeline
        ? { ...p, stages: [...p.stages, newStage] }
        : p
    ));

    try {
      // await axios.post(`/api/pipelines/${selectedPipeline}/stages`, newStage);
      toast.success('Stage added successfully');
      setShowAddStageModal(false);
      setNewStageName('');
      setNewStageProbability(50);
    } catch (error) {
      toast.error('Failed to add stage');
    }
  };

  const handleEditStage = async () => {
    if (!editingStage || !currentPipeline) return;

    setPipelines(pipelines.map(p =>
      p.id === selectedPipeline
        ? {
            ...p,
            stages: p.stages.map(s =>
              s.id === editingStage.id ? editingStage : s
            )
          }
        : p
    ));

    try {
      // await axios.patch(`/api/pipeline-stages/${editingStage.id}`, editingStage);
      toast.success('Stage updated successfully');
      setShowEditStageModal(false);
      setEditingStage(null);
    } catch (error) {
      toast.error('Failed to update stage');
    }
  };

  const handleDeleteStage = async (stageId: string) => {
    if (!currentPipeline) return;

    if (!confirm('Are you sure you want to delete this stage? All deals in this stage will need to be moved.')) {
      return;
    }

    setPipelines(pipelines.map(p =>
      p.id === selectedPipeline
        ? { ...p, stages: p.stages.filter(s => s.id !== stageId) }
        : p
    ));

    try {
      // await axios.delete(`/api/pipeline-stages/${stageId}`);
      toast.success('Stage deleted successfully');
    } catch (error) {
      toast.error('Failed to delete stage');
    }
  };

  return (
    <div className="min-h-full">
      <div className="bg-white shadow">
        <div className="px-4 sm:px-6 lg:max-w-7xl lg:mx-auto lg:px-8">
          <div className="py-6">
            <h1 className="text-2xl font-bold leading-7 text-gray-900">Pipeline Settings</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage your sales pipelines and stages
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:max-w-7xl lg:mx-auto lg:px-8 py-8">
        {/* Pipeline Selector */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Pipeline
          </label>
          <select
            value={selectedPipeline}
            onChange={(e) => setSelectedPipeline(e.target.value)}
            className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            {pipelines.map(pipeline => (
              <option key={pipeline.id} value={pipeline.id}>
                {pipeline.name}
              </option>
            ))}
          </select>
        </div>

        {/* Stages List */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">Pipeline Stages</h3>
            <button
              onClick={() => setShowAddStageModal(true)}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Add Stage
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
                    {currentPipeline?.stages.map((stage, index) => (
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
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-4 flex-1">
                                <div {...provided.dragHandleProps}>
                                  <Bars3Icon className="h-5 w-5 text-gray-400 cursor-move" />
                                </div>
                                
                                <div className="flex-1">
                                  <div className="flex items-center space-x-3">
                                    <h4 className="text-base font-medium text-gray-900">
                                      {stage.name}
                                    </h4>
                                    {stage.is_closed && (
                                      <span className={`px-2 py-1 text-xs font-medium rounded ${
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

                              <div className="flex items-center space-x-2">
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
                                  onClick={() => handleDeleteStage(stage.id)}
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
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Add New Stage</h3>
              <button
                onClick={() => setShowAddStageModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Stage Name
                </label>
                <input
                  type="text"
                  value={newStageName}
                  onChange={(e) => setNewStageName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                  placeholder="e.g., Demo Scheduled"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Win Probability (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={newStageProbability}
                  onChange={(e) => setNewStageProbability(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => setShowAddStageModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddStage}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700"
                >
                  Add Stage
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Stage Modal */}
      {showEditStageModal && editingStage && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Edit Stage</h3>
              <button
                onClick={() => setShowEditStageModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Stage Name
                </label>
                <input
                  type="text"
                  value={editingStage.name}
                  onChange={(e) => setEditingStage({ ...editingStage, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Win Probability (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={editingStage.probability}
                  onChange={(e) => setEditingStage({ ...editingStage, probability: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => setShowEditStageModal(false)}
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
    </div>
  );
}
