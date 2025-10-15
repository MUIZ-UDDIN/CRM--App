-- Sample Data for Sales CRM
-- This file contains realistic sample data for testing and demo purposes

-- First, let's create some teams
INSERT INTO teams (id, name, description, leader_id) VALUES 
('550e8400-e29b-41d4-a716-446655440001', 'Sales Team Alpha', 'Enterprise sales team', NULL),
('550e8400-e29b-41d4-a716-446655440002', 'Sales Team Beta', 'SMB sales team', NULL),
('550e8400-e29b-41d4-a716-446655440003', 'Customer Success', 'Post-sale customer success team', NULL);

-- Create sample users
INSERT INTO users (id, email, username, password_hash, first_name, last_name, phone, role_id, team_id) VALUES 
-- Admins
('550e8400-e29b-41d4-a716-446655440010', 'admin@company.com', 'admin', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeeDUjOjCpnLkzKqK', 'Sarah', 'Johnson', '+1-555-0101', (SELECT id FROM roles WHERE name = 'Admin'), '550e8400-e29b-41d4-a716-446655440001'),

-- Sales Managers
('550e8400-e29b-41d4-a716-446655440011', 'mike.wilson@company.com', 'mike.wilson', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeeDUjOjCpnLkzKqK', 'Mike', 'Wilson', '+1-555-0102', (SELECT id FROM roles WHERE name = 'Sales Manager'), '550e8400-e29b-41d4-a716-446655440001'),
('550e8400-e29b-41d4-a716-446655440012', 'lisa.chen@company.com', 'lisa.chen', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeeDUjOjCpnLkzKqK', 'Lisa', 'Chen', '+1-555-0103', (SELECT id FROM roles WHERE name = 'Sales Manager'), '550e8400-e29b-41d4-a716-446655440002'),

-- Sales Reps
('550e8400-e29b-41d4-a716-446655440013', 'john.doe@company.com', 'john.doe', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeeDUjOjCpnLkzKqK', 'John', 'Doe', '+1-555-0104', (SELECT id FROM roles WHERE name = 'Sales Rep'), '550e8400-e29b-41d4-a716-446655440001'),
('550e8400-e29b-41d4-a716-446655440014', 'jane.smith@company.com', 'jane.smith', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeeDUjOjCpnLkzKqK', 'Jane', 'Smith', '+1-555-0105', (SELECT id FROM roles WHERE name = 'Sales Rep'), '550e8400-e29b-41d4-a716-446655440001'),
('550e8400-e29b-41d4-a716-446655440015', 'alex.brown@company.com', 'alex.brown', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeeDUjOjCpnLkzKqK', 'Alex', 'Brown', '+1-555-0106', (SELECT id FROM roles WHERE name = 'Sales Rep'), '550e8400-e29b-41d4-a716-446655440002'),
('550e8400-e29b-41d4-a716-446655440016', 'emily.davis@company.com', 'emily.davis', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeeDUjOjCpnLkzKqK', 'Emily', 'Davis', '+1-555-0107', (SELECT id FROM roles WHERE name = 'Sales Rep'), '550e8400-e29b-41d4-a716-446655440002');

-- Update team leaders
UPDATE teams SET leader_id = '550e8400-e29b-41d4-a716-446655440011' WHERE id = '550e8400-e29b-41d4-a716-446655440001';
UPDATE teams SET leader_id = '550e8400-e29b-41d4-a716-446655440012' WHERE id = '550e8400-e29b-41d4-a716-446655440002';

-- Create sample organizations
INSERT INTO organizations (id, name, website, industry, size_category, annual_revenue, phone, owner_id) VALUES 
('550e8400-e29b-41d4-a716-446655440020', 'TechCorp Solutions', 'https://techcorp.com', 'Technology', 'large', 50000000, '+1-555-0201', '550e8400-e29b-41d4-a716-446655440013'),
('550e8400-e29b-41d4-a716-446655440021', 'Green Energy Inc', 'https://greenenergy.com', 'Energy', 'medium', 15000000, '+1-555-0202', '550e8400-e29b-41d4-a716-446655440014'),
('550e8400-e29b-41d4-a716-446655440022', 'FinanceFirst Bank', 'https://financefirst.com', 'Financial Services', 'enterprise', 200000000, '+1-555-0203', '550e8400-e29b-41d4-a716-446655440015'),
('550e8400-e29b-41d4-a716-446655440023', 'HealthMax Clinic', 'https://healthmax.com', 'Healthcare', 'small', 5000000, '+1-555-0204', '550e8400-e29b-41d4-a716-446655440016'),
('550e8400-e29b-41d4-a716-446655440024', 'EduLearn Platform', 'https://edulearn.com', 'Education', 'startup', 1000000, '+1-555-0205', '550e8400-e29b-41d4-a716-446655440013'),
('550e8400-e29b-41d4-a716-446655440025', 'RetailMax Stores', 'https://retailmax.com', 'Retail', 'large', 75000000, '+1-555-0206', '550e8400-e29b-41d4-a716-446655440014');

-- Create sample contacts
INSERT INTO contacts (id, first_name, last_name, email, phone, job_title, organization_id, source_id, owner_id, lead_score, tags) VALUES 
-- TechCorp Solutions contacts
('550e8400-e29b-41d4-a716-446655440030', 'David', 'Tech', 'david.tech@techcorp.com', '+1-555-0301', 'CTO', '550e8400-e29b-41d4-a716-446655440020', (SELECT id FROM contact_sources WHERE name = 'Website'), '550e8400-e29b-41d4-a716-446655440013', 85, '{"decision_maker", "hot_lead"}'),
('550e8400-e29b-41d4-a716-446655440031', 'Sarah', 'Procurement', 'sarah.proc@techcorp.com', '+1-555-0302', 'Procurement Manager', '550e8400-e29b-41d4-a716-446655440020', (SELECT id FROM contact_sources WHERE name = 'Referral'), '550e8400-e29b-41d4-a716-446655440013', 70, '{"procurement", "warm_lead"}'),

-- Green Energy Inc contacts  
('550e8400-e29b-41d4-a716-446655440032', 'Michael', 'Green', 'michael.green@greenenergy.com', '+1-555-0303', 'CEO', '550e8400-e29b-41d4-a716-446655440021', (SELECT id FROM contact_sources WHERE name = 'Trade Show'), '550e8400-e29b-41d4-a716-446655440014', 95, '{"decision_maker", "hot_lead", "c_level"}'),
('550e8400-e29b-41d4-a716-446655440033', 'Lisa', 'Operations', 'lisa.ops@greenenergy.com', '+1-555-0304', 'Operations Director', '550e8400-e29b-41d4-a716-446655440021', (SELECT id FROM contact_sources WHERE name = 'Website'), '550e8400-e29b-41d4-a716-446655440014', 60, '{"operations", "warm_lead"}'),

-- FinanceFirst Bank contacts
('550e8400-e29b-41d4-a716-446655440034', 'Robert', 'Finance', 'robert.finance@financefirst.com', '+1-555-0305', 'VP Technology', '550e8400-e29b-41d4-a716-446655440022', (SELECT id FROM contact_sources WHERE name = 'Partner'), '550e8400-e29b-41d4-a716-446655440015', 90, '{"decision_maker", "enterprise", "hot_lead"}'),
('550e8400-e29b-41d4-a716-446655440035', 'Jennifer', 'Security', 'jennifer.sec@financefirst.com', '+1-555-0306', 'Security Manager', '550e8400-e29b-41d4-a716-446655440022', (SELECT id FROM contact_sources WHERE name = 'Cold Outreach'), '550e8400-e29b-41d4-a716-446655440015', 40, '{"security", "cold_lead"}'),

-- HealthMax Clinic contacts
('550e8400-e29b-41d4-a716-446655440036', 'Dr. Amanda', 'Health', 'amanda.health@healthmax.com', '+1-555-0307', 'Chief Medical Officer', '550e8400-e29b-41d4-a716-446655440023', (SELECT id FROM contact_sources WHERE name = 'Social Media'), '550e8400-e29b-41d4-a716-446655440016', 75, '{"decision_maker", "healthcare", "warm_lead"}'),

-- EduLearn Platform contacts
('550e8400-e29b-41d4-a716-446655440037', 'Mark', 'Educator', 'mark.edu@edulearn.com', '+1-555-0308', 'Founder & CEO', '550e8400-e29b-41d4-a716-446655440024', (SELECT id FROM contact_sources WHERE name = 'Email Campaign'), '550e8400-e29b-41d4-a716-446655440013', 80, '{"decision_maker", "startup", "founder"}'),

-- RetailMax Stores contacts
('550e8400-e29b-41d4-a716-446655440038', 'Patricia', 'Retail', 'patricia.retail@retailmax.com', '+1-555-0309', 'IT Director', '550e8400-e29b-41d4-a716-446655440025', (SELECT id FROM contact_sources WHERE name = 'Google Ads'), '550e8400-e29b-41d4-a716-446655440014', 65, '{"it_director", "retail", "warm_lead"}');

-- Create sample pipelines
INSERT INTO pipelines (id, name, description, owner_id, team_id, is_default) VALUES 
('550e8400-e29b-41d4-a716-446655440040', 'Enterprise Sales Pipeline', 'For large enterprise deals over $50K', '550e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440001', TRUE),
('550e8400-e29b-41d4-a716-446655440041', 'SMB Sales Pipeline', 'For small-medium business deals under $50K', '550e8400-e29b-41d4-a716-446655440012', '550e8400-e29b-41d4-a716-446655440002', FALSE);

-- Create sample pipeline stages for Enterprise pipeline
INSERT INTO pipeline_stages (id, pipeline_id, name, stage_order, probability, color) VALUES 
('550e8400-e29b-41d4-a716-446655440050', '550e8400-e29b-41d4-a716-446655440040', 'Qualified', 1, 10, '#EF4444'),
('550e8400-e29b-41d4-a716-446655440051', '550e8400-e29b-41d4-a716-446655440040', 'Contact Made', 2, 20, '#F97316'),
('550e8400-e29b-41d4-a716-446655440052', '550e8400-e29b-41d4-a716-446655440040', 'Demo Scheduled', 3, 40, '#EAB308'),
('550e8400-e29b-41d4-a716-446655440053', '550e8400-e29b-41d4-a716-446655440040', 'Proposal Made', 4, 60, '#22D3EE'),
('550e8400-e29b-41d4-a716-446655440054', '550e8400-e29b-41d4-a716-446655440040', 'Negotiation', 5, 80, '#A78BFA'),
('550e8400-e29b-41d4-a716-446655440055', '550e8400-e29b-41d4-a716-446655440040', 'Won', 6, 100, '#10B981');

-- Create sample pipeline stages for SMB pipeline
INSERT INTO pipeline_stages (id, pipeline_id, name, stage_order, probability, color) VALUES 
('550e8400-e29b-41d4-a716-446655440060', '550e8400-e29b-41d4-a716-446655440041', 'Lead', 1, 5, '#EF4444'),
('550e8400-e29b-41d4-a716-446655440061', '550e8400-e29b-41d4-a716-446655440041', 'Qualified', 2, 15, '#F97316'),
('550e8400-e29b-41d4-a716-446655440062', '550e8400-e29b-41d4-a716-446655440041', 'Meeting Booked', 3, 35, '#EAB308'),
('550e8400-e29b-41d4-a716-446655440063', '550e8400-e29b-41d4-a716-446655440041', 'Proposal Sent', 4, 70, '#22D3EE'),
('550e8400-e29b-41d4-a716-446655440064', '550e8400-e29b-41d4-a716-446655440041', 'Closed Won', 5, 100, '#10B981');

-- Create sample deals
INSERT INTO deals (id, title, description, value, pipeline_id, stage_id, contact_id, organization_id, owner_id, probability, expected_close_date, status, tags) VALUES 
-- Enterprise deals
('550e8400-e29b-41d4-a716-446655440070', 'TechCorp Enterprise Software Deal', 'Enterprise software licensing for 500+ users', 150000.00, '550e8400-e29b-41d4-a716-446655440040', '550e8400-e29b-41d4-a716-446655440053', '550e8400-e29b-41d4-a716-446655440030', '550e8400-e29b-41d4-a716-446655440020', '550e8400-e29b-41d4-a716-446655440013', 60, '2025-12-15', 'open', '{"enterprise", "software", "high_value"}'),

('550e8400-e29b-41d4-a716-446655440071', 'FinanceFirst Security Platform', 'Comprehensive security solution for banking', 280000.00, '550e8400-e29b-41d4-a716-446655440040', '550e8400-e29b-41d4-a716-446655440054', '550e8400-e29b-41d4-a716-446655440034', '550e8400-e29b-41d4-a716-446655440022', '550e8400-e29b-41d4-a716-446655440015', 80, '2025-11-30', 'open', '{"enterprise", "security", "banking", "high_value"}'),

('550e8400-e29b-41d4-a716-446655440072', 'Green Energy CRM Implementation', 'Complete CRM system for energy company', 95000.00, '550e8400-e29b-41d4-a716-446655440040', '550e8400-e29b-41d4-a716-446655440052', '550e8400-e29b-41d4-a716-446655440032', '550e8400-e29b-41d4-a716-446655440021', '550e8400-e29b-41d4-a716-446655440014', 40, '2025-12-01', 'open', '{"crm", "energy", "implementation"}'),

-- SMB deals
('550e8400-e29b-41d4-a716-446655440073', 'HealthMax Digital Solution', 'Digital patient management system', 25000.00, '550e8400-e29b-41d4-a716-446655440041', '550e8400-e29b-41d4-a716-446655440063', '550e8400-e29b-41d4-a716-446655440036', '550e8400-e29b-41d4-a716-446655440023', '550e8400-e29b-41d4-a716-446655440016', 70, '2025-11-15', 'open', '{"healthcare", "digital", "patient_management"}'),

('550e8400-e29b-41d4-a716-446655440074', 'EduLearn Analytics Package', 'Learning analytics and reporting tools', 15000.00, '550e8400-e29b-41d4-a716-446655440041', '550e8400-e29b-41d4-a716-446655440062', '550e8400-e29b-41d4-a716-446655440037', '550e8400-e29b-41d4-a716-446655440024', '550e8400-e29b-41d4-a716-446655440013', 35, '2025-12-10', 'open', '{"education", "analytics", "startup"}'),

('550e8400-e29b-41d4-a716-446655440075', 'RetailMax POS System', 'Point of sale system for retail chain', 45000.00, '550e8400-e29b-41d4-a716-446655440041', '550e8400-e29b-41d4-a716-446655440061', '550e8400-e29b-41d4-a716-446655440038', '550e8400-e29b-41d4-a716-446655440025', '550e8400-e29b-41d4-a716-446655440014', 15, '2026-01-20', 'open', '{"retail", "pos", "chain"}'),

-- Won deals for analytics
('550e8400-e29b-41d4-a716-446655440076', 'Previous TechCorp Deal', 'Previous successful deal', 75000.00, '550e8400-e29b-41d4-a716-446655440040', '550e8400-e29b-41d4-a716-446655440055', '550e8400-e29b-41d4-a716-446655440030', '550e8400-e29b-41d4-a716-446655440020', '550e8400-e29b-41d4-a716-446655440013', 100, '2025-09-15', 'won', '{"enterprise", "won"}'),

('550e8400-e29b-41d4-a716-446655440077', 'Previous SMB Deal', 'Closed SMB deal', 18000.00, '550e8400-e29b-41d4-a716-446655440041', '550e8400-e29b-41d4-a716-446655440064', '550e8400-e29b-41d4-a716-446655440038', '550e8400-e29b-41d4-a716-446655440025', '550e8400-e29b-41d4-a716-446655440015', 100, '2025-08-30', 'won', '{"smb", "won"}');

-- Create sample activities
INSERT INTO activities (id, type_id, subject, description, due_date, contact_id, deal_id, assigned_to_id, created_by_id, status, priority) VALUES 
-- Upcoming activities
('550e8400-e29b-41d4-a716-446655440080', (SELECT id FROM activity_types WHERE name = 'Call'), 'Follow up call with David', 'Discuss technical requirements and next steps', '2025-10-15 14:00:00+00', '550e8400-e29b-41d4-a716-446655440030', '550e8400-e29b-41d4-a716-446655440070', '550e8400-e29b-41d4-a716-446655440013', '550e8400-e29b-41d4-a716-446655440013', 'scheduled', 'high'),

('550e8400-e29b-41d4-a716-446655440081', (SELECT id FROM activity_types WHERE name = 'Meeting'), 'Demo for FinanceFirst', 'Product demonstration for security team', '2025-10-16 10:00:00+00', '550e8400-e29b-41d4-a716-446655440034', '550e8400-e29b-41d4-a716-446655440071', '550e8400-e29b-41d4-a716-446655440015', '550e8400-e29b-41d4-a716-446655440015', 'scheduled', 'high'),

('550e8400-e29b-41d4-a716-446655440082', (SELECT id FROM activity_types WHERE name = 'Email'), 'Send proposal to Green Energy', 'Send detailed proposal with pricing', '2025-10-14 09:00:00+00', '550e8400-e29b-41d4-a716-446655440032', '550e8400-e29b-41d4-a716-446655440072', '550e8400-e29b-41d4-a716-446655440014', '550e8400-e29b-41d4-a716-446655440014', 'scheduled', 'medium'),

-- Completed activities
('550e8400-e29b-41d4-a716-446655440083', (SELECT id FROM activity_types WHERE name = 'Call'), 'Initial contact with HealthMax', 'First contact call to understand needs', '2025-10-10 15:00:00+00', '550e8400-e29b-41d4-a716-446655440036', '550e8400-e29b-41d4-a716-446655440073', '550e8400-e29b-41d4-a716-446655440016', '550e8400-e29b-41d4-a716-446655440016', 'completed', 'medium'),

('550e8400-e29b-41d4-a716-446655440084', (SELECT id FROM activity_types WHERE name = 'Meeting'), 'Discovery meeting with EduLearn', 'Requirements gathering session', '2025-10-08 11:00:00+00', '550e8400-e29b-41d4-a716-446655440037', '550e8400-e29b-41d4-a716-446655440074', '550e8400-e29b-41d4-a716-446655440013', '550e8400-e29b-41d4-a716-446655440013', 'completed', 'medium');

-- Create sample emails
INSERT INTO emails (id, subject, body_text, from_email, to_emails, contact_id, deal_id, sent_by_id, direction, status) VALUES 
('550e8400-e29b-41d4-a716-446655440090', 'Follow up on our conversation', 'Hi David, Thanks for taking the time to discuss your requirements. I have prepared a detailed proposal that addresses your needs. When would be a good time for a follow-up call?', 'john.doe@company.com', '{"david.tech@techcorp.com"}', '550e8400-e29b-41d4-a716-446655440030', '550e8400-e29b-41d4-a716-446655440070', '550e8400-e29b-41d4-a716-446655440013', 'outbound', 'opened'),

('550e8400-e29b-41d4-a716-446655440091', 'Security Solution Proposal', 'Dear Robert, Please find attached our comprehensive security solution proposal for FinanceFirst Bank. We look forward to discussing this further.', 'alex.brown@company.com', '{"robert.finance@financefirst.com"}', '550e8400-e29b-41d4-a716-446655440034', '550e8400-e29b-41d4-a716-446655440071', '550e8400-e29b-41d4-a716-446655440015', 'outbound', 'delivered'),

('550e8400-e29b-41d4-a716-446655440092', 'Re: CRM Implementation Question', 'Thank you for your interest in our CRM solution. I would be happy to schedule a demo to show you how our platform can help streamline your energy business operations.', 'jane.smith@company.com', '{"michael.green@greenenergy.com"}', '550e8400-e29b-41d4-a716-446655440032', '550e8400-e29b-41d4-a716-446655440072', '550e8400-e29b-41d4-a716-446655440014', 'outbound', 'clicked');

-- Create sample calls
INSERT INTO calls (id, contact_id, deal_id, user_id, direction, phone_number, status, duration_seconds, started_at, ended_at) VALUES 
('550e8400-e29b-41d4-a716-446655440100', '550e8400-e29b-41d4-a716-446655440030', '550e8400-e29b-41d4-a716-446655440070', '550e8400-e29b-41d4-a716-446655440013', 'outbound', '+1-555-0301', 'completed', 1245, '2025-10-12 14:00:00+00', '2025-10-12 14:20:45+00'),

('550e8400-e29b-41d4-a716-446655440101', '550e8400-e29b-41d4-a716-446655440034', '550e8400-e29b-41d4-a716-446655440071', '550e8400-e29b-41d4-a716-446655440015', 'outbound', '+1-555-0305', 'completed', 1890, '2025-10-11 10:00:00+00', '2025-10-11 10:31:30+00'),

('550e8400-e29b-41d4-a716-446655440102', '550e8400-e29b-41d4-a716-446655440036', '550e8400-e29b-41d4-a716-446655440073', '550e8400-e29b-41d4-a716-446655440016', 'outbound', '+1-555-0307', 'completed', 856, '2025-10-10 15:00:00+00', '2025-10-10 15:14:16+00'),

('550e8400-e29b-41d4-a716-446655440103', '550e8400-e29b-41d4-a716-446655440038', '550e8400-e29b-41d4-a716-446655440075', '550e8400-e29b-41d4-a716-446655440014', 'outbound', '+1-555-0309', 'missed', 0, '2025-10-09 16:00:00+00', '2025-10-09 16:00:30+00');

-- Create sample metrics data for analytics
INSERT INTO pipeline_metrics (pipeline_id, stage_id, metric_date, deal_count, total_value, avg_duration_days, conversion_rate, deals_won, deals_lost) VALUES 
-- Enterprise pipeline metrics
('550e8400-e29b-41d4-a716-446655440040', '550e8400-e29b-41d4-a716-446655440050', '2025-10-01', 5, 750000.00, 7.5, 80.0, 0, 1),
('550e8400-e29b-41d4-a716-446655440040', '550e8400-e29b-41d4-a716-446655440051', '2025-10-01', 4, 600000.00, 12.3, 75.0, 0, 1),
('550e8400-e29b-41d4-a716-446655440040', '550e8400-e29b-41d4-a716-446655440052', '2025-10-01', 3, 450000.00, 18.7, 66.7, 0, 1),
('550e8400-e29b-41d4-a716-446655440040', '550e8400-e29b-41d4-a716-446655440053', '2025-10-01', 2, 430000.00, 25.5, 50.0, 0, 1),
('550e8400-e29b-41d4-a716-446655440040', '550e8400-e29b-41d4-a716-446655440054', '2025-10-01', 1, 280000.00, 35.0, 100.0, 1, 0),

-- SMB pipeline metrics
('550e8400-e29b-41d4-a716-446655440041', '550e8400-e29b-41d4-a716-446655440060', '2025-10-01', 8, 240000.00, 3.2, 62.5, 0, 3),
('550e8400-e29b-41d4-a716-446655440041', '550e8400-e29b-41d4-a716-446655440061', '2025-10-01', 5, 150000.00, 8.4, 80.0, 0, 1),
('550e8400-e29b-41d4-a716-446655440041', '550e8400-e29b-41d4-a716-446655440062', '2025-10-01', 4, 120000.00, 15.2, 75.0, 0, 1),
('550e8400-e29b-41d4-a716-446655440041', '550e8400-e29b-41d4-a716-446655440063', '2025-10-01', 3, 88000.00, 22.1, 66.7, 1, 1),
('550e8400-e29b-41d4-a716-446655440041', '550e8400-e29b-41d4-a716-446655440064', '2025-10-01', 2, 63000.00, 30.0, 100.0, 2, 0);

-- Activity metrics
INSERT INTO activity_metrics (user_id, metric_date, activity_type, total_count, completed_count, overdue_count, avg_completion_time_hours) VALUES 
('550e8400-e29b-41d4-a716-446655440013', '2025-10-01', 'Call', 15, 12, 2, 0.5),
('550e8400-e29b-41d4-a716-446655440013', '2025-10-01', 'Meeting', 8, 7, 0, 1.5),
('550e8400-e29b-41d4-a716-446655440013', '2025-10-01', 'Email', 25, 25, 0, 0.1),
('550e8400-e29b-41d4-a716-446655440014', '2025-10-01', 'Call', 18, 15, 1, 0.4),
('550e8400-e29b-41d4-a716-446655440014', '2025-10-01', 'Meeting', 6, 6, 0, 1.2),
('550e8400-e29b-41d4-a716-446655440015', '2025-10-01', 'Call', 20, 17, 3, 0.6),
('550e8400-e29b-41d4-a716-446655440016', '2025-10-01', 'Call', 12, 10, 1, 0.7);

-- Email metrics
INSERT INTO email_metrics (user_id, metric_date, sent_count, delivered_count, opened_count, clicked_count, bounced_count, reply_count) VALUES 
('550e8400-e29b-41d4-a716-446655440013', '2025-10-01', 45, 43, 32, 12, 2, 8),
('550e8400-e29b-41d4-a716-446655440014', '2025-10-01', 38, 36, 28, 15, 2, 6),
('550e8400-e29b-41d4-a716-446655440015', '2025-10-01', 52, 50, 35, 18, 2, 11),
('550e8400-e29b-41d4-a716-446655440016', '2025-10-01', 29, 27, 18, 7, 2, 4);

-- Call metrics
INSERT INTO call_metrics (user_id, metric_date, total_calls, answered_calls, missed_calls, avg_duration_seconds, total_duration_seconds) VALUES 
('550e8400-e29b-41d4-a716-446655440013', '2025-10-01', 15, 12, 3, 892, 10704),
('550e8400-e29b-41d4-a716-446655440014', '2025-10-01', 18, 15, 3, 1156, 17340),
('550e8400-e29b-41d4-a716-446655440015', '2025-10-01', 20, 17, 3, 1245, 21165),
('550e8400-e29b-41d4-a716-446655440016', '2025-10-01', 12, 10, 2, 734, 7340);

-- Create email templates
INSERT INTO email_templates (id, name, subject, body, template_type, owner_id, is_shared) VALUES 
('550e8400-e29b-41d4-a716-446655440110', 'Welcome Email', 'Welcome to our CRM solution!', 'Hi {{first_name}},\n\nWelcome to our platform! We are excited to help you manage your sales process more effectively.\n\nBest regards,\n{{sender_name}}', 'welcome', '550e8400-e29b-41d4-a716-446655440011', TRUE),

('550e8400-e29b-41d4-a716-446655440111', 'Follow Up', 'Following up on our conversation', 'Hi {{first_name}},\n\nI wanted to follow up on our conversation about {{deal_title}}. Do you have any questions about our proposal?\n\nLooking forward to hearing from you.\n\nBest regards,\n{{sender_name}}', 'follow_up', '550e8400-e29b-41d4-a716-446655440011', TRUE),

('550e8400-e29b-41d4-a716-446655440112', 'Proposal', 'Proposal for {{organization_name}}', 'Dear {{first_name}},\n\nPlease find attached our proposal for {{deal_title}}. We believe our solution will provide significant value to {{organization_name}}.\n\nI would be happy to schedule a call to discuss any questions you may have.\n\nBest regards,\n{{sender_name}}', 'proposal', '550e8400-e29b-41d4-a716-446655440012', TRUE);

-- Create sample audit logs
INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values) VALUES 
('550e8400-e29b-41d4-a716-446655440013', 'CREATE', 'deals', '550e8400-e29b-41d4-a716-446655440070', '{"title": "TechCorp Enterprise Software Deal", "value": 150000.00}'),
('550e8400-e29b-41d4-a716-446655440014', 'UPDATE', 'deals', '550e8400-e29b-41d4-a716-446655440072', '{"stage_id": "550e8400-e29b-41d4-a716-446655440052"}'),
('550e8400-e29b-41d4-a716-446655440015', 'CREATE', 'contacts', '550e8400-e29b-41d4-a716-446655440034', '{"first_name": "Robert", "last_name": "Finance", "email": "robert.finance@financefirst.com"}');

-- Add updated_at values for completed activities
UPDATE activities SET completed_at = '2025-10-10 15:30:00+00' WHERE id = '550e8400-e29b-41d4-a716-446655440083';
UPDATE activities SET completed_at = '2025-10-08 12:00:00+00' WHERE id = '550e8400-e29b-41d4-a716-446655440084';