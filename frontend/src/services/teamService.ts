import axios from 'axios';

const API_URL = 'https://sunstonecrm.com/api';

// Types
export interface Team {
  id: string;
  name: string;
  description: string | null;
  company_id: string;
  team_lead_id: string | null;
}

export interface TeamMember {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  user_role: string;
}

export interface TeamCreate {
  name: string;
  description?: string;
}

export interface TeamUpdate {
  name?: string;
  description?: string;
}

// API functions
const getTeams = async (): Promise<Team[]> => {
  const token = localStorage.getItem('token');
  const response = await axios.get(`${API_URL}/teams`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data;
};

const getTeam = async (teamId: string): Promise<Team> => {
  const token = localStorage.getItem('token');
  const response = await axios.get(`${API_URL}/teams/${teamId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data;
};

const createTeam = async (teamData: TeamCreate): Promise<Team> => {
  const token = localStorage.getItem('token');
  const response = await axios.post(`${API_URL}/teams`, teamData, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data;
};

const updateTeam = async (teamId: string, teamData: TeamUpdate): Promise<Team> => {
  const token = localStorage.getItem('token');
  const response = await axios.put(`${API_URL}/teams/${teamId}`, teamData, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data;
};

const deleteTeam = async (teamId: string): Promise<void> => {
  const token = localStorage.getItem('token');
  await axios.delete(`${API_URL}/teams/${teamId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
};

const getTeamMembers = async (teamId: string): Promise<TeamMember[]> => {
  const token = localStorage.getItem('token');
  const response = await axios.get(`${API_URL}/teams/${teamId}/members`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data;
};

const addTeamMember = async (teamId: string, userId: string): Promise<void> => {
  const token = localStorage.getItem('token');
  await axios.post(`${API_URL}/teams/${teamId}/members`, { user_id: userId }, {
    headers: { Authorization: `Bearer ${token}` }
  });
};

const removeTeamMember = async (teamId: string, userId: string): Promise<void> => {
  const token = localStorage.getItem('token');
  await axios.delete(`${API_URL}/teams/${teamId}/members/${userId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
};

const setTeamLead = async (teamId: string, userId: string): Promise<void> => {
  const token = localStorage.getItem('token');
  await axios.post(`${API_URL}/teams/${teamId}/lead/${userId}`, {}, {
    headers: { Authorization: `Bearer ${token}` }
  });
};

const teamService = {
  getTeams,
  getTeam,
  createTeam,
  updateTeam,
  deleteTeam,
  getTeamMembers,
  addTeamMember,
  removeTeamMember,
  setTeamLead
};

export default teamService;
